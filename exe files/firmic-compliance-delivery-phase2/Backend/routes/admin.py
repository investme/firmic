from __future__ import annotations

from typing import Any
import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import Office, User
from models.company import Company, Document, Task, Workflow
from models.company_ai_agent import CompanyAIAgent
from models.activity_log import ActivityLog
from models.usage_ledger import UsageLedger
from services.ledger_service import record_usage


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


HOOKUP_FEE_USD = 49.0


def ensure_company_hookup_fee(
    db: Session,
    company: Company,
) -> tuple[UsageLedger, bool]:
    """
    Return the company's one-time hookup fee and whether it was created.

    This check is lifetime-scoped and therefore does not depend on invoice
    month or current payment status.
    """
    existing = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id == company.id,
            UsageLedger.service == "firmic_setup",
            UsageLedger.category == "one_time",
            UsageLedger.action == "hookup_fee",
            UsageLedger.source_type == "company",
            UsageLedger.source_id == company.id,
            UsageLedger.status != "void",
        )
        .first()
    )

    if existing:
        return existing, False

    entry = record_usage(
        db,
        company_id=company.id,
        service="firmic_setup",
        category="one_time",
        resource="Firmic Hookup Fee",
        action="hookup_fee",
        quantity=1,
        unit="company_setup",
        unit_price=HOOKUP_FEE_USD,
        currency="USD",
        tax_rate=0.0,
        status="unbilled",
        source_type="company",
        source_id=company.id,
        metadata={
            "company_name": company.name,
            "charge_type": "one_time",
            "description": "Firmic company onboarding and infrastructure hookup fee",
        },
        commit=False,
    )

    return entry, True




def synchronize_missing_hookup_fees(
    db: Session,
) -> dict[str, int]:
    """
    Ensure every non-terminated company has exactly one lifetime setup fee.
    Existing paid/billed/unbilled fees are recognized and never duplicated.
    """
    companies = (
        db.query(Company)
        .filter(Company.status != "terminated")
        .order_by(Company.name.asc())
        .all()
    )

    created_count = 0
    existing_count = 0

    for company in companies:
        _, was_created = ensure_company_hookup_fee(db, company)
        if was_created:
            created_count += 1
        else:
            existing_count += 1

    if created_count:
        db.commit()

    return {
        "created_count": created_count,
        "already_present_count": existing_count,
    }


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
    engine = db.get_bind()
    inspector = inspect(engine)
    deleted_from: list[str] = []

    for table_name in inspector.get_table_names():
        if table_name == "companies":
            continue

        for foreign_key in inspector.get_foreign_keys(
            table_name
        ):
            referred_table = foreign_key.get(
                "referred_table"
            )

            referred_columns = foreign_key.get(
                "referred_columns"
            ) or []

            constrained_columns = foreign_key.get(
                "constrained_columns"
            ) or []

            references_company_id = (
                referred_table == "companies"
                and "id" in referred_columns
                and len(constrained_columns) == 1
            )

            if not references_company_id:
                continue

            column_name = constrained_columns[0]

            db.execute(
                text(
                    f'DELETE FROM "{table_name}" '
                    f'WHERE "{column_name}" = :company_id'
                ),
                {"company_id": company_id},
            )

            deleted_from.append(table_name)
            break

    return deleted_from


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


@router.get("/users")
def get_admin_users(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    companies = db.query(Company).all()

    company_counts: dict[str, int] = {}
    for company in companies:
        key = str(company.user_id)
        company_counts[key] = company_counts.get(key, 0) + 1

    serialized = [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role or "owner",
            "companies_owned": company_counts.get(str(user.id), 0),
            "created_at": (
                user.created_at.isoformat()
                if user.created_at
                else None
            ),
        }
        for user in users
    ]

    return {
        "metrics": {
            "total_users": len(users),
            "admin_users": sum(
                str(user.role or "").lower() == "admin"
                for user in users
            ),
            "tenant_users": sum(
                str(user.role or "").lower() != "admin"
                for user in users
            ),
            "users_with_companies": sum(
                company_counts.get(str(user.id), 0) > 0
                for user in users
            ),
        },
        "users": serialized,
    }


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
            "hookup_fee_usd": HOOKUP_FEE_USD,
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
    synchronize_missing_hookup_fees(db)

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


