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

    # Specialists take priority when their domain language matches.
    # Sonny remains the coordinator/fallback and should not steal
    # specialist work merely because generic words such as "company"
    # or "plan" also appear in the request.
    specialist_scores = {
        key: score
        for key, score in scores.items()
        if key != "sonny" and score > 0
    }

    if specialist_scores:
        selected_key = max(
            specialist_scores,
            key=specialist_scores.get,
        )
        selected_score = specialist_scores[selected_key]
    else:
        selected_key = "sonny"
        selected_score = scores.get("sonny", 0)

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



def dispatch_work_targets(
    request_text: str,
    preferred_agent: str | None = None,
) -> list[dict[str, Any]]:
    """
    Resolve every specialist domain explicitly represented in a
    founder workforce request.

    Contract:
    - preferred_agent preserves explicit single-agent routing;
    - every matching specialist may receive one dispatch target;
    - Sonny remains the fallback only when no specialist matches;
    - result ordering follows AGENT_REGISTRY ordering;
    - this function does not inspect or mutate tenant activation.
      Canonical assignment creation remains responsible for that
      authority boundary.
    """

    message = normalize(request_text)

    if preferred_agent:
        selected = match_agent_by_name(preferred_agent)

        if selected:
            return [
                build_dispatch_result(
                    selected,
                    confidence=1.0,
                    reason="The founder selected this AI employee.",
                )
            ]

    targets: list[dict[str, Any]] = []

    for key, definition in AGENT_REGISTRY.items():
        if key == "sonny":
            continue

        matched_keywords = [
            keyword
            for keyword in definition.route_keywords
            if keyword in message
        ]

        if not matched_keywords:
            continue

        score = len(matched_keywords)

        confidence = min(
            0.98,
            0.60 + (score * 0.09),
        )

        targets.append(
            build_dispatch_result(
                definition,
                confidence=confidence,
                reason=(
                    "Matched capabilities: "
                    + ", ".join(matched_keywords[:5])
                ),
            )
        )

    if targets:
        return targets

    sonny = AGENT_REGISTRY["sonny"]

    return [
        build_dispatch_result(
            sonny,
            confidence=0.58,
            reason=(
                "No specialist match was found, so Sonny "
                "will coordinate the work."
            ),
        )
    ]

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
