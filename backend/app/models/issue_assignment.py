from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class IssueAssignment(TimeStampedUUIDModel):
    """
    IssueAssignment model tracking the delegation of verified safety reports
    to specific organizations, teams, and field responders.
    """
    __tablename__ = "issue_assignments"

    report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    priority = Column(String(50), default="MEDIUM", nullable=False, index=True)  # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(50), default="ASSIGNED", nullable=False, index=True)  # UNASSIGNED, ASSIGNED, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
    action_description = Column(Text, nullable=True)
    target_resolution_at = Column(DateTime(timezone=True), nullable=True)

    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    report = relationship("SafetyReport", back_populates="assignments")
    organization = relationship("Organization", back_populates="issue_assignments")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    resolutions = relationship("IssueResolution", back_populates="assignment")
