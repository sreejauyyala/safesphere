import logging
from typing import Generator, Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
# pyrefly: ignore [missing-import]
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

        # Automatic schema migration check for safety_reports.location_label
        from sqlalchemy import inspect
        insp = inspect(engine)

        # Guardian table migrations (Email and Channel Verification)
        if "guardians" in insp.get_table_names():
            g_cols = [c["name"] for c in insp.get_columns("guardians")]
            guardian_migrations = [
                ("guardian_email", "VARCHAR(255)"),
                ("phone_verified", "BOOLEAN DEFAULT FALSE"),
                ("email_verified", "BOOLEAN DEFAULT FALSE"),
                ("verified_delivery_method", "VARCHAR(20)"),
            ]
            for col_name, col_type in guardian_migrations:
                if col_name not in g_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE guardians ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logger.info(f"Added missing {col_name} column to guardians table.")
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for guardians.{col_name}: {col_err}")

        # Guardian verification challenge table migrations (delivery_method & destination)
        if "guardian_verification_challenges" in insp.get_table_names():
            ch_cols = [c["name"] for c in insp.get_columns("guardian_verification_challenges")]
            ch_migrations = [
                ("delivery_method", "VARCHAR(20) DEFAULT 'sms'"),
                ("destination", "VARCHAR(255) DEFAULT ''"),
            ]
            for col_name, col_type in ch_migrations:
                if col_name not in ch_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE guardian_verification_challenges ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logger.info(f"Added missing {col_name} column to guardian_verification_challenges table.")
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for guardian_verification_challenges.{col_name}: {col_err}")
        if "safety_reports" in insp.get_table_names():
            columns = [c["name"] for c in insp.get_columns("safety_reports")]
            if "location_label" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE safety_reports ADD COLUMN location_label VARCHAR(255)"))
                    conn.commit()
                logger.info("Added missing location_label column to safety_reports table.")
            if "media_type" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE safety_reports ADD COLUMN media_type VARCHAR(50)"))
                    conn.commit()
                logger.info("Added missing media_type column to safety_reports table.")
            if "transcript" not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE safety_reports ADD COLUMN transcript TEXT"))
                    conn.commit()
                logger.info("Added missing transcript column to safety_reports table.")

        # Step 10: Automatic schema migration check for journeys table
        if "journeys" in insp.get_table_names():
            j_cols = [c["name"] for c in insp.get_columns("journeys")]
            journey_migrations = [
                ("selected_route_id", "VARCHAR(100)"),
                ("route_provider", "VARCHAR(50)"),
                ("route_geometry", "TEXT"),
                ("planned_distance_m", "FLOAT"),
                ("planned_duration_seconds", "FLOAT"),
                ("estimated_risk_level", "VARCHAR(30)"),
                ("route_data_coverage", "FLOAT"),
                ("route_assessed_at", "TIMESTAMP WITH TIME ZONE"),
            ]
            for col_name, col_type in journey_migrations:
                if col_name not in j_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE journeys ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for journeys.{col_name}: {col_err}")

        # Step 12: Automatic schema migration check for trusted_contacts table
        if "trusted_contacts" in insp.get_table_names():
            tc_cols = [c["name"] for c in insp.get_columns("trusted_contacts")]
            tc_migrations = [
                ("verification_status", "VARCHAR(50) DEFAULT 'PENDING'"),
                ("verification_code", "VARCHAR(20)"),
                ("notify_journey_start", "BOOLEAN DEFAULT TRUE"),
                ("notify_journey_end", "BOOLEAN DEFAULT TRUE"),
                ("notify_safety_mode", "BOOLEAN DEFAULT TRUE"),
                ("notify_sos", "BOOLEAN DEFAULT TRUE"),
                ("share_live_location", "BOOLEAN DEFAULT TRUE"),
                ("notify_emergency_updates", "BOOLEAN DEFAULT TRUE"),
            ]
            for col_name, col_type in tc_migrations:
                if col_name not in tc_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE trusted_contacts ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logger.info(f"Added missing {col_name} column to trusted_contacts table.")
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for trusted_contacts.{col_name}: {col_err}")

        # Step 13: Automatic schema migration check for safety_reports table
        if "safety_reports" in insp.get_table_names():
            r_cols = [c["name"] for c in insp.get_columns("safety_reports")]
            report_migrations = [
                ("community_confirm_count", "INTEGER DEFAULT 0"),
                ("community_dispute_count", "INTEGER DEFAULT 0"),
                ("community_resolved_count", "INTEGER DEFAULT 0"),
                ("is_duplicate", "BOOLEAN DEFAULT FALSE"),
                ("duplicate_of_id", "CHAR(36)"),
                ("flagged_for_review", "BOOLEAN DEFAULT FALSE"),
                ("reopen_requested", "BOOLEAN DEFAULT FALSE"),
                ("assigned_organization_id", "CHAR(36)"),
            ]
            for col_name, col_type in report_migrations:
                if col_name not in r_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE safety_reports ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logger.info(f"Added missing {col_name} column to safety_reports table.")
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for safety_reports.{col_name}: {col_err}")

        # Step 14: Automatic schema migration check for organizations & issue_resolutions
        if "organizations" in insp.get_table_names():
            org_cols = [c["name"] for c in insp.get_columns("organizations")]
            org_migrations = [
                ("description", "TEXT"),
                ("address", "VARCHAR(255)"),
                ("latitude", "FLOAT"),
                ("longitude", "FLOAT"),
                ("status", "VARCHAR(50) DEFAULT 'ACTIVE'"),
            ]
            for col_name, col_type in org_migrations:
                if col_name not in org_cols:
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        logger.info(f"Added missing {col_name} column to organizations table.")
                    except Exception as col_err:
                        logger.debug(f"Column migration notice for organizations.{col_name}: {col_err}")

        if "issue_resolutions" in insp.get_table_names():
            res_cols = [c["name"] for c in insp.get_columns("issue_resolutions")]
            if "assignment_id" not in res_cols:
                try:
                    with engine.connect() as conn:
                        conn.execute(text("ALTER TABLE issue_resolutions ADD COLUMN assignment_id CHAR(36)"))
                        conn.commit()
                    logger.info("Added missing assignment_id column to issue_resolutions table.")
                except Exception as col_err:
                    logger.debug(f"Column migration notice for issue_resolutions.assignment_id: {col_err}")

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
