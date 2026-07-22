from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import SessionLocal

from models.company import Company
from models.activity_log import ActivityLog

from services.activity_service import serialize_activity

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
):
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
            status_code=403,
            detail="Access denied",
        )

    return company


@router.get("/company/{company_id}")
def get_company_timeline(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    verify_company_access(
        company_id,
        str(user_id),
        db,
    )

    activities = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id,
        )
        .order_by(
            ActivityLog.created_at.desc()
        )
        .all()
    )

    return {
        "company_id": company_id,
        "total_events": len(activities),
        "events": [
            serialize_activity(activity)
            for activity in activities
        ],
    }