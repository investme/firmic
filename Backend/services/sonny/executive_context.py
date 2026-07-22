from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from services.sonny.executive_advisor import (
    build_advisor_prompt_context,
    build_executive_advice,
)
from services.sonny.executive_brief import (
    build_brief_prompt_context,
    build_executive_brief,
)
from services.sonny.knowledge import (
    build_knowledge_prompt_context,
    get_or_create_company_knowledge,
)
from services.sonny.state import (
    build_company_state,
    build_state_prompt_context,
)


EXECUTIVE_CONTEXT_VERSION = "b7.4.0"

PRIORITY_ORDER: dict[str, int] = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def trim_text(
    value: Any,
    limit: int,
) -> str:
    text = clean_text(value)

    if limit <= 0:
        return ""

    if len(text) <= limit:
        return text

    if limit <= 3:
        return text[:limit]

    return text[: limit - 3].rstrip() + "..."


def as_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def priority_rank(value: Any) -> int:
    return PRIORITY_ORDER.get(
        clean_text(value).lower(),
        99,
    )


def safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def build_memory_context(
    state: dict[str, Any],
    *,
    limit: int = 8,
    item_limit: int = 600,
) -> str:
    memory = safe_dict(
        state.get("memory")
    )

    memories = safe_list(
        memory.get("items")
    )

    selected = memories[: max(limit, 0)]

    if not selected:
        return "No recent Sonny memory is available."

    lines: list[str] = []

    for raw_item in selected:
        item = safe_dict(raw_item)

        if not item:
            continue

        memory_type = (
            clean_text(
                item.get("memory_type")
            )
            or "memory"
        )

        title = (
            clean_text(
                item.get("title")
            )
            or "Untitled memory"
        )

        content = trim_text(
            item.get("content"),
            item_limit,
        )

        created_at = (
            clean_text(
                item.get("created_at")
            )
            or "unknown time"
        )

        line = (
            f"- [{memory_type}] "
            f"{title} ({created_at})"
        )

        if content:
            line += f": {content}"

        lines.append(line)

    if not lines:
        return "No recent Sonny memory is available."

    return "\n".join(lines)


def build_activity_context(
    state: dict[str, Any],
    *,
    limit: int = 10,
    item_limit: int = 350,
) -> str:
    activity = safe_dict(
        state.get("activity")
    )

    items = safe_list(
        activity.get("items")
    )

    selected = items[: max(limit, 0)]

    if not selected:
        return "No recent company activity is available."

    lines: list[str] = []

    for raw_item in selected:
        item = safe_dict(raw_item)

        if not item:
            continue

        event_type = (
            clean_text(
                item.get("event_type")
            )
            or "activity"
        )

        title = (
            clean_text(
                item.get("title")
            )
            or "Untitled activity"
        )

        description = trim_text(
            item.get("description"),
            item_limit,
        )

        created_at = (
            clean_text(
                item.get("created_at")
            )
            or "unknown time"
        )

        line = (
            f"- [{event_type}] "
            f"{title} ({created_at})"
        )

        if description:
            line += f": {description}"

        lines.append(line)

    if not lines:
        return "No recent company activity is available."

    return "\n".join(lines)


def build_executive_priorities(
    state: dict[str, Any],
    *,
    limit: int = 7,
) -> list[dict[str, Any]]:
    intelligence = safe_dict(
        state.get("intelligence")
    )

    alerts = safe_list(
        intelligence.get("alerts")
    )

    recommendations = safe_list(
        intelligence.get("recommendations")
    )

    priorities: list[dict[str, Any]] = []

    for raw_alert in alerts:
        alert = safe_dict(raw_alert)

        if not alert:
            continue

        priorities.append(
            {
                "kind": "risk",
                "code": (
                    clean_text(
                        alert.get("code")
                    )
                    or None
                ),
                "priority": (
                    clean_text(
                        alert.get("severity")
                    ).lower()
                    or "medium"
                ),
                "title": (
                    clean_text(
                        alert.get("title")
                    )
                    or "Untitled risk"
                ),
                "detail": (
                    clean_text(
                        alert.get("detail")
                    )
                    or None
                ),
                "source": (
                    clean_text(
                        alert.get("source")
                    )
                    or None
                ),
                "target": None,
            }
        )

    for raw_recommendation in recommendations:
        recommendation = safe_dict(
            raw_recommendation
        )

        if not recommendation:
            continue

        priorities.append(
            {
                "kind": "action",
                "code": (
                    clean_text(
                        recommendation.get("code")
                    )
                    or None
                ),
                "priority": (
                    clean_text(
                        recommendation.get("priority")
                    ).lower()
                    or "medium"
                ),
                "title": (
                    clean_text(
                        recommendation.get("title")
                    )
                    or "Untitled action"
                ),
                "detail": (
                    clean_text(
                        recommendation.get("detail")
                    )
                    or None
                ),
                "source": (
                    clean_text(
                        recommendation.get("source")
                    )
                    or None
                ),
                "target": recommendation.get("target"),
            }
        )

    priorities.sort(
        key=lambda item: (
            priority_rank(
                item.get("priority")
            ),
            (
                0
                if item.get("kind") == "risk"
                else 1
            ),
            clean_text(
                item.get("title")
            ).lower(),
        )
    )

    return priorities[: max(limit, 0)]


def build_priority_context(
    priorities: list[dict[str, Any]],
) -> str:
    if not priorities:
        return (
            "No urgent executive priorities "
            "were detected."
        )

    lines: list[str] = []

    for index, item in enumerate(
        priorities,
        start=1,
    ):
        kind = (
            clean_text(
                item.get("kind")
            ).upper()
            or "ITEM"
        )

        priority = (
            clean_text(
                item.get("priority")
            ).upper()
            or "MEDIUM"
        )

        title = (
            clean_text(
                item.get("title")
            )
            or "Untitled priority"
        )

        detail = clean_text(
            item.get("detail")
        )

        line = (
            f"{index}. "
            f"[{priority} {kind}] "
            f"{title}"
        )

        if detail:
            line += f" — {detail}"

        lines.append(line)

    return "\n".join(lines)


def build_executive_prompt_context(
    *,
    company_state_context: str,
    brief_context: str,
    advisor_context: str,
    knowledge_context: str,
    priorities_context: str,
    activity_context: str,
    memory_context: str,
    founder_message: str | None = None,
) -> str:
    message = clean_text(
        founder_message
    )

    sections: list[
        tuple[str, str]
    ] = [
        (
            "ROLE",
            (
                "You are Sonny, Firmic's AI Chief "
                "Operating Officer. Use verified "
                "company data, executive analysis, "
                "company knowledge, recent memory "
                "and live activity to provide "
                "practical executive guidance."
            ),
        ),
        (
            "OPERATING RULES",
            "\n".join(
                [
                    (
                        "- Treat live company state as "
                        "the source of truth for "
                        "operational facts."
                    ),
                    (
                        "- Use the executive brief for "
                        "company health, priorities "
                        "and current focus."
                    ),
                    (
                        "- Use executive advice for "
                        "risks, recommendations, "
                        "delegation ideas and plans."
                    ),
                    (
                        "- Treat company knowledge as "
                        "strategic context, not proof "
                        "of live execution."
                    ),
                    (
                        "- Never invent records, "
                        "payments, documents, tasks, "
                        "people or completed actions."
                    ),
                    (
                        "- Clearly distinguish facts, "
                        "risks, recommendations and "
                        "assumptions."
                    ),
                    (
                        "- Prioritize critical and "
                        "high-risk issues first."
                    ),
                    (
                        "- Keep recommendations "
                        "specific, ordered and "
                        "executable."
                    ),
                    (
                        "- Never claim an action was "
                        "executed unless the system "
                        "confirms it."
                    ),
                    (
                        "- Preserve company isolation "
                        "and never reference another "
                        "tenant."
                    ),
                ]
            ),
        ),
        (
            "LIVE COMPANY STATE",
            (
                company_state_context
                or "No live company state is available."
            ),
        ),
        (
            "EXECUTIVE BRIEF",
            (
                brief_context
                or "No executive brief is available."
            ),
        ),
        (
            "EXECUTIVE ADVICE",
            (
                advisor_context
                or "No executive advice is available."
            ),
        ),
        (
            "COMPANY KNOWLEDGE",
            (
                knowledge_context
                or "No company knowledge is available."
            ),
        ),
        (
            "EXECUTIVE PRIORITIES",
            priorities_context,
        ),
        (
            "RECENT COMPANY ACTIVITY",
            activity_context,
        ),
        (
            "RECENT SONNY MEMORY",
            memory_context,
        ),
    ]

    if message:
        sections.append(
            (
                "FOUNDER MESSAGE",
                message,
            )
        )

    return "\n\n".join(
        f"## {title}\n{body}"
        for title, body in sections
    )


def build_executive_context(
    db: Session,
    company: Company,
    *,
    founder_message: str | None = None,
    activity_limit: int = 30,
    memory_limit: int = 20,
    prompt_activity_limit: int = 10,
    prompt_memory_limit: int = 8,
    priority_limit: int = 7,
) -> dict[str, Any]:
    """
    Build Sonny's unified executive context.

    This function:
    - Loads live company state.
    - Loads company knowledge.
    - Builds recent activity and memory.
    - Builds executive priorities.
    - Builds the executive brief.
    - Builds executive advice.
    - Builds prompt-ready context.

    This function does not execute company actions.
    """

    generated_at = datetime.now(
        timezone.utc
    ).isoformat()

    state = build_company_state(
        db,
        company,
        activity_limit=activity_limit,
        memory_limit=memory_limit,
    )

    if not isinstance(state, dict):
        raise TypeError(
            "build_company_state() must "
            "return a dictionary"
        )

    knowledge = get_or_create_company_knowledge(
        db,
        company_id=company.id,
    )

    state_context = build_state_prompt_context(
        state
    )

    knowledge_context = (
        build_knowledge_prompt_context(
            knowledge
        )
    )

    memory_context = build_memory_context(
        state,
        limit=prompt_memory_limit,
    )

    activity_context = build_activity_context(
        state,
        limit=prompt_activity_limit,
    )

    priorities = build_executive_priorities(
        state,
        limit=priority_limit,
    )

    priorities_context = build_priority_context(
        priorities
    )

    intelligence = safe_dict(
        state.get("intelligence")
    )

    executive_summary = {
        "attention_required": bool(
            intelligence.get(
                "attention_required",
                False,
            )
        ),
        "critical_count": as_int(
            intelligence.get("critical_count")
        ),
        "high_count": as_int(
            intelligence.get("high_count")
        ),
        "priorities": priorities,
    }

    base_context: dict[str, Any] = {
        "context_version": EXECUTIVE_CONTEXT_VERSION,
        "generated_at": generated_at,
        "company_id": company.id,
        "company_name": company.name,
        "founder_message": (
            clean_text(founder_message)
            or None
        ),
        "state": state,
        "knowledge": {
            "available": bool(
                clean_text(
                    knowledge_context
                )
            ),
            "prompt_context": knowledge_context,
        },
        "executive": executive_summary,
    }

    brief = build_executive_brief(
        base_context
    )

    brief_context = build_brief_prompt_context(
        brief
    )

    advisor_input = {
        **base_context,
        "brief": brief,
    }

    advisor = build_executive_advice(
        advisor_input
    )

    advisor_context = (
        build_advisor_prompt_context(
            advisor
        )
    )

    prompt_context = (
        build_executive_prompt_context(
            company_state_context=state_context,
            brief_context=brief_context,
            advisor_context=advisor_context,
            knowledge_context=knowledge_context,
            priorities_context=priorities_context,
            activity_context=activity_context,
            memory_context=memory_context,
            founder_message=founder_message,
        )
    )

    return {
        **base_context,
        "brief": brief,
        "advisor": advisor,
        "prompt_sections": {
            "company_state": state_context,
            "executive_brief": brief_context,
            "executive_advice": advisor_context,
            "company_knowledge": knowledge_context,
            "executive_priorities": priorities_context,
            "recent_activity": activity_context,
            "recent_memory": memory_context,
        },
        "prompt_context": prompt_context,
    }