from pydantic import BaseModel, Field


class HireAIAgentRequest(BaseModel):
    company_id: str
    agent_name: str | None = None
    agent_code: str | None = None
    monthly_price_usd: float = Field(ge=0)


class DeactivateAIAgentRequest(BaseModel):
    company_id: str
    agent_name: str | None = None
    agent_code: str | None = None
