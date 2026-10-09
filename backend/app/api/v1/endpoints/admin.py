from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.admin_service import admin_service
from app.schemas.admin import (
    AdminDashboardMetricsResponse,
    ReportAdminItemResponse,
    ReportModerationActionRequest,
    IssueAssignmentCreate,
    IssueAssignmentUpdate,
    IssueAssignmentResponse,
    IssueResolutionCreate,
    IssueResolutionResponse,
    PreventiveActionQueueItemResponse,
    AdminHotspotItemResponse,
    AdminAnalyticsResponse,
    AdministrativeAuditLogResponse,
)

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=AdminDashboardMetricsResponse,
    summary="Get organization or global admin dashboard metrics",
)
def get_admin_dashboard(
    organization_id: Optional[UUID] = Query(None, description="Optional organization scope filter for System Admin"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns real aggregate metrics for the dashboard.
    Strictly scoped to user's assigned organization for Organization Admins.
    """
    return admin_service.get_dashboard_metrics(
        current_user=current_user,
        db=db,
        target_org_id=organization_id,
    )


@router.get(
    "/reports",
    response_model=List[ReportAdminItemResponse],
    summary="List and filter administrative safety reports",
)
def list_admin_reports(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    organization_id: Optional[UUID] = Query(None),
    is_assigned: Optional[bool] = Query(None),
    resolution_disputed: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns paginated safety reports for administrative inspection.
    Never exposes reporter private phone, email, or journey details.
    """
    reports, _ = admin_service.get_reports(
        current_user=current_user,
        db=db,
        category=category,
        severity=severity,
        verification_status=verification_status,
        status_filter=status,
        organization_id=organization_id,
        is_assigned=is_assigned,
        resolution_disputed=resolution_disputed,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        skip=skip,
    )
    return reports


@router.get(
    "/reports/{report_id}",
    response_model=ReportAdminItemResponse,
    summary="Get single administrative report detail",
)
def get_admin_report_detail(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_report_by_id(
        current_user=current_user,
        report_id=report_id,
        db=db,
    )


@router.post(
    "/reports/{report_id}/verify",
    response_model=ReportAdminItemResponse,
    summary="Officially verify a safety report",
)
def verify_report_endpoint(
    report_id: UUID,
    payload: Optional[ReportModerationActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = payload.reason if payload else "Officially verified by authorized administrator."
    return admin_service.moderate_report(
        current_user=current_user,
        report_id=report_id,
        action="VERIFY",
        reason=reason,
        db=db,
    )


@router.post(
    "/reports/{report_id}/reject",
    response_model=ReportAdminItemResponse,
    summary="Reject an invalid safety report",
)
def reject_report_endpoint(
    report_id: UUID,
    payload: Optional[ReportModerationActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = payload.reason if payload else "Rejected by authorized administrator."
    return admin_service.moderate_report(
        current_user=current_user,
        report_id=report_id,
        action="REJECT",
        reason=reason,
        db=db,
    )


@router.post(
    "/reports/{report_id}/flag",
    response_model=ReportAdminItemResponse,
    summary="Flag a report for additional investigation",
)
def flag_report_endpoint(
    report_id: UUID,
    payload: Optional[ReportModerationActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = payload.reason if payload else "Flagged for investigative review."
    return admin_service.moderate_report(
        current_user=current_user,
        report_id=report_id,
        action="FLAG_FOR_REVIEW",
        reason=reason,
        db=db,
    )


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

@router.post(
    "/assignments",
    response_model=IssueAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a report to an organization or responder",
)
def create_issue_assignment(
    payload: IssueAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.create_assignment(
        current_user=current_user,
        payload=payload,
        db=db,
    )


@router.get(
    "/assignments",
    response_model=List[IssueAssignmentResponse],
    summary="List issue assignments in scope",
)
def list_issue_assignments(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_assignments(
        current_user=current_user,
        db=db,
        status_filter=status,
        priority=priority,
        limit=limit,
        skip=skip,
    )


@router.patch(
    "/assignments/{assignment_id}",
    response_model=IssueAssignmentResponse,
    summary="Update assignment status, priority, or responder",
)
def update_issue_assignment(
    assignment_id: UUID,
    payload: IssueAssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.update_assignment(
        current_user=current_user,
        assignment_id=assignment_id,
        payload=payload,
        db=db,
    )


# ---------------------------------------------------------------------------
# Resolutions
# ---------------------------------------------------------------------------

@router.post(
    "/reports/{report_id}/resolution",
    response_model=IssueResolutionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record official resolution for a safety report",
)
def record_issue_resolution(
    report_id: UUID,
    payload: IssueResolutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.create_resolution(
        current_user=current_user,
        report_id=report_id,
        payload=payload,
        db=db,
    )


@router.post(
    "/resolutions/{resolution_id}/reopen",
    response_model=IssueResolutionResponse,
    summary="Reopen a resolved issue following dispute",
)
def reopen_resolution_endpoint(
    resolution_id: UUID,
    reason: str = Query("Reopened following field investigation.", min_length=3),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.reopen_resolution(
        current_user=current_user,
        resolution_id=resolution_id,
        reason=reason,
        db=db,
    )


# ---------------------------------------------------------------------------
# Preventive Action Queue, Hotspots, Analytics, Audit Trail
# ---------------------------------------------------------------------------

@router.get(
    "/action-queue",
    response_model=List[PreventiveActionQueueItemResponse],
    summary="Get prioritized preventive action queue",
)
def get_preventive_action_queue(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_action_queue(
        current_user=current_user,
        db=db,
        limit=limit,
    )


@router.get(
    "/hotspots",
    response_model=List[AdminHotspotItemResponse],
    summary="Get recurring report clusters and hotspot areas",
)
def get_admin_hotspots(
    radius_meters: float = Query(300.0, ge=50.0, le=2000.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_hotspots(
        current_user=current_user,
        db=db,
        radius_m=radius_meters,
    )


@router.get(
    "/analytics",
    response_model=AdminAnalyticsResponse,
    summary="Get organization-scoped or system-wide analytics",
)
def get_admin_analytics(
    organization_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_analytics(
        current_user=current_user,
        db=db,
        target_org_id=organization_id,
    )


@router.get(
    "/audit-logs",
    response_model=List[AdministrativeAuditLogResponse],
    summary="Get administrative and moderation audit trail",
)
def get_admin_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.get_audit_logs(
        current_user=current_user,
        db=db,
        limit=limit,
        skip=skip,
    )
