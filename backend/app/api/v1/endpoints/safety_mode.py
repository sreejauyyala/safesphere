from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.safety_mode import (
    SafetyModeActivateRequest,
    SafetyModeEndRequest,
    SafetyModeSessionResponse,
    SafetyModeActiveDetailResponse,
    NearbyHelpPointItem,
)
from app.services.safety_mode_service import safety_mode_service

router = APIRouter()


@router.post("/activate", response_model=SafetyModeActiveDetailResponse, status_code=status.HTTP_201_CREATED)
async def activate_safety_mode(
    payload: SafetyModeActivateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Activates the "I Feel Unsafe" preventive safety mode.
    Connects to active journey if present, coordinates GPS telemetry, and discovers nearby help havens.
    """
    session = await safety_mode_service.activate(db, current_user, payload)
    return safety_mode_service.build_detail_response(
        db,
        current_user,
        session,
        current_lat=payload.latitude,
        current_lon=payload.longitude,
    )


@router.get("/current", response_model=Optional[SafetyModeActiveDetailResponse])
def get_current_safety_mode(
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the currently active Safety Mode session and available assistance.
    Returns 404 or null when no safety session is active.
    """
    session = safety_mode_service.get_current_session(db, current_user)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Safety Mode session is currently active for this account.",
        )

    return safety_mode_service.build_detail_response(
        db,
        current_user,
        session,
        current_lat=latitude,
        current_lon=longitude,
    )


@router.post("/{session_id}/end", response_model=SafetyModeSessionResponse)
async def end_safety_mode(
    session_id: UUID,
    payload: SafetyModeEndRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Gracefully deactivates an active Safety Mode session when the user is safe.
    Enforces ownership and safe idempotency.
    """
    return await safety_mode_service.end_session(db, current_user, session_id, payload)


@router.get("/history", response_model=List[SafetyModeSessionResponse])
def list_safety_mode_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists chronological safety mode session history for the authenticated user.
    """
    sessions = safety_mode_service.get_history(db, current_user, limit=limit)
    return [SafetyModeSessionResponse.model_validate(s) for s in sessions]


@router.get("/help-points/nearby", response_model=List[NearbyHelpPointItem])
def get_nearby_verified_help_points(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_m: float = Query(10000.0, ge=100.0, le=50000.0),
    limit: int = Query(8, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Finds verified physical safe havens (police stations, hospitals, security desks)
    within specified radius of coordinates.
    """
    return safety_mode_service.get_nearby_verified_help_points(
        db,
        latitude=latitude,
        longitude=longitude,
        radius_m=radius_m,
        limit=limit,
    )


@router.get("/{session_id}", response_model=SafetyModeSessionResponse)
def get_safety_mode_by_id(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves details for a specific safety mode session. Enforces strict ownership.
    """
    session = safety_mode_service.get_session_by_id(db, current_user, session_id)
    return SafetyModeSessionResponse.model_validate(session)
