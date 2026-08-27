from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from auth import get_token_payload
from database import SessionLocal
from models.company import Company, Workflow, WorkflowStep, Task
import uuid

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/create")
def create_workflow(
    company_id: str,
    name: str = "Company Onboarding",
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    workflow = Workflow(
        id=str(uuid.uuid4()),
        company_id=company_id,
        name=name,
        status="running",
    )

    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    default_steps = [
        "Upload trade license",
        "Upload passport copy",
        "Upload incorporation certificate",
        "Review company information",
        "Activate virtual office",
    ]

    created_steps = []

    for step_title in default_steps:
        step = WorkflowStep(
            id=str(uuid.uuid4()),
            workflow_id=workflow.id,
            title=step_title,
            status="pending",
        )

        task = Task(
            id=str(uuid.uuid4()),
            company_id=company_id,
            title=step_title,
            description=f"Auto-generated from workflow: {name}",
            status="pending",
        )

        db.add(step)
        db.add(task)

        created_steps.append({
            "id": step.id,
            "title": step.title,
            "status": step.status,
        })

    db.commit()

    return {
        "status": "created",
        "workflow": {
            "id": workflow.id,
            "company_id": workflow.company_id,
            "name": workflow.name,
            "status": workflow.status,
            "steps": created_steps,
        },
    }


@router.get("/company/{company_id}")
def list_company_workflows(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    workflows = db.query(Workflow).filter(
        Workflow.company_id == company.id
    ).all()

    return [
        {
            "id": workflow.id,
            "company_id": workflow.company_id,
            "name": workflow.name,
            "status": workflow.status,
            "created_at": workflow.created_at,
            "steps": [
                {
                    "id": step.id,
                    "title": step.title,
                    "status": step.status,
                }
                for step in workflow.steps
            ],
        }
        for workflow in workflows
    ]