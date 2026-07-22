from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import SessionLocal
from models.company import Company
from services.executive_intelligence.executive_engine import (
    generate_executive_intelligence,
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{company_id}")
def get_executive_intelligence(
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
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    return generate_executive_intelligence(
    db=db,
    company=company,
    )