from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from jose import jwt, JWTError

from app.db.session import engine, Base, get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.core import security
from app import models, schemas, crud

# Create database tables
Base.metadata.create_all(bind=engine)

# Run default seeding on startup
db = next(get_db())
try:
    crud.run_db_seeding(db)
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Team Learning & Progress Tracker",
    version="1.0.0"
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login-form")

# ==========================================
# AUTHENTICATION DEPENDENCIES
# ==========================================

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
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

async def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
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
def admin_get_user_profile(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this profile"
        )
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.verify_and_reset_expired_streak(db, user_id)
        
    total_hours = db.query(func.sum(models.DailyLog.hours)).filter(models.DailyLog.user_id == user_id).scalar() or 0.0
    # Current rank calculation
    leaderboard = db.query(
        models.User.id,
        func.coalesce(func.sum(models.DailyLog.hours), 0.0).label("total_hours")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours), 0.0).desc()).all()
    
    rank = 0
    for idx, row in enumerate(leaderboard):
        if row.id == user_id:
            rank = idx + 1
            break
            
    # Assigned technologies
    assigned_techs = []
    for ut in user.assigned_technologies:
        tech = ut.technology
        # calc completed topics count
        topic_ids = [t.id for t in tech.topics]
        completed_count = db.query(models.CompletedTopic).filter(
            models.CompletedTopic.user_id == user_id,
            models.CompletedTopic.topic_id.in_(topic_ids)
        ).count() if topic_ids else 0
        assigned_techs.append({
            "id": tech.id,
            "name": tech.name,
            "description": tech.description,
            "total_topics": len(tech.topics),
            "completed_topics": completed_count
        })

    return {
        "user": user,
        "rank": rank,
        "total_hours": total_hours,
        "current_streak": user.streak.current_streak if user.streak else 0,
        "longest_streak": user.streak.longest_streak if user.streak else 0,
        "assigned_technologies": assigned_techs,
        "completed_topics_count": len(user.completed_topics),
        "projects_count": len(user.projects),
        "achievements": [ua.achievement for ua in user.achievements],
        "recent_logs": db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).order_by(models.DailyLog.date.desc()).limit(10).all()
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
    
    # Recalculate technology achievements for all users
    for user in db.query(models.User).filter(models.User.role == "user").all():
        crud.check_technology_achievements(db, user.id)
        
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
    crud.check_technology_achievements(db, user_id)
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
    
    # Check if user is logging for today and if it is past deadline
    # Note: local server time is used
    log_date = log_data.date
    today = date.today()
    
    # If logging for today
    if log_date == today:
        now_time = datetime.now().time()
        deadline_time = datetime.strptime(deadline_str, "%H:%M").time()
        
        # Calculate deadline with grace period
        deadline_dt = datetime.combine(today, deadline_time) + timedelta(minutes=grace_mins)
        now_dt = datetime.now()
        
        if now_dt > deadline_dt:
            # We still allow logging but it will be flagged or we can just log it
            # The prompt says "Daily Work Log Deadline (10:00 PM)". Let's allow it but record activity as "late log"
            pass
            
    db_log = crud.create_daily_log(db, current_user.id, log_data)
    
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
    return {"detail": "Topic marked as completed"}

@app.delete(f"{settings.API_V1_STR}/roadmap/topics/{{topic_id}}/uncomplete")
def uncomplete_topic_route(topic_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.uncomplete_topic(db, current_user.id, topic_id)
    if not success:
        raise HTTPException(status_code=400, detail="Topic was not marked as completed")
    # Re-evaluate achievements
    crud.check_technology_achievements(db, current_user.id)
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
        
    db_log = crud.log_project_hours(db, project_id, current_user.id, log_data)
    return db_log

@app.put(f"{settings.API_V1_STR}/projects/{{project_id}}", response_model=schemas.ProjectResponse)
def user_update_project(project_id: int, project_update: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    return crud.update_project(db, project_id, project_update)

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
    
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday()) # Monday
    start_of_month = today.replace(day=1)
    
    leaderboard_data = []
    for user in users:
        crud.verify_and_reset_expired_streak(db, user.id)
        # Sum total hours
        total_hours = db.query(func.sum(models.DailyLog.hours)).filter(
            models.DailyLog.user_id == user.id
        ).scalar() or 0.0
        
        # Sum weekly hours
        weekly_hours = db.query(func.sum(models.DailyLog.hours)).filter(
            models.DailyLog.user_id == user.id,
            models.DailyLog.date >= start_of_week
        ).scalar() or 0.0
        
        # Sum monthly hours
        monthly_hours = db.query(func.sum(models.DailyLog.hours)).filter(
            models.DailyLog.user_id == user.id,
            models.DailyLog.date >= start_of_month
        ).scalar() or 0.0
        
        leaderboard_data.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "team": user.team,
            "total_hours": round(total_hours, 1),
            "weekly_hours": round(weekly_hours, 1),
            "monthly_hours": round(monthly_hours, 1),
            "current_streak": user.streak.current_streak if user.streak else 0,
            "longest_streak": user.streak.longest_streak if user.streak else 0
        })
        
    # Sort in memory
    # We will return list sorted by total hours desc, weekly hours desc, monthly hours desc
    # Frontend can sort by whatever they choose
    leaderboard_data.sort(key=lambda x: x["total_hours"], reverse=True)
    return leaderboard_data

