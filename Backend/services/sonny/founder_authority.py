from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from firmic_models import User
from models.company import Company


def normalize_actor_id(
    actor_id: object,
) -> str:
    return str(
        actor_id or ""
    ).strip()


def is_company_founder(
    *,
    company: Company,
    actor_id: object,
) -> bool:
    normalized_actor = normalize_actor_id(
        actor_id
    )

    if not normalized_actor:
        return False

    owner_id = normalize_actor_id(
        company.user_id
    )

    if not owner_id:
        return False

    return owner_id == normalized_actor


def require_founder_authority(
    *,
    company: Company,
    actor_id: object,
) -> str:
    normalized_actor = normalize_actor_id(
        actor_id
    )

    if not normalized_actor:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    if not is_company_founder(
        company=company,
        actor_id=normalized_actor,
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Founder authority required "
                "for this company."
            ),
        )

    return normalized_actor


def resolve_company_founder(
    *,
    db: Session,
    company: Company,
) -> User | None:
    owner_id = normalize_actor_id(
        company.user_id
    )

    if not owner_id:
        return None

    try:
        normalized_user_id = int(
            owner_id
        )
    except (TypeError, ValueError):
        return None

    return (
        db.query(User)
        .filter(
            User.id
            == normalized_user_id
        )
        .first()
    )


def founder_authority_snapshot(
    *,
    db: Session,
    company: Company,
    actor_id: object,
) -> dict:
    actor = normalize_actor_id(
        actor_id
    )

    founder = resolve_company_founder(
        db=db,
        company=company,
    )

    return {
        "company_id": str(company.id),
        "founder_user_id": (
            str(company.user_id)
            if company.user_id is not None
            else None
        ),
        "actor_id": actor or None,
        "actor_is_founder": (
            is_company_founder(
                company=company,
                actor_id=actor,
            )
        ),
        "founder_role": (
            str(founder.role)
            if founder is not None
            and founder.role is not None
            else None
        ),
    }
