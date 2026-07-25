from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session, selectinload

from models.customer_hub import Customer


CLOSED_STAGES = {"won", "lost"}
CLOSED_TICKET_STATUSES = {"resolved", "closed"}


def _money(value: float) -> str:
    return f"${value:,.2f}"


def _label(value: str | None) -> str:
    return str(value or "unknown").replace("_", " ").title()


def get_customer_with_intelligence_context(
    db: Session,
    *,
    customer_id: str,
    company_id: str,
) -> Customer | None:
    return (
        db.query(Customer)
        .options(
            selectinload(Customer.contacts),
            selectinload(Customer.opportunities),
            selectinload(Customer.communications),
            selectinload(Customer.support_tickets),
            selectinload(Customer.activities),
        )
        .filter(
            Customer.id == customer_id,
            Customer.company_id == company_id,
        )
        .first()
    )


def build_customer_summary(customer: Customer) -> dict[str, Any]:
    contacts = list(customer.contacts or [])
    opportunities = list(customer.opportunities or [])
    communications = sorted(
        list(customer.communications or []),
        key=lambda item: item.created_at or 0,
        reverse=True,
    )
    tickets = list(customer.support_tickets or [])
    activities = sorted(
        list(customer.activities or []),
        key=lambda item: item.created_at or 0,
        reverse=True,
    )

    open_opportunities = [
        item for item in opportunities
        if str(item.stage or "").lower() not in CLOSED_STAGES
    ]
    open_tickets = [
        item for item in tickets
        if str(item.status or "").lower() not in CLOSED_TICKET_STATUSES
    ]

    pipeline_value = sum(float(item.value or 0) for item in open_opportunities)
    weighted_forecast = sum(
        float(item.value or 0) * (int(item.probability or 0) / 100)
        for item in open_opportunities
    )

    primary_contact = next(
        (item for item in contacts if bool(item.is_primary)),
        contacts[0] if contacts else None,
    )

    risks: list[str] = []
    health = str(customer.health or "healthy").lower()
    relationship_score = int(customer.relationship_score or 0)

    if health in {"at_risk", "critical"}:
        risks.append(f"Customer health is marked {_label(health)}.")
    elif health == "attention":
        risks.append("Customer health requires attention.")

    if relationship_score < 50:
        risks.append(f"Relationship score is low at {relationship_score}/100.")

    urgent_tickets = [
        item for item in open_tickets
        if str(item.priority or "").lower() in {"high", "urgent"}
    ]
    if urgent_tickets:
        risks.append(
            f"{len(urgent_tickets)} high-priority support ticket(s) remain open."
        )

    if not primary_contact:
        risks.append("No primary customer contact is recorded.")

    if not open_opportunities:
        risks.append("No active revenue opportunity is recorded.")

    strongest_opportunity = max(
        open_opportunities,
        key=lambda item: (
            int(item.probability or 0),
            float(item.value or 0),
        ),
        default=None,
    )

    if urgent_tickets:
        next_action = (
            f"Resolve or escalate the highest-priority support issue before "
            f"the next commercial outreach to {customer.name}."
        )
    elif strongest_opportunity:
        next_action = (
            f"Advance '{strongest_opportunity.title}' from "
            f"{_label(strongest_opportunity.stage)} with a specific follow-up "
            "and agreed next step."
        )
    elif primary_contact:
        next_action = (
            f"Contact {primary_contact.first_name} "
            f"{primary_contact.last_name or ''}".strip()
            + " to validate current priorities and identify the next opportunity."
        )
    else:
        next_action = "Add a primary contact and schedule an initial relationship review."

    recent_activity = [
        {
            "title": item.title,
            "event_type": item.event_type,
            "description": item.description,
            "created_at": item.created_at,
        }
        for item in activities[:5]
    ]

    recent_communications = [
        {
            "type": item.type,
            "direction": item.direction,
            "subject": item.subject,
            "message": item.message,
            "created_at": item.created_at,
        }
        for item in communications[:3]
    ]

    executive_summary = (
        f"{customer.name} is a {_label(customer.status)} customer with "
        f"{_label(health)} health and a relationship score of "
        f"{relationship_score}/100. The account has "
        f"{len(open_opportunities)} active opportunity(ies) worth "
        f"{_money(pipeline_value)}, with a probability-weighted forecast of "
        f"{_money(weighted_forecast)}. There are {len(open_tickets)} open "
        f"support ticket(s) and {len(contacts)} recorded contact(s)."
    )

    return {
        "action": "summarize_customer",
        "title": f"{customer.name} Executive Summary",
        "reply": "\n\n".join(
            [
                executive_summary,
                "Risks:\n" + (
                    "\n".join(f"• {risk}" for risk in risks)
                    if risks
                    else "• No immediate material risks detected from recorded data."
                ),
                f"Recommended next action:\n• {next_action}",
            ]
        ),
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "status": customer.status,
            "health": customer.health,
            "relationship_score": relationship_score,
        },
        "metrics": {
            "contacts": len(contacts),
            "active_opportunities": len(open_opportunities),
            "pipeline_value": pipeline_value,
            "weighted_forecast": weighted_forecast,
            "open_tickets": len(open_tickets),
            "recent_communications": len(recent_communications),
        },
        "risks": risks,
        "recommended_next_action": next_action,
        "recent_activity": recent_activity,
        "recent_communications": recent_communications,
        "confidence": 1.0,
        "source": "customer_hub_database",
    }


