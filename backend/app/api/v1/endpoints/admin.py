from fastapi import APIRouter

router = APIRouter()


@router.get("/overview")
async def get_admin_overview():
    return {
        "status": "placeholder",
        "active_users": 0,
        "open_incidents": 0,
        "resolved_incidents": 0,
        "hotspots_detected": 0,
        "message": "Admin dashboard overview placeholder ready."
    }


@router.get("/resolutions")
async def get_issue_resolutions():
    return {
        "status": "placeholder",
        "resolutions": [],
        "message": "Civic and incident issue resolution list placeholder ready."
    }
