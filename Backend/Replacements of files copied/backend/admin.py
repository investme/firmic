from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import Office
from models.company import Company
from models.usage_ledger import UsageLedger


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


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
