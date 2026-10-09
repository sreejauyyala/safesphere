from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class SafetyPulseSignalItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    severity: str
    title: str
    description: Optional[str] = None
    distance_m: int
    created_at: datetime
    status: str
    verification_status: str
    penalty_contribution: float = 0.0


class SafetyPulseResponse(BaseModel):
    status: str = Field(..., description="'available' or 'insufficient_data'")
    score: Optional[int] = Field(None, description="0 to 100 integer score or null if insufficient data")
    risk_level: str = Field(..., description="'lower', 'moderate', 'elevated', 'higher', or 'unknown'")
    confidence: str = Field(..., description="'high', 'moderate', 'low', or 'insufficient'")
    data_freshness: str = Field(..., description="'fresh', 'moderate', 'limited', 'stale', or 'insufficient'")
    assessment_radius_m: float
    evaluated_at: datetime
    verified_unresolved_reports: int = 0
    verified_resolved_reports: int = 0
    pending_reports_count: int = 0
    verified_help_points_count: int = 0
    strongest_signals: List[SafetyPulseSignalItem] = []
    unavailable_sources: List[str] = [
        "Real-time municipal lighting sensors",
        "Live crowd telemetry feeds",
        "Real-time transit surveillance feeds"
    ]
    limitations: List[str] = []
    time_context_applied: Optional[str] = None
    disclaimer: str = (
        "Safety Pulse is an estimate based on available safety information. "
        "It does not guarantee safety or predict crime. Missing reports do not mean that an area is safe."
    )


class SafetyPulseHistorySnapshot(BaseModel):
    timestamp: datetime
    score: Optional[int]
    status: str
    active_verified_reports: int
    resolved_reports: int


class SafetyPulseHistoryResponse(BaseModel):
    status: str
    latitude: float
    longitude: float
    radius_meters: float
    history: List[SafetyPulseHistorySnapshot] = []
    trend_summary: str


class ReportStatusUpdatePayload(BaseModel):
    status: Optional[str] = Field(None, description="OPEN, IN_REVIEW, RESOLVED, REJECTED")
    verification_status: Optional[str] = Field(None, description="PENDING, VERIFIED, REJECTED")
    action_taken: Optional[str] = None
    resolution_notes: Optional[str] = None
