from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Uuid, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class SafetyModeSession(TimeStampedUUIDModel):
    """
    SafetyModeSession records activations of the "I Feel Unsafe" preventive safety mode.
    Maintains link to user, optional active journey, geocoordinates, and notification status.
    """
    __tablename__ = "safety_mode_sessions"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    journey_id = Column(Uuid(as_uuid=True), ForeignKey("journeys.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, ENDED, INTERRUPTED

    activated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    activation_latitude = Column(Float, nullable=True)
    activation_longitude = Column(Float, nullable=True)

    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)

    notification_status = Column(String(30), default="NOT_CONFIGURED", nullable=False)  # NOT_CONFIGURED, PENDING, SENT, FAILED
    deactivation_reason = Column(String(255), nullable=True)  # user_safe, user_cancelled, auto_timeout, etc.
    user_note = Column(Text, nullable=True)

    # Relationships
    user = orm_relationship("User", backref="safety_mode_sessions")
    journey = orm_relationship("Journey", backref="safety_mode_sessions")
