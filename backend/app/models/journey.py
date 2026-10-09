from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Uuid, Text
from sqlalchemy.orm import relationship as orm_relationship
from app.models.base import TimeStampedUUIDModel


class Journey(TimeStampedUUIDModel):
    """
    Journey model tracking user travel routes, live breadcrumbs, and status lifecycle.
    Includes Step 10 planned safety-aware route metadata and geometry.
    """
    __tablename__ = "journeys"

    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    destination_name = Column(String(200), nullable=False)
    title = Column(String(150), default="Current Journey", nullable=False)

    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)

    destination_latitude = Column(Float, nullable=True)
    destination_longitude = Column(Float, nullable=True)

    status = Column(String(30), default="ACTIVE", nullable=False, index=True)  # PLANNED, ACTIVE, PAUSED, COMPLETED, CANCELLED

    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)

    distance_travelled = Column(Float, default=0.0, nullable=False)  # in kilometers
    is_safe_mode_active = Column(Boolean, default=False, nullable=False)

    # Step 10: Planned Safety-Aware Route Integration
    selected_route_id = Column(String(100), nullable=True)
    route_provider = Column(String(50), nullable=True)
    route_geometry = Column(Text, nullable=True)  # GeoJSON LineString coordinates as JSON string
    planned_distance_m = Column(Float, nullable=True)
    planned_duration_seconds = Column(Float, nullable=True)
    estimated_risk_level = Column(String(30), nullable=True)  # lower, moderate, elevated, higher, unknown
    route_data_coverage = Column(Float, nullable=True)  # 0.0 - 1.0
    route_assessed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = orm_relationship("User", back_populates="journeys")
    location_points = orm_relationship(
        "JourneyLocationPoint", 
        back_populates="journey", 
        cascade="all, delete-orphan", 
        order_by="JourneyLocationPoint.timestamp"
    )
    feedbacks = orm_relationship("Feedback", back_populates="journey")


class JourneyLocationPoint(TimeStampedUUIDModel):
    """
    Breadcrumb tracking point recording user GPS positions along an active journey.
    """
    __tablename__ = "journey_location_points"

    journey_id = Column(Uuid(as_uuid=True), ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    journey = orm_relationship("Journey", back_populates="location_points")
