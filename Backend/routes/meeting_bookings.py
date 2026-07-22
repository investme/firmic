import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.meeting_booking import MeetingBooking
from models.usage_ledger import UsageLedger
from schemas.meeting_booking import (
    CancelMeetingBookingRequest,
    CreateMeetingBookingRequest,
)
from services.activity_service import record_activity
from services.ledger_service import record_usage


router = APIRouter(
    prefix="/api/meeting-bookings",
    tags=["Meeting Bookings"],
)


def is_admin(token: dict) -> bool:
    role = str(token.get("role") or "").lower()
    email = str(token.get("email") or "").lower()
    return role == "admin" or email == "hussein@firmic.io"


def authorize_company(
    company_id: str,
    token: dict,
    db: Session,
) -> Company:
    query = db.query(Company).filter(Company.id == company_id)

    if not is_admin(token):
        user_id = token.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        query = query.filter(Company.user_id == str(user_id))

    company = query.first()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


def serialize_booking(booking: MeetingBooking) -> dict:
    return {
        "id": booking.id,
        "company_id": booking.company_id,
        "room_id": booking.room_id,
        "room_name": booking.room_name,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "duration_hours": booking.duration_hours,
        "hourly_price_usd": booking.hourly_price_usd,
        "status": booking.status,
        "ledger_entry_id": booking.ledger_entry_id,
        "created_at": (
            booking.created_at.isoformat()
            if booking.created_at
            else None
        ),
        "cancelled_at": (
            booking.cancelled_at.isoformat()
            if booking.cancelled_at
            else None
        ),
    }


@router.get("/company/{company_id}")
def list_bookings(
    company_id: str,
    include_cancelled: bool = False,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    authorize_company(company_id, token, db)

    query = db.query(MeetingBooking).filter(
        MeetingBooking.company_id == company_id
    )

    if not include_cancelled:
        query = query.filter(
            MeetingBooking.status == "confirmed"
        )

    bookings = query.order_by(
        MeetingBooking.created_at.desc()
    ).all()

    return [serialize_booking(booking) for booking in bookings]


@router.post("")
def create_booking(
    payload: CreateMeetingBookingRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(payload.company_id, token, db)

    if company.status == "terminated":
        raise HTTPException(
            status_code=400,
            detail="Cannot book for a terminated company",
        )

    if not company.headquarters_office_code:
        raise HTTPException(
            status_code=400,
            detail="Activate Headquarters before booking a room",
        )

    try:
        booking = MeetingBooking(
            company_id=company.id,
            room_id=payload.room_id,
            room_name=payload.room_name,
            booking_date=payload.booking_date,
            booking_time=payload.booking_time,
            duration_hours=payload.duration_hours,
            hourly_price_usd=payload.hourly_price_usd,
            status="confirmed",
        )

        db.add(booking)
        db.flush()

        ledger_entry = record_usage(
            db,
            company_id=company.id,
            service="meeting_center",
            category="usage",
            resource=payload.room_name,
            action="room_booking",
            quantity=payload.duration_hours,
            unit="hour",
            unit_price=payload.hourly_price_usd,
            tax_rate=0.05,
            source_type="meeting_booking",
            source_id=booking.id,
            metadata={
                "booking_date": payload.booking_date,
                "booking_time": payload.booking_time,
                "room_id": payload.room_id,
            },
            commit=False,
        )

        booking.ledger_entry_id = ledger_entry.id

        record_activity(
            db,
            company_id=company.id,
            event_type="meeting_room_booked",
            title=f"{payload.room_name} booked",
            description=(
                f"{payload.duration_hours} hour(s) booked on "
                f"{payload.booking_date} at {payload.booking_time}."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or token.get("email") or ""),
            source_type="meeting_booking",
            source_id=booking.id,
            commit=False,
        )

        db.commit()
        db.refresh(booking)

        return serialize_booking(booking)

    except Exception:
        db.rollback()
        raise


@router.post("/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    payload: CancelMeetingBookingRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = authorize_company(payload.company_id, token, db)

    booking = (
        db.query(MeetingBooking)
        .filter(
            MeetingBooking.id == booking_id,
            MeetingBooking.company_id == company.id,
        )
        .first()
    )

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "cancelled":
        return serialize_booking(booking)

    try:
        booking.status = "cancelled"
        booking.cancelled_at = datetime.datetime.utcnow()

        if booking.ledger_entry_id:
            ledger_entry = (
                db.query(UsageLedger)
                .filter(
                    UsageLedger.id == booking.ledger_entry_id,
                    UsageLedger.status == "unbilled",
                )
                .first()
            )

            if ledger_entry:
                ledger_entry.status = "void"

        record_activity(
            db,
            company_id=company.id,
            event_type="meeting_room_cancelled",
            title=f"{booking.room_name} booking cancelled",
            description=(
                f"The booking on {booking.booking_date} "
                f"at {booking.booking_time} was cancelled."
            ),
            actor_type="tenant",
            actor_id=str(token.get("sub") or token.get("email") or ""),
            source_type="meeting_booking",
            source_id=booking.id,
            commit=False,
        )

        db.commit()
        db.refresh(booking)

        return serialize_booking(booking)

    except Exception:
        db.rollback()
        raise
