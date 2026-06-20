from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models.company import Task
import uuid

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create")
def create_task(
    company_id: str,
    title: str,
    description: str = None,
    status: str = "pending",
    db: Session = Depends(get_db),
):
    task = Task(
        id=str(uuid.uuid4()),
        company_id=company_id,
        title=title,
        description=description,
        status=status,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "status": "created",
        "task": {
            "id": task.id,
            "company_id": task.company_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "created_at": task.created_at,
        },
    }


@router.get("/list")
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()

    return [
        {
            "id": t.id,
            "company_id": t.company_id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "created_at": t.created_at,
        }
        for t in tasks
    ]


@router.get("/company/{company_id}")
def list_company_tasks(company_id: str, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.company_id == company_id).all()

    return [
        {
            "id": t.id,
            "company_id": t.company_id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "created_at": t.created_at,
        }
        for t in tasks
    ]


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        return {"status": "not_found"}

    db.delete(task)
    db.commit()

    return {"status": "deleted", "task_id": task_id}