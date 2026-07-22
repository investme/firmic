from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from database import Base
import datetime
import uuid


class SonnyMemory(Base):
    __tablename__ = "sonny_memories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id"), index=True, nullable=False)

    memory_type = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)

    source = Column(String, default="sonny")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)