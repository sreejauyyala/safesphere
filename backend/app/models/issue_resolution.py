from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class IssueResolution(TimeStampedUUIDModel):
    """
    IssueResolution model tracking administrator and organization resolution workflows
    for reported incidents and civic safety hazards (e.g. broken streetlights).
    """
    __tablename__ = "issue_resolutions"

    report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(Uuid(as_uuid=True), ForeignKey("issue_assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to_org_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_responder_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    status = Column(String(50), default="RESOLVED", nullable=False, index=True)  # RESOLVED, UNDER_REVIEW, DISPUTED, CLOSED
    action_taken = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=True)

    # Relationships
    report = relationship("SafetyReport", back_populates="resolutions")
    assignment = relationship("IssueAssignment", back_populates="resolutions")
    assigned_organization = relationship("Organization", back_populates="issue_resolutions")
    resolved_by_user = relationship("User", foreign_keys=[assigned_responder_id])
