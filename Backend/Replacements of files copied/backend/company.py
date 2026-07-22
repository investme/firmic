from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.company import CompanyCreate
from models.company import Company
from firmic_models import Office
from services.workflow_engine import run_company_workflow
from auth import get_token_payload
import uuid
import threading

router = APIRouter()


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

    db.add(company)
    db.commit()
    db.refresh(company)

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
