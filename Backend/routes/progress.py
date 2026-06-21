from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from models.company import Task

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/company/{company_id}")
def company_progress(
    company_id: str,
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(
        Task.company_id == company_id
    ).all()

    total_tasks = len(tasks)

    completed_tasks = len(
        [t for t in tasks if t.status == "completed"]
    )

    progress = 0

    if total_tasks > 0:
        progress = round(
            (completed_tasks / total_tasks) * 100
        )

    return {
        "company_id": company_id,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "progress": progress,
    }