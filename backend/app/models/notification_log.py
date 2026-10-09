from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Uuid, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class NotificationLog(TimeStampedUUIDModel):
    """
    Audit log recording each outward safety notification dispatch attempt,
    including channel, provider responses, and verified delivery status.
    """
    __tablename__ = "notification_logs"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_id = Column(String(100), nullable=True, index=True)  # journey_id, sos_id, safety_mode_id, contact_id
    
    recipient_id = Column(String(100), nullable=True)  # contact_id or guardian_id
    recipient_name = Column(String(150), nullable=True)
    recipient_phone = Column(String(30), nullable=True)
    recipient_type = Column(String(50), default="TRUSTED_CONTACT", nullable=False)  # TRUSTED_CONTACT, GUARDIAN

    event_type = Column(String(50), nullable=False)  # JOURNEY_STARTED, JOURNEY_COMPLETED, SAFETY_MODE_ACTIVATED, SOS_ACTIVATED, SOS_ENDED, CONTACT_INVITATION
    channel = Column(String(30), default="PUSH", nullable=False)  # PUSH, SMS, DEV_MOCK
    delivery_status = Column(String(30), default="SENT", nullable=False, index=True)  # CREATED, PENDING, SENT, DELIVERED, FAILED, UNAVAILABLE
    
    provider_message_id = Column(String(100), nullable=True)
    message_content = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)

    attempted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = orm_relationship("User")
