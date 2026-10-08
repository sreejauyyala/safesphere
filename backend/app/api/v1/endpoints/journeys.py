from datetime import datetime, timezone
import math
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.journey import Journey, JourneyLocationPoint
from app.schemas.journey import (
    JourneyCreateRequest,
    JourneyLocationUpdateRequest,
    JourneyLocationPointResponse,
    JourneyResponse,
    JourneySummaryResponse,
)

router = APIRouter()


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 4)


@router.post("", response_model=JourneyResponse, status_code=status.HTTP_201_CREATED)
def create_journey(
    payload: JourneyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiates a new SafeSphere journey for the authenticated user.
    Enforces the single active journey constraint (prevents multiple active journeys).
    """
    existing_active = (
        db.query(Journey)
        .filter(
            Journey.user_id == current_user.id,
            Journey.status.in_(["ACTIVE", "PAUSED"]),
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active journey. Please pause, complete, or end it before starting a new one.",
        )

    now = datetime.now(timezone.utc)
    journey = Journey(
        user_id=current_user.id,
        destination_name=payload.destination_name.strip(),
        title=payload.title.strip() if payload.title else "Current Journey",
        start_latitude=payload.start_latitude,
        start_longitude=payload.start_longitude,
        destination_latitude=payload.destination_latitude,
        destination_longitude=payload.destination_longitude,
        status="ACTIVE",
        started_at=now,
        last_latitude=payload.start_latitude,
        last_longitude=payload.start_longitude,
        last_location_update=now,
        distance_travelled=0.0,
    )
    db.add(journey)
    db.flush()

    # Initial breadcrumb point
    initial_point = JourneyLocationPoint(
        journey_id=journey.id,
        latitude=payload.start_latitude,
        longitude=payload.start_longitude,
        accuracy=10.0,
        timestamp=now,
    )
    db.add(initial_point)
    db.commit()
    db.refresh(journey)

    return journey


@router.get("", response_model=List[JourneyResponse])
def get_user_journeys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the authenticated user's journey history, ordered by start time descending.
    """
    journeys = (
        db.query(Journey)
        .filter(Journey.user_id == current_user.id)
        .order_by(Journey.started_at.desc())
        .all()
    )
    return journeys


@router.get("/active", response_model=Optional[JourneyResponse])
def get_active_journey(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the user's currently active or paused journey, if one exists.
    """
    journey = (
        db.query(Journey)
        .filter(
            Journey.user_id == current_user.id,
            Journey.status.in_(["ACTIVE", "PAUSED"]),
        )
        .first()
    )
    return journey


@router.get("/{journey_id}", response_model=JourneyResponse)
def get_journey_by_id(
    journey_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves details for a specific journey.
    Strictly verifies ownership to prevent cross-user leakage.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found.",
        )
    if journey.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you cannot access another user's private journey data.",
        )
    return journey


@router.post("/{journey_id}/location", response_model=JourneyLocationPointResponse, status_code=status.HTTP_201_CREATED)
def record_journey_location(
    journey_id: UUID,
    payload: JourneyLocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Records a live GPS breadcrumb update for an active journey.
    Updates the journey's cumulative distance travelled and last known coordinates.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another user's journey.")

    if journey.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot record location points for a journey with status '{journey.status}'. Tracking must be ACTIVE.",
        )

    now = payload.timestamp or datetime.now(timezone.utc)
    point = JourneyLocationPoint(
        journey_id=journey.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
        timestamp=now,
    )
    db.add(point)

    # Calculate incremental distance from previous position
    if journey.last_latitude is not None and journey.last_longitude is not None:
        delta_km = calculate_haversine_distance_km(
            journey.last_latitude,
            journey.last_longitude,
            payload.latitude,
            payload.longitude,
        )
        # Avoid microscopic GPS jitter (< 3 meters = 0.003 km)
        if delta_km >= 0.003:
            journey.distance_travelled = round(journey.distance_travelled + delta_km, 3)

    journey.last_latitude = payload.latitude
    journey.last_longitude = payload.longitude
    journey.last_location_update = now

    db.commit()
    db.refresh(point)
    return point


@router.post("/{journey_id}/pause", response_model=JourneyResponse)
def pause_journey(
    journey_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pauses location tracking for an ongoing journey.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot pause another user's journey.")

    if journey.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause a journey that is currently in status '{journey.status}'.",
        )

    journey.status = "PAUSED"
    db.commit()
    db.refresh(journey)
    return journey


@router.post("/{journey_id}/resume", response_model=JourneyResponse)
def resume_journey(
    journey_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resumes location tracking for a paused journey.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot resume another user's journey.")

    if journey.status != "PAUSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume a journey that is not paused (current status: '{journey.status}').",
        )

    journey.status = "ACTIVE"
    db.commit()
    db.refresh(journey)
    return journey


@router.post("/{journey_id}/end", response_model=JourneySummaryResponse)
def end_journey(
    journey_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Completes and finalizes an active or paused journey.
    Calculates duration, seals status as COMPLETED, and returns summary metrics.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot end another user's journey.")

    now = datetime.now(timezone.utc)
    if journey.status != "COMPLETED":
        journey.status = "COMPLETED"
        journey.ended_at = now
        db.commit()
        db.refresh(journey)

    started = journey.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    ended = journey.ended_at or now
    if ended.tzinfo is None:
        ended = ended.replace(tzinfo=timezone.utc)

    duration_secs = (ended - started).total_seconds()
    duration_mins = max(1, int(round(duration_secs / 60.0)))

    points_count = db.query(JourneyLocationPoint).filter(JourneyLocationPoint.journey_id == journey.id).count()

    return JourneySummaryResponse(
        id=journey.id,
        destination_name=journey.destination_name,
        status="COMPLETED",
        duration_minutes=duration_mins,
        distance_travelled=round(journey.distance_travelled, 2),
        points_recorded=points_count,
    )


@router.get("/{journey_id}/locations", response_model=List[JourneyLocationPointResponse])
def get_journey_location_points(
    journey_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves all recorded breadcrumb points for a journey path.
    """
    journey = db.query(Journey).filter(Journey.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journey not found.")

    if journey.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view another user's location path.")

    points = (
        db.query(JourneyLocationPoint)
        .filter(JourneyLocationPoint.journey_id == journey.id)
        .order_by(JourneyLocationPoint.timestamp.asc())
        .all()
    )
    return points
