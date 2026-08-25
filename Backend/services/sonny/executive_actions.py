from __future__ import annotations

import datetime
from typing import Any, Callable

from sqlalchemy.orm import Session

from models.meeting_booking import MeetingBooking
from models.usage_ledger import UsageLedger
from services.activity_service import record_activity
from services.ledger_service import record_usage


EXECUTIVE_ACTIONS_VERSION = "v8.0.0"

ActionHandler = Callable[
    [dict[str, Any], dict[str, Any]],
    dict[str, Any],
]

ACTION_HANDLERS: dict[str, ActionHandler] = {}


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def get_db(context: dict[str, Any]) -> Session:
    db = context.get("db")
    if not isinstance(db, Session):
        raise ValueError("A SQLAlchemy database session is required.")
    return db


def get_company(context: dict[str, Any]) -> Any:
    company = context.get("company")
    if company is None:
        raise ValueError("A verified company is required.")
    return company


def get_actor_id(context: dict[str, Any]) -> str:
    token = safe_dict(context.get("token"))
    return clean_text(
        context.get("actor_id")
        or token.get("sub")
        or token.get("email")
        or "sonny"
    )


def register_action(action_name: str, handler: ActionHandler) -> None:
    name = clean_text(action_name).lower()
    if not name:
        raise ValueError("action_name cannot be empty")
    if not callable(handler):
        raise TypeError("handler must be callable")
    ACTION_HANDLERS[name] = handler


def build_action_result(
    *,
    action: str,
    status: str,
    message: str,
    data: dict[str, Any] | None = None,
    requires_confirmation: bool = False,
) -> dict[str, Any]:
    return {
        "actions_version": EXECUTIVE_ACTIONS_VERSION,
        "action": clean_text(action).lower(),
        "status": clean_text(status).lower(),
        "message": clean_text(message),
        "requires_confirmation": requires_confirmation,
        "data": safe_dict(data),
    }


def validate_action_request(
    action_request: dict[str, Any],
) -> tuple[bool, str, str, dict[str, Any]]:
    if not isinstance(action_request, dict):
        return False, "", "Action request must be a dictionary.", {}

    action = clean_text(action_request.get("action")).lower()
    parameters = safe_dict(action_request.get("parameters"))

    if not action:
        return False, "", "Action name is required.", parameters

    missing_fields = action_request.get("missing_fields")
    if isinstance(missing_fields, list) and missing_fields:
        return (
            False,
            action,
            "The action is missing required information: "
            + ", ".join(str(item) for item in missing_fields),
            parameters,
        )

    return True, action, "", parameters


def execute_action(
    *,
    context: dict[str, Any],
    action_request: dict[str, Any],
    confirmed: bool = False,
) -> dict[str, Any]:
    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")

    valid, action, error, parameters = validate_action_request(action_request)

    if not valid:
        return build_action_result(
            action=action,
            status="invalid",
            message=error,
            data={"parameters": parameters},
        )

    handler = ACTION_HANDLERS.get(action)
    if handler is None:
        return build_action_result(
            action=action,
            status="unsupported",
            message=f"The action '{action}' is not supported yet.",
        )

    requires_confirmation = bool(
        action_request.get("requires_confirmation", True)
    )

    if requires_confirmation and not confirmed:
        return build_action_result(
            action=action,
            status="confirmation_required",
            message="This action changes company data and requires confirmation.",
            data={"parameters": parameters},
            requires_confirmation=True,
        )

    try:
        return_payload = handler(context, parameters)
        if not isinstance(return_payload, dict):
            raise TypeError("Action handler returned an invalid response.")

        return build_action_result(
            action=action,
            status=clean_text(return_payload.get("status")) or "completed",
            message=clean_text(return_payload.get("message")) or "Action completed.",
            data=safe_dict(return_payload.get("data")),
        )
    except Exception as exc:
        db = context.get("db")
        if isinstance(db, Session):
            db.rollback()

        return build_action_result(
            action=action,
            status="failed",
            message="The action could not be completed.",
            data={
                "error_type": type(exc).__name__,
                "error": clean_text(exc),
            },
        )


def serialize_booking(booking: MeetingBooking) -> dict[str, Any]:
    return {
        "id": booking.id,
        "company_id": booking.company_id,
        "room_id": booking.room_id,
        "room_name": booking.room_name,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "duration_hours": booking.duration_hours,
        "hourly_price_usd": booking.hourly_price_usd,
        "status": booking.status,
        "created_at": booking.created_at.isoformat() if booking.created_at else None,
        "cancelled_at": (
            booking.cancelled_at.isoformat()
            if booking.cancelled_at
            else None
        ),
    }


