from __future__ import annotations

from typing import Any
import datetime
import secrets
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from auth import get_token_payload, hash_password
from database import get_db
from firmic_models import Office, User
from models.company import Company, Document, Task, Workflow
from models.company_ai_agent import CompanyAIAgent
from models.activity_log import ActivityLog
from models.usage_ledger import UsageLedger
from models.support_ticket import SupportMessage, SupportTicket
from models.launch import CompanyLaunch
from models.subscription import CompanySubscription
from services.ledger_service import record_usage
from services.launch_service import (
    ensure_company_launch,
    get_launch_summary,
    review_company_launch,
    set_office_status,
    synchronize_launch_state,
    update_launch_requirement,
    update_provisioning,
)


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


COMPANY_ACTIVATION_FEE_USD = 79.0


def ensure_company_activation_fee(
    db: Session,
    company: Company,
) -> tuple[UsageLedger, bool]:
    """
    Ensure one lifetime Firmic Company Activation Fee exists.

    Legacy MVP rows used the label/action "Hookup Fee" / "hookup_fee".
    Existing legacy rows are renamed in place so a company never receives
    a duplicate one-time charge.
    """
    existing = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id == company.id,
            UsageLedger.service == "firmic_setup",
            UsageLedger.category == "one_time",
            UsageLedger.action.in_(
                {
                    "activation_fee",
                    "hookup_fee",
                }
            ),
            UsageLedger.source_type == "company",
            UsageLedger.source_id == company.id,
            UsageLedger.status != "void",
        )
        .first()
    )

    if existing:
        existing.resource = "Firmic Company Activation Fee"
        existing.action = "activation_fee"
        existing.unit = "company_activation"
        existing.unit_price = COMPANY_ACTIVATION_FEE_USD

        quantity = float(existing.quantity or 1)
        tax_rate = float(existing.tax_rate or 0)
        amount = round(
            quantity * COMPANY_ACTIVATION_FEE_USD,
            2,
        )
        tax_amount = round(
            amount * tax_rate,
            2,
        )

        existing.amount = amount
        existing.tax_amount = tax_amount
        existing.total_amount = round(
            amount + tax_amount,
            2,
        )

        metadata = dict(
            getattr(existing, "entry_metadata", None)
            or {}
        )
        metadata.update(
            {
                "company_name": company.name,
                "charge_type": "one_time",
                "fee_type": "company_activation",
                "description": (
                    "One-time Firmic company activation fee."
                ),
                "activation_fee_usd": (
                    COMPANY_ACTIVATION_FEE_USD
                ),
            }
        )
        existing.entry_metadata = metadata

        return existing, False

    entry = record_usage(
        db,
        company_id=company.id,
        service="firmic_setup",
        category="one_time",
        resource="Firmic Company Activation Fee",
        action="activation_fee",
        quantity=1,
        unit="company_activation",
        unit_price=COMPANY_ACTIVATION_FEE_USD,
        currency="USD",
        tax_rate=0.0,
        status="unbilled",
        source_type="company",
        source_id=company.id,
        metadata={
            "company_name": company.name,
            "charge_type": "one_time",
            "fee_type": "company_activation",
            "description": (
                "One-time Firmic company activation fee."
            ),
        },
        commit=False,
    )

    return entry, True


def synchronize_company_activation_fees(
    db: Session,
) -> dict[str, int | float]:
    """
    Ensure every non-terminated company has one USD 79 Company Activation Fee.

    Legacy Hookup Fee rows are migrated in place and are not duplicated.
    """
    companies = (
        db.query(Company)
        .filter(Company.status != "terminated")
        .order_by(Company.name.asc())
        .all()
    )

    created_count = 0
    migrated_or_existing_count = 0

    for company in companies:
        _, was_created = ensure_company_activation_fee(
            db,
            company,
        )
        if was_created:
            created_count += 1
        else:
            migrated_or_existing_count += 1

    if created_count or migrated_or_existing_count:
        db.commit()

    return {
        "created_count": created_count,
        "migrated_or_existing_count": migrated_or_existing_count,
        "activation_fee_usd": COMPANY_ACTIVATION_FEE_USD,
    }


# Compatibility alias during the transition.
synchronize_missing_hookup_fees = synchronize_company_activation_fees


def require_admin(
    token: dict = Depends(get_token_payload),
) -> dict:
    role = str(token.get("role") or "").lower()
    email = str(token.get("email") or "").lower()

    if role != "admin" and email != "hussein@firmic.io":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return token


def serialize_company(company: Company) -> dict[str, Any]:
    headquarters = None

    if company.headquarters_office_code:
        headquarters = {
            "office_code": company.headquarters_office_code,
            "office_name": "Premium Hub71 Virtual Headquarters",
            "location": company.headquarters_location,
            "phone": company.headquarters_phone,
            "mailbox": True,
            "status": "Active",
            "monthly_price_usd": company.headquarters_monthly_price_usd,
        }

    return {
        "id": company.id,
        "name": company.name,
        "user_id": company.user_id,
        "status": company.status,
        "headquarters": headquarters,
    }


def serialize_office(
    office: Office,
    company: Company | None = None,
) -> dict[str, Any]:
    return {
        "id": office.id,
        "office_code": office.office_code,
        "location": office.location,
        "status": office.status,
        "monthly_price_usd": office.monthly_price_usd,
        "company": (
            {
                "id": company.id,
                "name": company.name,
                "status": company.status,
                "user_id": company.user_id,
            }
            if company
            else None
        ),
    }


def company_by_office(
    companies: list[Company],
) -> dict[str, Company]:
    return {
        company.headquarters_office_code: company
        for company in companies
        if company.headquarters_office_code
    }


def release_company_office(
    company: Company,
    db: Session,
) -> str | None:
    office_code = company.headquarters_office_code

    if office_code:
        office = (
            db.query(Office)
            .filter(Office.office_code == office_code)
            .first()
        )

        if office:
            office.status = "available"

    company.headquarters_office_code = None
    company.headquarters_location = None
    company.headquarters_phone = None
    company.headquarters_monthly_price_usd = None

    return office_code


def build_metrics(
    companies: list[Company],
    offices: list[Office],
) -> dict[str, int]:
    return {
        "total_companies": len(companies),
        "active_companies": sum(
            company.status == "active"
            for company in companies
        ),
        "initiated_companies": sum(
            company.status == "initiated"
            for company in companies
        ),
        "terminated_companies": sum(
            company.status == "terminated"
            for company in companies
        ),
        "total_offices": len(offices),
        "rented_offices": sum(
            office.status == "rented"
            for office in offices
        ),
        "available_offices": sum(
            office.status == "available"
            for office in offices
        ),
    }


