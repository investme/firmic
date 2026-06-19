from models.company import Company
from database import SessionLocal

def update_company_status(company_id: str, new_status: str):
    db = SessionLocal()

    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        return None

    company.status = new_status

    db.commit()
    db.refresh(company)

    return company