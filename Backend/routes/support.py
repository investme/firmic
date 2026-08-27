from __future__ import annotations

import datetime
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from services.activity_service import record_activity
from models.activity_log import ActivityLog
from models.company import Company
from models.support_ticket import (
    SupportMessage,
    SupportTicket,
)


router = APIRouter(
    prefix="/api/support",
    tags=["Support"],
)


ALLOWED_CATEGORIES = {
    "general",
    "billing",
    "compliance",
    "technical",
    "office",
    "mailbox",
    "voip",
    "microsoft_365",
    "ai_workforce",
    "meeting_rooms",
}

ALLOWED_TENANT_STATUSES = {
    "open",
    "closed",
}


class CreateTicketRequest(BaseModel):
    company_id: str
    subject: str = Field(
        min_length=3,
        max_length=180,
    )
    category: str = "general"
    message: str = Field(
        min_length=3,
        max_length=10000,
    )


class ReplyRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=10000,
    )


def authorize_company(
    company_id: str,
    token: dict,
    db: Session,
) -> Company:
    user_id = str(token.get("sub") or "")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == user_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found or access denied.",
        )

    return company


def serialize_message(
    message: SupportMessage,
) -> dict[str, Any]:
    return {
        "id": message.id,
        "ticket_id": message.ticket_id,
        "sender_type": message.sender_type,
        "sender_id": message.sender_id,
        "message": message.message,
        "created_at": (
            message.created_at.isoformat()
            if message.created_at
            else None
        ),
    }


def serialize_ticket(
    ticket: SupportTicket,
    company: Company | None = None,
) -> dict[str, Any]:
    return {
        "id": ticket.id,
        "company_id": ticket.company_id,
        "company_name": (
            company.name
            if company
            else None
        ),
        "created_by_user_id": ticket.created_by_user_id,
        "assigned_admin_id": ticket.assigned_admin_id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "created_at": (
            ticket.created_at.isoformat()
            if ticket.created_at
            else None
        ),
        "updated_at": (
            ticket.updated_at.isoformat()
            if ticket.updated_at
            else None
        ),
        "resolved_at": (
            ticket.resolved_at.isoformat()
            if ticket.resolved_at
            else None
        ),
        "message_count": len(ticket.messages or []),
        "messages": [
            serialize_message(message)
            for message in ticket.messages
        ],
    }


def record_support_activity(
    db: Session,
    *,
    company_id: str,
    event_type: str,
    title: str,
    description: str,
    actor_type: str,
    actor_id: str,
    ticket_id: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        record_activity(db, commit=False,
            company_id=company_id,
            event_type=event_type,
            title=title,
            description=description,
            actor_type=actor_type,
            actor_id=actor_id,
            source_type="support_ticket",
            source_id=ticket_id,
            event_metadata=metadata or {},
        )
    )


@router.post("/tickets")
def create_support_ticket(
    payload: CreateTicketRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(
        payload.company_id,
        token,
        db,
    )

    category = payload.category.strip().lower()

    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported support category.",
        )

    user_id = str(token.get("sub") or "")
    ticket_id = str(uuid.uuid4())

    ticket = SupportTicket(
        id=ticket_id,
        company_id=company.id,
        created_by_user_id=user_id,
        subject=" ".join(payload.subject.strip().split()),
        category=category,
        priority="normal",
        status="open",
    )

    first_message = SupportMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        sender_type="tenant",
        sender_id=user_id,
        message=payload.message.strip(),
    )

    try:
        db.add(ticket)
        db.add(first_message)

        record_support_activity(
            db,
            company_id=company.id,
            event_type="support_ticket_created",
            title="Support ticket created",
            description=(
                f"{company.name} opened support ticket: "
                f"{ticket.subject}."
            ),
            actor_type="tenant",
            actor_id=user_id,
            ticket_id=ticket.id,
            metadata={
                "category": ticket.category,
                "priority": ticket.priority,
                "status": ticket.status,
            },
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Support ticket created.",
            "ticket": serialize_ticket(
                ticket,
                company,
            ),
        }

    except Exception:
        db.rollback()
        raise


