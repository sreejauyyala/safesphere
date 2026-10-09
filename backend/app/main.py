from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.api.v1.api import api_router
# pyrefly: ignore [missing-import]
from app.middleware.logging import RequestLoggingMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SafeSphere 24/7 Community Safety Intelligence Network API Gateway",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Permitted CORS origins for local development and web frontend
raw_origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS if str(origin).strip() != "*"]
mandatory_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
for origin in mandatory_origins:
    if origin not in raw_origins:
        raw_origins.append(origin)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Outermost CORS middleware to intercept requests first and attach headers to all responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=raw_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to SafeSphere API",
        "version": settings.VERSION,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
