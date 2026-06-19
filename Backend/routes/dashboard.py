from fastapi import APIRouter, Depends
from database import SessionLocal
from models.company import Company

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/company/{company_id}")
def get_company(company_id: str, db=Depends(get_db)):

    company = db.query(Company).filter(Company.id == company_id).first()

    return {
        "id": company.id,
        "name": company.name,
        "status": company.status,
        "country": company.country,
        "business_type": company.business_type
    }