from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.workforce_job import WorkforceJob
from services.workforce.orchestrator import (
    create_workforce_fanout_plan,
    create_workforce_job,
    serialize_job,
)
from services.workforce.registry import list_agents


router = APIRouter(
    prefix="/api/workforce",
    tags=["AI Workforce Orchestrator"],
)


class WorkforceExecuteRequest(BaseModel):
    company_id: str
    request_text: str = Field(min_length=1, max_length=10000)
    title: str | None = Field(default=None, max_length=255)
    preferred_agent: str | None = Field(default=None, max_length=80)
    source_type: str = Field(default="manual", max_length=80)
    source_id: str | None = None
    metadata: dict[str, Any] | None = None
    fanout: bool = False




def is_admin(token: dict) -> bool:
    return (
        str(token.get("role") or "").strip().lower() == "admin"
        or str(token.get("email") or "").strip().lower()
        == "hussein@firmic.io"
    )


def authorize_company(
    company_id: str,
    token: dict,
    db: Session,
) -> Company:
    query = db.query(Company).filter(Company.id == company_id)

    if not is_admin(token):
        user_id = token.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        query = query.filter(Company.user_id == str(user_id))

    company = query.first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


def require_active_company(
    company: Company,
) -> Company:
    if str(company.status or "").strip().lower() != "active":
        raise HTTPException(
            status_code=403,
            detail=(
                "AI Workforce execution is available only "
                "after the company platform is fully activated."
            ),
        )

    return company



def get_authorized_job(
    job_id: str,
    company_id: str,
    token: dict,
    db: Session,
) -> WorkforceJob:
    authorize_company(company_id, token, db)

    job = (
        db.query(WorkforceJob)
        .filter(
            WorkforceJob.id == job_id,
            WorkforceJob.company_id == company_id,
        )
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Workforce job not found")

    return job


@router.get("/registry")
def workforce_registry(
    token: dict = Depends(get_token_payload),
):
    return {
        "agents": list_agents(),
        "mvp_agents": ["Sonny", "Hermes", "Julia"],
    }


@router.post("/execute")
def execute_workforce_request(
    payload: WorkforceExecuteRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(payload.company_id, token, db)
    require_active_company(company)

    try:
        actor_id = str(
            token.get("sub")
            or token.get("email")
            or ""
        )

        if payload.fanout:
            result = create_workforce_fanout_plan(
                db,
                company=company,
                request_text=payload.request_text,
                preferred_agent=payload.preferred_agent,
                actor_id=actor_id,
                source_type=payload.source_type,
                source_id=payload.source_id,
                metadata={
                    **(payload.metadata or {}),
                    **(
                        {"title": payload.title}
                        if payload.title
                        else {}
                    ),
                },
            )

            return {
                "mode": "fanout",
                "orchestration_run_id": (
                    result["orchestration"].id
                ),
                "jobs": [
                    serialize_job(item["job"])
                    for item in result["created"]
                ],
                "unavailable": (
                    result["unavailable"]
                ),
                "dispatch_targets": (
                    result["dispatch_targets"]
                ),
            }

        job = create_workforce_job(
            db,
            company=company,
            request_text=payload.request_text,
            title=payload.title,
            preferred_agent=payload.preferred_agent,
            actor_id=actor_id,
            source_type=payload.source_type,
            source_id=payload.source_id,
            metadata=payload.metadata,
        )

        return serialize_job(job)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@router.get("/company/{company_id}")
def list_company_workforce_jobs(
    company_id: str,
    limit: int = Query(default=30, ge=1, le=100),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    authorize_company(company_id, token, db)

    jobs = (
        db.query(WorkforceJob)
        .filter(WorkforceJob.company_id == company_id)
        .order_by(WorkforceJob.created_at.desc())
        .limit(limit)
        .all()
    )

    serialized = [serialize_job(job) for job in jobs]

    active = [
        job
        for job in serialized
        if job["status"] in {"pending", "accepted", "working"}
    ]
    completed = [
        job
        for job in serialized
        if job["status"] == "completed"
    ]
    failed = [
        job
        for job in serialized
        if job["status"] == "failed"
    ]

    agent_states: dict[str, dict[str, Any]] = {}

    for job in serialized:
        name = job["assigned_agent"]
        if name not in agent_states:
            agent_states[name] = {
                "agent_name": name,
                "role": job["assigned_role"],
                "status": "idle",
                "current_job": None,
                "progress": 0,
                "last_update": job["updated_at"],
            }

        if job["status"] in {"pending", "accepted", "working"}:
            agent_states[name].update(
                {
                    "status": (
                        "working"
                        if job["status"] == "working"
                        else "accepted"
                    ),
                    "current_job": job["title"],
                    "progress": job["progress"],
                    "last_update": job["updated_at"],
                }
            )

    return {
        "summary": {
            "total": len(serialized),
            "active": len(active),
            "completed": len(completed),
            "failed": len(failed),
        },
        "agents": list(agent_states.values()),
        "jobs": serialized,
    }


@router.get("/jobs/{job_id}")
def get_workforce_job(
    job_id: str,
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    job = get_authorized_job(
        job_id,
        company_id,
        token,
        db,
    )
    return serialize_job(job)
