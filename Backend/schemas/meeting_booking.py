from pydantic import BaseModel, Field


class CreateMeetingBookingRequest(BaseModel):
    company_id: str
    room_id: int
    room_name: str
    booking_date: str
    booking_time: str
    duration_hours: int = Field(ge=1, le=24)
    hourly_price_usd: float = Field(ge=0)


class CancelMeetingBookingRequest(BaseModel):
    company_id: str
