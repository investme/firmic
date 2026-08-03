from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import inspect
from sqlalchemy.orm import configure_mappers


# Ensure Backend is importable when this script is run directly.
BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


# Importing main registers the same models and routes used in production.
import main  # noqa: E402

from database import SessionLocal, engine  # noqa: E402
from models.company import Company  # noqa: E402
from models.launch_center import (  # noqa: E402
    BankPartner,
    FormationPartner,
    LaunchApplication,
    LaunchMilestone,
)


EXPECTED_TABLES = {
    "formation_partners",
    "bank_partners",
    "launch_applications",
    "launch_milestones",
}

EXPECTED_PATH_METHODS = {
    "/api/launch-center/applications": {"GET", "POST"},
    "/api/launch-center/applications/company/{company_id}": {"GET"},
    "/api/launch-center/applications/{application_id}": {
        "GET",
        "PATCH",
    },
    (
        "/api/launch-center/applications/"
        "{application_id}/milestones/{milestone_id}"
    ): {"PATCH"},
    "/api/launch-center/formation-partners": {"GET"},
    "/api/launch-center/bank-partners": {"GET"},
}


def check_mappers() -> None:
    configure_mappers()
    print("PASS: SQLAlchemy mappers configured successfully.")


def check_tables() -> None:
    inspector = inspect(engine)
    available = set(inspector.get_table_names())

    missing = EXPECTED_TABLES - available

    if missing:
        raise RuntimeError(
            "Missing Launch Center tables: "
            + ", ".join(sorted(missing))
        )

    print("PASS: All Launch Center tables exist.")


def check_foreign_keys() -> None:
    inspector = inspect(engine)

    launch_foreign_keys = inspector.get_foreign_keys(
        "launch_applications"
    )
    launch_targets = {
        (
            tuple(item.get("constrained_columns") or []),
            item.get("referred_table"),
            tuple(item.get("referred_columns") or []),
        )
        for item in launch_foreign_keys
    }

    expected_launch_targets = {
        (("company_id",), "companies", ("id",)),
        (
            ("formation_partner_id",),
            "formation_partners",
            ("id",),
        ),
        (("bank_partner_id",), "bank_partners", ("id",)),
    }

    missing_launch_targets = (
        expected_launch_targets - launch_targets
    )

    if missing_launch_targets:
        raise RuntimeError(
            "Missing launch_applications foreign keys: "
            f"{sorted(missing_launch_targets)}"
        )

    milestone_foreign_keys = inspector.get_foreign_keys(
        "launch_milestones"
    )
    milestone_targets = {
        (
            tuple(item.get("constrained_columns") or []),
            item.get("referred_table"),
            tuple(item.get("referred_columns") or []),
        )
        for item in milestone_foreign_keys
    }

    expected_milestone_target = (
        ("launch_application_id",),
        "launch_applications",
        ("id",),
    )

    if expected_milestone_target not in milestone_targets:
        raise RuntimeError(
            "Missing launch_milestones application foreign key."
        )

    print("PASS: Launch Center foreign keys are correct.")


def check_unique_company_index() -> None:
    inspector = inspect(engine)
    indexes = inspector.get_indexes("launch_applications")

    company_indexes = [
        item
        for item in indexes
        if item.get("column_names") == ["company_id"]
    ]

    if not any(item.get("unique") for item in company_indexes):
        raise RuntimeError(
            "company_id does not have a unique index."
        )

    print(
        "PASS: One launch application is enforced per company."
    )


def check_openapi() -> None:
    schema = main.app.openapi()
    paths = schema.get("paths", {})

    for path, expected_methods in EXPECTED_PATH_METHODS.items():
        if path not in paths:
            raise RuntimeError(
                f"Missing OpenAPI path: {path}"
            )

        actual_methods = {
            method.upper()
            for method in paths[path]
            if method.lower()
            in {"get", "post", "put", "patch", "delete"}
        }

        if actual_methods != expected_methods:
            raise RuntimeError(
                f"Unexpected methods for {path}: "
                f"expected={sorted(expected_methods)}, "
                f"actual={sorted(actual_methods)}"
            )

    print("PASS: Launch Center OpenAPI paths are correct.")


def check_database_counts() -> None:
    db = SessionLocal()

    try:
        counts = {
            "companies": db.query(Company).count(),
            "formation_partners": db.query(
                FormationPartner
            ).count(),
            "bank_partners": db.query(BankPartner).count(),
            "launch_applications": db.query(
                LaunchApplication
            ).count(),
            "launch_milestones": db.query(
                LaunchMilestone
            ).count(),
        }
    finally:
        db.close()

    print("Database counts:")

    for name, count in counts.items():
        print(f"  {name}: {count}")


def main_validation() -> None:
    print("Firmic Launch Center validation")
    print("=" * 38)

    check_mappers()
    check_tables()
    check_foreign_keys()
    check_unique_company_index()
    check_openapi()
    check_database_counts()

    print("=" * 38)
    print("PASS: Launch Center foundation is healthy.")


if __name__ == "__main__":
    main_validation()
