from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from .config import get_settings

# Get configuration
settings = get_settings()

# SQLAlchemy engine with configuration-based options
engine = create_engine(
    settings.database_url,
    **settings.database_options
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session():
    """Get database session for background tasks"""
    return SessionLocal()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)