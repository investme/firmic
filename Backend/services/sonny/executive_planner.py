from __future__ import annotations

import datetime
import re
from typing import Any


EXECUTIVE_PLANNER_VERSION = "v8.2.0"


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_message(value: Any) -> str:
    return " ".join(clean_text(value).lower().split())


def safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def contains_any(message: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in message for keyword in keywords)


def get_company_id(context: dict[str, Any]) -> Any:
    return context.get("company_id")


def get_state(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(context.get("state"))


def get_items(context: dict[str, Any], section_name: str) -> list[Any]:
    section = safe_dict(get_state(context).get(section_name))
    return safe_list(section.get("items"))


def build_action_plan(
    *,
    action: str,
    parameters: dict[str, Any] | None = None,
    confidence: float = 0.0,
    requires_confirmation: bool = True,
    reason: str = "",
    missing_fields: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "planner_version": EXECUTIVE_PLANNER_VERSION,
        "action": clean_text(action).lower(),
        "parameters": safe_dict(parameters),
        "confidence": max(0.0, min(float(confidence or 0.0), 1.0)),
        "requires_confirmation": bool(requires_confirmation),
        "reason": clean_text(reason),
        "missing_fields": safe_list(missing_fields),
        "ready_to_execute": bool(action) and not safe_list(missing_fields),
    }


def build_no_action_plan(reason: str) -> dict[str, Any]:
    return build_action_plan(
        action="",
        parameters={},
        confidence=0.0,
        requires_confirmation=False,
        reason=reason,
    )


def extract_agent_name(message: str) -> str:
    for agent in ("sonny", "hermes", "julia"):
        if agent in message:
            return agent.title()
    return ""


def extract_task_reference(
    context: dict[str, Any],
    message: str,
) -> dict[str, Any] | None:
    for item in get_items(context, "tasks"):
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title"))
        if title and normalize_message(title) in message:
            return {"task_id": item.get("id"), "task_title": title}
    return None


def extract_meeting_reference(
    context: dict[str, Any],
    message: str,
) -> dict[str, Any] | None:
    for item in get_items(context, "meetings"):
        if not isinstance(item, dict):
            continue

        title = clean_text(item.get("title") or item.get("room_name"))
        booking_id = item.get("id") or item.get("booking_id")

        if title and normalize_message(title) in message:
            return {
                "booking_id": booking_id,
                "meeting_title": title,
            }

    return None


def resolve_date(message: str, today: datetime.date | None = None) -> str:
    current = today or datetime.date.today()

    if "day after tomorrow" in message:
        return (current + datetime.timedelta(days=2)).isoformat()

    if "tomorrow" in message:
        return (current + datetime.timedelta(days=1)).isoformat()

    if "today" in message:
        return current.isoformat()

    iso_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", message)
    if iso_match:
        return iso_match.group(1)

    slash_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b", message)
    if slash_match:
        day = int(slash_match.group(1))
        month = int(slash_match.group(2))
        year = int(slash_match.group(3) or current.year)
        try:
            result = datetime.date(year, month, day)
            if result < current and not slash_match.group(3):
                result = datetime.date(year + 1, month, day)
            return result.isoformat()
        except ValueError:
            return ""

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }

    for name, weekday in weekdays.items():
        if name in message:
            days_ahead = (weekday - current.weekday()) % 7
            if days_ahead == 0 or f"next {name}" in message:
                days_ahead = 7
            return (current + datetime.timedelta(days=days_ahead)).isoformat()

    return ""


def resolve_time(message: str) -> str:
    time_match = re.search(
        r"\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
        message,
        re.IGNORECASE,
    )
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        suffix = time_match.group(3).lower()

        if hour == 12:
            hour = 0
        if suffix == "pm":
            hour += 12

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"

    time_24 = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", message)
    if time_24:
        return f"{int(time_24.group(1)):02d}:{time_24.group(2)}"

    # Firmic executive defaults for broad dayparts.
    if "morning" in message:
        return "10:00"
    if "afternoon" in message:
        return "15:00"
    if "evening" in message:
        return "18:00"

    return ""


