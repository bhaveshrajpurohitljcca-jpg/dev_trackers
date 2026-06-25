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
    settings_rec.day_cutoff_time = settings_data.day_cutoff_time
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
            "name": "HTML",
            "description": "HyperText Markup Language for structuring web pages",
            "topics": ["Elements & Tags", "Forms & Input", "Semantic HTML", "SEO Basics"]
        },
        {
            "name": "CSS",
            "description": "Cascading Style Sheets for styling web pages",
            "topics": ["Selectors & Specificity", "Flexbox", "Grid Layout", "Transitions & Animations", "Responsive Design"]
        },
        {
            "name": "JavaScript",
            "description": "Programming language for web development",
            "topics": ["Variables & Data Types", "DOM Manipulation", "Functions & Scope", "Promises & Async/Await", "ES6+ Features"]
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

# Gamification logic
def seed_default_badges(db: Session):
    # 1. Seed Categories
    categories = [
        ("Hours", "Awarded based on total hours logged."),
        ("Streak", "Awarded based on consecutive daily logs."),
        ("Project", "Awarded based on completed projects."),
        ("Frontend", "Technology badges for frontend development."),
        ("Backend", "Technology badges for backend development."),
        ("Database", "Technology badges for database development."),
        ("Roadmap", "Awarded based on overall roadmap completion percentage."),
        ("Competition", "Awarded based on weekly leaderboard rankings."),
        ("Collector", "Awarded based on total badges earned in your path.")
    ]
    existing_categories = {c.name for c in db.query(models.BadgeCategory.name).all()}
    categories_added = False
    for cat_name, cat_desc in categories:
        if cat_name not in existing_categories:
            db.add(models.BadgeCategory(name=cat_name, description=cat_desc))
            categories_added = True
    if categories_added:
        db.commit()

    # 2. Seed Badges
    badges_to_seed = [
        # --- Hours Badges ---
        {"code": "first_step", "name": "First Step", "description": "Log 5 hours of work.", "category": "Hours", "rarity": "Common", "icon": "🥉", "required_value": 5, "department": None},
        {"code": "getting_serious", "name": "Getting Serious", "description": "Log 15 hours of work.", "category": "Hours", "rarity": "Common", "icon": "🥉", "required_value": 15, "department": None},
        {"code": "dedicated", "name": "Dedicated", "description": "Log 30 hours of work.", "category": "Hours", "rarity": "Rare", "icon": "🥉", "required_value": 30, "department": None},
        {"code": "focused_builder", "name": "Focused Builder", "description": "Log 50 hours of work.", "category": "Hours", "rarity": "Rare", "icon": "🥈", "required_value": 50, "department": None},
        {"code": "deep_worker", "name": "Deep Worker", "description": "Log 75 hours of work.", "category": "Hours", "rarity": "Epic", "icon": "🥈", "required_value": 75, "department": None},
        {"code": "consistent_creator", "name": "Consistent Creator", "description": "Log 100 hours of work.", "category": "Hours", "rarity": "Epic", "icon": "🥈", "required_value": 100, "department": None},
        {"code": "elite_learner", "name": "Elite Learner", "description": "Log 125 hours of work.", "category": "Hours", "rarity": "Legendary", "icon": "🥇", "required_value": 125, "department": None},
        {"code": "power_builder", "name": "Power Builder", "description": "Log 150 hours of work.", "category": "Hours", "rarity": "Legendary", "icon": "🥇", "required_value": 150, "department": None},
        {"code": "titan_of_progress", "name": "Titan of Progress", "description": "Log 200 hours of work.", "category": "Hours", "rarity": "Legendary", "icon": "👑", "required_value": 200, "department": None},

        # --- Streak Badges ---
        {"code": "spark", "name": "Spark", "description": "Maintain a 3-day work logging streak.", "category": "Streak", "rarity": "Common", "icon": "🔥", "required_value": 3, "department": None},
        {"code": "momentum", "name": "Momentum", "description": "Maintain a 5-day work logging streak.", "category": "Streak", "rarity": "Common", "icon": "🔥", "required_value": 5, "department": None},
        {"code": "consistent", "name": "Consistent", "description": "Maintain a 7-day work logging streak.", "category": "Streak", "rarity": "Rare", "icon": "🔥", "required_value": 7, "department": None},
        {"code": "focus_mode", "name": "Focus Mode", "description": "Maintain a 10-day work logging streak.", "category": "Streak", "rarity": "Rare", "icon": "🔥", "required_value": 10, "department": None},
        {"code": "determined", "name": "Determined", "description": "Maintain a 15-day work logging streak.", "category": "Streak", "rarity": "Epic", "icon": "🔥", "required_value": 15, "department": None},
        {"code": "discipline_master", "name": "Discipline Master", "description": "Maintain a 25-day work logging streak.", "category": "Streak", "rarity": "Epic", "icon": "🔥", "required_value": 25, "department": None},
        {"code": "iron_will", "name": "Iron Will", "description": "Maintain a 35-day work logging streak.", "category": "Streak", "rarity": "Legendary", "icon": "🔥", "required_value": 35, "department": None},
        {"code": "relentless", "name": "Relentless", "description": "Maintain a 50-day work logging streak.", "category": "Streak", "rarity": "Legendary", "icon": "👑", "required_value": 50, "department": None},

        # --- Project Badges ---
        {"code": "creator", "name": "Creator", "description": "Complete 1 project.", "category": "Project", "rarity": "Common", "icon": "📦", "required_value": 1, "department": None},
        {"code": "builder", "name": "Builder", "description": "Complete 3 projects.", "category": "Project", "rarity": "Common", "icon": "📦", "required_value": 3, "department": None},
        {"code": "architect", "name": "Architect", "description": "Complete 5 projects.", "category": "Project", "rarity": "Rare", "icon": "📦", "required_value": 5, "department": None},
        {"code": "innovator", "name": "Innovator", "description": "Complete 7 projects.", "category": "Project", "rarity": "Rare", "icon": "📦", "required_value": 7, "department": None},
        {"code": "product_maker", "name": "Product Maker", "description": "Complete 10 projects.", "category": "Project", "rarity": "Epic", "icon": "📦", "required_value": 10, "department": None},
        {"code": "solution_engineer", "name": "Solution Engineer", "description": "Complete 13 projects.", "category": "Project", "rarity": "Epic", "icon": "📦", "required_value": 13, "department": None},
        {"code": "project_veteran", "name": "Project Veteran", "description": "Complete 15 projects.", "category": "Project", "rarity": "Legendary", "icon": "📦", "required_value": 15, "department": None},
        {"code": "project_legend", "name": "Project Legend", "description": "Complete 20 projects.", "category": "Project", "rarity": "Legendary", "icon": "👑", "required_value": 20, "department": None},

        # --- Frontend Department Badges ---
        {"code": "markup_apprentice", "name": "Markup Apprentice", "description": "Complete at least 1 HTML topic.", "category": "Frontend", "rarity": "Common", "icon": "🌐", "required_value": 1, "department": "Frontend"},
        {"code": "html_craftsman", "name": "HTML Craftsman", "description": "Complete all HTML topics.", "category": "Frontend", "rarity": "Rare", "icon": "🌐", "required_value": 100, "department": "Frontend"},
        {"code": "style_apprentice", "name": "Style Apprentice", "description": "Complete at least 1 CSS topic.", "category": "Frontend", "rarity": "Common", "icon": "🎨", "required_value": 1, "department": "Frontend"},
        {"code": "css_artist", "name": "CSS Artist", "description": "Complete all CSS topics.", "category": "Frontend", "rarity": "Rare", "icon": "🎨", "required_value": 100, "department": "Frontend"},
        {"code": "script_runner", "name": "Script Runner", "description": "Complete at least 1 JavaScript topic.", "category": "Frontend", "rarity": "Common", "icon": "⚡", "required_value": 1, "department": "Frontend"},
        {"code": "javascript_specialist", "name": "JavaScript Specialist", "description": "Complete all JavaScript topics.", "category": "Frontend", "rarity": "Rare", "icon": "⚡", "required_value": 100, "department": "Frontend"},
        {"code": "component_builder", "name": "Component Builder", "description": "Complete at least 1 React topic.", "category": "Frontend", "rarity": "Common", "icon": "⚛", "required_value": 1, "department": "Frontend"},
        {"code": "react_specialist", "name": "React Specialist", "description": "Complete all React topics.", "category": "Frontend", "rarity": "Rare", "icon": "⚛", "required_value": 100, "department": "Frontend"},
        {"code": "type_guardian", "name": "Type Guardian", "description": "Complete at least 1 TypeScript topic.", "category": "Frontend", "rarity": "Common", "icon": "🔷", "required_value": 1, "department": "Frontend"},
        {"code": "typescript_specialist", "name": "TypeScript Specialist", "description": "Complete all TypeScript topics.", "category": "Frontend", "rarity": "Rare", "icon": "🔷", "required_value": 100, "department": "Frontend"},
        
        {"code": "frontend_explorer", "name": "Frontend Explorer", "description": "Complete 2 Frontend technologies.", "category": "Frontend", "rarity": "Rare", "icon": "🥉", "required_value": 2, "department": "Frontend"},
        {"code": "frontend_specialist", "name": "Frontend Specialist", "description": "Complete 4 Frontend technologies.", "category": "Frontend", "rarity": "Epic", "icon": "🥈", "required_value": 4, "department": "Frontend"},
        {"code": "frontend_master", "name": "Frontend Master", "description": "Complete all 5 Frontend technologies.", "category": "Frontend", "rarity": "Legendary", "icon": "👑", "required_value": 5, "department": "Frontend"},

        # --- Backend Department Badges ---
        {"code": "python_explorer", "name": "Python Explorer", "description": "Complete at least 1 Python topic.", "category": "Backend", "rarity": "Common", "icon": "🐍", "required_value": 1, "department": "Backend"},
        {"code": "python_specialist", "name": "Python Specialist", "description": "Complete all Python topics.", "category": "Backend", "rarity": "Rare", "icon": "🐍", "required_value": 100, "department": "Backend"},
        {"code": "api_builder", "name": "API Builder", "description": "Complete at least 1 FastAPI topic.", "category": "Backend", "rarity": "Common", "icon": "⚙", "required_value": 1, "department": "Backend"},
        {"code": "fastapi_specialist", "name": "FastAPI Specialist", "description": "Complete all FastAPI topics.", "category": "Backend", "rarity": "Rare", "icon": "⚙", "required_value": 100, "department": "Backend"},
        
        {"code": "backend_explorer", "name": "Backend Explorer", "description": "Complete 1 Backend technology.", "category": "Backend", "rarity": "Rare", "icon": "🥉", "required_value": 1, "department": "Backend"},
        {"code": "backend_specialist", "name": "Backend Specialist", "description": "Complete all Backend technologies.", "category": "Backend", "rarity": "Epic", "icon": "🥈", "required_value": 2, "department": "Backend"},
        {"code": "backend_master", "name": "Backend Master", "description": "Complete full backend roadmap.", "category": "Backend", "rarity": "Legendary", "icon": "👑", "required_value": 2, "department": "Backend"},

        # --- Database Department Badges ---
        {"code": "query_explorer", "name": "Query Explorer", "description": "Complete at least 1 SQL topic.", "category": "Database", "rarity": "Common", "icon": "🗄", "required_value": 1, "department": "Database"},
        {"code": "sql_specialist", "name": "SQL Specialist", "description": "Complete all SQL topics.", "category": "Database", "rarity": "Rare", "icon": "🗄", "required_value": 100, "department": "Database"},
        {"code": "data_builder", "name": "Data Builder", "description": "Complete at least 1 PostgreSQL topic.", "category": "Database", "rarity": "Common", "icon": "🐘", "required_value": 1, "department": "Database"},
        {"code": "postgresql_specialist", "name": "PostgreSQL Specialist", "description": "Complete all PostgreSQL topics.", "category": "Database", "rarity": "Rare", "icon": "🐘", "required_value": 100, "department": "Database"},
        
        {"code": "database_explorer", "name": "Database Explorer", "description": "Complete 1 Database technology.", "category": "Database", "rarity": "Rare", "icon": "🥉", "required_value": 1, "department": "Database"},
        {"code": "database_specialist", "name": "Database Specialist", "description": "Complete all Database technologies.", "category": "Database", "rarity": "Epic", "icon": "🥈", "required_value": 2, "department": "Database"},
        {"code": "database_master", "name": "Database Master", "description": "Complete full database roadmap.", "category": "Database", "rarity": "Legendary", "icon": "👑", "required_value": 2, "department": "Database"},

        # --- Learning Roadmap Badges ---
        {"code": "pathfinder", "name": "Pathfinder", "description": "Complete 25% of your assigned roadmap.", "category": "Roadmap", "rarity": "Common", "icon": "🧭", "required_value": 25, "department": None},
        {"code": "trailblazer", "name": "Trailblazer", "description": "Complete 50% of your assigned roadmap.", "category": "Roadmap", "rarity": "Rare", "icon": "🏹", "required_value": 50, "department": None},
        {"code": "momentum_maker", "name": "Momentum Maker", "description": "Complete 75% of your assigned roadmap.", "category": "Roadmap", "rarity": "Epic", "icon": "🚀", "required_value": 75, "department": None},
        {"code": "roadmap_conqueror", "name": "Roadmap Conqueror", "description": "Complete 100% of your assigned roadmap.", "category": "Roadmap", "rarity": "Legendary", "icon": "👑", "required_value": 100, "department": None},

        # --- Competition Badges ---
        {"code": "weekly_champion_1", "name": "Weekly Champion I", "description": "Finish 1st place on the weekly leaderboard 1 time.", "category": "Competition", "rarity": "Common", "icon": "🥇", "required_value": 1, "department": None},
        {"code": "weekly_champion_2", "name": "Weekly Champion II", "description": "Finish 1st place on the weekly leaderboard 3 times.", "category": "Competition", "rarity": "Rare", "icon": "🥇", "required_value": 3, "department": None},
        {"code": "weekly_champion_3", "name": "Weekly Champion III", "description": "Finish 1st place on the weekly leaderboard 5 times.", "category": "Competition", "rarity": "Rare", "icon": "🥇", "required_value": 5, "department": None},
        {"code": "weekly_champion_4", "name": "Weekly Champion IV", "description": "Finish 1st place on the weekly leaderboard 10 times.", "category": "Competition", "rarity": "Epic", "icon": "🥇", "required_value": 10, "department": None},
        {"code": "weekly_champion_5", "name": "Weekly Champion V", "description": "Finish 1st place on the weekly leaderboard 15 times.", "category": "Competition", "rarity": "Legendary", "icon": "👑", "required_value": 15, "department": None},
        
        {"code": "rising_challenger_1", "name": "Rising Challenger I", "description": "Finish 2nd place on the weekly leaderboard 1 time.", "category": "Competition", "rarity": "Common", "icon": "🥈", "required_value": 1, "department": None},
        {"code": "rising_challenger_2", "name": "Rising Challenger II", "description": "Finish 2nd place on the weekly leaderboard 3 times.", "category": "Competition", "rarity": "Rare", "icon": "🥈", "required_value": 3, "department": None},
        {"code": "rising_challenger_3", "name": "Rising Challenger III", "description": "Finish 2nd place on the weekly leaderboard 5 times.", "category": "Competition", "rarity": "Rare", "icon": "🥈", "required_value": 5, "department": None},
        {"code": "rising_challenger_4", "name": "Rising Challenger IV", "description": "Finish 2nd place on the weekly leaderboard 10 times.", "category": "Competition", "rarity": "Epic", "icon": "🥈", "required_value": 10, "department": None},
        {"code": "rising_challenger_5", "name": "Rising Challenger V", "description": "Finish 2nd place on the weekly leaderboard 15 times.", "category": "Competition", "rarity": "Legendary", "icon": "👑", "required_value": 15, "department": None},
        
        {"code": "podium_finisher_1", "name": "Podium Finisher I", "description": "Finish 3rd place on the weekly leaderboard 1 time.", "category": "Competition", "rarity": "Common", "icon": "🥉", "required_value": 1, "department": None},
        {"code": "podium_finisher_2", "name": "Podium Finisher II", "description": "Finish 3rd place on the weekly leaderboard 3 times.", "category": "Competition", "rarity": "Rare", "icon": "🥉", "required_value": 3, "department": None},
        {"code": "podium_finisher_3", "name": "Podium Finisher III", "description": "Finish 3rd place on the weekly leaderboard 5 times.", "category": "Competition", "rarity": "Rare", "icon": "🥉", "required_value": 5, "department": None},
        {"code": "podium_finisher_4", "name": "Podium Finisher IV", "description": "Finish 3rd place on the weekly leaderboard 10 times.", "category": "Competition", "rarity": "Epic", "icon": "🥉", "required_value": 10, "department": None},
        {"code": "podium_finisher_5", "name": "Podium Finisher V", "description": "Finish 3rd place on the weekly leaderboard 15 times.", "category": "Competition", "rarity": "Legendary", "icon": "👑", "required_value": 15, "department": None},

        # --- Collector Badges ---
        {"code": "badge_hunter", "name": "Badge Hunter", "description": "Earn 10 badges.", "category": "Collector", "rarity": "Common", "icon": "🏅", "required_value": 10, "department": None},
        {"code": "collector", "name": "Collector", "description": "Earn 20 badges.", "category": "Collector", "rarity": "Common", "icon": "🏅", "required_value": 20, "department": None},
        {"code": "treasure_seeker", "name": "Treasure Seeker", "description": "Earn 30 badges.", "category": "Collector", "rarity": "Rare", "icon": "🏅", "required_value": 30, "department": None},
        {"code": "badge_hoarder", "name": "Badge Hoarder", "description": "Earn 40 badges.", "category": "Collector", "rarity": "Epic", "icon": "🏅", "required_value": 40, "department": None},
        {"code": "elite_collector", "name": "Elite Collector", "description": "Earn 50 badges.", "category": "Collector", "rarity": "Legendary", "icon": "🥇", "required_value": 50, "department": None},
        {"code": "hall_of_fame", "name": "Hall of Fame", "description": "Earn 60 badges.", "category": "Collector", "rarity": "Legendary", "icon": "👑", "required_value": 60, "department": None},

        # --- Ultimate Collector Badge ---
        {"code": "ultimate_collector", "name": "Ultimate Collector", "description": "Earn every available badge for your assigned department path.", "category": "Collector", "rarity": "Legendary", "icon": "💎", "required_value": 1, "department": None}
    ]
    existing_badge_codes = {b.code for b in db.query(models.Badge.code).all()}
    badges_added = False
    for b_data in badges_to_seed:
        if b_data["code"] not in existing_badge_codes:
            db.add(models.Badge(
                code=b_data["code"],
                name=b_data["name"],
                description=b_data["description"],
                category=b_data["category"],
                rarity=b_data["rarity"],
                icon=b_data["icon"],
                required_value=b_data["required_value"],
                department=b_data["department"]
            ))
            badges_added = True
    if badges_added:
        db.commit()


def check_and_update_badges(db: Session, user_id: int):
    user = get_user(db, user_id)
    if not user:
        return
        
    # 1. Determine user's departments
    user_depts = []
    if user.primary_team:
        p_lower = user.primary_team.lower()
        if "front" in p_lower:
            user_depts.append("Frontend")
        elif "back" in p_lower:
            user_depts.append("Backend")
        elif "data" in p_lower or "db" in p_lower or "sql" in p_lower or "postgres" in p_lower:
            user_depts.append("Database")
    if user.secondary_team:
        s_lower = user.secondary_team.lower()
        if "front" in s_lower:
            user_depts.append("Frontend")
        elif "back" in s_lower:
            user_depts.append("Backend")
        elif "data" in s_lower or "db" in s_lower or "sql" in s_lower or "postgres" in s_lower:
            user_depts.append("Database")

    # 2. Get total hours
    total_mins = db.query(func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)).filter(models.DailyLog.user_id == user_id).scalar() or 0
    total_hours = total_mins / 60.0

    # 3. Get streak
    longest_streak = 0
    if user.streak:
        longest_streak = user.streak.longest_streak

    # 4. Get completed projects
    completed_projects = db.query(models.Project).filter(
        models.Project.user_id == user_id,
        models.Project.status == "Completed"
    ).count()

    # 5. Technology completions helper
    techs = db.query(models.Technology).all()
    tech_map = {t.name: t for t in techs}

    def get_tech_metrics(tech_name):
        tech = tech_map.get(tech_name)
        if not tech:
            return 0, 0, False
        topics = tech.topics
        if not topics:
            return 0, 0, False
        topic_ids = [tp.id for tp in topics]
        completed_count = db.query(models.CompletedTopic).filter(
            models.CompletedTopic.user_id == user_id,
            models.CompletedTopic.topic_id.in_(topic_ids)
        ).count()
        is_completed = completed_count == len(topics)
        return completed_count, len(topics), is_completed

    html_count, html_total, html_completed = get_tech_metrics("HTML")
    css_count, css_total, css_completed = get_tech_metrics("CSS")
    js_count, js_total, js_completed = get_tech_metrics("JavaScript")
    react_count, react_total, react_completed = get_tech_metrics("React")
    ts_count, ts_total, ts_completed = get_tech_metrics("TypeScript")
    python_count, python_total, python_completed = get_tech_metrics("Python")
    fastapi_count, fastapi_total, fastapi_completed = get_tech_metrics("FastAPI")
    sql_count, sql_total, sql_completed = get_tech_metrics("SQL")
    postgres_count, postgres_total, postgres_completed = get_tech_metrics("PostgreSQL")

    frontend_techs_completed = sum([html_completed, css_completed, js_completed, react_completed, ts_completed])
    backend_techs_completed = sum([python_completed, fastapi_completed])
    database_techs_completed = sum([sql_completed, postgres_completed])

    # 6. Roadmap percentage progress
    total_assigned_topics = 0
    for ut in user.assigned_technologies:
        total_assigned_topics += len(ut.technology.topics)
    
    completed_assigned_topics = 0
    if user.assigned_technologies:
        assigned_tech_ids = [ut.technology_id for ut in user.assigned_technologies]
        completed_assigned_topics = db.query(models.CompletedTopic).join(models.Topic).filter(
            models.CompletedTopic.user_id == user_id,
            models.Topic.technology_id.in_(assigned_tech_ids)
        ).count()
        
    roadmap_percentage = (completed_assigned_topics / total_assigned_topics * 100.0) if total_assigned_topics > 0 else 0.0

    # 7. Competition Rankings count
    first_places = db.query(models.CompetitionRanking).filter(models.CompetitionRanking.user_id == user_id, models.CompetitionRanking.rank == 1).count()
    second_places = db.query(models.CompetitionRanking).filter(models.CompetitionRanking.user_id == user_id, models.CompetitionRanking.rank == 2).count()
    third_places = db.query(models.CompetitionRanking).filter(models.CompetitionRanking.user_id == user_id, models.CompetitionRanking.rank == 3).count()

    # 8. Metric mappings
    metric_values = {
        # Hours
        "first_step": total_hours,
        "getting_serious": total_hours,
        "dedicated": total_hours,
        "focused_builder": total_hours,
        "deep_worker": total_hours,
        "consistent_creator": total_hours,
        "elite_learner": total_hours,
        "power_builder": total_hours,
        "titan_of_progress": total_hours,

        # Streak
        "spark": longest_streak,
        "momentum": longest_streak,
        "consistent": longest_streak,
        "focus_mode": longest_streak,
        "determined": longest_streak,
        "discipline_master": longest_streak,
        "iron_will": longest_streak,
        "relentless": longest_streak,

        # Project
        "creator": completed_projects,
        "builder": completed_projects,
        "architect": completed_projects,
        "innovator": completed_projects,
        "product_maker": completed_projects,
        "solution_engineer": completed_projects,
        "project_veteran": completed_projects,
        "project_legend": completed_projects,

        # Frontend
        "markup_apprentice": html_count,
        "html_craftsman": 1 if html_completed else 0,
        "style_apprentice": css_count,
        "css_artist": 1 if css_completed else 0,
        "script_runner": js_count,
        "javascript_specialist": 1 if js_completed else 0,
        "component_builder": react_count,
        "react_specialist": 1 if react_completed else 0,
        "type_guardian": ts_count,
        "typescript_specialist": 1 if ts_completed else 0,
        "frontend_explorer": frontend_techs_completed,
        "frontend_specialist": frontend_techs_completed,
        "frontend_master": frontend_techs_completed,

        # Backend
        "python_explorer": python_count,
        "python_specialist": 1 if python_completed else 0,
        "api_builder": fastapi_count,
        "fastapi_specialist": 1 if fastapi_completed else 0,
        "backend_explorer": backend_techs_completed,
        "backend_specialist": backend_techs_completed,
        "backend_master": backend_techs_completed,

        # Database
        "query_explorer": sql_count,
        "sql_specialist": 1 if sql_completed else 0,
        "data_builder": postgres_count,
        "postgresql_specialist": 1 if postgres_completed else 0,
        "database_explorer": database_techs_completed,
        "database_specialist": database_techs_completed,
        "database_master": database_techs_completed,

        # Roadmap
        "pathfinder": roadmap_percentage,
        "trailblazer": roadmap_percentage,
        "momentum_maker": roadmap_percentage,
        "roadmap_conqueror": roadmap_percentage,

        # Competition
        "weekly_champion_1": first_places,
        "weekly_champion_2": first_places,
        "weekly_champion_3": first_places,
        "weekly_champion_4": first_places,
        "weekly_champion_5": first_places,
        "rising_challenger_1": second_places,
        "rising_challenger_2": second_places,
        "rising_challenger_3": second_places,
        "rising_challenger_4": second_places,
        "rising_challenger_5": second_places,
        "podium_finisher_1": third_places,
        "podium_finisher_2": third_places,
        "podium_finisher_3": third_places,
        "podium_finisher_4": third_places,
        "podium_finisher_5": third_places
    }

    # 9. Evaluate standard badges
    badges = db.query(models.Badge).all()
    for badge in badges:
        if badge.code in ["badge_hunter", "collector", "treasure_seeker", "badge_hoarder", "elite_collector", "hall_of_fame", "ultimate_collector"]:
            continue
            
        target = float(badge.required_value)
        current = float(metric_values.get(badge.code, 0.0))
        
        # Limit technology specialist target values to 1
        if badge.code in ["html_craftsman", "css_artist", "javascript_specialist", "react_specialist", "typescript_specialist",
                          "python_specialist", "fastapi_specialist", "sql_specialist", "postgresql_specialist"]:
            target = 1.0
            
        is_completed = current >= target
        
        progress_rec = db.query(models.BadgeProgress).filter(
            models.BadgeProgress.user_id == user_id,
            models.BadgeProgress.badge_code == badge.code
        ).first()
        
        if not progress_rec:
            progress_rec = models.BadgeProgress(
                user_id=user_id,
                badge_code=badge.code,
                current_value=current,
                target_value=target,
                is_completed=is_completed
            )
            db.add(progress_rec)
        else:
            progress_rec.current_value = current
            progress_rec.target_value = target
            if not progress_rec.is_completed and is_completed:
                progress_rec.is_completed = True
                
        if is_completed:
            existing_badge = db.query(models.UserBadge).filter(
                models.UserBadge.user_id == user_id,
                models.UserBadge.badge_id == badge.id
            ).first()
            if not existing_badge:
                new_earn = models.UserBadge(user_id=user_id, badge_id=badge.id)
                db.add(new_earn)
                
                now_ist = get_ist_time()
                history_rec = models.BadgeUnlockHistory(
                    user_id=user_id,
                    badge_id=badge.id,
                    badge_name=badge.name,
                    category=badge.category,
                    unlock_date=now_ist.date(),
                    unlock_time=now_ist.strftime("%I:%M %p"),
                    unlock_timestamp=now_ist,
                    rarity=badge.rarity,
                    unlock_source="auto_calculation"
                )
                db.add(history_rec)
                
                act_log = models.ActivityLog(
                    user_id=user_id,
                    user_name=user.full_name,
                    activity_type="badge_unlocked",
                    detail=f"🏆 {user.full_name} unlocked {badge.name} ({badge.rarity})"
                )
                db.add(act_log)
    db.commit()

    # 10. Evaluate Collector badges
    other_badges_earned = db.query(models.UserBadge).join(models.Badge).filter(
        models.UserBadge.user_id == user_id,
        models.Badge.category != "Collector"
    ).count()

    collector_badges_info = [
        ("badge_hunter", 10),
        ("collector", 20),
        ("treasure_seeker", 30),
        ("badge_hoarder", 40),
        ("elite_collector", 50),
        ("hall_of_fame", 60)
    ]

    for code, target in collector_badges_info:
        badge = db.query(models.Badge).filter(models.Badge.code == code).first()
        if not badge:
            continue
            
        is_completed = other_badges_earned >= target
        
        progress_rec = db.query(models.BadgeProgress).filter(
            models.BadgeProgress.user_id == user_id,
            models.BadgeProgress.badge_code == code
        ).first()
        
        if not progress_rec:
            progress_rec = models.BadgeProgress(
                user_id=user_id,
                badge_code=code,
                current_value=float(other_badges_earned),
                target_value=float(target),
                is_completed=is_completed
            )
            db.add(progress_rec)
        else:
            progress_rec.current_value = float(other_badges_earned)
            progress_rec.target_value = float(target)
            if not progress_rec.is_completed and is_completed:
                progress_rec.is_completed = True
                
        if is_completed:
            existing_badge = db.query(models.UserBadge).filter(
                models.UserBadge.user_id == user_id,
                models.UserBadge.badge_id == badge.id
            ).first()
            if not existing_badge:
                new_earn = models.UserBadge(user_id=user_id, badge_id=badge.id)
                db.add(new_earn)
                
                now_ist = get_ist_time()
                history_rec = models.BadgeUnlockHistory(
                    user_id=user_id,
                    badge_id=badge.id,
                    badge_name=badge.name,
                    category=badge.category,
                    unlock_date=now_ist.date(),
                    unlock_time=now_ist.strftime("%I:%M %p"),
                    unlock_timestamp=now_ist,
                    rarity=badge.rarity,
                    unlock_source="auto_calculation"
                )
                db.add(history_rec)
                
                act_log = models.ActivityLog(
                    user_id=user_id,
                    user_name=user.full_name,
                    activity_type="badge_unlocked",
                    detail=f"🏆 {user.full_name} unlocked {badge.name} ({badge.rarity})"
                )
                db.add(act_log)
    db.commit()

    # 11. Evaluate Ultimate Collector badge
    ultimate_badge = db.query(models.Badge).filter(models.Badge.code == "ultimate_collector").first()
    if ultimate_badge:
        # Get all badges available in user's path (excluding ultimate_collector)
        available_badges_q = db.query(models.Badge).filter(
            (models.Badge.department == None) | (models.Badge.department.in_(user_depts))
        ).filter(models.Badge.code != "ultimate_collector").all()
        
        available_badge_ids = [b.id for b in available_badges_q]
        
        earned_available_count = db.query(models.UserBadge).filter(
            models.UserBadge.user_id == user_id,
            models.UserBadge.badge_id.in_(available_badge_ids)
        ).count() if available_badge_ids else 0
        
        target = len(available_badge_ids)
        is_completed = earned_available_count >= target and target > 0
        
        progress_rec = db.query(models.BadgeProgress).filter(
            models.BadgeProgress.user_id == user_id,
            models.BadgeProgress.badge_code == "ultimate_collector"
        ).first()
        
        if not progress_rec:
            progress_rec = models.BadgeProgress(
                user_id=user_id,
                badge_code="ultimate_collector",
                current_value=float(earned_available_count),
                target_value=float(target),
                is_completed=is_completed
            )
            db.add(progress_rec)
        else:
            progress_rec.current_value = float(earned_available_count)
            progress_rec.target_value = float(target)
            if not progress_rec.is_completed and is_completed:
                progress_rec.is_completed = True
                
        if is_completed:
            existing_badge = db.query(models.UserBadge).filter(
                models.UserBadge.user_id == user_id,
                models.UserBadge.badge_id == ultimate_badge.id
            ).first()
            if not existing_badge:
                new_earn = models.UserBadge(user_id=user_id, badge_id=ultimate_badge.id)
                db.add(new_earn)
                
                now_ist = get_ist_time()
                history_rec = models.BadgeUnlockHistory(
                    user_id=user_id,
                    badge_id=ultimate_badge.id,
                    badge_name=ultimate_badge.name,
                    category=ultimate_badge.category,
                    unlock_date=now_ist.date(),
                    unlock_time=now_ist.strftime("%I:%M %p"),
                    unlock_timestamp=now_ist,
                    rarity=ultimate_badge.rarity,
                    unlock_source="auto_calculation"
                )
                db.add(history_rec)
                
                act_log = models.ActivityLog(
                    user_id=user_id,
                    user_name=user.full_name,
                    activity_type="badge_unlocked",
                    detail=f"🏆 {user.full_name} unlocked {ultimate_badge.name} ({ultimate_badge.rarity})"
                )
                db.add(act_log)
        db.commit()


