from sqlalchemy import Column, String, DateTime
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)