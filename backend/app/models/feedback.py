from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import TimeStampedUUIDModel


class Feedback(TimeStampedUUIDModel):
    """
    Feedback model capturing user trip sentiment, route accuracy feedback, and platform improvements.
    """
    __tablename__ = "feedbacks"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    journey_id = Column(UUID(as_uuid=True), ForeignKey("journeys.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 to 5 star rating
    safety_perception = Column(String(50), nullable=True)  # felt_very_safe, safe, neutral, unsafe
    comments = Column(Text, nullable=True)
    category = Column(String(50), default="journey_safety", nullable=False)

    # Relationships
    user = relationship("User", back_populates="feedbacks")
    journey = relationship("Journey", back_populates="feedbacks")
