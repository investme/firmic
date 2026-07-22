from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.company import CompanyCreate
from models.company import Company
from models.usage_ledger import UsageLedger
from firmic_models import Office
from services.workflow_engine import run_company_workflow
from services.ledger_service import record_usage
from auth import get_token_payload
import uuid
import threading

router = APIRouter()


HOOKUP_FEE_USD = 49.0


def ensure_hookup_fee(
    db: Session,
    company: Company,
    *,
    commit: bool = False,
) -> UsageLedger:
    """
    Create the one-time Firmic hookup fee exactly once per company.

    The lookup is deliberately independent of invoice month and payment
    status because this is a lifetime one-time charge, not a monthly charge.
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
        return existing

    return record_usage(
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
        commit=commit,
    )



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_company(company: Company):
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


@router.post("/create")
def create_company(
    payload: CompanyCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company_name = payload.name.strip()

    if not company_name:
        raise HTTPException(
            status_code=400,
            detail="Company name is required",
        )

    company = Company(
        id=str(uuid.uuid4()),
        user_id=str(user_id),
        name=company_name,
        status="initiated",
        headquarters_office_code=None,
        headquarters_location=None,
        headquarters_phone=None,
        headquarters_monthly_price_usd=None,
    )

    try:
        db.add(company)
        db.flush()

        ensure_hookup_fee(
            db,
            company,
            commit=False,
        )

        db.commit()
        db.refresh(company)
    except Exception:
        db.rollback()
        raise

    threading.Thread(
        target=run_company_workflow,
        args=(company,),
        daemon=True,
    ).start()

    return {
        "status": "created",
        "company": serialize_company(company),
    }


@router.get("/list")
def list_companies(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    companies = (
        db.query(Company)
        .filter(
            Company.user_id == str(user_id),
            Company.status != "terminated",
        )
        .order_by(Company.name.asc())
        .all()
    )

    return [serialize_company(company) for company in companies]


@router.get("/{company_id}")
def get_company(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return serialize_company(company)


@router.post("/{company_id}/terminate")
def terminate_company(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.status == "terminated":
        return {
            "message": "Company is already terminated",
            "company": serialize_company(company),
        }

    released_office_code = company.headquarters_office_code

    try:
        if released_office_code:
            office = (
                db.query(Office)
                .filter(Office.office_code == released_office_code)
                .first()
            )

            if office:
                office.status = "available"

        company.headquarters_office_code = None
        company.headquarters_location = None
        company.headquarters_phone = None
        company.headquarters_monthly_price_usd = None
        company.status = "terminated"

        db.commit()
        db.refresh(company)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Company terminated successfully",
        "released_office_code": released_office_code,
        "company": serialize_company(company),
    }
