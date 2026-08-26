from __future__ import annotations

import datetime
import hashlib
import json
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_action_confirmation import (
    SonnyActionConfirmation,
)


CONFIRMATION_TTL_SECONDS = 600


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=str,
    )


def canonicalize_action_plan(
    plan: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(plan, dict):
        raise ValueError(
            "Confirmation plan must be a dictionary."
        )

    action = str(
        plan.get("action") or ""
    ).strip().lower()

    if not action:
        raise ValueError(
            "Confirmation plan requires an action."
        )

    parameters = plan.get("parameters")

    if not isinstance(parameters, dict):
        parameters = {}

    requires_confirmation = bool(
        plan.get(
            "requires_confirmation",
            True,
        )
    )

    missing_fields = plan.get(
        "missing_fields"
    )

    if not isinstance(
        missing_fields,
        list,
    ):
        missing_fields = []

    return {
        "action": action,
        "parameters": parameters,
        "requires_confirmation": (
            requires_confirmation
        ),
        "missing_fields": [
            str(item)
            for item in missing_fields
        ],
    }


def action_fingerprint(
    *,
    company_id: str,
    actor_id: str,
    plan: dict[str, Any],
) -> str:
    canonical = canonicalize_action_plan(
        plan
    )

    payload = {
        "company_id": str(company_id),
        "actor_id": str(actor_id),
        "plan": canonical,
    }

    return hashlib.sha256(
        stable_json(payload).encode(
            "utf-8"
        )
    ).hexdigest()


def issue_action_confirmation(
    db: Session,
    *,
    company_id: str,
    actor_id: str,
    plan: dict[str, Any],
    ttl_seconds: int = CONFIRMATION_TTL_SECONDS,
) -> SonnyActionConfirmation:
    if not isinstance(db, Session):
        raise TypeError(
            "db must be a SQLAlchemy Session."
        )

    canonical = canonicalize_action_plan(
        plan
    )

    if canonical["missing_fields"]:
        raise ValueError(
            "Cannot confirm a plan with missing fields."
        )

    if (
        canonical["requires_confirmation"]
        is not True
    ):
        raise ValueError(
            "Only confirmation-required actions "
            "may receive confirmation authority."
        )

    now = utcnow()

    record = SonnyActionConfirmation(
        company_id=str(company_id),
        actor_id=str(actor_id),
        action=canonical["action"],
        action_fingerprint=(
            action_fingerprint(
                company_id=str(
                    company_id
                ),
                actor_id=str(
                    actor_id
                ),
                plan=canonical,
            )
        ),
        plan=canonical,
        status="pending",
        created_at=now,
        expires_at=(
            now
            + datetime.timedelta(
                seconds=max(
                    1,
                    int(ttl_seconds),
                )
            )
        ),
    )

    db.add(record)
    db.flush()

    return record


def serialize_action_confirmation(
    record: SonnyActionConfirmation,
) -> dict[str, Any]:
    return {
        "id": record.id,
        "company_id": record.company_id,
        "action": record.action,
        "status": record.status,
        "expires_at": (
            record.expires_at.isoformat()
            if record.expires_at
            else None
        ),
        "created_at": (
            record.created_at.isoformat()
            if record.created_at
            else None
        ),
    }


def load_action_confirmation(
    db: Session,
    *,
    confirmation_id: str,
    company_id: str,
    actor_id: str,
) -> SonnyActionConfirmation:
    record = (
        db.query(
            SonnyActionConfirmation
        )
        .filter(
            SonnyActionConfirmation.id
            == str(confirmation_id),
            SonnyActionConfirmation.company_id
            == str(company_id),
            SonnyActionConfirmation.actor_id
            == str(actor_id),
        )
        .first()
    )

    if record is None:
        raise ValueError(
            "Confirmation not found."
        )

    return record


def validate_action_confirmation(
    record: SonnyActionConfirmation,
) -> None:
    now = utcnow()

    if record.status != "pending":
        raise ValueError(
            "Confirmation is no longer pending."
        )

    if record.consumed_at is not None:
        raise ValueError(
            "Confirmation has already been consumed."
        )

    if (
        record.expires_at is None
        or record.expires_at <= now
    ):
        raise ValueError(
            "Confirmation has expired."
        )

    canonical = canonicalize_action_plan(
        record.plan or {}
    )

    expected = action_fingerprint(
        company_id=record.company_id,
        actor_id=record.actor_id,
        plan=canonical,
    )

    if (
        expected
        != record.action_fingerprint
    ):
        raise ValueError(
            "Confirmation fingerprint mismatch."
        )

    if (
        canonical["action"]
        != record.action
    ):
        raise ValueError(
            "Confirmation action mismatch."
        )


def consume_action_confirmation(
    db: Session,
    *,
    confirmation_id: str,
    company_id: str,
    actor_id: str,
) -> dict[str, Any]:
    record = (
        db.query(
            SonnyActionConfirmation
        )
        .filter(
            SonnyActionConfirmation.id
            == str(confirmation_id),
            SonnyActionConfirmation.company_id
            == str(company_id),
            SonnyActionConfirmation.actor_id
            == str(actor_id),
        )
        .with_for_update()
        .first()
    )

    if record is None:
        raise ValueError(
            "Confirmation not found."
        )

    validate_action_confirmation(
        record
    )

    canonical = canonicalize_action_plan(
        record.plan or {}
    )

    # Security boundary:
    # consume authority before executing the consequential
    # operation. A downstream rollback must never restore a
    # confirmation token to reusable state.
    record.status = "consumed"
    record.consumed_at = utcnow()

    db.commit()

    return canonical
