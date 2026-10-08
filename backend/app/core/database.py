import logging
from typing import Generator, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("safesphere.database")

Base = declarative_base()


def create_app_engine():
    """
    Creates the SQLAlchemy engine for SafeSphere.
    Prioritizes configured PostgreSQL DATABASE_URL.
    If PostgreSQL is offline during local development, falls back gracefully to
    local SQLite so developers can test identity and guardian flows immediately.
    """
    db_url = settings.DATABASE_URL
    connect_args = {}
    if "postgresql" in db_url:
        connect_args["connect_timeout"] = 2

    try:
        test_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args=connect_args
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to PostgreSQL database: {db_url}")
        return test_engine
    except Exception as e:
        if settings.ENVIRONMENT == "development" and "postgresql" in db_url:
            fallback_url = "sqlite:///./safesphere_dev.db"
            logger.warning(
                f"PostgreSQL unreachable ({e}). Using local development SQLite engine: {fallback_url}"
            )
            return create_engine(fallback_url, connect_args={"check_same_thread": False})
        return test_engine


engine = create_app_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """
    Initializes database tables from SQLAlchemy models.
    """
    try:
        # Import all models to ensure they are registered with Base metadata
        import app.models  # noqa
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema initialization warning: {e}")


# Initialize tables immediately
init_db()


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
        return {
            "connected": True,
            "engine": str(engine.url),
            "details": "Database connection verified successfully."
        }
    except Exception as e:
        return {
            "connected": False,
            "details": f"Database unreachable: {str(e)}",
            "hint": "Ensure PostgreSQL is running (e.g. docker-compose up -d postgres) and DATABASE_URL is correct."
        }
