from sqlalchemy import Column, DateTime, Float, JSON, String
from database import Base
import datetime
import uuid


class UsageLedger(Base):
    __tablename__ = "usage_ledger"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String, nullable=False, index=True)
    service = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    resource = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String, nullable=False, default="unit")
    unit_price = Column(Float, nullable=False, default=0.0)
    amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="USD")
    tax_rate = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="unbilled", index=True)
    invoice_month = Column(String, nullable=False, index=True)
    source_type = Column(String, nullable=True, index=True)
    source_id = Column(String, nullable=True, index=True)
    entry_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
