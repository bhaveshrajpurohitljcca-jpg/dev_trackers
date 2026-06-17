import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Team Learning & Progress Tracker"
    
    # Secret key for JWT signing
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_change_me_in_production_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for ease of development/local usage
    
    # Database URL: fallback to SQLite if no PostgreSQL URL is provided
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./tracker.db"
    )
    
    # Mail settings - we'll log notifications to DB and stdout to mock email
    # but the settings can be used for SMTP if provided
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "noreply@tracker.com")

    # Deadline defaults
    DEFAULT_DEADLINE_TIME: str = "22:00"  # 10:00 PM
    DEFAULT_REMINDER_TIME: str = "21:30"  # 9:30 PM
    DEFAULT_GRACE_PERIOD_MINUTES: int = 15

    class Config:
        case_sensitive = True

settings = Settings()

# Fix for PostgreSQL connection strings that start with postgres:// (e.g. Supabase, Render)
# SQLAlchemy requires postgresql://
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)


from datetime import datetime, timezone, timedelta

def get_ist_time() -> datetime:
    # IST is UTC + 5:30
    return datetime.now(timezone(timedelta(hours=5, minutes=30))).replace(tzinfo=None)

def get_ist_date():
    return datetime.now(timezone(timedelta(hours=5, minutes=30))).date()

