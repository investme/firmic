from __future__ import annotations

from typing import Any, Callable


EXECUTIVE_DECISION_VERSION = "v8.0.0"


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_message(value: Any) -> str:
    return " ".join(clean_text(value).lower().split())


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


def safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def contains_any(message: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in message for keyword in keywords)


def get_state(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(context.get("state"))


def get_brief(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(context.get("brief"))


def get_advisor(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(context.get("advisor"))


def get_company_name(context: dict[str, Any]) -> str:
    return clean_text(context.get("company_name")) or "the company"


def get_section(context: dict[str, Any], section_name: str) -> dict[str, Any]:
    return safe_dict(get_state(context).get(section_name))


def get_summary(context: dict[str, Any], section_name: str) -> dict[str, Any]:
    return safe_dict(get_section(context, section_name).get("summary"))


def get_items(context: dict[str, Any], section_name: str) -> list[Any]:
    return safe_list(get_section(context, section_name).get("items"))


def get_snapshot(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(get_brief(context).get("operational_snapshot"))


def get_health(context: dict[str, Any]) -> dict[str, Any]:
    return safe_dict(get_brief(context).get("company_health"))


INTENT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("help", ("help", "what can you do", "commands", "capabilities")),
    ("today", ("what should i do today", "what should we do today", "today plan", "today's plan", "today focus", "focus today")),
    ("risks", ("risk", "risks", "biggest risk", "what is blocking", "what's blocking", "blocker", "blocked", "danger")),
    ("recommendations", ("what should i do", "what should we do", "recommend", "recommendation", "next step", "next steps", "action plan", "priority", "priorities")),
    ("health", ("health", "healthy", "company score", "operational score", "how are we doing", "how is the company")),
    ("documents", ("document", "documents", "license", "certificate", "compliance file", "passport copy", "proof of address")),
    ("tasks", ("task", "tasks", "todo", "to do", "pending work", "completed work", "overdue work")),
    ("billing", ("billing", "invoice", "invoices", "payment", "payments", "charge", "charges", "cost", "spend", "overdue balance")),
    ("support", ("support", "ticket", "tickets", "customer issue", "service issue")),
    ("meetings", ("meeting", "meetings", "appointment", "calendar", "booking", "reservation")),
    ("agents", ("agent", "agents", "ai workforce", "ai employee", "ai employees", "hermes", "julia", )),
    ("memory", ("memory", "remember", "what do you know", "history", "recent activity")),
    ("knowledge", ("company knowledge", "business model", "strategy", "what do you know about the company")),
    ("brief", ("brief me", "executive brief", "daily brief", "morning brief", "update me", "ceo summary")),
    ("overview", ("overview", "status", "summary", "progress", "company overview")),
]


def detect_intent(founder_message: str) -> str:
    message = normalize_message(founder_message)
    if not message:
        return "brief"
    for intent, keywords in INTENT_KEYWORDS:
        if contains_any(message, keywords):
            return intent
    return "general"


def format_priority(item: Any, fallback: str) -> str:
    if not isinstance(item, dict):
        return fallback
    title = clean_text(item.get("title"))
    detail = clean_text(item.get("detail"))
    if not title:
        return fallback
    return f"{title}: {detail}" if detail else title


def format_health(context: dict[str, Any]) -> str:
    health = get_health(context)
    if not health:
        return "Company health is currently unavailable."
    label = clean_text(health.get("label")) or "Unknown"
    score = as_int(health.get("score"))
    summary = clean_text(health.get("summary"))
    line = f"Company health is {label} at {score}%."
    if summary:
        line += f" {summary}"
    return line


def format_list_item(item: dict[str, Any], *, label_key: str = "title", meta_key: str | None = None) -> str:
    label = clean_text(item.get(label_key)) or clean_text(item.get("name")) or "Untitled item"
    if not meta_key:
        return f"- {label}"
    meta = clean_text(item.get(meta_key))
    return f"- [{meta.upper()}] {label}" if meta else f"- {label}"


def build_overview_response(context: dict[str, Any]) -> str:
    brief = get_brief(context)
    snapshot = get_snapshot(context)
    return "\n".join([
        f"{get_company_name(context)} executive overview:",
        format_health(context),
        f"Pending tasks: {as_int(snapshot.get('pending_tasks'))}. Pending documents: {as_int(snapshot.get('pending_documents'))}. Open support tickets: {as_int(snapshot.get('open_support_tickets'))}.",
        "Top priority: " + format_priority(brief.get("top_priority"), "No urgent priority detected."),
        "Next action: " + format_priority(brief.get("next_action"), "Continue normal monitoring."),
    ])


def build_brief_response(context: dict[str, Any]) -> str:
    brief = get_brief(context)
    advisor = get_advisor(context)
    focus_titles = [
        clean_text(item.get("title"))
        for item in safe_list(brief.get("today_focus"))
        if isinstance(item, dict) and clean_text(item.get("title"))
    ]
    lines = [
        f"Executive brief for {get_company_name(context)}:",
        format_health(context),
        "Biggest blocker: " + format_priority(advisor.get("biggest_risk"), "No major blocker detected."),
        "Next action: " + format_priority(advisor.get("top_priority") or brief.get("next_action"), "Continue normal monitoring."),
    ]
    if focus_titles:
        lines.append("Today's focus: " + "; ".join(focus_titles[:3]) + ".")
    return "\n".join(lines)


def build_health_response(context: dict[str, Any]) -> str:
    health = get_health(context)
    return "\n".join([
        "Company health:",
        format_health(context),
        f"Critical risks: {as_int(health.get('critical_risks'))}. High risks: {as_int(health.get('high_risks'))}.",
        "Executive attention required: " + ("Yes." if bool(health.get("attention_required")) else "No."),
    ])


def build_risks_response(context: dict[str, Any]) -> str:
    risks = safe_list(get_advisor(context).get("risks"))
    if not risks:
        return "No major operational risks were detected. Continue normal monitoring."
    lines = ["Current executive risks:"]
    for index, item in enumerate(risks[:5], start=1):
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title")) or "Untitled risk"
        detail = clean_text(item.get("detail"))
        severity = clean_text(item.get("severity")) or "medium"
        line = f"{index}. [{severity.upper()}] {title}"
        if detail:
            line += f" — {detail}"
        lines.append(line)
    return "\n".join(lines)


def build_recommendations_response(context: dict[str, Any]) -> str:
    recommendations = safe_list(get_advisor(context).get("recommendations"))
    if not recommendations:
        return "No urgent executive recommendations were detected. Continue normal monitoring and execution."
    lines = ["Recommended executive actions:"]
    for index, item in enumerate(recommendations[:5], start=1):
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title")) or "Untitled action"
        detail = clean_text(item.get("detail"))
        priority = clean_text(item.get("priority")) or "medium"
        line = f"{index}. [{priority.upper()}] {title}"
        if detail:
            line += f" — {detail}"
        lines.append(line)
    return "\n".join(lines)


def build_today_response(context: dict[str, Any]) -> str:
    advisor = get_advisor(context)
    brief = get_brief(context)
    today_plan = safe_list(advisor.get("today_plan")) or safe_list(brief.get("today_focus"))
    if not today_plan:
        return "No urgent items were detected for today. Continue normal monitoring and complete current work."
    lines = ["Today's executive plan:"]
    for index, item in enumerate(today_plan[:3], start=1):
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title")) or "Untitled action"
        detail = clean_text(item.get("detail"))
        priority = clean_text(item.get("priority")) or "medium"
        line = f"{index}. [{priority.upper()}] {title}"
        if detail:
            line += f" — {detail}"
        lines.append(line)
    biggest_risk = advisor.get("biggest_risk")
    if biggest_risk:
        lines.append("Main blocker: " + format_priority(biggest_risk, "No blocker detected."))
    return "\n".join(lines)


def build_tasks_response(context: dict[str, Any]) -> str:
    summary = get_summary(context, "tasks")
    items = get_items(context, "tasks")
    pending_items = [
        item for item in items
        if isinstance(item, dict)
        and clean_text(item.get("status")).lower() not in {"completed", "done", "closed"}
    ]
    lines = [
        "Task status:",
        f"Pending: {as_int(summary.get('pending'))}. Completed: {as_int(summary.get('completed'))}. Overdue: {as_int(summary.get('overdue'))}.",
    ]
    for item in pending_items[:5]:
        lines.append(format_list_item(item, meta_key="priority"))
    if not pending_items:
        lines.append("No pending task details are available.")
    return "\n".join(lines)


def build_documents_response(context: dict[str, Any]) -> str:
    summary = get_summary(context, "documents")
    items = get_items(context, "documents")
    pending_items = [
        item for item in items
        if isinstance(item, dict)
        and clean_text(item.get("status")).lower() not in {"approved", "completed", "verified"}
    ]
    lines = [
        "Document status:",
        f"Approved: {as_int(summary.get('approved'))}. Pending: {as_int(summary.get('pending'))}.",
    ]
    for item in pending_items[:5]:
        lines.append(format_list_item(item, meta_key="status"))
    if not pending_items:
        lines.append("No pending document details are available.")
    return "\n".join(lines)


def build_billing_response(context: dict[str, Any]) -> str:
    billing = get_section(context, "billing")
    current_total = as_float(billing.get("current_month_total_usd"))
    unbilled = as_float(billing.get("unbilled_usd"))
    overdue = as_float(billing.get("overdue_usd", billing.get("overdue_total_usd")))
    return "\n".join([
        "Billing overview:",
        f"Current month total: ${current_total:.2f}.",
        f"Unbilled usage: ${unbilled:.2f}.",
        f"Overdue amount: ${overdue:.2f}.",
    ])


def build_support_response(context: dict[str, Any]) -> str:
    summary = get_summary(context, "support")
    items = get_items(context, "support")
    open_items = [
        item for item in items
        if isinstance(item, dict)
        and clean_text(item.get("status")).lower() not in {"closed", "resolved"}
    ]
    lines = [
        "Support overview:",
        f"Open tickets: {as_int(summary.get('open'))}. Urgent tickets: {as_int(summary.get('urgent'))}.",
    ]
    for item in open_items[:5]:
        copied = dict(item)
        copied["priority"] = clean_text(item.get("priority")) or clean_text(item.get("severity")) or "normal"
        lines.append(format_list_item(copied, meta_key="priority"))
    if not open_items:
        lines.append("No open ticket details are available.")
    return "\n".join(lines)


def build_meetings_response(context: dict[str, Any]) -> str:
    summary = get_summary(context, "meetings")
    items = get_items(context, "meetings")
    lines = [
        "Meeting overview:",
        f"Active meetings: {as_int(summary.get('active'))}. Upcoming meetings: {as_int(summary.get('upcoming'))}.",
    ]
    for item in items[:5]:
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title")) or "Untitled meeting"
        starts_at = clean_text(item.get("starts_at")) or clean_text(item.get("start_time")) or "time unavailable"
        lines.append(f"- {title} — {starts_at}")
    if len(lines) == 2:
        lines.append("No meeting details are available.")
    return "\n".join(lines)


def build_agents_response(context: dict[str, Any]) -> str:
    summary = get_summary(context, "ai_workforce")
    items = get_items(context, "ai_workforce")
    lines = [
        "AI workforce overview:",
        f"Active AI employees: {as_int(summary.get('active'))}. Total AI employees: {as_int(summary.get('total'))}.",
    ]
    for item in items[:8]:
        if not isinstance(item, dict):
            continue
        name = clean_text(item.get("name")) or "Unnamed agent"
        role = clean_text(item.get("role")) or "Role unavailable"
        status = clean_text(item.get("status")) or "unknown"
        lines.append(f"- {name}: {role} [{status}]")
    if len(lines) == 2:
        lines.append("No AI employee details are available.")
    return "\n".join(lines)


def build_memory_response(context: dict[str, Any]) -> str:
    items = get_items(context, "memory")
    if not items:
        return "No recent Sonny memory is available."
    lines = ["Recent Sonny memory:"]
    for item in items[:5]:
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title")) or "Untitled memory"
        memory_type = clean_text(item.get("memory_type")) or "memory"
        lines.append(f"- [{memory_type}] {title}")
    return "\n".join(lines)


def build_knowledge_response(context: dict[str, Any]) -> str:
    knowledge = safe_dict(context.get("knowledge"))
    prompt_context = clean_text(knowledge.get("prompt_context"))
    if not prompt_context:
        return "No company knowledge is currently available."
    if len(prompt_context) > 1800:
        prompt_context = prompt_context[:1797].rstrip() + "..."
    return "\n".join([
        f"Company knowledge for {get_company_name(context)}:",
        prompt_context,
    ])


def build_help_response(context: dict[str, Any]) -> str:
    return "\n".join([
        "You can ask Sonny about:",
        "• Company overview and health",
        "• Risks, blockers and priorities",
        "• Today's executive plan",
        "• Tasks and documents",
        "• Billing and support",
        "• Meetings and AI employees",
        "• Company knowledge and memory",
    ])


def build_general_response(context: dict[str, Any], founder_message: str) -> str:
    advisor = get_advisor(context)
    brief = get_brief(context)
    return "\n".join([
        f"I reviewed the current executive context for {get_company_name(context)}.",
        format_health(context),
        "Top priority: " + format_priority(advisor.get("top_priority") or brief.get("top_priority"), "No urgent priority detected."),
        f'Your message was: "{clean_text(founder_message)}"',
        "I can answer from verified company state, the executive brief, advice, knowledge, activity and memory.",
    ])


DecisionHandler = Callable[[dict[str, Any]], str]

DECISION_HANDLERS: dict[str, DecisionHandler] = {
    "overview": build_overview_response,
    "brief": build_brief_response,
    "health": build_health_response,
    "risks": build_risks_response,
    "recommendations": build_recommendations_response,
    "today": build_today_response,
    "tasks": build_tasks_response,
    "documents": build_documents_response,
    "billing": build_billing_response,
    "support": build_support_response,
    "meetings": build_meetings_response,
    "agents": build_agents_response,
    "memory": build_memory_response,
    "knowledge": build_knowledge_response,
    "help": build_help_response,
}


def executive_reason(context: dict[str, Any], founder_message: str | None = None) -> str:
    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")
    message = clean_text(
        founder_message if founder_message is not None else context.get("founder_message")
    )
    intent = detect_intent(message)
    handler = DECISION_HANDLERS.get(intent)
    if handler is not None:
        return handler(context)
    return build_general_response(context, message)


def build_decision_payload(context: dict[str, Any], founder_message: str | None = None) -> dict[str, Any]:
    if not isinstance(context, dict):
        raise TypeError("context must be a dictionary")
    message = clean_text(
        founder_message if founder_message is not None else context.get("founder_message")
    )
    intent = detect_intent(message)
    return {
        "decision_version": EXECUTIVE_DECISION_VERSION,
        "context_version": context.get("context_version"),
        "brief_version": get_brief(context).get("brief_version"),
        "advisor_version": get_advisor(context).get("advisor_version"),
        "company_id": context.get("company_id"),
        "company_name": context.get("company_name"),
        "intent": intent,
        "reply": executive_reason(context=context, founder_message=message),
        "actions": [],
        "requires_confirmation": False,
        "confidence": 1.0 if intent != "general" else 0.65,
    }
