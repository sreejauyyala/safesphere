from fastapi import APIRouter
from app.services.gemini_service import gemini_service

router = APIRouter()


@router.post("")
async def create_safety_report():
    return {
        "status": "placeholder",
        "message": "Incident report submission placeholder ready.",
        "gemini_service_linked": gemini_service.is_configured()
    }


@router.get("")
async def list_safety_reports():
    return {
        "status": "placeholder",
        "reports": [],
        "message": "Safety reports query placeholder ready."
    }