def recalculate_all_badges(db: Session):
    # 1. Clear competition rankings
    db.query(models.CompetitionRanking).delete()
    db.commit()

    # 2. Get first daily log date to calculate week ranges
    first_log = db.query(models.DailyLog).order_by(models.DailyLog.date.asc()).first()
    today_date = get_ist_date()
    
    if first_log:
        start_date = first_log.date
    else:
        start_date = today_date - timedelta(weeks=12)
        
    # Adjust start_date to Sunday of that week
    start_sunday = start_date - timedelta(days=(start_date.weekday() + 1) % 7)
    
    # 3. Calculate weekly legends for all past completed weeks
    current_sunday = start_sunday
    active_users = db.query(models.User).filter(models.User.role == "user", models.User.is_active == True).all()
    user_ids = [u.id for u in active_users]
    
    while current_sunday < today_date:
        week_start = current_sunday
        week_end = current_sunday + timedelta(days=6)
        
        # If the week is completely in the past
        if week_end < today_date and user_ids:
            weekly_hours_q = db.query(
                models.DailyLog.user_id,
                func.sum(models.DailyLog.hours * 60 + models.DailyLog.minutes)
            ).filter(
                models.DailyLog.user_id.in_(user_ids),
                models.DailyLog.date >= week_start,
                models.DailyLog.date <= week_end
            ).group_by(models.DailyLog.user_id).all()
            
            weekly_contributors = []
            for uid, total_mins in weekly_hours_q:
                if total_mins and total_mins > 0:
                    weekly_contributors.append({
                        "user_id": uid,
                        "total_minutes": total_mins
                    })
                    
            weekly_contributors.sort(key=lambda x: x["total_minutes"], reverse=True)
            
            # Save top 3
            for rank_idx, contrib in enumerate(weekly_contributors[:3]):
                db_rank = models.CompetitionRanking(
                    user_id=contrib["user_id"],
                    week_start_date=week_start,
                    week_end_date=week_end,
                    rank=rank_idx + 1,
                    total_minutes=contrib["total_minutes"]
                )
                db.add(db_rank)
            db.commit()
            
        current_sunday += timedelta(days=7)

    # 4. Trigger badges check for all users
    all_users = db.query(models.User).all()
    for user in all_users:
        check_and_update_badges(db, user.id)


