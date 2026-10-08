from fastapi import APIRouter
from app.schemas.health import HealthResponse, DetailedHealthResponse
from app.core.config import settings
from app.core.database import check_db_connection
from app.services.gemini_service import gemini_service
from app.services.notification_service import notification_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health():
    """
    Standard SafeSphere health-check probe.
    Returns status: ok and service: SafeSphere API.
    """
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME
    }


@router.get("/health/details", response_model=DetailedHealthResponse, tags=["Health"])
def get_health_details():
    """
    Comprehensive diagnostic health probe verifying database and integrations.
    """
    db_status = check_db_connection()
    return {
        "status": "ok" if db_status["connected"] else "degraded",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "gemini_ai_configured": gemini_service.is_configured(),
        "fcm_configured": notification_service.is_fcm_initialized()
    }
