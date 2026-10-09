import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.help_point import HelpPoint
from app.services.map_seed import seed_dev_map_data

router = APIRouter()


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("/nearby")
def get_nearby_help_points(
    lat: float = Query(12.9716, ge=-90.0, le=90.0),
    lng: float = Query(77.5946, ge=-180.0, le=180.0),
    radius_meters: float = Query(5000.0, gt=0, le=100000.0),
    db: Session = Depends(get_db),
):
    """
    Finds nearest verified community help points and safe havens.
    Only returns verified records.
    """
    if db.query(HelpPoint).count() == 0:
        seed_dev_map_data(db)

    all_points = db.query(HelpPoint).filter(HelpPoint.is_verified.is_(True)).all()

    nearby = []
    for p in all_points:
        dist = haversine_distance_meters(lat, lng, p.latitude, p.longitude)
        if dist <= radius_meters:
            nearby.append(
                {
                    "id": str(p.id),
                    "name": p.name,
                    "type": p.point_type,
                    "category": p.category,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "address": p.address,
                    "phone": p.phone_number,
                    "distance_meters": round(dist, 1),
                    "is_24_hours": p.is_24_hours,
                    "is_verified": p.is_verified,
                }
            )

    nearby.sort(key=lambda x: x["distance_meters"])

    return {
        "status": "success",
        "coordinates": {"lat": lat, "lng": lng},
        "radius_meters": radius_meters,
        "count": len(nearby),
        "help_points": nearby,
    }
