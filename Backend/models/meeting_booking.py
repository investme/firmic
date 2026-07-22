from sqlalchemy import Column, DateTime, Float, Integer, String
from database import Base
import datetime
import uuid


class MeetingBooking(Base):
    __tablename__ = "meeting_bookings"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    company_id = Column(String, nullable=False, index=True)
    room_id = Column(Integer, nullable=False)
    room_name = Column(String, nullable=False)
    booking_date = Column(String, nullable=False, index=True)
    booking_time = Column(String, nullable=False)
    duration_hours = Column(Integer, nullable=False, default=1)
    hourly_price_usd = Column(Float, nullable=False, default=25.0)
    status = Column(String, nullable=False, default="confirmed", index=True)
    ledger_entry_id = Column(String, nullable=True, index=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
    )
    cancelled_at = Column(DateTime, nullable=True)
