from sqlalchemy import Column, String, ForeignKey, Uuid, DateTime
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class Guardian(TimeStampedUUIDModel):
    """
    Guardian model linked to minor users (<18).
    Captures primary guardian details, verification status, and consent status.
    """
    __tablename__ = "guardians"

    minor_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    guardian_name = Column(String(150), nullable=False)
    guardian_phone = Column(String(30), nullable=False)
    guardian_email = Column(String(255), nullable=True)
    relationship = Column(String(50), nullable=False)  # Parent, Guardian, Mother, Father, Other
    verification_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, VERIFIED, REJECTED
    consent_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, ACCEPTED, DECLINED
    verification_otp = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    minor_user = orm_relationship("User", back_populates="guardian")
