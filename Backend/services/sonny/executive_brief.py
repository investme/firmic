from __future__ import annotations

from typing import Any


EXECUTIVE_BRIEF_VERSION = "b7.3.1"

SEVERITY_ORDER: dict[str, int] = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
}


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def as_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def as_float(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def severity_rank(value: Any) -> int:
    return SEVERITY_ORDER.get(
        clean_text(value).lower(),
        99,
    )


def determine_health_label(
    score: int,
    critical_count: int,
    high_count: int,
) -> str:
    if critical_count > 0 or score < 35:
        return "Critical"

    if high_count > 1 or score < 55:
        return "At Risk"

    if high_count == 1 or score < 75:
        return "Needs Attention"

    if score < 90:
        return "Good"

    return "Excellent"


def build_health_summary(
    label: str,
    score: int,
) -> str:
    summaries = {
        "Critical": (
            "Immediate executive attention is required."
        ),
        "At Risk": (
            "Several operational risks may block progress."
        ),
        "Needs Attention": (
            "Operations are moving, but key issues remain."
        ),
        "Good": (
            "Operations are stable with manageable priorities."
        ),
        "Excellent": (
            "Operations are healthy and progressing strongly."
        ),
    }

    summary = summaries.get(
        label,
        "Company health has been assessed.",
    )

    return f"{summary} Operational score: {score}%."


def ordered_priorities(
    context: dict[str, Any],
) -> list[dict[str, Any]]:
    executive = context.get("executive", {})
    priorities = executive.get("priorities", [])

    if not isinstance(priorities, list):
        return []

    valid_priorities = [
        item
        for item in priorities
        if isinstance(item, dict)
    ]

    return sorted(
        valid_priorities,
        key=lambda item: (
            severity_rank(item.get("priority")),
            (
                0
                if clean_text(
                    item.get("kind")
                ).lower() == "risk"
                else 1
            ),
            clean_text(item.get("title")).lower(),
        ),
    )


def select_priority(
    priorities: list[dict[str, Any]],
    *,
    kind: str | None = None,
) -> dict[str, Any] | None:
    expected_kind = clean_text(kind).lower()

    for item in priorities:
        item_kind = clean_text(
            item.get("kind")
        ).lower()

        if not expected_kind or item_kind == expected_kind:
            return item

    return None


def build_today_focus(
    priorities: list[dict[str, Any]],
    *,
    limit: int = 3,
) -> list[dict[str, Any]]:
    focus: list[dict[str, Any]] = []
    used_codes: set[str] = set()
    used_titles: set[str] = set()

    for item in priorities:
        title = clean_text(item.get("title"))
        code = clean_text(item.get("code"))
        normalized_title = title.lower()

        if not title:
            continue

        if code and code in used_codes:
            continue

        if normalized_title in used_titles:
            continue

        focus.append(
            {
                "code": code or None,
                "title": title,
                "priority": (
                    clean_text(item.get("priority"))
                    or "medium"
                ),
                "kind": (
                    clean_text(item.get("kind"))
                    or "action"
                ),
                "target": item.get("target"),
            }
        )

        if code:
            used_codes.add(code)

        used_titles.add(normalized_title)

        if len(focus) >= max(limit, 0):
            break

    return focus


def build_operational_snapshot(
    state: dict[str, Any],
) -> dict[str, Any]:
    company = state.get("company", {})
    headquarters = company.get(
        "headquarters",
        {},
    )

    tasks = (
        state.get("tasks", {})
        .get("summary", {})
    )

    documents = (
        state.get("documents", {})
        .get("summary", {})
    )

    workflows = (
        state.get("workflows", {})
        .get("summary", {})
    )

    workforce = (
        state.get("ai_workforce", {})
        .get("summary", {})
    )

    meetings = (
        state.get("meetings", {})
        .get("summary", {})
    )

    support = (
        state.get("support", {})
        .get("summary", {})
    )

    billing = state.get("billing", {})

    return {
        "company_status": company.get("status"),
        "headquarters_active": bool(
            headquarters.get("active")
        ),
        "pending_tasks": as_int(
            tasks.get("pending")
        ),
        "completed_tasks": as_int(
            tasks.get("completed")
        ),
        "approved_documents": as_int(
            documents.get("approved")
        ),
        "pending_documents": as_int(
            documents.get("pending")
        ),
        "running_workflows": as_int(
            workflows.get("running")
        ),
        "active_ai_employees": as_int(
            workforce.get("active")
        ),
        "assigned_ai_employees": as_int(
            workforce.get(
                "assigned",
                workforce.get("total"),
            )
        ),
        "included_ai_employee_capacity": (
            None
            if bool(workforce.get("unlimited"))
            else as_int(
                workforce.get("included_capacity")
            )
        ),
        "available_ai_employee_slots": (
            None
            if bool(workforce.get("unlimited"))
            else as_int(
                workforce.get("available_slots")
            )
        ),
        "unlimited_ai_employee_capacity": bool(
            workforce.get("unlimited")
        ),
        "active_meetings": as_int(
            meetings.get("active")
        ),
        "open_support_tickets": as_int(
            support.get("open")
        ),
        "urgent_support_tickets": as_int(
            support.get("urgent")
        ),
        "current_month_billing_usd": as_float(
            billing.get(
                "recurring_monthly_total_usd",
                billing.get("current_month_total_usd"),
            )
        ),
        "launch_activation_fee_usd": as_float(
            billing.get("launch_activation_fee_usd")
        ),
        "first_month_total_usd": as_float(
            billing.get("first_month_total_usd")
        ),
        "unbilled_usage_usd": as_float(
            billing.get("unbilled_usd")
        ),
    }


def build_executive_brief(
    context: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert Sonny's executive context into a compact brief.

    This function performs no database queries and
    executes no company actions.
    """

    state = context.get("state", {})

    if not isinstance(state, dict):
        state = {}

    progress = state.get("progress", {})
    intelligence = state.get(
        "intelligence",
        {},
    )

    executive = context.get("executive", {})

    if not isinstance(executive, dict):
        executive = {}

    score = max(
        0,
        min(
            as_int(progress.get("score")),
            100,
        ),
    )

    critical_count = as_int(
        executive.get(
            "critical_count",
            intelligence.get(
                "critical_count",
                0,
            ),
        )
    )

    high_count = as_int(
        executive.get(
            "high_count",
            intelligence.get(
                "high_count",
                0,
            ),
        )
    )

    priorities = ordered_priorities(context)

    top_priority = select_priority(
        priorities
    )

    biggest_blocker = select_priority(
        priorities,
        kind="risk",
    )

    next_action = select_priority(
        priorities,
        kind="action",
    )

    health_label = determine_health_label(
        score,
        critical_count,
        high_count,
    )

    attention_required = bool(
        executive.get(
            "attention_required",
            intelligence.get(
                "attention_required",
                False,
            ),
        )
    )

    return {
        "brief_version": (
            EXECUTIVE_BRIEF_VERSION
        ),
        "context_version": context.get(
            "context_version"
        ),
        "generated_at": context.get(
            "generated_at"
        ),
        "company_id": context.get(
            "company_id"
        ),
        "company_name": context.get(
            "company_name"
        ),
        "company_health": {
            "label": health_label,
            "score": score,
            "summary": build_health_summary(
                health_label,
                score,
            ),
            "attention_required": (
                attention_required
            ),
            "critical_risks": critical_count,
            "high_risks": high_count,
        },
        "top_priority": top_priority,
        "biggest_blocker": (
            biggest_blocker
        ),
        "next_action": next_action,
        "today_focus": build_today_focus(
            priorities,
            limit=3,
        ),
        "operational_snapshot": (
            build_operational_snapshot(
                state
            )
        ),
        "priority_count": len(priorities),
        "priorities": priorities,
    }


def build_brief_prompt_context(
    brief: dict[str, Any],
) -> str:
    health = brief.get(
        "company_health",
        {},
    )

    snapshot = brief.get(
        "operational_snapshot",
        {},
    )

    top_priority = brief.get(
        "top_priority"
    )

    blocker = brief.get(
        "biggest_blocker"
    )

    next_action = brief.get(
        "next_action"
    )

    today_focus = brief.get(
        "today_focus",
        [],
    )

    if not isinstance(health, dict):
        health = {}

    if not isinstance(snapshot, dict):
        snapshot = {}

    if not isinstance(today_focus, list):
        today_focus = []

    def item_title(
        item: dict[str, Any] | None,
        fallback: str,
    ) -> str:
        if not isinstance(item, dict):
            return fallback

        return (
            clean_text(item.get("title"))
            or fallback
        )

    focus_titles = [
        clean_text(item.get("title"))
        for item in today_focus
        if isinstance(item, dict)
        and clean_text(item.get("title"))
    ]

    focus_text = (
        "; ".join(focus_titles)
        if focus_titles
        else "Continue normal monitoring"
    )

    return "\n".join(
        [
            (
                f'Company health: '
                f'{health.get("label", "Unknown")} '
                f'({as_int(health.get("score"))}%)'
            ),
            (
                f'Health summary: '
                f'{clean_text(health.get("summary"))}'
            ),
            (
                f'Critical risks: '
                f'{as_int(health.get("critical_risks"))}'
            ),
            (
                f'High risks: '
                f'{as_int(health.get("high_risks"))}'
            ),
            (
                f'Top priority: '
                f'{item_title(top_priority, "None")}'
            ),
            (
                f'Biggest blocker: '
                f'{item_title(blocker, "None")}'
            ),
            (
                f'Next action: '
                f'{item_title(next_action, "Continue monitoring")}'
            ),
            f"Today's focus: {focus_text}",
            (
                f'Pending tasks: '
                f'{as_int(snapshot.get("pending_tasks"))}'
            ),
            (
                f'Pending documents: '
                f'{as_int(snapshot.get("pending_documents"))}'
            ),
            (
                f'Open support tickets: '
                f'{as_int(snapshot.get("open_support_tickets"))}'
            ),
            (
                f'AI workforce: '
                + (
                    "unlimited included capacity"
                    if snapshot.get(
                        "unlimited_ai_employee_capacity"
                    )
                    else (
                        f'{as_int(snapshot.get("included_ai_employee_capacity"))} '
                        "included slots"
                    )
                )
                + (
                    f'; {as_int(snapshot.get("active_ai_employees"))} '
                    "active assignment(s)"
                )
            ),
            (
                f'Recurring monthly operating cost: '
                f'${as_float(snapshot.get("current_month_billing_usd")):.2f}'
            ),
            (
                f'Company Launch Fee: '
                f'${as_float(snapshot.get("launch_activation_fee_usd")):.2f} one time'
            ),
            (
                f'First month total: '
                f'${as_float(snapshot.get("first_month_total_usd")):.2f}'
            ),
        ]
    )