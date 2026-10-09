from sqlalchemy import Column, String, Float, Text, ForeignKey, Integer, Boolean, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class SafetyReport(TimeStampedUUIDModel):
    """
    Safety Report model storing user-submitted incident reports.
    Public map endpoints strip reporter identity for privacy.
    """
    __tablename__ = "safety_reports"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(String(50), default="text", nullable=False)  # text, voice, image
    category = Column(String(100), default="general_safety", nullable=False, index=True)
    # Categories: poor_lighting, road_damage, road_obstruction, isolated_area, transport_issue, general_safety, other
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    location_label = Column(String(255), nullable=True)
    severity = Column(String(50), default="medium", nullable=False, index=True)  # low, medium, high
    media_url = Column(String(500), nullable=True)
    media_type = Column(String(50), nullable=True)  # audio/webm, image/jpeg, etc.
    transcript = Column(Text, nullable=True)  # Voice transcript from speech-to-text
    ai_risk_score = Column(Float, nullable=True)  # For later Step 7/9
    ai_analysis_summary = Column(Text, nullable=True)
    verification_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)
    # Statuses: OPEN, IN_REVIEW, RESOLVED, RESOLUTION_DISPUTED, REOPENED, REJECTED
    verification_status = Column(String(50), default="PENDING", nullable=False, index=True)
    # Verification statuses: PENDING, COMMUNITY_SUPPORTED, UNDER_REVIEW, VERIFIED, DISPUTED, REJECTED

    # Step 13: Community Verification Counters & Review Flags
    community_confirm_count = Column(Integer, default=0, nullable=False)
    community_dispute_count = Column(Integer, default=0, nullable=False)
    community_resolved_count = Column(Integer, default=0, nullable=False)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="SET NULL"), nullable=True)
    flagged_for_review = Column(Boolean, default=False, nullable=False)
    reopen_requested = Column(Boolean, default=False, nullable=False)

    # Step 14: Organization Scope & Issue Assignment
    assigned_organization_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationships
    reporter = relationship("User", back_populates="safety_reports")
    assigned_organization = relationship("Organization", foreign_keys=[assigned_organization_id])
    assignments = relationship("IssueAssignment", back_populates="report", cascade="all, delete-orphan")
    resolutions = relationship("IssueResolution", back_populates="report", cascade="all, delete-orphan")
    audit_logs = relationship("ReportAuditLog", back_populates="report", cascade="all, delete-orphan")


