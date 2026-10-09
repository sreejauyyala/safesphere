from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict


ALLOWED_CATEGORIES = {
    "poor_lighting",
    "road_damage",
    "road_obstruction",
    "isolated_area",
    "transport_issue",
    "general_safety",
    "other",
}

CATEGORY_LABEL_MAP = {
    "poor_lighting": "Poor Lighting",
    "road_damage": "Road Damage",
    "road_obstruction": "Road Obstruction",
    "isolated_area": "Isolated Area",
    "transport_issue": "Transport Issue",
    "general_safety": "General Safety Concern",
    "other": "Other Safety Issue",
}

ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH"}


class SafetyReportCreateRequest(BaseModel):
    category: str = Field(..., description="Report category")
    description: str = Field(..., description="Factual description of safety concern (5-1000 characters)")
    severity: str = Field(default="MEDIUM", description="Severity: LOW, MEDIUM, or HIGH")
    latitude: float = Field(..., description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., description="Longitude coordinate (-180 to 180)")
    location_label: Optional[str] = Field(default=None, max_length=255, description="Human-readable address or landmark")
    title: Optional[str] = Field(default=None, max_length=200, description="Optional brief title")
    report_type: Optional[str] = Field(default="text", description="Modality: text, voice, image, or image_text")
    media_url: Optional[str] = Field(default=None, max_length=500, description="Optional evidence media URL")
    media_type: Optional[str] = Field(default=None, max_length=50, description="MIME type of media evidence")
    transcript: Optional[str] = Field(default=None, description="Optional audio speech transcript")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        clean = v.strip().lower().replace(" ", "_")
        if clean not in ALLOWED_CATEGORIES:
            allowed_str = ", ".join(sorted(ALLOWED_CATEGORIES))
            raise ValueError(f"Invalid category '{v}'. Allowed categories are: {allowed_str}")
        return clean

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        clean = v.strip().upper()
        if clean not in ALLOWED_SEVERITIES:
            raise ValueError(f"Invalid severity '{v}'. Allowed severities are: LOW, MEDIUM, HIGH")
        return clean

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Description must be at least 5 characters long and cannot be empty or whitespace only.")
        if len(clean) > 1000:
            raise ValueError("Description cannot exceed 1000 characters.")
        return clean

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if v < -90.0 or v > 90.0:
            raise ValueError("Latitude must be between -90 and +90 degrees.")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if v < -180.0 or v > 180.0:
            raise ValueError("Longitude must be between -180 and +180 degrees.")
        return v


class SafetyReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    report_type: str
    category: str
    title: str
    description: Optional[str] = None
    severity: str
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    status: str
    verification_status: str
    verification_count: int = 0
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    transcript: Optional[str] = None
    ai_risk_score: Optional[float] = None
    ai_analysis_summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SafetyReportPublicResponse(BaseModel):
    """
    Public-safe safety report item.
    Never exposes reporter user_id, name, phone, or email.
    """
    id: UUID
    report_type: str
    category: str
    title: str
    description: Optional[str] = None
    severity: str
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    status: str
    verification_status: str
    verification_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
