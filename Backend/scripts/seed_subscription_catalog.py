from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


from database import SessionLocal  # noqa: E402
from models.company import Company  # noqa: E402, F401
from models.subscription import Plan, ServiceCatalog  # noqa: E402




LAUNCH_FEE_USD = 79.0


PLANS: list[dict[str, Any]] = [
    {
        "code": "PLAN_STARTER",
        "name": "Firmic Starter",
        "description": (
            "For solo founders and early-stage companies launching and "
            "operating through Firmic."
        ),
        "monthly_price": 149.0,
        "yearly_price": 1490.0,
        "max_ai_employees": 5,
        "max_users": 2,
        "active": True,
    },
    {
        "code": "PLAN_BUSINESS",
        "name": "Firmic Business",
        "description": (
            "For growing startups and SMEs requiring advanced operations, "
            "integrations, automation, and a larger AI workforce."
        ),
        "monthly_price": 399.0,
        "yearly_price": 3990.0,
        "max_ai_employees": 25,
        "max_users": 20,
        "active": True,
    },
    {
        "code": "PLAN_ENTERPRISE",
        "name": "Firmic Enterprise",
        "description": (
            "For larger organizations requiring multi-company operations, "
            "custom integrations, advanced security, and dedicated support."
        ),
        "monthly_price": 999.0,
        "yearly_price": 9990.0,
        "max_ai_employees": 0,
        "max_users": 0,
        "active": True,
    },
]


SERVICES: list[dict[str, Any]] = [
    {
        "code": "SERVICE_LAUNCH_CENTER",
        "category": "launch",
        "name": "Launch Center",
        "description": (
            "Guided company launch, formation tracking, banking coordination, "
            "headquarters activation, and workspace readiness."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": True,
            "sidebar_href": "/launch-center",
        },
    },
    {
        "code": "SERVICE_VIRTUAL_HEADQUARTERS",
        "category": "office",
        "name": "Virtual Headquarters",
        "description": (
            "Firmic virtual business headquarters with a registered address "
            "and workspace integration."
        ),
        "monthly_price": 99.0,
        "yearly_price": 990.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": True,
            "sidebar_href": "/my-office",
        },
    },
    {
        "code": "SERVICE_MAILBOX",
        "category": "communications",
        "name": "Digital Mailroom",
        "description": (
            "Digital business mail handling, scanning, notifications, and "
            "mailbox management."
        ),
        "monthly_price": 19.0,
        "yearly_price": 190.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": True,
            "sidebar_href": "/mailbox",
        },
    },
    {
        "code": "SERVICE_VOIP",
        "category": "communications",
        "name": "Business VoIP",
        "description": (
            "Business calling, company phone management, and VoIP workspace."
        ),
        "monthly_price": 39.0,
        "yearly_price": 390.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": True,
            "sidebar_href": "/voip-calls",
        },
    },
    {
        "code": "SERVICE_MEETING_CENTER",
        "category": "workspace",
        "name": "Meeting Center",
        "description": (
            "Meeting-room booking, video meeting coordination, and workspace "
            "meeting management."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "usage_based": True,
            "hourly_price_usd": 25.0,
            "provisioning_required": False,
            "sidebar_href": "/meeting-rooms",
        },
    },
    {
        "code": "SERVICE_SONNY",
        "category": "ai",
        "name": "Sonny AI COO",
        "description": (
            "AI Chief Operating Officer for company coordination, priorities, "
            "workflows, and executive guidance."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "core_executive": True,
            "provisioning_required": True,
            "sidebar_href": "/sonny",
        },
    },
    {
        "code": "SERVICE_HERMES",
        "category": "ai",
        "name": "Hermes Compliance",
        "description": (
            "AI compliance executive for operational checks, document review, "
            "and regulatory guidance."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "core_executive": True,
            "provisioning_required": True,
            "sidebar_href": "/hermes",
        },
    },
    {
        "code": "SERVICE_AI_EMPLOYEE",
        "category": "ai",
        "name": "AI Employee",
        "description": (
            "A specialized Firmic AI employee assigned to a business role or "
            "department."
        ),
        "monthly_price": 59.0,
        "yearly_price": 590.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_quantity": {
                "PLAN_STARTER": 5,
                "PLAN_BUSINESS": 25,
                "PLAN_ENTERPRISE": None,
            },
            "provisioning_required": True,
            "sidebar_href": "/ai-workforce",
            "meter": "employee_count",
        },
    },
    {
        "code": "SERVICE_CRM",
        "category": "business_tools",
        "name": "Firmic CRM",
        "description": (
            "Customer, contact, opportunity, communication, and sales-pipeline "
            "management."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_STARTER",
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "business_features": "advanced",
            "provisioning_required": False,
            "sidebar_href": "/crm",
        },
    },
    {
        "code": "SERVICE_MS365",
        "category": "integration",
        "name": "Microsoft 365 Integration",
        "description": (
            "Connect and manage Microsoft 365 services through Firmic."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_owned_account",
            "business_mode": "integration_included",
            "enterprise_mode": "integration_included",
            "third_party_license_not_included": True,
            "provisioning_required": True,
            "sidebar_href": "/microsoft-365",
        },
    },
    {
        "code": "SERVICE_OPENAI_BASIC",
        "category": "integration",
        "name": "Basic OpenAI",
        "description": (
            "Basic Firmic-managed OpenAI capacity for supported AI workflows."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_api_key",
            "business_mode": "basic_firmic_managed",
            "enterprise_mode": "managed_or_private",
            "provisioning_required": True,
            "sidebar_href": "/integrations",
        },
    },
    {
        "code": "SERVICE_ZOOM",
        "category": "integration",
        "name": "Zoom Integration",
        "description": (
            "Connect Zoom meetings and meeting-room workflows to Firmic."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_owned_account",
            "third_party_license_not_included": True,
            "provisioning_required": True,
            "sidebar_href": "/integrations",
        },
    },
    {
        "code": "SERVICE_QUICKBOOKS",
        "category": "integration",
        "name": "QuickBooks Integration",
        "description": (
            "Connect QuickBooks accounting data and workflows to Firmic."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_owned_account",
            "third_party_license_not_included": True,
            "provisioning_required": True,
            "sidebar_href": "/integrations",
        },
    },
    {
        "code": "SERVICE_SLACK",
        "category": "integration",
        "name": "Slack Integration",
        "description": (
            "Connect company Slack workspaces to Firmic notifications and "
            "operational workflows."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_owned_account",
            "third_party_license_not_included": True,
            "provisioning_required": True,
            "sidebar_href": "/integrations",
        },
    },
    {
        "code": "SERVICE_HUBSPOT",
        "category": "integration",
        "name": "HubSpot Integration",
        "description": (
            "Connect HubSpot CRM and marketing workflows to Firmic."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": True,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "starter_mode": "customer_owned_account",
            "third_party_license_not_included": True,
            "provisioning_required": True,
            "sidebar_href": "/integrations",
        },
    },
    {
        "code": "SERVICE_EXECUTIVE_INTELLIGENCE",
        "category": "intelligence",
        "name": "Executive Intelligence",
        "description": (
            "Company health, executive reporting, risks, recommendations, and "
            "operational intelligence."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": False,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": False,
            "sidebar_href": "/executive-intelligence",
        },
    },
    {
        "code": "SERVICE_WORKFLOW_AUTOMATION",
        "category": "operations",
        "name": "Workflow Automation",
        "description": (
            "Advanced automated workflows coordinated across Firmic services "
            "and AI employees."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": False,
        "business_available": True,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": [
                "PLAN_BUSINESS",
                "PLAN_ENTERPRISE",
            ],
            "provisioning_required": True,
        },
    },
    {
        "code": "SERVICE_API_ACCESS",
        "category": "enterprise",
        "name": "Firmic API Access",
        "description": (
            "Enterprise API access for custom systems and integrations."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": False,
        "business_available": False,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": ["PLAN_ENTERPRISE"],
            "provisioning_required": True,
        },
    },
    {
        "code": "SERVICE_SSO",
        "category": "enterprise",
        "name": "Enterprise SSO",
        "description": (
            "Single sign-on and enterprise identity-provider integration."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": False,
        "business_available": False,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": ["PLAN_ENTERPRISE"],
            "provisioning_required": True,
        },
    },
    {
        "code": "SERVICE_AUDIT_LOGS",
        "category": "enterprise",
        "name": "Advanced Audit Logs",
        "description": (
            "Extended enterprise audit trails, retention, and governance."
        ),
        "monthly_price": 0.0,
        "yearly_price": 0.0,
        "setup_fee": 0.0,
        "starter_available": False,
        "business_available": False,
        "enterprise_available": True,
        "active": True,
        "metadata_json": {
            "included_in_plans": ["PLAN_ENTERPRISE"],
            "provisioning_required": False,
        },
    },
]


