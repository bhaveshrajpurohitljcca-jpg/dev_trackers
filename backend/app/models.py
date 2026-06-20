from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.core.config import get_ist_time

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user") # admin / user
    primary_team = Column(String, nullable=True)
    secondary_team = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    weekly_target_hours = Column(Integer, nullable=False, default=10)
    created_date = Column(DateTime, default=get_ist_time)

    @property
    def team(self):
        if self.primary_team and self.secondary_team:
            return f"{self.primary_team}, {self.secondary_team}"
        elif self.primary_team:
            return self.primary_team
        elif self.secondary_team:
            return self.secondary_team
        return None

    # Relationships
    assigned_technologies = relationship("UserTechnology", back_populates="user", cascade="all, delete-orphan")
    completed_topics = relationship("CompletedTopic", back_populates="user", cascade="all, delete-orphan")
    daily_logs = relationship("DailyLog", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    project_logs = relationship("ProjectLog", back_populates="user", cascade="all, delete-orphan")
    streak = relationship("Streak", back_populates="user", uselist=False, cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class Technology(Base):
    __tablename__ = "technologies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    # Relationships
    topics = relationship("Topic", back_populates="technology", cascade="all, delete-orphan")
    user_assignments = relationship("UserTechnology", back_populates="technology", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    technology_id = Column(Integer, ForeignKey("technologies.id"), nullable=False)
    name = Column(String, nullable=False)
    sequence_order = Column(Integer, default=0)

    # Relationships
    technology = relationship("Technology", back_populates="topics")
    completions = relationship("CompletedTopic", back_populates="topic", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('technology_id', 'name', name='_tech_topic_uc'),)


class UserTechnology(Base):
    __tablename__ = "user_technologies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    technology_id = Column(Integer, ForeignKey("technologies.id"), nullable=False)
    assigned_date = Column(DateTime, default=get_ist_time)

    # Relationships
    user = relationship("User", back_populates="assigned_technologies")
    technology = relationship("Technology", back_populates="user_assignments")

    __table_args__ = (UniqueConstraint('user_id', 'technology_id', name='_user_tech_uc'),)


class CompletedTopic(Base):
    __tablename__ = "completed_topics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    completed_at = Column(DateTime, default=get_ist_time)

    # Relationships
    user = relationship("User", back_populates="completed_topics")
    topic = relationship("Topic", back_populates="completions")

    __table_args__ = (UniqueConstraint('user_id', 'topic_id', name='_user_topic_uc'),)


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String, nullable=False)  # Coding, Learning, Research, Other
    hours = Column(Integer, nullable=False)
    minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)

    # Relationships
    user = relationship("User", back_populates="daily_logs")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="Active")  # Active, Completed, Archived
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    github_url = Column(String, nullable=True)
    host_url = Column(String, nullable=True)
    hours_invested_hours = Column(Integer, default=0, nullable=False)
    hours_invested_minutes = Column(Integer, default=0, nullable=False)

    @property
    def hours_invested(self):
        return self.hours_invested_hours + self.hours_invested_minutes / 60.0

    # Relationships
    user = relationship("User", back_populates="projects")
    logs = relationship("ProjectLog", back_populates="project", cascade="all, delete-orphan")


class ProjectLog(Base):
    __tablename__ = "project_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hours = Column(Integer, nullable=False)
    minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    logged_at = Column(DateTime, default=get_ist_time)

    # Relationships
    project = relationship("Project", back_populates="logs")
    user = relationship("User", back_populates="project_logs")


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_log_date = Column(Date, nullable=True)

    # Relationships
    user = relationship("User", back_populates="streak")


# Achievements tables were removed


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="Sent")  # Sent, Failed
    created_at = Column(DateTime, default=get_ist_time)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=False)
    activity_type = Column(String, nullable=False)  # log_hours, complete_topic, project_created, achievement_unlocked, etc.
    detail = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)

    # Relationships
    user = relationship("User", back_populates="activity_logs")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    daily_log_deadline = Column(String, nullable=False, default="22:00")  # HH:MM format
    reminder_time = Column(String, nullable=False, default="21:30")      # HH:MM format
    grace_period_minutes = Column(Integer, nullable=False, default=15)
    smtp_host = Column(String, nullable=True, default="smtp.gmail.com")
    smtp_port = Column(Integer, nullable=True, default=587)
    smtp_user = Column(String, nullable=True, default="")
    smtp_password = Column(String, nullable=True, default="")


# Messages table was removed
