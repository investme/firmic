from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import Office
from models.company import Company


router = APIRouter(
    prefix="/api/offices",
    tags=["Offices"],
)


class RentOfficeRequest(BaseModel):
    office_code: str
    company_id: str


class ReleaseOfficeRequest(BaseModel):
    company_id: str


def serialize_office(office: Office):
    return {
        "id": office.id,
        "office_code": office.office_code,
        "location": office.location,
        "status": office.status,
        "monthly_price_usd": office.monthly_price_usd,
    }


def serialize_headquarters(
    company: Company,
    office: Office | None = None,
):
    if not company.headquarters_office_code:
        return None

    return {
        "office_id": office.id if office else None,
        "office_code": company.headquarters_office_code,
        "office_name": "Premium Hub71 Virtual Headquarters",
        "location": company.headquarters_location,
        "phone": company.headquarters_phone,
        "mailbox": True,
        "status": "Active",
        "monthly_price_usd": company.headquarters_monthly_price_usd,
    }


@router.get("")
def get_offices(
    db: Session = Depends(get_db),
):
    offices = (
        db.query(Office)
        .order_by(Office.office_code.asc())
        .all()
    )

    if not offices:
        for number in range(1, 1001):
            db.add(
                Office(
                    office_code=f"A{number:03d}",
                    location=(
                        "Hub71, Abu Dhabi, "
                        "United Arab Emirates"
                    ),
                    status="available",
                    monthly_price_usd=99.0,
                )
            )

        db.commit()

        offices = (
            db.query(Office)
            .order_by(Office.office_code.asc())
            .all()
        )

    return [
        serialize_office(office)
        for office in offices
    ]


@router.post("/rent")
def rent_office(
    payload: RentOfficeRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    company = (
        db.query(Company)
        .filter(
            Company.id == payload.company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    if company.status == "terminated":
        raise HTTPException(
            status_code=400,
            detail=(
                "A terminated company cannot rent "
                "a headquarters"
            ),
        )

    if company.headquarters_office_code:
        raise HTTPException(
            status_code=400,
            detail=(
                "This company already has an "
                "active headquarters"
            ),
        )

    office = (
        db.query(Office)
        .filter(
            Office.office_code
            == payload.office_code.strip()
        )
        .first()
    )

    if not office:
        raise HTTPException(
            status_code=404,
            detail="Office not found",
        )

    if office.status != "available":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Office is not available. "
                f"Current status: {office.status}"
            ),
        )

    try:
        office.status = "rented"

        company.headquarters_office_code = office.office_code
        company.headquarters_location = office.location
        company.headquarters_phone = "+971 2 XXX 047"
        company.headquarters_monthly_price_usd = (
            office.monthly_price_usd or 99.0
        )
        company.status = "active"

        db.commit()
        db.refresh(office)
        db.refresh(company)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Office rented successfully",
        "company_id": company.id,
        "company_status": company.status,
        "headquarters": serialize_headquarters(
            company,
            office,
        ),
        "office": serialize_office(office),
    }


@router.post("/release")
def release_office(
    payload: ReleaseOfficeRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    company = (
        db.query(Company)
        .filter(
            Company.id == payload.company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    if not company.headquarters_office_code:
        raise HTTPException(
            status_code=400,
            detail=(
                "This company has no active "
                "headquarters"
            ),
        )

    office = (
        db.query(Office)
        .filter(
            Office.office_code
            == company.headquarters_office_code
        )
        .first()
    )

    released_code = company.headquarters_office_code

    try:
        if office:
            office.status = "available"

        company.headquarters_office_code = None
        company.headquarters_location = None
        company.headquarters_phone = None
        company.headquarters_monthly_price_usd = None

        if company.status != "terminated":
            company.status = "initiated"

        db.commit()

        if office:
            db.refresh(office)

        db.refresh(company)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Headquarters released successfully",
        "company_id": company.id,
        "company_status": company.status,
        "released_office_code": released_code,
        "headquarters": None,
        "office": (
            serialize_office(office)
            if office
            else None
        ),
    }
