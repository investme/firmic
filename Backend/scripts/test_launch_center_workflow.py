from __future__ import annotations

import sys
import uuid
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


import main  # noqa: E402

from database import SessionLocal  # noqa: E402
from models.company import Company  # noqa: E402
from models.launch_center import (  # noqa: E402
    BankPartner,
    FormationPartner,
    LaunchApplication,
    LaunchMilestone,
)
from routes.launch_center import (  # noqa: E402
    create_launch_application,
    get_launch_application_by_company,
    update_launch_application,
)
from schemas.launch_center import (  # noqa: E402
    LaunchApplicationCreate,
    LaunchApplicationUpdate,
)


TEST_USER_ID = "launch-center-test-user"
OTHER_USER_ID = "launch-center-other-user"


def token_for(user_id: str) -> dict:
    return {"sub": user_id}


def cleanup(
    db: Session,
    *,
    company_id: str,
    formation_partner_id: str,
    bank_partner_id: str,
) -> None:
    application = (
        db.query(LaunchApplication)
        .filter(LaunchApplication.company_id == company_id)
        .first()
    )

    if application:
        db.delete(application)
        db.flush()

    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if company:
        db.delete(company)
        db.flush()

    formation_partner = (
        db.query(FormationPartner)
        .filter(FormationPartner.id == formation_partner_id)
        .first()
    )

    if formation_partner:
        db.delete(formation_partner)

    bank_partner = (
        db.query(BankPartner)
        .filter(BankPartner.id == bank_partner_id)
        .first()
    )

    if bank_partner:
        db.delete(bank_partner)

    db.commit()


def main_test() -> None:
    db = SessionLocal()

    unique_suffix = str(uuid.uuid4())

    company_id = f"launch-test-company-{unique_suffix}"
    formation_partner_id = f"launch-test-formation-{unique_suffix}"
    bank_partner_id = f"launch-test-bank-{unique_suffix}"

    try:
        company = Company(
            id=company_id,
            user_id=TEST_USER_ID,
            name="Launch Center Workflow Test",
            status="initiated",
        )

        formation_partner = FormationPartner(
            id=formation_partner_id,
            name=f"Temporary Formation Partner {unique_suffix}",
            country="United Arab Emirates",
            jurisdiction="Abu Dhabi",
            description="Temporary automated test partner.",
            is_verified=False,
            is_active=True,
        )

        bank_partner = BankPartner(
            id=bank_partner_id,
            name=f"Temporary Bank Partner {unique_suffix}",
            country="United Arab Emirates",
            description="Temporary automated test banking partner.",
            supports_remote_onboarding=True,
            is_verified=False,
            is_active=True,
        )

        db.add_all(
            [
                company,
                formation_partner,
                bank_partner,
            ]
        )
        db.commit()

        created = create_launch_application(
            payload=LaunchApplicationCreate(
                company_id=company_id,
                country="United Arab Emirates",
                jurisdiction="Abu Dhabi",
                business_activity="Artificial Intelligence",
                business_description=(
                    "Temporary automated Launch Center test."
                ),
            ),
            token=token_for(TEST_USER_ID),
            db=db,
        )

        assert created["company_id"] == company_id
        assert len(created["milestones"]) == 8
        assert created["progress_percent"] == 37.5

        milestone_keys = {
            milestone.key
            for milestone in created["milestones"]
        }

        assert milestone_keys == {
            "company_profile",
            "jurisdiction",
            "business_activity",
            "formation_partner",
            "licensing",
            "banking",
            "virtual_office",
            "workspace_activation",
        }

        try:
            create_launch_application(
                payload=LaunchApplicationCreate(
                    company_id=company_id,
                ),
                token=token_for(TEST_USER_ID),
                db=db,
            )
        except HTTPException as error:
            assert error.status_code == 409
        else:
            raise AssertionError(
                "Duplicate application creation was not rejected."
            )

        try:
            get_launch_application_by_company(
                company_id=company_id,
                token=token_for(OTHER_USER_ID),
                db=db,
            )
        except HTTPException as error:
            assert error.status_code == 404
        else:
            raise AssertionError(
                "Cross-tenant access was not rejected."
            )

        updated = update_launch_application(
            application_id=created["id"],
            payload=LaunchApplicationUpdate(
                formation_partner_id=formation_partner_id,
                bank_partner_id=bank_partner_id,
                formation_status="completed",
                banking_status="completed",
                office_status="completed",
                workspace_status="completed",
            ),
            token=token_for(TEST_USER_ID),
            db=db,
        )

        print("\nUpdated Launch Application")
        print("--------------------------")
        print("Status:", updated["status"])
        print("Progress:", updated["progress_percent"])

        print("\nMilestones:")

        for milestone in updated["milestones"]:
            print(
                milestone.key,
                "->",
                milestone.status,
            )

        assert updated["progress_percent"] == 100.0
        assert updated["status"] == "completed"
        assert updated["formation_partner"].id == formation_partner_id
        assert updated["bank_partner"].id == bank_partner_id

        milestone_count = (
            db.query(LaunchMilestone)
            .filter(
                LaunchMilestone.launch_application_id
                == created["id"]
            )
            .count()
        )

        assert milestone_count == 8

        completed_count = (
            db.query(LaunchMilestone)
            .filter(
                LaunchMilestone.launch_application_id
                == created["id"],
                LaunchMilestone.status.in_(
                    ["approved", "completed"]
                ),
            )
            .count()
        )

        assert completed_count == 8

        print("PASS: Launch application created.")
        print("PASS: Exactly eight milestones initialized.")
        print("PASS: Duplicate creation rejected with HTTP 409.")
        print("PASS: Cross-tenant access rejected.")
        print("PASS: Formation and banking partners assigned.")
        print("PASS: Milestone synchronization reached 100%.")
        print("PASS: Launch application marked completed.")
        print("PASS: Launch Center end-to-end backend test passed.")

    finally:
        try:
            cleanup(
                db,
                company_id=company_id,
                formation_partner_id=formation_partner_id,
                bank_partner_id=bank_partner_id,
            )
        finally:
            db.close()


if __name__ == "__main__":
    main_test()