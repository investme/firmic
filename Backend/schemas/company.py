from pydantic import BaseModel


class CompanyCreate(BaseModel):
    is_uae_resident: bool | None = None
    name: str
    plan_code: str = "PLAN_STARTER"