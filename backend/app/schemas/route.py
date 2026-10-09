from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class RouteCoordinates(BaseModel):
    """
    Standard GPS coordinate pair for route origins, destinations, and waypoints.
    """
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90 degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180 degrees")

    @field_validator("latitude", "longitude")
    def validate_coordinate_precision(cls, v: float) -> float:
        return round(float(v), 6)


class TurnByTurnStep(BaseModel):
    """
    Individual step-by-step navigation instruction along a route corridor.
    """
    instruction: str = Field(..., description="Human-readable driving or walking direction")
    maneuver_type: str = Field(default="turn", description="e.g. depart, turn, continue, fork, arrive")
    modifier: Optional[str] = Field(None, description="e.g. left, right, straight, slight left")
    road_name: Optional[str] = Field(None, description="Street or road name if identified")
    distance_m: float = Field(default=0.0, ge=0.0, description="Distance along this segment in meters")
    duration_seconds: float = Field(default=0.0, ge=0.0, description="Estimated duration for this step in seconds")


class RouteAlternativesRequest(BaseModel):
    """
    Payload requesting candidate route calculations between an origin and destination.
    """
    origin: RouteCoordinates
    destination: RouteCoordinates
    profile: Optional[str] = "walking"
    travel_mode: Optional[str] = None
    departure_time: Optional[datetime] = None
    alternatives: bool = True

    @field_validator("profile", mode="before")
    def normalize_profile(cls, v: Optional[str]) -> str:
        if not v:
            return "walking"
        v_str = str(v).lower().strip()
        if v_str in ("car", "driving", "drive"):
            return "driving"
        if v_str in ("bicycle", "cycling", "bike"):
            return "cycling"
        if v_str in ("two_wheeler", "motorcycle", "scooter", "scooty"):
            return "two_wheeler"
        return "walking"

    @field_validator("destination")
    def validate_distinct_endpoints(cls, dest: RouteCoordinates, info) -> RouteCoordinates:
        origin = info.data.get("origin")
        if origin and abs(origin.latitude - dest.latitude) < 0.00005 and abs(origin.longitude - dest.longitude) < 0.00005:
            raise ValueError("Origin and destination must be distinctly separated geographic locations.")
        return dest


class RouteSignalSummary(BaseModel):
    """
    Transparent summary of a verified safety report or help point near a route segment.
    """
    signal_type: str = Field(..., description="e.g. verified_report, help_point, hazard_cluster")
    category: str = Field(..., description="e.g. poor_lighting, road_damage, police_station")
    severity: Optional[str] = Field(None, description="LOW, MEDIUM, HIGH, CRITICAL, or None for help points")
    description: str
    distance_from_route_m: float
    location_label: Optional[str] = None


class RouteRelevantIssue(BaseModel):
    """
    Distinct verified hazard identified along the route corridor with distance and impact details.
    """
    report_id: str
    category: str
    category_label: str
    severity: str
    description: str
    distance_from_route_m: float
    location_label: Optional[str] = None
    latitude: float
    longitude: float
    created_at: Optional[str] = None
    mode_relevance: Optional[str] = None
    is_night_factor: bool = False


class RouteRiskAssessment(BaseModel):
    """
    Route-level Safety Pulse risk evaluation derived from sampled points along the route corridor.
    Enforces explicit unknown/insufficient states when data coverage is low.
    """
    status: Literal["available", "insufficient_data", "unavailable"] = "available"
    risk_level: Literal["lower", "moderate", "elevated", "higher", "unknown"] = "unknown"
    score: Optional[int] = Field(None, ge=0, le=100, description="Numerical Safety Pulse score (0-100), or None if insufficient data")
    color: Literal["green", "yellow", "red", "grey"] = "grey"
    color_hex: str = "#64748B"
    label: str = "Insufficient Safety Data"
    confidence: Literal["high", "moderate", "low", "insufficient"] = "insufficient"
    data_coverage: float = Field(..., ge=0.0, le=1.0, description="Fraction of sampled points with verified safety signals (0.0 to 1.0)")
    data_coverage_label: Literal["high", "moderate", "low", "insufficient"] = "insufficient"
    verified_issues_count: int = 0
    assessed_samples_count: int = 0
    total_samples_count: int = 0
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


class RouteAlternativeItem(BaseModel):
    """
    A single candidate route alternative with real road geometry, metrics, and safety assessment.
    """
    route_id: str
    route_type: Literal["fastest", "shortest", "lower_estimated_risk", "standard", "alternative"]
    route_type_label: str
    provider: str = "osrm"
    transport_mode: str = "walking"  # "car", "two_wheeler", "bicycle", "walking"
    distance_m: float = Field(..., ge=0.0)
    duration_seconds: float = Field(..., ge=0.0)
    origin: RouteCoordinates
    destination: RouteCoordinates
    geometry: Dict[str, Any] = Field(..., description="GeoJSON LineString geometry with coordinates [[lon, lat], ...]")
    steps: List[TurnByTurnStep] = Field(default_factory=list, description="Turn-by-turn guidance steps from provider")
    two_wheeler_disclaimer: Optional[str] = None
    risk_assessment: RouteRiskAssessment
    safety_assessment: Optional[RouteRiskAssessment] = None
    strongest_signals: List[RouteSignalSummary] = Field(default_factory=list)
    relevant_issues: List[RouteRelevantIssue] = Field(default_factory=list)
    distinct_verified_issues_count: int = 0
    explanation: str = ""
    limitations: List[str] = Field(default_factory=list)
    summary_tags: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        if self.safety_assessment is None and self.risk_assessment is not None:
            self.safety_assessment = self.risk_assessment

    model_config = ConfigDict(from_attributes=True)



class RouteAlternativesResponse(BaseModel):
    """
    Consolidated response containing candidate routes, safety comparisons, and recommendation.
    """
    routes: List[RouteAlternativeItem]
    recommendation_status: Literal["recommended", "insufficient_data", "no_alternatives", "unavailable"]
    recommended_route_id: Optional[str] = None
    recommendation_reason: Optional[str] = None
    limitations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "Route safety assessments are estimates based on available information. "
        "They do not guarantee safety or predict crime."
    )

    model_config = ConfigDict(from_attributes=True)


class RouteSafetyAssessRequest(BaseModel):
    """
    Payload to assess or re-assess route-level safety for arbitrary route geometry.
    """
    route_id: Optional[str] = None
    geometry: Dict[str, Any]
    distance_m: float
    duration_seconds: float
    origin: RouteCoordinates
    destination: RouteCoordinates
