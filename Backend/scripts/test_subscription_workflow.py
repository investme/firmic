from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from database import SessionLocal
from models.company import Company
from models.subscription import CompanySubscription
from services.subscription_service import (
    activate_subscription,
    calculate_subscription_totals,
    change_subscription_plan,
    create_company_subscription,
)


TEST_PLAN = "PLAN_STARTER"
UPGRADE_PLAN = "PLAN_BUSINESS"


db = SessionLocal()

try:
    company = (
        db.query(Company)
        .filter(Company.status != "terminated")
        .order_by(Company.name.asc())
        .first()
    )

    if company is None:
        raise RuntimeError(
            "No company exists. Create one first from the Launch Center."
        )

    existing = (
        db.query(CompanySubscription)
        .filter(
            CompanySubscription.company_id == company.id,
        )
        .first()
    )

    if existing:
        print("Company already has a subscription.")
        print("Delete it before running this test.")
        raise SystemExit(0)

    print(f"Testing company: {company.name}")

    subscription = create_company_subscription(
        db=db,
        company=company,
        plan_code=TEST_PLAN,
        actor="system-test",
    )

    db.commit()
    db.refresh(subscription)

    print("\nSubscription Created")
    print("--------------------")
    print(subscription.plan.name)
    print(subscription.status)
    print(f"Items: {len(subscription.items)}")

    activate_subscription(
        db=db,
        subscription=subscription,
        actor="system-test",
    )

    db.commit()
    db.refresh(subscription)

    calculate_subscription_totals(subscription)

    print("\nActivated")
    print("---------")
    print(subscription.status)
    print(subscription.monthly_total)

    change_subscription_plan(
        db=db,
        subscription=subscription,
        plan_code=UPGRADE_PLAN,
        actor="system-test",
    )

    db.commit()
    db.refresh(subscription)

    calculate_subscription_totals(subscription)

    print("\nUpgraded")
    print("---------")
    print(subscription.plan.name)
    print(subscription.monthly_total)

    print("\nIncluded services")

    for item in sorted(
        subscription.items,
        key=lambda i: i.service.name,
    ):
        included = (
            item.metadata_json or {}
        ).get("included_by_plan", False)

        print(
            f"{item.service.name:35}"
            f"{item.status:12}"
            f"included={included}"
        )

finally:
    db.close()