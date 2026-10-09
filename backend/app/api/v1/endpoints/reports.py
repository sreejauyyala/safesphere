import re
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from app.core.database import get_db
# pyrefly: ignore [missing-import]
from app.core.security import get_current_user, security_bearer, decode_token_payload
# pyrefly: ignore [missing-import]
from app.models.user import User
# pyrefly: ignore [missing-import]
from app.schemas.safety_report import (
    SafetyReportCreateRequest,
    SafetyReportResponse,
    SafetyReportPublicResponse,
)
# pyrefly: ignore [missing-import]
from app.schemas.ai_analysis import (
    AIAnalysisRequest,
    AIAnalysisEnvelope,
    AITranscriptionEnvelope,
    AIAudioAnalysisEnvelope,
    AIImageAnalysisEnvelope,
)
# pyrefly: ignore [missing-import]
from app.services.report_service import report_service
# pyrefly: ignore [missing-import]
from app.services.audio_service import audio_service
# pyrefly: ignore [missing-import]
from app.services.image_service import image_service
# pyrefly: ignore [missing-import]
from app.services.storage_service import IMAGES_DIR
# pyrefly: ignore [missing-import]
from app.services.feedback_service import feedback_service
# pyrefly: ignore [missing-import]
from app.schemas.community_feedback import (
    ReportVerificationFeedbackCreate,
    ReportResolutionFeedbackCreate,
    ReportCommunitySummaryResponse,
    ReportModerationRequest,
    ReportAuditLogResponse,
)

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AIAnalysisEnvelope,
    summary="Analyze report description with SafeSphere Gemini AI",
)
async def analyze_report(
    payload: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a natural-language safety observation for AI-assisted classification.
    Returns structured suggestion with category, severity, summary, signal, and confidence.
    Does NOT create or persist a report in the database.
    """
    result = await report_service.analyze_report_text(
        db=db,
        current_user=current_user,
        description=payload.description,
    )
    return result


@router.post(
    "/transcribe-audio",
    response_model=AITranscriptionEnvelope,
    summary="Transcribe voice recording for safety report",
)
async def transcribe_audio_endpoint(
    file: UploadFile = File(..., description="Audio recording file (WebM, WAV, MP4, MP3, OGG)"),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribes audio recording using SafeSphere Gemini speech processing.
    Temporary audio file is automatically deleted after processing.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio recording submitted.",
        )
    return await audio_service.transcribe_voice(
        file_bytes=file_bytes,
        content_type=file.content_type or "audio/webm",
        filename=file.filename,
    )


@router.post(
    "/analyze-audio",
    response_model=AIAudioAnalysisEnvelope,
    summary="Analyze voice report with SafeSphere Gemini AI",
)
async def analyze_audio_endpoint(
    file: UploadFile = File(..., description="Audio recording file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Transcribes voice recording and performs structured safety analysis.
    Does not persist a safety report until the user confirms and submits.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio recording submitted.",
        )
    return await audio_service.analyze_voice_report(
        db=db,
        current_user=current_user,
        file_bytes=file_bytes,
        content_type=file.content_type or "audio/webm",
        filename=file.filename,
    )


@router.post(
    "/analyze-image",
    response_model=AIImageAnalysisEnvelope,
    summary="Analyze image evidence with Gemini AI",
)
async def analyze_image_endpoint(
    file: UploadFile = File(..., description="Image evidence file (JPEG, PNG, WebP)"),
    description: Optional[str] = Form(None, description="Optional accompanying observation description"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyzes visual safety evidence with optional citizen text description.
    Stores photo securely and returns structured safety analysis.
    Does not persist a safety report until the user confirms and submits.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image file submitted.",
        )
    return await image_service.analyze_image_report(
        db=db,
        current_user=current_user,
        file_bytes=file_bytes,
        content_type=file.content_type or "image/jpeg",
        description=description,
        filename=file.filename,
    )


@router.get(
    "/media/images/{filename}",
    summary="Get private image evidence",
)
async def get_image_media(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """
    Serves stored safety report image evidence to authenticated users.
    Protects against path traversal attacks.
    """
    if not re.match(r"^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$", filename, re.IGNORECASE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image filename format.",
        )
    file_path = IMAGES_DIR / filename
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found.",
        )
    return FileResponse(path=str(file_path))



@router.post(
    "",
    response_model=SafetyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new safety report",
)
def create_report(
    payload: SafetyReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a factual safety observation or hazard report.
    Automatically assigns reporter ownership from authenticated identity.
    Initial status is set to OPEN and verification status to PENDING.
    Enforces duplicate protection within ~100m for identical categories within 15 minutes.
    """
    report = report_service.create_report(db=db, current_user=current_user, data=payload)
    return report


@router.get(
    "/me",
    response_model=List[SafetyReportResponse],
    summary="Get authenticated user's submitted reports",
)
def get_my_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns history of safety reports submitted by the currently logged-in user.
    """
    return report_service.get_user_reports(db=db, user_id=current_user.id, skip=skip, limit=limit)


@router.get(
    "/nearby",
    response_model=List[SafetyReportPublicResponse],
    summary="Get public safety reports near coordinates",
)
def get_nearby_reports(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_meters: float = Query(2000.0, ge=50.0, le=50000.0),
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Returns public-safe safety hazard reports within the specified radius.
    Never exposes reporter user_id or personal contact information.
    """
    return report_service.get_nearby_reports(
        db=db,
        lat=latitude,
        lon=longitude,
        radius_meters=radius_meters,
        category=category,
        severity=severity,
        status_val=status_filter,
        limit=limit,
    )


@router.get(
    "/{report_id}",
    summary="Get safety report details",
)
def get_report(
    report_id: UUID,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
):
    """
    Fetches details for a specific safety report.
    If requested by the owner, returns complete report response.
    If requested by public/other user, strips private identity fields.
    """
    report = report_service.get_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    # Check if user is authenticated and is owner
    is_owner = False
    if credentials:
        try:
            payload = decode_token_payload(credentials.credentials)
            firebase_uid = payload.get("user_id") or payload.get("uid") or payload.get("sub")
            if firebase_uid:
                current_user = db.query(User).filter(User.firebase_uid == str(firebase_uid)).first()
                if current_user and (current_user.id == report.user_id or current_user.role in ["SYSTEM_ADMIN", "ORGANIZATION_ADMIN"]):
                    is_owner = True
        except Exception:
            pass

    if is_owner:
        return SafetyReportResponse.model_validate(report)
    return SafetyReportPublicResponse.model_validate(report)


@router.delete(
    "/{report_id}",
    summary="Delete a report",
)
def delete_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows a user to delete their own submitted safety report.
    Returns 403 Forbidden if attempting to delete another user's report.
    """
    report = report_service.get_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    report_service.delete_report(db=db, report=report, current_user=current_user)
    return {
        "status": "success",
        "message": "Report deleted successfully.",
    }


@router.patch(
    "/{report_id}/status",
    summary="Update report verification and resolution status",
)
def update_report_status(
    report_id: UUID,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the status (OPEN, IN_REVIEW, RESOLVED, REJECTED) or verification_status
    (PENDING, VERIFIED, REJECTED) of a report.
    Allows report owners and admins to mark civic issues resolved.
    """
    report = report_service.get_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    # Allow owners or admins/responders
    is_owner = (current_user.id == report.user_id)
    is_admin = current_user.role in ["SYSTEM_ADMIN", "ORGANIZATION_ADMIN", "ADMIN"]
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this report status.",
        )

    allowed_statuses = ["OPEN", "IN_REVIEW", "RESOLVED", "RESOLUTION_DISPUTED", "REOPENED", "REJECTED"]
    allowed_v_statuses = ["PENDING", "COMMUNITY_SUPPORTED", "UNDER_REVIEW", "VERIFIED", "DISPUTED", "REJECTED"]

    prev_status = report.status
    prev_v_status = report.verification_status

    if "status" in payload and payload["status"]:
        new_status = str(payload["status"]).upper()
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{new_status}'. Allowed: {', '.join(allowed_statuses)}.",
            )
        report.status = new_status
        if new_status == "RESOLVED":
            report.flagged_for_review = False
            report.reopen_requested = False
        elif new_status in ["OPEN", "REOPENED"]:
            report.reopen_requested = False

    if "verification_status" in payload and payload["verification_status"]:
        new_v_status = str(payload["verification_status"]).upper()
        if new_v_status not in allowed_v_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification_status '{new_v_status}'. Allowed: {', '.join(allowed_v_statuses)}.",
            )
        report.verification_status = new_v_status
        if new_v_status in ["VERIFIED", "REJECTED"]:
            report.flagged_for_review = False

    # Record audit log
    # pyrefly: ignore [missing-import]
    from app.models.report_audit_log import ReportAuditLog
    audit_entry = ReportAuditLog(
        report_id=report.id,
        actor_id=current_user.id,
        action="STATUS_UPDATED",
        previous_status=prev_status,
        new_status=report.status,
        previous_verification_status=prev_v_status,
        new_verification_status=report.verification_status,
        reason=payload.get("reason") or "Direct status update by owner/admin.",
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(report)

    return SafetyReportResponse.model_validate(report)


@router.get(
    "/{report_id}/community-feedback",
    response_model=ReportCommunitySummaryResponse,
    summary="Get community verification summary and current user response for a report",
)
def get_report_community_feedback_endpoint(
    report_id: UUID,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated community confirmation, dispute, and resolution counts for a safety report.
    Includes the requesting user's private active response if authenticated.
    """
    current_user = None
    if credentials:
        try:
            token_payload = decode_token_payload(credentials.credentials)
            firebase_uid = token_payload.get("user_id") or token_payload.get("uid") or token_payload.get("sub")
            if firebase_uid:
                current_user = db.query(User).filter(User.firebase_uid == str(firebase_uid)).first()
        except Exception:
            pass

    return feedback_service.get_report_community_summary(
        db=db,
        report_id=report_id,
        current_user=current_user,
    )


@router.post(
    "/{report_id}/verification-feedback",
    response_model=ReportCommunitySummaryResponse,
    summary="Submit community observation or dispute feedback for a report",
)
def submit_verification_feedback_endpoint(
    report_id: UUID,
    payload: ReportVerificationFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits community verification observation (CONFIRM_ISSUE, DISPUTE_ISSUE, DUPLICATE_REPORT,
    INACCURATE_LOCATION, INACCURATE_CATEGORY).
    Enforces one vote per user (updates existing if present).
    """
    _, summary = feedback_service.submit_report_verification_feedback(
        db=db,
        current_user=current_user,
        report_id=report_id,
        payload=payload,
    )
    return summary


@router.post(
    "/{report_id}/resolution-feedback",
    response_model=ReportCommunitySummaryResponse,
    summary="Submit resolution confirmation or report still present feedback",
)
def submit_resolution_feedback_endpoint(
    report_id: UUID,
    payload: ReportResolutionFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits resolution feedback (CONFIRM_RESOLVED, REPORT_STILL_PRESENT).
    If reported as STILL PRESENT, sets RESOLUTION_DISPUTED and flags for reopening review.
    """
    _, summary = feedback_service.submit_report_resolution_feedback(
        db=db,
        current_user=current_user,
        report_id=report_id,
        payload=payload,
    )
    return summary


@router.post(
    "/{report_id}/moderate",
    response_model=ReportCommunitySummaryResponse,
    summary="Authorized moderation workflow for report verification, resolution, or reopening",
)
def moderate_report_endpoint(
    report_id: UUID,
    payload: ReportModerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authorized moderation endpoint for verification decisions, resolution confirmation, or reopening.
    Restricted to authorized roles (SYSTEM_ADMIN, ORGANIZATION_ADMIN, ADMIN).
    """
    report, _ = feedback_service.moderate_report(
        db=db,
        current_user=current_user,
        report_id=report_id,
        payload=payload,
    )
    return feedback_service.get_report_community_summary(db=db, report_id=report.id, current_user=current_user)


@router.get(
    "/{report_id}/audit-logs",
    response_model=List[ReportAuditLogResponse],
    summary="Get verification and resolution audit logs for a report",
)
def get_report_audit_logs_endpoint(
    report_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieves chronological audit trail of all verification, dispute, resolution, and reopening decisions.
    """
    return feedback_service.get_report_audit_logs(db=db, report_id=report_id, limit=limit)


@router.get(
    "/{report_id}/duplicates",
    response_model=List[SafetyReportPublicResponse],
    summary="Find potential duplicate reports nearby",
)
def find_potential_duplicates_endpoint(
    report_id: UUID,
    radius_meters: float = Query(150.0, ge=10.0, le=2000.0),
    db: Session = Depends(get_db),
):
    """
    Returns candidate duplicate reports in the same category within radius_meters.
    """
    report = report_service.get_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    candidates = feedback_service.detect_potential_duplicates(
        db=db,
        latitude=report.latitude,
        longitude=report.longitude,
        category=report.category,
        exclude_report_id=report.id,
        radius_meters=radius_meters,
    )
    return [SafetyReportPublicResponse.model_validate(c) for c in candidates]


