from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import TimeStampedUUIDModel


class User(TimeStampedUUIDModel):
    """
    User entity representing registered individuals across communities, students, and employees.
    """
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    phone_number = Column(String(30), nullable=True)
    age = Column(Integer, nullable=True)
    is_under_18 = Column(Boolean, default=False, nullable=False)
    role = Column(String(50), default="user", nullable=False)  # user, guardian, admin, first_responder
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    guardians = relationship("Guardian", back_populates="ward", foreign_keys="Guardian.ward_id")
    trusted_contacts = relationship("TrustedContact", back_populates="user", cascade="all, delete-orphan")
    safety_reports = relationship("SafetyReport", back_populates="reporter")
    journeys = relationship("Journey", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user")
