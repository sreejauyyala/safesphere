from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ShareSessionCreateRequest(BaseModel):
    journey_id: UUID
    recipient_contact_id: Optional[UUID] = None
    duration_hours: int = Field(4, ge=1, le=24, description="Validity period in hours")


class ShareSessionResponse(BaseModel):
    id: UUID
    journey_id: UUID
    share_token: str
    share_url: str
    is_active: bool
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SharedJourneyPublicResponse(BaseModel):
    journey_id: UUID
    user_name: str
    destination_name: str
    status: str
    started_at: datetime
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    is_location_stale: bool = False
    distance_travelled: float = 0.0
    selected_route_id: Optional[str] = None
    route_geometry: Optional[str] = None
    is_active: bool = True
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)
