import logging
import secrets
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.journey import Journey
from app.models.journey_sharing import JourneySharingSession
from app.models.sos import SOSSession
from app.models.guardian import Guardian
from app.models.notification_log import NotificationLog
from app.schemas.sos import (
    SOSActivateRequest,
    SOSLocationUpdateRequest,
    SOSEndRequest,
    SOSRecipientNotificationItem,
    SOSSessionResponse,
)
from app.services.notification_service import notification_service

logger = logging.getLogger("safesphere.sos")
router = APIRouter()


def _format_sos_response(session: SOSSession, db: Session) -> SOSSessionResponse:
    now = datetime.now(timezone.utc)
    is_stale = False
    if session.last_location_update:
        last_update = session.last_location_update
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        if now - last_update > timedelta(minutes=5):
            is_stale = True

    # Retrieve notification dispatch logs for this SOS session
    logs = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.event_id == str(session.id),
            NotificationLog.event_type.in_(["SOS_ACTIVATED", "SOS_ENDED"])
        )
        .all()
    )

    notif_items = []
    for log in logs:
        loc_shared = False
        if log.message_content:
            loc_shared = ("(" in log.message_content and ")" in log.message_content) or ("/shared-journey/" in log.message_content)
        notif_items.append(
            SOSRecipientNotificationItem(
                recipient_id=log.recipient_id or "unknown",
                recipient_name=log.recipient_name or "Emergency Contact",
                recipient_type=log.recipient_type,
                delivery_status=log.delivery_status,
                channel=log.channel,
                attempted_at=log.attempted_at,
                error_message=log.error_message,
                location_shared=loc_shared,
            )
        )

    guardian_alerted = any(log.recipient_type == "GUARDIAN" for log in logs if log.event_type == "SOS_ACTIVATED")

    # Find active sharing session for this session or its journey
    sharing_url = None
    sharing_active = False
    if session.journey_id:
        sharing_session = (
            db.query(JourneySharingSession)
            .filter(
                JourneySharingSession.journey_id == session.journey_id,
                JourneySharingSession.is_active == True
            )
            .first()
        )
        if sharing_session:
            sharing_url = f"/shared-journey/{sharing_session.share_token}"
            sharing_active = True

    is_provider_ready = notification_service.is_sms_configured() or notification_service.is_fcm_configured()

    return SOSSessionResponse(
        id=session.id,
        user_id=session.user_id,
        journey_id=session.journey_id,
        status=session.status,
        activated_at=session.activated_at,
        ended_at=session.ended_at,
        initial_latitude=session.initial_latitude,
        initial_longitude=session.initial_longitude,
        latest_latitude=session.latest_latitude,
        latest_longitude=session.latest_longitude,
        last_location_update=session.last_location_update,
        accuracy=session.accuracy,
        is_location_stale=is_stale,
        emergency_notes=session.emergency_notes,
        deactivation_reason=session.deactivation_reason,
        guardian_alerted=guardian_alerted,
        notifications=notif_items,
        location_sharing_url=sharing_url,
        location_sharing_active=sharing_active,
        recipients_count=len(notif_items),
        provider_configured=is_provider_ready,
    )