def resolve_duration(message: str) -> int:
    match = re.search(
        r"\b(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b",
        message,
        re.IGNORECASE,
    )
    if match:
        return max(1, int(float(match.group(1))))

    minutes = re.search(r"\b(\d+)\s*(minute|minutes|min|mins)\b", message)
    if minutes:
        return max(1, round(int(minutes.group(1)) / 60))

    return 1


def resolve_room(message: str) -> dict[str, Any]:
    rooms = (
        (1, "Hub71 Focus Room", 25.0, ("focus room", "hub71 focus")),
        (2, "Abu Dhabi Client Room", 25.0, ("client room", "client meeting")),
        (3, "Executive Boardroom", 35.0, ("boardroom", "executive room")),
        (4, "Founder Workshop Room", 45.0, ("workshop room", "workshop")),
    )

    for room_id, room_name, price, aliases in rooms:
        if any(alias in message for alias in aliases):
            return {
                "room_id": room_id,
                "room_name": room_name,
                "hourly_price_usd": price,
            }

    # A client meeting defaults to the client room; otherwise use Focus Room.
    if "client" in message:
        return {
            "room_id": 2,
            "room_name": "Abu Dhabi Client Room",
            "hourly_price_usd": 25.0,
        }

    return {
        "room_id": 1,
        "room_name": "Hub71 Focus Room",
        "hourly_price_usd": 25.0,
    }


