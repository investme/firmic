from pydantic import BaseModel


class HireAIAgentRequest(BaseModel):
    company_id: str
    agent_name: str | None = None
    agent_code: str | None = None


class DeactivateAIAgentRequest(BaseModel):
    company_id: str
    agent_name: str | None = None
    agent_code: str | None = None