def force_award_badge(db: Session, user_id: int, badge_code: str):
    user = get_user(db, user_id)
    if not user:
        return None
    badge = db.query(models.Badge).filter(models.Badge.code == badge_code).first()
    if not badge:
        return None
        
    existing_badge = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == user_id,
        models.UserBadge.badge_id == badge.id
    ).first()
    
    if not existing_badge:
        new_earn = models.UserBadge(user_id=user_id, badge_id=badge.id)
        db.add(new_earn)
        
        now_ist = get_ist_time()
        history_rec = models.BadgeUnlockHistory(
            user_id=user_id,
            badge_id=badge.id,
            badge_name=badge.name,
            category=badge.category,
            unlock_date=now_ist.date(),
            unlock_time=now_ist.strftime("%I:%M %p"),
            unlock_timestamp=now_ist,
            rarity=badge.rarity,
            unlock_source="force_awarded"
        )
        db.add(history_rec)
        
        progress_rec = db.query(models.BadgeProgress).filter(
            models.BadgeProgress.user_id == user_id,
            models.BadgeProgress.badge_code == badge_code
        ).first()
        if not progress_rec:
            progress_rec = models.BadgeProgress(
                user_id=user_id,
                badge_code=badge_code,
                current_value=float(badge.required_value),
                target_value=float(badge.required_value),
                is_completed=True
            )
            db.add(progress_rec)
        else:
            progress_rec.current_value = float(badge.required_value)
            progress_rec.is_completed = True
            
        act_log = models.ActivityLog(
            user_id=user_id,
            user_name=user.full_name,
            activity_type="badge_unlocked",
            detail=f"🏆 {user.full_name} unlocked {badge.name} ({badge.rarity})"
        )
        db.add(act_log)
        db.commit()
        return badge
    return None


def run_db_seeding(db: Session):
    seed_default_technologies(db)
    seed_admin_user(db)
    seed_default_badges(db)



# ==========================================
# Messaging logic removed
