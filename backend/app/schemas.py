from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union
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

class UserResponse(UserBase):
    id: int
    created_date: datetime

    class Config:
        from_attributes = True

# DailyLog schemas
class DailyLogCreate(BaseModel):
    date: date
    category: str # Coding, Learning, Research, Other
    hours: float = Field(ge=0, le=24)
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
    hours: float = Field(gt=0, le=24)
    description: str

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

class ProjectResponse(ProjectCreate):
    id: int
    user_id: int
    hours_invested: float
    logs: List[ProjectLogResponse] = []

    class Config:
        from_attributes = True

# Settings schemas
class SettingsUpdate(BaseModel):
    daily_log_deadline: str = Field(pattern=r"^\d{2}:\d{2}$")
    reminder_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    grace_period_minutes: int = Field(ge=0, le=120)
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

# Achievement schemas
class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    criteria_type: str
    criteria_value: str

    class Config:
        from_attributes = True

# User Achievement schemas
class UserAchievementResponse(BaseModel):
    id: int
    user_id: int
    achievement_id: int
    unlocked_at: datetime
    achievement: AchievementResponse

    class Config:
        from_attributes = True

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


# Message schemas
class MessageCreate(BaseModel):
    recipient_id: int
    content: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None

    class Config:
        from_attributes = True
