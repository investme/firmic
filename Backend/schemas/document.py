from pydantic import BaseModel

class DocumentCreate(BaseModel):
    company_id: str
    name: str
    type: str = "General"
    status: str = "pending"
    file_path: str | None = None

   
