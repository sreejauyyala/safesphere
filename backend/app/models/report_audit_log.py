from sqlalchemy import Column, String, Text, ForeignKey, Uuid, Index
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class ReportAuditLog(TimeStampedUUIDModel):
    """
    Audit log tracking critical verification, dispute, resolution, and reopening decisions
    for safety reports.
    """
    __tablename__ = "report_audit_logs"

    report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    # Actions: COMMUNITY_CONFIRMED, COMMUNITY_DISPUTED, COMMUNITY_RESOLVED_CONFIRMED,
    #          RESOLUTION_DISPUTED, REOPEN_REQUESTED, OFFICIALLY_VERIFIED, OFFICIALLY_RESOLVED,
    #          OFFICIALLY_REOPENED, OFFICIALLY_REJECTED, FLAGGED_FOR_REVIEW

    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    previous_verification_status = Column(String(50), nullable=True)
    new_verification_status = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)

    # Relationships
    report = relationship("SafetyReport", back_populates="audit_logs")
    actor = relationship("User", foreign_keys=[actor_id])
