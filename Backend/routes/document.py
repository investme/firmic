from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import SessionLocal
from models.activity_log import ActivityLog
from models.company import Company, Document, Task
from schemas.document import DocumentCreate


router = APIRouter()


REQUIRED_COMPLIANCE_DOCUMENTS = [
    {
        "key": "passport",
        "label": "Passport Copy",
        "aliases": [
            "passport",
            "passport copy",
            "owner passport",
            "government id",
        ],
    },
    {
        "key": "proof_of_address",
        "label": "Proof of Address",
        "aliases": [
            "proof of address",
            "address proof",
            "utility bill",
            "bank statement",
            "tenancy contract",
        ],
    },
    {
        "key": "trade_license",
        "label": "Trade License",
        "aliases": [
            "trade license",
            "business license",
            "commercial license",
        ],
    },
    {
        "key": "certificate_of_incorporation",
        "label": "Company Formation Documents",
        "aliases": [
            "company formation",
            "formation documents",
            "incorporation certificate",
            "certificate of incorporation",
            "memorandum",
            "articles of association",
            "incorporation",
        ],
    },
    {
        "key": "beneficial_owner_declaration",
        "label": "Beneficial Owner Declaration",
        "aliases": [
            "beneficial owner",
            "beneficial owner declaration",
            "ubo",
            "ultimate beneficial owner",
            "ownership declaration",
        ],
    },
    {
        "key": "emirates_id",
        "label": "Emirates ID",
        "aliases": [
            "emirates id",
            "emirates_id",
            "uae id",
            "emirates identity card",
        ],
    },
    {
        "key": "kyc_questionnaire",
        "label": "KYC Questionnaire",
        "aliases": [
            "kyc questionnaire",
            "kyc_questionnaire",
            "kyc",
            "know your customer questionnaire",
            "kyc form",
            "kyc submission",
        ],
    },
]


def applicable_compliance_documents(
    company: Company,
) -> list[dict[str, Any]]:
    return [
        requirement
        for requirement in REQUIRED_COMPLIANCE_DOCUMENTS
        if (
            requirement["key"] != "emirates_id"
            or getattr(
                company,
                "is_uae_resident",
                None,
            ) is not False
        )
    ]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return company


def normalize(value: Any) -> str:
    return " ".join(
        str(value or "")
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .split()
    )


def requirement_for_text(value: str) -> dict[str, Any] | None:
    normalized = normalize(value)

    for requirement in REQUIRED_COMPLIANCE_DOCUMENTS:
        if any(
            normalize(alias) in normalized
            for alias in requirement["aliases"]
        ):
            return requirement

    return None


def document_matches_requirement(
    document: Document,
    requirement: dict[str, Any],
) -> bool:
    searchable = normalize(
        f"{document.name or ''} {document.type or ''}"
    )

    return any(
        normalize(alias) in searchable
        for alias in requirement["aliases"]
    )


def serialize_document(document: Document) -> dict[str, Any]:
    return {
        "id": document.id,
        "company_id": document.company_id,
        "name": document.name,
        "type": document.type,
        "status": document.status,
        "file_path": document.file_path,
        "uploaded_at": (
            document.uploaded_at.isoformat()
            if document.uploaded_at
            else None
        ),
    }


def record_event(
    db: Session,
    *,
    company_id: str,
    event_type: str,
    title: str,
    description: str,
    actor_id: str | None,
    source_type: str,
    source_id: str,
    metadata: dict[str, Any] | None = None,
) -> ActivityLog:
    event = ActivityLog(
        id=str(uuid.uuid4()),
        company_id=company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type="tenant",
        actor_id=str(actor_id or ""),
        source_type=source_type,
        source_id=source_id,
        event_metadata=metadata or {},
    )

    db.add(event)
    return event


def complete_matching_request_tasks(
    db: Session,
    *,
    company_id: str,
    requirement: dict[str, Any] | None,
) -> list[str]:
    if not requirement:
        return []

    completed_ids: list[str] = []

    tasks = (
        db.query(Task)
        .filter(
            Task.company_id == company_id,
            Task.status != "completed",
        )
        .all()
    )

    expected_title = normalize(
        f"Upload {requirement['label']}"
    )

    for task in tasks:
        if normalize(task.title) == expected_title:
            task.status = "completed"
            completed_ids.append(task.id)

    return completed_ids


