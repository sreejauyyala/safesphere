from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class TrustedContactPermissions(BaseModel):
    notify_journey_start: bool = Field(True, description="Notify when a journey starts")
    notify_journey_end: bool = Field(True, description="Notify when a journey completes")
    notify_safety_mode: bool = Field(True, description="Notify when Safety Mode (I Feel Unsafe) is activated")
    notify_sos: bool = Field(True, description="Notify when SOS emergency is triggered")
    share_live_location: bool = Field(True, description="Allow access to live tracking coordinates")
    notify_emergency_updates: bool = Field(True, description="Notify on safety escalation updates")


class TrustedContactCreateRequest(BaseModel):
    contact_name: str = Field(..., min_length=2, max_length=150, description="Contact display name")
    phone: str = Field(..., min_length=7, max_length=30, description="Mobile phone number with country code")
    email: Optional[EmailStr] = Field(None, description="Optional email address")
    relationship: str = Field("Friend", description="Relationship type (Parent, Guardian, Friend, Sibling, Spouse, Partner, Roommate, Other)")
    is_emergency_recipient: bool = Field(True, description="Flag for emergency contact prioritization")
    permissions: Optional[TrustedContactPermissions] = None


class TrustedContactUpdateRequest(BaseModel):
    contact_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, min_length=7, max_length=30)
    email: Optional[EmailStr] = None
    relationship: Optional[str] = None
    is_emergency_recipient: Optional[bool] = None
    notify_journey_start: Optional[bool] = None
    notify_journey_end: Optional[bool] = None
    notify_safety_mode: Optional[bool] = None
    notify_sos: Optional[bool] = None
    share_live_location: Optional[bool] = None
    notify_emergency_updates: Optional[bool] = None


class TrustedContactVerifyRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=20, description="Verification OTP code")


class TrustedContactResponse(BaseModel):
    id: UUID
    user_id: UUID
    contact_name: str
    phone: str
    email: Optional[str] = None
    relationship: str
    verification_status: str  # PENDING, VERIFIED, REJECTED, REVOKED
    is_emergency_recipient: bool
    is_active: bool
    permissions: TrustedContactPermissions
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
