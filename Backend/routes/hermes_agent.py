from __future__ import annotations

import json
import os
import uuid
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import SessionLocal
from models.company import Company, Document, Task
from services.ai_provider import (
    run_agent_completion,
)

router = APIRouter()


class HermesAgentRequest(BaseModel):
    company_id: str
    message: str = Field(min_length=1, max_length=4000)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def verify_company_access(
    company_id: str,
    actor_id: str,
    db: Session,
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    if str(company.user_id) != str(actor_id):
        raise HTTPException(
            status_code=403,
            detail="Company access denied.",
        )

    return company


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def serialize_document(document: Document) -> dict[str, Any]:
    return {
        "id": str(getattr(document, "id", "") or ""),
        "name": str(getattr(document, "name", "") or ""),
        "type": str(getattr(document, "type", "") or ""),
        "status": str(getattr(document, "status", "") or ""),
        "uploaded_at": (
            getattr(document, "uploaded_at", None).isoformat()
            if getattr(document, "uploaded_at", None)
            else None
        ),
    }


def serialize_task(task: Task) -> dict[str, Any]:
    return {
        "id": str(getattr(task, "id", "") or ""),
        "title": str(getattr(task, "title", "") or ""),
        "description": str(getattr(task, "description", "") or ""),
        "status": str(getattr(task, "status", "") or ""),
    }


def is_kyc_document(document: Document) -> bool:
    searchable = " ".join(
        [
            str(getattr(document, "name", "") or ""),
            str(getattr(document, "type", "") or ""),
        ]
    ).lower()

    return any(
        token in searchable
        for token in (
            "kyc",
            "kyb",
            "kyc_questionnaire",
            "know your customer",
            "know your business",
        )
    )


def classify_submission(
    documents: list[Document],
) -> dict[str, Any]:
    matching = [
        document
        for document in documents
        if is_kyc_document(document)
    ]

    statuses = [
        normalize(getattr(document, "status", ""))
        for document in matching
    ]

    approved = any(
        status in {"approved", "verified"}
        for status in statuses
    )

    rejected = any(
        status
        in {
            "rejected",
            "declined",
            "action_required",
        }
        for status in statuses
    )

    awaiting = bool(matching) and not approved and not rejected and any(
        status
        in {
            "uploaded",
            "under_review",
            "pending",
            "awaiting_review",
            "submitted",
        }
        for status in statuses
    )

    if approved:
        state = "approved"
    elif rejected:
        state = "action_required"
    elif awaiting:
        state = "awaiting_verification"
    elif matching:
        state = "submitted"
    else:
        state = "missing"

    return {
        "state": state,
        "count": len(matching),
        "documents": [
            serialize_document(document)
            for document in matching
        ],
    }


def recent_hermes_memory(
    db: Session,
    company_id: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    title,
                    content,
                    source_agent,
                    created_at
                FROM firmic_intelligence_memories
                WHERE company_id = :company_id
                  AND agent_scope IN ('hermes', 'shared')
                  AND memory_type = 'conversation'
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {
                "company_id": company_id,
                "limit": limit,
            },
        ).mappings().all()

        return [
            {
                "title": row.get("title"),
                "content": row.get("content"),
                "source_agent": row.get("source_agent"),
                "created_at": (
                    row.get("created_at").isoformat()
                    if row.get("created_at")
                    else None
                ),
            }
            for row in reversed(rows)
        ]
    except Exception:
        db.rollback()
        return []


def save_conversation_memory(
    db: Session,
    *,
    company_id: str,
    source_agent: str,
    title: str,
    content: str,
):
    try:
        db.execute(
            text(
                """
                INSERT INTO firmic_intelligence_memories (
                    id,
                    company_id,
                    agent_scope,
                    memory_type,
                    memory_key,
                    title,
                    content,
                    source_agent,
                    source_type,
                    provenance,
                    confidence,
                    utility_score,
                    occurrence_count,
                    status
                )
                VALUES (
                    :id,
                    :company_id,
                    'hermes',
                    'conversation',
                    :memory_key,
                    :title,
                    :content,
                    :source_agent,
                    'conversation',
                    CAST(:provenance AS JSON),
                    0.95,
                    0.80,
                    1,
                    'active'
                )
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "company_id": company_id,
                "memory_key": (
                    f"hermes-conversation-{uuid.uuid4()}"
                ),
                "title": title,
                "content": content[:12000],
                "source_agent": source_agent,
                "provenance": json.dumps(
                    {
                        "route": "/api/hermes-agent/chat",
                        "agent": "hermes",
                    }
                ),
            },
        )

        db.commit()
    except Exception:
        db.rollback()


def build_context(
    company: Company,
    documents: list[Document],
    tasks: list[Task],
    memory: list[dict[str, Any]],
) -> dict[str, Any]:
    kyc = classify_submission(documents)

    pending_tasks = [
        serialize_task(task)
        for task in tasks
        if normalize(getattr(task, "status", ""))
        not in {"completed", "done", "closed"}
    ]

    approved_documents = [
        serialize_document(document)
        for document in documents
        if normalize(getattr(document, "status", ""))
        in {"approved", "verified"}
    ]

    submitted_documents = [
        serialize_document(document)
        for document in documents
        if normalize(getattr(document, "status", ""))
        in {
            "uploaded",
            "submitted",
            "under_review",
            "awaiting_review",
            "pending",
        }
    ]

    rejected_documents = [
        serialize_document(document)
        for document in documents
        if normalize(getattr(document, "status", ""))
        in {
            "rejected",
            "declined",
            "action_required",
        }
    ]

    return {
        "company": {
            "id": str(company.id),
            "name": str(company.name or ""),
            "industry": str(
                getattr(company, "industry", "") or ""
            ),
            "jurisdiction": str(
                getattr(company, "jurisdiction", "")
                or "Abu Dhabi"
            ),
            "status": str(
                getattr(company, "status", "") or ""
            ),
            "plan": str(
                getattr(company, "plan", "") or ""
            ),
        },
        "documents": {
            "total": len(documents),
            "approved": approved_documents,
            "submitted_for_review": submitted_documents,
            "rejected_or_action_required": rejected_documents,
            "all": [
                serialize_document(document)
                for document in documents
            ],
        },
        "kyc_kyb": kyc,
        "tasks": {
            "total": len(tasks),
            "pending": pending_tasks,
        },
        "recent_hermes_memory": memory,
    }


def deterministic_fallback(
    context: dict[str, Any],
    message: str,
) -> str:
    company_name = (
        context.get("company", {}).get("name")
        or "your company"
    )

    kyc = context.get("kyc_kyb", {})
    kyc_state = kyc.get("state", "missing")

    documents = context.get("documents", {})
    pending_tasks = context.get("tasks", {}).get(
        "pending",
        [],
    )

    kyc_sentence = {
        "approved":
            "Your KYC / KYB package is approved.",
        "awaiting_verification":
            "Your KYC / KYB package has already been submitted and is awaiting Hermes / Firmic verification. It is not missing.",
        "action_required":
            "Your KYC / KYB package requires a corrected or replacement submission.",
        "submitted":
            "Your KYC / KYB package is on file and is being treated as submitted.",
        "missing":
            "I do not see a KYC / KYB submission yet.",
    }.get(
        kyc_state,
        "I am reviewing the KYC / KYB state.",
    )

    return (
        f"I reviewed the live compliance state for {company_name}. "
        f"{kyc_sentence} "
        f"I can see {documents.get('total', 0)} compliance documents "
        f"and {len(pending_tasks)} pending compliance tasks. "
        "AI generation is not configured on this backend yet, so this response was produced from deterministic Firmic compliance state."
    )

import re


def clean_speech(text: str) -> str:
    value = str(text or "")

    # Remove fenced code blocks.
    value = re.sub(
        r"```[\s\S]*?```",
        " ",
        value,
    )

    # Remove Markdown links but keep their visible text.
    value = re.sub(
        r"\[([^\]]+)\]\([^)]+\)",
        r"\1",
        value,
    )

    # Remove Markdown emphasis / headings / bullets.
    value = re.sub(
        r"[*_#>`~]+",
        "",
        value,
    )

    value = re.sub(
        r"^\s*[-+]\s+",
        "",
        value,
        flags=re.MULTILINE,
    )

    # Convert backend enum style into natural speech.
    value = value.replace(
        "awaiting_verification",
        "awaiting verification",
    )

    value = value.replace(
        "action_required",
        "action required",
    )

    value = value.replace(
        "under_review",
        "under review",
    )

    value = value.replace(
        "KYC / KYB",
        "K Y C and K Y B",
    )

    # Collapse whitespace.
    value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip()

    return value

def ai_reply(
    context: dict[str, Any],
    message: str,
) -> tuple[str, str, str | None]:
    try:
        instructions = """
You are Hermes, Firmic's Compliance AI Agent.

You are not a generic chatbot.

You operate inside one authenticated Firmic tenant
and reason from the live compliance context supplied
to you.

Rules:

1. Never invent documents, approvals, laws,
   regulator decisions, deadlines, or actions.

2. Document states are precise:
   uploaded / submitted / under_review /
   awaiting_review / pending
   means submitted and awaiting verification,
   NOT missing.

3. approved / verified means approved.

4. rejected / declined / action_required means
   the tenant must correct or replace something.

5. Never ask a tenant to upload a document that is
   already awaiting verification.

6. Distinguish:
   - tenant action required
   - Hermes/Firmic action pending
   - Firmic Admin final approval

7. State clearly what is blocking approval.

8. If the tenant has nothing to do, explicitly say:
   "No tenant action is required right now."

9. Do not provide legal advice.
   Escalate uncertain legal interpretations to
   Firmic Compliance or Legal AI.

10. Speak as Hermes: concise, professional,
    operational, and specific to this company.
"""

        user_prompt = (
            "LIVE FIRMIC COMPLIANCE CONTEXT:\n"
            + json.dumps(
                context,
                ensure_ascii=False,
                indent=2,
                default=str,
            )
            + "\n\nTENANT MESSAGE:\n"
            + message
        )

        result = run_agent_completion(
            agent_name="HERMES",
            system_prompt=instructions,
            user_prompt=user_prompt,
            temperature=0.15,
        )

        reply = result["text"]

        if not reply:
            raise RuntimeError(
                "Hermes returned an empty response."
            )

        return (
            reply,
            "ai",
            None,
        )

    except Exception as error:
        return (
            "",
            "unavailable",
            (
                "Hermes AI is temporarily unavailable: "
                + str(error)
            ),
        )


@router.post("/chat")
def hermes_agent_chat(
    payload: HermesAgentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    actor_id = str(token.get("sub") or "")

    company = verify_company_access(
        payload.company_id,
        actor_id,
        db,
    )

    documents = (
        db.query(Document)
        .filter(
            Document.company_id
            == payload.company_id
        )
        .all()
    )

    tasks = (
        db.query(Task)
        .filter(
            Task.company_id
            == payload.company_id
        )
        .all()
    )

    memory = recent_hermes_memory(
        db,
        payload.company_id,
    )

    context = build_context(
        company,
        documents,
        tasks,
        memory,
    )

    save_conversation_memory(
        db,
        company_id=payload.company_id,
        source_agent="founder",
        title="Tenant message to Hermes",
        content=payload.message,
    )

    reply, mode, warning = ai_reply(
        context,
        payload.message.strip(),
    )

    save_conversation_memory(
        db,
        company_id=payload.company_id,
        source_agent="hermes",
        title="Hermes compliance response",
        content=reply,
    )

    return {
        "company_id": payload.company_id,
        "agent": "hermes",
        "mode": mode,
        "reply": reply,
        "speech": clean_speech(reply),
        "warning": warning,
        "kyc_kyb": context["kyc_kyb"],
        "document_summary": {
            "total": context["documents"]["total"],
            "submitted_for_review": len(
                context["documents"][
                    "submitted_for_review"
                ]
            ),
            "approved": len(
                context["documents"]["approved"]
            ),
            "action_required": len(
                context["documents"][
                    "rejected_or_action_required"
                ]
            ),
        },
        "pending_tasks": len(
            context["tasks"]["pending"]
        ),
    }
