import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base
from app import crud, models
from sqlalchemy import text, inspect

def run_manual_seeding():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Run migrations
    print("Checking and running database migrations...")
    inspector = inspect(engine)
    if "settings" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("settings")]
        missing_columns = [col for col in ["smtp_host", "smtp_port", "smtp_user", "smtp_password"] if col not in columns]
        
        if missing_columns:
            db_mig = SessionLocal()
            try:
                dialect = db_mig.bind.dialect.name
                if dialect == "sqlite":
                    columns_to_add = [
                        ("smtp_host", "VARCHAR", "'smtp.gmail.com'"),
                        ("smtp_port", "INTEGER", "587"),
                        ("smtp_user", "VARCHAR", "''"),
                        ("smtp_password", "VARCHAR", "''")
                    ]
                    for col_name, col_type, col_default in columns_to_add:
                        if col_name in missing_columns:
                            try:
                                db_mig.execute(text(f"ALTER TABLE settings ADD COLUMN {col_name} {col_type} DEFAULT {col_default}"))
                                db_mig.commit()
                                print(f"Added column {col_name} to settings table.")
                            except Exception:
                                db_mig.rollback()
                else:
                    for col_name in missing_columns:
                        col_type = "INTEGER" if col_name == "smtp_port" else "VARCHAR"
                        col_default = "587" if col_name == "smtp_port" else "''"
                        db_mig.execute(text(f"ALTER TABLE settings ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {col_default}"))
                        print(f"Added column {col_name} to settings table.")
                    db_mig.commit()
            except Exception as e:
                print(f"Migration error: {e}")
                db_mig.rollback()
            finally:
                db_mig.close()
                
    db = SessionLocal()
    try:
        print("Seeding default data (Admin user)...")
        crud.seed_admin_user(db)
        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_manual_seeding()
