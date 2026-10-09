import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables or .env file.
    """
    PROJECT_NAME: str = "SafeSphere"
    SERVICE_NAME: str = "SafeSphere API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql://safesphere_user:safesphere_password@localhost:5432/safesphere_db"

    # Google Gemini AI API Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TRANSCRIBE_MODEL: str = "gemini-3.5-transcribe"

    # File Storage Configuration (Multi-modal Voice & Image Evidence)
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    # Firebase Configuration (Authentication & FCM)
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_PROJECT_ID: str = "safesphere-app"

    # Guardian OTP / Notification Verification Service
    OTP_DEV_CODE: str = "123456"
    OTP_EXPIRY_MINUTES: int = 5
    OTP_EXPIRY_SECONDS: int = 300
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5
    OTP_DEV_MODE: bool = False  # Allowed in development/testing only; blocked in production

    # SMS Gateway Provider Configuration (Twilio, MSG91, etc.)
    SMS_PROVIDER: str = ""  # "twilio", "msg91", "dev", or ""
    SMS_PROVIDER_API_KEY: str = ""
    SMS_PROVIDER_SENDER: str = ""
    SMS_PROVIDER_ACCOUNT_SID: str = ""
    SMS_PROVIDER_AUTH_TOKEN: str = ""
    SMS_PROVIDER_FROM_NUMBER: str = ""
    SMS_PROVIDER_SERVICE_ID: str = ""
    SMS_PROVIDER_TEMPLATE_ID: str = ""

    # Email Gateway Provider Configuration (SMTP, Resend, SendGrid, etc.)
    EMAIL_PROVIDER: str = ""  # "smtp", "resend", "sendgrid", "dev", or ""
    EMAIL_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = "noreply@safesphere.app"
    EMAIL_FROM_NAME: str = "SafeSphere"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    # JWT / Dev token secret
    JWT_SECRET_KEY: str = "safesphere_dev_secret_key_change_in_production_32char"
    JWT_ALGORITHM: str = "HS256"

    @field_validator("OTP_DEV_MODE")
    def validate_otp_dev_mode(cls, v: bool, info) -> bool:
        env = str(info.data.get("ENVIRONMENT", "development")).strip().lower()
        if env == "production" and v is True:
            raise ValueError("Security violation: OTP_DEV_MODE cannot be enabled in production environment.")
        return v

    # Safety-Aware Routing Configuration (Step 10 & Professional Navigation)
    ROUTING_PROVIDER: str = "osrm"  # "osrm", "google", "openrouteservice", etc.
    ROUTING_BASE_URL: str = "https://router.project-osrm.org"
    ROUTING_API_KEY: str = ""
    GOOGLE_MAPS_ROUTES_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_ROUTES_API_KEY: str = ""
    ROUTING_TWO_WHEELER_URL: str = ""
    ALLOW_MOTORCYCLE_OSRM_CAR_FALLBACK: bool = True
    ROUTING_TIMEOUT_SECONDS: float = 15.0
    ROUTE_SAMPLE_INTERVAL_METERS: float = 250.0
    ROUTE_MAX_SAMPLE_POINTS: int = 50

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