def upsert_plan(
    db: Session,
    definition: dict[str, Any],
) -> Plan:
    plan = (
        db.query(Plan)
        .filter(Plan.code == definition["code"])
        .first()
    )

    if plan is None:
        plan = Plan(
            id=str(uuid.uuid4()),
            code=definition["code"],
        )
        db.add(plan)

    for field_name, value in definition.items():
        setattr(plan, field_name, value)

    return plan


def upsert_service(
    db: Session,
    definition: dict[str, Any],
) -> ServiceCatalog:
    service = (
        db.query(ServiceCatalog)
        .filter(ServiceCatalog.code == definition["code"])
        .first()
    )

    if service is None:
        service = ServiceCatalog(
            id=str(uuid.uuid4()),
            code=definition["code"],
        )
        db.add(service)

    for field_name, value in definition.items():
        setattr(service, field_name, value)

    return service


def seed_catalog() -> None:
    db = SessionLocal()

    try:
        plans = [
            upsert_plan(db, definition)
            for definition in PLANS
        ]

        services = [
            upsert_service(db, definition)
            for definition in SERVICES
        ]

        db.commit()

        print("Subscription catalog seeded successfully.")
        print(f"Company launch fee: ${LAUNCH_FEE_USD:.2f}")
        print(f"Plans upserted: {len(plans)}")
        print(f"Services upserted: {len(services)}")

        print("\nPlans")

        for plan in (
            db.query(Plan)
            .order_by(Plan.monthly_price.asc())
            .all()
        ):
            employee_limit = (
                "Unlimited"
                if plan.max_ai_employees == 0
                else str(plan.max_ai_employees)
            )

            print(
                f"- {plan.code}: "
                f"${plan.monthly_price:.2f}/month, "
                f"AI employees: {employee_limit}"
            )

        print("\nService Catalog")

        for service in (
            db.query(ServiceCatalog)
            .order_by(
                ServiceCatalog.category.asc(),
                ServiceCatalog.name.asc(),
            )
            .all()
        ):
            print(
                f"- {service.code}: "
                f"{service.name} "
                f"({service.category})"
            )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_catalog()