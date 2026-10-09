from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class JourneySharingSession(TimeStampedUUIDModel):
    """
    Time-limited, cryptographically scoped sharing access allowing authorized trusted contacts
    or guardians to securely observe a live active journey.
    """
    __tablename__ = "journey_sharing_sessions"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    journey_id = Column(Uuid(as_uuid=True), ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True)
    
    share_token = Column(String(64), unique=True, index=True, nullable=False)
    recipient_contact_id = Column(Uuid(as_uuid=True), ForeignKey("trusted_contacts.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = orm_relationship("User")
    journey = orm_relationship("Journey")
    recipient_contact = orm_relationship("TrustedContact")