def build_customer_next_action(customer: Customer) -> dict[str, Any]:
    summary = build_customer_summary(customer)
    next_action = str(summary["recommended_next_action"])
    risks = list(summary["risks"])

    steps = [
        "Confirm the account owner and responsible person.",
        "Complete the recommended outreach or operational action.",
        "Record the outcome in Customer Hub and set the next follow-up date.",
    ]

    reply = "\n\n".join(
        [
            f"Best next action for {customer.name}:\n• {next_action}",
            "Why this matters:\n• "
            + (
                risks[0]
                if risks
                else "This is the clearest recorded opportunity to strengthen the relationship or advance revenue."
            ),
            "Execution steps:\n" + "\n".join(f"{index + 1}. {step}" for index, step in enumerate(steps)),
        ]
    )

    return {
        **summary,
        "action": "recommend_next_action",
        "title": f"{customer.name} Recommended Next Action",
        "reply": reply,
        "execution_steps": steps,
    }


def build_customer_follow_up(customer: Customer) -> dict[str, Any]:
    summary = build_customer_summary(customer)
    contacts = list(customer.contacts or [])
    primary_contact = next(
        (item for item in contacts if bool(item.is_primary)),
        contacts[0] if contacts else None,
    )
    recipient_name = (
        f"{primary_contact.first_name} {primary_contact.last_name or ''}".strip()
        if primary_contact
        else "there"
    )
    next_action = str(summary["recommended_next_action"])

    subject = f"Next steps for {customer.name}"
    body = (
        f"Hi {recipient_name},\n\n"
        f"I wanted to follow up regarding our work with {customer.name}. "
        "Based on our current records, the most useful next step is to align on the immediate priority and confirm ownership of the next action.\n\n"
        f"Proposed next step: {next_action}\n\n"
        "Please let me know a suitable time to confirm the details and move this forward.\n\n"
        "Best regards"
    )

    return {
        **summary,
        "action": "draft_follow_up_email",
        "title": f"Follow-up Email for {customer.name}",
        "subject": subject,
        "email_body": body,
        "reply": f"Subject: {subject}\n\n{body}",
    }


def build_customer_proposal(customer: Customer) -> dict[str, Any]:
    summary = build_customer_summary(customer)
    opportunities = [
        item
        for item in list(customer.opportunities or [])
        if str(item.stage or "").lower() not in CLOSED_STAGES
    ]
    strongest = max(
        opportunities,
        key=lambda item: (int(item.probability or 0), float(item.value or 0)),
        default=None,
    )

    objective = (
        f"Advance {strongest.title} toward an agreed commercial decision."
        if strongest
        else f"Define and validate the next business opportunity with {customer.name}."
    )
    scope = [
        "Confirm the customer objective and success criteria.",
        "Define the proposed service, deliverables, responsibilities, and timeline.",
        "Agree the commercial structure and decision process.",
        "Set the implementation kickoff and reporting cadence.",
    ]
    missing = []
    if not strongest:
        missing.append("A specific opportunity has not been selected or recorded.")
    if not list(customer.contacts or []):
        missing.append("A decision-maker or primary contact is not recorded.")
    if not customer.notes:
        missing.append("Customer requirements and discovery notes are limited.")

    proposal_lines = [
        f"Proposal Outline — {customer.name}",
        "",
        f"1. Objective\n{objective}",
        "",
        "2. Proposed Scope\n" + "\n".join(f"• {item}" for item in scope),
        "",
        "3. Business Value\n"
        "• Create a clear path from current customer needs to an agreed outcome.\n"
        "• Improve accountability, delivery visibility, and speed of execution.",
        "",
        f"4. Commercial Context\n"
        f"• Active pipeline: {_money(float(summary['metrics']['pipeline_value']))}\n"
        f"• Weighted forecast: {_money(float(summary['metrics']['weighted_forecast']))}",
        "",
        "5. Next Step\n"
        f"• {summary['recommended_next_action']}",
    ]
    if missing:
        proposal_lines.extend(
            ["", "Missing Information\n" + "\n".join(f"• {item}" for item in missing)]
        )

    return {
        **summary,
        "action": "generate_proposal_outline",
        "title": f"Proposal Outline for {customer.name}",
        "reply": "\n".join(proposal_lines),
        "proposal": {
            "objective": objective,
            "scope": scope,
            "next_step": summary["recommended_next_action"],
            "missing_information": missing,
        },
    }


def execute_customer_sonny_action(
    customer: Customer,
    *,
    action: str,
) -> dict[str, Any]:
    normalized = str(action or "").strip().lower()

    handlers = {
        "summary": build_customer_summary,
        "summarize_customer": build_customer_summary,
        "next_action": build_customer_next_action,
        "recommend_next_action": build_customer_next_action,
        "follow_up": build_customer_follow_up,
        "draft_follow_up_email": build_customer_follow_up,
        "proposal": build_customer_proposal,
        "generate_proposal_outline": build_customer_proposal,
    }

    handler = handlers.get(normalized)
    if not handler:
        raise ValueError(f"Unsupported Customer Hub Sonny action: {action}")

    return handler(customer)
