from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import TimeStampedUUIDModel


class Guardian(TimeStampedUUIDModel):
    """
    Guardian model linked to minor users (<18) with emergency notification rights and journey oversight.
    """
    __tablename__ = "guardians"

    ward_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    guardian_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    guardian_name = Column(String(150), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # parent, legal_guardian, school_warden
    contact_phone = Column(String(30), nullable=False)
    contact_email = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    emergency_alerts_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    ward = relationship("User", foreign_keys=[ward_id], back_populates="guardians")
