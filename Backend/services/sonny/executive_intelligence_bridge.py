from __future__ import annotations

from typing import Any

EXECUTIVE_INTELLIGENCE_BRIDGE_VERSION = "b10.1.0"


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_message(value: Any) -> str:
    return " ".join(clean_text(value).lower().split())


def safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def detect_intelligence_intent(message: str) -> str | None:
    text = normalize_message(message)

    groups = [
        ("brief", ("brief me", "executive brief", "daily brief", "morning brief", "today's brief", "todays brief", "update me")),
        ("health", ("how healthy", "company health", "business health", "health score", "how are we doing", "how is the company")),
        ("risks", ("biggest risk", "main risk", "top risk", "show risks", "what are the risks", "operational risk")),
        ("recommendations", ("what should i fix", "what should we fix", "what should i do", "what should we do", "next step", "next steps", "recommendation", "recommendations", "today's priorities", "todays priorities", "top priority", "what should i focus")),
        ("kpis", ("show kpis", "show metrics", "key metrics", "key kpis", "business metrics", "company metrics")),
    ]

    for intent, phrases in groups:
        if any(phrase in text for phrase in phrases):
            return intent
    return None


def format_money(value: Any) -> str:
    try:
        return f"${float(value or 0):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def build_health_reply(intelligence: dict[str, Any]) -> str:
    health = safe_dict(intelligence.get("health"))
    overall = int(health.get("overall") or 0)
    status = "strong" if overall >= 85 else "stable" if overall >= 70 else "in need of attention"
    return "\n".join([
        f"Business health is {overall}/100, which is {status}.",
        f"Operations: {int(health.get('operations') or 0)}/100 · Infrastructure: {int(health.get('infrastructure') or 0)}/100",
        f"Compliance: {int(health.get('compliance') or 0)}/100 · Growth: {int(health.get('growth') or 0)}/100",
    ])


def build_risks_reply(intelligence: dict[str, Any]) -> str:
    risks = safe_list(intelligence.get("risks"))
    if not risks:
        return "No material operational risks are currently detected. Continue normal monitoring."
    lines = ["Current operational risks:"]
    for index, raw in enumerate(risks[:5], start=1):
        risk = safe_dict(raw)
        severity = clean_text(risk.get("severity")).upper() or "MEDIUM"
        title = clean_text(risk.get("title")) or "Untitled risk"
        description = clean_text(risk.get("description"))
        line = f"{index}. [{severity}] {title}"
        if description:
            line += f" — {description}"
        lines.append(line)
    return "\n".join(lines)


def build_recommendations_reply(intelligence: dict[str, Any]) -> str:
    recommendations = safe_list(intelligence.get("recommendations"))
    if not recommendations:
        return "No urgent recommendation is required. Continue the current operating rhythm."
    lines = ["Recommended executive actions:"]
    for index, raw in enumerate(recommendations[:5], start=1):
        item = safe_dict(raw)
        priority = clean_text(item.get("priority")).upper() or "MEDIUM"
        title = clean_text(item.get("title")) or "Untitled action"
        impact = clean_text(item.get("impact"))
        line = f"{index}. [{priority}] {title}"
        if impact:
            line += f" — {impact}"
        lines.append(line)
    return "\n".join(lines)


def build_kpis_reply(intelligence: dict[str, Any]) -> str:
    kpis = safe_dict(intelligence.get("kpis"))
    return "\n".join([
        "Current executive KPIs:",
        f"Open tasks: {int(kpis.get('open_tasks') or 0)} · Completed tasks: {int(kpis.get('completed_tasks') or 0)}",
        f"Active AI agents: {int(kpis.get('active_ai_agents') or 0)} · Active AI jobs: {int(kpis.get('active_ai_jobs') or 0)}",
        f"Pending documents: {int(kpis.get('pending_documents') or 0)} · Running workflows: {int(kpis.get('running_workflows') or 0)}",
        f"Monthly expenses: {format_money(kpis.get('monthly_expenses_usd'))} · Outstanding: {format_money(kpis.get('outstanding_amount_usd'))}",
    ])


def build_brief_reply(intelligence: dict[str, Any]) -> str:
    brief = clean_text(intelligence.get("executive_brief"))
    risks = safe_list(intelligence.get("risks"))
    recommendations = safe_list(intelligence.get("recommendations"))
    lines = [brief or build_health_reply(intelligence)]
    if risks:
        lines.append("Biggest risk: " + (clean_text(safe_dict(risks[0]).get("title")) or "Operational attention required") + ".")
    else:
        lines.append("Biggest risk: No material risk detected.")
    if recommendations:
        lines.append("Next action: " + (clean_text(safe_dict(recommendations[0]).get("title")) or "Continue normal monitoring") + ".")
    return "\n".join(lines)


def answer_from_executive_intelligence(intelligence: dict[str, Any], founder_message: str) -> dict[str, Any] | None:
    intent = detect_intelligence_intent(founder_message)
    if intent is None:
        return None
    handlers = {
        "brief": build_brief_reply,
        "health": build_health_reply,
        "risks": build_risks_reply,
        "recommendations": build_recommendations_reply,
        "kpis": build_kpis_reply,
    }
    return {
        "bridge_version": EXECUTIVE_INTELLIGENCE_BRIDGE_VERSION,
        "intent": intent,
        "reply": handlers[intent](intelligence),
    }
