from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.company import Company, Document, Task
from auth import get_token_payload

from services.hermes import generate_compliance_report

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_company_access(company_id: str, user_id: str, db: Session):
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=403, detail="Access denied")

    return company


@router.get("/company/{company_id}")
def hermes_company_report(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    company = verify_company_access(company_id, user_id, db)

    documents = (
        db.query(Document)
        .filter(Document.company_id == company_id)
        .all()
    )

    tasks = (
        db.query(Task)
        .filter(Task.company_id == company_id)
        .all()
    )

    return generate_compliance_report(
        company,
        documents,
        tasks,
    )