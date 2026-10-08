from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    users,
    safety_reports,
    safety_pulse,
    journeys,
    trusted_contacts,
    guardians,
    sos,
    help_points,
    feedback,
    organizations,
    admin,
)

api_router = APIRouter()

# Core & Health
api_router.include_router(health.router, tags=["Health"])

# Modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(safety_reports.router, prefix="/safety-reports", tags=["Safety Reports"])
api_router.include_router(safety_pulse.router, prefix="/safety-pulse", tags=["Safety Pulse"])
api_router.include_router(journeys.router, prefix="/journeys", tags=["Journeys & Routing"])
api_router.include_router(trusted_contacts.router, prefix="/trusted-contacts", tags=["Trusted Circle"])
api_router.include_router(guardians.router, prefix="/guardians", tags=["Guardian Protection"])
api_router.include_router(sos.router, prefix="/sos", tags=["SOS Emergency"])
api_router.include_router(help_points.router, prefix="/help-points", tags=["Help Points"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & Hotspots"])
