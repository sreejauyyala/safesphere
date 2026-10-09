from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.sos import SOSRecipientNotificationItem


class SafetyModeActivateRequest(BaseModel):
    """
    Request payload to activate preventive I Feel Unsafe mode.
    """
    journey_id: Optional[UUID] = Field(None, description="Optional active journey ID to link with session")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Current GPS latitude at activation")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Current GPS longitude at activation")
    notify_trusted_contacts: bool = Field(False, description="Flag indicating user requested contact notification")
    user_note: Optional[str] = Field(None, max_length=500, description="Optional reason or contextual note")


class SafetyModeEndRequest(BaseModel):
    """
    Request payload to end Safety Mode session when user is safe.
    """
    deactivation_reason: Optional[str] = Field("user_safe", max_length=255, description="Reason for ending session")
    user_note: Optional[str] = Field(None, max_length=500, description="Optional closing note")
    send_safe_confirmation_update: bool = Field(True, description="Send I'm Safe confirmation update if contacts were notified")


class SafetyModeSessionResponse(BaseModel):
    """
    Core representation of a Safety Mode session.
    """
    id: UUID
    user_id: UUID
    journey_id: Optional[UUID] = None
    status: Literal["ACTIVE", "ENDED", "INTERRUPTED"]
    activated_at: datetime
    deactivated_at: Optional[datetime] = None
    activation_latitude: Optional[float] = None
    activation_longitude: Optional[float] = None
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    notification_status: Literal["NOT_CONFIGURED", "PENDING", "SENT", "FAILED", "DELIVERED"]
    deactivation_reason: Optional[str] = None
    user_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyHelpPointItem(BaseModel):
    """
    Verified safe haven / emergency help point with calculated ground distance.
    """
    id: UUID
    name: str
    point_type: str
    category: str
    latitude: float
    longitude: float
    distance_m: float
    address: str
    phone_number: Optional[str] = None
    is_verified: bool
    is_24_hours: bool

    model_config = ConfigDict(from_attributes=True)


class SafetyModeActiveDetailResponse(BaseModel):
    """
    Comprehensive payload returned for the active Safety Mode view.
    """
    session: SafetyModeSessionResponse
    journey_id: Optional[UUID] = None
    journey_title: Optional[str] = None
    journey_destination: Optional[str] = None
    journey_status: Optional[str] = None
    nearby_help_points: List[NearbyHelpPointItem] = Field(default_factory=list)
    location_status: Literal["available", "permission_required", "accuracy_limited", "delayed"]
    notification_message: str
    guardian_status: Dict[str, Any] = Field(default_factory=dict)
    available_assistance: List[str] = Field(default_factory=list)
    notifications: List[SOSRecipientNotificationItem] = Field(default_factory=list)
    recipients_count: int = 0
    location_sharing_url: Optional[str] = None
    provider_configured: bool = True

    model_config = ConfigDict(from_attributes=True)
