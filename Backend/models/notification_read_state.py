import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from database import Base


class NotificationReadState(Base):
    __tablename__ = "notification_read_states"

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "actor_id",
            "activity_log_id",
            name="uq_notification_read_state_company_actor_activity",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    actor_id = Column(
        String,
        nullable=False,
        index=True,
    )

    activity_log_id = Column(
        String,
        nullable=False,
        index=True,
    )

    read_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )
