from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class JourneyCreateRequest(BaseModel):
    """
    Payload for creating and initiating a user journey.
    Supports optional Step 10 planned safety-aware route integration.
    """
    destination_name: str = Field(..., min_length=1, max_length=200)
    start_latitude: float = Field(..., ge=-90.0, le=90.0)
    start_longitude: float = Field(..., ge=-180.0, le=180.0)
    destination_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    destination_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    title: Optional[str] = Field("Current Journey", max_length=150)
    # Step 10: Planned Route Attributes
    selected_route_id: Optional[str] = None
    route_provider: Optional[str] = None
    route_geometry: Optional[str] = None
    planned_distance_m: Optional[float] = None
    planned_duration_seconds: Optional[float] = None
    estimated_risk_level: Optional[str] = None
    route_data_coverage: Optional[float] = None
    route_assessed_at: Optional[datetime] = None


class JourneyLocationUpdateRequest(BaseModel):
    """
    Payload for appending a GPS breadcrumb point to an active journey.
    """
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy: Optional[float] = Field(None, ge=0.0)
    timestamp: Optional[datetime] = None


class JourneyLocationPointResponse(BaseModel):
    """
    Individual GPS breadcrumb along a journey route.
    """
    id: UUID
    journey_id: UUID
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class JourneyResponse(BaseModel):
    """
    Full journey details schema.
    """
    id: UUID
    user_id: UUID
    destination_name: str
    title: str
    start_latitude: float
    start_longitude: float
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    distance_travelled: float
    # Step 10 Planned Route Fields
    selected_route_id: Optional[str] = None
    route_provider: Optional[str] = None
    route_geometry: Optional[str] = None
    planned_distance_m: Optional[float] = None
    planned_duration_seconds: Optional[float] = None
    estimated_risk_level: Optional[str] = None
    route_data_coverage: Optional[float] = None
    route_assessed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JourneySummaryResponse(BaseModel):
    """
    Summary stats returned upon ending a journey.
    """
    id: UUID
    destination_name: str
    status: str
    duration_minutes: int
    distance_travelled: float
    points_recorded: int
