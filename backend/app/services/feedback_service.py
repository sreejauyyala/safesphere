import logging
import math
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.safety_report import SafetyReport
from app.models.journey import Journey
from app.models.community_feedback import CommunityFeedback
from app.models.report_audit_log import ReportAuditLog
from app.schemas.community_feedback import (
    ReportVerificationFeedbackCreate,
    ReportResolutionFeedbackCreate,
    JourneyFeedbackCreate,
    GeneralFeedbackCreate,
    ReportCommunitySummaryResponse,
    ReportModerationRequest,
    CommunityFeedbackResponse,
    ReportAuditLogResponse,
)

logger = logging.getLogger("safesphere.feedback")


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes Haversine distance in meters between two coordinates."""
    r = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class FeedbackService:
    def submit_report_verification_feedback(
        self,
        db: Session,
        current_user: User,
        report_id: UUID,
        payload: ReportVerificationFeedbackCreate,
    ) -> Tuple[CommunityFeedback, ReportCommunitySummaryResponse]:
        """
        Submits community verification feedback for a safety report.
        Enforces one active response per user per report (updates existing if present).
        Updates community response counts and moderation review flags.
        Does NOT allow normal users to directly mark reports officially VERIFIED.
        """
        report = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety report not found.")

        valid_types = {
            "CONFIRM_ISSUE",
            "DISPUTE_ISSUE",
            "DUPLICATE_REPORT",
            "INACCURATE_LOCATION",
            "INACCURATE_CATEGORY",
            "GENERAL_FEEDBACK",
        }
        fb_type = payload.feedback_type.upper()
        if fb_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification feedback type '{payload.feedback_type}'.",
            )

        # Check for existing vote by this user on this report (One vote per user)
        existing_fb = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.user_id == current_user.id,
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == report.id,
            )
            .first()
        )

        prev_fb_type = existing_fb.feedback_type if existing_fb else None

        if existing_fb:
            existing_fb.feedback_type = fb_type
            existing_fb.response_value = payload.response_value or ("YES" if fb_type == "CONFIRM_ISSUE" else "NO")
            existing_fb.concern_category = payload.concern_category
            existing_fb.duplicate_of_report_id = payload.duplicate_of_report_id
            existing_fb.comment = payload.comment
            feedback_record = existing_fb
        else:
            feedback_record = CommunityFeedback(
                user_id=current_user.id,
                target_type="SAFETY_REPORT",
                target_id=report.id,
                feedback_type=fb_type,
                response_value=payload.response_value or ("YES" if fb_type == "CONFIRM_ISSUE" else "NO"),
                concern_category=payload.concern_category,
                duplicate_of_report_id=payload.duplicate_of_report_id,
                comment=payload.comment,
                status="ACTIVE",
            )
            db.add(feedback_record)

        db.flush()

        # Recalculate summary counts from active records
        feedbacks = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == report.id,
                CommunityFeedback.status == "ACTIVE",
            )
            .all()
        )

        confirm_count = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_ISSUE")
        dispute_count = sum(
            1 for f in feedbacks
            if f.feedback_type in ["DISPUTE_ISSUE", "DUPLICATE_REPORT", "INACCURATE_LOCATION", "INACCURATE_CATEGORY"]
        )

        report.community_confirm_count = confirm_count
        report.community_dispute_count = dispute_count

        # Status transition and review flagging logic
        audit_action = None
        audit_reason = None

        if fb_type in ["DISPUTE_ISSUE", "INACCURATE_LOCATION", "INACCURATE_CATEGORY"]:
            report.flagged_for_review = True
            audit_action = "COMMUNITY_DISPUTED"
            audit_reason = f"User disputed report accuracy: {payload.concern_category or 'general concern'}. Note: {payload.comment or 'None'}"
            if report.verification_status == "VERIFIED":
                # Verified report received credible dispute -> mark UNDER_REVIEW
                prev_v = report.verification_status
                report.verification_status = "UNDER_REVIEW"
                self._record_audit(
                    db,
                    report_id=report.id,
                    actor_id=current_user.id,
                    action="VERIFICATION_UNDER_REVIEW",
                    prev_status=report.status,
                    new_status=report.status,
                    prev_v_status=prev_v,
                    new_v_status="UNDER_REVIEW",
                    reason=f"Verified report flagged under review due to community dispute.",
                )

        elif fb_type == "DUPLICATE_REPORT":
            report.flagged_for_review = True
            report.is_duplicate = True
            if payload.duplicate_of_report_id:
                report.duplicate_of_id = payload.duplicate_of_report_id
            audit_action = "FLAGGED_DUPLICATE"
            audit_reason = f"Flagged as duplicate of report {payload.duplicate_of_report_id or 'nearby candidate'}."

        elif fb_type == "CONFIRM_ISSUE":
            audit_action = "COMMUNITY_CONFIRMED"
            audit_reason = "Community member independently observed the issue."
            # If report has reached threshold of confirmations and zero disputes, mark COMMUNITY_SUPPORTED
            if confirm_count >= 3 and dispute_count == 0 and report.verification_status == "PENDING":
                report.verification_status = "COMMUNITY_SUPPORTED"

        if audit_action:
            self._record_audit(
                db,
                report_id=report.id,
                actor_id=current_user.id,
                action=audit_action,
                prev_status=report.status,
                new_status=report.status,
                prev_v_status=report.verification_status,
                new_v_status=report.verification_status,
                reason=audit_reason,
            )

        db.commit()
        db.refresh(report)
        db.refresh(feedback_record)

        summary = self.get_report_community_summary(db=db, report_id=report.id, current_user=current_user)
        return feedback_record, summary

    def submit_report_resolution_feedback(
        self,
        db: Session,
        current_user: User,
        report_id: UUID,
        payload: ReportResolutionFeedbackCreate,
    ) -> Tuple[CommunityFeedback, ReportCommunitySummaryResponse]:
        """
        Submits resolution confirmation feedback for a report.
        If an issue marked RESOLVED is reported as STILL PRESENT, flags for reopening review.
        """
        report = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety report not found.")

        fb_type = payload.feedback_type.upper()
        if fb_type not in ["CONFIRM_RESOLVED", "REPORT_STILL_PRESENT"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid resolution feedback type '{payload.feedback_type}'. Allowed: CONFIRM_RESOLVED, REPORT_STILL_PRESENT.",
            )

        existing_fb = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.user_id == current_user.id,
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == report.id,
                CommunityFeedback.feedback_type.in_(["CONFIRM_RESOLVED", "REPORT_STILL_PRESENT"]),
            )
            .first()
        )

        if existing_fb:
            existing_fb.feedback_type = fb_type
            existing_fb.response_value = payload.response_value or fb_type
            existing_fb.comment = payload.comment
            feedback_record = existing_fb
        else:
            feedback_record = CommunityFeedback(
                user_id=current_user.id,
                target_type="SAFETY_REPORT",
                target_id=report.id,
                feedback_type=fb_type,
                response_value=payload.response_value or fb_type,
                comment=payload.comment,
                status="ACTIVE",
            )
            db.add(feedback_record)

        db.flush()

        # Recalculate resolved counts
        feedbacks = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == report.id,
                CommunityFeedback.status == "ACTIVE",
            )
            .all()
        )
        resolved_count = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_RESOLVED")
        still_present_count = sum(1 for f in feedbacks if f.feedback_type == "REPORT_STILL_PRESENT")

        report.community_resolved_count = resolved_count

        if fb_type == "REPORT_STILL_PRESENT":
            # Issue reported as still existing despite being resolved
            prev_status = report.status
            report.status = "RESOLUTION_DISPUTED"
            report.reopen_requested = True
            report.flagged_for_review = True
            self._record_audit(
                db,
                report_id=report.id,
                actor_id=current_user.id,
                action="RESOLUTION_DISPUTED",
                prev_status=prev_status,
                new_status="RESOLUTION_DISPUTED",
                prev_v_status=report.verification_status,
                new_v_status=report.verification_status,
                reason=f"Community reported issue is still present: {payload.comment or 'No comment provided.'}",
            )
        else:
            self._record_audit(
                db,
                report_id=report.id,
                actor_id=current_user.id,
                action="COMMUNITY_RESOLVED_CONFIRMED",
                prev_status=report.status,
                new_status=report.status,
                prev_v_status=report.verification_status,
                new_v_status=report.verification_status,
                reason="Community member confirmed the issue has been resolved.",
            )

        db.commit()
        db.refresh(report)
        db.refresh(feedback_record)

        summary = self.get_report_community_summary(db=db, report_id=report.id, current_user=current_user)
        return feedback_record, summary

    def get_report_community_summary(
        self,
        db: Session,
        report_id: UUID,
        current_user: Optional[User] = None,
    ) -> ReportCommunitySummaryResponse:
        """
        Retrieves aggregated community feedback counts and status flags for a safety report.
        Includes the requesting user's private active response if authenticated.
        """
        report = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety report not found.")

        feedbacks = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.target_type == "SAFETY_REPORT",
                CommunityFeedback.target_id == report.id,
                CommunityFeedback.status == "ACTIVE",
            )
            .all()
        )

        confirm_count = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_ISSUE")
        dispute_count = sum(
            1 for f in feedbacks
            if f.feedback_type in ["DISPUTE_ISSUE", "DUPLICATE_REPORT", "INACCURATE_LOCATION", "INACCURATE_CATEGORY"]
        )
        resolved_count = sum(1 for f in feedbacks if f.feedback_type == "CONFIRM_RESOLVED")
        still_present_count = sum(1 for f in feedbacks if f.feedback_type == "REPORT_STILL_PRESENT")

        user_fb = None
        if current_user:
            user_rec = next((f for f in feedbacks if f.user_id == current_user.id), None)
            if user_rec:
                user_fb = CommunityFeedbackResponse.model_validate(user_rec)

        audit_count = db.query(ReportAuditLog).filter(ReportAuditLog.report_id == report.id).count()

        return ReportCommunitySummaryResponse(
            report_id=report.id,
            status=report.status,
            verification_status=report.verification_status,
            confirm_count=confirm_count,
            dispute_count=dispute_count,
            resolved_count=resolved_count,
            still_present_count=still_present_count,
            total_responses=len(feedbacks),
            flagged_for_review=report.flagged_for_review,
            reopen_requested=report.reopen_requested,
            is_duplicate=report.is_duplicate,
            duplicate_of_id=report.duplicate_of_id,
            user_response=user_fb,
            audit_events_count=audit_count,
        )

    def moderate_report(
        self,
        db: Session,
        current_user: User,
        report_id: UUID,
        payload: ReportModerationRequest,
    ) -> Tuple[SafetyReport, ReportAuditLog]:
        """
        Authorized moderation workflow for report verification, dispute resolution, and reopening.
        Only accessible to authorized roles (SYSTEM_ADMIN, ORGANIZATION_ADMIN, ADMIN) or owner for resolution.
        """
        report = db.query(SafetyReport).filter(SafetyReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety report not found.")

        is_admin = current_user.role in ["SYSTEM_ADMIN", "ORGANIZATION_ADMIN", "ADMIN"]
        is_owner = (report.user_id == current_user.id)

        if not is_admin and not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to moderate this report.",
            )

        # Non-admins cannot alter verification status
        if payload.new_verification_status and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only authorized reviewers can set official verification status.",
            )

        prev_status = report.status
        prev_v_status = report.verification_status

        action = "MODERATION_UPDATE"

        if payload.new_status:
            status_clean = payload.new_status.upper()
            allowed_statuses = ["OPEN", "IN_REVIEW", "RESOLVED", "RESOLUTION_DISPUTED", "REOPENED", "REJECTED"]
            if status_clean not in allowed_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status '{status_clean}'. Allowed: {', '.join(allowed_statuses)}",
                )
            report.status = status_clean

            if status_clean == "RESOLVED":
                action = "OFFICIALLY_RESOLVED"
                report.flagged_for_review = False
                report.reopen_requested = False
            elif status_clean in ["REOPENED", "OPEN"]:
                action = "OFFICIALLY_REOPENED"
                report.reopen_requested = False
                report.flagged_for_review = False

        if payload.new_verification_status and is_admin:
            v_status_clean = payload.new_verification_status.upper()
            allowed_v = ["PENDING", "COMMUNITY_SUPPORTED", "UNDER_REVIEW", "VERIFIED", "DISPUTED", "REJECTED"]
            if v_status_clean not in allowed_v:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid verification_status '{v_status_clean}'. Allowed: {', '.join(allowed_v)}",
                )
            report.verification_status = v_status_clean
            if v_status_clean == "VERIFIED":
                action = "OFFICIALLY_VERIFIED"
                report.flagged_for_review = False
            elif v_status_clean == "REJECTED":
                action = "OFFICIALLY_REJECTED"
                report.status = "REJECTED"
                report.flagged_for_review = False

        audit_entry = self._record_audit(
            db,
            report_id=report.id,
            actor_id=current_user.id,
            action=action,
            prev_status=prev_status,
            new_status=report.status,
            prev_v_status=prev_v_status,
            new_v_status=report.verification_status,
            reason=payload.review_notes or f"Moderated by {current_user.role or 'user'}.",
        )

        db.commit()
        db.refresh(report)
        db.refresh(audit_entry)
        return report, audit_entry

    def submit_journey_feedback(
        self,
        db: Session,
        current_user: User,
        journey_id: UUID,
        payload: JourneyFeedbackCreate,
    ) -> CommunityFeedback:
        """
        Submits experience and safety information usefulness ratings for a completed journey.
        Strictly enforces journey ownership.
        """
        journey = db.query(Journey).filter(Journey.id == journey_id).first()
        if not journey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

        if journey.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot submit feedback for another user's journey.",
            )

        existing_fb = (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.user_id == current_user.id,
                CommunityFeedback.target_type == "JOURNEY",
                CommunityFeedback.target_id == journey.id,
            )
            .first()
        )

        if existing_fb:
            existing_fb.rating = payload.rating
            existing_fb.route_accuracy = payload.route_accuracy
            existing_fb.safety_info_usefulness = payload.safety_info_usefulness
            existing_fb.comment = payload.comment
            feedback_record = existing_fb
        else:
            feedback_record = CommunityFeedback(
                user_id=current_user.id,
                target_type="JOURNEY",
                target_id=journey.id,
                feedback_type="JOURNEY_EXPERIENCE",
                rating=payload.rating,
                route_accuracy=payload.route_accuracy,
                safety_info_usefulness=payload.safety_info_usefulness,
                comment=payload.comment,
                status="ACTIVE",
            )
            db.add(feedback_record)

        db.commit()
        db.refresh(feedback_record)
        return feedback_record

    def get_journey_feedback(
        self,
        db: Session,
        current_user: User,
        journey_id: UUID,
    ) -> Optional[CommunityFeedback]:
        """
        Retrieves user's private feedback for a specific journey.
        """
        journey = db.query(Journey).filter(Journey.id == journey_id).first()
        if not journey:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

        if journey.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot access feedback for another user's journey.",
            )

        return (
            db.query(CommunityFeedback)
            .filter(
                CommunityFeedback.user_id == current_user.id,
                CommunityFeedback.target_type == "JOURNEY",
                CommunityFeedback.target_id == journey.id,
            )
            .first()
        )

    def submit_general_feedback(
        self,
        db: Session,
        current_user: User,
        payload: GeneralFeedbackCreate,
    ) -> CommunityFeedback:
        """
        Submits general application / platform feedback.
        """
        target_id = payload.related_report_id or payload.related_journey_id

        feedback_record = CommunityFeedback(
            user_id=current_user.id,
            target_type="APPLICATION",
            target_id=target_id,
            feedback_type="GENERAL_FEEDBACK",
            rating=payload.rating,
            concern_category=payload.category,
            comment=payload.comment,
            status="ACTIVE",
        )
        db.add(feedback_record)
        db.commit()
        db.refresh(feedback_record)
        return feedback_record

    def get_user_feedback_history(
        self,
        db: Session,
        current_user: User,
        limit: int = 50,
        skip: int = 0,
    ) -> List[CommunityFeedback]:
        """
        Retrieves authenticated user's private feedback submission history.
        Enforces user ownership.
        """
        return (
            db.query(CommunityFeedback)
            .filter(CommunityFeedback.user_id == current_user.id)
            .order_by(CommunityFeedback.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_report_audit_logs(
        self,
        db: Session,
        report_id: UUID,
        limit: int = 50,
    ) -> List[ReportAuditLog]:
        """
        Retrieves audit trail for a safety report.
        """
        return (
            db.query(ReportAuditLog)
            .filter(ReportAuditLog.report_id == report_id)
            .order_by(ReportAuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def detect_potential_duplicates(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        category: str,
        exclude_report_id: Optional[UUID] = None,
        radius_meters: float = 150.0,
    ) -> List[SafetyReport]:
        """
        Deterministic duplicate detection rule:
        Finds open/active reports in the same category within radius_meters.
        """
        lat_delta = radius_meters / 111320.0
        lon_delta = radius_meters / (111320.0 * max(0.1, math.cos(math.radians(latitude))))

        query = (
            db.query(SafetyReport)
            .filter(
                func.lower(SafetyReport.category) == category.lower(),
                SafetyReport.status.in_(["OPEN", "IN_REVIEW", "RESOLUTION_DISPUTED", "REOPENED"]),
                SafetyReport.latitude.between(latitude - lat_delta, latitude + lat_delta),
                SafetyReport.longitude.between(longitude - lon_delta, longitude + lon_delta),
            )
        )
        if exclude_report_id:
            query = query.filter(SafetyReport.id != exclude_report_id)

        candidates = query.order_by(SafetyReport.created_at.desc()).limit(50).all()
        duplicates = []
        for cand in candidates:
            dist = haversine_distance_m(latitude, longitude, cand.latitude, cand.longitude)
            if dist <= radius_meters:
                duplicates.append(cand)
        return duplicates

    def _record_audit(
        self,
        db: Session,
        report_id: UUID,
        actor_id: Optional[UUID],
        action: str,
        prev_status: Optional[str] = None,
        new_status: Optional[str] = None,
        prev_v_status: Optional[str] = None,
        new_v_status: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> ReportAuditLog:
        audit_log = ReportAuditLog(
            report_id=report_id,
            actor_id=actor_id,
            action=action,
            previous_status=prev_status,
            new_status=new_status,
            previous_verification_status=prev_v_status,
            new_verification_status=new_v_status,
            reason=reason,
        )
        db.add(audit_log)
        return audit_log


feedback_service = FeedbackService()
