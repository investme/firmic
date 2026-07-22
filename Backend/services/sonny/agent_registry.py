from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_orchestration import SonnyAgentRegistry


ACTIVE_AGENT_STATUSES = {
    "active",
}

AGENT_PRIORITY = {
    "coordinator": 0,
    "specialist": 1,
    "assistant": 2,
}

DEFAULT_AGENT_DEFINITIONS: dict[str, dict[str, Any]] = {
    "sonny": {
        "name": "Sonny",
        "role": "AI Chief Operating Officer",
        "agent_type": "coordinator",
        "description": (
            "Coordinates controlled company operations and delegates "
            "work to qualified specialist agents."
        ),
        "capabilities": [
            "orchestration",
            "planning",
            "decision_coordination",
            "workflow_coordination",
        ],
        "allowed_action_codes": [],
        "approval_policy": {
            "default_approval_required": True,
        },
    },
    "hermes": {
        "name": "Hermes",
        "role": "Compliance and Documents Agent",
        "agent_type": "specialist",
        "description": (
            "Handles controlled compliance review and document operations."
        ),
        "capabilities": [
            "compliance_review",
            "document_review",
            "missing_document_detection",
        ],
        "allowed_action_codes": [
            "request_missing_documents",
        ],
        "approval_policy": {
            "external_request_requires_approval": True,
        },
    },
    "finance_ai": {
        "name": "Finance AI",
        "role": "Billing and Ledger Agent",
        "agent_type": "specialist",
        "description": (
            "Handles controlled billing analysis and ledger preparation."
        ),
        "capabilities": [
            "ledger_review",
            "billing_analysis",
            "billing_recommendation",
        ],
        "allowed_action_codes": [
            "inspect_usage_ledger",
            "prepare_billing_action",
        ],
        "approval_policy": {
            "billing_mutation_requires_approval": True,
        },
    },
    "support_ai": {
        "name": "Support AI",
        "role": "Support Operations Agent",
        "agent_type": "specialist",
        "description": (
            "Handles support queue review and controlled response preparation."
        ),
        "capabilities": [
            "support_queue_review",
            "response_preparation",
            "ticket_triage",
        ],
        "allowed_action_codes": [
            "review_support_queue",
            "prepare_support_response",
        ],
        "approval_policy": {
            "external_response_requires_approval": True,
        },
    },
    "julia": {
        "name": "Julia",
        "role": "Growth Officer",
        "agent_type": "specialist",
        "description": (
            "Handles growth analysis, CRM intelligence, and sales support."
        ),
        "capabilities": [
            "growth_analysis",
            "crm_analysis",
            "sales_support",
        ],
        "allowed_action_codes": [],
        "approval_policy": {
            "external_campaign_requires_approval": True,
        },
    },
    "meeting_ai": {
        "name": "Meeting AI",
        "role": "Meeting Coordinator",
        "agent_type": "specialist",
        "description": (
            "Handles meeting review, preparation, and booking coordination."
        ),
        "capabilities": [
            "meeting_review",
            "meeting_preparation",
            "booking_coordination",
        ],
        "allowed_action_codes": [
            "review_meeting_commitments",
        ],
        "approval_policy": {
            "booking_mutation_requires_approval": True,
        },
    },
    "receptionist_ai": {
        "name": "Receptionist AI",
        "role": "Reception and Calls Agent",
        "agent_type": "specialist",
        "description": (
            "Handles controlled reception, calls, and visitor coordination."
        ),
        "capabilities": [
            "call_triage",
            "visitor_coordination",
            "reception_support",
        ],
        "allowed_action_codes": [],
        "approval_policy": {
            "external_communication_requires_approval": True,
        },
    },
    "mailroom_ai": {
        "name": "Mailroom AI",
        "role": "Digital Mailroom Agent",
        "agent_type": "specialist",
        "description": (
            "Handles incoming business mail review and routing."
        ),
        "capabilities": [
            "mail_review",
            "mail_classification",
            "mail_routing",
        ],
        "allowed_action_codes": [],
        "approval_policy": {
            "external_forwarding_requires_approval": True,
        },
    },
}


@dataclass(frozen=True)
class AgentMatch:
    agent: SonnyAgentRegistry
    score: int
    capability_match: bool
    action_match: bool
    reasons: tuple[str, ...]


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    return [
        normalize(value)
        for value in values
        if normalize(value)
    ]


