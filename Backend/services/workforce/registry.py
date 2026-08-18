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
            "Coordinates company operations, planning, workflows, "
            "and cross-agent execution."
        ),
        capabilities=(
            "orchestration",
        ),
        route_keywords=(
            "operation",
            "coordinate",
            "workflow",
            "company",
            "office",
            "planning",
            "plan",
            "organize",
            "organise",
        ),
    ),

    "hermes": WorkforceAgentDefinition(
        key="hermes",
        name="Hermes",
        role="AI Compliance Officer",
        description=(
            "Handles compliance review, company documents, "
            "licensing readiness, and missing-document detection."
        ),
        capabilities=(
            "compliance_review",
        ),
        route_keywords=(
            "compliance",
            "document",
            "documents",
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
            "Handles growth analysis, CRM analysis, sales support, "
            "campaign planning, and market launch work."
        ),
        capabilities=(
            "growth_analysis",
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
            "crm",
        ),
    ),

    "finance_ai": WorkforceAgentDefinition(
        key="finance_ai",
        name="Finance AI",
        role="AI Finance Analyst",
        description=(
            "Reviews billing, usage, ledger activity, revenue, "
            "expenses, cash flow, and financial performance."
        ),
        capabilities=(
            "billing_analysis",
        ),
        route_keywords=(
            "finance",
            "financial",
            "billing",
            "invoice",
            "revenue",
            "expense",
            "expenses",
            "cash flow",
            "cashflow",
            "budget",
            "ledger",
            "profit",
            "cost",
            "costs",
        ),
    ),

    "support_ai": WorkforceAgentDefinition(
        key="support_ai",
        name="Support AI",
        role="AI Support Specialist",
        description=(
            "Reviews support queues, triages tickets, and prepares responses."
        ),
        capabilities=(
            "ticket_triage",
        ),
        route_keywords=(
            "support",
            "ticket",
            "tickets",
            "customer issue",
            "customer problem",
            "helpdesk",
            "response",
        ),
    ),

    "mailroom_ai": WorkforceAgentDefinition(
        key="mailroom_ai",
        name="Mailroom AI",
        role="AI Mailroom Specialist",
        description=(
            "Reviews, classifies, and routes company mail."
        ),
        capabilities=(
            "mail_routing",
        ),
        route_keywords=(
            "mail",
            "mailroom",
            "letter",
            "letters",
            "postal",
            "incoming mail",
            "forward mail",
        ),
    ),

    "meeting_ai": WorkforceAgentDefinition(
        key="meeting_ai",
        name="Meeting AI",
        role="AI Meeting Coordinator",
        description=(
            "Prepares meetings, reviews commitments, and coordinates bookings."
        ),
        capabilities=(
            "meeting_preparation",
        ),
        route_keywords=(
            "meeting",
            "meetings",
            "schedule",
            "calendar",
            "booking",
            "book",
            "appointment",
            "agenda",
        ),
    ),

    "receptionist_ai": WorkforceAgentDefinition(
        key="receptionist_ai",
        name="Receptionist AI",
        role="AI Receptionist",
        description=(
            "Handles call triage, visitor coordination, and reception support."
        ),
        capabilities=(
            "reception_support",
        ),
        route_keywords=(
            "reception",
            "receptionist",
            "call",
            "calls",
            "visitor",
            "visitors",
            "front desk",
            "phone",
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
