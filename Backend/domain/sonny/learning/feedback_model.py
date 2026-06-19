from pydantic import BaseModel
from datetime import datetime

class ActionFeedback(BaseModel):
    action_id: str
    success: bool
    impact_score: float
    delay_minutes: int
    notes: str
    created_at: datetime = datetime.utcnow()