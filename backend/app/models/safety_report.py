from sqlalchemy import Column, String, Float, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import TimeStampedUUIDModel


class SafetyReport(TimeStampedUUIDModel):
    """
    Safety Report model storing user-submitted incident reports (text, voice transcript, image).
    """
    __tablename__ = "safety_reports"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(String(50), default="text", nullable=False)  # text, voice, image
    category = Column(String(100), default="general_safety", nullable=False)  # harassment, poor_lighting, suspicious_activity, hazard
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    media_url = Column(String(500), nullable=True)
    ai_risk_score = Column(Float, nullable=True)  # Populated via Gemini analysis (0.0 to 1.0)
    ai_analysis_summary = Column(Text, nullable=True)
    verification_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="submitted", nullable=False)  # submitted, verified, resolving, resolved, flagged

    # Relationships
    reporter = relationship("User", back_populates="safety_reports")
    resolutions = relationship("IssueResolution", back_populates="report", cascade="all, delete-orphan")
