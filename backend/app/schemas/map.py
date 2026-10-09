from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class SafetyReportMapItem(BaseModel):
    """
    Public-safe safety report item for map display.
    Never exposes private reporter identity, email, or phone.
    """
    id: UUID
    category: str
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    severity: str
    status: str
    verification_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HelpPointMapItem(BaseModel):
    """
    Verified help point safety haven item for map display.
    """
    id: UUID
    name: str
    type: str
    category: str
    latitude: float
    longitude: float
    address: str
    phone: Optional[str] = None
    verified: bool
    is_24_hours: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HotspotMapItem(BaseModel):
    """
    Community safety signal cluster / elevated risk area overlay item.
    """
    id: UUID
    label: str
    level: str  # low, moderate, elevated, higher
    latitude: float
    longitude: float
    radius: float  # meters
    source: str
    description: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MapDataResponse(BaseModel):
    """
    Consolidated map telemetry data bundle for high-performance rendering.
    """
    reports: List[SafetyReportMapItem]
    help_points: List[HelpPointMapItem]
    hotspots: List[HotspotMapItem]