def serialize_agent(
    agent: SonnyAgentRegistry,
) -> dict[str, Any]:
    return {
        "id": agent.id,
        "agent_code": agent.agent_code,
        "name": agent.name,
        "role": agent.role,
        "description": agent.description,
        "status": agent.status,
        "agent_type": agent.agent_type,
        "capabilities": agent.capabilities or [],
        "allowed_action_codes": agent.allowed_action_codes or [],
        "approval_policy": agent.approval_policy or {},
        "configuration": agent.configuration or {},
        "system_managed": bool(agent.system_managed),
        "version": agent.version,
        "created_at": (
            agent.created_at.isoformat()
            if agent.created_at
            else None
        ),
        "updated_at": (
            agent.updated_at.isoformat()
            if agent.updated_at
            else None
        ),
    }


def sync_default_agents(
    db: Session,
) -> list[SonnyAgentRegistry]:
    existing = {
        item.agent_code: item
        for item in db.query(SonnyAgentRegistry).all()
    }

    changed = False

    for code, definition in DEFAULT_AGENT_DEFINITIONS.items():
        agent = existing.get(code)

        if agent is None:
            agent = SonnyAgentRegistry(
                agent_code=code,
                name=definition["name"],
                role=definition["role"],
                description=definition["description"],
                status="active",
                agent_type=definition["agent_type"],
                capabilities=definition["capabilities"],
                allowed_action_codes=definition["allowed_action_codes"],
                approval_policy=definition["approval_policy"],
                configuration={},
                system_managed=True,
                version="b5.2",
            )
            db.add(agent)
            existing[code] = agent
            changed = True
            continue

        updates = {
            "name": definition["name"],
            "role": definition["role"],
            "description": definition["description"],
            "agent_type": definition["agent_type"],
            "capabilities": definition["capabilities"],
            "allowed_action_codes": definition["allowed_action_codes"],
            "approval_policy": definition["approval_policy"],
            "version": "b5.2",
        }

        for field, value in updates.items():
            if getattr(agent, field) != value:
                setattr(agent, field, value)
                changed = True

    if changed:
        db.commit()

    agents = (
        db.query(SonnyAgentRegistry)
        .order_by(
            SonnyAgentRegistry.agent_type.asc(),
            SonnyAgentRegistry.name.asc(),
        )
        .all()
    )

    return agents


def list_active_agents(
    db: Session,
) -> list[SonnyAgentRegistry]:
    return (
        db.query(SonnyAgentRegistry)
        .filter(
            SonnyAgentRegistry.status.in_(
                ACTIVE_AGENT_STATUSES
            )
        )
        .order_by(
            SonnyAgentRegistry.agent_type.asc(),
            SonnyAgentRegistry.name.asc(),
        )
        .all()
    )


def get_agent_by_code(
    db: Session,
    *,
    agent_code: str,
    require_active: bool = True,
) -> SonnyAgentRegistry:
    query = db.query(SonnyAgentRegistry).filter(
        SonnyAgentRegistry.agent_code
        == normalize(agent_code)
    )

    if require_active:
        query = query.filter(
            SonnyAgentRegistry.status.in_(
                ACTIVE_AGENT_STATUSES
            )
        )

    agent = query.first()

    if not agent:
        raise ValueError(
            "Agent not found or inactive."
        )

    return agent


def agent_has_capability(
    agent: SonnyAgentRegistry,
    capability: str,
) -> bool:
    required = normalize(capability)

    if not required:
        return False

    capabilities = normalize_list(
        agent.capabilities
    )

    return required in capabilities


def agent_allows_action(
    agent: SonnyAgentRegistry,
    action_code: str | None,
) -> bool:
    if not action_code:
        return True

    allowed = normalize_list(
        agent.allowed_action_codes
    )

    return normalize(action_code) in allowed


def validate_agent_assignment(
    agent: SonnyAgentRegistry,
    *,
    required_capability: str,
    action_code: str | None = None,
) -> None:
    if normalize(agent.status) != "active":
        raise ValueError(
            "Agent is not active."
        )

    if not agent_has_capability(
        agent,
        required_capability,
    ):
        raise ValueError(
            f"Agent '{agent.agent_code}' does not have capability "
            f"'{required_capability}'."
        )

    if action_code and not agent_allows_action(
        agent,
        action_code,
    ):
        raise ValueError(
            f"Agent '{agent.agent_code}' is not allowed to perform "
            f"action '{action_code}'."
        )


