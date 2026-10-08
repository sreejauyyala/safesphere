from fastapi import APIRouter

router = APIRouter()


@router.get("/score")
async def get_safety_pulse_score(lat: float = 0.0, lng: float = 0.0):
    return {
        "status": "placeholder",
        "coordinates": {"lat": lat, "lng": lng},
        "overall_score": 88.5,
        "risk_level": "low",
        "message": "Safety Pulse real-time scoring module placeholder ready."
    }


@router.get("/hotspots")
async def get_safety_hotspots():
    return {
        "status": "placeholder",
        "hotspots": [],
        "message": "Safety hotspot detection module placeholder ready."
    }