@router.post("/create")
def create_document(
    payload: DocumentCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    company = verify_company_access(
        payload.company_id,
        user_id,
        db,
    )

    requirement = requirement_for_text(
        f"{payload.name} {payload.type}"
    )

    document = Document(
        id=str(uuid.uuid4()),
        company_id=payload.company_id,
        name=payload.name,
        type=payload.type,
        status="uploaded",
        file_path=payload.file_path,
    )

    try:
        db.add(document)

        completed_task_ids = (
            complete_matching_request_tasks(
                db,
                company_id=payload.company_id,
                requirement=requirement,
            )
        )

        record_event(
            db,
            company_id=payload.company_id,
            event_type="compliance_document_uploaded",
            title=(
                f"{requirement['label']} uploaded"
                if requirement
                else f"{payload.name} uploaded"
            ),
            description=(
                f"{company.name} supplied "
                f"{requirement['label']} for Firmic compliance review."
                if requirement
                else f"{company.name} added {payload.name} to the Document Vault."
            ),
            actor_id=str(user_id or ""),
            source_type="document",
            source_id=document.id,
            metadata={
                "document_name": payload.name,
                "document_type": payload.type,
                "requirement_key": (
                    requirement["key"]
                    if requirement
                    else None
                ),
                "completed_task_ids": completed_task_ids,
            },
        )

        db.commit()
        db.refresh(document)

        return {
            "status": "created",
            "document": serialize_document(document),
            "matched_requirement": requirement,
            "completed_task_ids": completed_task_ids,
        }

    except Exception:
        db.rollback()
        raise


@router.get("/list")
def list_documents(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    documents = (
        db.query(Document)
        .join(
            Company,
            Document.company_id == Company.id,
        )
        .filter(
            Company.user_id == str(user_id)
        )
        .order_by(
            Document.uploaded_at.desc()
        )
        .all()
    )

    return [
        serialize_document(document)
        for document in documents
    ]


@router.get("/company/{company_id}")
def list_company_documents(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    verify_company_access(
        company_id,
        user_id,
        db,
    )

    documents = (
        db.query(Document)
        .filter(
            Document.company_id == company_id
        )
        .order_by(
            Document.uploaded_at.desc()
        )
        .all()
    )

    return [
        serialize_document(document)
        for document in documents
    ]


@router.get("/company/{company_id}/compliance-requests")
def list_company_compliance_requests(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")
    company = verify_company_access(
        company_id,
        user_id,
        db,
    )

    documents = (
        db.query(Document)
        .filter(
            Document.company_id == company_id
        )
        .all()
    )

    tasks = (
        db.query(Task)
        .filter(
            Task.company_id == company_id
        )
        .order_by(
            Task.created_at.desc()
        )
        .all()
    )

    results = []

    for requirement in applicable_compliance_documents(company):
        matching_documents = [
            document
            for document in documents
            if document_matches_requirement(
                document,
                requirement,
            )
        ]

        verified = next(
            (
                document
                for document in matching_documents
                if normalize(document.status)
                in {
                    "approved",
                    "verified",
                    "complete",
                    "completed",
                }
            ),
            None,
        )

        uploaded = verified or (
            matching_documents[0]
            if matching_documents
            else None
        )

        request_title = normalize(
            f"Upload {requirement['label']}"
        )

        request_task = next(
            (
                task
                for task in tasks
                if normalize(task.title)
                == request_title
            ),
            None,
        )

        if verified:
            state = "verified"
        elif uploaded:
            state = "uploaded"
        elif request_task:
            state = "requested"
        else:
            state = "not_requested"

        results.append(
            {
                "key": requirement["key"],
                "label": requirement["label"],
                "state": state,
                "requested": bool(request_task),
                "request_task": (
                    {
                        "id": request_task.id,
                        "title": request_task.title,
                        "status": request_task.status,
                        "created_at": (
                            request_task.created_at.isoformat()
                            if request_task.created_at
                            else None
                        ),
                    }
                    if request_task
                    else None
                ),
                "document": (
                    serialize_document(uploaded)
                    if uploaded
                    else None
                ),
            }
        )

    return {
        "company_id": company_id,
        "requests": results,
        "requested_count": sum(
            item["requested"]
            for item in results
        ),
        "action_required_count": sum(
            item["state"] in {
                "requested",
                "uploaded",
            }
            for item in results
        ),
    }


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = token.get("sub")

    document = (
        db.query(Document)
        .join(
            Company,
            Document.company_id == Company.id,
        )
        .filter(
            Document.id == document_id,
            Company.user_id == str(user_id),
        )
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    try:
        record_event(
            db,
            company_id=document.company_id,
            event_type="document_deleted",
            title="Document removed",
            description=(
                f"{document.name} was removed from the Document Vault."
            ),
            actor_id=str(user_id or ""),
            source_type="document",
            source_id=document.id,
            metadata={
                "document_name": document.name,
                "document_type": document.type,
            },
        )

        db.delete(document)
        db.commit()

        return {
            "status": "deleted",
            "document_id": document_id,
        }

    except Exception:
        db.rollback()
        raise
