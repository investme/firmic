from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class SonnyAction(BaseModel):
    id: str
    type: str
    title: str
    description: str
    priority: str
    status: str = "pending"
    metadata: Optional[Dict] = None
    created_at: datetime = datetime.utcnow()