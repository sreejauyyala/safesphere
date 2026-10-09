from sqlalchemy import Column, String, Integer, Boolean, Date, Uuid, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class User(TimeStampedUUIDModel):
    """
    User entity representing registered individuals in SafeSphere.
    Supports role-based authorization and automated minor protection (<18).
    """
    __tablename__ = "users"

    firebase_uid = Column(String(128), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    age = Column(Integer, nullable=False)
    is_minor = Column(Boolean, default=False, nullable=False)
    user_type = Column(String(50), nullable=False)  # Student, Employee, General Public, Other
    role = Column(String(50), default="USER", nullable=False)  # USER, ORGANIZATION_ADMIN, SYSTEM_ADMIN
    profile_image_url = Column(String(500), nullable=True)
    organization_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    guardian = relationship("Guardian", back_populates="minor_user", uselist=False, cascade="all, delete-orphan")
    trusted_contacts = relationship("TrustedContact", back_populates="user", cascade="all, delete-orphan")
    safety_reports = relationship("SafetyReport", back_populates="reporter")
    journeys = relationship("Journey", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user")
    organization_memberships = relationship("OrganizationMembership", back_populates="user", cascade="all, delete-orphan")
