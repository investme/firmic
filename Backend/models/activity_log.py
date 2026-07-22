from sqlalchemy import Column, DateTime, JSON, String
from database import Base
import datetime
import uuid


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    actor_type = Column(String, nullable=False, default="system", index=True)
    actor_id = Column(String, nullable=True, index=True)
    source_type = Column(String, nullable=True, index=True)
    source_id = Column(String, nullable=True, index=True)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