def schedule_meeting_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    db = get_db(context)
    company = get_company(context)

    company_id = clean_text(parameters.get("company_id") or company.id)
    if company_id != str(company.id):
        raise ValueError("The action company does not match the verified company.")

    if clean_text(getattr(company, "status", "")).lower() == "terminated":
        raise ValueError("Cannot book a meeting for a terminated company.")

    if not getattr(company, "headquarters_office_code", None):
        raise ValueError("Activate Headquarters before booking a meeting room.")

    booking_date = clean_text(parameters.get("booking_date"))
    booking_time = clean_text(parameters.get("booking_time"))
    room_name = clean_text(parameters.get("room_name"))
    room_id = int(parameters.get("room_id") or 0)
    duration_hours = int(parameters.get("duration_hours") or 1)
    hourly_price_usd = float(parameters.get("hourly_price_usd") or 25.0)

    if not booking_date or not booking_time:
        raise ValueError("Booking date and time are required.")
    if not room_id or not room_name:
        raise ValueError("A valid meeting room is required.")

    duplicate = (
        db.query(MeetingBooking)
        .filter(
            MeetingBooking.company_id == company_id,
            MeetingBooking.room_id == room_id,
            MeetingBooking.booking_date == booking_date,
            MeetingBooking.booking_time == booking_time,
            MeetingBooking.status == "confirmed",
        )
        .first()
    )
    if duplicate:
        raise ValueError("That room is already booked at the selected time.")

    booking = MeetingBooking(
        company_id=company_id,
        room_id=room_id,
        room_name=room_name,
        booking_date=booking_date,
        booking_time=booking_time,
        duration_hours=max(1, duration_hours),
        hourly_price_usd=max(0.0, hourly_price_usd),
        status="confirmed",
    )

    db.add(booking)
    db.flush()

    ledger_entry = record_usage(
        db,
        company_id=company_id,
        service="meeting_center",
        category="usage",
        resource=room_name,
        action="room_booking",
        quantity=booking.duration_hours,
        unit="hour",
        unit_price=booking.hourly_price_usd,
        tax_rate=0.05,
        source_type="meeting_booking",
        source_id=booking.id,
        metadata={
            "booking_date": booking_date,
            "booking_time": booking_time,
            "room_id": room_id,
            "created_by": "sonny",
            "meeting_title": clean_text(parameters.get("title")),
        },
        commit=False,
    )

    booking.ledger_entry_id = ledger_entry.id

    record_activity(
        db,
        company_id=company_id,
        event_type="meeting_room_booked",
        title=f"{room_name} booked by Sonny",
        description=(
            f"{booking.duration_hours} hour(s) booked on "
            f"{booking_date} at {booking_time}."
        ),
        actor_type="sonny",
        actor_id=get_actor_id(context),
        source_type="meeting_booking",
        source_id=booking.id,
        commit=False,
    )

    db.commit()
    db.refresh(booking)

    return {
        "status": "completed",
        "message": (
            f"Done. {room_name} is booked for {booking_date} "
            f"at {booking_time}."
        ),
        "data": {
            "booking": serialize_booking(booking),
            "title": clean_text(parameters.get("title")) or "Business Meeting",
        },
    }


def cancel_meeting_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    db = get_db(context)
    company = get_company(context)

    booking_id = clean_text(
        parameters.get("booking_id") or parameters.get("meeting_id")
    )
    if not booking_id:
        raise ValueError("A verified booking_id is required.")

    booking = (
        db.query(MeetingBooking)
        .filter(
            MeetingBooking.id == booking_id,
            MeetingBooking.company_id == str(company.id),
        )
        .first()
    )

    if not booking:
        raise ValueError("Meeting booking not found.")

    if booking.status == "cancelled":
        return {
            "status": "completed",
            "message": "The meeting booking was already cancelled.",
            "data": {"booking": serialize_booking(booking)},
        }

    booking.status = "cancelled"
    booking.cancelled_at = datetime.datetime.utcnow()

    if booking.ledger_entry_id:
        ledger_entry = (
            db.query(UsageLedger)
            .filter(
                UsageLedger.id == booking.ledger_entry_id,
                UsageLedger.status == "unbilled",
            )
            .first()
        )
        if ledger_entry:
            ledger_entry.status = "void"

    record_activity(
        db,
        company_id=str(company.id),
        event_type="meeting_room_cancelled",
        title=f"{booking.room_name} booking cancelled by Sonny",
        description=(
            f"The booking on {booking.booking_date} "
            f"at {booking.booking_time} was cancelled."
        ),
        actor_type="sonny",
        actor_id=get_actor_id(context),
        source_type="meeting_booking",
        source_id=booking.id,
        commit=False,
    )

    db.commit()
    db.refresh(booking)

    return {
        "status": "completed",
        "message": "Done. The meeting booking has been cancelled.",
        "data": {"booking": serialize_booking(booking)},
    }


