from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from schemas.company import CompanyCreate
from models.company import Company
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


@router.post("/create")
def create_company(
    payload: CompanyCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    company = Company(
        id=str(uuid.uuid4()),
        user_id=str(user_id),
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
def list_companies(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    companies = (
        db.query(Company)
        .filter(Company.user_id == str(user_id))
        .all()
    )

    return [
        {
            "id": c.id,
            "name": c.name,
            "status": c.status,
        }
        for c in companies
    ]