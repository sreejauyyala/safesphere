from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.safety_pulse import (
    SafetyPulseResponse,
    SafetyPulseHistoryResponse,
)
from app.services.safety_pulse_service import safety_pulse_service

router = APIRouter()


@router.get(
    "",
    response_model=SafetyPulseResponse,
    summary="Calculate real-time Safety Pulse risk estimation for a location",
)
def get_safety_pulse(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="GPS latitude coordinate (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="GPS longitude coordinate (-180 to 180)"),
    radius: float = Query(500.0, ge=20.0, le=50000.0, description="Geographic assessment radius in meters"),
    time_context: Optional[str] = Query(
        None,
        description="Optional time of day context (morning, afternoon, evening, night)",
    ),
    db: Session = Depends(get_db),
):
    """
    Evaluates territorial safety intelligence and returns a deterministic 0-100 Safety Pulse score.
    Includes confidence indicators, data freshness, strongest contributing verified signals,
    and transparent calculation limitations.
    Returns status='insufficient_data' and score=null when no verified data exists.
    """
    if time_context and time_context.lower() not in ["morning", "afternoon", "evening", "night"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time_context. Must be one of: morning, afternoon, evening, night.",
        )

    try:
        return safety_pulse_service.calculate_safety_pulse(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius,
            time_context=time_context,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety Pulse calculation service is temporarily unavailable.",
        )


@router.get(
    "/history",
    response_model=SafetyPulseHistoryResponse,
    summary="Get historical Safety Pulse trends for a location",
)
def get_safety_pulse_history(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="GPS latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="GPS longitude"),
    radius: float = Query(500.0, ge=20.0, le=50000.0, description="Radius in meters"),
    time_range: str = Query("30d", description="Time range (7d, 30d, 90d)"),
    db: Session = Depends(get_db),
):
    """
    Returns empirical timeline snapshots of verified safety reports and resolution trends
    over the requested time range.
    """
    if time_range not in ["7d", "30d", "90d"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time_range. Supported ranges: 7d, 30d, 90d.",
        )

    try:
        return safety_pulse_service.get_safety_pulse_history(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius,
            time_range=time_range,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety Pulse history service is temporarily unavailable.",
        )


# Backward-compatible endpoints for earlier client stubs
@router.get("/score")
def legacy_safety_pulse_score(
    lat: float = Query(0.0, ge=-90.0, le=90.0),
    lng: float = Query(0.0, ge=-180.0, le=180.0),
    db: Session = Depends(get_db),
):
    return safety_pulse_service.calculate_safety_pulse(
        db=db,
        latitude=lat,
        longitude=lng,
        radius_meters=500.0,
    )


@router.get("/hotspots")
def legacy_safety_hotspots():
    return {
        "status": "active",
        "message": "Please use /api/v1/map/hotspots or /api/v1/safety-pulse for territorial intelligence.",
    }
