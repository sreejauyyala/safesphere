from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SafetyReportCategoryEnum(str, Enum):
    POOR_LIGHTING = "poor_lighting"
    ROAD_DAMAGE = "road_damage"
    ROAD_OBSTRUCTION = "road_obstruction"
    ISOLATED_AREA = "isolated_area"
    TRANSPORT_ISSUE = "transport_issue"
    GENERAL_SAFETY = "general_safety"
    OTHER = "other"


class SafetyReportSeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


ALLOWED_CATEGORIES = {
    "poor_lighting",
    "road_damage",
    "road_obstruction",
    "isolated_area",
    "transport_issue",
    "general_safety",
    "other",
}

ALLOWED_SEVERITIES = {"low", "medium", "high"}


class AIAnalysisRequest(BaseModel):
    description: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Factual citizen safety observation in natural language (5-1000 characters)",
    )

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Description must be at least 5 characters long and cannot be empty whitespace.")
        if len(clean) > 1000:
            raise ValueError("Description cannot exceed 1000 characters.")
        return clean


class SafetyReportAIAnalysisResult(BaseModel):
    category: str = Field(
        ...,
        description="Suggested standardized safety category",
    )
    severity: str = Field(
        ...,
        description="Suggested severity rating: low, medium, or high",
    )
    summary: str = Field(
        ...,
        max_length=500,
        description="Concise, factual incident summary without speculation",
    )
    safety_signal: str = Field(
        ...,
        description="Primary contextual safety signal identifier",
    )
    confidence: float = Field(
        ...,
        description="Model classification confidence between 0.0 and 1.0",
    )
    suggested_action: str = Field(
        ...,
        max_length=300,
        description="Recommended next action for the user's reporting workflow",
    )

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v: str) -> str:
        clean = str(v).strip().lower().replace(" ", "_")
        if clean not in ALLOWED_CATEGORIES:
            return "other"
        return clean

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, v: str) -> str:
        clean = str(v).strip().lower()
        if clean not in ALLOWED_SEVERITIES:
            return "medium"
        return clean

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, v: float) -> float:
        try:
            val = float(v)
            if val < 0.0:
                return 0.0
            if val > 1.0:
                return 1.0
            return round(val, 2)
        except (ValueError, TypeError):
            return 0.5


class AIAnalysisEnvelope(BaseModel):
    success: bool
    code: Optional[str] = None
    message: Optional[str] = None
    analysis: Optional[SafetyReportAIAnalysisResult] = None

    model_config = ConfigDict(from_attributes=True)


class AITranscriptionEnvelope(BaseModel):
    success: bool
    code: Optional[str] = None
    message: Optional[str] = None
    transcript: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AIAudioAnalysisEnvelope(BaseModel):
    success: bool
    code: Optional[str] = None
    message: Optional[str] = None
    transcript: Optional[str] = None
    input_type: str = "voice"
    analysis: Optional[SafetyReportAIAnalysisResult] = None

    model_config = ConfigDict(from_attributes=True)


class AIImageAnalysisEnvelope(BaseModel):
    success: bool
    code: Optional[str] = None
    message: Optional[str] = None
    media_url: Optional[str] = None
    input_type: str = "image"
    analysis: Optional[SafetyReportAIAnalysisResult] = None

    model_config = ConfigDict(from_attributes=True)