def extract_meeting_title(message: str) -> str:
    cleaned = clean_text(message)

    patterns = (
        r"(?:schedule|book|set up|arrange|create)\s+(?:a\s+)?(?:meeting|appointment|booking|reservation)\s+(?:with\s+)?(.+)",
        r"(?:meeting|appointment)\s+with\s+(.+)",
    )

    title = ""
    for pattern in patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            title = match.group(1)
            break

    title = re.split(
        r"\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d|in the morning|morning|afternoon|evening)\b",
        title,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip(" ,.-")

    if title:
        if title.lower().startswith("the "):
            title = title[4:]
        return f"Meeting with {title}"

    return "Client Meeting" if "client" in normalize_message(message) else "Business Meeting"


def plan_schedule_meeting(
    context: dict[str, Any],
    founder_message: str,
) -> dict[str, Any]:
    normalized = normalize_message(founder_message)
    booking_date = resolve_date(normalized)
    booking_time = resolve_time(normalized)
    room = resolve_room(normalized)
    missing_fields: list[str] = []

    if not booking_date:
        missing_fields.append("booking_date")
    if not booking_time:
        missing_fields.append("booking_time")

    parameters = {
        "company_id": get_company_id(context),
        "title": extract_meeting_title(founder_message),
        "booking_date": booking_date,
        "booking_time": booking_time,
        "duration_hours": resolve_duration(normalized),
        **room,
    }

    return build_action_plan(
        action="schedule_meeting",
        parameters=parameters,
        confidence=0.95 if not missing_fields else 0.62,
        requires_confirmation=True,
        reason=(
            "Prepare a verified room booking for founder confirmation."
            if not missing_fields
            else "A meeting was requested, but the date or time is incomplete."
        ),
        missing_fields=missing_fields,
    )


def plan_cancel_meeting(
    context: dict[str, Any],
    founder_message: str,
) -> dict[str, Any]:
    normalized = normalize_message(founder_message)
    reference = extract_meeting_reference(context, normalized)

    if not reference:
        return build_action_plan(
            action="cancel_meeting",
            parameters={"company_id": get_company_id(context)},
            confidence=0.35,
            requires_confirmation=True,
            reason="No verified meeting booking could be matched.",
            missing_fields=["booking_id"],
        )

    return build_action_plan(
        action="cancel_meeting",
        parameters={
            **reference,
            "company_id": get_company_id(context),
        },
        confidence=0.96,
        requires_confirmation=True,
        reason="Cancel the verified meeting booking.",
    )


def plan_assign_task(
    context: dict[str, Any],
    founder_message: str,
) -> dict[str, Any]:
    normalized = normalize_message(founder_message)
    assignee = extract_agent_name(normalized)
    reference = extract_task_reference(context, normalized)
    missing_fields: list[str] = []

    if not assignee:
        missing_fields.append("assignee")
    if not reference:
        missing_fields.append("task_id")

    return build_action_plan(
        action="assign_task",
        parameters={
            **(reference or {}),
            "assignee": assignee,
            "company_id": get_company_id(context),
        },
        confidence=0.96 if not missing_fields else 0.45,
        requires_confirmation=True,
        reason="Assign a verified task to the selected AI employee.",
        missing_fields=missing_fields,
    )


def plan_create_task(
    context: dict[str, Any],
    founder_message: str,
) -> dict[str, Any]:
    message = clean_text(founder_message)
    normalized = normalize_message(message)
    assignee = extract_agent_name(normalized)
    task_title = message

    for phrase in (
        "create a task to",
        "create task to",
        "add a task to",
        "add task to",
        "create a task",
        "create task",
        "add a task",
        "add task",
    ):
        index = normalized.find(phrase)
        if index >= 0:
            task_title = message[index + len(phrase):].strip(" :.-")
            break

    if assignee:
        task_title = re.sub(
            rf"\b{re.escape(assignee)}\b",
            "",
            task_title,
            flags=re.IGNORECASE,
        ).strip(" :.-")

    return build_action_plan(
        action="create_task",
        parameters={
            "title": task_title,
            "assignee": assignee or None,
            "company_id": get_company_id(context),
        },
        confidence=0.84 if task_title else 0.35,
        requires_confirmation=True,
        reason="Create a new company task.",
        missing_fields=[] if task_title else ["title"],
    )


def detect_action_intent(founder_message: str) -> str:
    message = normalize_message(founder_message)

    if not message:
        return "none"

    meeting_words = ("meeting", "appointment", "booking", "reservation")

    if (
        contains_any(message, ("cancel", "delete", "remove"))
        and contains_any(message, meeting_words)
    ):
        return "cancel_meeting"

    if (
        contains_any(message, ("schedule", "book", "set up", "setup", "arrange", "create"))
        and contains_any(message, meeting_words)
    ):
        return "schedule_meeting"

    if (
        contains_any(message, ("assign", "delegate", "give this task to"))
        and contains_any(message, ("task", "hermes", "julia", "sonny"))
    ):
        return "assign_task"

    if contains_any(
        message,
        ("create task", "create a task", "add task", "add a task"),
    ):
        return "create_task"

    return "none"


def plan_executive_action(
    context: dict[str, Any],
    founder_message: str | None = None,
) -> dict[str, Any]:
    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")

    message = clean_text(
        founder_message
        if founder_message is not None
        else context.get("founder_message")
    )

    action_intent = detect_action_intent(message)

    handlers = {
        "schedule_meeting": plan_schedule_meeting,
        "cancel_meeting": plan_cancel_meeting,
        "assign_task": plan_assign_task,
        "create_task": plan_create_task,
    }

    handler = handlers.get(action_intent)
    if handler:
        return handler(context, message)

    return build_no_action_plan("No executable company action was detected.")


def build_planner_payload(
    context: dict[str, Any],
    founder_message: str | None = None,
) -> dict[str, Any]:
    plan = plan_executive_action(
        context=context,
        founder_message=founder_message,
    )

    return {
        "planner_version": EXECUTIVE_PLANNER_VERSION,
        "company_id": context.get("company_id"),
        "company_name": context.get("company_name"),
        "plan": plan,
        "has_action": bool(clean_text(plan.get("action"))),
        "ready_to_execute": bool(plan.get("ready_to_execute")),
        "requires_confirmation": bool(
            plan.get("requires_confirmation", False)
        ),
        "confidence": float(plan.get("confidence") or 0.0),
        "missing_fields": safe_list(plan.get("missing_fields")),
    }
