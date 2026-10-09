from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, ForeignKey, Uuid, DateTime
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class TrustedContact(TimeStampedUUIDModel):
    """
    Trusted Contact entity forming the user's Trusted Circle for SOS and journey tracking.
    Supports contact invitation, verification states, and granular notification permissions.
    """
    __tablename__ = "trusted_contacts"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    phone_number = Column(String(30), nullable=False)
    email = Column(String(255), nullable=True)
    relationship = Column(String(50), default="Friend", nullable=False)  # Parent, Guardian, Friend, Sibling, Spouse, Partner, Roommate, Other
    
    # Verification workflow
    verification_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED, REVOKED
    verification_code = Column(String(20), nullable=True)
    
    # Flags
    is_emergency_recipient = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Granular notification permissions
    notify_journey_start = Column(Boolean, default=True, nullable=False)
    notify_journey_end = Column(Boolean, default=True, nullable=False)
    notify_safety_mode = Column(Boolean, default=True, nullable=False)
    notify_sos = Column(Boolean, default=True, nullable=False)
    share_live_location = Column(Boolean, default=True, nullable=False)
    notify_emergency_updates = Column(Boolean, default=True, nullable=False)

    # Relationship
    user = orm_relationship("User", back_populates="trusted_contacts")

    @property
    def contact_name(self) -> str:
        return self.name

    @contact_name.setter
    def contact_name(self, value: str):
        self.name = value

    @property
    def phone(self) -> str:
        return self.phone_number

    @phone.setter
    def phone(self, value: str):
        self.phone_number = value
