from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from auth import get_token_payload
from database import get_db
from models.company import Company, Task
from models.customer_hub import (
    Customer,
    CustomerActivity,
    CustomerCommunication,
    CustomerContact,
    CustomerOpportunity,
    CustomerSupportTicket,
)
from services.sonny.customer_intelligence import (
    build_customer_summary,
    execute_customer_sonny_action,
    get_customer_with_intelligence_context,
)
from schemas.customer_hub import (
    CommunicationCreate,
    ContactCreate,
    CustomerCreate,
    CustomerUpdate,
    OpportunityCreate,
    OpportunityUpdate,
    TicketCreate,
    TicketUpdate,
)

router = APIRouter(prefix="/api/customer-hub", tags=["Customer Hub"])


class CustomerSonnyActionRequest(BaseModel):
    action: str = Field(min_length=1, max_length=80)


class CustomerSonnyExecutionRequest(BaseModel):
    execution: str = Field(min_length=1, max_length=80)
    source_action: str = Field(min_length=1, max_length=80)


def verify_company_access(
    company_id: str,
    token: dict,
    db: Session,
) -> Company:
    user_id = str(token.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == user_id,
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


def customer_or_404(
    customer_id: str,
    token: dict,
    db: Session,
) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    verify_company_access(customer.company_id, token, db)
    return customer


def activity(
    db: Session,
    customer: Customer,
    *,
    event_type: str,
    title: str,
    description: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    actor_name: str | None = None,
):
    db.add(
        CustomerActivity(
            customer_id=customer.id,
            company_id=customer.company_id,
            event_type=event_type,
            title=title,
            description=description,
            actor_type="user",
            actor_name=actor_name,
            source_type=source_type,
            source_id=source_id,
        )
    )


def serialize_contact(item: CustomerContact):
    return {
        "id": item.id,
        "customer_id": item.customer_id,
        "first_name": item.first_name,
        "last_name": item.last_name,
        "email": item.email,
        "phone": item.phone,
        "position": item.position,
        "is_primary": item.is_primary,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_opportunity(item: CustomerOpportunity):
    return {
        "id": item.id,
        "customer_id": item.customer_id,
        "title": item.title,
        "value": float(item.value or 0),
        "probability": int(item.probability or 0),
        "stage": item.stage,
        "expected_close": item.expected_close,
        "owner": item.owner,
        "notes": item.notes,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_communication(item: CustomerCommunication):
    return {
        "id": item.id,
        "customer_id": item.customer_id,
        "type": item.type,
        "direction": item.direction,
        "subject": item.subject,
        "message": item.message,
        "actor": item.actor,
        "created_at": item.created_at,
    }


def serialize_ticket(item: CustomerSupportTicket):
    return {
        "id": item.id,
        "customer_id": item.customer_id,
        "title": item.title,
        "description": item.description,
        "priority": item.priority,
        "status": item.status,
        "assigned_to": item.assigned_to,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_activity(item: CustomerActivity):
    return {
        "id": item.id,
        "customer_id": item.customer_id,
        "company_id": item.company_id,
        "event_type": item.event_type,
        "title": item.title,
        "description": item.description,
        "actor_type": item.actor_type,
        "actor_name": item.actor_name,
        "source_type": item.source_type,
        "source_id": item.source_id,
        "created_at": item.created_at,
    }


def serialize_customer(item: Customer, *, expanded: bool = False):
    opportunities = list(item.opportunities or [])
    tickets = list(item.support_tickets or [])

    result: dict[str, Any] = {
        "id": item.id,
        "company_id": item.company_id,
        "name": item.name,
        "industry": item.industry,
        "website": item.website,
        "phone": item.phone,
        "email": item.email,
        "owner": item.owner,
        "status": item.status,
        "relationship_score": int(item.relationship_score or 0),
        "health": item.health,
        "tags": json.loads(item.tags) if item.tags else [],
        "notes": item.notes,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "metrics": {
            "contacts": len(item.contacts or []),
            "opportunities": len(opportunities),
            "pipeline_value": sum(float(x.value or 0) for x in opportunities),
            "open_tickets": sum(
                x.status not in {"resolved", "closed"} for x in tickets
            ),
        },
    }

    if expanded:
        result.update(
            {
                "contacts": [serialize_contact(x) for x in item.contacts],
                "opportunities": [
                    serialize_opportunity(x) for x in opportunities
                ],
                "communications": [
                    serialize_communication(x)
                    for x in item.communications
                ],
                "support_tickets": [
                    serialize_ticket(x) for x in tickets
                ],
                "activity": [
                    serialize_activity(x) for x in item.activities
                ],
            }
        )

    return result


@router.get("/company/{company_id}")
def list_customers(
    company_id: str,
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=200, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, token, db)

    query = (
        db.query(Customer)
        .options(
            selectinload(Customer.contacts),
            selectinload(Customer.opportunities),
            selectinload(Customer.support_tickets),
        )
        .filter(Customer.company_id == company_id)
    )

    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search.strip()}%")
        )

    if status_filter:
        query = query.filter(
            Customer.status == status_filter.strip().lower()
        )

    customers = (
        query.order_by(Customer.updated_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "company_id": company_id,
        "customers": [serialize_customer(x) for x in customers],
    }


@router.get("/company/{company_id}/summary")
def customer_hub_summary(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, token, db)

    customers = (
        db.query(Customer)
        .options(
            selectinload(Customer.opportunities),
            selectinload(Customer.support_tickets),
        )
        .filter(Customer.company_id == company_id)
        .all()
    )

    opportunities = [
        opportunity
        for customer in customers
        for opportunity in customer.opportunities
    ]
    tickets = [
        ticket
        for customer in customers
        for ticket in customer.support_tickets
    ]

    won = [x for x in opportunities if x.stage == "won"]

    return {
        "company_id": company_id,
        "customers": len(customers),
        "open_opportunities": sum(
            x.stage not in {"won", "lost"} for x in opportunities
        ),
        "pipeline_value": sum(
            float(x.value or 0)
            for x in opportunities
            if x.stage != "lost"
        ),
        "won_value": sum(float(x.value or 0) for x in won),
        "win_rate": (
            round((len(won) / len(opportunities)) * 100)
            if opportunities
            else 0
        ),
        "open_tickets": sum(
            x.status not in {"resolved", "closed"} for x in tickets
        ),
        "at_risk_customers": sum(
            x.health in {"at_risk", "critical"} for x in customers
        ),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(payload.company_id, token, db)

    customer = Customer(
        company_id=payload.company_id,
        name=payload.name.strip(),
        industry=payload.industry,
        website=payload.website,
        phone=payload.phone,
        email=payload.email,
        owner=payload.owner,
        status=payload.status,
        relationship_score=payload.relationship_score,
        health=payload.health,
        tags=json.dumps(payload.tags),
        notes=payload.notes,
    )

    try:
        db.add(customer)
        db.flush()

        activity(
            db,
            customer,
            event_type="customer_created",
            title="Customer created",
            description=f"{customer.name} was added to Customer Hub.",
            source_type="customer",
            source_id=customer.id,
        )

        db.commit()
        db.refresh(customer)
    except Exception:
        db.rollback()
        raise

    return serialize_customer(customer)


@router.get("/{customer_id}")
def get_customer(
    customer_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    customer = (
        db.query(Customer)
        .options(
            selectinload(Customer.contacts),
            selectinload(Customer.opportunities),
            selectinload(Customer.communications),
            selectinload(Customer.support_tickets),
            selectinload(Customer.activities),
        )
        .filter(Customer.id == customer.id)
        .first()
    )

    return serialize_customer(customer, expanded=True)


@router.put("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    updates = payload.model_dump(exclude_unset=True)

    if "tags" in updates:
        updates["tags"] = json.dumps(updates["tags"])

    for key, value in updates.items():
        setattr(customer, key, value)

    activity(
        db,
        customer,
        event_type="customer_updated",
        title="Customer profile updated",
        description=f"{customer.name}'s profile was updated.",
        source_type="customer",
        source_id=customer.id,
    )

    db.commit()
    db.refresh(customer)
    return serialize_customer(customer)


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)
    name = customer.name

    db.delete(customer)
    db.commit()

    return {
        "status": "deleted",
        "customer_id": customer_id,
        "customer_name": name,
    }


@router.post("/{customer_id}/contacts", status_code=201)
def create_contact(
    customer_id: str,
    payload: ContactCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    if payload.is_primary:
        db.query(CustomerContact).filter(
            CustomerContact.customer_id == customer.id
        ).update({"is_primary": False})

    contact = CustomerContact(
        customer_id=customer.id,
        **payload.model_dump(),
    )
    db.add(contact)
    db.flush()

    activity(
        db,
        customer,
        event_type="contact_created",
        title="Contact added",
        description=f"{payload.first_name} was added to {customer.name}.",
        source_type="contact",
        source_id=contact.id,
    )

    db.commit()
    db.refresh(contact)
    return serialize_contact(contact)


@router.post("/{customer_id}/opportunities", status_code=201)
def create_opportunity(
    customer_id: str,
    payload: OpportunityCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    opportunity = CustomerOpportunity(
        customer_id=customer.id,
        **payload.model_dump(),
    )
    db.add(opportunity)
    db.flush()

    activity(
        db,
        customer,
        event_type="opportunity_created",
        title="Opportunity created",
        description=f"{opportunity.title} was added at ${opportunity.value:,.2f}.",
        source_type="opportunity",
        source_id=opportunity.id,
    )

    db.commit()
    db.refresh(opportunity)
    return serialize_opportunity(opportunity)


@router.put("/opportunities/{opportunity_id}")
def update_opportunity(
    opportunity_id: str,
    payload: OpportunityUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    opportunity = (
        db.query(CustomerOpportunity)
        .filter(CustomerOpportunity.id == opportunity_id)
        .first()
    )
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    customer = customer_or_404(opportunity.customer_id, token, db)
    previous_stage = opportunity.stage

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(opportunity, key, value)

    activity(
        db,
        customer,
        event_type="opportunity_updated",
        title="Opportunity updated",
        description=(
            f"{opportunity.title} moved from {previous_stage} "
            f"to {opportunity.stage}."
            if previous_stage != opportunity.stage
            else f"{opportunity.title} was updated."
        ),
        source_type="opportunity",
        source_id=opportunity.id,
    )

    db.commit()
    db.refresh(opportunity)
    return serialize_opportunity(opportunity)


@router.post("/{customer_id}/communications", status_code=201)
def create_communication(
    customer_id: str,
    payload: CommunicationCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    communication = CustomerCommunication(
        customer_id=customer.id,
        **payload.model_dump(),
    )
    db.add(communication)
    db.flush()

    activity(
        db,
        customer,
        event_type="communication_logged",
        title=f"{communication.type.title()} logged",
        description=communication.subject or communication.message,
        source_type="communication",
        source_id=communication.id,
        actor_name=communication.actor,
    )

    db.commit()
    db.refresh(communication)
    return serialize_communication(communication)


@router.post("/{customer_id}/tickets", status_code=201)
def create_ticket(
    customer_id: str,
    payload: TicketCreate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    ticket = CustomerSupportTicket(
        customer_id=customer.id,
        **payload.model_dump(),
    )
    db.add(ticket)
    db.flush()

    activity(
        db,
        customer,
        event_type="ticket_created",
        title="Support ticket created",
        description=ticket.title,
        source_type="support_ticket",
        source_id=ticket.id,
    )

    db.commit()
    db.refresh(ticket)
    return serialize_ticket(ticket)


@router.put("/tickets/{ticket_id}")
def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    ticket = (
        db.query(CustomerSupportTicket)
        .filter(CustomerSupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    customer = customer_or_404(ticket.customer_id, token, db)
    previous_status = ticket.status

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)

    activity(
        db,
        customer,
        event_type="ticket_updated",
        title="Support ticket updated",
        description=(
            f"{ticket.title} moved from {previous_status} to {ticket.status}."
        ),
        source_type="support_ticket",
        source_id=ticket.id,
    )

    db.commit()
    db.refresh(ticket)
    return serialize_ticket(ticket)


@router.get("/{customer_id}/activity")
def list_activity(
    customer_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    items = (
        db.query(CustomerActivity)
        .filter(CustomerActivity.customer_id == customer.id)
        .order_by(CustomerActivity.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "customer_id": customer.id,
        "activity": [serialize_activity(item) for item in items],
    }


@router.get("/{customer_id}/sonny/summary")
def summarize_customer_with_sonny(
    customer_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    expanded_customer = get_customer_with_intelligence_context(
        db,
        customer_id=customer.id,
        company_id=customer.company_id,
    )

    if not expanded_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return build_customer_summary(expanded_customer)


@router.post("/{customer_id}/sonny/action")
def execute_customer_sonny_action_route(
    customer_id: str,
    payload: CustomerSonnyActionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    customer = customer_or_404(customer_id, token, db)

    expanded_customer = get_customer_with_intelligence_context(
        db,
        customer_id=customer.id,
        company_id=customer.company_id,
    )

    if not expanded_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    try:
        return execute_customer_sonny_action(
            expanded_customer,
            action=payload.action,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/{customer_id}/sonny/execute")
def execute_customer_sonny_result(
    customer_id: str,
    payload: CustomerSonnyExecutionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """Turn a generated Sonny recommendation into a persisted Firmic action.

    The generated content is rebuilt on the server from current Customer Hub data,
    so the database never trusts arbitrary text sent by the browser.
    """
    customer = customer_or_404(customer_id, token, db)
    expanded_customer = get_customer_with_intelligence_context(
        db,
        customer_id=customer.id,
        company_id=customer.company_id,
    )
    if not expanded_customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    try:
        generated = execute_customer_sonny_action(
            expanded_customer,
            action=payload.source_action,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    execution = payload.execution.strip().lower()
    actor_name = "Sonny AI COO"

    if execution == "save_email_draft":
        subject = str(generated.get("subject") or f"Follow-up for {customer.name}")
        message = str(generated.get("email_body") or generated.get("reply") or "").strip()
        if not message:
            raise HTTPException(status_code=400, detail="Sonny did not produce an email draft")

        record = CustomerCommunication(
            id=str(uuid.uuid4()),
            customer_id=customer.id,
            type="email",
            direction="draft",
            subject=subject,
            message=message,
            actor=actor_name,
        )
        db.add(record)
        activity(
            db,
            customer,
            event_type="sonny_email_draft_saved",
            title="Sonny follow-up email saved",
            description=subject,
            source_type="customer_communication",
            source_id=record.id,
            actor_name=actor_name,
        )
        db.commit()
        db.refresh(record)
        return {
            "ok": True,
            "execution": execution,
            "reply": "The follow-up email was saved to Customer Hub communications.",
            "record": serialize_communication(record),
        }

    if execution == "create_follow_up_task":
        title = str(generated.get("recommended_next_action") or f"Follow up with {customer.name}")
        description = str(generated.get("reply") or title)
        record = Task(
            id=str(uuid.uuid4()),
            company_id=customer.company_id,
            title=title[:255],
            description=description,
            status="pending",
        )
        db.add(record)
        activity(
            db,
            customer,
            event_type="sonny_task_created",
            title="Sonny follow-up task created",
            description=title,
            source_type="task",
            source_id=record.id,
            actor_name=actor_name,
        )
        db.commit()
        db.refresh(record)
        return {
            "ok": True,
            "execution": execution,
            "reply": "The follow-up task was created and added to the customer timeline.",
            "record": {
                "id": record.id,
                "company_id": record.company_id,
                "title": record.title,
                "description": record.description,
                "status": record.status,
                "created_at": record.created_at,
            },
        }

    if execution == "record_recommendation":
        recommendation = str(
            generated.get("recommended_next_action")
            or generated.get("reply")
            or "Sonny recommendation"
        )
        record = CustomerActivity(
            id=str(uuid.uuid4()),
            customer_id=customer.id,
            company_id=customer.company_id,
            event_type="sonny_recommendation_approved",
            title="Sonny recommendation recorded",
            description=recommendation,
            actor_type="ai",
            actor_name=actor_name,
            source_type="sonny_customer_action",
            source_id=payload.source_action,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "ok": True,
            "execution": execution,
            "reply": "The recommendation was recorded in the customer activity timeline.",
            "record": serialize_activity(record),
        }

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported Sonny execution: {payload.execution}",
    )
