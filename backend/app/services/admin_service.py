import logging
import math
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.safety_report import SafetyReport
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.issue_assignment import IssueAssignment
from app.models.issue_resolution import IssueResolution
from app.models.admin_audit_log import AdministrativeAuditLog
from app.models.community_feedback import CommunityFeedback
from app.models.report_audit_log import ReportAuditLog
from app.schemas.admin import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationDetailResponse,
    OrganizationMembershipCreate,
    OrganizationMembershipResponse,
    IssueAssignmentCreate,
    IssueAssignmentUpdate,
    IssueAssignmentResponse,
    IssueResolutionCreate,
    IssueResolutionResponse,
    ReportAdminItemResponse,
    AdminDashboardMetricsResponse,
    PreventiveActionQueueItemResponse,
    AdminHotspotItemResponse,
    AdminAnalyticsResponse,
    AdministrativeAuditLogResponse,
)

logger = logging.getLogger("safesphere.admin")


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes Haversine distance in meters between two coordinates."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class AdminService:
    # -----------------------------------------------------------------------
    # Scope & RBAC Helpers
    # -----------------------------------------------------------------------

    def get_user_organization_scope(self, current_user: User, db: Session) -> Optional[UUID]:
        """
        Determines the organizational access scope for the authenticated user.
        - SYSTEM_ADMIN: Global scope (returns None)
        - ORGANIZATION_ADMIN: Scoped to their assigned organization ID
        - USER: Forbidden (raises 403)
        """
        if current_user.role == "SYSTEM_ADMIN":
            return None

        if current_user.role == "ORGANIZATION_ADMIN":
            if current_user.organization_id:
                return current_user.organization_id

            membership = (
                db.query(OrganizationMembership)
                .filter(
                    OrganizationMembership.user_id == current_user.id,
                    OrganizationMembership.status == "ACTIVE",
                )
                .first()
            )
            if membership:
                return membership.organization_id

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No organization assigned to this administrator account.",
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource.",
        )

    def verify_organization_access(
        self, current_user: User, target_org_id: UUID, db: Session
    ):
        """
        Enforces multi-organization isolation.
        Raises 403 if an ORGANIZATION_ADMIN attempts to access another organization.
        """
        user_scope = self.get_user_organization_scope(current_user, db)
        if user_scope is not None and user_scope != target_org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cross-organization access is strictly prohibited.",
            )

    # -----------------------------------------------------------------------
    # Dashboard Metrics
    # -----------------------------------------------------------------------

    def get_dashboard_metrics(
        self,
        current_user: User,
        db: Session,
        target_org_id: Optional[UUID] = None,
    ) -> AdminDashboardMetricsResponse:
        """
        Aggregates dashboard counts from real database queries.
        Strictly scoped by organization for ORGANIZATION_ADMIN.
        """
        user_scope = self.get_user_organization_scope(current_user, db)
        effective_org_id = user_scope or target_org_id

        # Base query for safety reports
        rep_query = db.query(SafetyReport)
        if effective_org_id:
            rep_query = rep_query.filter(
                or_(
                    SafetyReport.assigned_organization_id == effective_org_id,
                    SafetyReport.id.in_(
                        db.query(IssueAssignment.report_id).filter(
                            IssueAssignment.organization_id == effective_org_id
                        )
                    ),
                )
            )

        total_reports = rep_query.count()
        pending_review = rep_query.filter(SafetyReport.verification_status == "PENDING").count()
        verified_reports = rep_query.filter(SafetyReport.verification_status == "VERIFIED").count()
        active_unresolved = rep_query.filter(
            SafetyReport.status.in_(["OPEN", "IN_REVIEW", "RESOLUTION_DISPUTED", "REOPENED"])
        ).count()
        resolved_issues = rep_query.filter(SafetyReport.status == "RESOLVED").count()
        resolution_disputes = rep_query.filter(
            or_(
                SafetyReport.status == "RESOLUTION_DISPUTED",
                SafetyReport.reopen_requested == True,
            )
        ).count()
        reopened_count = rep_query.filter(SafetyReport.status == "REOPENED").count()

        # Base query for assignments
        asgn_query = db.query(IssueAssignment)
        if effective_org_id:
            asgn_query = asgn_query.filter(IssueAssignment.organization_id == effective_org_id)

        assigned_issues = asgn_query.filter(
            IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"])
        ).count()
        in_progress = asgn_query.filter(IssueAssignment.status == "IN_PROGRESS").count()

        # Calculate average resolution time from real timestamps
        res_query = db.query(IssueResolution).join(
            SafetyReport, IssueResolution.report_id == SafetyReport.id
        )
        if effective_org_id:
            res_query = res_query.filter(IssueResolution.assigned_to_org_id == effective_org_id)

        resolutions = res_query.all()
        avg_res_hours = None
        if resolutions:
            total_seconds = 0.0
            valid_count = 0
            for r in resolutions:
                if r.resolved_at and r.report and r.report.created_at:
                    r_time = r.resolved_at
                    if r_time.tzinfo is None:
                        r_time = r_time.replace(tzinfo=timezone.utc)
                    c_time = r.report.created_at
                    if c_time.tzinfo is None:
                        c_time = c_time.replace(tzinfo=timezone.utc)
                    delta = (r_time - c_time).total_seconds()
                    if delta >= 0:
                        total_seconds += delta
                        valid_count += 1
            if valid_count > 0:
                avg_res_hours = round(total_seconds / (valid_count * 3600.0), 1)

        # Hotspots count
        hotspots = self.get_hotspots(current_user=current_user, db=db)

        org_name = None
        if effective_org_id:
            org = db.query(Organization).filter(Organization.id == effective_org_id).first()
            if org:
                org_name = org.name

        return AdminDashboardMetricsResponse(
            total_reports_in_scope=total_reports,
            pending_review_count=pending_review,
            verified_reports_count=verified_reports,
            active_unresolved_count=active_unresolved,
            assigned_issues_count=assigned_issues,
            in_progress_count=in_progress,
            resolved_issues_count=resolved_issues,
            resolution_disputes_count=resolution_disputes,
            reopened_count=reopened_count,
            avg_resolution_hours=avg_res_hours,
            hotspots_detected_count=len(hotspots),
            organization_name=org_name,
            is_global_scope=(effective_org_id is None),
        )

    # -----------------------------------------------------------------------
    # Report Management & Scoped Queries
    # -----------------------------------------------------------------------

    def get_reports(
        self,
        current_user: User,
        db: Session,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        verification_status: Optional[str] = None,
        status_filter: Optional[str] = None,
        organization_id: Optional[UUID] = None,
        is_assigned: Optional[bool] = None,
        resolution_disputed: Optional[bool] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 50,
        skip: int = 0,
    ) -> Tuple[List[ReportAdminItemResponse], int]:
        """
        Retrieves paginated, filtered safety reports for administrative inspection.
        Enforces organization boundary, never leaks private reporter contact info.
        """
        user_scope = self.get_user_organization_scope(current_user, db)
        effective_org_id = user_scope or organization_id

        query = db.query(SafetyReport)

        if effective_org_id:
            query = query.filter(
                or_(
                    SafetyReport.assigned_organization_id == effective_org_id,
                    SafetyReport.id.in_(
                        db.query(IssueAssignment.report_id).filter(
                            IssueAssignment.organization_id == effective_org_id
                        )
                    ),
                )
            )

        if category:
            query = query.filter(func.lower(SafetyReport.category) == category.lower())
        if severity:
            query = query.filter(func.lower(SafetyReport.severity) == severity.lower())
        if verification_status:
            query = query.filter(SafetyReport.verification_status == verification_status.upper())
        if status_filter:
            query = query.filter(SafetyReport.status == status_filter.upper())
        if resolution_disputed is not None:
            if resolution_disputed:
                query = query.filter(
                    or_(
                        SafetyReport.status == "RESOLUTION_DISPUTED",
                        SafetyReport.reopen_requested == True,
                    )
                )
            else:
                query = query.filter(
                    SafetyReport.status != "RESOLUTION_DISPUTED",
                    SafetyReport.reopen_requested == False,
                )
        if is_assigned is not None:
            if is_assigned:
                query = query.filter(
                    or_(
                        SafetyReport.assigned_organization_id != None,
                        SafetyReport.id.in_(db.query(IssueAssignment.report_id)),
                    )
                )
            else:
                query = query.filter(
                    SafetyReport.assigned_organization_id == None,
                    ~SafetyReport.id.in_(db.query(IssueAssignment.report_id)),
                )
        if search:
            query = query.filter(
                or_(
                    SafetyReport.title.ilike(f"%{search}%"),
                    SafetyReport.description.ilike(f"%{search}%"),
                    SafetyReport.location_label.ilike(f"%{search}%"),
                )
            )

        total_count = query.count()

        # Sorting
        sort_col = getattr(SafetyReport, sort_by, SafetyReport.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

        reports = query.offset(skip).limit(limit).all()

        results = []
        for rep in reports:
            results.append(self._build_report_admin_item(rep, db))

        return results, total_count

    def get_report_by_id(
        self, current_user: User, report_id: UUID, db: Session
    ) -> ReportAdminItemResponse:
        """Retrieves single report detail for administrative inspection."""
        rep = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        user_scope = self.get_user_organization_scope(current_user, db)
        if user_scope:
            is_assigned_to_org = (
                rep.assigned_organization_id == user_scope
                or db.query(IssueAssignment)
                .filter(
                    IssueAssignment.report_id == rep.id,
                    IssueAssignment.organization_id == user_scope,
                )
                .first()
                is not None
            )
            # If not assigned to this org and unassigned, allowed to inspect for potential assignment
            # but if assigned to a different org, forbidden
            if rep.assigned_organization_id and rep.assigned_organization_id != user_scope:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Report is assigned to another organization.",
                )

        return self._build_report_admin_item(rep, db)

    # -----------------------------------------------------------------------
    # Report Verification & Moderation
    # -----------------------------------------------------------------------

    def moderate_report(
        self,
        current_user: User,
        report_id: UUID,
        action: str,
        reason: Optional[str],
        db: Session,
    ) -> ReportAdminItemResponse:
        """
        Authorized verification & moderation workflow:
        - VERIFY: Marks report VERIFIED
        - REJECT: Marks report REJECTED
        - FLAG_FOR_REVIEW: Sets UNDER_REVIEW & flagged_for_review = True
        """
        # Ensure user has admin privileges
        self.get_user_organization_scope(current_user, db)

        rep = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        action_clean = action.strip().upper()
        prev_status = rep.status
        prev_v_status = rep.verification_status

        if action_clean == "VERIFY":
            rep.verification_status = "VERIFIED"
            if rep.status == "REJECTED":
                rep.status = "OPEN"
            rep.flagged_for_review = False
            audit_action = "REPORT_VERIFIED"
        elif action_clean == "REJECT":
            rep.verification_status = "REJECTED"
            rep.status = "REJECTED"
            rep.flagged_for_review = False
            audit_action = "REPORT_REJECTED"
        elif action_clean in ["FLAG_FOR_REVIEW", "FLAG"]:
            rep.verification_status = "UNDER_REVIEW"
            rep.flagged_for_review = True
            audit_action = "REPORT_FLAGGED"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid moderation action '{action}'. Allowed: VERIFY, REJECT, FLAG_FOR_REVIEW",
            )

        # Record admin audit log
        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=rep.assigned_organization_id,
            action_type=audit_action,
            target_type="SAFETY_REPORT",
            target_id=rep.id,
            prev_status=prev_v_status,
            new_status=rep.verification_status,
            reason=reason or f"Action {action_clean} executed by {current_user.role}.",
        )

        # Also record in ReportAuditLog for Step 13 continuity
        report_audit = ReportAuditLog(
            report_id=rep.id,
            actor_id=current_user.id,
            action=audit_action,
            previous_status=prev_status,
            new_status=rep.status,
            previous_verification_status=prev_v_status,
            new_verification_status=rep.verification_status,
            reason=reason or f"Moderated by {current_user.role}.",
        )
        db.add(report_audit)

        db.commit()
        db.refresh(rep)

        return self._build_report_admin_item(rep, db)

    # -----------------------------------------------------------------------
    # Issue Assignment Workflow
    # -----------------------------------------------------------------------

    def create_assignment(
        self,
        current_user: User,
        payload: IssueAssignmentCreate,
        db: Session,
    ) -> IssueAssignmentResponse:
        """
        Assigns a safety report to a responsible organization and optional responder.
        """
        rep = db.query(SafetyReport).filter(SafetyReport.id == payload.report_id).first()
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        user_scope = self.get_user_organization_scope(current_user, db)
        org_id = payload.organization_id or user_scope
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID is required for assignment.",
            )

        self.verify_organization_access(current_user, org_id, db)

        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        # Check existing active assignment
        existing = (
            db.query(IssueAssignment)
            .filter(
                IssueAssignment.report_id == rep.id,
                IssueAssignment.organization_id == org.id,
                IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"]),
            )
            .first()
        )
        if existing:
            # Update existing assignment
            if payload.assigned_to_user_id:
                existing.assigned_to_user_id = payload.assigned_to_user_id
            if payload.priority:
                existing.priority = payload.priority.upper()
            if payload.action_description:
                existing.action_description = payload.action_description
            if payload.target_resolution_at:
                existing.target_resolution_at = payload.target_resolution_at
            assignment = existing
        else:
            assignment = IssueAssignment(
                report_id=rep.id,
                organization_id=org.id,
                assigned_to_user_id=payload.assigned_to_user_id,
                priority=payload.priority.upper() if payload.priority else "MEDIUM",
                status="ASSIGNED",
                action_description=payload.action_description,
                target_resolution_at=payload.target_resolution_at,
            )
            db.add(assignment)

        # Update report's assigned organization & status
        rep.assigned_organization_id = org.id
        if rep.status == "OPEN":
            rep.status = "IN_REVIEW"

        db.flush()

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=org.id,
            action_type="ISSUE_ASSIGNED",
            target_type="ISSUE_ASSIGNMENT",
            target_id=assignment.id,
            new_status=assignment.status,
            reason=f"Assigned to {org.name} with priority {assignment.priority}.",
        )

        db.commit()
        db.refresh(assignment)

        return self._build_assignment_response(assignment, db)

    def update_assignment(
        self,
        current_user: User,
        assignment_id: UUID,
        payload: IssueAssignmentUpdate,
        db: Session,
    ) -> IssueAssignmentResponse:
        """
        Updates priority, status (IN_PROGRESS, BLOCKED, COMPLETED), responder, or target date.
        """
        assignment = (
            db.query(IssueAssignment).filter(IssueAssignment.id == assignment_id).first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found."
            )

        self.verify_organization_access(current_user, assignment.organization_id, db)

        prev_status = assignment.status

        if payload.status:
            new_st = payload.status.upper()
            allowed = ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]
            if new_st not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid assignment status '{new_st}'. Allowed: {', '.join(allowed)}",
                )
            assignment.status = new_st
            if new_st == "IN_PROGRESS" and not assignment.started_at:
                assignment.started_at = datetime.now(timezone.utc)
            elif new_st in ["COMPLETED", "CANCELLED"]:
                assignment.completed_at = datetime.now(timezone.utc)

        if payload.priority:
            p_clean = payload.priority.upper()
            if p_clean not in ["LOW", "MEDIUM", "HIGH", "URGENT"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid priority '{p_clean}'. Allowed: LOW, MEDIUM, HIGH, URGENT",
                )
            assignment.priority = p_clean

        if payload.assigned_to_user_id is not None:
            assignment.assigned_to_user_id = payload.assigned_to_user_id

        if payload.action_description is not None:
            assignment.action_description = payload.action_description

        if payload.target_resolution_at is not None:
            assignment.target_resolution_at = payload.target_resolution_at

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=assignment.organization_id,
            action_type="ASSIGNMENT_UPDATED",
            target_type="ISSUE_ASSIGNMENT",
            target_id=assignment.id,
            prev_status=prev_status,
            new_status=assignment.status,
            reason=f"Assignment updated to status {assignment.status}, priority {assignment.priority}.",
        )

        db.commit()
        db.refresh(assignment)

        return self._build_assignment_response(assignment, db)

    def get_assignments(
        self,
        current_user: User,
        db: Session,
        status_filter: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[IssueAssignmentResponse]:
        """Lists assignments scoped to user's organization."""
        user_scope = self.get_user_organization_scope(current_user, db)

        query = db.query(IssueAssignment)
        if user_scope:
            query = query.filter(IssueAssignment.organization_id == user_scope)

        if status_filter:
            query = query.filter(IssueAssignment.status == status_filter.upper())
        if priority:
            query = query.filter(IssueAssignment.priority == priority.upper())

        assignments = (
            query.order_by(IssueAssignment.assigned_at.desc()).offset(skip).limit(limit).all()
        )
        return [self._build_assignment_response(a, db) for a in assignments]

    # -----------------------------------------------------------------------
    # Resolution Workflow
    # -----------------------------------------------------------------------

    def create_resolution(
        self,
        current_user: User,
        report_id: UUID,
        payload: IssueResolutionCreate,
        db: Session,
    ) -> IssueResolutionResponse:
        """
        Records official issue resolution.
        Marks report as RESOLVED, updates active assignment to COMPLETED.
        """
        rep = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        user_scope = self.get_user_organization_scope(current_user, db)
        org_id = rep.assigned_organization_id or user_scope
        if user_scope and org_id and user_scope != org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to resolve issues for another organization.",
            )

        resolution = IssueResolution(
            report_id=rep.id,
            assignment_id=payload.assignment_id,
            assigned_to_org_id=org_id,
            assigned_responder_id=current_user.id,
            status="RESOLVED",
            action_taken=payload.action_taken,
            resolution_notes=payload.resolution_notes,
            resolved_at=datetime.now(timezone.utc),
        )
        db.add(resolution)

        # Transition report to RESOLVED
        prev_status = rep.status
        rep.status = "RESOLVED"
        rep.reopen_requested = False
        rep.flagged_for_review = False

        # Mark active assignment completed
        if payload.assignment_id:
            asgn = (
                db.query(IssueAssignment)
                .filter(IssueAssignment.id == payload.assignment_id)
                .first()
            )
            if asgn:
                asgn.status = "COMPLETED"
                asgn.completed_at = datetime.now(timezone.utc)
        else:
            active_asgn = (
                db.query(IssueAssignment)
                .filter(
                    IssueAssignment.report_id == rep.id,
                    IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"]),
                )
                .first()
            )
            if active_asgn:
                active_asgn.status = "COMPLETED"
                active_asgn.completed_at = datetime.now(timezone.utc)

        db.flush()

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=org_id,
            action_type="ISSUE_RESOLVED",
            target_type="ISSUE_RESOLUTION",
            target_id=resolution.id,
            prev_status=prev_status,
            new_status="RESOLVED",
            reason=f"Action taken: {payload.action_taken}",
        )

        report_audit = ReportAuditLog(
            report_id=rep.id,
            actor_id=current_user.id,
            action="OFFICIALLY_RESOLVED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_verification_status=rep.verification_status,
            new_verification_status=rep.verification_status,
            reason=f"Resolved: {payload.action_taken}",
        )
        db.add(report_audit)

        db.commit()
        db.refresh(resolution)

        return self._build_resolution_response(resolution, db)

    def reopen_resolution(
        self,
        current_user: User,
        resolution_id: UUID,
        reason: str,
        db: Session,
    ) -> IssueResolutionResponse:
        """
        Reopens a resolved issue following community dispute or inspection.
        """
        resolution = (
            db.query(IssueResolution).filter(IssueResolution.id == resolution_id).first()
        )
        if not resolution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resolution record not found."
            )

        rep = db.query(SafetyReport).filter(SafetyReport.id == resolution.report_id).first()
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

        if resolution.assigned_to_org_id:
            self.verify_organization_access(current_user, resolution.assigned_to_org_id, db)

        prev_status = rep.status
        rep.status = "REOPENED"
        rep.reopen_requested = False
        rep.flagged_for_review = False

        resolution.status = "DISPUTED"
        if not resolution.resolution_notes:
            resolution.resolution_notes = f"Reopened: {reason}"
        else:
            resolution.resolution_notes += f" | Reopened: {reason}"

        # Reopen active assignment if any
        if resolution.assignment_id:
            asgn = (
                db.query(IssueAssignment)
                .filter(IssueAssignment.id == resolution.assignment_id)
                .first()
            )
            if asgn:
                asgn.status = "IN_PROGRESS"
                asgn.completed_at = None

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=resolution.assigned_to_org_id,
            action_type="RESOLUTION_REOPENED",
            target_type="SAFETY_REPORT",
            target_id=rep.id,
            prev_status=prev_status,
            new_status="REOPENED",
            reason=reason or "Authorized reopening following community dispute review.",
        )

        db.commit()
        db.refresh(resolution)

        return self._build_resolution_response(resolution, db)

    # -----------------------------------------------------------------------
    # Preventive Action Queue
    # -----------------------------------------------------------------------

    def get_action_queue(
        self, current_user: User, db: Session, limit: int = 50
    ) -> List[PreventiveActionQueueItemResponse]:
        """
        Generates a prioritized list of unresolved issues requiring preventive attention.
        Uses a documented, deterministic scoring algorithm:
        - Severity weight: HIGH = 30, MEDIUM = 20, LOW = 10
        - Verification state: VERIFIED = 20, UNDER_REVIEW = 10, PENDING = 0
        - Resolution dispute bonus: +35 if resolution disputed or reopen requested
        - Community signal bonus: +3 per confirmation (capped at +15)
        - Aging bonus: +1 point per 24h open (capped at +20)
        - Overdue bonus: +25 if target resolution date passed
        """
        user_scope = self.get_user_organization_scope(current_user, db)

        query = db.query(SafetyReport).filter(
            SafetyReport.status.in_(["OPEN", "IN_REVIEW", "RESOLUTION_DISPUTED", "REOPENED"])
        )
        if user_scope:
            query = query.filter(
                or_(
                    SafetyReport.assigned_organization_id == user_scope,
                    SafetyReport.id.in_(
                        db.query(IssueAssignment.report_id).filter(
                            IssueAssignment.organization_id == user_scope
                        )
                    ),
                    # If unassigned, allow organization admin to view local queue for claim
                    SafetyReport.assigned_organization_id == None,
                )
            )

        reports = query.limit(100).all()
        now = datetime.now(timezone.utc)
        items = []

        for rep in reports:
            score = 0.0

            # 1. Severity weight
            sev = (rep.severity or "").lower()
            if sev == "high":
                score += 30.0
            elif sev == "medium":
                score += 20.0
            else:
                score += 10.0

            # 2. Verification weight
            v_st = rep.verification_status or "PENDING"
            if v_st == "VERIFIED":
                score += 20.0
            elif v_st in ["UNDER_REVIEW", "COMMUNITY_SUPPORTED"]:
                score += 10.0

            # 3. Resolution dispute boost
            is_disp = rep.status == "RESOLUTION_DISPUTED" or rep.reopen_requested
            if is_disp:
                score += 35.0

            # 4. Community confirmations
            score += min(15.0, (rep.community_confirm_count or 0) * 3.0)

            # 5. Aging factor
            c_time = rep.created_at
            if c_time.tzinfo is None:
                c_time = c_time.replace(tzinfo=timezone.utc)
            age_days = max(0.0, (now - c_time).total_seconds() / 86400.0)
            score += min(20.0, age_days * 1.5)

            # Check assignment & target date
            assignment = (
                db.query(IssueAssignment)
                .filter(
                    IssueAssignment.report_id == rep.id,
                    IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"]),
                )
                .order_by(IssueAssignment.created_at.desc())
                .first()
            )

            asgn_st = assignment.status if assignment else "UNASSIGNED"
            asgn_org_name = (
                assignment.organization.name
                if assignment and assignment.organization
                else (rep.assigned_organization.name if rep.assigned_organization else None)
            )
            target_date = assignment.target_resolution_at if assignment else None

            is_overdue = False
            if target_date:
                t_date = target_date
                if t_date.tzinfo is None:
                    t_date = t_date.replace(tzinfo=timezone.utc)
                if now > t_date:
                    is_overdue = True
                    score += 25.0

            # Determine administrative priority band
            if score >= 65.0:
                p_level = "URGENT"
            elif score >= 45.0:
                p_level = "HIGH"
            elif score >= 25.0:
                p_level = "MEDIUM"
            else:
                p_level = "LOW"

            # Factual action reason
            reasons = []
            if is_disp:
                reasons.append("Resolution disputed by citizens")
            if is_overdue:
                reasons.append("Target resolution deadline passed")
            if v_st == "VERIFIED" and asgn_st == "UNASSIGNED":
                reasons.append("Verified hazard awaiting organizational dispatch")
            elif asgn_st == "IN_PROGRESS":
                reasons.append("Corrective work currently underway")
            elif not reasons:
                reasons.append(f"{rep.category.replace('_', ' ').capitalize()} reported in area")

            items.append(
                PreventiveActionQueueItemResponse(
                    report_id=rep.id,
                    category=rep.category,
                    title=rep.title,
                    location_label=rep.location_label,
                    latitude=rep.latitude,
                    longitude=rep.longitude,
                    reported_severity=rep.severity,
                    administrative_priority=p_level,
                    priority_score=round(score, 1),
                    verification_status=rep.verification_status,
                    lifecycle_status=rep.status,
                    assignment_status=asgn_st,
                    assigned_organization_name=asgn_org_name,
                    confirm_count=rep.community_confirm_count or 0,
                    dispute_count=rep.community_dispute_count or 0,
                    is_resolution_disputed=is_disp,
                    is_overdue=is_overdue,
                    age_days=round(age_days, 1),
                    target_resolution_at=target_date,
                    action_reason="; ".join(reasons),
                )
            )

        items.sort(key=lambda x: x.priority_score, reverse=True)
        return items[:limit]

    # -----------------------------------------------------------------------
    # Hotspots & Spatial Recurring Issues
    # -----------------------------------------------------------------------

    def get_hotspots(
        self,
        current_user: User,
        db: Session,
        radius_m: float = 300.0,
    ) -> List[AdminHotspotItemResponse]:
        """
        Identifies spatial report clusters of unresolved issues within radius_m.
        Distinguishes clusters from predictive models (truthful description).
        """
        user_scope = self.get_user_organization_scope(current_user, db)

        query = db.query(SafetyReport).filter(
            SafetyReport.status.in_(["OPEN", "IN_REVIEW", "RESOLUTION_DISPUTED", "REOPENED"])
        )
        if user_scope:
            query = query.filter(
                or_(
                    SafetyReport.assigned_organization_id == user_scope,
                    SafetyReport.id.in_(
                        db.query(IssueAssignment.report_id).filter(
                            IssueAssignment.organization_id == user_scope
                        )
                    ),
                    SafetyReport.assigned_organization_id == None,
                )
            )

        reports = query.limit(200).all()
        clusters: List[Dict[str, Any]] = []

        for rep in reports:
            matched = False
            for cl in clusters:
                dist = haversine_distance_m(rep.latitude, rep.longitude, cl["lat"], cl["lon"])
                if dist <= radius_m and cl["category"] == rep.category:
                    cl["reports"].append(rep)
                    # Update center of mass
                    n = len(cl["reports"])
                    cl["lat"] = ((cl["lat"] * (n - 1)) + rep.latitude) / n
                    cl["lon"] = ((cl["lon"] * (n - 1)) + rep.longitude) / n
                    matched = True
                    break
            if not matched:
                clusters.append({
                    "lat": rep.latitude,
                    "lon": rep.longitude,
                    "category": rep.category,
                    "reports": [rep],
                })

        # Keep clusters with 2 or more reports
        hotspots = []
        for idx, cl in enumerate(clusters):
            if len(cl["reports"]) >= 2:
                cat_name = cl["category"].replace("_", " ").title()
                hotspots.append(
                    AdminHotspotItemResponse(
                        id=f"hotspot-{idx + 1}",
                        center_latitude=round(cl["lat"], 6),
                        center_longitude=round(cl["lon"], 6),
                        radius_meters=radius_m,
                        category=cl["category"],
                        reports_count=len(cl["reports"]),
                        severity="HIGH" if len(cl["reports"]) >= 4 else "MEDIUM",
                        description=f"{len(cl['reports'])} recurring {cat_name} observations clustered within {int(radius_m)}m corridor.",
                        report_ids=[r.id for r in cl["reports"]],
                    )
                )

        return hotspots

    # -----------------------------------------------------------------------
    # Analytics
    # -----------------------------------------------------------------------

    def get_analytics(
        self,
        current_user: User,
        db: Session,
        target_org_id: Optional[UUID] = None,
    ) -> AdminAnalyticsResponse:
        """
        Calculates organizational and global analytics from actual database records.
        No hard-coded sample numbers.
        """
        user_scope = self.get_user_organization_scope(current_user, db)
        effective_org_id = user_scope or target_org_id

        # 1. Reports by category, verification_status, severity
        rep_query = db.query(SafetyReport)
        if effective_org_id:
            rep_query = rep_query.filter(
                or_(
                    SafetyReport.assigned_organization_id == effective_org_id,
                    SafetyReport.id.in_(
                        db.query(IssueAssignment.report_id).filter(
                            IssueAssignment.organization_id == effective_org_id
                        )
                    ),
                )
            )

        all_reports = rep_query.all()
        by_category: Dict[str, int] = {}
        by_v_status: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}

        for r in all_reports:
            cat = r.category or "other"
            by_category[cat] = by_category.get(cat, 0) + 1

            v_st = r.verification_status or "PENDING"
            by_v_status[v_st] = by_v_status.get(v_st, 0) + 1

            sev = (r.severity or "medium").upper()
            by_severity[sev] = by_severity.get(sev, 0) + 1

        # 2. Assignments by priority and status
        asgn_query = db.query(IssueAssignment)
        if effective_org_id:
            asgn_query = asgn_query.filter(IssueAssignment.organization_id == effective_org_id)

        all_asgns = asgn_query.all()
        by_priority: Dict[str, int] = {}
        by_status: Dict[str, int] = {}
        total_assignment_sec = 0.0
        asgn_count = 0

        for a in all_asgns:
            p = a.priority or "MEDIUM"
            by_priority[p] = by_priority.get(p, 0) + 1

            st = a.status or "ASSIGNED"
            by_status[st] = by_status.get(st, 0) + 1

            if a.assigned_at and a.report and a.report.created_at:
                a_time = a.assigned_at
                if a_time.tzinfo is None:
                    a_time = a_time.replace(tzinfo=timezone.utc)
                c_time = a.report.created_at
                if c_time.tzinfo is None:
                    c_time = c_time.replace(tzinfo=timezone.utc)
                diff = (a_time - c_time).total_seconds()
                if diff >= 0:
                    total_assignment_sec += diff
                    asgn_count += 1

        avg_asgn_hours = (
            round(total_assignment_sec / (asgn_count * 3600.0), 1) if asgn_count > 0 else None
        )

        # 3. Resolutions & resolution rate
        res_query = db.query(IssueResolution).join(
            SafetyReport, IssueResolution.report_id == SafetyReport.id
        )
        if effective_org_id:
            res_query = res_query.filter(IssueResolution.assigned_to_org_id == effective_org_id)

        all_res = res_query.all()
        total_res_sec = 0.0
        res_count = 0

        for res in all_res:
            if res.resolved_at and res.report and res.report.created_at:
                r_time = res.resolved_at
                if r_time.tzinfo is None:
                    r_time = r_time.replace(tzinfo=timezone.utc)
                c_time = res.report.created_at
                if c_time.tzinfo is None:
                    c_time = c_time.replace(tzinfo=timezone.utc)
                diff = (r_time - c_time).total_seconds()
                if diff >= 0:
                    total_res_sec += diff
                    res_count += 1

        avg_res_hours = (
            round(total_res_sec / (res_count * 3600.0), 1) if res_count > 0 else None
        )

        total_reps = len(all_reports)
        resolved_reps = sum(1 for r in all_reports if r.status == "RESOLVED")
        res_rate = round((resolved_reps / total_reps * 100.0), 1) if total_reps > 0 else 0.0

        # 4. Monthly trends (last 6 months)
        trends = []
        now = datetime.now(timezone.utc)
        for i in range(5, -1, -1):
            m_date = now - timedelta(days=i * 30)
            m_label = m_date.strftime("%b %Y")
            m_reps = sum(
                1 for r in all_reports
                if r.created_at and r.created_at.strftime("%b %Y") == m_label
            )
            m_resolved = sum(
                1 for r in all_reports
                if r.status == "RESOLVED" and r.created_at and r.created_at.strftime("%b %Y") == m_label
            )
            trends.append({
                "period": m_label,
                "total_reports": m_reps,
                "resolved_count": m_resolved,
            })

        # Total audits recorded
        audit_query = db.query(AdministrativeAuditLog)
        if effective_org_id:
            audit_query = audit_query.filter(AdministrativeAuditLog.organization_id == effective_org_id)
        total_audits = audit_query.count()

        return AdminAnalyticsResponse(
            reports_by_category=by_category,
            reports_by_verification_status=by_v_status,
            reports_by_severity=by_severity,
            assignments_by_priority=by_priority,
            assignments_by_status=by_status,
            resolution_rate_percent=res_rate,
            avg_assignment_hours=avg_asgn_hours,
            avg_resolution_hours=avg_res_hours,
            monthly_trends=trends,
            total_audits_recorded=total_audits,
        )

    # -----------------------------------------------------------------------
    # Organization Management (CRUD)
    # -----------------------------------------------------------------------

    def list_organizations(
        self, current_user: User, db: Session
    ) -> List[OrganizationDetailResponse]:
        """Lists organizations. System admins see all; Org admins see own."""
        user_scope = self.get_user_organization_scope(current_user, db)

        query = db.query(Organization)
        if user_scope:
            query = query.filter(Organization.id == user_scope)

        orgs = query.order_by(Organization.name.asc()).all()
        return [self._build_org_detail(org, db) for org in orgs]

    def get_organization_detail(
        self, current_user: User, org_id: UUID, db: Session
    ) -> OrganizationDetailResponse:
        """Retrieves organization profile."""
        self.verify_organization_access(current_user, org_id, db)
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return self._build_org_detail(org, db)

    def create_organization(
        self, current_user: User, payload: OrganizationCreate, db: Session
    ) -> OrganizationDetailResponse:
        """Creates a new organization (System Admin only)."""
        if current_user.role != "SYSTEM_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only System Administrators can register new organizations.",
            )

        org = Organization(
            name=payload.name,
            org_type=payload.org_type.upper(),
            description=payload.description,
            address=payload.address,
            latitude=payload.latitude,
            longitude=payload.longitude,
            domain=payload.domain,
            contact_email=payload.contact_email,
            contact_phone=payload.contact_phone,
            status="ACTIVE",
            is_verified=True,
        )
        db.add(org)
        db.flush()

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=org.id,
            action_type="ORGANIZATION_CREATED",
            target_type="ORGANIZATION",
            target_id=org.id,
            new_status="ACTIVE",
            reason=f"Registered organization {org.name} ({org.org_type}).",
        )

        db.commit()
        db.refresh(org)
        return self._build_org_detail(org, db)

    def update_organization(
        self,
        current_user: User,
        org_id: UUID,
        payload: OrganizationUpdate,
        db: Session,
    ) -> OrganizationDetailResponse:
        """Updates organization settings."""
        self.verify_organization_access(current_user, org_id, db)

        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        # Non-system admins cannot toggle verification or status to active/suspended freely
        if payload.status and current_user.role != "SYSTEM_ADMIN" and payload.status != org.status:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only System Administrators can alter organization operational status.",
            )

        for field, val in payload.model_dump(exclude_unset=True).items():
            setattr(org, field, val)

        self._record_admin_audit(
            db=db,
            actor_id=current_user.id,
            org_id=org.id,
            action_type="ORGANIZATION_UPDATED",
            target_type="ORGANIZATION",
            target_id=org.id,
            new_status=org.status,
            reason="Organization profile attributes updated.",
        )

        db.commit()
        db.refresh(org)
        return self._build_org_detail(org, db)

    def add_organization_member(
        self,
        current_user: User,
        org_id: UUID,
        payload: OrganizationMembershipCreate,
        db: Session,
    ) -> OrganizationMembershipResponse:
        """Adds a user to organization membership."""
        self.verify_organization_access(current_user, org_id, db)

        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

        target_user = db.query(User).filter(User.id == payload.user_id).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

        membership = (
            db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.user_id == target_user.id,
            )
            .first()
        )
        if membership:
            membership.role = payload.role.upper()
            membership.status = payload.status.upper()
        else:
            membership = OrganizationMembership(
                organization_id=org.id,
                user_id=target_user.id,
                role=payload.role.upper(),
                status=payload.status.upper(),
            )
            db.add(membership)

        target_user.organization_id = org.id
        if payload.role.upper() == "ADMIN":
            target_user.role = "ORGANIZATION_ADMIN"

        db.commit()
        db.refresh(membership)

        return OrganizationMembershipResponse(
            id=membership.id,
            organization_id=membership.organization_id,
            user_id=membership.user_id,
            user_name=target_user.full_name,
            user_email=target_user.email,
            role=membership.role,
            status=membership.status,
            created_at=membership.created_at,
        )

    # -----------------------------------------------------------------------
    # Audit Logs
    # -----------------------------------------------------------------------

    def get_audit_logs(
        self, current_user: User, db: Session, limit: int = 50, skip: int = 0
    ) -> List[AdministrativeAuditLogResponse]:
        """Retrieves administrative audit logs within permitted scope."""
        user_scope = self.get_user_organization_scope(current_user, db)

        query = db.query(AdministrativeAuditLog)
        if user_scope:
            query = query.filter(AdministrativeAuditLog.organization_id == user_scope)

        logs = (
            query.order_by(AdministrativeAuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        results = []
        for l in logs:
            actor_name = l.actor.full_name if l.actor else None
            org_name = l.organization.name if l.organization else None
            results.append(
                AdministrativeAuditLogResponse(
                    id=l.id,
                    actor_user_id=l.actor_user_id,
                    actor_name=actor_name,
                    organization_id=l.organization_id,
                    organization_name=org_name,
                    action_type=l.action_type,
                    target_type=l.target_type,
                    target_id=l.target_id,
                    previous_status=l.previous_status,
                    new_status=l.new_status,
                    reason=l.reason,
                    created_at=l.created_at,
                )
            )
        return results

    # -----------------------------------------------------------------------
    # Internal Serialization Builders
    # -----------------------------------------------------------------------

    def _build_report_admin_item(
        self, rep: SafetyReport, db: Session
    ) -> ReportAdminItemResponse:
        org_name = None
        if rep.assigned_organization:
            org_name = rep.assigned_organization.name
        elif rep.assigned_organization_id:
            org = db.query(Organization).filter(Organization.id == rep.assigned_organization_id).first()
            if org:
                org_name = org.name

        # Current active assignment
        asgn = (
            db.query(IssueAssignment)
            .filter(
                IssueAssignment.report_id == rep.id,
                IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"]),
            )
            .order_by(IssueAssignment.created_at.desc())
            .first()
        )
        asgn_resp = self._build_assignment_response(asgn, db) if asgn else None

        # Feedback counts
        feedbacks = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == rep.id,
                CommunityFeedback.status == "ACTIVE",
            )
            .all()
        )
        confirm_c = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_ISSUE")
        dispute_c = sum(
            1 for f in feedbacks
            if f.feedback_type in ["DISPUTE_ISSUE", "DUPLICATE_REPORT", "INACCURATE_LOCATION", "INACCURATE_CATEGORY"]
        )
        resolved_c = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_RESOLVED")
        still_c = sum(1 for f in feedbacks if f.feedback_type == "REPORT_STILL_PRESENT")

        audit_c = (
            db.query(ReportAuditLog).filter(ReportAuditLog.report_id == rep.id).count()
        )

        return ReportAdminItemResponse(
            id=rep.id,
            report_type=rep.report_type,
            category=rep.category,
            title=rep.title,
            description=rep.description,
            severity=rep.severity,
            latitude=rep.latitude,
            longitude=rep.longitude,
            location_label=rep.location_label,
            status=rep.status,
            verification_status=rep.verification_status,
            verification_count=rep.verification_count or 0,
            media_url=rep.media_url,
            media_type=rep.media_type,
            transcript=rep.transcript,
            created_at=rep.created_at,
            updated_at=rep.updated_at,
            assigned_organization_id=rep.assigned_organization_id,
            assigned_organization_name=org_name,
            current_assignment=asgn_resp,
            confirm_count=confirm_c,
            dispute_count=dispute_c,
            resolved_count=resolved_c,
            still_present_count=still_c,
            flagged_for_review=rep.flagged_for_review,
            reopen_requested=rep.reopen_requested,
            is_duplicate=rep.is_duplicate,
            duplicate_of_id=rep.duplicate_of_id,
            audit_events_count=audit_c,
        )

    def _build_assignment_response(
        self, asgn: IssueAssignment, db: Session
    ) -> IssueAssignmentResponse:
        org_name = asgn.organization.name if asgn.organization else None
        user_name = asgn.assigned_to_user.full_name if asgn.assigned_to_user else None
        return IssueAssignmentResponse(
            id=asgn.id,
            report_id=asgn.report_id,
            organization_id=asgn.organization_id,
            organization_name=org_name,
            assigned_to_user_id=asgn.assigned_to_user_id,
            assigned_to_user_name=user_name,
            priority=asgn.priority,
            status=asgn.status,
            action_description=asgn.action_description,
            target_resolution_at=asgn.target_resolution_at,
            assigned_at=asgn.assigned_at,
            started_at=asgn.started_at,
            completed_at=asgn.completed_at,
            created_at=asgn.created_at,
            updated_at=asgn.updated_at,
        )

    def _build_resolution_response(
        self, res: IssueResolution, db: Session
    ) -> IssueResolutionResponse:
        org_name = res.assigned_organization.name if res.assigned_organization else None
        responder_name = res.resolved_by_user.full_name if res.resolved_by_user else None
        return IssueResolutionResponse(
            id=res.id,
            report_id=res.report_id,
            assignment_id=res.assignment_id,
            assigned_to_org_id=res.assigned_to_org_id,
            organization_name=org_name,
            assigned_responder_id=res.assigned_responder_id,
            responder_name=responder_name,
            status=res.status,
            action_taken=res.action_taken,
            resolution_notes=res.resolution_notes,
            resolved_at=res.resolved_at,
            created_at=res.created_at,
        )

    def _build_org_detail(
        self, org: Organization, db: Session
    ) -> OrganizationDetailResponse:
        member_c = (
            db.query(OrganizationMembership)
            .filter(
                OrganizationMembership.organization_id == org.id,
                OrganizationMembership.status == "ACTIVE",
            )
            .count()
        )
        asgn_c = (
            db.query(IssueAssignment)
            .filter(
                IssueAssignment.organization_id == org.id,
                IssueAssignment.status.notin_(["COMPLETED", "CANCELLED"]),
            )
            .count()
        )
        return OrganizationDetailResponse(
            id=org.id,
            name=org.name,
            org_type=org.org_type,
            description=org.description,
            address=org.address,
            latitude=org.latitude,
            longitude=org.longitude,
            domain=org.domain,
            contact_email=org.contact_email,
            contact_phone=org.contact_phone,
            status=org.status,
            is_verified=org.is_verified,
            member_count=member_c,
            active_assignments_count=asgn_c,
            created_at=org.created_at,
            updated_at=org.updated_at,
        )

    def _record_admin_audit(
        self,
        db: Session,
        actor_id: Optional[UUID],
        org_id: Optional[UUID],
        action_type: str,
        target_type: str,
        target_id: Optional[UUID] = None,
        prev_status: Optional[str] = None,
        new_status: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> AdministrativeAuditLog:
        log = AdministrativeAuditLog(
            actor_user_id=actor_id,
            organization_id=org_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            previous_status=prev_status,
            new_status=new_status,
            reason=reason,
        )
        db.add(log)
        return log


admin_service = AdminService()
