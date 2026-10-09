from sqlalchemy import Column, String, Integer, Text, ForeignKey, Uuid, Boolean, Index
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class CommunityFeedback(TimeStampedUUIDModel):
    """
    CommunityFeedback model capturing structured verification observations,
    report disputes, resolution confirmations, journey experiences, and platform ratings.
    """
    __tablename__ = "community_feedbacks"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(50), nullable=False, index=True)
    # Target types: SAFETY_REPORT, JOURNEY, SAFETY_PULSE, ROUTE, APPLICATION

    target_id = Column(Uuid(as_uuid=True), nullable=True, index=True)
    # References safety_reports.id or journeys.id

    feedback_type = Column(String(50), nullable=False, index=True)
    # Report types: CONFIRM_ISSUE, DISPUTE_ISSUE, CONFIRM_RESOLVED, REPORT_STILL_PRESENT,
    #               DUPLICATE_REPORT, INACCURATE_LOCATION, INACCURATE_CATEGORY
    # Journey types: JOURNEY_EXPERIENCE
    # General types: GENERAL_FEEDBACK, SAFETY_PULSE_USEFULNESS

    # Ratings & Answers
    rating = Column(Integer, nullable=True)  # 1-5 stars where applicable
    response_value = Column(String(100), nullable=True)  # YES, NO, APPEARS_RESOLVED, STILL_PRESENT, CANNOT_VERIFY
    route_accuracy = Column(String(50), nullable=True)  # MOSTLY_YES, PARTLY, NO, UNABLE_TO_JUDGE
    safety_info_usefulness = Column(String(50), nullable=True)  # USEFUL, PARTLY_USEFUL, NOT_USEFUL, INSUFFICIENT_DATA

    # Specific concern metadata for disputes / accuracy flags
    concern_category = Column(String(100), nullable=True)
    # wrong_location, incorrect_category, issue_no_longer_present, duplicate_report, other
    duplicate_of_report_id = Column(Uuid(as_uuid=True), ForeignKey("safety_reports.id", ondelete="SET NULL"), nullable=True)

    comment = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    # ACTIVE, UNDER_REVIEW, FLAGGED, ARCHIVED

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Index for fast lookup and user response checking
    __table_args__ = (
        Index("ix_comm_feedback_user_target", "user_id", "target_type", "target_id"),
    )
