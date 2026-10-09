from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class SOSActivateRequest(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Current latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Current longitude")
    accuracy: Optional[float] = Field(None, ge=0.0, description="GPS accuracy in meters")
    emergency_notes: Optional[str] = Field(None, max_length=500, description="Brief emergency note")
    journey_id: Optional[UUID] = Field(None, description="Optional active journey ID")


class SOSLocationUpdateRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy: Optional[float] = Field(None, ge=0.0)


class SOSEndRequest(BaseModel):
    deactivation_reason: Optional[str] = Field("Situation resolved", max_length=100)
    notes: Optional[str] = Field(None, max_length=500)


class SOSRecipientNotificationItem(BaseModel):
    recipient_id: str
    recipient_name: str
    recipient_type: str  # TRUSTED_CONTACT, GUARDIAN
    delivery_status: str  # SENT, DELIVERED, FAILED, UNAVAILABLE, NOT_CONFIGURED, PENDING
    channel: str  # PUSH, SMS, DEV_MOCK
    attempted_at: datetime
    error_message: Optional[str] = None
    location_shared: bool = False


class SOSSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    journey_id: Optional[UUID] = None
    status: str  # ACTIVE, ENDED, CANCELLED
    activated_at: datetime
    ended_at: Optional[datetime] = None
    initial_latitude: Optional[float] = None
    initial_longitude: Optional[float] = None
    latest_latitude: Optional[float] = None
    latest_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    accuracy: Optional[float] = None
    is_location_stale: bool = False
    emergency_notes: Optional[str] = None
    deactivation_reason: Optional[str] = None
    guardian_alerted: bool = False
    notifications: List[SOSRecipientNotificationItem] = []
    location_sharing_url: Optional[str] = None
    location_sharing_active: bool = False
    recipients_count: int = 0
    provider_configured: bool = True

    model_config = ConfigDict(from_attributes=True)
