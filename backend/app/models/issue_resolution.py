from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class IssueResolution(TimeStampedUUIDModel):
    """
    IssueResolution model tracking administrator and organization resolution workflows
    for reported incidents and civic safety hazards (e.g. broken streetlights).
    """
    __tablename__ = "issue_resolutions"

    report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="CASCADE"), nullable=False)
    assigned_to_org_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    assigned_responder_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, investigating, in_progress, resolved, closed
    action_taken = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    report = relationship("SafetyReport", back_populates="resolutions")
    assigned_organization = relationship("Organization", back_populates="issue_resolutions")
