from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from jose import jwt, JWTError

from app.db.session import engine, Base, get_db
from app.core.config import settings, get_ist_date, get_ist_time
from app.core.security import verify_password, create_access_token
from app.core.mail import send_email_smtp
from app.core import security
from app import models, schemas, crud

# Create database tables
Base.metadata.create_all(bind=engine)

# Run database migrations dynamically
from sqlalchemy import inspect, text
inspector = inspect(engine)
try:
    # Migrate SMTP Settings
    if "settings" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("settings")]
        missing_columns = [col for col in ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "day_cutoff_time"] if col not in columns]
        if missing_columns:
            db_mig = next(get_db())
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    columns_to_add = [
                        ("smtp_host", "VARCHAR", "'smtp.gmail.com'"),
                        ("smtp_port", "INTEGER", "587"),
                        ("smtp_user", "VARCHAR", "''"),
                        ("smtp_password", "VARCHAR", "''"),
                        ("day_cutoff_time", "VARCHAR", "'00:00'")
                    ]
                    for col_name, col_type, col_default in columns_to_add:
                        if col_name in missing_columns:
                            try:
                                db_mig.execute(text(f"ALTER TABLE settings ADD COLUMN {col_name} {col_type} DEFAULT {col_default}"))
                                db_mig.commit()
                            except Exception:
                                db_mig.rollback()
                else:
                    for col_name in missing_columns:
                        col_type = "INTEGER" if col_name == "smtp_port" else "VARCHAR"
                        col_default = "587" if col_name == "smtp_port" else ("'00:00'" if col_name == "day_cutoff_time" else "''")
                        db_mig.execute(text(f"ALTER TABLE settings ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {col_default}"))
                    db_mig.commit()
            except Exception as e:
                print(f"SMTP Migration error: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()

    # Drop Messages and Achievements tables if they exist
    db_mig = next(get_db())
    try:
        dialect = db_mig.bind.dialect.name
        tables_to_drop = ["messages", "user_achievements", "achievements"]
        for table in tables_to_drop:
            if table in inspector.get_table_names():
                if dialect == "sqlite":
                    db_mig.execute(text(f"DROP TABLE IF EXISTS {table}"))
                else:
                    db_mig.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                db_mig.commit()
                print(f"Dropped table {table}.")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        db_mig.rollback()
    finally:
        db_mig.close()

    # Migrate daily_logs table (Float hours -> Int hours and Int minutes)
    if "daily_logs" in inspector.get_table_names():
        columns_info = inspector.get_columns("daily_logs")
        columns = [col["name"] for col in columns_info]
        hours_col = next((col for col in columns_info if col["name"] == "hours"), None)
        is_hours_integer = False
        if hours_col is not None:
            type_str = str(hours_col["type"]).lower()
            if "int" in type_str:
                is_hours_integer = True

        if "minutes" not in columns or not is_hours_integer:
            db_mig = next(get_db())
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    print("Migrating daily_logs table to hours and minutes (SQLite)...")
                    # Fetch all existing records
                    existing_records = db_mig.execute(text("SELECT id, user_id, date, category, hours, description, created_at FROM daily_logs")).all()
                    
                    # Drop existing table and recreate with correct column types
                    db_mig.execute(text("DROP TABLE IF EXISTS daily_logs"))
                    db_mig.commit()
                    
                    db_mig.execute(text("""
                        CREATE TABLE daily_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            date DATE NOT NULL,
                            category VARCHAR NOT NULL,
                            hours INTEGER NOT NULL,
                            minutes INTEGER NOT NULL,
                            description TEXT NOT NULL,
                            created_at DATETIME,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )
                    """))
                    db_mig.execute(text("CREATE INDEX ix_daily_logs_id ON daily_logs (id)"))
                    db_mig.commit()
                    
                    for r in existing_records:
                        h_float = float(r[4]) if r[4] is not None else 0.0
                        h_int = int(h_float)
                        m_int = int(round((h_float - h_int) * 60))
                        if m_int >= 60:
                            h_int += 1
                            m_int = 0
                        db_mig.execute(text("""
                            INSERT INTO daily_logs (id, user_id, date, category, hours, minutes, description, created_at)
                            VALUES (:id, :user_id, :date, :category, :hours, :minutes, :description, :created_at)
                        """), {
                            "id": r[0],
                            "user_id": r[1],
                            "date": r[2],
                            "category": r[3],
                            "hours": h_int,
                            "minutes": m_int,
                            "description": r[5],
                            "created_at": r[6]
                        })
                    db_mig.commit()
                    print("daily_logs table migrated successfully (SQLite).")
                else:
                    print("Migrating daily_logs table to hours and minutes (PostgreSQL)...")
                    if "minutes" not in columns:
                        db_mig.execute(text("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS minutes INTEGER DEFAULT 0"))
                        db_mig.commit()
                    
                    if not is_hours_integer:
                        db_mig.execute(text("""
                            UPDATE daily_logs 
                            SET minutes = CASE 
                                WHEN ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) >= 60 THEN 0 
                                ELSE ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) 
                              END,
                              hours = CASE 
                                WHEN ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) >= 60 THEN TRUNC(hours::numeric) + 1 
                                ELSE TRUNC(hours::numeric) 
                              END
                        """))
                        db_mig.commit()
                        
                        db_mig.execute(text("ALTER TABLE daily_logs ALTER COLUMN hours TYPE INTEGER USING hours::integer"))
                        db_mig.commit()
                    print("daily_logs table migrated successfully (PostgreSQL).")
            except Exception as e:
                print(f"Error migrating daily_logs: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()

    # Migrate project_logs table (Float hours -> Int hours and Int minutes)
    if "project_logs" in inspector.get_table_names():
        columns_info = inspector.get_columns("project_logs")
        columns = [col["name"] for col in columns_info]
        hours_col = next((col for col in columns_info if col["name"] == "hours"), None)
        is_hours_integer = False
        if hours_col is not None:
            type_str = str(hours_col["type"]).lower()
            if "int" in type_str:
                is_hours_integer = True

        if "minutes" not in columns or not is_hours_integer:
            db_mig = next(get_db())
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    print("Migrating project_logs table to hours and minutes (SQLite)...")
                    existing_records = db_mig.execute(text("SELECT id, project_id, user_id, hours, description, logged_at FROM project_logs")).all()
                    
                    db_mig.execute(text("DROP TABLE IF EXISTS project_logs"))
                    db_mig.commit()
                    
                    db_mig.execute(text("""
                        CREATE TABLE project_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            project_id INTEGER NOT NULL,
                            user_id INTEGER NOT NULL,
                            hours INTEGER NOT NULL,
                            minutes INTEGER NOT NULL,
                            description TEXT NOT NULL,
                            logged_at DATETIME,
                            FOREIGN KEY(project_id) REFERENCES projects(id),
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )
                    """))
                    db_mig.execute(text("CREATE INDEX ix_project_logs_id ON project_logs (id)"))
                    db_mig.commit()
                    
                    for r in existing_records:
                        h_float = float(r[3]) if r[3] is not None else 0.0
                        h_int = int(h_float)
                        m_int = int(round((h_float - h_int) * 60))
                        if m_int >= 60:
                            h_int += 1
                            m_int = 0
                        db_mig.execute(text("""
                            INSERT INTO project_logs (id, project_id, user_id, hours, minutes, description, logged_at)
                            VALUES (:id, :project_id, :user_id, :hours, :minutes, :description, :logged_at)
                        """), {
                            "id": r[0],
                            "project_id": r[1],
                            "user_id": r[2],
                            "hours": h_int,
                            "minutes": m_int,
                            "description": r[4],
                            "logged_at": r[5]
                        })
                    db_mig.commit()
                    print("project_logs table migrated successfully (SQLite).")
                else:
                    print("Migrating project_logs table to hours and minutes (PostgreSQL)...")
                    if "minutes" not in columns:
                        db_mig.execute(text("ALTER TABLE project_logs ADD COLUMN IF NOT EXISTS minutes INTEGER DEFAULT 0"))
                        db_mig.commit()
                    
                    if not is_hours_integer:
                        db_mig.execute(text("""
                            UPDATE project_logs 
                            SET minutes = CASE 
                                WHEN ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) >= 60 THEN 0 
                                ELSE ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) 
                              END,
                              hours = CASE 
                                WHEN ROUND((hours::numeric - TRUNC(hours::numeric)) * 60) >= 60 THEN TRUNC(hours::numeric) + 1 
                                ELSE TRUNC(hours::numeric) 
                              END
                        """))
                        db_mig.commit()
                        
                        db_mig.execute(text("ALTER TABLE project_logs ALTER COLUMN hours TYPE INTEGER USING hours::integer"))
                        db_mig.commit()
                    print("project_logs table migrated successfully (PostgreSQL).")
            except Exception as e:
                print(f"Error migrating project_logs: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()

    # Migrate projects table (Float hours_invested -> Int hours_invested_hours and Int hours_invested_minutes)
    if "projects" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("projects")]
        if "hours_invested_hours" not in columns or "hours_invested" in columns:
            db_mig = next(get_db())
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    print("Migrating projects table to hours and minutes (SQLite)...")
                    existing_records = db_mig.execute(text("SELECT id, user_id, name, description, status, start_date, end_date, hours_invested FROM projects")).all()
                    
                    db_mig.execute(text("DROP TABLE IF EXISTS projects"))
                    db_mig.commit()
                    
                    db_mig.execute(text("""
                        CREATE TABLE projects (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            name VARCHAR NOT NULL,
                            description TEXT,
                            status VARCHAR NOT NULL,
                            start_date DATE,
                            end_date DATE,
                            github_url VARCHAR,
                            host_url VARCHAR,
                            hours_invested_hours INTEGER NOT NULL DEFAULT 0,
                            hours_invested_minutes INTEGER NOT NULL DEFAULT 0,
                            FOREIGN KEY(user_id) REFERENCES users(id)
                        )
                    """))
                    db_mig.execute(text("CREATE INDEX ix_projects_id ON projects (id)"))
                    db_mig.commit()
                    
                    for r in existing_records:
                        h_float = float(r[7]) if r[7] is not None else 0.0
                        h_int = int(h_float)
                        m_int = int(round((h_float - h_int) * 60))
                        if m_int >= 60:
                            h_int += 1
                            m_int = 0
                        db_mig.execute(text("""
                            INSERT INTO projects (id, user_id, name, description, status, start_date, end_date, hours_invested_hours, hours_invested_minutes)
                            VALUES (:id, :user_id, :name, :description, :status, :start_date, :end_date, :hours_invested_hours, :hours_invested_minutes)
                        """), {
                            "id": r[0],
                            "user_id": r[1],
                            "name": r[2],
                            "description": r[3],
                            "status": r[4],
                            "start_date": r[5],
                            "end_date": r[6],
                            "hours_invested_hours": h_int,
                            "hours_invested_minutes": m_int
                        })
                    db_mig.commit()
                    print("projects table migrated successfully (SQLite).")
                else:
                    print("Migrating projects table to hours and minutes (PostgreSQL)...")
                    if "hours_invested_hours" not in columns:
                        db_mig.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS hours_invested_hours INTEGER DEFAULT 0"))
                    if "hours_invested_minutes" not in columns:
                        db_mig.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS hours_invested_minutes INTEGER DEFAULT 0"))
                    db_mig.commit()
                    
                    if "hours_invested" in columns:
                        db_mig.execute(text("""
                            UPDATE projects 
                            SET hours_invested_minutes = CASE 
                                WHEN ROUND((hours_invested::numeric - TRUNC(hours_invested::numeric)) * 60) >= 60 THEN 0 
                                ELSE ROUND((hours_invested::numeric - TRUNC(hours_invested::numeric)) * 60) 
                              END,
                              hours_invested_hours = CASE 
                                WHEN ROUND((hours_invested::numeric - TRUNC(hours_invested::numeric)) * 60) >= 60 THEN TRUNC(hours_invested::numeric) + 1 
                                ELSE TRUNC(hours_invested::numeric) 
                              END
                        """))
                        db_mig.commit()
                        
                        db_mig.execute(text("ALTER TABLE projects DROP COLUMN IF EXISTS hours_invested"))
                        db_mig.commit()
                    print("projects table migrated successfully (PostgreSQL).")
            except Exception as e:
                print(f"Error migrating projects: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()

    # Migrate projects table to add github_url and host_url columns if they don't exist
    if "projects" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("projects")]
        db_mig = next(get_db())
        try:
            dialect = db_mig.bind.dialect.name
            if "github_url" not in columns:
                if dialect == "sqlite":
                    db_mig.execute(text("ALTER TABLE projects ADD COLUMN github_url VARCHAR"))
                else:
                    db_mig.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_url VARCHAR"))
                db_mig.commit()
                print("Added column github_url to projects table.")
            if "host_url" not in columns:
                if dialect == "sqlite":
                    db_mig.execute(text("ALTER TABLE projects ADD COLUMN host_url VARCHAR"))
                else:
                    db_mig.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS host_url VARCHAR"))
                db_mig.commit()
                print("Added column host_url to projects table.")
        except Exception as e:
            print(f"Error migrating projects github/host columns: {e}")
            db_mig.rollback()
        finally:
            db_mig.close()

    # Migrate users table to add weekly_target_hours column if it doesn't exist
    if "users" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("users")]
        if "weekly_target_hours" not in columns:
            db_mig = next(get_db())
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    db_mig.execute(text("ALTER TABLE users ADD COLUMN weekly_target_hours INTEGER NOT NULL DEFAULT 10"))
                else:
                    db_mig.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_target_hours INTEGER NOT NULL DEFAULT 10"))
                db_mig.commit()
                print("Added column weekly_target_hours to users table.")
            except Exception as e:
                print(f"Error migrating users table: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()
                
except Exception as e:
    print(f"Inspector migration error: {e}")

# Run default seeding on startup ONLY if database is empty (no users or no technologies)
db = next(get_db())
try:
    has_techs = db.query(models.Technology).first() is not None
    has_admin = db.query(models.User).filter(models.User.role == "admin").first() is not None
    
    if not has_techs or not has_admin:
        print("First-time startup: Seeding default database records...")
        crud.run_db_seeding(db)
        
    # Always seed badges to make sure they exist in the database
    crud.seed_default_badges(db)
except Exception as e:
    print(f"Error seeding database on startup: {e}")
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Team Learning & Progress Tracker",
    version="1.0.0"
)

# Set CORS middleware
origins = [
    "https://dev-trackers-gray.vercel.app",
    "https://dev-trackers.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login-form")

# ==========================================
# AUTHENTICATION DEPENDENCIES
# ==========================================

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

# ==========================================
# AUTH ROUTERS
# ==========================================

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=schemas.Token)
def login_json(login_data: Dict[str, str], db: Session = Depends(get_db)):
    """JSON Login Endpoint (convenient for React frontend fetch request)"""
    username = login_data.get("username")
    password = login_data.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    user = crud.get_user_by_username(db, username=username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")
        
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post(f"{settings.API_V1_STR}/auth/login-form", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 Form Login Endpoint (for OpenAPI docs)"""
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")
        
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get(f"{settings.API_V1_STR}/users/me", response_model=schemas.UserResponse)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==========================================
# ADMIN: USER MANAGEMENT
# ==========================================

@app.get(f"{settings.API_V1_STR}/admin/users", response_model=List[schemas.UserResponse])
def admin_get_users(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    return crud.get_users(db)

@app.post(f"{settings.API_V1_STR}/admin/users", response_model=schemas.UserResponse)
def admin_create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_email = crud.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)

@app.put(f"{settings.API_V1_STR}/admin/users/{{user_id}}", response_model=schemas.UserResponse)
def admin_update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    # Verify username uniqueness
    if user_update.username and user_update.username != db_user.username:
        if crud.get_user_by_username(db, user_update.username):
            raise HTTPException(status_code=400, detail="Username already exists")
    # Verify email uniqueness
    if user_update.email and user_update.email != db_user.email:
        if crud.get_user_by_email(db, user_update.email):
            raise HTTPException(status_code=400, detail="Email already exists")
            
    updated = crud.update_user(db, user_id, user_update)
    return updated

@app.delete(f"{settings.API_V1_STR}/admin/users/{{user_id}}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete currently logged-in administrator")
    deleted = crud.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User successfully deleted"}

@app.post(f"{settings.API_V1_STR}/admin/users/{{user_id}}/reset-password")
def admin_reset_password(user_id: int, data: Dict[str, str], db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    new_password = data.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="Password is required")
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.hashed_password = security.get_password_hash(new_password)
    db.commit()
    
    crud.log_activity(db, user_id=db_user.id, user_name=db_user.full_name,
                     activity_type="password_reset", detail="Password was reset by Administrator")
    db.commit()
    return {"detail": "Password successfully reset"}

@app.get(f"{settings.API_V1_STR}/admin/users/{{user_id}}/profile")
def admin_get_user_profile(user_id: int, week_offset: int = 0, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this profile"
        )
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.verify_and_reset_expired_streak(db, user_id)
        
    total_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(models.DailyLog.user_id == user_id).scalar() or 0
    total_hours = total_minutes / 60.0
    # Current rank calculation
    leaderboard = db.query(
        models.User.id,
        func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).label("total_minutes")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).desc()).all()
    
    rank = 0
    for idx, row in enumerate(leaderboard):
        if row.id == user_id:
            rank = idx + 1
            break
            
    # Assigned technologies
    completed_topic_ids = {ct.topic_id for ct in user.completed_topics}
    assigned_techs = []
    for ut in user.assigned_technologies:
        tech = ut.technology
        
        # Build detailed topics list
        topics_list = []
        for t in tech.topics:
            comp = next((ct for ct in user.completed_topics if ct.topic_id == t.id), None)
            topics_list.append({
                "id": t.id,
                "name": t.name,
                "completed": comp is not None,
                "completed_at": comp.completed_at if comp else None
            })
            
        completed_count = sum(1 for t in topics_list if t["completed"])
        assigned_techs.append({
            "id": tech.id,
            "name": tech.name,
            "description": tech.description,
            "total_topics": len(tech.topics),
            "completed_topics": completed_count,
            "topics": topics_list
        })

    # Weekly hours for chart (total work base)
    today = get_ist_date() - timedelta(weeks=week_offset)
    start_of_week = today - timedelta(days=(today.weekday() + 1) % 7) # Sunday
    week_dates = [start_of_week + timedelta(days=i) for i in range(7)]
    week_days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    weekly_logs = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_week,
        models.DailyLog.date <= start_of_week + timedelta(days=6)
    ).all()

    weekly_hours_map = {d: 0.0 for d in week_dates}
    for log in weekly_logs:
        if log.date in weekly_hours_map:
            weekly_hours_map[log.date] += log.hours + log.minutes / 60.0

    weekly_hours_list = [weekly_hours_map[d] for d in week_dates]

    return {
        "user": user,
        "rank": rank,
        "total_hours": total_hours,
        "current_streak": user.streak.current_streak if user.streak else 0,
        "longest_streak": user.streak.longest_streak if user.streak else 0,
        "assigned_technologies": assigned_techs,
        "completed_topics_count": len(user.completed_topics),
        "projects_count": len(user.projects),
        "achievements": [],
        "recent_logs": db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).order_by(models.DailyLog.date.desc()).limit(10).all(),
        "week_days": week_days,
        "week_dates": [str(d) for d in week_dates],
        "weekly_hours": weekly_hours_list
    }

# ==========================================
# ADMIN: ROADMAP & TECH MANAGEMENT
# ==========================================

@app.get(f"{settings.API_V1_STR}/technologies", response_model=List[schemas.TechResponse])
def get_technologies(db: Session = Depends(get_db)):
    return crud.get_technologies(db)

@app.post(f"{settings.API_V1_STR}/admin/tech", response_model=schemas.TechResponse)
def admin_create_tech(tech: schemas.TechCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    db_tech = crud.get_technology_by_name(db, name=tech.name)
    if db_tech:
        raise HTTPException(status_code=400, detail="Technology name already exists")
    return crud.create_technology(db, tech)

@app.put(f"{settings.API_V1_STR}/admin/tech/{{tech_id}}", response_model=schemas.TechResponse)
def admin_update_tech(tech_id: int, tech_update: schemas.TechCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    db_tech = crud.get_technology(db, tech_id)
    if not db_tech:
        raise HTTPException(status_code=404, detail="Technology not found")
        
    updated = crud.update_technology(db, tech_id, tech_update)
    
    return updated

@app.delete(f"{settings.API_V1_STR}/admin/tech/{{tech_id}}")
def admin_delete_tech(tech_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    deleted = crud.delete_technology(db, tech_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Technology not found")
    return {"detail": "Technology successfully deleted"}

@app.post(f"{settings.API_V1_STR}/admin/users/{{user_id}}/roadmap")
def admin_assign_roadmap(user_id: int, data: Dict[str, List[int]], db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    tech_ids = data.get("tech_ids", [])
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    crud.assign_roadmap(db, user_id, tech_ids)
    return {"detail": "Roadmap successfully updated"}

# ==========================================
# ADMIN: SETTINGS & EMAIL LOGS
# ==========================================

@app.get(f"{settings.API_V1_STR}/admin/settings", response_model=schemas.SettingsResponse)
def admin_get_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    return crud.get_settings(db)

@app.put(f"{settings.API_V1_STR}/admin/settings", response_model=schemas.SettingsResponse)
def admin_update_settings(settings_data: schemas.SettingsUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    return crud.update_settings(db, settings_data)

@app.get(f"{settings.API_V1_STR}/admin/email-logs", response_model=List[schemas.EmailLogResponse])
def admin_get_email_logs(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    return db.query(models.EmailLog).order_by(models.EmailLog.created_at.desc()).limit(100).all()

@app.delete(f"{settings.API_V1_STR}/admin/email-logs")
def admin_delete_email_logs(payload: schemas.DeleteEmailLogsRequest, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    if payload.delete_all:
        db.query(models.EmailLog).delete()
        db.commit()
        return {"detail": "All email logs deleted successfully."}
    elif payload.ids:
        db.query(models.EmailLog).filter(models.EmailLog.id.in_(payload.ids)).delete(synchronize_session=False)
        db.commit()
        return {"detail": f"Successfully deleted {len(payload.ids)} email logs."}
    else:
        raise HTTPException(status_code=400, detail="Either 'ids' list or 'delete_all=True' must be provided.")

# ==========================================
# WORK LOGS
# ==========================================

@app.post(f"{settings.API_V1_STR}/logs", response_model=schemas.DailyLogResponse)
def log_work(log_data: schemas.DailyLogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Calculate if log is past deadline (Admin settings)
    # Simple hours comparison
    sys_settings = crud.get_settings(db)
    deadline_str = sys_settings.daily_log_deadline
    grace_mins = sys_settings.grace_period_minutes
    day_cutoff_str = getattr(sys_settings, "day_cutoff_time", "00:00")
    
    # Parse cutoff time
    try:
        cutoff_time = datetime.strptime(day_cutoff_str, "%H:%M").time()
    except Exception:
        cutoff_time = datetime.strptime("00:00", "%H:%M").time()
        
    now_ist = get_ist_time()
    
    # Determine the target date based on day_cutoff_time
    if now_ist.time() < cutoff_time:
        target_date = now_ist.date() - timedelta(days=1)
    else:
        target_date = now_ist.date()
        
    # Override log date
    log_data.date = target_date
    
    # Check if past deadline
    try:
        deadline_time = datetime.strptime(deadline_str, "%H:%M").time()
        deadline_dt = datetime.combine(target_date, deadline_time) + timedelta(minutes=grace_mins)
        if now_ist > deadline_dt:
            # Past deadline, we still allow logging but it will be flagged as normal
            pass
    except Exception:
        pass
            
    try:
        db_log = crud.create_daily_log(db, current_user.id, log_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Trigger badge evaluation
    crud.check_and_update_badges(db, current_user.id)
    
    # Map user name back for response schema
    db_log.user_name = current_user.full_name
    return db_log

@app.get(f"{settings.API_V1_STR}/logs", response_model=List[schemas.DailyLogResponse])
def get_logs(
    user_id: Optional[int] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.DailyLog)
    
    # Security check: Team members can only see their own logs unless they are admin
    if current_user.role != "admin":
        query = query.filter(models.DailyLog.user_id == current_user.id)
    elif user_id is not None:
        query = query.filter(models.DailyLog.user_id == user_id)
        
    if category:
        query = query.filter(models.DailyLog.category == category)
    if start_date:
        query = query.filter(models.DailyLog.date >= start_date)
    if end_date:
        query = query.filter(models.DailyLog.date <= end_date)
        
    results = query.order_by(models.DailyLog.date.desc()).offset(skip).limit(limit).all()
    
    # Map user names
    for log in results:
        log.user_name = log.user.full_name
        
    return results

# ==========================================
# ROADMAPS & LEARNING TRACKER
# ==========================================

@app.get(f"{settings.API_V1_STR}/roadmap")
def get_my_roadmap(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    assigned_techs = crud.get_user_assigned_technologies(db, user_id)
    
    # Fetch completed topic IDs
    completed_ids = [ct.topic_id for ct in current_user.completed_topics]
    
    roadmap_data = []
    for tech in assigned_techs:
        topics_list = []
        completed_count = 0
        for topic in tech.topics:
            is_completed = topic.id in completed_ids
            if is_completed:
                completed_count += 1
                
            # Get completion details if completed
            comp_rec = next((ct for ct in current_user.completed_topics if ct.topic_id == topic.id), None)
            topics_list.append({
                "id": topic.id,
                "name": topic.name,
                "sequence_order": topic.sequence_order,
                "is_completed": is_completed,
                "completed_at": comp_rec.completed_at if comp_rec else None
            })
            
        topics_list.sort(key=lambda x: x["sequence_order"])
        percentage = (completed_count / len(tech.topics) * 100) if tech.topics else 0.0
        roadmap_data.append({
            "id": tech.id,
            "name": tech.name,
            "description": tech.description,
            "percentage": round(percentage, 1),
            "topics": topics_list
        })
        
    return roadmap_data

@app.post(f"{settings.API_V1_STR}/roadmap/topics/{{topic_id}}/complete")
def complete_topic_route(topic_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify topic exists
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    crud.complete_topic(db, current_user.id, topic_id)
    crud.check_and_update_badges(db, current_user.id)
    return {"detail": "Topic marked as completed"}

@app.delete(f"{settings.API_V1_STR}/roadmap/topics/{{topic_id}}/uncomplete")
def uncomplete_topic_route(topic_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.uncomplete_topic(db, current_user.id, topic_id)
    if not success:
        raise HTTPException(status_code=400, detail="Topic was not marked as completed")
    crud.check_and_update_badges(db, current_user.id)
    return {"detail": "Topic marked as incomplete"}

# ==========================================
# PROJECTS MODULE
# ==========================================

@app.post(f"{settings.API_V1_STR}/projects", response_model=schemas.ProjectResponse)
def user_create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_project(db, current_user.id, project)

@app.get(f"{settings.API_V1_STR}/projects", response_model=List[schemas.ProjectResponse])
def user_get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Team members only see their own projects, admins see all
    if current_user.role == "admin":
        return crud.get_projects(db)
    return crud.get_projects(db, user_id=current_user.id)

@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}", response_model=schemas.ProjectResponse)
def user_get_project_detail(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Security: Team members can only see their own projects
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return project

@app.post(f"{settings.API_V1_STR}/projects/{{project_id}}/logs", response_model=schemas.ProjectLogResponse)
def user_log_project_hours(project_id: int, log_data: schemas.ProjectLogCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    try:
        db_log = crud.log_project_hours(db, project_id, current_user.id, log_data)
        crud.check_and_update_badges(db, current_user.id)
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    return db_log

@app.put(f"{settings.API_V1_STR}/projects/{{project_id}}", response_model=schemas.ProjectResponse)
def user_update_project(project_id: int, project_update: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    updated_project = crud.update_project(db, project_id, project_update)
    crud.check_and_update_badges(db, project.user_id)
    return updated_project

@app.delete(f"{settings.API_V1_STR}/projects/{{project_id}}")
def user_delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    crud.delete_project(db, project_id)
    return {"detail": "Project deleted"}

# ==========================================
# LEADERBOARD & ACHIEVEMENTS
# ==========================================

@app.get(f"{settings.API_V1_STR}/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Fetch active developers (role = user)
    users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    user_ids = [u.id for u in users]
    
    today = get_ist_date()
    start_of_week = today - timedelta(days=(today.weekday() + 1) % 7) # Sunday
    start_of_month = today.replace(day=1)
    
    # Bulk query total hours
    total_hours_q = db.query(
        models.DailyLog.user_id, 
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
    ).filter(models.DailyLog.user_id.in_(user_ids)).group_by(models.DailyLog.user_id).all() if user_ids else []
    total_hours_map = {user_id: (minutes or 0) / 60.0 for user_id, minutes in total_hours_q}
    
    # Bulk query weekly hours
    weekly_hours_q = db.query(
        models.DailyLog.user_id, 
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
    ).filter(
        models.DailyLog.user_id.in_(user_ids),
        models.DailyLog.date >= start_of_week
    ).group_by(models.DailyLog.user_id).all() if user_ids else []
    weekly_hours_map = {user_id: (minutes or 0) / 60.0 for user_id, minutes in weekly_hours_q}
    
    # Bulk query monthly hours
    monthly_hours_q = db.query(
        models.DailyLog.user_id, 
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
    ).filter(
        models.DailyLog.user_id.in_(user_ids),
        models.DailyLog.date >= start_of_month
    ).group_by(models.DailyLog.user_id).all() if user_ids else []
    monthly_hours_map = {user_id: (minutes or 0) / 60.0 for user_id, minutes in monthly_hours_q}

    # Bulk query streaks
    streaks = db.query(models.Streak).filter(models.Streak.user_id.in_(user_ids)).all() if user_ids else []
    streaks_map = {s.user_id: s for s in streaks}
    
    # Verify and reset streaks in memory, then commit once at the end
    streak_changed = False
    for user_id in user_ids:
        s = streaks_map.get(user_id)
        if s and s.last_log_date:
            if crud.get_working_days_gap(s.last_log_date, today) > 0:
                s.current_streak = 0
                streak_changed = True
                
    if streak_changed:
        db.commit()
        
    leaderboard_data = []
    for user in users:
        u_streak = streaks_map.get(user.id)
        leaderboard_data.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "team": user.team,
            "total_hours": round(total_hours_map.get(user.id, 0.0), 4),
            "weekly_hours": round(weekly_hours_map.get(user.id, 0.0), 4),
            "monthly_hours": round(monthly_hours_map.get(user.id, 0.0), 4),
            "current_streak": u_streak.current_streak if u_streak else 0,
            "longest_streak": u_streak.longest_streak if u_streak else 0
        })
        
    leaderboard_data.sort(key=lambda x: x["total_hours"], reverse=True)
    return leaderboard_data


@app.get(f"{settings.API_V1_STR}/debug-db")
def debug_db(db: Session = Depends(get_db)):
    # 1. Total count of daily_logs
    total_logs = db.query(models.DailyLog).count()
    
    # 2. Get the last 20 daily logs with date and username
    logs = (
        db.query(models.DailyLog)
        .order_by(models.DailyLog.date.desc())
        .limit(20)
        .all()
    )
    serialized_logs = []
    for log in logs:
        serialized_logs.append({
            "id": log.id,
            "username": log.user.username if log.user else None,
            "date": log.date.isoformat() if log.date else None,
            "hours": log.hours,
            "minutes": log.minutes,
            "description": log.description[:50] if log.description else ""
        })
        
    # 3. Print dates calculations
    today = get_ist_date()
    start_of_current_week = today - timedelta(days=(today.weekday() + 1) % 7)
    start_of_prev_week = start_of_current_week - timedelta(days=7)
    end_of_prev_week = start_of_current_week - timedelta(days=1)
    
    return {
        "database_url_type": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
        "total_logs_count": total_logs,
        "ist_today": today.isoformat(),
        "ist_today_weekday": today.weekday(),
        "start_of_current_week": start_of_current_week.isoformat(),
        "start_of_prev_week": start_of_prev_week.isoformat(),
        "end_of_prev_week": end_of_prev_week.isoformat(),
        "sample_logs": serialized_logs
    }


# ==========================================
# SHOWCASE GALLERY ENDPOINT
# ==========================================

@app.get(f"{settings.API_V1_STR}/showcase")
def get_showcase(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    today = get_ist_date()
    now_ist = get_ist_time()
    
    # 1. Featured Projects (started within the last 3 days, max 6, most recent first)
    three_days_ago = today - timedelta(days=3)
    projects = (
        db.query(models.Project)
        .filter(models.Project.start_date >= three_days_ago)
        .order_by(models.Project.id.desc())
        .limit(6)
        .all()
    )
    serialized_projects = []
    for p in projects:
        # Serialize project development logs
        serialized_logs = []
        for log in p.logs:
            serialized_logs.append({
                "id": log.id,
                "hours": log.hours,
                "minutes": log.minutes,
                "description": log.description,
                "logged_at": log.logged_at.isoformat()
            })
        # Sort logs by date descending
        serialized_logs.sort(key=lambda x: x["logged_at"], reverse=True)

        serialized_projects.append({
            "id": p.id,
            "user_name": p.user.full_name,
            "username": p.user.username,
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "github_url": p.github_url,
            "host_url": p.host_url,
            "hours_invested": round(p.hours_invested_hours + p.hours_invested_minutes / 60.0, 2),
            "hours": p.hours_invested_hours,
            "minutes": p.hours_invested_minutes,
            "date": p.start_date.isoformat() if p.start_date else None,
            "logs": serialized_logs
        })

    # 2. Hard Work Spotlight (logs from last 24 hours, duration >= 2h 30m)
    cutoff_24h = now_ist - timedelta(hours=24)
    daily_logs = (
        db.query(models.DailyLog)
        .filter(
            models.DailyLog.created_at >= cutoff_24h,
            (models.DailyLog.hours * 60 + models.DailyLog.minutes) >= 150
        )
        .order_by(models.DailyLog.created_at.desc())
        .all()
    )
    GRACE_WORDS = [
        "Incredible focus! Setting the gold standard for developer grind.",
        "Unstoppable energy! Absolute coding masterclass.",
        "Phenomenal session! Powering through lines of code like a champ.",
        "Pure dedication! Turning coffee into working software.",
        "Elite work ethic! Building the future, one byte at a time.",
        "Outstanding stamina! Pushing limits and achieving milestones.",
        "Dev team superstar! Heavy-lifting development with ease."
    ]
    serialized_daily_kings = []
    for log in daily_logs:
        grace_word = GRACE_WORDS[log.id % len(GRACE_WORDS)]
        serialized_daily_kings.append({
            "id": log.id,
            "user_name": log.user.full_name,
            "username": log.user.username,
            "date": log.date.isoformat(),
            "hours": log.hours,
            "minutes": log.minutes,
            "category": log.category,
            "description": log.description,
            "grace_word": grace_word
        })

    # 3. Learning Achievements (completed technologies in the last 24 hours)
    # A user completes a technology if they completed all its topics, with the last completion within 24h
    user_techs = db.query(models.UserTechnology).all()
    completed_techs = []
    processed_pairs = set()
    
    for ut in user_techs:
        pair_key = (ut.user_id, ut.technology_id)
        if pair_key in processed_pairs:
            continue
        processed_pairs.add(pair_key)
        
        user = ut.user
        tech = ut.technology
        topics = tech.topics
        if not topics:
            continue
        topic_ids = [t.id for t in topics]
        
        completions = db.query(models.CompletedTopic).filter(
            models.CompletedTopic.user_id == user.id,
            models.CompletedTopic.topic_id.in_(topic_ids)
        ).all()
        
        if len(completions) == len(topics):
            latest_completion_at = max(c.completed_at for c in completions)
            if latest_completion_at.tzinfo is not None:
                latest_completion_at = latest_completion_at.replace(tzinfo=None)
            if latest_completion_at >= cutoff_24h:
                completed_techs.append({
                    "id": f"{user.id}-{tech.id}",
                    "user_name": user.full_name,
                    "username": user.username,
                    "tech_name": tech.name,
                    "completed_date": latest_completion_at.date().isoformat(),
                    "completed_time": latest_completion_at.strftime("%I:%M %p"),
                    "completed_at": latest_completion_at.isoformat()
                })

    # 4. Weekly Legends (top 3 contributors for previous week starting Sunday and ending Saturday)
    start_of_current_week = today - timedelta(days=(today.weekday() + 1) % 7)
    start_of_prev_week = start_of_current_week - timedelta(days=7)
    end_of_prev_week = start_of_current_week - timedelta(days=1)
    
    active_users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    user_ids = [u.id for u in active_users]
    
    weekly_hours_q = db.query(
        models.DailyLog.user_id,
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
    ).filter(
        models.DailyLog.user_id.in_(user_ids),
        models.DailyLog.date >= start_of_prev_week,
        models.DailyLog.date <= end_of_prev_week
    ).group_by(models.DailyLog.user_id).all() if user_ids else []
    
    weekly_hours_map = {user_id: (minutes or 0) for user_id, minutes in weekly_hours_q}
    
    weekly_contributors = []
    for u in active_users:
        total_mins = weekly_hours_map.get(u.id, 0)
        h = total_mins // 60
        m = total_mins % 60
        weekly_contributors.append({
            "user_id": u.id,
            "user_name": u.full_name,
            "username": u.username,
            "total_hours": h,
            "total_minutes": m
        })
        
    weekly_contributors.sort(key=lambda x: (x["total_hours"] * 60 + x["total_minutes"]), reverse=True)
    weekly_legends = weekly_contributors[:3]

    # 5. Live Activity Feed (last 24 hours activities)
    activities = (
        db.query(models.ActivityLog)
        .filter(models.ActivityLog.created_at >= cutoff_24h)
        .order_by(models.ActivityLog.created_at.desc())
        .all()
    )
    serialized_activities = []
    for act in activities:
        serialized_activities.append({
            "id": act.id,
            "user_name": act.user_name,
            "activity_type": act.activity_type,
            "detail": act.detail,
            "created_at": act.created_at.isoformat()
        })

    # 6. Recent Badge Unlocks (last 24 hours)
    recent_badge_unlocks = db.query(models.BadgeUnlockHistory).filter(
        models.BadgeUnlockHistory.unlock_timestamp >= cutoff_24h
    ).order_by(models.BadgeUnlockHistory.unlock_timestamp.desc()).all()
    
    serialized_badge_unlocks = []
    for bu in recent_badge_unlocks:
        serialized_badge_unlocks.append({
            "id": bu.id,
            "user_id": bu.user_id,
            "user_name": bu.user.full_name,
            "username": bu.user.username,
            "badge_id": bu.badge_id,
            "badge_name": bu.badge_name,
            "category": bu.category,
            "rarity": bu.rarity,
            "icon": bu.badge.icon,
            "description": bu.badge.description,
            "unlock_date": bu.unlock_date.isoformat(),
            "unlock_time": bu.unlock_time,
            "unlock_timestamp": bu.unlock_timestamp.isoformat(),
            "unlock_source": bu.unlock_source
        })

    return {
        "projects": serialized_projects,
        "daily_kings": serialized_daily_kings,
        "completed_techs": completed_techs,
        "weekly_legends": weekly_legends,
        "activities": serialized_activities,
        "recent_badge_unlocks": serialized_badge_unlocks
    }

# ==========================================
# ACTIVITIES FEED
# ==========================================

@app.get(f"{settings.API_V1_STR}/activities", response_model=List[schemas.ActivityLogResponse])
def get_activities(limit: int = 50, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).limit(limit).all()

# ==========================================
# USER DASHBOARD SUMMARY
# ==========================================

@app.get(f"{settings.API_V1_STR}/dashboard")
def get_user_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    crud.verify_and_reset_expired_streak(db, user_id)
    
    # Date calculations
    today = get_ist_date()
    start_of_week = today - timedelta(days=(today.weekday() + 1) % 7) # Sunday
    start_of_month = today.replace(day=1)
    
    # Hours calculation
    total_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(models.DailyLog.user_id == user_id).scalar() or 0
    total_hours = total_minutes / 60.0
    
    # Today's hours (both total and categories)
    today_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date == today
    ).scalar() or 0
    today_hours = today_minutes / 60.0

    today_coding_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date == today,
        models.DailyLog.category == "Coding"
    ).scalar() or 0
    today_coding_hours = today_coding_minutes / 60.0

    today_learning_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date == today,
        models.DailyLog.category == "Learning"
    ).scalar() or 0
    today_learning_hours = today_learning_minutes / 60.0
    
    weekly_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_week
    ).scalar() or 0
    weekly_hours = weekly_minutes / 60.0
    
    monthly_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_month
    ).scalar() or 0
    monthly_hours = monthly_minutes / 60.0
    
    # Category hours
    coding_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Coding"
    ).scalar() or 0
    coding_hours = coding_minutes / 60.0
    
    learning_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Learning"
    ).scalar() or 0
    learning_hours = learning_minutes / 60.0
    
    research_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Research"
    ).scalar() or 0
    research_hours = research_minutes / 60.0
    
    other_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Other"
    ).scalar() or 0
    other_hours = other_minutes / 60.0
    
    # Rank calculation
    leaderboard = db.query(
        models.User.id,
        func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).label("total_minutes")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).desc()).all()
    
    rank = 99
    for idx, row in enumerate(leaderboard):
        if row.id == user_id:
            rank = idx + 1
            break
            
    # Completed topics
    completed_topics = len(current_user.completed_topics)
    
    # Progress: total topics vs completed assigned topics
    total_assigned_topics = 0
    for ut in current_user.assigned_technologies:
        total_assigned_topics += len(ut.technology.topics)
        
    progress_percentage = (completed_topics / total_assigned_topics * 100) if total_assigned_topics > 0 else 0.0
    
    # Recent Activities (user-specific)
    recent_activities = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == user_id
    ).order_by(models.ActivityLog.created_at.desc()).limit(5).all()
    
    # Upcoming deadline
    settings_rec = crud.get_settings(db)
    deadline_time = settings_rec.daily_log_deadline
    
    # Check if user logged today
    logged_today = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date == today
    ).count() > 0
    
    # Contribution Heatmap Data (last 30 days)
    heatmap_start = today - timedelta(days=30)
    heatmap_logs = db.query(
        models.DailyLog.date,
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes).label("minutes")
    ).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= heatmap_start
    ).group_by(models.DailyLog.date).all()
    
    heatmap_data = {str(hl.date): round(hl.minutes / 60.0, 4) for hl in heatmap_logs}

    # Coding + Learning hours this week
    weekly_work_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_week,
        models.DailyLog.category.in_(["Coding", "Learning"])
    ).scalar() or 0
    weekly_work_hours = weekly_work_minutes / 60.0

    return {
        "full_name": current_user.full_name,
        "current_streak": current_user.streak.current_streak if current_user.streak else 0,
        "longest_streak": current_user.streak.longest_streak if current_user.streak else 0,
        "total_hours": round(total_hours, 4),
        "weekly_hours": round(weekly_hours, 4),
        "monthly_hours": round(monthly_hours, 4),
        "weekly_target_hours": current_user.weekly_target_hours,
        "today_hours": round(today_hours, 4),
        "today_coding_hours": round(today_coding_hours, 4),
        "today_learning_hours": round(today_learning_hours, 4),
        "coding_hours": round(coding_hours, 4),
        "learning_hours": round(learning_hours, 4),
        "research_hours": round(research_hours, 4),
        "other_hours": round(other_hours, 4),
        "completed_topics": completed_topics,
        "progress_percentage": round(progress_percentage, 1),
        "rank": rank,
        "logged_today": logged_today,
        "deadline_time": deadline_time,
        "recent_activities": recent_activities,
        "heatmap": heatmap_data,
        "weekly_work_hours": round(weekly_work_hours, 4)
    }

# ==========================================
# ADMIN DASHBOARD SUMMARY
# ==========================================

@app.get(f"{settings.API_V1_STR}/admin/dashboard")
def get_admin_dashboard(week_offset: int = 0, db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    today = get_ist_date() - timedelta(weeks=week_offset)
    start_of_week = today - timedelta(days=(today.weekday() + 1) % 7) # Sunday
    start_of_month = today.replace(day=1)
    
    # Counts
    total_users = db.query(models.User).filter(models.User.role == "user").count()
    active_users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).count()
    
    # Today's log submission status
    team_members = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    submitted_user_ids = [dl.user_id for dl in db.query(models.DailyLog).filter(models.DailyLog.date == today).all()]
    
    submitted_count = len(set(submitted_user_ids))
    missing_count = active_users - submitted_count
    
    # Missing names
    missing_users = [u.full_name for u in team_members if u.id not in submitted_user_ids]
    submitted_users = [u.full_name for u in team_members if u.id in submitted_user_ids]
    
    # Total Hours
    total_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).scalar() or 0
    total_hours = total_minutes / 60.0
    weekly_team_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(
        models.DailyLog.date >= start_of_week,
        models.DailyLog.date <= start_of_week + timedelta(days=6)
    ).scalar() or 0
    weekly_team_hours = weekly_team_minutes / 60.0
    monthly_team_minutes = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(models.DailyLog.date >= start_of_month).scalar() or 0
    monthly_team_hours = monthly_team_minutes / 60.0
    
    # Performers & streaks
    # Top 3 Performers
    top_performers = db.query(
        models.User.full_name,
        func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).label("minutes")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes), 0).desc()).limit(3).all()
    
    top_performers_list = [{"name": tp[0], "hours": round(tp[1] / 60.0, 4)} for tp in top_performers]
    
    # Longest Current Streak
    longest_current_streak_user = db.query(
        models.User.full_name,
        models.Streak.current_streak
    ).join(models.Streak).filter(models.User.role == "user").order_by(models.Streak.current_streak.desc()).first()
    
    longest_streak_val = longest_current_streak_user[1] if longest_current_streak_user else 0
    longest_streak_name = longest_current_streak_user[0] if longest_current_streak_user else "N/A"
    
    # Most Active User (Most log entries count)
    most_active = db.query(
        models.User.full_name,
        func.count(models.DailyLog.id).label("log_count")
    ).join(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.count(models.DailyLog.id).desc()).first()
    
    most_active_name = most_active[0] if most_active else "N/A"
    most_active_count = most_active[1] if most_active else 0
    
    # Global topics and projects
    total_topics_completed = db.query(models.CompletedTopic).count()
    total_projects = db.query(models.Project).count()
    
    # Recent Activities
    recent_activities = db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).limit(10).all()
 
    # Calculate weekly coding & learning hours for each user
    user_ids = [u.id for u in team_members]
    weekly_logs_q = db.query(
        models.DailyLog.user_id,
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
    ).filter(
        models.DailyLog.user_id.in_(user_ids),
        models.DailyLog.date >= start_of_week,
        models.DailyLog.date <= start_of_week + timedelta(days=6),
        models.DailyLog.category.in_(["Coding", "Learning"])
    ).group_by(models.DailyLog.user_id).all() if user_ids else []
    
    weekly_work_map = {user_id: (minutes or 0) / 60.0 for user_id, minutes in weekly_logs_q}
    
    user_weekly_progress = []
    for user in team_members:
        user_weekly_progress.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "weekly_work_hours": round(weekly_work_map.get(user.id, 0.0), 4),
            "weekly_target_hours": user.weekly_target_hours
        })

    return {
        "total_users": total_users,
        "active_users": active_users,
        "today_submitted_logs": submitted_count,
        "today_missing_logs": missing_count,
        "today_missing_names": missing_users,
        "today_submitted_names": submitted_users,
        "total_team_hours": round(total_hours, 4),
        "weekly_team_hours": round(weekly_team_hours, 4),
        "monthly_team_hours": round(monthly_team_hours, 4),
        "top_performers": top_performers_list,
        "longest_streak_value": longest_streak_val,
        "longest_streak_name": longest_streak_name,
        "most_active_name": most_active_name,
        "most_active_count": most_active_count,
        "total_completed_topics": total_topics_completed,
        "total_projects": total_projects,
        "recent_activities": recent_activities,
        "user_weekly_progress": user_weekly_progress
    }

@app.get(f"{settings.API_V1_STR}/admin/performance")
def get_admin_user_performance(
    week_offset: int = 0, 
    perf_date: Optional[str] = None, 
    db: Session = Depends(get_db), 
    current_admin: models.User = Depends(get_current_admin)
):
    query_date = datetime.strptime(perf_date, "%Y-%m-%d").date() if perf_date else get_ist_date()
    today = get_ist_date() - timedelta(weeks=week_offset)
    start_of_week = today - timedelta(days=(today.weekday() + 1) % 7) # Sunday
    week_dates = [start_of_week + timedelta(days=i) for i in range(7)]
    week_days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    # Fetch all active team members (role = user, is_active = True)
    team_members = db.query(models.User).filter(
        models.User.role == "user", 
        models.User.is_active == True
    ).all()
    
    user_ids = [u.id for u in team_members]
    
    # Query performance date's logs
    today_logs = db.query(models.DailyLog).filter(
        models.DailyLog.date == query_date,
        models.DailyLog.user_id.in_(user_ids)
    ).all() if user_ids else []
    today_logs_map = {log.user_id: log for log in today_logs}
    
    # Query weekly logs
    weekly_logs = db.query(models.DailyLog).filter(
        models.DailyLog.user_id.in_(user_ids),
        models.DailyLog.date >= start_of_week,
        models.DailyLog.date <= start_of_week + timedelta(days=6)
    ).all() if user_ids else []
    
    # Map logs to user_id -> date -> hours
    user_weekly_hours = {u.id: {d: 0.0 for d in week_dates} for u in team_members}
    for log in weekly_logs:
        if log.user_id in user_weekly_hours and log.date in user_weekly_hours[log.user_id]:
            user_weekly_hours[log.user_id][log.date] = log.hours + log.minutes / 60.0
            
    # Query all-time stats: total hours, total logs count
    stats_query = db.query(
        models.DailyLog.user_id,
        func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes).label("total_minutes"),
        func.count(models.DailyLog.id).label("total_logs")
    ).filter(models.DailyLog.user_id.in_(user_ids)).group_by(models.DailyLog.user_id).all() if user_ids else []
    
    stats_map = {
        user_id: {"total_hours": (total_minutes or 0) / 60.0, "total_logs": total_logs or 0} 
        for user_id, total_minutes, total_logs in stats_query
    }
    
    users_performance = []
    for user in team_members:
        user_stats = stats_map.get(user.id, {"total_hours": 0.0, "total_logs": 0})
        total_hours = user_stats["total_hours"]
        total_logs = user_stats["total_logs"]
        avg_hours = total_hours / total_logs if total_logs > 0 else 0.0
        
        # Today's log details
        today_log = today_logs_map.get(user.id)
        today_log_details = None
        if today_log:
            today_log_details = {
                "hours": today_log.hours,
                "minutes": today_log.minutes,
                "category": today_log.category,
                "description": today_log.description
            }
            
        # Compile weekly daily hours array (Mon - Sun)
        weekly_daily_hours = [
            round(user_weekly_hours[user.id][d], 4) for d in week_dates
        ]
        
        # Calculate Technology Progress
        completed_topics_ids = {ct.topic_id for ct in user.completed_topics}
        completed_techs_list = []
        for ut in user.assigned_technologies:
            tech = ut.technology
            if tech.topics:
                tech_topic_ids = {t.id for t in tech.topics}
                if tech_topic_ids.issubset(completed_topics_ids):
                    completed_techs_list.append(tech.name)
 
        users_performance.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "has_logged_today": today_log is not None,
            "today_log": today_log_details,
            "average_hours_per_day": round(avg_hours, 4),
            "total_hours": round(total_hours, 4),
            "total_logs_count": total_logs,
            "weekly_hours": weekly_daily_hours,
            "total_assigned_techs": len(user.assigned_technologies),
            "completed_techs_count": len(completed_techs_list),
            "completed_techs_list": completed_techs_list
        })
        
    return {
        "users_performance": users_performance,
        "week_days": week_days,
        "week_dates": [d.strftime("%Y-%m-%d") for d in week_dates]
    }

# ==========================================
# NOTIFICATIONS & DEADLINE CHECKS
# ==========================================

@app.post(f"{settings.API_V1_STR}/notifications/reminder")
def trigger_daily_reminders(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    """Triggers mock reminder emails for active users who haven't logged today's work yet"""
    today = get_ist_date()
    settings_rec = crud.get_settings(db)
    deadline_time = settings_rec.daily_log_deadline
    
    # Find active team members
    users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    
    sent_count = 0
    for user in users:
        # Check if they logged today
        has_logged = db.query(models.DailyLog).filter(
            models.DailyLog.user_id == user.id,
            models.DailyLog.date == today
        ).count() > 0
        
        if not has_logged:
            streak_val = user.streak.current_streak if user.streak else 0
            body = (
                f"Hi {user.full_name},\n\n"
                f"This is a reminder to submit your work log for today ({today}).\n"
                f"The daily deadline is configured for {deadline_time}.\n\n"
                f"Your current streak is {streak_val} days! Keep it up.\n\n"
                f"Best,\nTeam Progress Tracker"
            )
            # Send real email via SMTP
            sent, err_msg = send_email_smtp(
                user.email, 
                "Reminder: Submit your work log today!", 
                body,
                smtp_host=settings_rec.smtp_host,
                smtp_port=settings_rec.smtp_port,
                smtp_user=settings_rec.smtp_user,
                smtp_password=settings_rec.smtp_password
            )
            email_log = models.EmailLog(
                recipient_email=user.email,
                subject="Reminder: Submit your work log today!",
                body=body,
                status="Sent" if sent else f"Failed: {err_msg}"
            )
            db.add(email_log)
            sent_count += 1
            
    db.commit()
    
    crud.log_activity(
        db, user_id=current_admin.id, user_name=current_admin.full_name,
        activity_type="system_reminder_triggered",
        detail=f"Triggered manual reminders. Sent {sent_count} reminder emails."
    )
    db.commit()
    
    return {"detail": f"Reminders processed. {sent_count} emails logged."}

@app.post(f"{settings.API_V1_STR}/notifications/deadline-check")
def trigger_deadline_missing_logs(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    """Triggers mock deadline warnings for active users who missed today's work log"""
    today = get_ist_date()
    settings_rec = crud.get_settings(db)
    deadline_time = settings_rec.daily_log_deadline
    
    users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    admin_email = current_admin.email
    
    sent_count = 0
    for user in users:
        # Check if they logged today
        has_logged = db.query(models.DailyLog).filter(
            models.DailyLog.user_id == user.id,
            models.DailyLog.date == today
        ).count() > 0
        
        if not has_logged:
            # 1. Send warning to the user
            user_body = (
                f"Hi {user.full_name},\n\n"
                f"You have missed submitting your daily work log for today ({today}).\n"
                f"The deadline of {deadline_time} has passed.\n"
                f"Your logging streak has been reset.\n\n"
                f"Please update your logging details as soon as possible.\n\n"
                f"Best,\nTeam Progress Tracker"
            )
            # Send real email to the user
            sent_user, err_msg_user = send_email_smtp(
                user.email, 
                f"Missing Daily Work Log - {today}", 
                user_body,
                smtp_host=settings_rec.smtp_host,
                smtp_port=settings_rec.smtp_port,
                smtp_user=settings_rec.smtp_user,
                smtp_password=settings_rec.smtp_password
            )
            user_email = models.EmailLog(
                recipient_email=user.email,
                subject=f"Missing Daily Work Log - {today}",
                body=user_body,
                status="Sent" if sent_user else f"Failed: {err_msg_user}"
            )
            db.add(user_email)
            
            # 2. Send warning to the Admin
            admin_body = (
                f"Hi Administrator,\n\n"
                f"Team Member {user.full_name} ({user.username}) missed submitting their daily work log for {today}.\n"
                f"The configured deadline was {deadline_time}.\n\n"
                f"Best,\nTeam Progress Tracker Notification System"
            )
            # Send real email to the admin
            sent_admin, err_msg_admin = send_email_smtp(
                admin_email, 
                f"Missing Log Alert: {user.username}", 
                admin_body,
                smtp_host=settings_rec.smtp_host,
                smtp_port=settings_rec.smtp_port,
                smtp_user=settings_rec.smtp_user,
                smtp_password=settings_rec.smtp_password
            )
            admin_email_rec = models.EmailLog(
                recipient_email=admin_email,
                subject=f"Missing Log Alert: {user.username}",
                body=admin_body,
                status="Sent" if sent_admin else f"Failed: {err_msg_admin}"
            )
            db.add(admin_email_rec)
            
            # Reset streak!
            if user.streak:
                user.streak.current_streak = 0
                
            sent_count += 2
            
    db.commit()
    
    crud.log_activity(
        db, user_id=current_admin.id, user_name=current_admin.full_name,
        activity_type="system_deadline_check_triggered",
        detail=f"Triggered manual deadline missing log audit. Logged {sent_count} warnings."
    )
    db.commit()
    
    return {"detail": f"Deadline checks processed. {sent_count} warning emails logged. Missing streaks reset."}

@app.post(f"{settings.API_V1_STR}/notifications/broadcast")
def trigger_broadcast_email(
    broadcast_data: schemas.BroadcastEmail,
    db: Session = Depends(get_db), 
    current_admin: models.User = Depends(get_current_admin)
):
    """Sends a manual broadcast email to all active users using the SMTP settings"""
    settings_rec = crud.get_settings(db)
    
    # Get all active user accounts
    users = db.query(models.User).filter(models.User.is_active == True).all()
    
    sent_count = 0
    failed_count = 0
    
    for user in users:
        # Avoid sending to empty emails
        if not user.email:
            continue
            
        sent, err_msg = send_email_smtp(
            user.email,
            broadcast_data.subject,
            broadcast_data.body,
            smtp_host=settings_rec.smtp_host,
            smtp_port=settings_rec.smtp_port,
            smtp_user=settings_rec.smtp_user,
            smtp_password=settings_rec.smtp_password
        )
        
        email_log = models.EmailLog(
            recipient_email=user.email,
            subject=broadcast_data.subject,
            body=broadcast_data.body,
            status="Sent" if sent else f"Failed: {err_msg}"
        )
        db.add(email_log)
        
        if sent:
            sent_count += 1
        else:
            failed_count += 1
            
    db.commit()
    
    crud.log_activity(
        db, user_id=current_admin.id, user_name=current_admin.full_name,
        activity_type="system_broadcast_email",
        detail=f"Triggered manual broadcast email. Sent: {sent_count}, Failed: {failed_count}"
    )
    db.commit()
    
    if failed_count > 0 and sent_count == 0:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to send emails. Connection details check failed: {err_msg}. Please check your SMTP credentials in Settings."
        )
        
    return {
        "detail": f"Broadcast processed. Sent {sent_count} emails successfully. Failed {failed_count} emails."
    }


# ==========================================
# BADGES & PROGRESSION MODULE
# ==========================================

@app.get(f"{settings.API_V1_STR}/badges/my", response_model=List[schemas.UserBadgeResponse])
def get_my_badges(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    
    # 1. Determine user's departments
    user_depts = []
    if current_user.primary_team:
        p_lower = current_user.primary_team.lower()
        if "front" in p_lower:
            user_depts.append("Frontend")
        elif "back" in p_lower:
            user_depts.append("Backend")
        elif "data" in p_lower or "db" in p_lower or "sql" in p_lower or "postgres" in p_lower:
            user_depts.append("Database")
    if current_user.secondary_team:
        s_lower = current_user.secondary_team.lower()
        if "front" in s_lower:
            user_depts.append("Frontend")
        elif "back" in s_lower:
            user_depts.append("Backend")
        elif "data" in s_lower or "db" in s_lower or "sql" in s_lower or "postgres" in s_lower:
            user_depts.append("Database")
            
    # If no department (admin/unassigned), let them see all categories
    if not user_depts:
        badges = db.query(models.Badge).all()
    else:
        badges = db.query(models.Badge).filter(
            (models.Badge.department == None) | (models.Badge.department.in_(user_depts))
        ).all()
        
    user_badges = db.query(models.UserBadge).filter(models.UserBadge.user_id == user_id).all()
    user_badge_map = {ub.badge_id: ub.earned_at for ub in user_badges}
    
    progress_recs = db.query(models.BadgeProgress).filter(models.BadgeProgress.user_id == user_id).all()
    progress_map = {pr.badge_code: pr for pr in progress_recs}
    
    response = []
    for b in badges:
        earned_at = user_badge_map.get(b.id)
        is_unlocked = earned_at is not None
        
        prog_rec = progress_map.get(b.code)
        if prog_rec:
            progress = prog_rec.current_value
            target_value = prog_rec.target_value
            is_unlocked = is_unlocked or prog_rec.is_completed
        else:
            progress = 0.0
            target_value = float(b.required_value)
            
        response.append({
            "badge": {
                "id": b.id,
                "code": b.code,
                "name": b.name,
                "description": b.description,
                "category": b.category,
                "rarity": b.rarity,
                "icon": b.icon,
                "required_value": b.required_value,
                "department": b.department
            },
            "is_unlocked": is_unlocked,
            "progress": progress,
            "target_value": target_value,
            "earned_at": earned_at
        })
    return response


@app.get(f"{settings.API_V1_STR}/badges/history", response_model=List[schemas.BadgeUnlockHistoryResponse])
def get_badge_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    history = db.query(models.BadgeUnlockHistory).filter(
        models.BadgeUnlockHistory.user_id == current_user.id
    ).order_by(models.BadgeUnlockHistory.unlock_timestamp.desc()).all()
    return history


@app.get(f"{settings.API_V1_STR}/admin/badges/stats", response_model=schemas.BadgeStatsResponse)
def get_admin_badge_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    total_badges = db.query(models.Badge).count()
    total_users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).count()
    total_earned = db.query(models.UserBadge).count()
    
    completion_rate = 0.0
    if total_users > 0 and total_badges > 0:
        completion_rate = round((total_earned / (total_users * total_badges)) * 100.0, 2)
        
    rarity_breakdown = {
        "Common": db.query(models.UserBadge).join(models.Badge).filter(models.Badge.rarity == "Common").count(),
        "Rare": db.query(models.UserBadge).join(models.Badge).filter(models.Badge.rarity == "Rare").count(),
        "Epic": db.query(models.UserBadge).join(models.Badge).filter(models.Badge.rarity == "Epic").count(),
        "Legendary": db.query(models.UserBadge).join(models.Badge).filter(models.Badge.rarity == "Legendary").count()
    }
    
    categories = ["Hours", "Streak", "Project", "Frontend", "Backend", "Database", "Roadmap", "Competition", "Collector"]
    category_breakdown = {}
    for cat in categories:
        category_breakdown[cat] = db.query(models.UserBadge).join(models.Badge).filter(models.Badge.category == cat).count()
        
    users_q = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    user_distribution = []
    for u in users_q:
        badges_count = db.query(models.UserBadge).filter(models.UserBadge.user_id == u.id).count()
        user_distribution.append({
            "user_id": u.id,
            "user_name": u.full_name,
            "badges_count": badges_count
        })
    user_distribution.sort(key=lambda x: x["badges_count"], reverse=True)
    
    return {
        "total_badges": total_badges,
        "total_earned": total_earned,
        "completion_rate": completion_rate,
        "rarity_breakdown": rarity_breakdown,
        "category_breakdown": category_breakdown,
        "user_distribution": user_distribution
    }


@app.post(f"{settings.API_V1_STR}/admin/badges/recalculate")
def post_admin_recalculate(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    crud.recalculate_all_badges(db)
    return {"detail": "Badge progress and ranks recalculated successfully for all users"}


@app.post(f"{settings.API_V1_STR}/admin/badges/award")
def post_admin_award(payload: schemas.AdminAwardBadgeRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    badge = crud.force_award_badge(db, payload.user_id, payload.badge_code)
    if not badge:
        raise HTTPException(status_code=400, detail="Badge already earned, invalid user, or invalid badge code")
    return {"detail": f"Badge '{badge.name}' successfully awarded!"}



# Messaging routers removed
