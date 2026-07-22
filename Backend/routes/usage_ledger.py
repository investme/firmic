from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.usage_ledger import UsageLedger
from schemas.usage_ledger import UsageLedgerCreate
from services.ledger_service import record_usage, serialize_usage


router = APIRouter(
    prefix="/api/ledger",
    tags=["Usage Ledger"],
)


def is_admin(token: dict) -> bool:
    role = str(token.get("role") or "").lower()
    email = str(token.get("email") or "").lower()
    return role == "admin" or email == "hussein@firmic.io"


def get_authorized_company(
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


@router.post("/entries")
def create_ledger_entry(
    payload: UsageLedgerCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = get_authorized_company(payload.company_id, token, db)

    if company.status == "terminated":
        raise HTTPException(
            status_code=400,
            detail="Cannot record usage for a terminated company",
        )

    entry = record_usage(
        db,
        company_id=company.id,
        service=payload.service,
        category=payload.category,
        resource=payload.resource,
        action=payload.action,
        quantity=payload.quantity,
        unit=payload.unit,
        unit_price=payload.unit_price,
        currency=payload.currency,
        tax_rate=payload.tax_rate,
        status=payload.status,
        invoice_month=payload.invoice_month,
        source_type=payload.source_type,
        source_id=payload.source_id,
        metadata=payload.metadata,
    )

    return serialize_usage(entry)


@router.get("/company/{company_id}")
def get_company_ledger(
    company_id: str,
    invoice_month: str | None = None,
    service: str | None = None,
    status: str | None = None,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    get_authorized_company(company_id, token, db)

    query = db.query(UsageLedger).filter(
        UsageLedger.company_id == company_id
    )

    if invoice_month:
        query = query.filter(UsageLedger.invoice_month == invoice_month)

    if service:
        query = query.filter(UsageLedger.service == service)

    if status:
        query = query.filter(UsageLedger.status == status)

    entries = query.order_by(UsageLedger.created_at.desc()).all()
    return [serialize_usage(entry) for entry in entries]


@router.get("/company/{company_id}/summary")
def get_company_ledger_summary(
    company_id: str,
    invoice_month: str | None = None,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    get_authorized_company(company_id, token, db)

    query = db.query(
        UsageLedger.service,
        UsageLedger.currency,
        func.sum(UsageLedger.amount).label("subtotal"),
        func.sum(UsageLedger.tax_amount).label("tax"),
        func.sum(UsageLedger.total_amount).label("total"),
        func.count(UsageLedger.id).label("entries"),
    ).filter(
        UsageLedger.company_id == company_id
    )

    if invoice_month:
        query = query.filter(UsageLedger.invoice_month == invoice_month)

    rows = query.group_by(
        UsageLedger.service,
        UsageLedger.currency,
    ).all()

    services = []
    subtotal = 0.0
    tax = 0.0
    total = 0.0

    for row in rows:
        row_subtotal = float(row.subtotal or 0)
        row_tax = float(row.tax or 0)
        row_total = float(row.total or 0)

        subtotal += row_subtotal
        tax += row_tax
        total += row_total

        services.append(
            {
                "service": row.service,
                "currency": row.currency,
                "subtotal": round(row_subtotal, 2),
                "tax": round(row_tax, 2),
                "total": round(row_total, 2),
                "entries": int(row.entries or 0),
            }
        )

    return {
        "company_id": company_id,
        "invoice_month": invoice_month,
        "subtotal": round(subtotal, 2),
        "tax": round(tax, 2),
        "total": round(total, 2),
        "services": services,
    }
