from sqlalchemy import Column, String, Boolean, Text, Float
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class Organization(TimeStampedUUIDModel):
    """
    Organization model representing corporate campuses, universities, colleges,
    residential communities, and municipal authorities.
    """
    __tablename__ = "organizations"

    name = Column(String(200), nullable=False, index=True)
    org_type = Column(String(50), nullable=False)  # COLLEGE, COMPANY, RESIDENTIAL_COMMUNITY, CAMPUS_SECURITY, PUBLIC_SPACE_MANAGER, LOCAL_AUTHORITY, OTHER
    description = Column(Text, nullable=True)
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    domain = Column(String(100), unique=True, index=True, nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(30), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # PENDING, ACTIVE, SUSPENDED
    is_verified = Column(Boolean, default=True, nullable=False)

    # Relationships
    memberships = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")
    issue_assignments = relationship("IssueAssignment", back_populates="organization", cascade="all, delete-orphan")
    issue_resolutions = relationship("IssueResolution", back_populates="assigned_organization")
    audit_logs = relationship("AdministrativeAuditLog", back_populates="organization")