@router.get("/dashboard")
def get_admin_dashboard(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = (
        db.query(Company)
        .order_by(Company.name.asc())
        .all()
    )

    offices = (
        db.query(Office)
        .order_by(Office.office_code.asc())
        .all()
    )

    assignments = company_by_office(companies)

    activity = []

    for company in companies:
        if company.status == "terminated":
            text_value = f"{company.name} is terminated"
            activity_type = "company_terminated"
        elif company.headquarters_office_code:
            text_value = (
                f"{company.name} occupies "
                f"{company.headquarters_office_code}"
            )
            activity_type = "headquarters_active"
        else:
            text_value = (
                f"{company.name} is awaiting activation"
            )
            activity_type = "company_initiated"

        activity.append(
            {
                "type": activity_type,
                "company_id": company.id,
                "company_name": company.name,
                "office_code": company.headquarters_office_code,
                "text": text_value,
            }
        )

    return {
        "metrics": build_metrics(companies, offices),
        "recent_companies": [
            serialize_company(company)
            for company in companies[:20]
        ],
        "office_snapshot": [
            serialize_office(
                office,
                assignments.get(office.office_code),
            )
            for office in offices[:50]
        ],
        "activity": activity[:30],
    }


@router.get("/companies")
def list_admin_companies(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = (
        db.query(Company)
        .order_by(Company.name.asc())
        .all()
    )

    return [
        serialize_company(company)
        for company in companies
    ]


@router.get("/companies/{company_id}")
def get_admin_company(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return serialize_company(company)


@router.post("/companies/{company_id}/terminate")
def terminate_company(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    if company.status == "terminated":
        return {
            "message": "Company already terminated",
            "company": serialize_company(company),
        }

    try:
        released_office = release_company_office(
            company,
            db,
        )

        company.status = "terminated"

        db.commit()
        db.refresh(company)

        return {
            "message": "Company terminated successfully",
            "released_office_code": released_office,
            "company": serialize_company(company),
        }

    except Exception:
        db.rollback()
        raise


@router.post("/companies/{company_id}/restore")
def restore_company(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    if company.status != "terminated":
        raise HTTPException(
            status_code=400,
            detail="Only terminated companies can be restored",
        )

    try:
        company.status = "initiated"

        db.commit()
        db.refresh(company)

        return {
            "message": "Company restored successfully",
            "company": serialize_company(company),
        }

    except Exception:
        db.rollback()
        raise


def delete_company_dependencies(
    company_id: str,
    db: Session,
) -> list[str]:
    """
    Delete the complete database dependency tree for one company.

    The previous implementation only removed rows whose foreign key pointed
    directly at companies.id. That failed for nested relationships such as:

        companies
            -> company_subscriptions
                -> subscription_events
                -> subscription_items

    This implementation walks PostgreSQL foreign-key relationships recursively,
    deletes deepest child rows first, and only then allows the company row to
    be deleted. The whole operation stays inside the caller's transaction.
    """
    engine = db.get_bind()
    inspector = inspect(engine)
    preparer = engine.dialect.identifier_preparer

    def quote(identifier: str) -> str:
        return preparer.quote(identifier)

    child_relationships: dict[
        str,
        list[tuple[str, str, str]],
    ] = {}

    for table_name in inspector.get_table_names():
        if table_name == "companies":
            continue

        for foreign_key in inspector.get_foreign_keys(
            table_name
        ):
            parent_table = foreign_key.get(
                "referred_table"
            )
            parent_columns = (
                foreign_key.get("referred_columns")
                or []
            )
            child_columns = (
                foreign_key.get("constrained_columns")
                or []
            )

            if (
                not parent_table
                or len(parent_columns) != 1
                or len(child_columns) != 1
            ):
                continue

            child_relationships.setdefault(
                parent_table,
                [],
            ).append(
                (
                    table_name,
                    child_columns[0],
                    parent_columns[0],
                )
            )

    deleted_tables: list[str] = []
    deleted_table_set: set[str] = set()

    def delete_children(
        parent_table: str,
        parent_where: str,
        params: dict[str, Any],
        ancestry: tuple[str, ...],
    ) -> None:
        for (
            child_table,
            child_column,
            parent_column,
        ) in child_relationships.get(
            parent_table,
            [],
        ):
            if child_table in ancestry:
                continue

            child_where = (
                f"{quote(child_column)} IN ("
                f"SELECT {quote(parent_column)} "
                f"FROM {quote(parent_table)} "
                f"WHERE {parent_where}"
                f")"
            )

            delete_children(
                child_table,
                child_where,
                params,
                ancestry + (child_table,),
            )

            result = db.execute(
                text(
                    f"DELETE FROM {quote(child_table)} "
                    f"WHERE {child_where}"
                ),
                params,
            )

            if (
                result.rowcount
                and result.rowcount > 0
                and child_table not in deleted_table_set
            ):
                deleted_table_set.add(child_table)
                deleted_tables.append(child_table)

    delete_children(
        "companies",
        f"{quote('id')} = :company_id",
        {"company_id": company_id},
        ("companies",),
    )

    return deleted_tables


@router.delete("/companies/{company_id}")
def permanently_delete_company(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    if company.status != "terminated":
        raise HTTPException(
            status_code=400,
            detail=(
                "Terminate the company before "
                "permanent deletion"
            ),
        )

    try:
        release_company_office(company, db)

        deleted_dependencies = (
            delete_company_dependencies(
                company_id,
                db,
            )
        )

        db.delete(company)
        db.commit()

        return {
            "message": "Company permanently deleted",
            "company_id": company_id,
            "deleted_dependency_tables": (
                deleted_dependencies
            ),
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Permanent deletion failed. "
                f"{str(error)}"
            ),
        ) from error


@router.get("/offices")
def list_admin_offices(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    offices = (
        db.query(Office)
        .order_by(Office.office_code.asc())
        .all()
    )

    companies = (
        db.query(Company)
        .filter(
            Company.headquarters_office_code.isnot(
                None
            )
        )
        .all()
    )

    assignments = company_by_office(companies)

    return [
        serialize_office(
            office,
            assignments.get(office.office_code),
        )
        for office in offices
    ]



@router.get("/ai-workforce")
def get_admin_ai_workforce(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).order_by(Company.name.asc()).all()
    company_map = {company.id: company for company in companies}

    agents = (
        db.query(CompanyAIAgent)
        .order_by(
            CompanyAIAgent.status.asc(),
            CompanyAIAgent.agent_name.asc(),
        )
        .all()
    )

    active_agents = [agent for agent in agents if agent.status == "active"]
    active_monthly_cost = round(
        sum(float(agent.monthly_price_usd or 0) for agent in active_agents),
        2,
    )

    serialized_agents = []
    for agent in agents:
        company = company_map.get(agent.company_id)
        serialized_agents.append({
            "id": agent.id,
            "company_id": agent.company_id,
            "company_name": company.name if company else "Unknown Company",
            "company_status": company.status if company else "unknown",
            "headquarters": (
                company.headquarters_office_code
                if company
                else None
            ),
            "agent_name": agent.agent_name,
            "monthly_price_usd": round(float(agent.monthly_price_usd or 0), 2),
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
        })

    companies_with_agents = len({
        agent.company_id for agent in active_agents
    })

    return {
        "metrics": {
            "total_agents": len(agents),
            "active_agents": len(active_agents),
            "inactive_agents": len(agents) - len(active_agents),
            "companies_with_agents": companies_with_agents,
            "monthly_cost_usd": active_monthly_cost,
        },
        "agents": serialized_agents,
    }



class InviteAdminRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr


def generate_temporary_password(length: int = 14) -> str:
    """
    Generate a strong one-time temporary password.

    The password contains at least:
    - one uppercase letter
    - one lowercase letter
    - one number
    - one symbol
    """
    if length < 12:
        length = 12

    alphabet = (
        string.ascii_letters
        + string.digits
        + "!@#$%*-_"
    )

    required = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%*-_"),
    ]

    remaining = [
        secrets.choice(alphabet)
        for _ in range(length - len(required))
    ]

    password_chars = required + remaining
    secrets.SystemRandom().shuffle(password_chars)

    return "".join(password_chars)


def serialize_admin_user(
    user: User,
    *,
    current_user_id: str = "",
    current_email: str = "",
    company_count: int = 0,
    admin_count: int = 1,
) -> dict[str, Any]:
    is_current_user = (
        str(user.id) == current_user_id
        or str(user.email or "").lower() == current_email
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": "admin",
        "companies_owned": company_count,
        "created_at": (
            user.created_at.isoformat()
            if user.created_at
            else None
        ),
        "is_current_user": is_current_user,
        "can_delete": (
            not is_current_user
            and company_count == 0
            and admin_count > 1
        ),
    }


@router.post("/users/invite")
def invite_admin_user(
    payload: InviteAdminRequest,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new Firmic Admin employee account.

    The backend:
    - normalizes and validates the email
    - rejects duplicate accounts
    - generates and hashes a temporary password
    - forces role='admin'
    - records an immutable platform audit event
    - returns the temporary password once
    """
    normalized_email = str(payload.email).strip().lower()
    normalized_name = " ".join(payload.full_name.strip().split())

    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    temporary_password = generate_temporary_password()

    invited_user = User(
        full_name=normalized_name,
        email=normalized_email,
        password_hash=hash_password(temporary_password),
        role="admin",
    )

    try:
        db.add(invited_user)
        db.flush()

        audit_event = ActivityLog(
            id=str(uuid.uuid4()),
            company_id="firmic-platform",
            event_type="admin_employee_invited",
            title="New Firmic Admin invited",
            description=(
                f"{normalized_name} was invited to the "
                "Firmic Internal Admin Platform."
            ),
            actor_type="admin",
            actor_id=str(
                token.get("sub")
                or token.get("email")
                or ""
            ),
            source_type="admin_user",
            source_id=str(invited_user.id),
            event_metadata={
                "invited_user_id": invited_user.id,
                "invited_name": normalized_name,
                "invited_email": normalized_email,
                "invited_role": "admin",
                "invited_by_email": token.get("email"),
                "temporary_password_returned_once": True,
            },
        )

        db.add(audit_event)
        db.commit()
        db.refresh(invited_user)

        admin_count = (
            db.query(User)
            .filter(func.lower(User.role) == "admin")
            .count()
        )

        return {
            "message": "Admin employee invited successfully.",
            "temporary_password": temporary_password,
            "password_notice": (
                "Copy this temporary password now. "
                "It will not be displayed again."
            ),
            "user": serialize_admin_user(
                invited_user,
                current_user_id=str(token.get("sub") or ""),
                current_email=str(
                    token.get("email") or ""
                ).lower(),
                company_count=0,
                admin_count=admin_count,
            ),
            "activity_id": audit_event.id,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Admin invitation failed: {str(error)}",
        ) from error


@router.get("/users")
def get_admin_users(
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Return Firmic internal Admin employees only.

    Tenant owners are intentionally excluded because they belong in the
    tenant/company directories, not the internal Admin Users & Roles page.
    """
    users = (
        db.query(User)
        .filter(func.lower(User.role) == "admin")
        .order_by(User.created_at.desc())
        .all()
    )

    companies = db.query(Company).all()

    company_counts: dict[str, int] = {}
    for company in companies:
        key = str(company.user_id)
        company_counts[key] = company_counts.get(key, 0) + 1

    current_user_id = str(token.get("sub") or "")
    current_email = str(token.get("email") or "").lower()

    serialized = [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": "admin",
            "companies_owned": company_counts.get(str(user.id), 0),
            "created_at": (
                user.created_at.isoformat()
                if user.created_at
                else None
            ),
            "is_current_user": (
                str(user.id) == current_user_id
                or str(user.email or "").lower() == current_email
            ),
            "can_delete": (
                not (
                    str(user.id) == current_user_id
                    or str(user.email or "").lower() == current_email
                )
                and company_counts.get(str(user.id), 0) == 0
                and len(users) > 1
            ),
        }
        for user in users
    ]

    return {
        "metrics": {
            "total_admin_users": len(users),
            "admin_users": len(users),
            "protected_current_user": sum(
                bool(user["is_current_user"])
                for user in serialized
            ),
            "deletable_admin_users": sum(
                bool(user["can_delete"])
                for user in serialized
            ),
        },
        "users": serialized,
    }


@router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: int,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a departed Firmic Admin employee.

    Safety rules:
    - Tenant users cannot be deleted from this endpoint.
    - The logged-in Admin cannot delete their own account.
    - The last remaining Admin cannot be deleted.
    - An Admin owning company records cannot be deleted.
    """
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Admin user not found",
        )

    if str(user.role or "").lower() != "admin":
        raise HTTPException(
            status_code=400,
            detail=(
                "This endpoint only manages Firmic Admin employees. "
                "Tenant users must be managed through tenant/company administration."
            ),
        )

    current_user_id = str(token.get("sub") or "")
    current_email = str(token.get("email") or "").lower()

    if (
        str(user.id) == current_user_id
        or str(user.email or "").lower() == current_email
    ):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own active Admin account.",
        )

    admin_count = (
        db.query(User)
        .filter(func.lower(User.role) == "admin")
        .count()
    )

    if admin_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="The final remaining Admin account cannot be deleted.",
        )

    owned_company_count = (
        db.query(Company)
        .filter(Company.user_id == str(user.id))
        .count()
    )

    if owned_company_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "This Admin account owns company records. "
                "Transfer or remove those company relationships before deletion."
            ),
        )

    deleted_user = {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }

    try:
        db.delete(user)
        db.commit()

        return {
            "message": "Admin employee permanently deleted.",
            "deleted_user": deleted_user,
        }

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Admin user deletion failed: {str(error)}",
        ) from error


@router.get("/settings")
def get_admin_settings(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).all()
    offices = db.query(Office).all()

    office_prices = [
        float(office.monthly_price_usd or 0)
        for office in offices
        if office.monthly_price_usd is not None
    ]

    return {
        "platform": {
            "name": "Firmic",
            "environment": "MVP",
            "database": "PostgreSQL",
            "currency": "USD",
            "aed_conversion_rate": 3.67,
            "vat_rate": 0.05,
            "tenant_registration_enabled": True,
            "tenant_isolation_enabled": True,
        },
        "pricing": {
            "activation_fee_usd": COMPANY_ACTIVATION_FEE_USD,
            # Compatibility for older frontend builds.
            "hookup_fee_usd": COMPANY_ACTIVATION_FEE_USD,
            "default_office_monthly_usd": (
                round(sum(office_prices) / len(office_prices), 2)
                if office_prices
                else 99.0
            ),
            "meeting_room_hourly_usd": 25.0,
            "business_number_monthly_usd": 29.0,
            "digital_mailroom_monthly_usd": 19.0,
            "microsoft_365_monthly_usd": 19.0,
        },
        "inventory": {
            "total_offices": len(offices),
            "available_offices": sum(
                office.status == "available" for office in offices
            ),
            "rented_offices": sum(
                office.status == "rented" for office in offices
            ),
            "active_companies": sum(
                company.status == "active" for company in companies
            ),
        },
        "billing": {
            "ledger_enabled": True,
            "automatic_setup_fee_reconciliation": True,
            "tax_applied_to_setup_fee": False,
            "supported_statuses": ["unbilled", "billed", "paid", "void"],
        },
    }


@router.get("/analytics")
def get_admin_analytics(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    synchronize_company_activation_fees(db)

    companies = db.query(Company).all()
    offices = db.query(Office).all()
    agents = db.query(CompanyAIAgent).all()
    ledger = (
        db.query(UsageLedger)
        .filter(UsageLedger.status != "void")
        .all()
    )

    def total_for(service: str) -> float:
        return round(sum(
            float(entry.total_amount or 0)
            for entry in ledger
            if entry.service == service
        ), 2)

    paid_revenue = round(sum(
        float(entry.total_amount or 0)
        for entry in ledger
        if entry.status == "paid"
    ), 2)
    outstanding = round(sum(
        float(entry.total_amount or 0)
        for entry in ledger
        if entry.status in {"unbilled", "billed"}
    ), 2)

    return {
        "metrics": {
            "tenant_companies": len(companies),
            "active_companies": sum(
                company.status == "active" for company in companies
            ),
            "rented_offices": sum(
                office.status == "rented" for office in offices
            ),
            "available_offices": sum(
                office.status == "available" for office in offices
            ),
            "active_ai_agents": sum(
                agent.status == "active" for agent in agents
            ),
            "paid_revenue": paid_revenue,
            "outstanding": outstanding,
            "ledger_total": round(sum(
                float(entry.total_amount or 0) for entry in ledger
            ), 2),
        },
        "revenue_by_service": {
            "office": total_for("office"),
            "ai_workforce": total_for("ai_workforce"),
            "meeting_center": total_for("meeting_center"),
            "firmic_setup": total_for("firmic_setup"),
        },
        "ledger_entries": len(ledger),
    }


class AdminSupportReplyRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=10000,
    )


class AdminSupportUpdateRequest(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_admin_id: str | None = None


ADMIN_SUPPORT_STATUSES = {
    "open",
    "pending",
    "waiting_on_tenant",
    "resolved",
    "closed",
}

ADMIN_SUPPORT_PRIORITIES = {
    "low",
    "normal",
    "high",
    "urgent",
}


def serialize_admin_support_message(
    message: SupportMessage,
) -> dict[str, Any]:
    return {
        "id": message.id,
        "ticket_id": message.ticket_id,
        "sender_type": message.sender_type,
        "sender_id": message.sender_id,
        "message": message.message,
        "created_at": (
            message.created_at.isoformat()
            if message.created_at
            else None
        ),
    }


def serialize_admin_support_ticket(
    ticket: SupportTicket,
    company: Company | None,
    admin_map: dict[str, User],
) -> dict[str, Any]:
    assigned_admin = (
        admin_map.get(
            str(ticket.assigned_admin_id)
        )
        if ticket.assigned_admin_id
        else None
    )

    return {
        "id": ticket.id,
        "company_id": ticket.company_id,
        "company_name": (
            company.name
            if company
            else "Unknown Company"
        ),
        "company_status": (
            company.status
            if company
            else "unknown"
        ),
        "headquarters": (
            company.headquarters_office_code
            if company
            else None
        ),
        "created_by_user_id": ticket.created_by_user_id,
        "assigned_admin_id": ticket.assigned_admin_id,
        "assigned_admin": (
            {
                "id": assigned_admin.id,
                "full_name": assigned_admin.full_name,
                "email": assigned_admin.email,
            }
            if assigned_admin
            else None
        ),
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "created_at": (
            ticket.created_at.isoformat()
            if ticket.created_at
            else None
        ),
        "updated_at": (
            ticket.updated_at.isoformat()
            if ticket.updated_at
            else None
        ),
        "resolved_at": (
            ticket.resolved_at.isoformat()
            if ticket.resolved_at
            else None
        ),
        "message_count": len(ticket.messages or []),
        "messages": [
            serialize_admin_support_message(message)
            for message in ticket.messages
        ],
    }


def add_admin_support_activity(
    db: Session,
    *,
    ticket: SupportTicket,
    event_type: str,
    title: str,
    description: str,
    token: dict,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        ActivityLog(
            id=str(uuid.uuid4()),
            company_id=ticket.company_id,
            event_type=event_type,
            title=title,
            description=description,
            actor_type="admin",
            actor_id=str(
                token.get("sub")
                or token.get("email")
                or ""
            ),
            source_type="support_ticket",
            source_id=ticket.id,
            event_metadata=metadata or {},
        )
    )


@router.get("/support")
def get_admin_support(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .order_by(
            SupportTicket.updated_at.desc(),
            SupportTicket.created_at.desc(),
        )
        .all()
    )

    companies = db.query(Company).all()
    company_map = {
        company.id: company
        for company in companies
    }

    admins = (
        db.query(User)
        .filter(
            func.lower(User.role) == "admin"
        )
        .order_by(User.full_name.asc())
        .all()
    )

    admin_map = {
        str(admin.id): admin
        for admin in admins
    }

    return {
        "metrics": {
            "total_tickets": len(tickets),
            "open_tickets": sum(
                ticket.status == "open"
                for ticket in tickets
            ),
            "pending_tickets": sum(
                ticket.status in {
                    "pending",
                    "waiting_on_tenant",
                }
                for ticket in tickets
            ),
            "urgent_tickets": sum(
                ticket.priority == "urgent"
                and ticket.status not in {
                    "resolved",
                    "closed",
                }
                for ticket in tickets
            ),
            "resolved_tickets": sum(
                ticket.status in {
                    "resolved",
                    "closed",
                }
                for ticket in tickets
            ),
        },
        "tickets": [
            serialize_admin_support_ticket(
                ticket,
                company_map.get(ticket.company_id),
                admin_map,
            )
            for ticket in tickets
        ],
        "admins": [
            {
                "id": admin.id,
                "full_name": admin.full_name,
                "email": admin.email,
            }
            for admin in admins
        ],
    }


@router.post("/support/tickets/{ticket_id}/reply")
def admin_reply_to_support_ticket(
    ticket_id: str,
    payload: AdminSupportReplyRequest,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.id == ticket_id
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found.",
        )

    if ticket.status == "closed":
        raise HTTPException(
            status_code=400,
            detail="Reopen the ticket before replying.",
        )

    message = SupportMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket.id,
        sender_type="admin",
        sender_id=str(
            token.get("sub")
            or token.get("email")
            or ""
        ),
        message=payload.message.strip(),
    )

    try:
        db.add(message)

        if ticket.status == "open":
            ticket.status = "waiting_on_tenant"

        ticket.updated_at = datetime.datetime.utcnow()

        add_admin_support_activity(
            db,
            ticket=ticket,
            event_type="support_admin_replied",
            title="Firmic Support replied",
            description=(
                f"Firmic Support replied to: "
                f"{ticket.subject}."
            ),
            token=token,
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Support reply sent.",
            "ticket_id": ticket.id,
        }

    except Exception:
        db.rollback()
        raise


@router.patch("/support/tickets/{ticket_id}")
def update_admin_support_ticket(
    ticket_id: str,
    payload: AdminSupportUpdateRequest,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.id == ticket_id
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found.",
        )

    changes: dict[str, Any] = {}

    if payload.status is not None:
        normalized_status = payload.status.strip().lower()

        if normalized_status not in ADMIN_SUPPORT_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported support status.",
            )

        changes["previous_status"] = ticket.status
        changes["status"] = normalized_status
        ticket.status = normalized_status

        if normalized_status in {
            "resolved",
            "closed",
        }:
            ticket.resolved_at = (
                ticket.resolved_at
                or datetime.datetime.utcnow()
            )
        else:
            ticket.resolved_at = None

    if payload.priority is not None:
        normalized_priority = payload.priority.strip().lower()

        if normalized_priority not in ADMIN_SUPPORT_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported support priority.",
            )

        changes["previous_priority"] = ticket.priority
        changes["priority"] = normalized_priority
        ticket.priority = normalized_priority

    if payload.assigned_admin_id is not None:
        assigned_value = str(payload.assigned_admin_id).strip()

        if assigned_value:
            admin = (
                db.query(User)
                .filter(
                    User.id == int(assigned_value),
                    func.lower(User.role) == "admin",
                )
                .first()
            )

            if not admin:
                raise HTTPException(
                    status_code=404,
                    detail="Assigned Admin was not found.",
                )

            ticket.assigned_admin_id = str(admin.id)
            changes["assigned_admin_id"] = str(admin.id)
        else:
            ticket.assigned_admin_id = None
            changes["assigned_admin_id"] = None

    if not changes:
        return {
            "message": "No support ticket changes were supplied.",
            "ticket_id": ticket.id,
        }

    try:
        ticket.updated_at = datetime.datetime.utcnow()

        add_admin_support_activity(
            db,
            ticket=ticket,
            event_type="support_ticket_updated",
            title="Support ticket updated",
            description=(
                f"Firmic Admin updated: "
                f"{ticket.subject}."
            ),
            token=token,
            metadata=changes,
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Support ticket updated.",
            "ticket_id": ticket.id,
            "changes": changes,
        }

    except Exception:
        db.rollback()
        raise





# ------------------------------------------------------------------
# Hermes Compliance Queue — Launch Engine controlled
# ------------------------------------------------------------------

REQUIRED_COMPLIANCE_DOCUMENTS = [
    {
        "key": "passport",
        "label": "Passport Copy",
        "aliases": [
            "passport",
            "passport copy",
            "owner passport",
            "government id",
        ],
    },
    {
        "key": "proof_of_address",
        "label": "Proof of Address",
        "aliases": [
            "proof of address",
            "address proof",
            "utility bill",
            "bank statement",
            "tenancy contract",
        ],
    },
    {
        "key": "trade_license",
        "label": "Trade License",
        "aliases": [
            "trade license",
            "business license",
            "commercial license",
        ],
    },
    {
        "key": "certificate_of_incorporation",
        "label": "Company Formation Documents",
        "aliases": [
            "company formation",
            "formation documents",
            "incorporation certificate",
            "certificate of incorporation",
            "memorandum",
            "articles of association",
            "incorporation",
        ],
    },
    {
        "key": "beneficial_owner_declaration",
        "label": "Beneficial Owner Declaration",
        "aliases": [
            "beneficial owner",
            "beneficial owner declaration",
            "ubo",
            "ultimate beneficial owner",
            "ownership declaration",
        ],
    },
]


def _norm(value: Any) -> str:
    return " ".join(
        str(value or "")
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .split()
    )


def _document_matches(
    document: Document,
    requirement: dict[str, Any],
) -> bool:
    text_value = _norm(
        f"{document.name or ''} {document.type or ''}"
    )
    return any(
        _norm(alias) in text_value
        for alias in requirement["aliases"]
    )


def _serialize_document(
    document: Document,
) -> dict[str, Any]:
    return {
        "id": document.id,
        "company_id": document.company_id,
        "name": document.name,
        "type": document.type,
        "status": document.status,
        "file_path": document.file_path,
        "uploaded_at": (
            document.uploaded_at.isoformat()
            if document.uploaded_at
            else None
        ),
    }


def _synchronize_launch_operational_state(
    db: Session,
    company: Company,
    launch: CompanyLaunch,
) -> CompanyLaunch:
    """
    Reconcile Launch Engine foundation gates with authoritative live data.

    CompanyLaunch can become stale when a company reserves headquarters or
    activates a subscription through flows that predate the Launch Engine.
    Compliance approval must not fail simply because those mirrored flags
    were never updated.

    Sources of truth:
    - Company identity -> company profile completion
    - CompanySubscription -> subscription completion
    - Company headquarters assignment -> office reservation

    Compliance approval and infrastructure provisioning remain controlled by
    the Launch Engine and are NOT inferred here.
    """
    launch.company_profile_completed = bool(
        launch.company_profile_completed
        or (
            bool(company.name)
            and bool(company.user_id)
        )
    )

    subscription = (
        db.query(CompanySubscription)
        .filter(
            CompanySubscription.company_id
            == company.id
        )
        .first()
    )

    subscription_status = _norm(
        subscription.status
        if subscription
        else None
    )

    launch.subscription_completed = (
        subscription_status
        in {
            "active",
            "trial",
        }
    )

    launch.office_reserved = bool(
        company.headquarters_office_code
    )

    # Recalculate the derived launch state after the foundation gates have
    # been synchronized. This does not grant admin approval or provision
    # infrastructure; those remain explicit later steps.
    synchronize_launch_state(launch)

    return launch


def _get_company_launch(
    db: Session,
    company: Company,
) -> CompanyLaunch:
    launch = (
        db.query(CompanyLaunch)
        .filter(
            CompanyLaunch.company_id
            == company.id
        )
        .first()
    )

    if not launch:
        launch = ensure_company_launch(
            db,
            company,
            commit=False,
        )

    return _synchronize_launch_operational_state(
        db,
        company,
        launch,
    )


def _synchronize_document_requirements(
    launch: CompanyLaunch,
    documents: list[Document],
) -> None:
    """
    Mirror PostgreSQL document state into the Launch Engine.

    The Launch Engine remains the source of truth for company access.
    Document rows are evidence used to update its requirement fields.
    """
    for requirement in REQUIRED_COMPLIANCE_DOCUMENTS:
        matches = [
            document
            for document in documents
            if _document_matches(document, requirement)
        ]

        uploaded = bool(matches)
        approved = any(
            _norm(document.status)
            in {
                "approved",
                "verified",
                "complete",
                "completed",
            }
            for document in matches
        )

        update_launch_requirement(
            launch,
            requirement["key"],
            uploaded=uploaded,
            approved=approved,
        )

    synchronize_launch_state(launch)


def _build_compliance_item(
    company: Company,
    launch: CompanyLaunch,
    documents: list[Document],
    tasks: list[Task],
    workflows: list[Workflow],
) -> dict[str, Any]:
    _synchronize_document_requirements(
        launch,
        documents,
    )

    required: list[dict[str, Any]] = []

    for requirement in REQUIRED_COMPLIANCE_DOCUMENTS:
        matches = [
            document
            for document in documents
            if _document_matches(document, requirement)
        ]

        verified = next(
            (
                document
                for document in matches
                if _norm(document.status)
                in {
                    "approved",
                    "verified",
                    "complete",
                    "completed",
                }
            ),
            None,
        )

        uploaded = verified or (
            matches[0]
            if matches
            else None
        )

        state = (
            "verified"
            if verified
            else "uploaded"
            if uploaded
            else "missing"
        )

        required.append(
            {
                "key": requirement["key"],
                "label": requirement["label"],
                "state": state,
                "document": (
                    _serialize_document(uploaded)
                    if uploaded
                    else None
                ),
            }
        )

    uploaded_count = sum(
        item["state"] in {"uploaded", "verified"}
        for item in required
    )
    verified_count = sum(
        item["state"] == "verified"
        for item in required
    )
    missing = [
        item["label"]
        for item in required
        if item["state"] == "missing"
    ]

    pending_tasks = [
        task
        for task in tasks
        if _norm(task.status)
        not in {
            "completed",
            "complete",
            "done",
            "closed",
            "cancelled",
        }
    ]
    running_workflows = [
        workflow
        for workflow in workflows
        if _norm(workflow.status)
        not in {
            "completed",
            "complete",
            "closed",
            "cancelled",
        }
    ]

    launch_summary = get_launch_summary(launch)
    has_hq = bool(
        company.headquarters_office_code
        or launch.office_reserved
    )
    all_verified = (
        verified_count
        == len(REQUIRED_COMPLIANCE_DOCUMENTS)
    )

    if launch.status == "active":
        queue_status = "approved"
        priority = "low"
    elif missing or not has_hq:
        queue_status = "review_needed"
        priority = "high"
    elif not all_verified:
        queue_status = "pending_verification"
        priority = "medium"
    elif launch.admin_approved:
        queue_status = "provisioning"
        priority = "medium"
    else:
        queue_status = "ready"
        priority = "low"

    reasons: list[str] = []

    if launch.status == "active":
        reasons.append(
            "Compliance approved and company access unlocked."
        )
    else:
        if not has_hq:
            reasons.append(
                "Headquarters has not been reserved."
            )
        if missing:
            reasons.append(
                "Missing: "
                + ", ".join(missing)
                + "."
            )
        if uploaded_count and not all_verified:
            reasons.append(
                f"{uploaded_count - verified_count} uploaded "
                "document(s) await verification."
            )
        if all_verified and not launch.admin_approved:
            reasons.append(
                "All mandatory documents are verified. "
                "Final Firmic approval is ready."
            )
        if launch.admin_approved and launch.status != "active":
            reasons.append(
                "Compliance is approved and infrastructure "
                "provisioning is in progress."
            )

    readiness = int(
        round(
            float(
                launch_summary.get(
                    "progress_percent",
                    0,
                )
            )
        )
    )

    return {
        "company": serialize_company(company),
        "launch": launch_summary,
        "readiness_score": readiness,
        "queue_status": queue_status,
        "priority": priority,
        "documents": required,
        "document_count": len(documents),
        "required_document_count": len(
            REQUIRED_COMPLIANCE_DOCUMENTS
        ),
        "uploaded_required_count": uploaded_count,
        "verified_required_count": verified_count,
        "all_required_verified": all_verified,
        "admin_approved": bool(
            launch.admin_approved
        ),
        "platform_unlocked": (
            launch.status == "active"
        ),
        "missing_documents": missing,
        "pending_task_count": len(pending_tasks),
        "running_workflow_count": len(
            running_workflows
        ),
        "reasons": reasons,
    }


@router.get("/compliance")
def get_admin_compliance_queue(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = (
        db.query(Company)
        .filter(Company.status != "terminated")
        .order_by(Company.name.asc())
        .all()
    )
    ids = [
        company.id
        for company in companies
    ]

    documents = (
        db.query(Document)
        .filter(Document.company_id.in_(ids))
        .all()
        if ids
        else []
    )
    tasks = (
        db.query(Task)
        .filter(Task.company_id.in_(ids))
        .all()
        if ids
        else []
    )
    workflows = (
        db.query(Workflow)
        .filter(Workflow.company_id.in_(ids))
        .all()
        if ids
        else []
    )
    launches = (
        db.query(CompanyLaunch)
        .filter(CompanyLaunch.company_id.in_(ids))
        .all()
        if ids
        else []
    )

    docs_by: dict[str, list[Document]] = {}
    tasks_by: dict[str, list[Task]] = {}
    workflows_by: dict[str, list[Workflow]] = {}
    launches_by = {
        launch.company_id: launch
        for launch in launches
    }

    for item in documents:
        docs_by.setdefault(
            item.company_id,
            [],
        ).append(item)

    for item in tasks:
        tasks_by.setdefault(
            item.company_id,
            [],
        ).append(item)

    for item in workflows:
        workflows_by.setdefault(
            item.company_id,
            [],
        ).append(item)

    items: list[dict[str, Any]] = []

    try:
        for company in companies:
            launch = launches_by.get(
                company.id
            ) or _get_company_launch(
                db,
                company,
            )

            items.append(
                _build_compliance_item(
                    company,
                    launch,
                    docs_by.get(
                        company.id,
                        [],
                    ),
                    tasks_by.get(
                        company.id,
                        [],
                    ),
                    workflows_by.get(
                        company.id,
                        [],
                    ),
                )
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    order = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }
    items.sort(
        key=lambda item: (
            order.get(
                item["priority"],
                9,
            ),
            item["readiness_score"],
            item["company"]["name"].lower(),
        )
    )

    return {
        "metrics": {
            "queue_items": len(items),
            "high_priority": sum(
                item["priority"] == "high"
                for item in items
            ),
            "review_needed": sum(
                item["queue_status"]
                == "review_needed"
                for item in items
            ),
            "ready": sum(
                item["queue_status"]
                == "ready"
                for item in items
            ),
            "approved": sum(
                item["queue_status"]
                == "approved"
                for item in items
            ),
            "missing_documents": sum(
                len(item["missing_documents"])
                for item in items
            ),
        },
        "items": items,
    }


@router.get(
    "/compliance/company/{company_id}"
)
def get_admin_company_compliance(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    tasks = (
        db.query(Task)
        .filter(Task.company_id == company_id)
        .order_by(Task.created_at.desc())
        .all()
    )
    workflows = (
        db.query(Workflow)
        .filter(Workflow.company_id == company_id)
        .order_by(Workflow.created_at.desc())
        .all()
    )
    activity = (
        db.query(ActivityLog)
        .filter(ActivityLog.company_id == company_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(30)
        .all()
    )

    try:
        launch = _get_company_launch(
            db,
            company,
        )
        result = _build_compliance_item(
            company,
            launch,
            documents,
            tasks,
            workflows,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    result["activity"] = [
        {
            "id": event.id,
            "event_type": event.event_type,
            "title": event.title,
            "description": event.description,
            "actor_type": event.actor_type,
            "actor_id": event.actor_id,
            "created_at": (
                event.created_at.isoformat()
                if event.created_at
                else None
            ),
        }
        for event in activity
    ]

    return result


@router.post(
    "/compliance/company/{company_id}/request-documents"
)
def request_admin_compliance_documents(
    company_id: str,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Active company not found",
        )

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .all()
    )
    tasks = (
        db.query(Task)
        .filter(Task.company_id == company_id)
        .all()
    )
    workflows = (
        db.query(Workflow)
        .filter(Workflow.company_id == company_id)
        .all()
    )

    launch = _get_company_launch(
        db,
        company,
    )
    missing = _build_compliance_item(
        company,
        launch,
        documents,
        tasks,
        workflows,
    )["missing_documents"]

    if not missing:
        return {
            "message": (
                "No missing mandatory documents "
                "were found."
            ),
            "created_tasks": [],
            "missing_documents": [],
        }

    created_tasks: list[Task] = []

    try:
        for label in missing:
            title = f"Upload {label}"

            existing_open_request = (
                db.query(Task)
                .filter(
                    Task.company_id == company_id,
                    func.lower(Task.title)
                    == title.lower(),
                    func.lower(Task.status).notin_(
                        [
                            "completed",
                            "complete",
                            "done",
                            "closed",
                            "cancelled",
                        ]
                    ),
                )
                .first()
            )

            if existing_open_request:
                continue

            task = Task(
                id=str(uuid.uuid4()),
                company_id=company_id,
                title=title,
                description=(
                    "Hermes requires this document "
                    "before Firmic can approve and "
                    "unlock the company."
                ),
                status="pending",
            )
            db.add(task)
            created_tasks.append(task)

        created_labels = [
            task.title.replace(
                "Upload ",
                "",
                1,
            )
            for task in created_tasks
        ]

        if created_labels:
            db.add(
                ActivityLog(
                    id=str(uuid.uuid4()),
                    company_id=company_id,
                    event_type=(
                        "compliance_documents_requested"
                    ),
                    title=(
                        "Compliance documents requested"
                    ),
                    description=(
                        "Hermes requested: "
                        + ", ".join(created_labels)
                        + "."
                    ),
                    actor_type="admin",
                    actor_id=str(
                        token.get("sub")
                        or token.get("email")
                        or ""
                    ),
                    source_type="compliance_queue",
                    source_id=company_id,
                    event_metadata={
                        "missing_documents": (
                            created_labels
                        ),
                        "created_task_count": len(
                            created_tasks
                        ),
                    },
                )
            )

        db.commit()

        return {
            "message": (
                "Missing document requests "
                "were created."
                if created_tasks
                else (
                    "Matching document requests "
                    "are already open."
                )
            ),
            "created_tasks": [
                {
                    "id": task.id,
                    "title": task.title,
                    "status": task.status,
                }
                for task in created_tasks
            ],
            "missing_documents": missing,
        }

    except Exception:
        db.rollback()
        raise


@router.post(
    "/compliance/documents/{document_id}/verify"
)
def verify_admin_compliance_document(
    document_id: str,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    company = (
        db.query(Company)
        .filter(Company.id == document.company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    matching_requirement = next(
        (
            requirement
            for requirement
            in REQUIRED_COMPLIANCE_DOCUMENTS
            if _document_matches(
                document,
                requirement,
            )
        ),
        None,
    )

    if not matching_requirement:
        raise HTTPException(
            status_code=409,
            detail=(
                "This upload does not match a "
                "mandatory Launch Engine "
                "compliance requirement."
            ),
        )

    try:
        document.status = "approved"

        launch = _get_company_launch(
            db,
            company,
        )
        update_launch_requirement(
            launch,
            matching_requirement["key"],
            uploaded=True,
            approved=True,
        )

        event = ActivityLog(
            id=str(uuid.uuid4()),
            company_id=document.company_id,
            event_type=(
                "compliance_document_verified"
            ),
            title=f"{document.name} verified",
            description=(
                "Firmic Admin verified the "
                "uploaded compliance document. "
                "The Launch Engine requirement "
                "was approved."
            ),
            actor_type="admin",
            actor_id=str(
                token.get("sub")
                or token.get("email")
                or ""
            ),
            source_type="document",
            source_id=document.id,
            event_metadata={
                "document_name": document.name,
                "document_type": document.type,
                "requirement_key": (
                    matching_requirement["key"]
                ),
                "verified_status": "approved",
            },
        )

        db.add(launch)
        db.add(event)
        db.commit()
        db.refresh(document)

        return {
            "message": (
                "Document verified and Launch "
                "Engine requirement approved."
            ),
            "document": _serialize_document(
                document
            ),
            "launch": get_launch_summary(
                launch
            ),
            "activity_id": event.id,
        }

    except Exception:
        db.rollback()
        raise


@router.post(
    "/compliance/company/{company_id}/mark-reviewed"
)
def approve_admin_compliance_and_unlock(
    company_id: str,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Final Hermes approval.

    Every mandatory document must first be verified. Approval is then
    recorded in the Launch Engine, the MVP infrastructure bundle is
    provisioned, and tenant access is unlocked.
    """
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .all()
    )

    required_states: list[dict[str, Any]] = []

    for requirement in REQUIRED_COMPLIANCE_DOCUMENTS:
        matches = [
            document
            for document in documents
            if _document_matches(
                document,
                requirement,
            )
        ]
        approved = any(
            _norm(document.status)
            in {
                "approved",
                "verified",
                "complete",
                "completed",
            }
            for document in matches
        )
        required_states.append(
            {
                "key": requirement["key"],
                "label": requirement["label"],
                "approved": approved,
            }
        )

    unverified = [
        item["label"]
        for item in required_states
        if not item["approved"]
    ]

    if unverified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Verify every mandatory document "
                "before approving the company. "
                "Still required: "
                + ", ".join(unverified)
                + "."
            ),
        )

    reviewer_id = str(
        token.get("sub")
        or token.get("email")
        or ""
    )

    try:
        launch = _get_company_launch(
            db,
            company,
        )

        for item in required_states:
            update_launch_requirement(
                launch,
                item["key"],
                uploaded=True,
                approved=True,
            )

        review_company_launch(
            launch,
            approved=True,
            reviewer_id=reviewer_id,
        )

        # MVP activation bundle. This keeps the Launch Engine as the
        # single source of truth and unlocks the tenant only after the
        # compliance package has been fully accepted.
        update_provisioning(
            launch,
            headquarters_provisioned=True,
            mailbox_provisioned=True,
            voip_provisioned=True,
            ai_workforce_provisioned=True,
            workspace_provisioned=True,
        )
        set_office_status(
            launch,
            "active",
        )
        synchronize_launch_state(launch)

        if launch.status != "active":
            launch_summary = get_launch_summary(
                launch
            )

            next_step = (
                launch_summary.get("next_step")
                or "an incomplete launch requirement"
            )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Compliance was approved, but "
                    "the Launch Engine could not "
                    "activate the company. "
                    f"Remaining gate: {next_step}."
                ),
            )

        company.status = "active"

        event = ActivityLog(
            id=str(uuid.uuid4()),
            company_id=company_id,
            event_type=(
                "company_compliance_approved"
            ),
            title=(
                "Compliance approved — "
                "company unlocked"
            ),
            description=(
                "Hermes completed the compliance "
                "review. Firmic activated the "
                "company workspace and operating "
                "infrastructure."
            ),
            actor_type="admin",
            actor_id=reviewer_id,
            source_type="company_launch",
            source_id=launch.id,
            event_metadata={
                "launch_status": launch.status,
                "office_status": (
                    launch.office_status
                ),
                "platform_unlocked": True,
                "approved_at": (
                    launch.admin_approved_at.isoformat()
                    if launch.admin_approved_at
                    else None
                ),
            },
        )

        db.add(company)
        db.add(launch)
        db.add(event)
        db.commit()
        db.refresh(company)
        db.refresh(launch)

        return {
            "message": (
                "Compliance approved. The company "
                "platform is now unlocked."
            ),
            "company": serialize_company(
                company
            ),
            "launch": get_launch_summary(
                launch
            ),
            "platform_unlocked": True,
            "activity_id": event.id,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.get("/summary/{module_name}")
def admin_module_summary(
    module_name: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).all()
    offices = db.query(Office).all()

    supported = {
        "billing",
        "compliance",
        "support",
        "ai-workforce",
        "analytics",
        "users",
        "settings",
    }

    if module_name not in supported:
        raise HTTPException(
            status_code=404,
            detail="Admin module not found",
        )

    return {
        "module": module_name,
        "metrics": build_metrics(companies, offices),
        "companies": [
            serialize_company(company)
            for company in companies
        ],
        "message": (
            "Live platform foundation connected. "
            "No fictional operational records are shown."
        ),
    }



@router.post("/billing/backfill-activation-fees")
@router.post("/billing/backfill-hookup-fees", include_in_schema=False)
def backfill_company_activation_fees(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        result = synchronize_company_activation_fees(db)
        return {
            "message": "Company Activation Fee synchronization complete",
            **result,
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Activation fee synchronization failed: {str(error)}",
        ) from error


# ------------------------------------------------------------------
# Live Admin Billing — reads the same PostgreSQL Usage Ledger as Tenant
# ------------------------------------------------------------------


def serialize_admin_ledger_entry(entry: UsageLedger) -> dict[str, Any]:
    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "service": entry.service,
        "category": entry.category,
        "resource": entry.resource,
        "action": entry.action,
        "quantity": float(entry.quantity or 0),
        "unit": entry.unit,
        "unit_price": float(entry.unit_price or 0),
        "amount": float(entry.amount or 0),
        "currency": entry.currency,
        "tax_rate": float(entry.tax_rate or 0),
        "tax_amount": float(entry.tax_amount or 0),
        "total_amount": float(entry.total_amount or 0),
        "status": entry.status,
        "invoice_month": entry.invoice_month,
        "source_type": entry.source_type,
        "source_id": entry.source_id,
        "metadata": entry.entry_metadata,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


def build_admin_billing_summary(db: Session) -> dict[str, Any]:
    rows = (
        db.query(
            UsageLedger.status,
            func.count(UsageLedger.id).label("entries"),
            func.coalesce(func.sum(UsageLedger.amount), 0).label("subtotal"),
            func.coalesce(func.sum(UsageLedger.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(UsageLedger.total_amount), 0).label("total"),
        )
        .filter(UsageLedger.status != "void")
        .group_by(UsageLedger.status)
        .all()
    )

    by_status = {
        str(row.status or "unbilled"): {
            "entries": int(row.entries or 0),
            "subtotal": round(float(row.subtotal or 0), 2),
            "tax": round(float(row.tax or 0), 2),
            "total": round(float(row.total or 0), 2),
        }
        for row in rows
    }

    empty = {"entries": 0, "subtotal": 0.0, "tax": 0.0, "total": 0.0}
    billable_companies = (
        db.query(func.count(func.distinct(UsageLedger.company_id)))
        .filter(UsageLedger.status != "void")
        .scalar()
        or 0
    )

    return {
        "unbilled": by_status.get("unbilled", empty.copy()),
        "billed": by_status.get("billed", empty.copy()),
        "paid": by_status.get("paid", empty.copy()),
        "grand_total": round(sum(item["total"] for item in by_status.values()), 2),
        "billable_companies": int(billable_companies),
        "by_status": by_status,
    }


def build_admin_company_billing(db: Session) -> list[dict[str, Any]]:
    companies = db.query(Company).order_by(Company.name.asc()).all()
    rows = (
        db.query(
            UsageLedger.company_id,
            UsageLedger.status,
            func.count(UsageLedger.id).label("entries"),
            func.coalesce(func.sum(UsageLedger.amount), 0).label("subtotal"),
            func.coalesce(func.sum(UsageLedger.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(UsageLedger.total_amount), 0).label("total"),
        )
        .filter(UsageLedger.status != "void")
        .group_by(UsageLedger.company_id, UsageLedger.status)
        .all()
    )

    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        item = grouped.setdefault(str(row.company_id), {
            "entries": 0, "subtotal": 0.0, "tax": 0.0, "total": 0.0, "statuses": {}
        })
        status = str(row.status or "unbilled")
        item["entries"] += int(row.entries or 0)
        item["subtotal"] += float(row.subtotal or 0)
        item["tax"] += float(row.tax or 0)
        item["total"] += float(row.total or 0)
        item["statuses"][status] = round(float(row.total or 0), 2)

    result = []
    for company in companies:
        totals = grouped.get(company.id, {
            "entries": 0, "subtotal": 0.0, "tax": 0.0, "total": 0.0, "statuses": {}
        })
        statuses = totals["statuses"]
        payment_status = (
            "unbilled" if statuses.get("unbilled", 0) > 0
            else "billed" if statuses.get("billed", 0) > 0
            else "paid" if statuses.get("paid", 0) > 0
            else "no_charges"
        )
        result.append({
            "company": serialize_company(company),
            "entry_count": totals["entries"],
            "subtotal": round(totals["subtotal"], 2),
            "tax": round(totals["tax"], 2),
            "total": round(totals["total"], 2),
            "payment_status": payment_status,
            "status_totals": statuses,
        })

    result.sort(key=lambda item: (-item["total"], item["company"]["name"].lower()))
    return result


@router.get("/billing")
def get_live_admin_billing(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    synchronize_company_activation_fees(db)

    return {
        "summary": build_admin_billing_summary(db),
        "companies": build_admin_company_billing(db),
    }


@router.get("/billing/company/{company_id}")
def get_live_admin_company_billing(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    synchronize_company_activation_fees(db)

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    entries = (
        db.query(UsageLedger)
        .filter(UsageLedger.company_id == company_id, UsageLedger.status != "void")
        .order_by(UsageLedger.created_at.desc())
        .all()
    )

    service_rows = (
        db.query(
            UsageLedger.service,
            func.count(UsageLedger.id).label("entries"),
            func.coalesce(func.sum(UsageLedger.amount), 0).label("subtotal"),
            func.coalesce(func.sum(UsageLedger.tax_amount), 0).label("tax"),
            func.coalesce(func.sum(UsageLedger.total_amount), 0).label("total"),
        )
        .filter(UsageLedger.company_id == company_id, UsageLedger.status != "void")
        .group_by(UsageLedger.service)
        .all()
    )

    return {
        "company": serialize_company(company),
        "summary": {
            "entry_count": len(entries),
            "subtotal": round(sum(float(e.amount or 0) for e in entries), 2),
            "tax": round(sum(float(e.tax_amount or 0) for e in entries), 2),
            "total": round(sum(float(e.total_amount or 0) for e in entries), 2),
        },
        "services": [
            {
                "service": row.service,
                "entries": int(row.entries or 0),
                "subtotal": round(float(row.subtotal or 0), 2),
                "tax": round(float(row.tax or 0), 2),
                "total": round(float(row.total or 0), 2),
            }
            for row in service_rows
        ],
        "entries": [serialize_admin_ledger_entry(entry) for entry in entries],
    }


@router.post("/billing/company/{company_id}/mark-billed")
def mark_live_admin_company_billed(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not db.query(Company).filter(Company.id == company_id).first():
        raise HTTPException(status_code=404, detail="Company not found")

    entries = db.query(UsageLedger).filter(
        UsageLedger.company_id == company_id,
        UsageLedger.status == "unbilled",
    ).all()
    for entry in entries:
        entry.status = "billed"
    db.commit()
    return {"message": "Company usage marked as billed", "updated_entries": len(entries)}


@router.post("/billing/company/{company_id}/mark-paid")
def mark_live_admin_company_paid(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not db.query(Company).filter(Company.id == company_id).first():
        raise HTTPException(status_code=404, detail="Company not found")

    entries = db.query(UsageLedger).filter(
        UsageLedger.company_id == company_id,
        UsageLedger.status.in_(["unbilled", "billed"]),
    ).all()
    for entry in entries:
        entry.status = "paid"
    db.commit()
    return {"message": "Company usage marked as paid", "updated_entries": len(entries)}