def score_agent(
    agent: SonnyAgentRegistry,
    *,
    required_capability: str,
    action_code: str | None = None,
    preferred_agent_code: str | None = None,
) -> AgentMatch:
    capability_match = agent_has_capability(
        agent,
        required_capability,
    )

    action_match = agent_allows_action(
        agent,
        action_code,
    )

    score = 0
    reasons: list[str] = []

    if capability_match:
        score += 100
        reasons.append(
            "Required capability matched."
        )

    if action_code:
        if action_match:
            score += 50
            reasons.append(
                "Requested action is allowlisted."
            )
        else:
            score -= 1000
            reasons.append(
                "Requested action is not allowlisted."
            )

    if (
        preferred_agent_code
        and normalize(agent.agent_code)
        == normalize(preferred_agent_code)
    ):
        score += 25
        reasons.append(
            "Preferred agent matched."
        )

    if normalize(agent.agent_type) == "specialist":
        score += 10
        reasons.append(
            "Specialist agent."
        )

    if normalize(agent.status) != "active":
        score -= 1000
        reasons.append(
            "Agent is inactive."
        )

    score -= AGENT_PRIORITY.get(
        normalize(agent.agent_type),
        99,
    )

    return AgentMatch(
        agent=agent,
        score=score,
        capability_match=capability_match,
        action_match=action_match,
        reasons=tuple(reasons),
    )


def find_qualified_agents(
    db: Session,
    *,
    required_capability: str,
    action_code: str | None = None,
    preferred_agent_code: str | None = None,
) -> list[AgentMatch]:
    matches = [
        score_agent(
            agent,
            required_capability=required_capability,
            action_code=action_code,
            preferred_agent_code=preferred_agent_code,
        )
        for agent in list_active_agents(db)
    ]

    qualified = [
        match
        for match in matches
        if match.capability_match
        and match.action_match
        and match.score > 0
    ]

    qualified.sort(
        key=lambda match: (
            -match.score,
            normalize(match.agent.name),
        )
    )

    return qualified


def select_best_agent(
    db: Session,
    *,
    required_capability: str,
    action_code: str | None = None,
    preferred_agent_code: str | None = None,
) -> SonnyAgentRegistry:
    matches = find_qualified_agents(
        db,
        required_capability=required_capability,
        action_code=action_code,
        preferred_agent_code=preferred_agent_code,
    )

    if not matches:
        action_text = (
            f" and action '{action_code}'"
            if action_code
            else ""
        )

        raise ValueError(
            "No active agent is qualified for capability "
            f"'{required_capability}'{action_text}."
        )

    return matches[0].agent


def build_capability_matrix(
    db: Session,
) -> dict[str, Any]:
    agents = list_active_agents(db)

    capability_map: dict[str, list[str]] = {}
    action_map: dict[str, list[str]] = {}

    for agent in agents:
        for capability in normalize_list(
            agent.capabilities
        ):
            capability_map.setdefault(
                capability,
                [],
            ).append(agent.agent_code)

        for action_code in normalize_list(
            agent.allowed_action_codes
        ):
            action_map.setdefault(
                action_code,
                [],
            ).append(agent.agent_code)

    for values in capability_map.values():
        values.sort()

    for values in action_map.values():
        values.sort()

    return {
        "engine_version": "b5.2",
        "agent_count": len(agents),
        "agents": [
            serialize_agent(agent)
            for agent in agents
        ],
        "capabilities": capability_map,
        "allowed_actions": action_map,
    }


def explain_agent_selection(
    db: Session,
    *,
    required_capability: str,
    action_code: str | None = None,
    preferred_agent_code: str | None = None,
) -> dict[str, Any]:
    matches = find_qualified_agents(
        db,
        required_capability=required_capability,
        action_code=action_code,
        preferred_agent_code=preferred_agent_code,
    )

    selected = (
        matches[0]
        if matches
        else None
    )

    return {
        "required_capability": required_capability,
        "action_code": action_code,
        "preferred_agent_code": preferred_agent_code,
        "selected_agent": (
            serialize_agent(selected.agent)
            if selected
            else None
        ),
        "matches": [
            {
                "agent": serialize_agent(match.agent),
                "score": match.score,
                "capability_match": match.capability_match,
                "action_match": match.action_match,
                "reasons": list(match.reasons),
            }
            for match in matches
        ],
    }
