from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from models.company import Company, Document, Task

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/company/{company_id}")
def sonny_company_brief(company_id: str, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()

    if not company:
        return {"error": "Company not found"}

    documents = db.query(Document).filter(Document.company_id == company_id).all()
    tasks = db.query(Task).filter(Task.company_id == company_id).all()

    pending_tasks = [t for t in tasks if t.status == "pending"]
    completed_tasks = [t for t in tasks if t.status == "completed"]

    alerts = []
    recommendations = []

    if len(documents) == 0:
        alerts.append("No documents uploaded for this virtual office.")
        recommendations.append("Upload the company trade license or incorporation document.")

    if len(pending_tasks) > 0:
        alerts.append(f"{len(pending_tasks)} task(s) are still pending.")
        recommendations.append("Review and complete pending onboarding tasks.")

    if len(tasks) == 0:
        recommendations.append("Create onboarding tasks for this company.")

    progress = 0

    if len(tasks) > 0:
        progress = round((len(completed_tasks) / len(tasks)) * 100)

    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "status": company.status,
        },
        "summary": {
            "documents": len(documents),
            "tasks": len(tasks),
            "pending_tasks": len(pending_tasks),
            "completed_tasks": len(completed_tasks),
            "progress": progress,
        },
        "alerts": alerts,
        "recommendations": recommendations,
    }