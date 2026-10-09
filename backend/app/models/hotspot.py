from sqlalchemy import Column, String, Float, Text
from app.models.base import TimeStampedUUIDModel


class Hotspot(TimeStampedUUIDModel):
    """
    Safety Hotspot placeholder data layer for community safety concern clusters
    and elevated estimated risk zones.
    """
    __tablename__ = "hotspots"

    label = Column(String(200), nullable=False)
    level = Column(String(50), default="moderate", nullable=False, index=True)  # low, moderate, elevated, higher
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    radius = Column(Float, default=300.0, nullable=False)  # in meters
    source = Column(String(100), default="Community Safety Signal Cluster", nullable=False)
    description = Column(Text, nullable=True)