def create_task_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Uses the Task model dynamically because older Firmic branches store it
    in different modules. This keeps the action layer compatible.
    """
    db = get_db(context)
    company = get_company(context)
    title = clean_text(parameters.get("title"))

    if not title:
        raise ValueError("Task title is required.")

    try:
        from models.task import Task
    except ImportError:
        from models.company import Task

    task_fields = {
        "company_id": str(company.id),
        "title": title,
        "description": clean_text(parameters.get("description"))
        or "Created by Sonny Executive Actions.",
        "status": "pending",
    }

    assignee = clean_text(parameters.get("assignee"))
    if assignee and hasattr(Task, "assignee"):
        task_fields["assignee"] = assignee
    elif assignee and hasattr(Task, "assigned_to"):
        task_fields["assigned_to"] = assignee

    task = Task(**task_fields)
    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "status": "completed",
        "message": f'Done. I created the task "{title}".',
        "data": {
            "task_id": str(task.id),
            "title": title,
            "assignee": assignee or None,
        },
    }


def assign_task_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    db = get_db(context)
    company = get_company(context)

    task_id = clean_text(parameters.get("task_id"))
    assignee = clean_text(parameters.get("assignee"))

    if not task_id:
        raise ValueError("A verified task_id is required.")
    if not assignee:
        raise ValueError("An assignee is required.")

    try:
        from models.task import Task
    except ImportError:
        from models.company import Task

    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.company_id == str(company.id),
        )
        .first()
    )
    if not task:
        raise ValueError("Task not found.")

    if hasattr(task, "assignee"):
        task.assignee = assignee
    elif hasattr(task, "assigned_to"):
        task.assigned_to = assignee
    else:
        raise ValueError("The Task model has no assignee field.")

    db.commit()
    db.refresh(task)

    return {
        "status": "completed",
        "message": f"Done. The task has been assigned to {assignee}.",
        "data": {
            "task_id": str(task.id),
            "assignee": assignee,
        },
    }




def inspect_usage_ledger_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Read-only Finance AI inspection of the verified tenant's usage ledger.
    """
    db = get_db(context)
    company = get_company(context)

    company_id = str(company.id)

    requested_company_id = clean_text(
        parameters.get("company_id")
    )

    if requested_company_id and requested_company_id != company_id:
        raise ValueError(
            "The requested ledger company does not match "
            "the verified company."
        )

    limit = int(parameters.get("limit") or 100)
    limit = max(1, min(limit, 500))

    query = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id == company_id
        )
        .order_by(
            UsageLedger.created_at.desc()
        )
        .limit(limit)
    )

    entries = query.all()

    total_amount = 0.0
    unbilled_amount = 0.0
    billed_amount = 0.0

    serialized_entries = []

    for entry in entries:
        quantity = float(
            getattr(entry, "quantity", 0) or 0
        )
        unit_price = float(
            getattr(entry, "unit_price", 0) or 0
        )
        tax_rate = float(
            getattr(entry, "tax_rate", 0) or 0
        )

        subtotal = quantity * unit_price
        total = subtotal * (1 + tax_rate)

        status = clean_text(
            getattr(entry, "status", "")
        ).lower()

        total_amount += total

        if status == "unbilled":
            unbilled_amount += total

        if status == "billed":
            billed_amount += total

        serialized_entries.append(
            {
                "id": str(entry.id),
                "service": getattr(entry, "service", None),
                "category": getattr(entry, "category", None),
                "resource": getattr(entry, "resource", None),
                "action": getattr(entry, "action", None),
                "quantity": quantity,
                "unit": getattr(entry, "unit", None),
                "unit_price": unit_price,
                "tax_rate": tax_rate,
                "estimated_total": round(total, 2),
                "status": status,
                "source_type": getattr(entry, "source_type", None),
                "source_id": getattr(entry, "source_id", None),
                "created_at": (
                    entry.created_at.isoformat()
                    if getattr(entry, "created_at", None)
                    else None
                ),
            }
        )

    return {
        "status": "completed",
        "message": (
            f"Reviewed {len(entries)} usage ledger entries "
            "for the verified company."
        ),
        "data": {
            "company_id": company_id,
            "entry_count": len(entries),
            "total_estimated_usd": round(total_amount, 2),
            "unbilled_estimated_usd": round(unbilled_amount, 2),
            "billed_estimated_usd": round(billed_amount, 2),
            "entries": serialized_entries,
        },
    }


