from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    name = Column(String, index=True)
    status = Column(String, default="initiated")

    documents = relationship("Document", back_populates="company")
    tasks = relationship("Task", back_populates="company")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, ForeignKey("companies.id"), index=True)

    name = Column(String, index=True)
    type = Column(String, default="General")
    status = Column(String, default="pending")

    file_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    company = relationship("Company", back_populates="documents")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, ForeignKey("companies.id"), index=True)

    title = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(String, default="pending")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    company = relationship("Company", back_populates="tasks")