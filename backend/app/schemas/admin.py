from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Organization Schemas
# ---------------------------------------------------------------------------

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    org_type: str = Field(default="COLLEGE", description="COLLEGE, COMPANY, RESIDENTIAL_COMMUNITY, CAMPUS_SECURITY, PUBLIC_SPACE_MANAGER, LOCAL_AUTHORITY, OTHER")
    description: Optional[str] = None
    address: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    domain: Optional[str] = Field(None, max_length=100)
    contact_email: str = Field(..., max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=30)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    org_type: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    domain: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = Field(None, description="PENDING, ACTIVE, SUSPENDED")
    is_verified: Optional[bool] = None


class OrganizationDetailResponse(BaseModel):
    id: UUID
    name: str
    org_type: str
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    domain: Optional[str] = None
    contact_email: str
    contact_phone: Optional[str] = None
    status: str
    is_verified: bool
    member_count: int = 0
    active_assignments_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationMembershipCreate(BaseModel):
    user_id: UUID
    role: str = Field(default="MEMBER", description="ADMIN, MEMBER, RESPONDER, DISPATCHER")
    status: str = Field(default="ACTIVE", description="ACTIVE, INVITED, SUSPENDED")


class OrganizationMembershipResponse(BaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Issue Assignment Schemas
# ---------------------------------------------------------------------------

class IssueAssignmentCreate(BaseModel):
    report_id: UUID
    organization_id: Optional[UUID] = None
    assigned_to_user_id: Optional[UUID] = None
    priority: str = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH, URGENT")
    action_description: Optional[str] = None
    target_resolution_at: Optional[datetime] = None


class IssueAssignmentUpdate(BaseModel):
    assigned_to_user_id: Optional[UUID] = None
    priority: Optional[str] = Field(None, description="LOW, MEDIUM, HIGH, URGENT")
    status: Optional[str] = Field(None, description="UNASSIGNED, ASSIGNED, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED")
    action_description: Optional[str] = None
    target_resolution_at: Optional[datetime] = None


class IssueAssignmentResponse(BaseModel):
    id: UUID
    report_id: UUID
    organization_id: UUID
    organization_name: Optional[str] = None
    assigned_to_user_id: Optional[UUID] = None
    assigned_to_user_name: Optional[str] = None
    priority: str
    status: str
    action_description: Optional[str] = None
    target_resolution_at: Optional[datetime] = None
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Issue Resolution Schemas
# ---------------------------------------------------------------------------

class IssueResolutionCreate(BaseModel):
    report_id: UUID
    assignment_id: Optional[UUID] = None
    action_taken: str = Field(..., min_length=5, description="Factual action executed to resolve issue")
    resolution_notes: Optional[str] = None


class IssueResolutionResponse(BaseModel):
    id: UUID
    report_id: UUID
    assignment_id: Optional[UUID] = None
    assigned_to_org_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    assigned_responder_id: Optional[UUID] = None
    responder_name: Optional[str] = None
    status: str
    action_taken: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Report Moderation & Admin Item Schemas
# ---------------------------------------------------------------------------

class ReportModerationActionRequest(BaseModel):
    action: Optional[str] = Field(None, description="VERIFY, REJECT, FLAG_FOR_REVIEW")
    reason: Optional[str] = Field(None, description="Factual justification for moderation decision")
    notes: Optional[str] = None


class ReportAdminItemResponse(BaseModel):
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
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    transcript: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Scope & Assignment context
    assigned_organization_id: Optional[UUID] = None
    assigned_organization_name: Optional[str] = None
    current_assignment: Optional[IssueAssignmentResponse] = None

    # Community signals summary
    confirm_count: int = 0
    dispute_count: int = 0
    resolved_count: int = 0
    still_present_count: int = 0
    flagged_for_review: bool = False
    reopen_requested: bool = False
    is_duplicate: bool = False
    duplicate_of_id: Optional[UUID] = None
    audit_events_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Dashboard Metrics & Action Queue Schemas
# ---------------------------------------------------------------------------

class AdminDashboardMetricsResponse(BaseModel):
    total_reports_in_scope: int
    pending_review_count: int
    verified_reports_count: int
    active_unresolved_count: int
    assigned_issues_count: int
    in_progress_count: int
    resolved_issues_count: int
    resolution_disputes_count: int
    reopened_count: int
    avg_resolution_hours: Optional[float] = None
    hotspots_detected_count: int = 0
    organization_name: Optional[str] = None
    is_global_scope: bool = False


class PreventiveActionQueueItemResponse(BaseModel):
    report_id: UUID
    category: str
    title: str
    location_label: Optional[str] = None
    latitude: float
    longitude: float
    reported_severity: str
    administrative_priority: str  # URGENT, HIGH, MEDIUM, LOW
    priority_score: float
    verification_status: str
    lifecycle_status: str
    assignment_status: str
    assigned_organization_name: Optional[str] = None
    confirm_count: int
    dispute_count: int
    is_resolution_disputed: bool
    is_overdue: bool
    age_days: float
    target_resolution_at: Optional[datetime] = None
    action_reason: str


# ---------------------------------------------------------------------------
# Hotspot & Analytics Schemas
# ---------------------------------------------------------------------------

class AdminHotspotItemResponse(BaseModel):
    id: str
    center_latitude: float
    center_longitude: float
    radius_meters: float
    category: str
    reports_count: int
    severity: str
    description: str
    report_ids: List[UUID]


class AdminAnalyticsResponse(BaseModel):
    reports_by_category: Dict[str, int]
    reports_by_verification_status: Dict[str, int]
    reports_by_severity: Dict[str, int]
    assignments_by_priority: Dict[str, int]
    assignments_by_status: Dict[str, int]
    resolution_rate_percent: float
    avg_assignment_hours: Optional[float] = None
    avg_resolution_hours: Optional[float] = None
    monthly_trends: List[Dict[str, Any]]
    total_audits_recorded: int = 0


class AdministrativeAuditLogResponse(BaseModel):
    id: UUID
    actor_user_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None
    action_type: str
    target_type: str
    target_id: Optional[UUID] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
