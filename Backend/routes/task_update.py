print('TASK UPDATE ROUTE LOADED')

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


@router.put("/{task_id}/status")
def update_task_status(
    task_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        return {"error": "Task not found"}

    task.status = status

    db.commit()

    return {
        "status": "updated",
        "task_id": task.id,
        "task_status": task.status
    }