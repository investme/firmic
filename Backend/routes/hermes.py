from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from routes import hermes


from database import SessionLocal
from models.company import (
    Company,
    Document,
    Task
)

from services.hermes import (
    generate_compliance_report
)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/company/{company_id}")
def hermes_company_report(
    company_id: str,
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(
        Company.id == company_id
    ).first()

    if not company:
        return {"error": "Company not found"}

    documents = db.query(Document).filter(
        Document.company_id == company_id
    ).all()

    tasks = db.query(Task).filter(
        Task.company_id == company_id
    ).all()

    return generate_compliance_report(
        company,
        documents,
        tasks
    )