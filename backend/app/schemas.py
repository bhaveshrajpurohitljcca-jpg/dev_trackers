from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union, Dict, Any
import datetime as dt
from datetime import datetime, date


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

# Topic schemas
class TopicBase(BaseModel):
    name: str
    sequence_order: int = 0

class TopicCreate(TopicBase):
    technology_id: int

class TopicResponse(TopicBase):
    id: int
    technology_id: int

    class Config:
        from_attributes = True

# Technology schemas
class TechBase(BaseModel):
    name: str
    description: Optional[str] = None

class TechCreate(TechBase):
    topics: Optional[List[str]] = []

class TechResponse(TechBase):
    id: int
    topics: List[TopicResponse] = []

    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    role: str = "user" # admin / user
    team: Optional[str] = None
    is_active: bool = True
    primary_team: Optional[str] = None
    secondary_team: Optional[str] = None
    weekly_target_hours: int = 10
    blocked_features: Optional[str] = ""

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    team: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    primary_team: Optional[str] = None
    secondary_team: Optional[str] = None
    weekly_target_hours: Optional[int] = None
    blocked_features: Optional[str] = ""

class UserResponse(UserBase):
    id: int
    created_date: datetime

    class Config:
        from_attributes = True

# DailyLog schemas
class DailyLogCreate(BaseModel):
    date: date
    category: str # Coding, Learning, Research, Other
    hours: int = Field(ge=0, le=24)
    minutes: int = Field(ge=0, le=59)
    description: str

class DailyLogResponse(DailyLogCreate):
    id: int
    user_id: int
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# Project Log schemas
class ProjectLogCreate(BaseModel):
    hours: int = Field(ge=0, le=24)
    minutes: int = Field(ge=0, le=59)
    description: str
    date: Optional[dt.date] = None

class ProjectLogResponse(ProjectLogCreate):
    id: int
    project_id: int
    user_id: int
    logged_at: datetime

    class Config:
        from_attributes = True

# Project schemas
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "Active" # Active, Completed, Archived
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    github_url: Optional[str] = None
    host_url: Optional[str] = None

class ProjectResponse(ProjectCreate):
    id: int
    user_id: int
    hours_invested_hours: int
    hours_invested_minutes: int
    hours_invested: float
    logs: List[ProjectLogResponse] = []

    class Config:
        from_attributes = True

# Settings schemas
class SettingsUpdate(BaseModel):
    daily_log_deadline: str = Field(pattern=r"^\d{2}:\d{2}$")
    reminder_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    grace_period_minutes: int = Field(ge=0, le=120)
    day_cutoff_time: str = Field(default="00:00", pattern=r"^\d{2}:\d{2}$")
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""

class SettingsResponse(SettingsUpdate):
    id: int

    class Config:
        from_attributes = True

class BroadcastEmail(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)

class DeleteEmailLogsRequest(BaseModel):
    ids: Optional[List[int]] = None
    delete_all: bool = False

# Completed topic schemas
class CompletedTopicResponse(BaseModel):
    id: int
    user_id: int
    topic_id: int
    completed_at: datetime
    topic_name: Optional[str] = None
    tech_name: Optional[str] = None

    class Config:
        from_attributes = True

# Streak schemas
class StreakResponse(BaseModel):
    id: int
    user_id: int
    current_streak: int
    longest_streak: int
    last_log_date: Optional[date] = None

    class Config:
        from_attributes = True

# Achievements schemas removed

# Email Log schemas
class EmailLogResponse(BaseModel):
    id: int
    recipient_email: str
    subject: str
    body: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Activity Log schemas
class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: str
    activity_type: str
    detail: str
    created_at: datetime

    class Config:
        from_attributes = True


class BadgeCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class BadgeResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    category: str
    rarity: str
    icon: str
    required_value: int
    department: Optional[str] = None

    class Config:
        from_attributes = True


class UserBadgeResponse(BaseModel):
    badge: BadgeResponse
    is_unlocked: bool
    progress: float
    target_value: float
    earned_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BadgeUnlockHistoryResponse(BaseModel):
    id: int
    badge_id: int
    badge_name: str
    category: str
    rarity: str
    unlock_date: date
    unlock_time: str
    unlock_timestamp: datetime
    unlock_source: str

    class Config:
        from_attributes = True


class AdminAwardBadgeRequest(BaseModel):
    user_id: int
    badge_code: str


class BadgeStatsResponse(BaseModel):
    total_badges: int
    total_earned: int
    completion_rate: float
    rarity_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]
    user_distribution: List[Dict[str, Any]]
