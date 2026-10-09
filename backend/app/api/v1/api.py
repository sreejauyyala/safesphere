from fastapi import APIRouter
# pyrefly: ignore [missing-import]
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
    map as map_endpoint,
    reports,
    ai,
    routes,
    safety_mode,
    notifications,
    sharing,
)

api_router = APIRouter()

# Core & Health
api_router.include_router(health.router, tags=["Health"])

# Modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(reports.router, prefix="/reports", tags=["Safety Reports"])
api_router.include_router(ai.router, prefix="/ai", tags=["Gemini AI Intelligence"])
api_router.include_router(safety_reports.router, prefix="/safety-reports", tags=["Safety Reports (Legacy)"])

api_router.include_router(safety_pulse.router, prefix="/safety-pulse", tags=["Safety Pulse"])
api_router.include_router(journeys.router, prefix="/journeys", tags=["Journeys & Routing"])
api_router.include_router(trusted_contacts.router, prefix="/trusted-contacts", tags=["Trusted Circle"])
api_router.include_router(guardians.router, prefix="/guardians", tags=["Guardian Protection"])
api_router.include_router(sos.router, prefix="/sos", tags=["SOS Emergency"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notification Outbox"])
api_router.include_router(sharing.router, prefix="/sharing", tags=["Live Location Sharing"])
api_router.include_router(help_points.router, prefix="/help-points", tags=["Help Points"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & Hotspots"])
api_router.include_router(map_endpoint.router, prefix="/map", tags=["Safety Map Data"])
api_router.include_router(routes.router, prefix="/routes", tags=["Safety-Aware Routing"])
api_router.include_router(safety_mode.router, prefix="/safety-mode", tags=["Safety Mode (I Feel Unsafe)"])