@router.get("/support")
def get_admin_support(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    companies = (
        db.query(Company)
        .filter(Company.status != "terminated")
        .order_by(Company.name.asc())
        .all()
    )

    return {
        "metrics": {
            "open_tickets": 0,
            "pending_tickets": 0,
            "resolved_tickets": 0,
            "companies_available": len(companies),
        },
        "tickets": [],
        "companies": [
            {
                "id": company.id,
                "name": company.name,
                "status": company.status,
                "headquarters": company.headquarters_office_code,
            }
            for company in companies
        ],
        "message": (
            "The support ticket data model has not been created yet. "
            "This page intentionally shows an empty operational state."
        ),
    }



# ------------------------------------------------------------------
# Live Hermes Compliance Queue
# ------------------------------------------------------------------

REQUIRED_COMPLIANCE_DOCUMENTS = [
    {"key": "trade_license", "label": "Trade License",
     "aliases": ["trade license", "business license", "commercial license"]},
    {"key": "passport", "label": "Passport Copy",
     "aliases": ["passport", "passport copy", "owner passport"]},
    {"key": "incorporation_certificate", "label": "Incorporation Certificate",
     "aliases": ["incorporation certificate", "certificate of incorporation", "incorporation"]},
    {"key": "proof_of_address", "label": "Proof of Address",
     "aliases": ["proof of address", "address proof", "utility bill"]},
]


def _norm(value: Any) -> str:
    return " ".join(str(value or "").lower().replace("_", " ").replace("-", " ").split())


def _document_matches(document: Document, requirement: dict[str, Any]) -> bool:
    text_value = _norm(f"{document.name or ''} {document.type or ''}")
    return any(_norm(alias) in text_value for alias in requirement["aliases"])


def _serialize_document(document: Document) -> dict[str, Any]:
    return {
        "id": document.id,
        "company_id": document.company_id,
        "name": document.name,
        "type": document.type,
        "status": document.status,
        "file_path": document.file_path,
        "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
    }


def _build_compliance_item(
    company: Company,
    documents: list[Document],
    tasks: list[Task],
    workflows: list[Workflow],
) -> dict[str, Any]:
    required = []

    for requirement in REQUIRED_COMPLIANCE_DOCUMENTS:
        matches = [d for d in documents if _document_matches(d, requirement)]
        verified = next(
            (d for d in matches if _norm(d.status) in {"approved", "verified", "complete", "completed"}),
            None,
        )
        uploaded = verified or (matches[0] if matches else None)
        state = "verified" if verified else "uploaded" if uploaded else "missing"

        required.append({
            "key": requirement["key"],
            "label": requirement["label"],
            "state": state,
            "document": _serialize_document(uploaded) if uploaded else None,
        })

    uploaded_count = sum(item["state"] in {"uploaded", "verified"} for item in required)
    verified_count = sum(item["state"] == "verified" for item in required)
    missing = [item["label"] for item in required if item["state"] == "missing"]

    pending_tasks = [
        task for task in tasks
        if _norm(task.status) not in {"completed", "complete", "done", "closed"}
    ]
    running_workflows = [
        workflow for workflow in workflows
        if _norm(workflow.status) not in {"completed", "complete", "closed", "cancelled"}
    ]
    has_hq = bool(company.headquarters_office_code)

    readiness = min(
        100,
        round(uploaded_count / len(REQUIRED_COMPLIANCE_DOCUMENTS) * 70)
        + (15 if has_hq else 0)
        + (10 if not pending_tasks else 0)
        + (5 if not running_workflows else 0),
    )

    if missing or not has_hq:
        queue_status = "review_needed"
    elif verified_count < len(REQUIRED_COMPLIANCE_DOCUMENTS):
        queue_status = "pending_verification"
    elif pending_tasks or running_workflows:
        queue_status = "in_progress"
    else:
        queue_status = "ready"

    if not has_hq or len(missing) >= 2:
        priority = "high"
    elif missing or pending_tasks or running_workflows:
        priority = "medium"
    else:
        priority = "low"

    reasons = []
    if not has_hq:
        reasons.append("Headquarters has not been activated.")
    if missing:
        reasons.append("Missing: " + ", ".join(missing) + ".")
    if pending_tasks:
        reasons.append(f"{len(pending_tasks)} onboarding task(s) remain open.")
    if running_workflows:
        reasons.append(f"{len(running_workflows)} workflow(s) are still running.")
    if not reasons:
        reasons.append("All currently tracked compliance requirements are ready.")

    return {
        "company": serialize_company(company),
        "readiness_score": readiness,
        "queue_status": queue_status,
        "priority": priority,
        "documents": required,
        "document_count": len(documents),
        "required_document_count": len(REQUIRED_COMPLIANCE_DOCUMENTS),
        "uploaded_required_count": uploaded_count,
        "verified_required_count": verified_count,
        "missing_documents": missing,
        "pending_task_count": len(pending_tasks),
        "running_workflow_count": len(running_workflows),
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
    ids = [company.id for company in companies]

    documents = db.query(Document).filter(Document.company_id.in_(ids)).all() if ids else []
    tasks = db.query(Task).filter(Task.company_id.in_(ids)).all() if ids else []
    workflows = db.query(Workflow).filter(Workflow.company_id.in_(ids)).all() if ids else []

    docs_by, tasks_by, workflows_by = {}, {}, {}
    for item in documents:
        docs_by.setdefault(item.company_id, []).append(item)
    for item in tasks:
        tasks_by.setdefault(item.company_id, []).append(item)
    for item in workflows:
        workflows_by.setdefault(item.company_id, []).append(item)

    items = [
        _build_compliance_item(
            company,
            docs_by.get(company.id, []),
            tasks_by.get(company.id, []),
            workflows_by.get(company.id, []),
        )
        for company in companies
    ]

    order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda item: (
        order.get(item["priority"], 9),
        item["readiness_score"],
        item["company"]["name"].lower(),
    ))

    return {
        "metrics": {
            "queue_items": len(items),
            "high_priority": sum(item["priority"] == "high" for item in items),
            "review_needed": sum(item["queue_status"] == "review_needed" for item in items),
            "ready": sum(item["queue_status"] == "ready" for item in items),
            "missing_documents": sum(len(item["missing_documents"]) for item in items),
        },
        "items": items,
    }


@router.get("/compliance/company/{company_id}")
def get_admin_company_compliance(
    company_id: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    documents = db.query(Document).filter(Document.company_id == company_id).order_by(Document.uploaded_at.desc()).all()
    tasks = db.query(Task).filter(Task.company_id == company_id).order_by(Task.created_at.desc()).all()
    workflows = db.query(Workflow).filter(Workflow.company_id == company_id).order_by(Workflow.created_at.desc()).all()
    activity = (
        db.query(ActivityLog)
        .filter(ActivityLog.company_id == company_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(30)
        .all()
    )

    result = _build_compliance_item(company, documents, tasks, workflows)
    result["activity"] = [{
        "id": event.id,
        "event_type": event.event_type,
        "title": event.title,
        "description": event.description,
        "actor_type": event.actor_type,
        "actor_id": event.actor_id,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    } for event in activity]
    return result


@router.post("/compliance/company/{company_id}/request-documents")
def request_admin_compliance_documents(
    company_id: str,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.status != "terminated")
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Active company not found")

    documents = db.query(Document).filter(Document.company_id == company_id).all()
    tasks = db.query(Task).filter(Task.company_id == company_id).all()
    workflows = db.query(Workflow).filter(Workflow.company_id == company_id).all()
    missing = _build_compliance_item(company, documents, tasks, workflows)["missing_documents"]

    if not missing:
        return {"message": "No missing required documents were found.", "created_tasks": []}

    created = []
    try:
        for label in missing:
            title = f"Upload {label}"
            existing = (
                db.query(Task)
                .filter(
                    Task.company_id == company_id,
                    func.lower(Task.title) == title.lower(),
                    Task.status != "completed",
                )
                .first()
            )
            if existing:
                continue

            task = Task(
                id=str(uuid.uuid4()),
                company_id=company_id,
                title=title,
                description="Requested by Firmic Admin from the Hermes Compliance Queue.",
                status="pending",
            )
            db.add(task)
            created.append(task)

        db.add(ActivityLog(
            id=str(uuid.uuid4()),
            company_id=company_id,
            event_type="compliance_documents_requested",
            title="Compliance documents requested",
            description="Firmic Admin requested: " + ", ".join(missing) + ".",
            actor_type="admin",
            actor_id=str(token.get("sub") or token.get("email") or ""),
            source_type="compliance_queue",
            source_id=company_id,
            event_metadata={"missing_documents": missing, "created_task_count": len(created)},
        ))
        db.commit()

        return {
            "message": "Missing document requests were created.",
            "created_tasks": [{"id": task.id, "title": task.title, "status": task.status} for task in created],
        }
    except Exception:
        db.rollback()
        raise




@router.post(
    "/compliance/documents/{document_id}/verify"
)
def verify_admin_compliance_document(
    document_id: str,
    _: dict = Depends(require_admin),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    company = (
        db.query(Company)
        .filter(
            Company.id == document.company_id
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    try:
        document.status = "approved"

        event = ActivityLog(
            id=str(uuid.uuid4()),
            company_id=document.company_id,
            event_type="compliance_document_verified",
            title=f"{document.name} verified",
            description=(
                "Firmic Admin verified the uploaded compliance document."
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
                "verified_status": "approved",
            },
        )

        db.add(event)
        db.commit()
        db.refresh(document)

        return {
            "message": "Document verified successfully.",
            "document": _serialize_document(document),
            "activity_id": event.id,
        }

    except Exception:
        db.rollback()
        raise


@router.post("/compliance/company/{company_id}/mark-reviewed")
def mark_admin_compliance_reviewed(
    company_id: str,
    token: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    event = ActivityLog(
        id=str(uuid.uuid4()),
        company_id=company_id,
        event_type="compliance_reviewed",
        title="Compliance review completed",
        description="Firmic Admin reviewed the live Hermes compliance record.",
        actor_type="admin",
        actor_id=str(token.get("sub") or token.get("email") or ""),
        source_type="compliance_queue",
        source_id=company_id,
        event_metadata={"reviewed_at": datetime.datetime.utcnow().isoformat()},
    )
    db.add(event)
    db.commit()
    return {"message": "Compliance review recorded.", "activity_id": event.id}



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



@router.post("/billing/backfill-hookup-fees")
def backfill_missing_hookup_fees(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        result = synchronize_missing_hookup_fees(db)
        return {
            "message": "Hookup fee synchronization complete",
            **result,
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Hookup fee synchronization failed: {str(error)}",
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
    synchronize_missing_hookup_fees(db)

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
    synchronize_missing_hookup_fees(db)

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
