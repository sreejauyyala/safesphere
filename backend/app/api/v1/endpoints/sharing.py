import logging
import secrets
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.journey import Journey
from app.models.journey_sharing import JourneySharingSession
from app.schemas.journey_sharing import (
    ShareSessionCreateRequest,
    ShareSessionResponse,
    SharedJourneyPublicResponse,
)

logger = logging.getLogger("safesphere.sharing")
router = APIRouter()


@router.post("/sessions", response_model=ShareSessionResponse, status_code=status.HTTP_201_CREATED)
def create_sharing_session(
    payload: ShareSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a cryptographically secure, time-limited live sharing link for an active journey.
    """
    journey = db.query(Journey).filter(Journey.id == payload.journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot share another user's journey.")

    if journey.status not in ("ACTIVE", "PAUSED"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only share an active or paused journey.")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=payload.duration_hours)
    share_token = secrets.token_urlsafe(32)

    sharing_session = JourneySharingSession(
        user_id=current_user.id,
        journey_id=journey.id,
        share_token=share_token,
        recipient_contact_id=payload.recipient_contact_id,
        is_active=True,
        expires_at=expires_at,
    )
    db.add(sharing_session)
    db.commit()
    db.refresh(sharing_session)

    share_url = f"/shared-journey/{share_token}"

    return ShareSessionResponse(
        id=sharing_session.id,
        journey_id=sharing_session.journey_id,
        share_token=sharing_session.share_token,
        share_url=share_url,
        is_active=sharing_session.is_active,
        expires_at=sharing_session.expires_at,
        created_at=sharing_session.created_at,
    )


@router.get("/sessions/{token_or_id}", response_model=SharedJourneyPublicResponse)
def get_shared_journey(
    token_or_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieves live shared journey telemetry using a valid, non-expired sharing token or session UUID.
    Publicly accessible to authorized viewers possessing the cryptographically secure token.
    """
    now = datetime.now(timezone.utc)

    # Lookup by token first, then by UUID if token lookup fails
    session = (
        db.query(JourneySharingSession)
        .filter(JourneySharingSession.share_token == token_or_id)
        .first()
    )
    if not session:
        try:
            uuid_val = UUID(token_or_id)
            session = (
                db.query(JourneySharingSession)
                .filter(JourneySharingSession.id == uuid_val)
                .first()
            )
        except ValueError:
            pass

    if not session or not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared journey link has expired, was revoked, or does not exist.",
        )

    exp = session.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        session.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Shared journey link has expired.",
        )

    journey = db.query(Journey).filter(Journey.id == session.journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated journey not found.")

    user = db.query(User).filter(User.id == journey.user_id).first()
    user_name = user.full_name if user else "SafeSphere Traveler"

    is_stale = False
    if journey.last_location_update:
        last_update = journey.last_location_update
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        if now - last_update > timedelta(minutes=5):
            is_stale = True

    return SharedJourneyPublicResponse(
        journey_id=journey.id,
        user_name=user_name,
        destination_name=journey.destination_name,
        status=journey.status,
        started_at=journey.started_at,
        last_latitude=journey.last_latitude,
        last_longitude=journey.last_longitude,
        last_location_update=journey.last_location_update,
        is_location_stale=is_stale,
        distance_travelled=journey.distance_travelled,
        selected_route_id=journey.selected_route_id,
        route_geometry=journey.route_geometry,
        is_active=journey.status in ("ACTIVE", "PAUSED") and session.is_active,
        expires_at=session.expires_at,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
def revoke_sharing_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Immediately revokes an active journey sharing session.
    """
    session = db.query(JourneySharingSession).filter(JourneySharingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sharing session not found.")

    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot revoke another user's sharing session.")

    session.is_active = False
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "success", "message": "Journey sharing access successfully revoked."}
