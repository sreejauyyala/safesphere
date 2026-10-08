from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Uuid
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedUUIDModel


class Journey(TimeStampedUUIDModel):
    """
    Journey model tracking user travel routes, live breadcrumbs, and check-in deadlines.
    """
    __tablename__ = "journeys"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), default="Current Journey", nullable=False)
    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)
    start_address = Column(String(300), nullable=True)
    destination_latitude = Column(Float, nullable=False)
    destination_longitude = Column(Float, nullable=False)
    destination_address = Column(String(300), nullable=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    status = Column(String(50), default="planned", nullable=False)  # planned, active, completed, deviated, emergency
    is_safe_mode_active = Column(Boolean, default=False, nullable=False)
    expected_arrival_time = Column(DateTime(timezone=True), nullable=True)
    last_ping_time = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="journeys")
    feedbacks = relationship("Feedback", back_populates="journey")
