import asyncio
import datetime
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from auth import get_token_payload
from database import SessionLocal

from models.company import Company
from models.activity_log import ActivityLog
from models.notification_read_state import NotificationReadState

from services.activity_service import serialize_activity


router = APIRouter()

NOTIFICATION_LIMIT = 100

SSE_POLL_INTERVAL_SECONDS = 2.0
SSE_HEARTBEAT_INTERVAL_SECONDS = 15.0
SSE_BATCH_LIMIT = 100


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def require_actor_id(token: dict) -> str:
    actor_id = str(token.get("sub") or "").strip()

    if not actor_id:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized",
        )

    return actor_id


def verify_company_access(
    company_id: str,
    actor_id: str,
    db: Session,
):
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(actor_id),
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return company


def notification_type(activity: ActivityLog) -> str:
    value = (
        f"{activity.event_type} "
        f"{activity.title} "
        f"{activity.description or ''} "
        f"{activity.source_type or ''}"
    ).lower()

    if any(
        value_part in value
        for value_part in [
            "approval",
            "approve",
            "pending",
        ]
    ):
        return "pending"

    if any(
        value_part in value
        for value_part in [
            "warning",
            "expired",
            "reject",
            "failed",
            "error",
        ]
    ):
        return "warning"

    if any(
        value_part in value
        for value_part in [
            "invoice",
            "payment",
            "billing",
        ]
    ):
        return "info"

    if any(
        value_part in value
        for value_part in [
            "completed",
            "created",
            "success",
            "finished",
        ]
    ):
        return "success"

    return "action_required"


def get_notification_activities(
    db: Session,
    *,
    company_id: str,
) -> list[ActivityLog]:
    return (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id,
        )
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(NOTIFICATION_LIMIT)
        .all()
    )


def get_actor_read_state_map(
    db: Session,
    *,
    company_id: str,
    actor_id: str,
    activity_ids: list[str],
) -> dict[str, NotificationReadState]:
    if not activity_ids:
        return {}

    states = (
        db.query(NotificationReadState)
        .filter(
            NotificationReadState.company_id == company_id,
            NotificationReadState.actor_id == actor_id,
            NotificationReadState.activity_log_id.in_(activity_ids),
        )
        .all()
    )

    return {
        str(state.activity_log_id): state
        for state in states
    }


def serialize_notification(
    activity: ActivityLog,
    *,
    read_state: NotificationReadState | None,
) -> dict:
    item = serialize_activity(activity)

    return {
        "id": item["id"],
        "type": notification_type(activity),
        "title": item["title"],
        "description": item["description"],
        "created_at": item["created_at"],
        "read": read_state is not None,
        "read_at": (
            read_state.read_at.isoformat()
            if read_state and read_state.read_at
            else None
        ),
    }



def sse_encode_event(
    *,
    event_id: str,
    event_name: str,
    payload: dict,
) -> str:
    data = json.dumps(
        payload,
        separators=(",", ":"),
        default=str,
    )

    return (
        f"id: {event_id}\n"
        f"event: {event_name}\n"
        f"data: {data}\n\n"
    )


def get_notification_activities_after_cursor(
    db: Session,
    *,
    company_id: str,
    cursor_created_at: datetime.datetime,
    cursor_id: str,
) -> list[ActivityLog]:
    return (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id,
            (
                ActivityLog.created_at
                > cursor_created_at
            )
            | (
                (
                    ActivityLog.created_at
                    == cursor_created_at
                )
                & (
                    ActivityLog.id > cursor_id
                )
            ),
        )
        .order_by(
            ActivityLog.created_at.asc(),
            ActivityLog.id.asc(),
        )
        .limit(SSE_BATCH_LIMIT)
        .all()
    )


def get_notification_stream_cursor(
    db: Session,
    *,
    company_id: str,
) -> tuple[datetime.datetime, str]:
    latest = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id,
        )
        .order_by(
            ActivityLog.created_at.desc(),
            ActivityLog.id.desc(),
        )
        .first()
    )

    if latest is None:
        return (
            datetime.datetime.min,
            "",
        )

    return (
        latest.created_at,
        str(latest.id),
    )



def resolve_notification_stream_cursor(
    db: Session,
    *,
    company_id: str,
    last_event_id: str | None,
) -> tuple[datetime.datetime, str]:
    if not last_event_id:
        return get_notification_stream_cursor(
            db,
            company_id=company_id,
        )

    activity = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.id == last_event_id,
            ActivityLog.company_id == company_id,
        )
        .first()
    )

    if activity is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid notification stream cursor",
        )

    return (
        activity.created_at,
        str(activity.id),
    )


