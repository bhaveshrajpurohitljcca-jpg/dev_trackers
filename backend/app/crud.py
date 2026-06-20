from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from app import models, schemas
from app.core.security import get_password_hash
from app.core.config import get_ist_date, get_ist_time

# ==========================================
# USER OPERATIONS
# ==========================================

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pwd = get_password_hash(user.password)
    
    p_team = user.primary_team
    s_team = user.secondary_team

    db_user = models.User(
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role,
        primary_team=p_team,
        secondary_team=s_team,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Initialize Streak for the user
    db_streak = models.Streak(user_id=db_user.id, current_streak=0, longest_streak=0)
    db.add(db_streak)
    
    # Log Activity
    log_activity(db, user_id=db_user.id, user_name=db_user.full_name, 
                 activity_type="user_created", detail=f"User {db_user.username} was created as a {db_user.role}")
    
    db.commit()
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
        
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    
    log_activity(db, user_id=db_user.id, user_name=db_user.full_name, 
                 activity_type="user_updated", detail=f"User profile was updated")
    db.commit()
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    db.delete(db_user)
    db.commit()
    return db_user

# ==========================================
# TECHNOLOGY & TOPIC OPERATIONS
# ==========================================

def get_technology(db: Session, tech_id: int):
    return db.query(models.Technology).filter(models.Technology.id == tech_id).first()

def get_technology_by_name(db: Session, name: str):
    return db.query(models.Technology).filter(models.Technology.name == name).first()

def get_technologies(db: Session):
    return db.query(models.Technology).all()

def create_technology(db: Session, tech: schemas.TechCreate):
    db_tech = models.Technology(name=tech.name, description=tech.description)
    db.add(db_tech)
    db.commit()
    db.refresh(db_tech)
    
    # Add topics if provided
    for idx, topic_name in enumerate(tech.topics):
        db_topic = models.Topic(
            technology_id=db_tech.id,
            name=topic_name,
            sequence_order=idx
        )
        db.add(db_topic)
        
    db.commit()
    db.refresh(db_tech)
    return db_tech

def update_technology(db: Session, tech_id: int, tech_update: schemas.TechCreate):
    db_tech = get_technology(db, tech_id)
    if not db_tech:
        return None
    
    db_tech.name = tech_update.name
    db_tech.description = tech_update.description
    
    # Simple synchronization of topics: remove old ones that are not in new list, and add new ones
    existing_topics = {t.name: t for t in db_tech.topics}
    new_topic_names = tech_update.topics
    
    # Delete topics not in new list
    for name, topic in existing_topics.items():
        if name not in new_topic_names:
            db.delete(topic)
            
    # Add or update sequence of new topics
    for idx, name in enumerate(new_topic_names):
        if name in existing_topics:
            existing_topics[name].sequence_order = idx
        else:
            db_topic = models.Topic(
                technology_id=db_tech.id,
                name=name,
                sequence_order=idx
            )
            db.add(db_topic)
            
    db.commit()
    db.refresh(db_tech)
    return db_tech

def delete_technology(db: Session, tech_id: int):
    db_tech = get_technology(db, tech_id)
    if not db_tech:
        return None
    db.delete(db_tech)
    db.commit()
    return db_tech

def assign_roadmap(db: Session, user_id: int, tech_ids: List[int]):
    # Remove old assignments
    db.query(models.UserTechnology).filter(models.UserTechnology.user_id == user_id).delete()
    
    # Add new assignments
    for tech_id in tech_ids:
        assignment = models.UserTechnology(user_id=user_id, technology_id=tech_id)
        db.add(assignment)
        
    db.commit()
    
    user = get_user(db, user_id)
    log_activity(db, user_id=user_id, user_name=user.full_name if user else "System", 
                 activity_type="roadmap_assigned", detail=f"Roadmap updated with {len(tech_ids)} technologies")
    return True

def get_user_assigned_technologies(db: Session, user_id: int):
    assignments = db.query(models.UserTechnology).filter(models.UserTechnology.user_id == user_id).all()
    return [a.technology for a in assignments]

# ==========================================
# TOPIC COMPLETION
# ==========================================

def complete_topic(db: Session, user_id: int, topic_id: int):
    db_completed = db.query(models.CompletedTopic).filter(
        models.CompletedTopic.user_id == user_id,
        models.CompletedTopic.topic_id == topic_id
    ).first()
    
    if db_completed:
        return db_completed # Already completed
        
    db_completed = models.CompletedTopic(user_id=user_id, topic_id=topic_id)
    db.add(db_completed)
    db.commit()
    db.refresh(db_completed)
    
    # Log Activity
    user = get_user(db, user_id)
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    tech_name = topic.technology.name if topic and topic.technology else "Tech"
    topic_name = topic.name if topic else "Topic"
    
    log_activity(db, user_id=user_id, user_name=user.full_name if user else "User", 
                 activity_type="complete_topic", detail=f"Completed topic: {tech_name} - {topic_name}")
                 
    db.commit()
    return db_completed

def uncomplete_topic(db: Session, user_id: int, topic_id: int):
    db_completed = db.query(models.CompletedTopic).filter(
        models.CompletedTopic.user_id == user_id,
        models.CompletedTopic.topic_id == topic_id
    ).first()
    
    if not db_completed:
        return False
        
    db.delete(db_completed)
    db.commit()
    return True

# ==========================================
# DAILY LOG OPERATIONS & STREAKS
# ==========================================

def log_activity(db: Session, user_id: Optional[int], user_name: str, activity_type: str, detail: str):
    log = models.ActivityLog(
        user_id=user_id,
        user_name=user_name,
        activity_type=activity_type,
        detail=detail
    )
    db.add(log)
    # Don't commit here, let the parent transaction commit

def get_daily_logs(db: Session, user_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.DailyLog)
    if user_id is not None:
        query = query.filter(models.DailyLog.user_id == user_id)
    return query.order_by(models.DailyLog.date.desc()).offset(skip).limit(limit).all()

def create_daily_log(db: Session, user_id: int, log_data: schemas.DailyLogCreate):
    # Fetch all existing logs for this user on the given date
    existing_logs = db.query(models.DailyLog).filter(
        models.DailyLog.user_id == user_id,
        models.DailyLog.date == log_data.date
    ).all()
    
    is_nothing_today = log_data.category.lower() in ["nothing today", "nothing_today"]
    
    # Check 1: If 'Nothing Today' is already logged for this date, block any new log
    for log in existing_logs:
        if log.category.lower() in ["nothing today", "nothing_today"]:
            raise ValueError("Cannot log activity because 'Nothing Today' has already been logged for this date.")
            
    # Check 2: If trying to log 'Nothing Today', but there are already other logs
    if is_nothing_today and len(existing_logs) > 0:
        raise ValueError("Cannot log 'Nothing Today' because other activities have already been logged for this date.")
        
    # Check 3: Check if a log for this exact category already exists
    existing_category_log = None
    for log in existing_logs:
        if log.category.lower() == log_data.category.lower():
            existing_category_log = log
            break
            
    other_categories_minutes = sum(log.hours * 60 + log.minutes for log in existing_logs if log != existing_category_log)
    
    # Calculate the potential new total minutes for the day
    new_total_minutes = other_categories_minutes + (log_data.hours * 60 + log_data.minutes)
    if existing_category_log:
        new_total_minutes += existing_category_log.hours * 60 + existing_category_log.minutes
        
    if new_total_minutes > 24 * 60:
        raise ValueError("Total working hours for a single day (Coding + Learning + etc.) cannot exceed 24 hours.")
        
    # If a log for this category already exists, update it
    if existing_category_log:
        total_m = (existing_category_log.hours + log_data.hours) * 60 + (existing_category_log.minutes + log_data.minutes)
        existing_category_log.hours = total_m // 60
        existing_category_log.minutes = total_m % 60
        existing_category_log.description = existing_category_log.description + " | " + log_data.description
        db.commit()
        db.refresh(existing_category_log)
        db_log = existing_category_log
    else:
        # Create a new log entry
        db_log = models.DailyLog(
            user_id=user_id,
            date=log_data.date,
            category=log_data.category,
            hours=log_data.hours,
            minutes=log_data.minutes,
            description=log_data.description
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
    
    # Update Streak
    if is_nothing_today:
        db_streak = db.query(models.Streak).filter(models.Streak.user_id == user_id).first()
        if not db_streak:
            db_streak = models.Streak(user_id=user_id, current_streak=0, longest_streak=0)
            db.add(db_streak)
        db_streak.current_streak = 0
        db_streak.last_log_date = log_data.date
        db.commit()
    else:
        update_user_streak(db, user_id, log_data.date)
    
    # Log Activity
    user = get_user(db, user_id)
    log_activity(
        db, user_id=user_id, user_name=user.full_name if user else "User",
        activity_type="log_hours",
        detail=f"Logged {log_data.hours}h {log_data.minutes}m of {log_data.category} on {log_data.date}"
    )
    
    db.commit()
    return db_log

def get_working_days_gap(last_date: date, log_date: date) -> int:
    if log_date <= last_date:
        return 0
    current = last_date + timedelta(days=1)
    non_sundays = 0
    while current < log_date:
        if current.weekday() != 6: # 6 is Sunday
            non_sundays += 1
        current += timedelta(days=1)
    return non_sundays

def update_user_streak(db: Session, user_id: int, log_date: date):
    db_streak = db.query(models.Streak).filter(models.Streak.user_id == user_id).first()
    if not db_streak:
        db_streak = models.Streak(user_id=user_id, current_streak=0, longest_streak=0)
        db.add(db_streak)
        db.commit()
        db.refresh(db_streak)
        
    last_date = db_streak.last_log_date
    if last_date is None:
        db_streak.current_streak = 1
        db_streak.longest_streak = max(db_streak.longest_streak, 1)
        db_streak.last_log_date = log_date
    else:
        if log_date > last_date:
            gap = get_working_days_gap(last_date, log_date)
            if gap == 0:
                # Consecutive working day (either next calendar day, or separated only by Sunday)
                db_streak.current_streak += 1
                db_streak.longest_streak = max(db_streak.longest_streak, db_streak.current_streak)
                db_streak.last_log_date = log_date
            else:
                # Gap in working days, reset current streak to 1
                db_streak.current_streak = 1
                db_streak.longest_streak = max(db_streak.longest_streak, 1)
                db_streak.last_log_date = log_date
        elif log_date == last_date:
            # Same day log, streak remains same, just update last log date
            pass
        else:
            # Logged for a past date, streak calculation doesn't change
            pass
            
    db.commit()

def verify_and_reset_expired_streak(db: Session, user_id: int):
    db_streak = db.query(models.Streak).filter(models.Streak.user_id == user_id).first()
    if db_streak and db_streak.last_log_date:
        today = get_ist_date()
        if get_working_days_gap(db_streak.last_log_date, today) > 0:
            db_streak.current_streak = 0
            db.commit()
    return db_streak

# ==========================================
# PROJECTS OPERATIONS
# ==========================================

def get_projects(db: Session, user_id: Optional[int] = None):
    query = db.query(models.Project)
    if user_id is not None:
        query = query.filter(models.Project.user_id == user_id)
    return query.all()

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def create_project(db: Session, user_id: int, project: schemas.ProjectCreate):
    db_project = models.Project(
        user_id=user_id,
        name=project.name,
        description=project.description,
        status=project.status,
        start_date=project.start_date,
        end_date=project.end_date,
        github_url=project.github_url,
        host_url=project.host_url,
        hours_invested_hours=0,
        hours_invested_minutes=0
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Log Activity
    user = get_user(db, user_id)
    log_activity(
        db, user_id=user_id, user_name=user.full_name if user else "User",
        activity_type="project_created",
        detail=f"Created project: {project.name}"
    )
    db.commit()
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectCreate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
        
    for key, value in project_update.model_dump().items():
        setattr(db_project, key, value)
        
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
    db.delete(db_project)
    db.commit()
    return db_project

def log_project_hours(db: Session, project_id: int, user_id: int, log_data: schemas.ProjectLogCreate):
    db_project = get_project(db, project_id)
    if not db_project:
        return None
        
    db_log = models.ProjectLog(
        project_id=project_id,
        user_id=user_id,
        hours=log_data.hours,
        minutes=log_data.minutes,
        description=log_data.description
    )
    db.add(db_log)
    
    # Update total hours invested in project
    total_m = (db_project.hours_invested_hours + log_data.hours) * 60 + (db_project.hours_invested_minutes + log_data.minutes)
    db_project.hours_invested_hours = total_m // 60
    db_project.hours_invested_minutes = total_m % 60
    
    # Also create a DailyLog entry corresponding to this coding log automatically for ease of use
    # Check if there is already a DailyLog for today, if not or if yes, add it to maintain daily log stats
    today_date = log_data.date or get_ist_date()
    daily_log = schemas.DailyLogCreate(
        date=today_date,
        category="Coding",
        hours=log_data.hours,
        minutes=log_data.minutes,
        description=f"Working on Project {db_project.name}: {log_data.description}"
    )
    create_daily_log(db, user_id, daily_log)
    
    db.commit()
    db.refresh(db_log)
    return db_log

# ==========================================
# SETTINGS
# ==========================================

def get_settings(db: Session):
    settings_rec = db.query(models.Settings).first()
    if not settings_rec:
        settings_rec = models.Settings()
        db.add(settings_rec)
        db.commit()
        db.refresh(settings_rec)
    return settings_rec

def update_settings(db: Session, settings_data: schemas.SettingsUpdate):
    settings_rec = get_settings(db)
    settings_rec.daily_log_deadline = settings_data.daily_log_deadline
    settings_rec.reminder_time = settings_data.reminder_time
    settings_rec.grace_period_minutes = settings_data.grace_period_minutes
    settings_rec.smtp_host = settings_data.smtp_host
    settings_rec.smtp_port = settings_data.smtp_port
    settings_rec.smtp_user = settings_data.smtp_user
    settings_rec.smtp_password = settings_data.smtp_password
    db.commit()
    db.refresh(settings_rec)
    return settings_rec

def seed_default_technologies(db: Session):
    techs_data = [
        {
            "name": "Python",
            "description": "General purpose programming language",
            "topics": ["Variables", "Loops", "Functions", "OOP", "File Handling", "Exception Handling", "Decorators", "Generators"]
        },
        {
            "name": "SQL",
            "description": "Structured Query Language for database management",
            "topics": ["Basics & Select", "Filters & Operators", "Joins", "Aggregations", "Subqueries", "Indexes", "Transactions"]
        },
        {
            "name": "FastAPI",
            "description": "Modern, fast web framework for building APIs with Python",
            "topics": ["Routing", "Path/Query Parameters", "Pydantic Models", "Dependencies", "Database Integration", "JWT Authentication", "CORS & Security"]
        },
        {
            "name": "PostgreSQL",
            "description": "Advanced open source relational database",
            "topics": ["Data Types", "Constraints", "Views & Triggers", "Functions & Stored Procedures", "Performance Tuning"]
        },
        {
            "name": "React",
            "description": "JavaScript library for building user interfaces",
            "topics": ["JSX", "Components & Props", "State & Hook (useState)", "Effect Hook (useEffect)", "Context API", "Custom Hooks", "Performance Optimization"]
        },
        {
            "name": "TypeScript",
            "description": "Typed superset of JavaScript",
            "topics": ["Types & Interfaces", "Generics", "Enums", "Union & Intersection Types", "TS Config & Compiler Settings"]
        },
        {
            "name": "Java",
            "description": "Object-oriented, class-based language",
            "topics": ["Syntax & Control Flow", "Classes & Interfaces", "Inheritance & Polymorphism", "Collections Framework", "Streams API & Lambdas", "Multithreading"]
        },
        {
            "name": "Spring Boot",
            "description": "Java-based framework for enterprise-ready applications",
            "topics": ["Dependency Injection", "Spring MVC", "Spring Data JPA", "Spring Security", "REST API Development", "Testing"]
        },
        {
            "name": "MySQL",
            "description": "Popular open-source relational database",
            "topics": ["Table Design", "CRUD Queries", "Index Optimization", "Stored Procedures"]
        }
    ]
    
    for t_data in techs_data:
        db_tech = db.query(models.Technology).filter(models.Technology.name == t_data["name"]).first()
        if not db_tech:
            db_tech = models.Technology(name=t_data["name"], description=t_data["description"])
            db.add(db_tech)
            db.commit()
            db.refresh(db_tech)
            for idx, name in enumerate(t_data["topics"]):
                db_topic = models.Topic(technology_id=db_tech.id, name=name, sequence_order=idx)
                db.add(db_topic)
    db.commit()

def seed_admin_user(db: Session):
    db_admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not db_admin:
        admin_create = schemas.UserCreate(
            full_name="System Administrator",
            username="admin",
            email="admin@tracker.com",
            password="admin123", # default password
            role="admin",
            team="Management",
            is_active=True
        )
        create_user(db, admin_create)
        
    # Seed default user "bhavesh"
    db_user1 = db.query(models.User).filter(models.User.username == "bhavesh").first()
    if not db_user1:
        user_create = schemas.UserCreate(
            full_name="Bhavesh Rajpurohit",
            username="bhavesh",
            email="bhavesh@tracker.com",
            password="user123",
            role="user",
            team="Backend Development",
            is_active=True
        )
        db_user = create_user(db, user_create)
        
        # Assign default roadmaps (Python, SQL, FastAPI, PostgreSQL, React, TypeScript)
        tech_names = ["Python", "SQL", "FastAPI", "PostgreSQL", "React", "TypeScript"]
        techs = db.query(models.Technology).filter(models.Technology.name.in_(tech_names)).all()
        assign_roadmap(db, db_user.id, [t.id for t in techs])
        
    # Seed default user "rahul"
    db_user2 = db.query(models.User).filter(models.User.username == "rahul").first()
    if not db_user2:
        user_create = schemas.UserCreate(
            full_name="Rahul Sharma",
            username="rahul",
            email="rahul@tracker.com",
            password="user123",
            role="user",
            team="Java Development",
            is_active=True
        )
        db_user = create_user(db, user_create)
        
        # Assign default roadmaps (Java, Spring Boot, MySQL)
        tech_names = ["Java", "Spring Boot", "MySQL"]
        techs = db.query(models.Technology).filter(models.Technology.name.in_(tech_names)).all()
        assign_roadmap(db, db_user.id, [t.id for t in techs])
        
    db.commit()

# Achievements logic removed
def run_db_seeding(db: Session):
    seed_default_technologies(db)
    seed_admin_user(db)


# ==========================================
# Messaging logic removed
