from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Uuid, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class SOSSession(TimeStampedUUIDModel):
    """
    Emergency SOS Session entity tracking high-priority user-activated emergency states,
    live breadcrumb coordinates, contact dispatch logs, and resolution timestamps.
    """
    __tablename__ = "sos_sessions"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    journey_id = Column(Uuid(as_uuid=True), ForeignKey("journeys.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, ENDED, CANCELLED
    activated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    initial_latitude = Column(Float, nullable=True)
    initial_longitude = Column(Float, nullable=True)
    
    latest_latitude = Column(Float, nullable=True)
    latest_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)
    accuracy = Column(Float, nullable=True)

    emergency_notes = Column(Text, nullable=True)
    deactivation_reason = Column(String(100), nullable=True)

    # Relationships
    user = orm_relationship("User")
    journey = orm_relationship("Journey")
