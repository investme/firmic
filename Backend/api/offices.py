from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from firmic_models import Office

router = APIRouter(prefix="/api/offices", tags=["Offices"])


class RentOfficeRequest(BaseModel):
    office_code: str


@router.get("")
def get_offices(db: Session = Depends(get_db)):
    offices = db.query(Office).order_by(Office.office_code.asc()).all()

    if not offices:
        for i in range(1, 1001):
            code = f"A{i:03d}"

            db.add(
                Office(
                    office_code=code,
                    location="Business Bay, Dubai, UAE",
                    status="available",
                    monthly_price_usd=99.0,
                )
            )

        db.commit()

        offices = db.query(Office).order_by(Office.office_code.asc()).all()

    return offices


@router.post("/rent")
def rent_office(payload: RentOfficeRequest, db: Session = Depends(get_db)):
    office = (
        db.query(Office)
        .filter(Office.office_code == payload.office_code)
        .first()
    )

    if not office:
        raise HTTPException(status_code=404, detail="Office not found")

    if office.status == "rented":
        raise HTTPException(status_code=400, detail="Office already rented")

    office.status = "rented"

    db.commit()
    db.refresh(office)

    return {
        "message": "Office rented successfully",
        "office": office,
    }