@router.post("/activate", response_model=SOSSessionResponse, status_code=status.HTTP_201_CREATED)
async def activate_sos(
    payload: SOSActivateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Activates high-priority Emergency SOS.
    Captures live location, sets up scoped live location sharing,
    notifies authorized Trusted Circle contacts and verified Guardians,
    and returns immediate delivery outcomes.
    """
    now = datetime.now(timezone.utc)

    # 1. Idempotency: check if an active session already exists for this user
    existing_session = (
        db.query(SOSSession)
        .filter(
            SOSSession.user_id == current_user.id,
            SOSSession.status == "ACTIVE"
        )
        .first()
    )
    if existing_session:
        # Update coordinate if supplied
        if payload.latitude is not None and payload.longitude is not None:
            existing_session.latest_latitude = payload.latitude
            existing_session.latest_longitude = payload.longitude
            existing_session.accuracy = payload.accuracy
            existing_session.last_location_update = now
            if existing_session.journey_id:
                j = db.query(Journey).filter(Journey.id == existing_session.journey_id).first()
                if j:
                    j.last_latitude = payload.latitude
                    j.last_longitude = payload.longitude
                    j.last_location_update = now
            db.commit()
            db.refresh(existing_session)
        return _format_sos_response(existing_session, db)

    # 2. Link or create emergency journey for scoped live tracking
    journey_id = payload.journey_id
    if not journey_id:
        active_journey = (
            db.query(Journey)
            .filter(Journey.user_id == current_user.id, Journey.status == "ACTIVE")
            .first()
        )
        if active_journey:
            journey_id = active_journey.id
        else:
            emer_journey = Journey(
                user_id=current_user.id,
                destination_name="Emergency Assistance",
                title="Emergency SOS Live Track",
                start_latitude=payload.latitude if payload.latitude is not None else 0.0,
                start_longitude=payload.longitude if payload.longitude is not None else 0.0,
                last_latitude=payload.latitude,
                last_longitude=payload.longitude,
                last_location_update=now if payload.latitude is not None else None,
                status="ACTIVE",
                is_safe_mode_active=True,
            )
            db.add(emer_journey)
            db.flush()
            journey_id = emer_journey.id

    # 3. Create new SOS session
    session = SOSSession(
        user_id=current_user.id,
        journey_id=journey_id,
        status="ACTIVE",
        activated_at=now,
        initial_latitude=payload.latitude,
        initial_longitude=payload.longitude,
        latest_latitude=payload.latitude,
        latest_longitude=payload.longitude,
        last_location_update=now if payload.latitude is not None else None,
        accuracy=payload.accuracy,
        emergency_notes=payload.emergency_notes,
    )
    db.add(session)
    db.flush()

    # 4. Create cryptographically secure, time-limited sharing session scoped for this emergency
    share_token = secrets.token_urlsafe(32)
    sharing_session = JourneySharingSession(
        user_id=current_user.id,
        journey_id=journey_id,
        share_token=share_token,
        is_active=True,
        expires_at=now + timedelta(hours=4),
    )
    db.add(sharing_session)
    db.flush()
    sharing_url = f"/shared-journey/{share_token}"

    # 5. Dispatch urgent emergency alerts
    await notification_service.notify_sos_activated(
        sos_session=session,
        user=current_user,
        db=db,
        latitude=payload.latitude,
        longitude=payload.longitude,
        notes=payload.emergency_notes,
        sharing_url=sharing_url,
    )
    db.commit()
    db.refresh(session)

    return _format_sos_response(session, db)


@router.get("/current", response_model=Optional[SOSSessionResponse])
def get_current_sos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the currently active SOS emergency session for the user, if one exists.
    """
    session = (
        db.query(SOSSession)
        .filter(
            SOSSession.user_id == current_user.id,
            SOSSession.status == "ACTIVE"
        )
        .first()
    )
    if not session:
        return None
    return _format_sos_response(session, db)


@router.get("/history", response_model=List[SOSSessionResponse])
def get_sos_history(
    limit: int = 15,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns private audit history of past SOS sessions for the authenticated user.
    """
    sessions = (
        db.query(SOSSession)
        .filter(SOSSession.user_id == current_user.id)
        .order_by(SOSSession.activated_at.desc())
        .limit(max(1, min(50, limit)))
        .all()
    )
    return [_format_sos_response(s, db) for s in sessions]


@router.post("/{session_id}/location", response_model=SOSSessionResponse)
def update_sos_location(
    session_id: UUID,
    payload: SOSLocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Appends foreground live GPS location update to active SOS session.
    Also synchronizes location on the linked journey for live sharing viewers.
    """
    session = db.query(SOSSession).filter(SOSSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS session not found.")

    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another user's SOS session.")

    if session.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SOS session is already ended.")

    now = datetime.now(timezone.utc)
    session.latest_latitude = payload.latitude
    session.latest_longitude = payload.longitude
    session.accuracy = payload.accuracy
    session.last_location_update = now

    if session.journey_id:
        journey = db.query(Journey).filter(Journey.id == session.journey_id).first()
        if journey:
            journey.last_latitude = payload.latitude
            journey.last_longitude = payload.longitude
            journey.last_location_update = now

    db.commit()
    db.refresh(session)
    return _format_sos_response(session, db)


@router.post("/{session_id}/end", response_model=SOSSessionResponse)
async def end_sos(
    session_id: UUID,
    payload: SOSEndRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Terminates the active SOS emergency session and dispatches resolution status.
    Revokes temporary live location sharing access.
    Does NOT terminate an independently active journey.
    """
    session = db.query(SOSSession).filter(SOSSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS session not found.")

    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot end another user's SOS session.")

    now = datetime.now(timezone.utc)
    if session.status == "ACTIVE":
        session.status = "ENDED"
        session.ended_at = now
        session.deactivation_reason = payload.deactivation_reason

        # Revoke temporary live-sharing access
        if session.journey_id:
            sharing_sessions = (
                db.query(JourneySharingSession)
                .filter(
                    JourneySharingSession.journey_id == session.journey_id,
                    JourneySharingSession.is_active == True
                )
                .all()
            )
            for ss in sharing_sessions:
                ss.is_active = False
                ss.revoked_at = now

            # If the journey was an emergency-only journey, mark it completed
            journey = db.query(Journey).filter(Journey.id == session.journey_id).first()
            if journey and journey.destination_name == "Emergency Assistance":
                journey.status = "COMPLETED"
                journey.ended_at = now

        db.commit()
        db.refresh(session)

        # Dispatch resolution notifications
        await notification_service.notify_sos_ended(
            sos_session=session,
            user=current_user,
            db=db,
            reason=payload.deactivation_reason
        )
        db.commit()
        db.refresh(session)

    return _format_sos_response(session, db)


# Legacy Route Aliases
@router.post("/trigger")
async def trigger_emergency_sos_legacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy alias redirecting to activate_sos"""
    return await activate_sos(
        payload=SOSActivateRequest(emergency_notes="Immediate panic trigger"),
        current_user=current_user,
        db=db,
    )


@router.post("/cancel")
async def cancel_emergency_sos_legacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy alias cancelling active SOS"""
    active = (
        db.query(SOSSession)
        .filter(SOSSession.user_id == current_user.id, SOSSession.status == "ACTIVE")
        .first()
    )
    if active:
        return await end_sos(
            session_id=active.id,
            payload=SOSEndRequest(deactivation_reason="Cancelled"),
            current_user=current_user,
            db=db,
        )
    return {"status": "none_active", "message": "No active SOS session to cancel."}
