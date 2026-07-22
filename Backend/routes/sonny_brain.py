from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import User
from models.company import Company
from schemas.sonny_knowledge import (
    SonnyKnowledgeImportRequest,
    SonnyKnowledgeResponse,
    SonnyKnowledgeUpdate,
)
from services.sonny.knowledge import (
    build_knowledge_prompt_context,
    get_or_create_company_knowledge,
    import_company_knowledge,
    update_company_knowledge,
)


router = APIRouter()


def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        normalized_user_id = int(str(user_id))
    except (TypeError, ValueError):
        normalized_user_id = None

    user = None
    if normalized_user_id is not None:
        user = db.query(User).filter(User.id == normalized_user_id).first()

    is_owner = str(company.user_id) == str(user_id)
    is_admin = bool(
        user
        and str(getattr(user, "role", "") or "").strip().lower()
        == "admin"
    )

    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Company access denied.")

    return company


@router.get(
    "/company/{company_id}/knowledge",
    response_model=SonnyKnowledgeResponse,
)
def read_sonny_knowledge(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )
    return get_or_create_company_knowledge(db, company_id=company_id)


@router.put(
    "/company/{company_id}/knowledge",
    response_model=SonnyKnowledgeResponse,
)
def save_sonny_knowledge(
    company_id: str,
    payload: SonnyKnowledgeUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        return update_company_knowledge(
            db,
            company_id=company_id,
            values=payload.dict(exclude_unset=True),
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Sonny knowledge update failed: {str(error)}",
        ) from error


@router.post("/company/{company_id}/knowledge/import")
def import_sonny_knowledge(
    company_id: str,
    payload: SonnyKnowledgeImportRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        knowledge, updated_fields = import_company_knowledge(
            db,
            company_id=company_id,
            raw_text=payload.raw_text,
            replace_existing_import=payload.replace_existing_import,
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Sonny knowledge import failed: {str(error)}",
        ) from error

    return {
        "message": "Company knowledge imported into Sonny Brain.",
        "company_id": company_id,
        "updated_fields": updated_fields,
        "knowledge": SonnyKnowledgeResponse.from_orm(knowledge),
    }


@router.get("/company/{company_id}/knowledge/context")
def read_sonny_knowledge_context(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )
    knowledge = get_or_create_company_knowledge(db, company_id=company_id)
    return {
        "company_id": company_id,
        "context": build_knowledge_prompt_context(knowledge),
    }
