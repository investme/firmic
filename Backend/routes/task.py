from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models.company import Company, Task
from schemas.task import TaskCreate
from auth import get_token_payload
import uuid

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


@router.post("/create")
def create_task(
    payload: TaskCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    verify_company_access(payload.company_id, user_id, db)

    task = Task(
        id=str(uuid.uuid4()),
        company_id=payload.company_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {"status": "created", "task": serialize_task(task)}


@router.get("/list")
def list_tasks(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    tasks = (
        db.query(Task)
        .join(Company, Task.company_id == Company.id)
        .filter(Company.user_id == str(user_id))
        .all()
    )

    return [serialize_task(t) for t in tasks]


@router.get("/company/{company_id}")
def list_company_tasks(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    verify_company_access(company_id, user_id, db)

    tasks = db.query(Task).filter(Task.company_id == company_id).all()

    return [serialize_task(t) for t in tasks]


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

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

    db.delete(task)
    db.commit()

    return {"status": "deleted", "task_id": task_id}


def serialize_task(t: Task):
    return {
        "id": t.id,
        "company_id": t.company_id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "created_at": t.created_at,
    }