from sqlalchemy import Column, String, Float, Integer
from app.models.base import TimeStampedUUIDModel


class SafetyScore(TimeStampedUUIDModel):
    """
    Safety Score model storing computed territorial safety intelligence ratings (Safety Pulse).
    """
    __tablename__ = "safety_scores"

    area_name = Column(String(200), index=True, nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    radius_meters = Column(Float, default=500.0, nullable=False)
    overall_score = Column(Float, default=100.0, nullable=False)  # 0 to 100 safety scale
    lighting_rating = Column(Float, default=5.0, nullable=True)   # 1 to 5 scale
    crowd_density = Column(String(50), default="moderate", nullable=True)  # low, moderate, high
    recent_incidents_count = Column(Integer, default=0, nullable=False)
    zone_risk_level = Column(String(50), default="safe", nullable=False)  # safe, cautious, high_risk
