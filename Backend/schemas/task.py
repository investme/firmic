from pydantic import BaseModel


class TaskCreate(BaseModel):
    company_id: str
    title: str
    description: str | None = None
    status: str = "pending"