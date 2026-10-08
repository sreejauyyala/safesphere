from sqlalchemy import Column, String, Boolean, ForeignKey, Uuid
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class TrustedContact(TimeStampedUUIDModel):
    """
    Trusted Contact entity forming the user's Trusted Circle for SOS and journey tracking.
    """
    __tablename__ = "trusted_contacts"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    phone_number = Column(String(30), nullable=False)
    email = Column(String(255), nullable=True)
    relationship = Column(String(50), default="friend", nullable=False)  # friend, family, coworker
    is_emergency_recipient = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship
    user = orm_relationship("User", back_populates="trusted_contacts")
