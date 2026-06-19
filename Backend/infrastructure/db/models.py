from sqlalchemy import Column, String, DateTime, JSON
from infrastructure.db.session import Base
import datetime

class ActionTable(Base):
    __tablename__ = "sonny_actions"

    id = Column(String, primary_key=True)
    type = Column(String)
    title = Column(String)
    description = Column(String)
    priority = Column(String)
    status = Column(String, default="pending")
    action_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)