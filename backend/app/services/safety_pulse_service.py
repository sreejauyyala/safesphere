import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.models.safety_report import SafetyReport
from app.models.help_point import HelpPoint
from app.schemas.safety_pulse import (
    SafetyPulseResponse,
    SafetyPulseSignalItem,
    SafetyPulseHistoryResponse,
    SafetyPulseHistorySnapshot,
)

# Base Severity Penalty Weights (Configurable)
SEVERITY_WEIGHTS: Dict[str, float] = {
    "LOW": 6.0,
    "MEDIUM": 14.0,
    "HIGH": 24.0,
    "CRITICAL": 32.0,
}

# Category Aging Half-Lives in Hours
CATEGORY_HALF_LIVES_HOURS: Dict[str, float] = {
    "road_obstruction": 48.0,    # Temporary road blockages / debris decay faster
    "transport_issue": 168.0,    # ~7 days transit congestion/stop issues
    "poor_lighting": 336.0,      # ~14 days streetlight out until municipal repair
    "general_safety": 336.0,     # ~14 days general observations
    "other": 336.0,              # ~14 days default
    "road_damage": 720.0,        # ~30 days potholes and trenches persist longer
    "isolated_area": 1440.0,     # ~60 days structural urban isolation
}

UNAVAILABLE_DATA_SOURCES: List[str] = [
    "Real-time municipal lighting sensors",
    "Live crowd telemetry feeds",
    "Real-time transit surveillance feeds",
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0
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


class SafetyPulseService:
    """
    Deterministic Safety Pulse & Risk Estimation Engine.
    Transforms verified community reports and verified infrastructure points
    into transparent, location-specific, time-aware risk estimations.
    """

    @classmethod
    def get_nearby_safety_signals(
        cls,
        db: Session,
        lat: float,
        lon: float,
        radius_meters: float = 500.0,
    ) -> Tuple[List[Tuple[SafetyReport, float]], List[Tuple[SafetyReport, float]], List[Tuple[SafetyReport, float]], List[Tuple[HelpPoint, float]]]:
        """
        Gathers nearby safety signals within radius, categorized into:
        1. Verified & Unresolved reports
        2. Verified & Resolved reports
        3. Pending reports
        4. Verified 24/7 Help Points
        All paired with their exact Haversine distance in meters.
        """
        # Fast bounding box pre-filter (~111km per degree)
        lat_delta = radius_meters / 111000.0
        # Guard against pole division
        cos_lat = max(math.cos(math.radians(lat)), 0.01)
        lon_delta = radius_meters / (111000.0 * cos_lat)

        report_candidates = (
            db.query(SafetyReport)
            .filter(
                SafetyReport.latitude.between(lat - lat_delta, lat + lat_delta),
                SafetyReport.longitude.between(lon - lon_delta, lon + lon_delta),
            )
            .all()
        )

        help_point_candidates = (
            db.query(HelpPoint)
            .filter(
                HelpPoint.latitude.between(lat - lat_delta, lat + lat_delta),
                HelpPoint.longitude.between(lon - lon_delta, lon + lon_delta),
                HelpPoint.is_verified == True,
            )
            .all()
        )

        verified_unresolved: List[Tuple[SafetyReport, float]] = []
        verified_resolved: List[Tuple[SafetyReport, float]] = []
        pending_reports: List[Tuple[SafetyReport, float]] = []

        for r in report_candidates:
            dist = haversine_distance(lat, lon, r.latitude, r.longitude)
            if dist > radius_meters:
                continue

            v_status = (r.verification_status or "").upper()
            status = (r.status or "").upper()

            # Rejected reports never contribute
            if v_status == "REJECTED" or status == "REJECTED":
                continue

            if v_status == "VERIFIED":
                if status == "RESOLVED":
                    verified_resolved.append((r, dist))
                else:
                    verified_unresolved.append((r, dist))
            elif v_status in ["PENDING", "UNDER_VERIFICATION", "COMMUNITY_SUPPORTED", "UNDER_REVIEW", "DISPUTED"]:
                pending_reports.append((r, dist))

        verified_help_points: List[Tuple[HelpPoint, float]] = []
        for hp in help_point_candidates:
            dist = haversine_distance(lat, lon, hp.latitude, hp.longitude)
            if dist <= radius_meters:
                verified_help_points.append((hp, dist))

        return verified_unresolved, verified_resolved, pending_reports, verified_help_points

    @classmethod
    def calculate_report_contribution(
        cls,
        report: SafetyReport,
        distance_m: float,
        radius_m: float,
        now: datetime,
        time_context: Optional[str] = None,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calculates a single verified report's deterministic hazard penalty contribution:
        penalty = base_severity_weight * distance_factor * recency_factor * time_factor
        """
        severity_key = (report.severity or "medium").upper()
        base_weight = SEVERITY_WEIGHTS.get(severity_key, 14.0)

        # 1. Geographic Distance Decay (Closer reports have higher impact)
        # At distance 0 -> 1.0; at perimeter radius_m -> 0.15
        distance_ratio = min(max(distance_m / max(radius_m, 1.0), 0.0), 1.0)
        distance_factor = max(0.15, 1.0 - (0.85 * distance_ratio))

        # 2. Recency Aging Decay (Category-aware half-life)
        created_at = report.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_hours = max((now - created_at).total_seconds() / 3600.0, 0.0)

        category_key = (report.category or "other").lower()
        half_life_hours = CATEGORY_HALF_LIVES_HOURS.get(category_key, 336.0)
        recency_factor = max(0.10, 0.5 ** (age_hours / half_life_hours))

        # 3. Time Context Sensitivity (Only when supported by actual category/data)
        time_factor = 1.0
        time_notes = []
        if time_context:
            tc = time_context.lower()
            if tc == "night":
                # Lighting and isolation issues exhibit heightened empirical relevance at night
                if category_key in ["poor_lighting", "isolated_area"]:
                    time_factor = 1.2
                    time_notes.append(f"Heightened relevance during {tc}")
            elif tc == "morning" or tc == "afternoon":
                # Daylight mitigates lighting concern visibility
                if category_key == "poor_lighting":
                    time_factor = 0.8
                    time_notes.append(f"Daylight visibility mitigates lighting impact during {tc}")

        penalty = base_weight * distance_factor * recency_factor * time_factor

        meta = {
            "base_weight": base_weight,
            "distance_factor": round(distance_factor, 3),
            "recency_factor": round(recency_factor, 3),
            "time_factor": round(time_factor, 3),
            "age_hours": round(age_hours, 1),
            "notes": time_notes,
        }
        return penalty, meta

    @classmethod
    def calculate_data_confidence(
        cls,
        verified_count: int,
        resolved_count: int,
        distinct_categories_count: int,
        has_nearby_help_point: bool,
    ) -> str:
        """
        Determines transparent data confidence level:
        high, moderate, low, or insufficient.
        """
        total_verified = verified_count + resolved_count
        if total_verified == 0 and not has_nearby_help_point:
            return "insufficient"
        if total_verified >= 4 and distinct_categories_count >= 2:
            return "high"
        if total_verified >= 2:
            return "moderate"
        if total_verified >= 1 or has_nearby_help_point:
            return "low"
        return "insufficient"

    @classmethod
    def calculate_data_freshness(
        cls,
        oldest_or_latest_age_hours: Optional[float],
    ) -> str:
        """
        Determines data freshness:
        fresh (< 24h), moderate (< 7d), limited (< 30d), stale (>= 30d), insufficient
        """
        if oldest_or_latest_age_hours is None:
            return "insufficient"
        if oldest_or_latest_age_hours <= 24.0:
            return "fresh"
        if oldest_or_latest_age_hours <= 168.0:
            return "moderate"
        if oldest_or_latest_age_hours <= 720.0:
            return "limited"
        return "stale"

    @classmethod
    def get_risk_level(cls, score: Optional[int]) -> str:
        """
        Categorizes 0-100 score into standard SafeSphere risk levels:
        80–100: lower
        60–79: moderate
        40–59: elevated
        0–39: higher
        """
        if score is None:
            return "unknown"
        if score >= 80:
            return "lower"
        if score >= 60:
            return "moderate"
        if score >= 40:
            return "elevated"
        return "higher"

    @classmethod
    def calculate_safety_pulse(
        cls,
        db: Session,
        latitude: float,
        longitude: float,
        radius_meters: float = 500.0,
        time_context: Optional[str] = None,
    ) -> SafetyPulseResponse:
        """
        Evaluates Safety Pulse deterministically for the given location.
        Enforces:
        - Insufficient data returned if no reliable safety reports exist.
        - Verified unresolved reports contribute according to severity, distance, and recency.
        - Resolved reports no longer contribute to active risk.
        - Pending reports do not influence confirmed numerical score.
        - Duplicate reports are throttled with diminishing returns.
        """
        now = datetime.now(timezone.utc)

        # 1. Fetch relevant signals within geographic radius
        verified_unresolved, verified_resolved, pending_reports, verified_help_points = (
            cls.get_nearby_safety_signals(
                db=db,
                lat=latitude,
                lon=longitude,
                radius_meters=radius_meters,
            )
        )

        # 2. Check for Insufficient Data state
        if len(verified_unresolved) == 0 and len(verified_resolved) == 0:
            # If no verified reports exist, do NOT assume score of 100!
            # Prompt rule: "When insufficient reliable data exists, display:
            # 'Insufficient data to estimate local safety conditions.'"
            limitations = [
                "Insufficient verified data to estimate local safety conditions.",
                "Missing reports do not mean this location is safe.",
                "Data confidence is insufficient for numerical score estimation."
            ]
            if len(pending_reports) > 0:
                limitations.append(
                    f"{len(pending_reports)} unverified community report(s) nearby awaiting civic verification."
                )

            return SafetyPulseResponse(
                status="insufficient_data",
                score=None,
                risk_level="unknown",
                confidence="insufficient",
                data_freshness="insufficient",
                assessment_radius_m=radius_meters,
                evaluated_at=now,
                verified_unresolved_reports=0,
                verified_resolved_reports=0,
                pending_reports_count=len(pending_reports),
                verified_help_points_count=len(verified_help_points),
                strongest_signals=[],
                limitations=limitations,
                time_context_applied=time_context,
            )

        # 3. Calculate Report Penalties with Duplicate Clustering Dampening
        # Sort unresolved reports by severity descending so strongest signal is primary
        severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        verified_unresolved_sorted = sorted(
            verified_unresolved,
            key=lambda item: (
                severity_order.get((item[0].severity or "medium").upper(), 2),
                -item[1],  # closer distance prioritized
            ),
            reverse=True,
        )

        total_penalty = 0.0
        category_counts: Dict[str, int] = {}
        contributing_signals: List[SafetyPulseSignalItem] = []
        latest_report_age_hours: Optional[float] = None

        for report, dist in verified_unresolved_sorted:
            penalty, meta = cls.calculate_report_contribution(
                report=report,
                distance_m=dist,
                radius_m=radius_meters,
                now=now,
                time_context=time_context,
            )

            # Diminishing returns on repeated/duplicate reports of the same category
            cat = (report.category or "other").lower()
            prev_count = category_counts.get(cat, 0)
            category_counts[cat] = prev_count + 1
            duplicate_dampening = 1.0 / (1.0 + (0.5 * prev_count))

            final_item_penalty = penalty * duplicate_dampening
            total_penalty += final_item_penalty

            age_h = meta["age_hours"]
            if latest_report_age_hours is None or age_h < latest_report_age_hours:
                latest_report_age_hours = age_h

            contributing_signals.append(
                SafetyPulseSignalItem(
                    id=str(report.id),
                    category=cat,
                    severity=(report.severity or "medium").lower(),
                    title=report.title,
                    description=report.description,
                    distance_m=int(round(dist)),
                    created_at=report.created_at,
                    status=report.status,
                    verification_status=report.verification_status,
                    penalty_contribution=round(final_item_penalty, 2),
                )
            )

        # Track age of resolved reports if latest_report_age_hours is not yet set
        for report, _ in verified_resolved:
            created_at = report.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            age_h = max((now - created_at).total_seconds() / 3600.0, 0.0)
            if latest_report_age_hours is None or age_h < latest_report_age_hours:
                latest_report_age_hours = age_h

        # 4. Verified Help Points Reassurance Buffer
        # Verified safe havens (Police, Hospitals, Security desks) provide a positive mitigating factor
        # Up to a maximum relief of 8 points; never wiping out severe hazards
        help_points_relief = min(len(verified_help_points) * 2.5, 8.0)
        net_penalty = max(0.0, total_penalty - help_points_relief)

        # 5. Base Score Derivation (0 to 100)
        # If there are verified unresolved hazards, score = 100 - net_penalty
        # If there are only verified resolved reports and 0 unresolved hazards, score is high (~94-98)
        if len(verified_unresolved) == 0 and len(verified_resolved) > 0:
            computed_score = min(100, 94 + int(help_points_relief))
        else:
            raw_score = 100.0 - net_penalty
            computed_score = max(10, min(100, int(round(raw_score))))

        risk_level = cls.get_risk_level(computed_score)

        # 6. Confidence & Freshness
        distinct_categories = len(set(
            [(r[0].category or "other").lower() for r in verified_unresolved] +
            [(r[0].category or "other").lower() for r in verified_resolved]
        ))
        confidence = cls.calculate_data_confidence(
            verified_count=len(verified_unresolved),
            resolved_count=len(verified_resolved),
            distinct_categories_count=distinct_categories,
            has_nearby_help_point=len(verified_help_points) > 0,
        )

        data_freshness = cls.calculate_data_freshness(latest_report_age_hours)

        # 7. Limitations & Contextual Explanations
        limitations: List[str] = []
        if confidence in ["low", "moderate"]:
            limitations.append("Limited verified data density available for this specific area.")
        if len(pending_reports) > 0:
            limitations.append(
                f"{len(pending_reports)} pending community report(s) in this sector are not included in numerical score until verified."
            )
        if len(verified_resolved) > 0:
            limitations.append(
                f"{len(verified_resolved)} verified issue(s) have been resolved and no longer contribute to active risk."
            )
        if time_context:
            limitations.append(
                f"Time-aware context '{time_context}' evaluated against time-stamped reports."
            )
        limitations.append("Missing reports do not mean that an area is safe.")

        return SafetyPulseResponse(
            status="available",
            score=computed_score,
            risk_level=risk_level,
            confidence=confidence,
            data_freshness=data_freshness,
            assessment_radius_m=radius_meters,
            evaluated_at=now,
            verified_unresolved_reports=len(verified_unresolved),
            verified_resolved_reports=len(verified_resolved),
            pending_reports_count=len(pending_reports),
            verified_help_points_count=len(verified_help_points),
            strongest_signals=contributing_signals[:5],  # top 5 strongest signals
            unavailable_sources=UNAVAILABLE_DATA_SOURCES,
            limitations=limitations,
            time_context_applied=time_context,
        )

    @classmethod
    def get_location_safety_assessment(
        cls,
        db: Session,
        latitude: float,
        longitude: float,
        radius_meters: float = 500.0,
        time_context: Optional[str] = None,
    ) -> SafetyPulseResponse:
        """
        Reusable location-based safety assessment interface.
        Evaluates territorial safety conditions for a specific coordinate and radius.
        Designed for direct consumption by external services and Step 10 Safety-Aware Routing.
        """
        return cls.calculate_safety_pulse(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            time_context=time_context,
        )

    @classmethod
    def get_safety_pulse_history(
        cls,
        db: Session,
        latitude: float,
        longitude: float,
        radius_meters: float = 500.0,
        time_range: str = "30d",
    ) -> SafetyPulseHistoryResponse:
        """
        Retrieves real historical safety intelligence progression from actual database reports.
        Does not manufacture fake historical data.
        """
        days = 30
        if time_range == "7d":
            days = 7
        elif time_range == "90d":
            days = 90

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # Find all reports in radius created since start_date
        lat_delta = radius_meters / 111000.0
        cos_lat = max(math.cos(math.radians(latitude)), 0.01)
        lon_delta = radius_meters / (111000.0 * cos_lat)

        historical_reports = (
            db.query(SafetyReport)
            .filter(
                SafetyReport.latitude.between(latitude - lat_delta, latitude + lat_delta),
                SafetyReport.longitude.between(longitude - lon_delta, longitude + lon_delta),
                SafetyReport.created_at >= start_date,
            )
            .order_by(SafetyReport.created_at.asc())
            .all()
        )

        in_radius_reports = [
            r for r in historical_reports
            if haversine_distance(latitude, longitude, r.latitude, r.longitude) <= radius_meters
        ]

        # Generate aggregated time slices (e.g. 4 checkpoint buckets over time_range)
        step_days = max(1, days // 4)
        snapshots: List[SafetyPulseHistorySnapshot] = []

        for i in range(1, 5):
            checkpoint = start_date + timedelta(days=i * step_days)
            if checkpoint > now:
                checkpoint = now

            # Reports created up to checkpoint
            reports_at_time = [r for r in in_radius_reports if (
                r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at
            ) <= checkpoint]

            active_verified = [
                r for r in reports_at_time
                if (r.verification_status or "").upper() == "VERIFIED" and (r.status or "").upper() in ["OPEN", "IN_REVIEW"]
            ]
            resolved = [
                r for r in reports_at_time
                if (r.verification_status or "").upper() == "VERIFIED" and (r.status or "").upper() == "RESOLVED"
            ]

            if len(active_verified) == 0 and len(resolved) == 0:
                score = None
                status = "insufficient_data"
            else:
                score = max(10, min(100, 100 - (len(active_verified) * 15)))
                status = "available"

            snapshots.append(
                SafetyPulseHistorySnapshot(
                    timestamp=checkpoint,
                    score=score,
                    status=status,
                    active_verified_reports=len(active_verified),
                    resolved_reports=len(resolved),
                )
            )

        trend_text = (
            f"Over the last {days} days, {len(in_radius_reports)} total safety reports were logged "
            f"within {int(radius_meters)}m of this location."
        )

        return SafetyPulseHistoryResponse(
            status="success",
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            history=snapshots,
            trend_summary=trend_text,
        )


safety_pulse_service = SafetyPulseService()

# Reusable module-level functions matching prompt specification
calculate_safety_pulse = SafetyPulseService.calculate_safety_pulse
get_location_safety_assessment = SafetyPulseService.get_location_safety_assessment
get_nearby_safety_signals = SafetyPulseService.get_nearby_safety_signals
calculate_report_contribution = SafetyPulseService.calculate_report_contribution
calculate_data_confidence = SafetyPulseService.calculate_data_confidence
calculate_data_freshness = SafetyPulseService.calculate_data_freshness
get_safety_pulse_history = SafetyPulseService.get_safety_pulse_history
