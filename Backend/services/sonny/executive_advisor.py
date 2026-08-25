from __future__ import annotations

from typing import Any
from services.compliance_requirements import REQUIRED_COMPLIANCE_DOCUMENTS


EXECUTIVE_ADVISOR_VERSION = "b7.4.0"


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


def get_state(
    context: dict[str, Any],
) -> dict[str, Any]:
    state = context.get("state", {})

    return state if isinstance(state, dict) else {}


def get_brief(
    context: dict[str, Any],
) -> dict[str, Any]:
    brief = context.get("brief", {})

    return brief if isinstance(brief, dict) else {}


def build_risk(
    title: str,
    detail: str,
    severity: str,
    category: str,
) -> dict[str, Any]:
    return {
        "title": clean_text(title),
        "detail": clean_text(detail),
        "severity": clean_text(severity).lower() or "medium",
        "category": clean_text(category).lower() or "operations",
    }


def build_recommendation(
    title: str,
    detail: str,
    priority: str,
    category: str,
    expected_result: str = "",
) -> dict[str, Any]:
    return {
        "title": clean_text(title),
        "detail": clean_text(detail),
        "priority": clean_text(priority).lower() or "medium",
        "category": clean_text(category).lower() or "operations",
        "expected_result": clean_text(expected_result),
    }


def build_delegation(
    agent: str,
    task: str,
    reason: str,
    priority: str = "medium",
) -> dict[str, Any]:
    return {
        "agent": clean_text(agent),
        "task": clean_text(task),
        "reason": clean_text(reason),
        "priority": clean_text(priority).lower() or "medium",
    }


def severity_rank(value: Any) -> int:
    severity = clean_text(value).lower()

    return {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1,
    }.get(severity, 0)


def priority_rank(value: Any) -> int:
    priority = clean_text(value).lower()

    return {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1,
    }.get(priority, 0)