def prepare_billing_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Finance AI preparation step.

    This action does NOT mutate billing records. It prepares a bounded
    recommendation that can later be reviewed/approved before any
    billing mutation occurs.
    """
    db = get_db(context)
    company = get_company(context)

    company_id = str(company.id)

    entries = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id == company_id,
            UsageLedger.status == "unbilled",
        )
        .order_by(
            UsageLedger.created_at.asc()
        )
        .all()
    )

    subtotal = 0.0
    tax_total = 0.0

    services: dict[str, float] = {}

    for entry in entries:
        quantity = float(
            getattr(entry, "quantity", 0) or 0
        )
        unit_price = float(
            getattr(entry, "unit_price", 0) or 0
        )
        tax_rate = float(
            getattr(entry, "tax_rate", 0) or 0
        )

        line_subtotal = quantity * unit_price
        line_tax = line_subtotal * tax_rate

        subtotal += line_subtotal
        tax_total += line_tax

        service = clean_text(
            getattr(entry, "service", None)
        ) or "other"

        services[service] = (
            services.get(service, 0.0)
            + line_subtotal
            + line_tax
        )

    total = subtotal + tax_total

    recommendation = {
        "company_id": company_id,
        "unbilled_entry_count": len(entries),
        "subtotal_usd": round(subtotal, 2),
        "tax_usd": round(tax_total, 2),
        "estimated_total_usd": round(total, 2),
        "service_totals_usd": {
            key: round(value, 2)
            for key, value in sorted(services.items())
        },
        "recommended_next_action": (
            "review_and_approve_billing"
            if entries
            else "no_billing_action_required"
        ),
        "mutation_performed": False,
    }

    return {
        "status": "completed",
        "message": (
            "Finance AI prepared a billing recommendation. "
            "No billing records were changed."
        ),
        "data": recommendation,
    }




def review_support_queue_action(
    context: dict[str, Any],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Read-only Support AI inspection of the verified tenant's
    support-ticket queue.

    This action never mutates, assigns, responds to, or closes
    a support ticket.
    """
    db = get_db(context)
    company = get_company(context)

    company_id = str(company.id)

    requested_company_id = clean_text(
        parameters.get("company_id")
    )

    if (
        requested_company_id
        and requested_company_id != company_id
    ):
        raise ValueError(
            "The requested support company does not match "
            "the verified company."
        )

    try:
        from models.support_ticket import SupportTicket
    except ImportError:
        from models.company import SupportTicket

    limit = int(parameters.get("limit") or 100)
    limit = max(1, min(limit, 500))

    tickets = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.company_id == company_id
        )
        .order_by(
            SupportTicket.updated_at.desc()
        )
        .limit(limit)
        .all()
    )

    terminal_statuses = {
        "resolved",
        "closed",
        "completed",
        "cancelled",
        "canceled",
    }

    serialized = []
    open_count = 0
    urgent_count = 0

    for ticket in tickets:
        status = clean_text(
            getattr(ticket, "status", "")
        ).lower()

        priority = clean_text(
            getattr(ticket, "priority", "")
        ).lower()

        is_open = status not in terminal_statuses

        if is_open:
            open_count += 1

        if is_open and priority == "urgent":
            urgent_count += 1

        serialized.append(
            {
                "id": str(ticket.id),
                "status": status,
                "priority": priority,
                "subject": getattr(
                    ticket,
                    "subject",
                    None,
                ),
                "assigned_to": getattr(
                    ticket,
                    "assigned_to",
                    None,
                ),
                "created_at": (
                    ticket.created_at.isoformat()
                    if getattr(
                        ticket,
                        "created_at",
                        None,
                    )
                    else None
                ),
                "updated_at": (
                    ticket.updated_at.isoformat()
                    if getattr(
                        ticket,
                        "updated_at",
                        None,
                    )
                    else None
                ),
            }
        )

    return {
        "status": "completed",
        "message": (
            f"Reviewed {len(tickets)} support tickets "
            "for the verified company."
        ),
        "data": {
            "company_id": company_id,
            "ticket_count": len(tickets),
            "open_count": open_count,
            "urgent_open_count": urgent_count,
            "tickets": serialized,
            "mutation_performed": False,
        },
    }


register_action("schedule_meeting", schedule_meeting_action)
register_action("cancel_meeting", cancel_meeting_action)
register_action("create_task", create_task_action)
register_action("assign_task", assign_task_action)
register_action("inspect_usage_ledger", inspect_usage_ledger_action)

register_action(
    "review_support_queue",
    review_support_queue_action,
)
register_action("prepare_billing_action", prepare_billing_action)


def list_registered_actions() -> list[str]:
    return sorted(ACTION_HANDLERS.keys())