@router.get("/company/{company_id}/tickets")
def list_company_support_tickets(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(
        company_id,
        token,
        db,
    )

    tickets = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.company_id == company_id
        )
        .order_by(
            SupportTicket.updated_at.desc(),
            SupportTicket.created_at.desc(),
        )
        .all()
    )

    return {
        "company": {
            "id": company.id,
            "name": company.name,
        },
        "tickets": [
            serialize_ticket(
                ticket,
                company,
            )
            for ticket in tickets
        ],
        "metrics": {
            "total": len(tickets),
            "open": sum(
                ticket.status == "open"
                for ticket in tickets
            ),
            "pending": sum(
                ticket.status in {
                    "pending",
                    "waiting_on_tenant",
                }
                for ticket in tickets
            ),
            "resolved": sum(
                ticket.status in {
                    "resolved",
                    "closed",
                }
                for ticket in tickets
            ),
        },
    }


@router.post("/tickets/{ticket_id}/reply")
def tenant_reply_to_ticket(
    ticket_id: str,
    payload: ReplyRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.id == ticket_id
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found.",
        )

    company = authorize_company(
        ticket.company_id,
        token,
        db,
    )

    if ticket.status == "closed":
        raise HTTPException(
            status_code=400,
            detail="Closed tickets cannot receive replies. Reopen the ticket first.",
        )

    user_id = str(token.get("sub") or "")

    message = SupportMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket.id,
        sender_type="tenant",
        sender_id=user_id,
        message=payload.message.strip(),
    )

    try:
        db.add(message)

        if ticket.status in {
            "pending",
            "waiting_on_tenant",
            "resolved",
        }:
            ticket.status = "open"
            ticket.resolved_at = None

        ticket.updated_at = datetime.datetime.utcnow()

        record_support_activity(
            db,
            company_id=company.id,
            event_type="support_tenant_replied",
            title="Tenant replied to support ticket",
            description=(
                f"{company.name} replied to: "
                f"{ticket.subject}."
            ),
            actor_type="tenant",
            actor_id=user_id,
            ticket_id=ticket.id,
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Reply sent.",
            "ticket": serialize_ticket(
                ticket,
                company,
            ),
        }

    except Exception:
        db.rollback()
        raise


@router.post("/tickets/{ticket_id}/close")
def close_tenant_support_ticket(
    ticket_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.id == ticket_id
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found.",
        )

    company = authorize_company(
        ticket.company_id,
        token,
        db,
    )

    if ticket.status == "closed":
        return {
            "message": "Support ticket is already closed.",
            "ticket": serialize_ticket(
                ticket,
                company,
            ),
        }

    try:
        ticket.status = "closed"
        ticket.resolved_at = (
            ticket.resolved_at
            or datetime.datetime.utcnow()
        )
        ticket.updated_at = datetime.datetime.utcnow()

        record_support_activity(
            db,
            company_id=company.id,
            event_type="support_ticket_closed",
            title="Support ticket closed",
            description=(
                f"{company.name} closed: "
                f"{ticket.subject}."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or ""),
            ticket_id=ticket.id,
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Support ticket closed.",
            "ticket": serialize_ticket(
                ticket,
                company,
            ),
        }

    except Exception:
        db.rollback()
        raise


@router.post("/tickets/{ticket_id}/reopen")
def reopen_tenant_support_ticket(
    ticket_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.id == ticket_id
        )
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found.",
        )

    company = authorize_company(
        ticket.company_id,
        token,
        db,
    )

    try:
        ticket.status = "open"
        ticket.resolved_at = None
        ticket.updated_at = datetime.datetime.utcnow()

        record_support_activity(
            db,
            company_id=company.id,
            event_type="support_ticket_reopened",
            title="Support ticket reopened",
            description=(
                f"{company.name} reopened: "
                f"{ticket.subject}."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or ""),
            ticket_id=ticket.id,
        )

        db.commit()
        db.refresh(ticket)

        return {
            "message": "Support ticket reopened.",
            "ticket": serialize_ticket(
                ticket,
                company,
            ),
        }

    except Exception:
        db.rollback()
        raise
