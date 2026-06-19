from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite database
DATABASE_URL = "sqlite:///./sonny.db"

# REQUIRED FOR SQLITE
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# SESSION FACTORY
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# BASE CLASS FOR ALL MODELS
Base = declarative_base()