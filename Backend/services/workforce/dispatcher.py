from __future__ import annotations

from typing import Any

from services.workforce.registry import (
    AGENT_REGISTRY,
    WorkforceAgentDefinition,
    match_agent_by_name,
)


def normalize(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def dispatch_work(
    request_text: str,
    preferred_agent: str | None = None,
) -> dict[str, Any]:
    message = normalize(request_text)

    if preferred_agent:
        selected = match_agent_by_name(preferred_agent)
        if selected:
            return build_dispatch_result(
                selected,
                confidence=1.0,
                reason="The founder selected this AI employee.",
            )

    scores: dict[str, int] = {}

    for key, definition in AGENT_REGISTRY.items():
        score = sum(
            1
            for keyword in definition.route_keywords
            if keyword in message
        )
        scores[key] = score

    selected_key = max(scores, key=scores.get)
    selected_score = scores[selected_key]

    if selected_score == 0:
        selected_key = "sonny"

    selected = AGENT_REGISTRY[selected_key]
    matched_keywords = [
        keyword
        for keyword in selected.route_keywords
        if keyword in message
    ]

    confidence = (
        min(0.98, 0.60 + (selected_score * 0.09))
        if selected_score
        else 0.58
    )

    return build_dispatch_result(
        selected,
        confidence=confidence,
        reason=(
            "Matched capabilities: " + ", ".join(matched_keywords[:5])
            if matched_keywords
            else "No specialist match was found, so Sonny will coordinate the work."
        ),
    )


def build_dispatch_result(
    agent: WorkforceAgentDefinition,
    *,
    confidence: float,
    reason: str,
) -> dict[str, Any]:
    return {
        "agent_key": agent.key,
        "agent_name": agent.name,
        "agent_role": agent.role,
        "confidence": round(float(confidence), 2),
        "reason": reason,
        "capabilities": list(agent.capabilities),
    }
