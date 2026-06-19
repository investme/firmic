from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    name = Column(String, index=True)
    status = Column(String, default="initiated")
