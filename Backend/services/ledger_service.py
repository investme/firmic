from __future__ import annotations

import datetime
from typing import Any
from sqlalchemy.orm import Session
from models.usage_ledger import UsageLedger


def current_invoice_month() -> str:
    return datetime.datetime.utcnow().strftime("%Y-%m")


def calculate_amounts(
    quantity: float,
    unit_price: float,
    tax_rate: float,
) -> tuple[float, float, float]:
    amount = round(float(quantity) * float(unit_price), 2)
    tax_amount = round(amount * float(tax_rate), 2)
    total_amount = round(amount + tax_amount, 2)
    return amount, tax_amount, total_amount


def record_usage(
    db: Session,
    *,
    company_id: str,
    service: str,
    category: str,
    action: str,
    quantity: float = 1.0,
    unit: str = "unit",
    unit_price: float = 0.0,
    currency: str = "USD",
    tax_rate: float = 0.0,
    status: str = "unbilled",
    invoice_month: str | None = None,
    resource: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> UsageLedger:
    amount, tax_amount, total_amount = calculate_amounts(
        quantity=quantity,
        unit_price=unit_price,
        tax_rate=tax_rate,
    )

    entry = UsageLedger(
        company_id=company_id,
        service=service,
        category=category,
        resource=resource,
        action=action,
        quantity=quantity,
        unit=unit,
        unit_price=unit_price,
        amount=amount,
        currency=currency,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        status=status,
        invoice_month=invoice_month or current_invoice_month(),
        source_type=source_type,
        source_id=source_id,
        entry_metadata=metadata,
    )

    db.add(entry)

    if commit:
        db.commit()
        db.refresh(entry)

    return entry


def serialize_usage(entry: UsageLedger) -> dict:
    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "service": entry.service,
        "category": entry.category,
        "resource": entry.resource,
        "action": entry.action,
        "quantity": entry.quantity,
        "unit": entry.unit,
        "unit_price": entry.unit_price,
        "amount": entry.amount,
        "currency": entry.currency,
        "tax_rate": entry.tax_rate,
        "tax_amount": entry.tax_amount,
        "total_amount": entry.total_amount,
        "status": entry.status,
        "invoice_month": entry.invoice_month,
        "source_type": entry.source_type,
        "source_id": entry.source_id,
        "metadata": entry.entry_metadata,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }
