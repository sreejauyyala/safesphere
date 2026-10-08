from fastapi import APIRouter

router = APIRouter()


@router.get("/nearby")
async def get_nearby_help_points(lat: float = 0.0, lng: float = 0.0, radius_meters: float = 2000.0):
    return {
        "status": "placeholder",
        "coordinates": {"lat": lat, "lng": lng},
        "radius_meters": radius_meters,
        "help_points": [
            {
                "id": "e9b275bf-4074-4b59-9943-4e89e49cb3d0",
                "name": "Central Police Station",
                "category": "police",
                "latitude": lat + 0.005 if lat else 12.9750,
                "longitude": lng + 0.005 if lng else 77.5990,
                "address": "Civic Center Boulevard",
                "is_24_hours": True
            },
            {
                "id": "f10398da-b9fb-4d43-a64b-ffeb271e8da5",
                "name": "City General Hospital - ER",
                "category": "hospital",
                "latitude": lat - 0.004 if lat else 12.9680,
                "longitude": lng - 0.003 if lng else 77.5910,
                "address": "Health Avenue",
                "is_24_hours": True
            }
        ],
        "message": "Nearby help points query placeholder ready."
    }
