from sqlalchemy import Column, String, Float, Text, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class SafetyReportAIAnalysis(TimeStampedUUIDModel):
    """
    Model for recording AI-assisted safety report analysis requests and suggestions.
    Stores metadata for auditing, accuracy tracking, and model refinement.
    AI suggestions remain separate from the user-confirmed safety report.
    """
    __tablename__ = "safety_report_ai_analyses"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="SET NULL"), nullable=True)
    input_text = Column(Text, nullable=False)
    suggested_category = Column(String(100), nullable=False)
    suggested_severity = Column(String(50), nullable=False)
    summary = Column(Text, nullable=False)
    safety_signal = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    suggested_action = Column(String(255), nullable=True)
    model_name = Column(String(100), nullable=False, default="gemini-2.5-flash")

    # Relationships
    user = relationship("User", backref="ai_analyses")
    report = relationship("SafetyReport", backref="ai_analyses")
