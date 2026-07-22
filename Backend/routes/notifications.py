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


def notification_type(activity):
    value = (
        f"{activity.event_type} "
        f"{activity.title} "
        f"{activity.description or ''} "
        f"{activity.source_type or ''}"
    ).lower()

    if any(x in value for x in [
        "approval",
        "approve",
        "pending",
    ]):
        return "pending"

    if any(x in value for x in [
        "warning",
        "expired",
        "reject",
        "failed",
        "error",
    ]):
        return "warning"

    if any(x in value for x in [
        "invoice",
        "payment",
        "billing",
    ]):
        return "info"

    if any(x in value for x in [
        "completed",
        "created",
        "success",
        "finished",
    ]):
        return "success"

    return "action_required"


@router.get("/company/{company_id}")
def get_company_notifications(
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
        .limit(100)
        .all()
    )

    notifications = []

    for activity in activities:
        item = serialize_activity(activity)

        notifications.append(
            {
                "id": item["id"],
                "type": notification_type(activity),
                "title": item["title"],
                "description": item["description"],
                "created_at": item["created_at"],
                "read": False,
            }
        )

    return {
        "company_id": company_id,
        "unread": len(notifications),
        "total_notifications": len(notifications),
        "notifications": notifications,
    }