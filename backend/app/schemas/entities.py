from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# -------------------------------------------------------------
# User & Auth Schemas
# -------------------------------------------------------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    is_under_18: bool = False
    role: str = "user"


class UserCreate(UserBase):
    firebase_uid: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Guardian Schemas
# -------------------------------------------------------------
class GuardianBase(BaseModel):
    guardian_name: str
    relationship_type: str
    contact_phone: str
    contact_email: Optional[EmailStr] = None


class GuardianCreate(GuardianBase):
    ward_id: UUID


class GuardianResponse(GuardianBase):
    id: UUID
    ward_id: UUID
    is_verified: bool
    emergency_alerts_enabled: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Trusted Contact Schemas
# -------------------------------------------------------------
class TrustedContactBase(BaseModel):
    name: str
    phone_number: str
    email: Optional[EmailStr] = None
    relationship: str = "friend"
    is_emergency_recipient: bool = True


class TrustedContactCreate(TrustedContactBase):
    user_id: UUID


class TrustedContactResponse(TrustedContactBase):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Safety Report Schemas
# -------------------------------------------------------------
class SafetyReportBase(BaseModel):
    report_type: str = "text"
    category: str = "general_safety"
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    media_url: Optional[str] = None


class SafetyReportCreate(SafetyReportBase):
    user_id: Optional[UUID] = None


class SafetyReportResponse(SafetyReportBase):
    id: UUID
    user_id: Optional[UUID]
    ai_risk_score: Optional[float] = None
    ai_analysis_summary: Optional[str] = None
    verification_count: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Safety Pulse Schemas
# -------------------------------------------------------------
class SafetyPulseQuery(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float = 1000.0


class SafetyPulseResponse(BaseModel):
    area_name: str
    latitude: float
    longitude: float
    overall_score: float
    zone_risk_level: str
    lighting_rating: Optional[float] = None
    crowd_density: Optional[str] = None
    recent_incidents_count: int


# -------------------------------------------------------------
# Journey Schemas
# -------------------------------------------------------------
class JourneyCreate(BaseModel):
    title: str = "SafeSphere Commute"
    start_latitude: float
    start_longitude: float
    start_address: Optional[str] = None
    destination_latitude: float
    destination_longitude: float
    destination_address: Optional[str] = None
    expected_arrival_time: Optional[datetime] = None


class JourneyResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    start_latitude: float
    start_longitude: float
    destination_latitude: float
    destination_longitude: float
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    status: str
    is_safe_mode_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# SOS & Emergency Schemas
# -------------------------------------------------------------
class SOSSignalCreate(BaseModel):
    latitude: float
    longitude: float
    battery_level: Optional[int] = None
    audio_snippet_url: Optional[str] = None
    emergency_type: str = "panic_button"


class SOSSignalResponse(BaseModel):
    sos_id: UUID
    status: str
    dispatched_to_contacts: int
    emergency_services_alerted: bool
    timestamp: datetime


# -------------------------------------------------------------
# Help Point Schemas
# -------------------------------------------------------------
class HelpPointResponse(BaseModel):
    id: UUID
    name: str
    category: str
    latitude: float
    longitude: float
    address: str
    phone_number: Optional[str] = None
    is_verified: bool
    is_24_hours: bool

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Organization & Feedback Schemas
# -------------------------------------------------------------
class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    org_type: str
    domain: Optional[str]
    contact_email: str
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    safety_perception: Optional[str] = None
    comments: Optional[str] = None
    category: str = "journey_safety"
