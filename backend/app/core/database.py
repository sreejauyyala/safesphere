from typing import Generator, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Construct engine based on configured DATABASE_URL
# Support connection pooling and safe disconnection checks
connect_args = {}
if "postgresql" in settings.DATABASE_URL:
    connect_args["connect_timeout"] = 2

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy ORM models
Base = declarative_base()


def get_db() -> Generator:
    """
    FastAPI dependency yielding database session per request.
    Ensures safe session closure after request lifecycle.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Dict[str, Any]:
    """
    Verifies database connectivity without crashing application startup.
    Useful for health checks and container readiness probes.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"connected": True, "details": "Database connection verified successfully."}
    except Exception as e:
        return {
            "connected": False,
            "details": f"Database unreachable: {str(e)}",
            "hint": "Ensure PostgreSQL is running (e.g. docker-compose up -d postgres) and DATABASE_URL is correct."
        }
