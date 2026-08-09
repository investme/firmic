from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import User
from models.company import Company
from models.launch import CompanyLaunch
from services.intelligence.engine import (
    create_or_update_handoff,
    observe_memory,
    record_learning_event,
    serialize_handoff,
)
from services.intelligence.personas import (
    get_voice_profile,
    hermes_spoken_message,
)
from services.launch_service import ensure_company_launch, get_launch_summary

router = APIRouter()


def verify_company_access(company_id: str, user_id: str, db: Session) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.status != "terminated")
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        uid = int(str(user_id))
    except (TypeError, ValueError):
        uid = None

    user = db.query(User).filter(User.id == uid).first() if uid is not None else None
    is_owner = str(company.user_id) == str(user_id)
    is_admin = bool(user and str(getattr(user, "role", "") or "").strip().lower() == "admin")

    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Company access denied.")
    return company


def compliance_document_state(launch_summary: dict) -> dict:
    requirements = [
        item
        for item in (launch_summary.get("requirements") or [])
        if item.get("required")
        and item.get("category") in {"company_documents", "kyc"}
    ]
    missing = [
        item for item in requirements
        if not (item.get("uploaded") or item.get("approved"))
    ]
    waiting = [
        item for item in requirements
        if item.get("uploaded") and not item.get("approved")
    ]
    verified = [item for item in requirements if item.get("approved")]

    return {
        "required_count": len(requirements),
        "verified_count": len(verified),
        "missing_documents": [i.get("label") or i.get("key") for i in missing],
        "awaiting_verification": [i.get("label") or i.get("key") for i in waiting],
        "requirements": requirements,
    }


@router.get("/company/{company_id}")
def hermes_company_report(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(company_id, str(token.get("sub") or ""), db)

    launch = (
        db.query(CompanyLaunch)
        .filter(CompanyLaunch.company_id == company.id)
        .first()
    )
    if not launch:
        launch = ensure_company_launch(db, company, commit=True)

    launch_summary = get_launch_summary(launch)
    documents = compliance_document_state(launch_summary)

    platform_active = (
        str(company.status or "").lower() == "active"
        and str(launch_summary.get("status") or "").lower() == "active"
    )

    memory = observe_memory(
        db,
        company_id=company.id,
        agent_scope="shared",
        memory_type="authoritative_compliance_state",
        memory_key="current_compliance_state",
        title="Authoritative compliance state",
        content=(
            f"Launch status: {launch_summary.get('status')}. "
            f"Verified: {documents['verified_count']}/{documents['required_count']}. "
            f"Missing: {', '.join(documents['missing_documents']) or 'none'}."
        ),
        source_agent="hermes",
        source_type="launch_engine",
        source_id=launch.id,
        provenance={
            "launch_status": launch_summary.get("status"),
            "office_status": launch_summary.get("office_status"),
            "compliance_ready": launch_summary.get("compliance_ready"),
            "platform_active": platform_active,
        },
        confidence=1.0,
        status="confirmed",
    )

    record_learning_event(
        db,
        company_id=company.id,
        agent="hermes",
        event_type="authoritative_compliance_snapshot",
        subject_type="company_launch",
        subject_id=launch.id,
        action="review_compliance",
        outcome="active" if platform_active else "in_progress",
        outcome_score=1.0 if platform_active else 0.0,
        evidence={"documents": documents, "launch_status": launch_summary.get("status")},
        related_memory=memory,
    )

    handoff = None
    if platform_active:
        handoff = create_or_update_handoff(
            db,
            company_id=company.id,
            handoff_key="hermes_compliance_to_sonny",
            from_agent="hermes",
            to_agent="sonny",
            handoff_type="compliance_complete",
            summary="Hermes completed compliance using authoritative Launch Engine state.",
            payload={
                "company_name": company.name,
                "company_status": company.status,
                "launch_status": launch_summary.get("status"),
                "next_step": "operational_onboarding",
            },
        )

    return {
        "company_id": company.id,
        "company_name": company.name,
        "company_status": company.status,
        "launch": launch_summary,
        "documents": documents,
        "platform_active": platform_active,
        "attention_required": bool(documents["missing_documents"]),
        "missing_documents": documents["missing_documents"],
        "voice_profile": get_voice_profile("hermes"),
        "speech": hermes_spoken_message(company.name, launch_summary),
        "handoff_ready": bool(handoff),
        "handoff": serialize_handoff(handoff) if handoff else None,
        "intelligence_engine": "v1.2",
    }
