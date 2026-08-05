from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    plan_code: str = "PLAN_STARTER"