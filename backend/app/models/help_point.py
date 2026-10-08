from sqlalchemy import Column, String, Float, Boolean
from app.models.base import TimeStampedUUIDModel


class HelpPoint(TimeStampedUUIDModel):
    """
    Help Point model representing physical safety locations such as police stations,
    hospitals, late-night open pharmacies, and verified community safe zones.
    """
    __tablename__ = "help_points"

    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # police, hospital, pharmacy, shelter, 24x7_store, security_post
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(String(300), nullable=False)
    phone_number = Column(String(30), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    is_24_hours = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)
