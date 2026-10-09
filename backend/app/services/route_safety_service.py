import math
import logging
from typing import List, Tuple, Dict, Any, Optional, Set
from datetime import datetime, timezone
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.services.safety_pulse_service import (
    haversine_distance,
    SEVERITY_WEIGHTS,
    CATEGORY_HALF_LIVES_HOURS,
)
# pyrefly: ignore [missing-import]
from app.schemas.route import (
    RouteRiskAssessment,
    RouteSignalSummary,
    RouteRelevantIssue,
    RouteAlternativeItem,
)
# pyrefly: ignore [missing-import]
from app.models.safety_report import SafetyReport
# pyrefly: ignore [missing-import]
from app.models.help_point import HelpPoint

logger = logging.getLogger("safesphere.route_safety")


class RouteAssessmentResult:
    """
    Backwards-compatible result container that unpacks as a 3-tuple
    (assessment, signals, limitations) while providing extended fields
    (relevant_issues, explanation).
    """
    def __init__(
        self,
        assessment: RouteRiskAssessment,
        signals: List[RouteSignalSummary],
        limitations: List[str],
        relevant_issues: Optional[List[RouteRelevantIssue]] = None,
        explanation: str = "",
    ):
        self.assessment = assessment
        self.signals = signals
        self.limitations = limitations
        self.relevant_issues = relevant_issues or []
        self.explanation = explanation

    def __iter__(self):
        return iter((self.assessment, self.signals, self.limitations))

    def __getitem__(self, index):
        return (self.assessment, self.signals, self.limitations)[index]

    def __len__(self):
        return 3


