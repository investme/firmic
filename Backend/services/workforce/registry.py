from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class WorkforceAgentDefinition:
    key: str
    name: str
    role: str
    description: str
    capabilities: tuple[str, ...]
    route_keywords: tuple[str, ...]
    default_status: str = "idle"
    mvp_enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["capabilities"] = list(self.capabilities)
        payload["route_keywords"] = list(self.route_keywords)
        return payload


AGENT_REGISTRY: dict[str, WorkforceAgentDefinition] = {
    "sonny": WorkforceAgentDefinition(
        key="sonny",
        name="Sonny",
        role="AI Chief Operating Officer",
        description=(
            "Coordinates company operations, meetings, tasks, workflows, "
            "and executive follow-up."
        ),
        capabilities=(
            "operations",
            "meetings",
            "tasks",
            "workflow_coordination",
            "executive_monitoring",
        ),
        route_keywords=(
            "operation",
            "meeting",
            "schedule",
            "book",
            "task",
            "workflow",
            "coordinate",
            "company",
            "office",
        ),
    ),
    "hermes": WorkforceAgentDefinition(
        key="hermes",
        name="Hermes",
        role="AI Compliance Officer",
        description=(
            "Handles compliance reviews, company documents, licensing, "
            "KYB readiness, and regulatory risk."
        ),
        capabilities=(
            "compliance",
            "documents",
            "licenses",
            "kyb",
            "risk",
        ),
        route_keywords=(
            "compliance",
            "document",
            "license",
            "licence",
            "kyb",
            "risk",
            "incorporation",
            "passport",
            "trade license",
            "legal",
        ),
    ),
    "julia": WorkforceAgentDefinition(
        key="julia",
        name="Julia",
        role="AI Growth Officer",
        description=(
            "Handles growth planning, campaigns, landing pages, content, "
            "lead generation, and market launch work."
        ),
        capabilities=(
            "growth",
            "marketing",
            "campaigns",
            "content",
            "lead_generation",
        ),
        route_keywords=(
            "growth",
            "marketing",
            "campaign",
            "landing page",
            "website",
            "content",
            "social",
            "lead",
            "launch",
            "sales",
        ),
    ),
}


def get_agent(agent_key: str) -> WorkforceAgentDefinition | None:
    return AGENT_REGISTRY.get(str(agent_key or "").strip().lower())


def list_agents() -> list[dict[str, Any]]:
    return [
        definition.to_dict()
        for definition in AGENT_REGISTRY.values()
        if definition.mvp_enabled
    ]


def match_agent_by_name(value: str) -> WorkforceAgentDefinition | None:
    normalized = str(value or "").strip().lower()

    for definition in AGENT_REGISTRY.values():
        if normalized in {definition.key, definition.name.lower()}:
            return definition

    return None
