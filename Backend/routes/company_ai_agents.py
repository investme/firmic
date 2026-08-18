import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.company_ai_agent import CompanyAIAgent
from models.sonny_orchestration import SonnyAgentRegistry
from models.usage_ledger import UsageLedger
from schemas.company_ai_agent import (
    DeactivateAIAgentRequest,
    HireAIAgentRequest,
)
from services.activity_service import record_activity
from services.ledger_service import (
    current_invoice_month,
    record_usage,
)


router = APIRouter(
    prefix="/api/ai-workforce",
    tags=["AI Workforce"],
)


def is_admin(token: dict) -> bool:
    role = str(token.get("role") or "").lower()
    email = str(token.get("email") or "").lower()
    return role == "admin" or email == "hussein@firmic.io"


def authorize_company(
    company_id: str,
    token: dict,
    db: Session,
) -> Company:
    query = db.query(Company).filter(Company.id == company_id)

    if not is_admin(token):
        user_id = token.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        query = query.filter(Company.user_id == str(user_id))

    company = query.first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


def serialize_agent(agent: CompanyAIAgent) -> dict:
    return {
        "id": agent.id,
        "company_id": agent.company_id,
        "registry_agent_id": agent.registry_agent_id,
        "agent_name": agent.agent_name,
        "monthly_price_usd": agent.monthly_price_usd,
        "status": agent.status,
        "activated_at": (
            agent.activated_at.isoformat()
            if agent.activated_at
            else None
        ),
        "deactivated_at": (
            agent.deactivated_at.isoformat()
            if agent.deactivated_at
            else None
        ),
    }


def resolve_registry_agent(
    db: Session,
    *,
    agent_code: str | None,
) -> SonnyAgentRegistry | None:
    normalized_code = str(agent_code or "").strip().lower()

    if not normalized_code:
        return None

    registry_agent = (
        db.query(SonnyAgentRegistry)
        .filter(
            SonnyAgentRegistry.agent_code == normalized_code,
            SonnyAgentRegistry.status == "active",
        )
        .first()
    )

    if not registry_agent:
        raise HTTPException(
            status_code=404,
            detail="Active AI agent not found in Sonny registry",
        )

    return registry_agent


@router.get("/company/{company_id}")
def list_company_agents(
    company_id: str,
    include_inactive: bool = False,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    authorize_company(company_id, token, db)

    query = db.query(CompanyAIAgent).filter(
        CompanyAIAgent.company_id == company_id
    )

    if not include_inactive:
        query = query.filter(
            CompanyAIAgent.status == "active"
        )

    agents = query.order_by(
        CompanyAIAgent.agent_name.asc()
    ).all()

    return [serialize_agent(agent) for agent in agents]


@router.post("/hire")
def hire_agent(
    payload: HireAIAgentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(payload.company_id, token, db)

    if company.status == "terminated":
        raise HTTPException(
            status_code=400,
            detail="Cannot hire an agent for a terminated company",
        )

    registry_agent = resolve_registry_agent(
        db,
        agent_code=payload.agent_code,
    )

    agent_name = (
        registry_agent.name
        if registry_agent
        else str(payload.agent_name or "").strip()
    )

    if not agent_name:
        raise HTTPException(
            status_code=422,
            detail="agent_code or agent_name is required",
        )

    agent = (
        db.query(CompanyAIAgent)
        .filter(
            CompanyAIAgent.company_id == company.id,
            CompanyAIAgent.agent_name == agent_name,
        )
        .first()
    )

    try:
        if agent:
            agent.status = "active"
            agent.monthly_price_usd = payload.monthly_price_usd
            agent.activated_at = datetime.datetime.utcnow()
            agent.deactivated_at = None

            if registry_agent:
                agent.registry_agent_id = registry_agent.id
                agent.agent_name = registry_agent.name
        else:
            agent = CompanyAIAgent(
                company_id=company.id,
                registry_agent_id=(
                    registry_agent.id
                    if registry_agent
                    else None
                ),
                agent_name=agent_name,
                monthly_price_usd=payload.monthly_price_usd,
                status="active",
            )
            db.add(agent)

        db.flush()

        existing_charge = (
            db.query(UsageLedger)
            .filter(
                UsageLedger.company_id == company.id,
                UsageLedger.service == "ai_workforce",
                UsageLedger.resource == agent_name,
                UsageLedger.action == "monthly_agent_subscription",
                UsageLedger.invoice_month == current_invoice_month(),
                UsageLedger.status == "unbilled",
            )
            .first()
        )

        if not existing_charge:
            record_usage(
                db,
                company_id=company.id,
                service="ai_workforce",
                category="subscription",
                resource=agent_name,
                action="monthly_agent_subscription",
                quantity=1,
                unit="agent_month",
                unit_price=payload.monthly_price_usd,
                tax_rate=0.05,
                source_type="company_ai_agent",
                source_id=agent.id,
                metadata={
                    "agent_name": agent_name,
                    "agent_code": (
                        registry_agent.agent_code
                        if registry_agent
                        else None
                    ),
                    "registry_agent_id": (
                        registry_agent.id
                        if registry_agent
                        else None
                    ),
                },
                commit=False,
            )

        record_activity(
            db,
            company_id=company.id,
            event_type="ai_agent_hired",
            title=f"{agent_name} hired",
            description=(
                f"{agent_name} was activated for "
                f"{company.name}."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or token.get("email") or ""),
            source_type="company_ai_agent",
            source_id=agent.id,
            commit=False,
        )

        db.commit()
        db.refresh(agent)

        return serialize_agent(agent)

    except Exception:
        db.rollback()
        raise


@router.post("/deactivate")
def deactivate_agent(
    payload: DeactivateAIAgentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(payload.company_id, token, db)

    registry_agent = resolve_registry_agent(
        db,
        agent_code=payload.agent_code,
    )

    query = db.query(CompanyAIAgent).filter(
        CompanyAIAgent.company_id == company.id
    )

    if registry_agent:
        query = query.filter(
            CompanyAIAgent.registry_agent_id == registry_agent.id
        )
    else:
        agent_name = str(payload.agent_name or "").strip()

        if not agent_name:
            raise HTTPException(
                status_code=422,
                detail="agent_code or agent_name is required",
            )

        query = query.filter(
            CompanyAIAgent.agent_name == agent_name
        )

    agent = query.first()

    if not agent:
        raise HTTPException(status_code=404, detail="AI agent not found")

    agent_name = agent.agent_name

    try:
        agent.status = "inactive"
        agent.deactivated_at = datetime.datetime.utcnow()

        ledger_entries = (
            db.query(UsageLedger)
            .filter(
                UsageLedger.company_id == company.id,
                UsageLedger.service == "ai_workforce",
                UsageLedger.resource == agent_name,
                UsageLedger.invoice_month == current_invoice_month(),
                UsageLedger.status == "unbilled",
            )
            .all()
        )

        for entry in ledger_entries:
            entry.status = "void"

        record_activity(
            db,
            company_id=company.id,
            event_type="ai_agent_deactivated",
            title=f"{agent_name} deactivated",
            description=(
                f"{agent_name} was deactivated for "
                f"{company.name}."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or token.get("email") or ""),
            source_type="company_ai_agent",
            source_id=agent.id,
            commit=False,
        )

        db.commit()
        db.refresh(agent)

        return serialize_agent(agent)

    except Exception:
        db.rollback()
        raise
