from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    user_id: str