def analyze_documents(
    state: dict[str, Any],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    risks: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []
    delegations: list[dict[str, Any]] = []

    documents = state.get("documents", {})

    if not isinstance(documents, dict):
        return risks, recommendations, delegations

    summary = documents.get("summary", {})
    signals = documents.get("signals", {})

    if not isinstance(summary, dict):
        summary = {}

    if not isinstance(signals, dict):
        signals = {}

    pending = as_int(summary.get("pending"))

    requirements = signals.get("requirements", {})

    if not isinstance(requirements, dict):
        requirements = {}

    labels = {
        item["key"]: item["label"]
        for item in REQUIRED_COMPLIANCE_DOCUMENTS
    }

    missing = [
        labels.get(key, key.replace("_", " ").title())
        for key in sorted(requirements)
        if not bool(requirements.get(key))
    ]

    if missing:
        risks.append(
            build_risk(
                title="Missing compliance documents",
                detail=(
                    "The following core documents are missing: "
                    + ", ".join(missing)
                    + "."
                ),
                severity="high",
                category="compliance",
            )
        )

        recommendations.append(
            build_recommendation(
                title="Complete compliance file",
                detail=(
                    "Upload and verify the currently missing "
                    "compliance documents through Hermes."
                ),
                priority="high",
                category="compliance",
                expected_result=(
                    "Reduce onboarding and operational compliance risk."
                ),
            )
        )

        delegations.append(
            build_delegation(
                agent="Hermes",
                task=(
                    "Review the missing compliance documents and "
                    "prepare an upload checklist."
                ),
                reason=(
                    "Hermes is responsible for documents and compliance."
                ),
                priority="high",
            )
        )

    elif pending > 0:
        recommendations.append(
            build_recommendation(
                title="Clear pending document reviews",
                detail=(
                    f"{pending} document review(s) remain pending."
                ),
                priority="medium",
                category="compliance",
                expected_result=(
                    "Complete the company compliance profile."
                ),
            )
        )

    return risks, recommendations, delegations


def analyze_tasks(
    state: dict[str, Any],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    risks: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []

    tasks = state.get("tasks", {})

    if not isinstance(tasks, dict):
        return risks, recommendations

    summary = tasks.get("summary", {})

    if not isinstance(summary, dict):
        summary = {}

    pending = as_int(summary.get("pending"))
    overdue = as_int(summary.get("overdue"))

    if overdue > 0:
        risks.append(
            build_risk(
                title="Overdue operational tasks",
                detail=f"{overdue} task(s) are overdue.",
                severity="high",
                category="operations",
            )
        )

        recommendations.append(
            build_recommendation(
                title="Resolve overdue tasks",
                detail=(
                    "Review overdue work, assign clear owners, "
                    "and set new completion dates."
                ),
                priority="high",
                category="operations",
                expected_result=(
                    "Restore execution discipline and reduce delays."
                ),
            )
        )

    elif pending >= 5:
        recommendations.append(
            build_recommendation(
                title="Reduce task backlog",
                detail=(
                    f"There are currently {pending} pending tasks. "
                    "Complete the highest-impact items first."
                ),
                priority="medium",
                category="operations",
                expected_result=(
                    "Improve execution speed and company progress."
                ),
            )
        )

    return risks, recommendations


def analyze_support(
    state: dict[str, Any],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    risks: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []

    support = state.get("support", {})

    if not isinstance(support, dict):
        return risks, recommendations

    summary = support.get("summary", {})

    if not isinstance(summary, dict):
        summary = {}

    open_tickets = as_int(summary.get("open"))
    urgent_tickets = as_int(summary.get("urgent"))

    if urgent_tickets > 0:
        risks.append(
            build_risk(
                title="Urgent support issue",
                detail=(
                    f"{urgent_tickets} urgent support ticket(s) "
                    "require immediate attention."
                ),
                severity="high",
                category="support",
            )
        )

        recommendations.append(
            build_recommendation(
                title="Resolve urgent support tickets",
                detail=(
                    "Review the urgent cases before continuing "
                    "lower-priority operational work."
                ),
                priority="high",
                category="support",
                expected_result=(
                    "Prevent customer or operational disruption."
                ),
            )
        )

    elif open_tickets >= 5:
        recommendations.append(
            build_recommendation(
                title="Reduce support backlog",
                detail=(
                    f"{open_tickets} support tickets remain open."
                ),
                priority="medium",
                category="support",
                expected_result=(
                    "Improve response times and service quality."
                ),
            )
        )

    return risks, recommendations


def analyze_billing(
    state: dict[str, Any],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    risks: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []

    billing = state.get("billing", {})

    if not isinstance(billing, dict):
        return risks, recommendations

    overdue = as_float(
        billing.get(
            "overdue_usd",
            billing.get("overdue_total_usd"),
        )
    )

    unbilled = as_float(
        billing.get("unbilled_usd")
    )

    if overdue > 0:
        risks.append(
            build_risk(
                title="Overdue billing balance",
                detail=f"${overdue:.2f} is overdue.",
                severity="high",
                category="finance",
            )
        )

        recommendations.append(
            build_recommendation(
                title="Settle overdue balance",
                detail=(
                    "Review and settle the overdue amount "
                    "to avoid service disruption."
                ),
                priority="high",
                category="finance",
                expected_result=(
                    "Restore a healthy billing position."
                ),
            )
        )

    if unbilled > 0:
        recommendations.append(
            build_recommendation(
                title="Review unbilled usage",
                detail=(
                    f"${unbilled:.2f} remains unbilled."
                ),
                priority="medium",
                category="finance",
                expected_result=(
                    "Maintain accurate financial visibility."
                ),
            )
        )

    return risks, recommendations


def analyze_workforce(
    state: dict[str, Any],
) -> list[dict[str, Any]]:
    recommendations: list[dict[str, Any]] = []

    workforce = state.get("ai_workforce", {})

    if not isinstance(workforce, dict):
        return recommendations

    summary = workforce.get("summary", {})

    if not isinstance(summary, dict):
        summary = {}

    active = as_int(summary.get("active"))
    included_capacity = summary.get("included_capacity")
    unlimited = bool(summary.get("unlimited"))

    has_entitlement = (
        unlimited
        or as_int(included_capacity) > 0
    )

    if has_entitlement and active == 0:
        capacity_text = (
            "unlimited AI employee capacity"
            if unlimited
            else (
                f"{as_int(included_capacity)} included "
                "AI employee slots"
            )
        )

        recommendations.append(
            build_recommendation(
                title="Evaluate AI workforce utilization",
                detail=(
                    f"The current plan provides {capacity_text}, "
                    "but no company-specific AI employee "
                    "assignment is active. Activate one only "
                    "when there is a defined workload to automate."
                ),
                priority="low",
                category="workforce",
                expected_result=(
                    "Use included AI capacity where it produces "
                    "measurable operational value."
                ),
            )
        )

    return recommendations


def build_today_plan(
    recommendations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []

    for index, item in enumerate(
        recommendations[:3],
        start=1,
    ):
        plan.append(
            {
                "order": index,
                "title": clean_text(item.get("title")),
                "detail": clean_text(item.get("detail")),
                "priority": clean_text(
                    item.get("priority")
                ).lower(),
                "category": clean_text(
                    item.get("category")
                ).lower(),
            }
        )

    return plan


def build_executive_summary(
    risks: list[dict[str, Any]],
    recommendations: list[dict[str, Any]],
) -> str:
    critical_count = sum(
        1
        for item in risks
        if clean_text(item.get("severity")).lower()
        == "critical"
    )

    high_count = sum(
        1
        for item in risks
        if clean_text(item.get("severity")).lower()
        == "high"
    )

    if critical_count:
        return (
            f"{critical_count} critical risk(s) require "
            "immediate executive action."
        )

    if high_count:
        return (
            f"{high_count} high-priority risk(s) require "
            "executive attention."
        )

    if recommendations:
        return (
            "The company is operational, with clear actions "
            "available to improve execution."
        )

    return (
        "No major operational risks were detected. "
        "Continue normal monitoring."
    )


def build_executive_advice(
    context: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(context, dict):
        raise TypeError(
            "context must be a dictionary"
        )

    state = get_state(context)
    brief = get_brief(context)

    risks: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []
    delegations: list[dict[str, Any]] = []

    (
        document_risks,
        document_recommendations,
        document_delegations,
    ) = analyze_documents(state)

    task_risks, task_recommendations = (
        analyze_tasks(state)
    )

    support_risks, support_recommendations = (
        analyze_support(state)
    )

    billing_risks, billing_recommendations = (
        analyze_billing(state)
    )

    workforce_recommendations = (
        analyze_workforce(state)
    )

    risks.extend(document_risks)
    risks.extend(task_risks)
    risks.extend(support_risks)
    risks.extend(billing_risks)

    recommendations.extend(
        document_recommendations
    )
    recommendations.extend(
        task_recommendations
    )
    recommendations.extend(
        support_recommendations
    )
    recommendations.extend(
        billing_recommendations
    )
    recommendations.extend(
        workforce_recommendations
    )

    delegations.extend(
        document_delegations
    )

    risks.sort(
        key=lambda item: severity_rank(
            item.get("severity")
        ),
        reverse=True,
    )

    recommendations.sort(
        key=lambda item: priority_rank(
            item.get("priority")
        ),
        reverse=True,
    )

    top_priority = (
        recommendations[0]
        if recommendations
        else brief.get("top_priority")
    )

    biggest_risk = (
        risks[0]
        if risks
        else brief.get("biggest_blocker")
    )

    today_plan = build_today_plan(
        recommendations
    )

    return {
        "advisor_version": EXECUTIVE_ADVISOR_VERSION,
        "company_id": context.get("company_id"),
        "company_name": context.get("company_name"),
        "executive_summary": build_executive_summary(
            risks=risks,
            recommendations=recommendations,
        ),
        "top_priority": top_priority,
        "biggest_risk": biggest_risk,
        "risk_count": len(risks),
        "recommendation_count": len(
            recommendations
        ),
        "delegation_count": len(delegations),
        "risks": risks,
        "recommendations": recommendations,
        "delegations": delegations,
        "today_plan": today_plan,
    }


def build_advisor_prompt_context(
    advice: dict[str, Any],
) -> str:
    if not isinstance(advice, dict):
        return "No executive advice is available."

    lines = [
        "EXECUTIVE ADVICE",
        "",
        (
            "Summary: "
            + clean_text(
                advice.get("executive_summary")
            )
        ),
    ]

    risks = advice.get("risks", [])

    if isinstance(risks, list) and risks:
        lines.extend(
            [
                "",
                "RISKS",
            ]
        )

        for item in risks[:5]:
            if not isinstance(item, dict):
                continue

            lines.append(
                "- "
                f"[{clean_text(item.get('severity')).upper()}] "
                f"{clean_text(item.get('title'))}: "
                f"{clean_text(item.get('detail'))}"
            )

    recommendations = advice.get(
        "recommendations",
        [],
    )

    if (
        isinstance(recommendations, list)
        and recommendations
    ):
        lines.extend(
            [
                "",
                "RECOMMENDATIONS",
            ]
        )

        for item in recommendations[:5]:
            if not isinstance(item, dict):
                continue

            lines.append(
                "- "
                f"[{clean_text(item.get('priority')).upper()}] "
                f"{clean_text(item.get('title'))}: "
                f"{clean_text(item.get('detail'))}"
            )

    delegations = advice.get(
        "delegations",
        [],
    )

    if (
        isinstance(delegations, list)
        and delegations
    ):
        lines.extend(
            [
                "",
                "DELEGATION IDEAS",
            ]
        )

        for item in delegations[:5]:
            if not isinstance(item, dict):
                continue

            lines.append(
                "- "
                f"{clean_text(item.get('agent'))}: "
                f"{clean_text(item.get('task'))}"
            )

    return "\n".join(lines)