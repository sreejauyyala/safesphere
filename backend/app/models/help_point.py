from sqlalchemy import Column, String, Float, Boolean
from app.models.base import TimeStampedUUIDModel


class HelpPoint(TimeStampedUUIDModel):
    """
    Help Point model representing physical verified safety locations such as
    police stations, hospitals, campus security posts, and verified safe havens.
    """
    __tablename__ = "help_points"

    name = Column(String(200), nullable=False)
    point_type = Column(String(50), default="verified_help_point", nullable=False, index=True)
    # Types: police_station, hospital, security_desk, campus_security, verified_help_point, other
    category = Column(String(50), default="general", nullable=False)
    # Categories: police, hospital, pharmacy, shelter, 24x7_store, security_post
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(String(300), nullable=False)
    phone_number = Column(String(30), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False, index=True)
    is_24_hours = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)
