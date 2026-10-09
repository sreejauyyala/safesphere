from sqlalchemy import Column, String, Text, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class AdministrativeAuditLog(TimeStampedUUIDModel):
    """
    AdministrativeAuditLog model recording all administrative, moderation,
    issue assignment, and resolution actions with actor context and reasons.
    """
    __tablename__ = "admin_audit_logs"

    actor_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    organization_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=False, index=True)  # SAFETY_REPORT, ISSUE_ASSIGNMENT, ISSUE_RESOLUTION, ORGANIZATION
    target_id = Column(Uuid(as_uuid=True), nullable=True, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)

    # Relationships
    actor = relationship("User", foreign_keys=[actor_user_id])
    organization = relationship("Organization", back_populates="audit_logs")
