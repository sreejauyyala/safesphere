from fastapi import APIRouter
from app.services.routing_service import routing_service

router = APIRouter()


@router.post("/start")
async def start_journey():
    return {
        "status": "placeholder",
        "message": "Journey initiation placeholder ready."
    }


@router.post("/ping")
async def ping_journey_location():
    return {
        "status": "placeholder",
        "message": "Journey telemetry ping placeholder ready."
    }


@router.post("/route-recommendation")
async def get_safe_route():
    # Demonstrating the routing abstraction in action
    demo_route = await routing_service.get_safety_optimized_route((12.9716, 77.5946), (12.9780, 77.6000))
    return {
        "status": "placeholder",
        "route": demo_route,
        "message": "Safety-aware routing recommendation placeholder ready."
    }
