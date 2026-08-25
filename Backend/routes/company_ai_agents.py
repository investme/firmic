import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.company_ai_agent import CompanyAIAgent
from models.sonny_orchestration import SonnyAgentRegistry
from models.subscription import SubscriptionItem
from schemas.company_ai_agent import (
    DeactivateAIAgentRequest,
    HireAIAgentRequest,
)
from services.activity_service import record_activity
from services.subscription_service import (
    add_subscription_item,
    calculate_subscription_totals,
    get_service_by_code,
    included_quantity_for_plan,
    remove_subscription_item,
    require_company_subscription,
)


router = APIRouter(
    prefix="/api/ai-workforce",
    tags=["AI Workforce"],
)


CORE_AGENT_CODES = {
    "sonny",
    "hermes",
    "julia",
}


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


def require_active_company(
    company: Company,
) -> Company:
    if str(company.status or "").strip().lower() != "active":
        raise HTTPException(
            status_code=403,
            detail=(
                "AI Workforce is available only after "
                "the company platform is fully activated."
            ),
        )

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
    require_active_company(company)

    subscription = require_company_subscription(
        db,
        company.id,
    )
    ai_employee_service = get_service_by_code(
        db,
        "SERVICE_AI_EMPLOYEE",
    )
    authoritative_monthly_price = float(
        ai_employee_service.monthly_price or 0
    )

    registry_agent = resolve_registry_agent(
        db,
        agent_code=payload.agent_code,
    )

    if (
        registry_agent
        and registry_agent.agent_code in CORE_AGENT_CODES
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{registry_agent.name} is a core Firmic agent "
                "and cannot be hired as an AI Employee."
            ),
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
            agent.monthly_price_usd = authoritative_monthly_price
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
                monthly_price_usd=authoritative_monthly_price,
                status="active",
            )
            db.add(agent)

        db.flush()

        active_agent_count = (
            db.query(CompanyAIAgent)
            .filter(
                CompanyAIAgent.company_id == company.id,
                CompanyAIAgent.status == "active",
            )
            .count()
        )

        included_quantity = included_quantity_for_plan(
            ai_employee_service,
            subscription.plan.code,
        )

        actor = str(
            token.get("sub")
            or token.get("email")
            or ""
        )

        if included_quantity is None:
            billable_quantity = 0
        else:
            billable_quantity = max(
                active_agent_count - int(included_quantity),
                0,
            )

        existing_ai_item = (
            db.query(SubscriptionItem)
            .filter(
                SubscriptionItem.subscription_id == subscription.id,
                SubscriptionItem.service_id == ai_employee_service.id,
                SubscriptionItem.status != "cancelled",
            )
            .first()
        )

        if billable_quantity > 0:
            add_subscription_item(
                db,
                subscription=subscription,
                service=ai_employee_service,
                quantity=billable_quantity,
                actor=actor,
                included_by_plan=False,
                metadata={
                    "source": "ai_workforce",
                    "service_code": "SERVICE_AI_EMPLOYEE",
                    "active_agent_count": active_agent_count,
                    "included_quantity": included_quantity,
                },
            )
        elif existing_ai_item:
            remove_subscription_item(
                db,
                subscription=subscription,
                item_id=existing_ai_item.id,
                actor=actor,
            )

        db.flush()
        calculate_subscription_totals(subscription)

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
    require_active_company(company)

    subscription = require_company_subscription(
        db,
        company.id,
    )
    ai_employee_service = get_service_by_code(
        db,
        "SERVICE_AI_EMPLOYEE",
    )
    registry_agent = resolve_registry_agent(
        db,
        agent_code=payload.agent_code,
    )

    if (
        registry_agent
        and registry_agent.agent_code in CORE_AGENT_CODES
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{registry_agent.name} is a core Firmic agent "
                "and cannot be deactivated through AI Employee controls."
            ),
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

        db.flush()

        active_agent_count = (
            db.query(CompanyAIAgent)
            .filter(
                CompanyAIAgent.company_id == company.id,
                CompanyAIAgent.status == "active",
            )
            .count()
        )

        ai_employee_item = (
            db.query(SubscriptionItem)
            .filter(
                SubscriptionItem.subscription_id == subscription.id,
                SubscriptionItem.service_id == ai_employee_service.id,
                SubscriptionItem.status != "cancelled",
            )
            .first()
        )

        actor = str(
            token.get("sub")
            or token.get("email")
            or ""
        )

        included_quantity = included_quantity_for_plan(
            ai_employee_service,
            subscription.plan.code,
        )

        if included_quantity is None:
            billable_quantity = 0
        else:
            billable_quantity = max(
                active_agent_count - int(included_quantity),
                0,
            )

        if billable_quantity > 0:
            add_subscription_item(
                db,
                subscription=subscription,
                service=ai_employee_service,
                quantity=billable_quantity,
                actor=actor,
                included_by_plan=False,
                metadata={
                    "source": "ai_workforce",
                    "service_code": "SERVICE_AI_EMPLOYEE",
                    "active_agent_count": active_agent_count,
                    "included_quantity": included_quantity,
                },
            )
        elif ai_employee_item:
            remove_subscription_item(
                db,
                subscription=subscription,
                item_id=ai_employee_item.id,
                actor=actor,
            )

        db.flush()
        calculate_subscription_totals(subscription)

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
