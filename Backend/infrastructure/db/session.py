from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite for now (simple dev mode)
DATABASE_URL = "sqlite:///./sonny.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# Dependency for FastAPI (optional but recommended)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()