@router.get("/company/{company_id}/stream")
async def stream_company_notifications(
    company_id: str,
    request: Request,
    last_event_id: str | None = Header(
        default=None,
        alias="Last-Event-ID",
    ),
    token: dict = Depends(get_token_payload),
):
    actor_id = require_actor_id(token)

    authority_db = SessionLocal()

    try:
        verify_company_access(
            company_id,
            actor_id,
            authority_db,
        )

        (
            initial_created_at,
            initial_id,
        ) = resolve_notification_stream_cursor(
            authority_db,
            company_id=company_id,
            last_event_id=last_event_id,
        )

    finally:
        authority_db.close()

    async def event_stream():
        cursor_created_at = initial_created_at
        cursor_id = initial_id

        loop = asyncio.get_running_loop()
        last_heartbeat = loop.time()

        while True:
            if await request.is_disconnected():
                break

            await asyncio.sleep(
                SSE_POLL_INTERVAL_SECONDS
            )

            if await request.is_disconnected():
                break

            stream_db = SessionLocal()

            try:
                activities = (
                    get_notification_activities_after_cursor(
                        stream_db,
                        company_id=company_id,
                        cursor_created_at=cursor_created_at,
                        cursor_id=cursor_id,
                    )
                )

                for activity in activities:
                    activity_id = str(activity.id)

                    payload = serialize_notification(
                        activity,
                        read_state=None,
                    )

                    yield sse_encode_event(
                        event_id=activity_id,
                        event_name="notification.created",
                        payload=payload,
                    )

                    cursor_created_at = (
                        activity.created_at
                    )
                    cursor_id = activity_id

                if activities:
                    last_heartbeat = loop.time()

            finally:
                stream_db.close()

            now = loop.time()

            if (
                now - last_heartbeat
                >= SSE_HEARTBEAT_INTERVAL_SECONDS
            ):
                yield ": heartbeat\n\n"
                last_heartbeat = now

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/company/{company_id}")
def get_company_notifications(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    actor_id = require_actor_id(token)

    verify_company_access(
        company_id,
        actor_id,
        db,
    )

    activities = get_notification_activities(
        db,
        company_id=company_id,
    )

    activity_ids = [
        str(activity.id)
        for activity in activities
    ]

    read_state_map = get_actor_read_state_map(
        db,
        company_id=company_id,
        actor_id=actor_id,
        activity_ids=activity_ids,
    )

    notifications = [
        serialize_notification(
            activity,
            read_state=read_state_map.get(
                str(activity.id)
            ),
        )
        for activity in activities
    ]

    unread = sum(
        1
        for notification in notifications
        if not notification["read"]
    )

    return {
        "company_id": company_id,
        "unread": unread,
        "total_notifications": len(notifications),
        "notifications": notifications,
    }


@router.post(
    "/company/{company_id}/read/{activity_log_id}"
)
def mark_notification_read(
    company_id: str,
    activity_log_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    actor_id = require_actor_id(token)

    verify_company_access(
        company_id,
        actor_id,
        db,
    )

    activity = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.id == activity_log_id,
            ActivityLog.company_id == company_id,
        )
        .first()
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    state = (
        db.query(NotificationReadState)
        .filter(
            NotificationReadState.company_id == company_id,
            NotificationReadState.actor_id == actor_id,
            NotificationReadState.activity_log_id == activity_log_id,
        )
        .first()
    )

    if state is None:
        state = NotificationReadState(
            company_id=company_id,
            actor_id=actor_id,
            activity_log_id=activity_log_id,
            read_at=datetime.datetime.utcnow(),
        )

        db.add(state)
        db.commit()
        db.refresh(state)

    return {
        "company_id": company_id,
        "notification_id": activity_log_id,
        "read": True,
        "read_at": (
            state.read_at.isoformat()
            if state.read_at
            else None
        ),
    }


@router.post("/company/{company_id}/read-all")
def mark_all_notifications_read(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    actor_id = require_actor_id(token)

    verify_company_access(
        company_id,
        actor_id,
        db,
    )

    activities = get_notification_activities(
        db,
        company_id=company_id,
    )

    activity_ids = [
        str(activity.id)
        for activity in activities
    ]

    existing = get_actor_read_state_map(
        db,
        company_id=company_id,
        actor_id=actor_id,
        activity_ids=activity_ids,
    )

    now = datetime.datetime.utcnow()
    created_count = 0

    for activity_id in activity_ids:
        if activity_id in existing:
            continue

        db.add(
            NotificationReadState(
                company_id=company_id,
                actor_id=actor_id,
                activity_log_id=activity_id,
                read_at=now,
            )
        )

        created_count += 1

    if created_count:
        db.commit()

    return {
        "company_id": company_id,
        "read": True,
        "total_notifications": len(activity_ids),
        "newly_marked_read": created_count,
        "unread": 0,
    }