@app.get(f"{settings.API_V1_STR}/achievements")
def get_user_achievements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    achievements = db.query(models.Achievement).all()
    unlocked_ids = [ua.achievement_id for ua in current_user.achievements]
    
    list_data = []
    for ach in achievements:
        unlocked_rec = next((ua for ua in current_user.achievements if ua.achievement_id == ach.id), None)
        list_data.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "criteria_type": ach.criteria_type,
            "criteria_value": ach.criteria_value,
            "is_unlocked": ach.id in unlocked_ids,
            "unlocked_at": unlocked_rec.unlocked_at if unlocked_rec else None
        })
    return list_data

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
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)
    
    # Hours calculation
    total_hours = db.query(func.sum(models.DailyLog.hours)).filter(models.DailyLog.user_id == user_id).scalar() or 0.0
    weekly_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_week
    ).scalar() or 0.0
    monthly_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= start_of_month
    ).scalar() or 0.0
    
    # Category hours
    coding_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Coding"
    ).scalar() or 0.0
    learning_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Learning"
    ).scalar() or 0.0
    research_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Research"
    ).scalar() or 0.0
    other_hours = db.query(func.sum(models.DailyLog.hours)).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.category == "Other"
    ).scalar() or 0.0
    
    # Rank calculation
    leaderboard = db.query(
        models.User.id,
        func.coalesce(func.sum(models.DailyLog.hours), 0.0).label("total_hours")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours), 0.0).desc()).all()
    
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
    
    # Recent Activities (user-specific + global milestone achievements)
    recent_activities = db.query(models.ActivityLog).filter(
        (models.ActivityLog.user_id == user_id) | (models.ActivityLog.activity_type == "achievement_unlocked")
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
    # We will return count of logs per date in the last 30 days
    heatmap_start = today - timedelta(days=30)
    heatmap_logs = db.query(
        models.DailyLog.date,
        func.sum(models.DailyLog.hours).label("hours")
    ).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date >= heatmap_start
    ).group_by(models.DailyLog.date).all()
    
    heatmap_data = {str(hl.date): round(hl.hours, 1) for hl in heatmap_logs}

    return {
        "full_name": current_user.full_name,
        "current_streak": current_user.streak.current_streak if current_user.streak else 0,
        "longest_streak": current_user.streak.longest_streak if current_user.streak else 0,
        "total_hours": round(total_hours, 1),
        "weekly_hours": round(weekly_hours, 1),
        "monthly_hours": round(monthly_hours, 1),
        "coding_hours": round(coding_hours, 1),
        "learning_hours": round(learning_hours, 1),
        "research_hours": round(research_hours, 1),
        "other_hours": round(other_hours, 1),
        "completed_topics": completed_topics,
        "progress_percentage": round(progress_percentage, 1),
        "rank": rank,
        "logged_today": logged_today,
        "deadline_time": deadline_time,
        "recent_activities": recent_activities,
        "heatmap": heatmap_data
    }

# ==========================================
# ADMIN DASHBOARD SUMMARY
# ==========================================

@app.get(f"{settings.API_V1_STR}/admin/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
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
    total_hours = db.query(func.sum(models.DailyLog.hours)).scalar() or 0.0
    weekly_team_hours = db.query(func.sum(models.DailyLog.hours)).filter(models.DailyLog.date >= start_of_week).scalar() or 0.0
    monthly_team_hours = db.query(func.sum(models.DailyLog.hours)).filter(models.DailyLog.date >= start_of_month).scalar() or 0.0
    
    # Performers & streaks
    # Top 3 Performers
    top_performers = db.query(
        models.User.full_name,
        func.coalesce(func.sum(models.DailyLog.hours), 0.0).label("hours")
    ).outerjoin(models.DailyLog).filter(models.User.role == "user").group_by(models.User.id).order_by(func.coalesce(func.sum(models.DailyLog.hours), 0.0).desc()).limit(3).all()
    
    top_performers_list = [{"name": tp[0], "hours": round(tp[1], 1)} for tp in top_performers]
    
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

    return {
        "total_users": total_users,
        "active_users": active_users,
        "today_submitted_logs": submitted_count,
        "today_missing_logs": missing_count,
        "today_missing_names": missing_users,
        "today_submitted_names": submitted_users,
        "total_team_hours": round(total_hours, 1),
        "weekly_team_hours": round(weekly_team_hours, 1),
        "monthly_team_hours": round(monthly_team_hours, 1),
        "top_performers": top_performers_list,
        "longest_streak_value": longest_streak_val,
        "longest_streak_name": longest_streak_name,
        "most_active_name": most_active_name,
        "most_active_count": most_active_count,
        "total_completed_topics": total_topics_completed,
        "total_projects": total_projects,
        "recent_activities": recent_activities
    }

# ==========================================
# NOTIFICATIONS & DEADLINE CHECKS
# ==========================================

@app.post(f"{settings.API_V1_STR}/notifications/reminder")
def trigger_daily_reminders(db: Session = Depends(get_db), current_admin: models.User = Depends(get_current_admin)):
    """Triggers mock reminder emails for active users who haven't logged today's work yet"""
    today = date.today()
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
            email_log = models.EmailLog(
                recipient_email=user.email,
                subject="Reminder: Submit your work log today!",
                body=body,
                status="Sent"
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
    today = date.today()
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
            user_email = models.EmailLog(
                recipient_email=user.email,
                subject=f"Missing Daily Work Log - {today}",
                body=user_body,
                status="Sent"
            )
            db.add(user_email)
            
            # 2. Send warning to the Admin
            admin_body = (
                f"Hi Administrator,\n\n"
                f"Team Member {user.full_name} ({user.username}) missed submitting their daily work log for {today}.\n"
                f"The configured deadline was {deadline_time}.\n\n"
                f"Best,\nTeam Progress Tracker Notification System"
            )
            admin_email_rec = models.EmailLog(
                recipient_email=admin_email,
                subject=f"Missing Log Alert: {user.username}",
                body=admin_body,
                status="Sent"
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
