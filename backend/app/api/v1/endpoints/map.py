import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.safety_report import SafetyReport
from app.models.help_point import HelpPoint
from app.models.hotspot import Hotspot
from app.schemas.map import (
    SafetyReportMapItem,
    HelpPointMapItem,
    HotspotMapItem,
    MapDataResponse,
)
from app.services.map_seed import seed_dev_map_data

router = APIRouter()


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters.
    """
    R = 6371000.0  # Earth's radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def ensure_map_data_seeded(db: Session):
    """
    Auto-seeds realistic development sample data if the map tables are empty.
    """
    if db.query(SafetyReport).count() == 0:
        seed_dev_map_data(db)


@router.get("/reports", response_model=List[SafetyReportMapItem])
def get_map_safety_reports(
    category: Optional[str] = Query(None, description="Filter by category (poor_lighting, road_damage, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    status: Optional[str] = Query(None, description="Filter by status (submitted, verified, etc.)"),
    verification_status: Optional[str] = Query(None, description="Filter by verification_status"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_meters: Optional[float] = Query(15000.0, gt=0, le=100000.0, description="Radius in meters"),
    db: Session = Depends(get_db),
):
    """
    Returns public-safe safety incident reports for map rendering.
    Excludes private reporter identity, contact details, or email.
    Supports category filtering and geographic proximity queries.
    """
    ensure_map_data_seeded(db)

    query = db.query(SafetyReport)

    if category and category != "all":
        query = query.filter(SafetyReport.category == category)
    if severity:
        query = query.filter(SafetyReport.severity == severity)
    if status:
        query = query.filter(SafetyReport.status == status)
    if verification_status:
        query = query.filter(SafetyReport.verification_status == verification_status)

    all_reports = query.order_by(SafetyReport.created_at.desc()).all()

    # Apply geographic filtering if coordinates are supplied
    if latitude is not None and longitude is not None and radius_meters is not None:
        filtered = []
        for r in all_reports:
            dist = haversine_distance_meters(latitude, longitude, r.latitude, r.longitude)
            if dist <= radius_meters:
                filtered.append(r)
        return filtered

    return all_reports


@router.get("/help-points", response_model=List[HelpPointMapItem])
def get_map_help_points(
    type: Optional[str] = Query(None, description="Filter by point_type (police_station, hospital, security_desk, etc.)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    verified_only: bool = Query(True, description="Only return verified help points"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_meters: Optional[float] = Query(15000.0, gt=0, le=100000.0),
    db: Session = Depends(get_db),
):
    """
    Returns verified community help points (Police stations, 24/7 hospitals, campus security desks).
    Enforces verified status check.
    """
    ensure_map_data_seeded(db)

    query = db.query(HelpPoint)

    if verified_only:
        query = query.filter(HelpPoint.is_verified.is_(True))

    if type and type != "all":
        query = query.filter(HelpPoint.point_type == type)

    if category:
        query = query.filter(HelpPoint.category == category)

    all_points = query.all()

    items = []
    for p in all_points:
        if latitude is not None and longitude is not None and radius_meters is not None:
            dist = haversine_distance_meters(latitude, longitude, p.latitude, p.longitude)
            if dist > radius_meters:
                continue

        items.append(
            HelpPointMapItem(
                id=p.id,
                name=p.name,
                type=p.point_type,
                category=p.category,
                latitude=p.latitude,
                longitude=p.longitude,
                address=p.address,
                phone=p.phone_number,
                verified=p.is_verified,
                is_24_hours=p.is_24_hours,
                created_at=p.created_at,
            )
        )

    return items


@router.get("/hotspots", response_model=List[HotspotMapItem])
def get_map_hotspots(
    level: Optional[str] = Query(None, description="Filter by level (low, moderate, elevated, higher)"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_meters: Optional[float] = Query(25000.0, gt=0),
    db: Session = Depends(get_db),
):
    """
    Returns safety concern hotspot cluster overlays for map visualization.
    Uses respectful public safety terminology.
    """
    ensure_map_data_seeded(db)

    query = db.query(Hotspot)
    if level:
        query = query.filter(Hotspot.level == level)

    all_hotspots = query.all()

    if latitude is not None and longitude is not None and radius_meters is not None:
        filtered = []
        for h in all_hotspots:
            dist = haversine_distance_meters(latitude, longitude, h.latitude, h.longitude)
            if dist <= radius_meters:
                filtered.append(h)
        return filtered

    return all_hotspots


@router.get("/data", response_model=MapDataResponse)
def get_consolidated_map_data(
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_meters: Optional[float] = Query(15000.0, gt=0),
    db: Session = Depends(get_db),
):
    """
    Consolidated query returning reports, verified help points, and hotspot overlays
    in a single roundtrip for maximum UI performance.
    """
    reports = get_map_safety_reports(
        category=None,
        severity=None,
        status=None,
        verification_status=None,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        db=db,
    )
    help_points = get_map_help_points(
        type=None,
        category=None,
        verified_only=True,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        db=db,
    )
    hotspots = get_map_hotspots(
        level=None,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        db=db,
    )

    return MapDataResponse(
        reports=reports,
        help_points=help_points,
        hotspots=hotspots,
    )
