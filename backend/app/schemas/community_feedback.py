from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ReportVerificationFeedbackCreate(BaseModel):
    feedback_type: str = Field(
        ...,
        description="CONFIRM_ISSUE, DISPUTE_ISSUE, DUPLICATE_REPORT, INACCURATE_LOCATION, INACCURATE_CATEGORY",
    )
    response_value: Optional[str] = Field(None, max_length=100)
    concern_category: Optional[str] = Field(None, max_length=100)
    duplicate_of_report_id: Optional[UUID] = None
    comment: Optional[str] = Field(None, max_length=1000)


class ReportResolutionFeedbackCreate(BaseModel):
    feedback_type: str = Field(
        ...,
        description="CONFIRM_RESOLVED, REPORT_STILL_PRESENT",
    )
    response_value: Optional[str] = Field(None, max_length=100)
    comment: Optional[str] = Field(None, max_length=1000)


class JourneyFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 star rating")
    route_accuracy: Optional[str] = Field(None, description="MOSTLY_YES, PARTLY, NO, UNABLE_TO_JUDGE")
    safety_info_usefulness: Optional[str] = Field(None, description="USEFUL, PARTLY_USEFUL, NOT_USEFUL, INSUFFICIENT_DATA")
    comment: Optional[str] = Field(None, max_length=1000)


class GeneralFeedbackCreate(BaseModel):
    category: str = Field(
        "app_experience",
        description="app_experience, reporting_experience, map_accuracy, safety_pulse_usefulness, route_guidance, accessibility, technical_problem, feature_suggestion, other",
    )
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: str = Field(..., min_length=3, max_length=1500)
    related_report_id: Optional[UUID] = None
    related_journey_id: Optional[UUID] = None


class CommunityFeedbackResponse(BaseModel):
    id: UUID
    target_type: str
    target_id: Optional[UUID] = None
    feedback_type: str
    rating: Optional[int] = None
    response_value: Optional[str] = None
    route_accuracy: Optional[str] = None
    safety_info_usefulness: Optional[str] = None
    concern_category: Optional[str] = None
    duplicate_of_report_id: Optional[UUID] = None
    comment: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportCommunitySummaryResponse(BaseModel):
    report_id: UUID
    status: str
    verification_status: str
    confirm_count: int = 0
    dispute_count: int = 0
    resolved_count: int = 0
    still_present_count: int = 0
    total_responses: int = 0
    flagged_for_review: bool = False
    reopen_requested: bool = False
    is_duplicate: bool = False
    duplicate_of_id: Optional[UUID] = None
    user_response: Optional[CommunityFeedbackResponse] = None
    audit_events_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ReportModerationRequest(BaseModel):
    new_status: Optional[str] = None
    new_verification_status: Optional[str] = None
    review_notes: Optional[str] = None


class ReportAuditLogResponse(BaseModel):
    id: UUID
    report_id: UUID
    action: str
    actor_id: Optional[UUID] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    previous_verification_status: Optional[str] = None
    new_verification_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