class RouteSafetyService:
    """
    Evaluates, scores, and compares safety conditions along road-network route corridors.
    Strictly adheres to:
    - Reusing the core Step 9 Safety Pulse risk estimation engine.
    - Transparent data coverage and confidence indicators.
    - Zero fabrication: marks routes through unassessed areas as 'unknown' / 'insufficient_data'.
    - Deduplicates safety signals across adjacent route sample points.
    - Colour classification: GREEN (80-100), YELLOW (50-79), RED (0-49), GREY (Insufficient Data).
    - Transport mode sensitivity (Scooty, Motorcycle, Car, Bicycle, Walking).
    - Time-of-day contextual sensitivity (Daylight vs Night).
    """

    CORRIDOR_ASSESSMENT_RADIUS_M = 300.0  # Buffer radius around route sample points

    # Transport mode penalty sensitivity multipliers
    MODE_WEIGHT_MULTIPLIERS: Dict[str, Dict[str, float]] = {
        "two_wheeler": {
            "road_damage": 1.45,       # Potholes and trenches are dangerous for scooters/motorcycles
            "road_obstruction": 1.30,  # Debris/barricades cause abrupt swerves
            "poor_lighting": 1.25,     # Low visibility on two-wheeler
            "isolated_area": 1.10,
            "transport_issue": 1.0,
            "general_safety": 1.0,
            "other": 1.0,
        },
        "cycling": {
            "road_damage": 1.35,
            "road_obstruction": 1.35,
            "poor_lighting": 1.30,
            "isolated_area": 1.25,
            "transport_issue": 1.0,
            "general_safety": 1.0,
            "other": 1.0,
        },
        "driving": {
            "road_damage": 1.25,       # Tire/suspension hazards
            "road_obstruction": 1.15,
            "poor_lighting": 0.85,     # Car headlights partially mitigate dark stretches
            "isolated_area": 0.90,
            "transport_issue": 1.0,
            "general_safety": 1.0,
            "other": 1.0,
        },
        "walking": {
            "isolated_area": 1.40,     # Vulnerable on foot
            "poor_lighting": 1.35,     # Pedestrian trip and personal security risks
            "road_obstruction": 1.30,  # Blocked footpaths forcing into traffic
            "road_damage": 1.0,
            "transport_issue": 1.10,
            "general_safety": 1.10,
            "other": 1.0,
        },
    }

    @classmethod
    def sample_route_geometry(
        cls,
        coordinates: List[List[float]],  # [[lon, lat], ...]
        interval_meters: Optional[float] = None,
        max_samples: Optional[int] = None,
    ) -> List[Tuple[float, float, float]]:
        """
        Samples representative GPS points along a GeoJSON LineString coordinate array.
        Returns: List of (latitude, longitude, cumulative_distance_along_route_m).
        Ensures endpoints (start and end) are always sampled.
        """
        if not coordinates:
            return []

        if len(coordinates) == 1:
            return [(coordinates[0][1], coordinates[0][0], 0.0)]

        interval = interval_meters or settings.ROUTE_SAMPLE_INTERVAL_METERS
        max_limit = max_samples or settings.ROUTE_MAX_SAMPLE_POINTS

        # 1. Compute cumulative distances along vertices
        cum_distances: List[float] = [0.0]
        for i in range(1, len(coordinates)):
            lon1, lat1 = coordinates[i - 1][0], coordinates[i - 1][1]
            lon2, lat2 = coordinates[i][0], coordinates[i][1]
            d = haversine_distance(lat1, lon1, lat2, lon2)
            cum_distances.append(cum_distances[-1] + d)

        total_length = cum_distances[-1]
        if total_length <= 50.0:
            # Very short segment; sample origin and destination
            return [
                (coordinates[0][1], coordinates[0][0], 0.0),
                (coordinates[-1][1], coordinates[-1][0], total_length),
            ]

        # 2. Determine target sampling step
        target_count = min(max(int(total_length / interval), 3), max_limit)
        step = total_length / (target_count - 1)

        samples: List[Tuple[float, float, float]] = []
        current_target_d = 0.0
        vertex_idx = 0

        for _ in range(target_count):
            if current_target_d >= total_length - 0.1:
                samples.append((coordinates[-1][1], coordinates[-1][0], total_length))
                break

            while (
                vertex_idx < len(cum_distances) - 1
                and cum_distances[vertex_idx + 1] < current_target_d
            ):
                vertex_idx += 1

            d_start = cum_distances[vertex_idx]
            d_end = cum_distances[vertex_idx + 1]
            seg_len = d_end - d_start

            if seg_len > 0.0:
                fraction = (current_target_d - d_start) / seg_len
                lon1, lat1 = coordinates[vertex_idx][0], coordinates[vertex_idx][1]
                lon2, lat2 = coordinates[vertex_idx + 1][0], coordinates[vertex_idx + 1][1]
                lat = lat1 + fraction * (lat2 - lat1)
                lon = lon1 + fraction * (lon2 - lon1)
            else:
                lat = coordinates[vertex_idx][1]
                lon = coordinates[vertex_idx][0]

            samples.append((lat, lon, current_target_d))
            current_target_d += step

        dest_point = (coordinates[-1][1], coordinates[-1][0], total_length)
        if not samples or (
            haversine_distance(samples[-1][0], samples[-1][1], dest_point[0], dest_point[1]) > 20.0
        ):
            samples.append(dest_point)

        return samples

    @classmethod
    def find_route_nearby_reports(
        cls,
        db: Session,
        samples: List[Tuple[float, float, float]],
        corridor_radius_m: float = 300.0,
    ) -> Tuple[Dict[Any, Tuple[SafetyReport, float]], Dict[Any, Tuple[SafetyReport, float]], Dict[Any, Tuple[HelpPoint, float]]]:
        """
        Queries verified safety reports and help points within the route corridor.
        Performs spatial deduplication so multiple sample points near the same report
        record the report only once with its minimum distance to the route.
        Returns:
            (unique_unresolved_reports, unique_resolved_reports, unique_help_points)
        """
        if not samples:
            return {}, {}, {}

        # Compute bounding box encompassing all sample points plus corridor buffer
        lats = [s[0] for s in samples]
        lons = [s[1] for s in samples]
        lat_delta = corridor_radius_m / 111000.0
        mid_lat = sum(lats) / len(lats)
        cos_lat = max(math.cos(math.radians(mid_lat)), 0.01)
        lon_delta = corridor_radius_m / (111000.0 * cos_lat)

        min_lat, max_lat = min(lats) - lat_delta, max(lats) + lat_delta
        min_lon, max_lon = min(lons) - lon_delta, max(lons) + lon_delta

        candidate_reports = (
            db.query(SafetyReport)
            .filter(
                SafetyReport.latitude.between(min_lat, max_lat),
                SafetyReport.longitude.between(min_lon, max_lon),
            )
            .all()
        )

        candidate_help_points = (
            db.query(HelpPoint)
            .filter(
                HelpPoint.latitude.between(min_lat, max_lat),
                HelpPoint.longitude.between(min_lon, max_lon),
                HelpPoint.is_verified == True,
            )
            .all()
        )

        unique_unresolved: Dict[Any, Tuple[SafetyReport, float]] = {}
        unique_resolved: Dict[Any, Tuple[SafetyReport, float]] = {}
        unique_help_points: Dict[Any, Tuple[HelpPoint, float]] = {}

        # Evaluate candidate reports against route samples
        for rep in candidate_reports:
            v_status = (rep.verification_status or "").upper()
            status = (rep.status or "").upper()

            # Rejected reports never contribute
            if v_status == "REJECTED" or status in ("REJECTED", "DISMISSED"):
                continue

            # Only officially verified reports contribute to verified scores
            if v_status != "VERIFIED":
                continue

            # Find minimum distance to any route sample
            min_dist = min(haversine_distance(s[0], s[1], rep.latitude, rep.longitude) for s in samples)
            if min_dist <= corridor_radius_m:
                if status == "RESOLVED":
                    if rep.id not in unique_resolved or min_dist < unique_resolved[rep.id][1]:
                        unique_resolved[rep.id] = (rep, min_dist)
                else:
                    if rep.id not in unique_unresolved or min_dist < unique_unresolved[rep.id][1]:
                        unique_unresolved[rep.id] = (rep, min_dist)

        # Evaluate candidate help points
        for hp in candidate_help_points:
            min_dist = min(haversine_distance(s[0], s[1], hp.latitude, hp.longitude) for s in samples)
            if min_dist <= corridor_radius_m:
                if hp.id not in unique_help_points or min_dist < unique_help_points[hp.id][1]:
                    unique_help_points[hp.id] = (hp, min_dist)

        return unique_unresolved, unique_resolved, unique_help_points

    @classmethod
    def calculate_data_coverage(
        cls,
        total_samples: int,
        assessed_samples_count: int,
    ) -> Tuple[float, str]:
        """
        Calculates transparent data coverage ratio and qualitative label.
        """
        if total_samples <= 0:
            return 0.0, "insufficient"

        coverage = round(assessed_samples_count / total_samples, 2)
        if coverage >= 0.65:
            label = "high"
        elif coverage >= 0.40:
            label = "moderate"
        elif coverage >= 0.20:
            label = "low"
        else:
            label = "insufficient"

        return coverage, label

    @classmethod
    def calculate_route_risk(
        cls,
        score: Optional[int],
        data_coverage: float,
    ) -> Tuple[str, str, str, str]:
        """
        Maps a 0-100 route safety score to standard SafeSphere colour classifications:
        GREEN: Score 80-100 (#16A34A) — Lower Estimated Risk
        YELLOW: Score 50-79 (#EAB308) — Moderate Estimated Risk
        RED: Score 0-49 (#DC2626) — Higher Estimated Risk
        GREY: Insufficient Data (#64748B) — Insufficient Safety Data
        Returns: (risk_level, color, color_hex, label)
        """
        if score is None or data_coverage < 0.20:
            return "unknown", "grey", "#64748B", "Insufficient Safety Data"

        if score >= 80:
            return "lower", "green", "#16A34A", "Lower Estimated Risk"
        elif score >= 50:
            return "moderate", "yellow", "#EAB308", "Moderate Estimated Risk"
        else:
            return "higher", "red", "#DC2626", "Higher Estimated Risk"

    @classmethod
    def calculate_route_safety_score(
        cls,
        db: Session,
        samples: List[Tuple[float, float, float]],
        unique_unresolved: Dict[Any, Tuple[SafetyReport, float]],
        unique_resolved: Dict[Any, Tuple[SafetyReport, float]],
        unique_help_points: Dict[Any, Tuple[HelpPoint, float]],
        data_coverage: float,
        transport_mode: str = "walking",
        departure_time: Optional[datetime] = None,
    ) -> Tuple[Optional[int], List[RouteRelevantIssue], int]:
        """
        Deterministically calculates the route safety score from 0 to 100
        where a higher score indicates lower estimated risk.
        Considers issue severity, distance to route, recency aging, mode relevance,
        and night-time factors without duplicate multiplication.
        Returns:
            (score, relevant_issues_list, verified_issues_count)
        """
        if not unique_unresolved and not unique_resolved and not unique_help_points:
            return None, [], 0

        now = datetime.now(timezone.utc)
        dep_time = departure_time or now
        if dep_time.tzinfo is None:
            dep_time = dep_time.replace(tzinfo=timezone.utc)

        # Night detection (18:00 - 06:00)
        is_night = dep_time.hour >= 18 or dep_time.hour < 6

        norm_mode = "walking"
        m_str = str(transport_mode).lower().strip()
        if m_str in ("two_wheeler", "motorcycle", "scooter", "scooty"):
            norm_mode = "two_wheeler"
        elif m_str in ("cycling", "bicycle", "bike"):
            norm_mode = "cycling"
        elif m_str in ("driving", "car"):
            norm_mode = "driving"

        mode_mults = cls.MODE_WEIGHT_MULTIPLIERS.get(norm_mode, cls.MODE_WEIGHT_MULTIPLIERS["walking"])

        # Group reports by category to dampen duplicate penalties
        category_reports: Dict[str, List[Tuple[SafetyReport, float, float, Dict[str, Any]]]] = {}
        relevant_issues: List[RouteRelevantIssue] = []

        for rep, dist in unique_unresolved.values():
            cat = (rep.category or "other").lower()
            sev = (rep.severity or "medium").upper()
            base_weight = SEVERITY_WEIGHTS.get(sev, 14.0)

            # Distance factor: closer to route has higher impact
            dist_ratio = min(max(dist / cls.CORRIDOR_ASSESSMENT_RADIUS_M, 0.0), 1.0)
            distance_factor = max(0.15, 1.0 - (0.85 * dist_ratio))

            # Recency aging decay
            rep_created = rep.created_at
            if rep_created.tzinfo is None:
                rep_created = rep_created.replace(tzinfo=timezone.utc)
            age_hours = max((now - rep_created).total_seconds() / 3600.0, 0.0)
            half_life = CATEGORY_HALF_LIVES_HOURS.get(cat, 336.0)
            recency_factor = max(0.10, 0.5 ** (age_hours / half_life))

            # Mode multiplier
            mode_factor = mode_mults.get(cat, 1.0)

            # Time-of-day factor: lighting and isolation are heightened at night
            time_factor = 1.0
            is_night_factor = False
            if is_night and cat in ("poor_lighting", "isolated_area"):
                time_factor = 1.35
                is_night_factor = True

            report_penalty = base_weight * distance_factor * recency_factor * mode_factor * time_factor

            meta = {
                "base_weight": base_weight,
                "dist_factor": distance_factor,
                "recency_factor": recency_factor,
                "mode_factor": mode_factor,
                "time_factor": time_factor,
                "is_night_factor": is_night_factor,
            }

            if cat not in category_reports:
                category_reports[cat] = []
            category_reports[cat].append((rep, dist, report_penalty, meta))

            # Create RouteRelevantIssue model
            cat_label = cat.replace("_", " ").title()
            mode_rel_text = (
                f"High relevance for {norm_mode.replace('_', ' ')} (pothole/surface risk)"
                if cat == "road_damage" and norm_mode == "two_wheeler"
                else (
                    f"Heightened risk during night hours"
                    if is_night_factor
                    else f"Assessed for {norm_mode.replace('_', ' ')}"
                )
            )

            created_str = rep.created_at.isoformat() if rep.created_at else None

            relevant_issues.append(
                RouteRelevantIssue(
                    report_id=str(rep.id),
                    category=cat,
                    category_label=cat_label,
                    severity=sev,
                    description=rep.description or f"Verified {cat_label}",
                    distance_from_route_m=round(dist, 1),
                    location_label=rep.location_label,
                    latitude=rep.latitude,
                    longitude=rep.longitude,
                    created_at=created_str,
                    mode_relevance=mode_rel_text,
                    is_night_factor=is_night_factor,
                )
            )

        # Calculate total penalty with duplicate dampening across identical categories
        total_penalties = 0.0
        for cat, reps_list in category_reports.items():
            sorted_reps = sorted(reps_list, key=lambda x: x[2], reverse=True)
            for idx, (_, _, penalty, _) in enumerate(sorted_reps):
                # Apply diminishing factor (0.85 ** idx) so multiple observations of same category
                # don't endlessly multiply penalties
                dampener = 0.85 ** idx
                total_penalties += penalty * dampener

        # Help points provide safety anchors (up to +9 bonus points)
        help_points_bonus = min(len(unique_help_points) * 3.0, 9.0)

        # Baseline starts at 100.0 (pristine/no hazards), minus verified penalties
        raw_score = 100.0 - total_penalties + help_points_bonus
        final_score = max(0, min(100, int(round(raw_score))))

        # Sort relevant issues by severity descending, then distance ascending
        sev_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        relevant_issues.sort(key=lambda x: (sev_rank.get(x.severity, 0), -x.distance_from_route_m), reverse=True)

        return final_score, relevant_issues, len(unique_unresolved)

    @classmethod
    def generate_route_explanation(
        cls,
        score: Optional[int],
        color: str,
        risk_level: str,
        relevant_issues: List[RouteRelevantIssue],
        data_coverage: float,
        transport_mode: str,
        limitations: List[str],
    ) -> str:
        """
        Generates an honest, transparent, plain-language explanation of why the route
        received its safety score and colour classification.
        """
        cov_pct = int(data_coverage * 100)
        mode_label = transport_mode.replace("_", " ").title()

        if score is None or color == "grey":
            return (
                f"This route is marked with Insufficient Safety Data (Grey). "
                f"Verified civic safety records cover only {cov_pct}% of the route corridor. "
                f"Absence of reported incidents does not imply that this route is safe."
            )

        issue_count = len(relevant_issues)

        if color == "green":
            if issue_count == 0:
                return (
                    f"Classified as Lower Estimated Risk (Green) with a Safety Score of {score}/100. "
                    f"No verified unresolved hazards were detected within the 300m corridor "
                    f"(coverage: {cov_pct}%). Well-monitored corridor suitable for {mode_label} travel."
                )
            else:
                top_issue = relevant_issues[0]
                return (
                    f"Classified as Lower Estimated Risk (Green) with a Safety Score of {score}/100. "
                    f"Only minor verified observations ({top_issue.category_label}, {int(top_issue.distance_from_route_m)}m away) "
                    f"were detected along the assessed road corridor ({cov_pct}% coverage)."
                )

        if color == "yellow":
            categories = list({iss.category_label for iss in relevant_issues})
            cat_summary = ", ".join(categories[:3]) if categories else "environmental concerns"
            return (
                f"Classified as Moderate Estimated Risk (Yellow) with a Safety Score of {score}/100. "
                f"Found {issue_count} verified unresolved hazard{'s' if issue_count != 1 else ''} along the corridor "
                f"including {cat_summary}. Exercise standard caution for {mode_label} travel."
            )

        # Red / Higher Estimated Risk
        high_sev_count = sum(1 for iss in relevant_issues if iss.severity in ("HIGH", "CRITICAL"))
        categories = list({iss.category_label for iss in relevant_issues})
        cat_summary = ", ".join(categories[:3]) if categories else "infrastructure hazards"
        return (
            f"Classified as Higher Estimated Risk (Red) with a Safety Score of {score}/100. "
            f"Corridor contains {issue_count} verified unresolved hazard{'s' if issue_count != 1 else ''} "
            f"({high_sev_count} high-severity) including {cat_summary}. "
            f"Higher vigilance recommended; alternative paths should be reviewed."
        )

    @classmethod
    def assess_route_safety(
        cls,
        db: Session,
        route_geometry: Dict[str, Any],
        distance_m: float,
        duration_seconds: float,
        transport_mode: str = "walking",
        departure_time: Optional[datetime] = None,
    ) -> RouteAssessmentResult:
        """
        Executes spatial corridor safety assessment for a candidate route:
        1. Samples points along the road geometry.
        2. Queries nearby verified reports and help points with spatial deduplication.
        3. Calculates data coverage and confidence.
        4. Calculates deterministic route safety score and colour classification.
        5. Generates human-readable explanation and limitations.
        Returns a RouteAssessmentResult which unpacks as (assessment, signals, limitations)
        while providing .relevant_issues and .explanation.
        """
        coords = route_geometry.get("coordinates", [])
        if not coords:
            assessment = RouteRiskAssessment(
                status="unavailable",
                risk_level="unknown",
                score=None,
                color="grey",
                color_hex="#64748B",
                label="Insufficient Safety Data",
                confidence="insufficient",
                data_coverage=0.0,
                data_coverage_label="insufficient",
                verified_issues_count=0,
                assessed_samples_count=0,
                total_samples_count=0,
            )
            return RouteAssessmentResult(
                assessment=assessment,
                signals=[],
                limitations=["Invalid or empty route geometry received from provider."],
                relevant_issues=[],
                explanation="Route geometry is empty or invalid.",
            )

        samples = cls.sample_route_geometry(coords)
        total_samples = len(samples)

        if total_samples == 0:
            assessment = RouteRiskAssessment(
                status="unavailable",
                risk_level="unknown",
                score=None,
                color="grey",
                color_hex="#64748B",
                label="Insufficient Safety Data",
                confidence="insufficient",
                data_coverage=0.0,
                data_coverage_label="insufficient",
                verified_issues_count=0,
                assessed_samples_count=0,
                total_samples_count=0,
            )
            return RouteAssessmentResult(
                assessment=assessment,
                signals=[],
                limitations=["Unable to sample route geometry points."],
                relevant_issues=[],
                explanation="Unable to sample points along route geometry.",
            )

        # 1. Query verified signals near route corridor
        unique_unresolved, unique_resolved, unique_help_points = cls.find_route_nearby_reports(
            db=db,
            samples=samples,
            corridor_radius_m=cls.CORRIDOR_ASSESSMENT_RADIUS_M,
        )

        # 2. Count assessed sample points
        assessed_sample_count = 0
        for lat, lon, _ in samples:
            has_unresolved = any(haversine_distance(lat, lon, r.latitude, r.longitude) <= cls.CORRIDOR_ASSESSMENT_RADIUS_M for r, _ in unique_unresolved.values())
            has_resolved = any(haversine_distance(lat, lon, r.latitude, r.longitude) <= cls.CORRIDOR_ASSESSMENT_RADIUS_M for r, _ in unique_resolved.values())
            has_hp = any(haversine_distance(lat, lon, hp.latitude, hp.longitude) <= cls.CORRIDOR_ASSESSMENT_RADIUS_M for hp, _ in unique_help_points.values())
            if has_unresolved or has_resolved or has_hp:
                assessed_sample_count += 1

        # 3. Calculate data coverage
        data_coverage, coverage_label = cls.calculate_data_coverage(total_samples, assessed_sample_count)

        # 4. Calculate score, relevant issues, and verified count
        score, relevant_issues, verified_count = cls.calculate_route_safety_score(
            db=db,
            samples=samples,
            unique_unresolved=unique_unresolved,
            unique_resolved=unique_resolved,
            unique_help_points=unique_help_points,
            data_coverage=data_coverage,
            transport_mode=transport_mode,
            departure_time=departure_time,
        )

        # 5. Determine colour, risk level, and label
        risk_level, color, color_hex, risk_label = cls.calculate_route_risk(score, data_coverage)

        # Determine confidence
        if score is None or data_coverage < 0.20:
            status = "insufficient_data"
            confidence = "insufficient"
        else:
            status = "available"
            if data_coverage >= 0.65 and (len(unique_unresolved) + len(unique_resolved)) >= 3:
                confidence = "high"
            elif data_coverage >= 0.40:
                confidence = "moderate"
            else:
                confidence = "low"

        # Limitations
        limitations: List[str] = [
            f"Assessment covers verified reports and help points within {int(cls.CORRIDOR_ASSESSMENT_RADIUS_M)}m of the route corridor.",
            "Real-time municipal street-lighting sensors and live crowd telemetry are currently unavailable.",
        ]
        if data_coverage < 0.20:
            limitations.insert(
                0,
                f"Insufficient civic data along this corridor (coverage: {int(data_coverage * 100)}%). "
                f"Missing reports do not imply this route is safe."
            )

        # Strongest signals summary (for backwards compatibility)
        strongest_signals: List[RouteSignalSummary] = []
        for iss in relevant_issues[:4]:
            strongest_signals.append(
                RouteSignalSummary(
                    signal_type="verified_report",
                    category=iss.category,
                    severity=iss.severity,
                    description=f"Verified {iss.category_label} ({iss.severity}) {int(iss.distance_from_route_m)}m from route corridor",
                    distance_from_route_m=iss.distance_from_route_m,
                    location_label=iss.location_label,
                )
            )

        # Include help points in signals
        sorted_hp = sorted(unique_help_points.values(), key=lambda item: item[1])
        for hp, dist in sorted_hp[:2]:
            strongest_signals.append(
                RouteSignalSummary(
                    signal_type="help_point",
                    category=hp.point_type,
                    severity=None,
                    description=f"Verified {hp.name} ({hp.point_type}) {int(dist)}m from route",
                    distance_from_route_m=round(dist, 1),
                    location_label=hp.address,
                )
            )

        # 6. Generate human-readable explanation
        explanation = cls.generate_route_explanation(
            score=score,
            color=color,
            risk_level=risk_level,
            relevant_issues=relevant_issues,
            data_coverage=data_coverage,
            transport_mode=transport_mode,
            limitations=limitations,
        )

        assessment = RouteRiskAssessment(
            status=status,
            risk_level=risk_level,
            score=score,
            color=color,
            color_hex=color_hex,
            label=risk_label,
            confidence=confidence,
            data_coverage=data_coverage,
            data_coverage_label=coverage_label,
            verified_issues_count=verified_count,
            assessed_samples_count=assessed_sample_count,
            total_samples_count=total_samples,
        )

        return RouteAssessmentResult(
            assessment=assessment,
            signals=strongest_signals,
            limitations=limitations,
            relevant_issues=relevant_issues,
            explanation=explanation,
        )

    @classmethod
    def compare_and_rank_routes(
        cls,
        candidate_routes: List[RouteAlternativeItem],
    ) -> Tuple[List[RouteAlternativeItem], str, Optional[str], Optional[str]]:
        """
        Deterministically evaluates multiple candidate routes, assigning descriptive route types
        ('fastest', 'shortest', 'lower_estimated_risk', 'alternative') and providing a transparent
        recommendation.
        """
        if not candidate_routes:
            return [], "unavailable", None, "No candidate routes provided for comparison."

        if len(candidate_routes) == 1:
            candidate_routes[0].route_type = "standard"
            candidate_routes[0].route_type_label = "Primary Route"
            candidate_routes[0].summary_tags.append("Single Available Path")
            return (
                candidate_routes,
                "no_alternatives",
                candidate_routes[0].route_id,
                "Single route returned by the routing provider on the road network.",
            )

        min_duration = min(r.duration_seconds for r in candidate_routes)
        min_distance = min(r.distance_m for r in candidate_routes)

        assessed_routes = [
            r for r in candidate_routes
            if r.risk_assessment.status == "available" and r.risk_assessment.score is not None
        ]

        # Tag Fastest and Shortest
        for r in candidate_routes:
            r.summary_tags = []
            if abs(r.duration_seconds - min_duration) < 1.0:
                r.summary_tags.append("Fastest")
            if abs(r.distance_m - min_distance) < 20.0:
                r.summary_tags.append("Shortest")

        # Determine Lower Estimated-Risk Route
        lower_risk_route: Optional[RouteAlternativeItem] = None
        if assessed_routes:
            sorted_by_safety = sorted(
                assessed_routes,
                key=lambda r: (
                    r.risk_assessment.score or 0,
                    r.risk_assessment.data_coverage,
                    -r.duration_seconds,
                ),
                reverse=True,
            )
            top_candidate = sorted_by_safety[0]
            if top_candidate.risk_assessment.data_coverage >= 0.20:
                lower_risk_route = top_candidate

        # Assign route types
        for r in candidate_routes:
            is_fastest = abs(r.duration_seconds - min_duration) < 1.0
            is_shortest = abs(r.distance_m - min_distance) < 20.0
            is_lower_risk = (lower_risk_route is not None and r.route_id == lower_risk_route.route_id)

            if is_lower_risk and not is_fastest:
                r.route_type = "lower_estimated_risk"
                r.route_type_label = "Lower Estimated-Risk Route"
            elif is_fastest:
                r.route_type = "fastest"
                r.route_type_label = "Fastest Route"
            elif is_shortest:
                r.route_type = "shortest"
                r.route_type_label = "Shortest Route"
            else:
                r.route_type = "alternative"
                r.route_type_label = "Alternative Route"

        # Formulate Recommendation
        if lower_risk_route:
            recommendation_status = "recommended"
            recommended_route_id = lower_risk_route.route_id
            score = lower_risk_route.risk_assessment.score
            coverage_pct = int(lower_risk_route.risk_assessment.data_coverage * 100)
            color_name = lower_risk_route.risk_assessment.color.capitalize()
            recommendation_reason = (
                f"Route '{lower_risk_route.route_type_label}' ({color_name}) has lower estimated risk "
                f"(Safety score: {score}/100, data coverage: {coverage_pct}%) based on verified community signals."
            )
        else:
            fastest_candidate = next(
                (r for r in candidate_routes if abs(r.duration_seconds - min_duration) < 1.0),
                candidate_routes[0],
            )
            recommendation_status = "insufficient_data"
            recommended_route_id = fastest_candidate.route_id
            recommendation_reason = (
                "Comparative safety information along these routes is limited. "
                "Defaulting selection to the fastest route; user discretion advised."
            )

        return candidate_routes, recommendation_status, recommended_route_id, recommendation_reason


# Singleton instance
route_safety_service = RouteSafetyService()

# Module-level function exports for direct import
sample_route_geometry = route_safety_service.sample_route_geometry
find_route_nearby_reports = route_safety_service.find_route_nearby_reports
calculate_data_coverage = route_safety_service.calculate_data_coverage
calculate_route_risk = route_safety_service.calculate_route_risk
calculate_route_safety_score = route_safety_service.calculate_route_safety_score
generate_route_explanation = route_safety_service.generate_route_explanation
assess_route_safety = route_safety_service.assess_route_safety
compare_and_rank_routes = route_safety_service.compare_and_rank_routes
