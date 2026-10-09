from sqlalchemy import Column, String, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class OrganizationMembership(TimeStampedUUIDModel):
    """
    OrganizationMembership model linking users/administrators to organizations
    with specific operational roles (ADMIN, MEMBER, RESPONDER, DISPATCHER).
    """
    __tablename__ = "organization_memberships"

    organization_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="ADMIN", nullable=False)  # ADMIN, MEMBER, RESPONDER, DISPATCHER
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, INVITED, SUSPENDED

    # Relationships
    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="organization_memberships")
