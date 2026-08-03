from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import main  # noqa: E402

from database import SessionLocal  # noqa: E402
from models.launch_center import (  # noqa: E402
    BankPartner,
    FormationPartner,
)


FORMATION_PARTNERS = [
    {
        "id": "demo-formation-abu-dhabi",
        "name": "Abu Dhabi Formation Partner — Demo",
        "country": "United Arab Emirates",
        "jurisdiction": "Abu Dhabi",
        "description": (
            "Demonstration provider for testing the Firmic Launch Center. "
            "Not an official Firmic partner."
        ),
        "languages": "English, Arabic",
        "services": (
            "Company formation, licensing coordination, "
            "document preparation, PRO support"
        ),
        "starting_price_usd": 1800.0,
        "average_completion_days": 7.0,
        "rating": None,
        "is_verified": False,
        "is_active": True,
    },
    {
        "id": "demo-formation-dubai",
        "name": "Dubai Formation Partner — Demo",
        "country": "United Arab Emirates",
        "jurisdiction": "Dubai",
        "description": (
            "Demonstration provider for testing the Firmic Launch Center. "
            "Not an official Firmic partner."
        ),
        "languages": "English, Arabic",
        "services": (
            "Free-zone formation, mainland coordination, "
            "visa assistance, tax-registration support"
        ),
        "starting_price_usd": 2200.0,
        "average_completion_days": 8.0,
        "rating": None,
        "is_verified": False,
        "is_active": True,
    },
]


BANK_PARTNERS = [
    {
        "id": "demo-bank-uae-digital",
        "name": "UAE Digital Business Banking — Demo",
        "country": "United Arab Emirates",
        "description": (
            "Demonstration banking-introduction option. "
            "Not an official bank partnership and approval is not guaranteed."
        ),
        "supported_company_types": (
            "Technology, consulting, SaaS, professional services"
        ),
        "requirements": (
            "Company license, incorporation documents, "
            "shareholder identification, business description"
        ),
        "minimum_balance_usd": 0.0,
        "average_review_days": 10.0,
        "supports_remote_onboarding": True,
        "is_verified": False,
        "is_active": True,
    },
    {
        "id": "demo-bank-uae-traditional",
        "name": "UAE Corporate Banking — Demo",
        "country": "United Arab Emirates",
        "description": (
            "Demonstration corporate-banking introduction. "
            "Not an official bank partnership and approval is not guaranteed."
        ),
        "supported_company_types": (
            "Trading, technology, consulting, holding companies"
        ),
        "requirements": (
            "Company documents, business plan, shareholder identification, "
            "source-of-funds information"
        ),
        "minimum_balance_usd": 5000.0,
        "average_review_days": 20.0,
        "supports_remote_onboarding": False,
        "is_verified": False,
        "is_active": True,
    },
]


def upsert(db, model, data: dict) -> None:
    record = db.query(model).filter(model.id == data["id"]).first()

    if record is None:
        record = model(**data)
        db.add(record)
        print(f"Created: {data['name']}")
        return

    for key, value in data.items():
        setattr(record, key, value)

    print(f"Updated: {data['name']}")


def main_seed() -> None:
    db = SessionLocal()

    try:
        for partner in FORMATION_PARTNERS:
            upsert(db, FormationPartner, partner)

        for partner in BANK_PARTNERS:
            upsert(db, BankPartner, partner)

        db.commit()
        print("Launch Center demonstration partners seeded.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main_seed()