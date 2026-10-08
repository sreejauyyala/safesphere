from typing import Dict, Any, Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """
    Standard health check response schema required by SafeSphere specification.
    """
    status: str
    service: str


class DetailedHealthResponse(BaseModel):
    """
    Detailed system diagnostics including database connectivity and service statuses.
    """
    status: str
    service: str
    version: str
    environment: str
    database: Dict[str, Any]
    gemini_ai_configured: bool
    fcm_configured: bool
