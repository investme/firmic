from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.company import CompanyCreate
from models.company import Company
from services.workflow_engine import run_company_workflow
import uuid
import threading

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create")
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    company = Company(
        id=str(uuid.uuid4()),
        user_id=payload.user_id,
        name=payload.name,
        status="initiated",
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
        "company": {
            "id": company.id,
            "name": company.name,
            "user_id": company.user_id,
            "status": company.status,
        },
    }


@router.get("/list")
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).all()

    return [
        {
            "id": c.id,
            "name": c.name,
            "status": c.status,
        }
        for c in companies
    ]