import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.safety_report import SafetyReport
from app.models.safety_report_ai_analysis import SafetyReportAIAnalysis
from app.models.user import User
from app.schemas.safety_report import (
    SafetyReportCreateRequest,
    CATEGORY_LABEL_MAP,
)
from app.services.gemini_service import gemini_service


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two GPS coordinates in meters.
    """
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class ReportService:
    @staticmethod
    def check_duplicate(
        db: Session,
        user_id: UUID,
        category: str,
        lat: float,
        lon: float,
        interval_minutes: int = 15,
        max_distance_meters: float = 100.0,
    ) -> Optional[SafetyReport]:
        """
        Detects if the same user recently submitted a report of the same category
        within a short time interval at nearly the same location.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=interval_minutes)
        recent_candidates = (
            db.query(SafetyReport)
            .filter(
                SafetyReport.user_id == user_id,
                SafetyReport.category == category,
                SafetyReport.created_at >= cutoff,
            )
            .all()
        )

        for candidate in recent_candidates:
            dist = calculate_haversine_distance(lat, lon, candidate.latitude, candidate.longitude)
            if dist <= max_distance_meters:
                return candidate
        return None

    @classmethod
    def create_report(
        cls,
        db: Session,
        current_user: User,
        data: SafetyReportCreateRequest,
    ) -> SafetyReport:
        """
        Creates a new safety report attributed to the authenticated user.
        Enforces duplicate detection, coordinate bounds, and initial PENDING status.
        """
        # 1. Duplicate check
        duplicate = cls.check_duplicate(
            db=db,
            user_id=current_user.id,
            category=data.category,
            lat=data.latitude,
            lon=data.longitude,
            interval_minutes=15,
            max_distance_meters=100.0,
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "You recently submitted a similar report for this location.",
                    "existing_report_id": str(duplicate.id),
                },
            )

        # 2. Derive title if omitted
        title = data.title.strip() if data.title and data.title.strip() else CATEGORY_LABEL_MAP.get(data.category, "Safety Concern")

        # 3. Create report
        report = SafetyReport(
            user_id=current_user.id,
            report_type=data.report_type or "text",
            category=data.category,
            title=title,
            description=data.description.strip(),
            severity=data.severity.upper(),
            latitude=data.latitude,
            longitude=data.longitude,
            location_label=data.location_label.strip() if data.location_label else None,
            media_url=data.media_url,
            media_type=data.media_type,
            transcript=data.transcript,
            status="OPEN",
            verification_status="PENDING",
            verification_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_user_reports(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[SafetyReport]:
        """
        Retrieves historical reports submitted by the given user.
        """
        return (
            db.query(SafetyReport)
            .filter(SafetyReport.user_id == user_id)
            .order_by(SafetyReport.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_report_by_id(db: Session, report_id: UUID) -> Optional[SafetyReport]:
        """
        Retrieves a single safety report by primary key.
        """
        return db.query(SafetyReport).filter(SafetyReport.id == report_id).first()

    @staticmethod
    def delete_report(db: Session, report: SafetyReport, current_user: User) -> None:
        """
        Deletes a report with strict ownership validation.
        """
        if report.user_id != current_user.id and current_user.role not in ["SYSTEM_ADMIN", "ORGANIZATION_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this report.",
            )

        db.delete(report)
        db.commit()

    @staticmethod
    def get_nearby_reports(
        db: Session,
        lat: float,
        lon: float,
        radius_meters: float = 2000.0,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        status_val: Optional[str] = None,
        limit: int = 50,
    ) -> List[SafetyReport]:
        """
        Finds reports within radius_meters using Haversine distance.
        """
        query = db.query(SafetyReport)
        if category:
            query = query.filter(SafetyReport.category == category.lower())
        if severity:
            query = query.filter(SafetyReport.severity == severity.upper())
        if status_val:
            query = query.filter(SafetyReport.status == status_val.upper())

        candidates = query.order_by(SafetyReport.created_at.desc()).limit(150).all()

        results = []
        for r in candidates:
            dist = calculate_haversine_distance(lat, lon, r.latitude, r.longitude)
            if dist <= radius_meters:
                results.append(r)
                if len(results) >= limit:
                    break
        return results

    @staticmethod
    async def analyze_report_text(
        db: Session,
        current_user: User,
        description: str,
        location_context: Optional[dict] = None,
    ) -> dict:
        """
        Coordinates AI safety observation classification via GeminiService.
        Logs an audit analysis record if successful, but never saves a safety report
        until the user reviews and explicitly submits.
        """
        result = await gemini_service.analyze_safety_text(
            text=description,
            location_context=location_context,
        )

        if result.get("success") and result.get("analysis"):
            try:
                analysis_data = result["analysis"]
                ai_record = SafetyReportAIAnalysis(
                    user_id=current_user.id,
                    report_id=None,
                    input_text=description.strip(),
                    suggested_category=analysis_data.get("category", "other"),
                    suggested_severity=analysis_data.get("severity", "medium"),
                    summary=analysis_data.get("summary", ""),
                    safety_signal=analysis_data.get("safety_signal", "general_safety"),
                    confidence=float(analysis_data.get("confidence", 0.5)),
                    suggested_action=analysis_data.get("suggested_action"),
                    model_name=gemini_service.model_name,
                )
                db.add(ai_record)
                db.commit()
            except Exception:
                db.rollback()

        return result


report_service = ReportService()
