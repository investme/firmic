from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import SessionLocal
from models.company import Company, Task

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
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    task = (
        db.query(Task)
        .join(Company, Task.company_id == Company.id)
        .filter(
            Task.id == task_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status

    db.commit()

    return {
        "status": "updated",
        "task_id": task.id,
        "task_status": task.status
    }