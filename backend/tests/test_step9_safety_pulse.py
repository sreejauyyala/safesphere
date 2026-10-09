import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.models.safety_report import SafetyReport
from app.models.help_point import HelpPoint
from app.services.safety_pulse_service import safety_pulse_service, haversine_distance

init_db()
client = TestClient(app)

# Test Coordinates (Isolated test location far from other seeded data, e.g. remote coordinates)
TEST_LAT = 25.1234
TEST_LON = 85.5678


@pytest.fixture(autouse=True)
def clean_test_location_data():
    """Cleans up any test reports at the isolated test coordinates before and after tests."""
    db = SessionLocal()
    try:
        db.query(SafetyReport).filter(
            SafetyReport.latitude.between(TEST_LAT - 0.1, TEST_LAT + 0.1),
            SafetyReport.longitude.between(TEST_LON - 0.1, TEST_LON + 0.1),
        ).delete(synchronize_session=False)
        db.query(HelpPoint).filter(
            HelpPoint.latitude.between(TEST_LAT - 0.1, TEST_LAT + 0.1),
            HelpPoint.longitude.between(TEST_LON - 0.1, TEST_LON + 0.1),
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        db.query(SafetyReport).filter(
            SafetyReport.latitude.between(TEST_LAT - 0.1, TEST_LAT + 0.1),
            SafetyReport.longitude.between(TEST_LON - 0.1, TEST_LON + 0.1),
        ).delete(synchronize_session=False)
        db.query(HelpPoint).filter(
            HelpPoint.latitude.between(TEST_LAT - 0.1, TEST_LAT + 0.1),
            HelpPoint.longitude.between(TEST_LON - 0.1, TEST_LON + 0.1),
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_safety_pulse_no_reports_insufficient_data():
    """
    Test A: No reports available.
    - Status is 'insufficient_data'
    - Score is null
    - Area is NOT labelled safe or assigned a default score of 100
    - Confidence is 'insufficient'
    """
    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "insufficient_data"
    assert data["score"] is None
    assert data["risk_level"] == "unknown"
    assert data["confidence"] == "insufficient"
    assert data["data_freshness"] == "insufficient"
    assert "Insufficient verified data" in data["limitations"][0]


def test_safety_pulse_pending_reports_not_verified():
    """
    Test B: Pending community reports are NOT treated as confirmed facts.
    They do not generate active verified hazard score deductions.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    pending_rep = SafetyReport(
        category="poor_lighting",
        title="Unverified flickering light",
        latitude=TEST_LAT + 0.0001,
        longitude=TEST_LON + 0.0001,
        severity="HIGH",
        status="OPEN",
        verification_status="PENDING",
        created_at=now,
    )
    db.add(pending_rep)
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    # Pending report alone does not manufacture an available score or claim confirmed hazard
    assert data["status"] == "insufficient_data"
    assert data["score"] is None
    assert data["pending_reports_count"] == 1
    assert data["verified_unresolved_reports"] == 0


def test_safety_pulse_verified_unresolved_reports_contribute():
    """
    Test C: Verified unresolved reports correctly contribute to Safety Pulse.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    verified_rep = SafetyReport(
        category="poor_lighting",
        title="Verified broken streetlight",
        description="Pitch dark pathway at night",
        latitude=TEST_LAT + 0.0002,
        longitude=TEST_LON + 0.0002,
        severity="MEDIUM",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now - timedelta(hours=2),
    )
    db.add(verified_rep)
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "available"
    assert data["score"] is not None
    assert 0 <= data["score"] <= 100
    assert data["verified_unresolved_reports"] == 1
    assert len(data["strongest_signals"]) == 1
    assert data["strongest_signals"][0]["category"] == "poor_lighting"
    assert data["strongest_signals"][0]["distance_m"] > 0


def test_safety_pulse_rejected_reports_do_not_contribute():
    """
    Test D: Rejected reports must NOT contribute to the Safety Pulse.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    rejected_rep = SafetyReport(
        category="road_damage",
        title="Spam / Rejected road complaint",
        latitude=TEST_LAT + 0.0001,
        longitude=TEST_LON + 0.0001,
        severity="HIGH",
        status="REJECTED",
        verification_status="REJECTED",
        created_at=now,
    )
    db.add(rejected_rep)
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    # Rejected report must be ignored completely
    assert data["status"] == "insufficient_data"
    assert data["score"] is None
    assert data["verified_unresolved_reports"] == 0


def test_safety_pulse_resolved_reports_exclusion():
    """
    Test E: Resolved reports do NOT contribute as active unresolved hazards.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    # One active report
    active_rep = SafetyReport(
        category="road_obstruction",
        title="Active obstacle",
        latitude=TEST_LAT + 0.0001,
        longitude=TEST_LON + 0.0001,
        severity="LOW",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now,
    )
    # One resolved report
    resolved_rep = SafetyReport(
        category="poor_lighting",
        title="Repaired lamp",
        latitude=TEST_LAT + 0.0002,
        longitude=TEST_LON + 0.0002,
        severity="HIGH",
        status="RESOLVED",
        verification_status="VERIFIED",
        created_at=now - timedelta(days=2),
    )
    db.add_all([active_rep, resolved_rep])
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "available"
    assert data["verified_unresolved_reports"] == 1
    assert data["verified_resolved_reports"] == 1
    # Only active report appears in strongest_signals
    assert len(data["strongest_signals"]) == 1
    assert data["strongest_signals"][0]["title"] == "Active obstacle"


def test_safety_pulse_severity_weighting():
    """
    Test F: Higher-severity verified reports generate greater risk penalties.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # Calculate penalty for LOW severity
    low_rep = SafetyReport(
        category="general_safety",
        title="Low hazard",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="LOW",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now,
    )
    pen_low, _ = safety_pulse_service.calculate_report_contribution(
        report=low_rep, distance_m=50, radius_m=500, now=now
    )

    # Calculate penalty for HIGH severity
    high_rep = SafetyReport(
        category="general_safety",
        title="High hazard",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="HIGH",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now,
    )
    pen_high, _ = safety_pulse_service.calculate_report_contribution(
        report=high_rep, distance_m=50, radius_m=500, now=now
    )

    assert pen_high > pen_low
    assert pen_high >= pen_low * 2.5
    db.close()


def test_safety_pulse_geographic_distance_decay():
    """
    Test G: Nearby reports have greater influence than distant reports.
    """
    now = datetime.now(timezone.utc)
    rep = SafetyReport(
        category="poor_lighting",
        title="Light out",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="MEDIUM",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now,
    )

    pen_close, _ = safety_pulse_service.calculate_report_contribution(
        report=rep, distance_m=30, radius_m=500, now=now
    )
    pen_far, _ = safety_pulse_service.calculate_report_contribution(
        report=rep, distance_m=450, radius_m=500, now=now
    )

    assert pen_close > pen_far


def test_safety_pulse_recency_aging():
    """
    Test H: Category-aware aging recency.
    Temporary road_obstruction decays faster than structural road_damage.
    """
    now = datetime.now(timezone.utc)
    old_time = now - timedelta(days=5)  # 120 hours

    obs_rep = SafetyReport(
        category="road_obstruction",
        title="Obstruction 5 days ago",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="MEDIUM",
        created_at=old_time,
    )
    dmg_rep = SafetyReport(
        category="road_damage",
        title="Road pothole 5 days ago",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="MEDIUM",
        created_at=old_time,
    )

    pen_obs, meta_obs = safety_pulse_service.calculate_report_contribution(
        report=obs_rep, distance_m=100, radius_m=500, now=now
    )
    pen_dmg, meta_dmg = safety_pulse_service.calculate_report_contribution(
        report=dmg_rep, distance_m=100, radius_m=500, now=now
    )

    # Road damage has a 30-day halflife vs road obstruction 2-day halflife
    # Therefore, 5-day-old road damage maintains significantly higher relevance
    assert meta_dmg["recency_factor"] > meta_obs["recency_factor"]
    assert pen_dmg > pen_obs


def test_safety_pulse_time_context_not_artificial():
    """
    Test I: Time alone does not imply danger without supporting evidence.
    """
    res_none = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}")
    assert res_none.status_code == 200
    assert res_none.json()["status"] == "insufficient_data"

    res_night = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&time_context=night")
    assert res_night.status_code == 200
    # Empty area does NOT automatically become high danger or manufacture scores
    assert res_night.json()["status"] == "insufficient_data"


def test_safety_pulse_duplicate_dampening_confidence():
    """
    Test J: Duplicate reports do not artificially inflate confidence or explode penalties.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # Insert 4 reports of the same category (e.g. repeated poor_lighting)
    for i in range(4):
        db.add(
            SafetyReport(
                category="poor_lighting",
                title=f"Streetlight broken #{i}",
                latitude=TEST_LAT + 0.0001,
                longitude=TEST_LON + 0.0001,
                severity="MEDIUM",
                status="OPEN",
                verification_status="VERIFIED",
                created_at=now - timedelta(hours=i),
            )
        )
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "available"
    # Even with 4 reports, because they are all the SAME single category, confidence is moderate (not high)
    assert data["confidence"] in ["moderate", "low"]
    # Score must stay bounded and not drop to 0
    assert data["score"] >= 10


def test_safety_pulse_score_boundaries():
    """
    Test K: Available scores always stay strictly within [0, 100].
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    # Add multiple critical hazards
    for i in range(10):
        db.add(
            SafetyReport(
                category="isolated_area",
                title=f"Hazard #{i}",
                latitude=TEST_LAT + 0.0001,
                longitude=TEST_LON + 0.0001,
                severity="CRITICAL",
                status="OPEN",
                verification_status="VERIFIED",
                created_at=now,
            )
        )
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 200
    data = res.json()
    assert data["score"] is not None
    assert 0 <= data["score"] <= 100
    assert data["risk_level"] in ["higher", "elevated"]


def test_safety_pulse_invalid_coordinates():
    """
    Test L: Invalid coordinates return 422 Unprocessable Entity.
    """
    # Latitude > 90
    res = client.get("/api/v1/safety-pulse?latitude=95.0&longitude=77.0")
    assert res.status_code == 422

    # Longitude < -180
    res = client.get("/api/v1/safety-pulse?latitude=12.0&longitude=-195.0")
    assert res.status_code == 422


def test_safety_pulse_history_endpoint():
    """
    Test Safety Pulse history trends endpoint.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    db.add(
        SafetyReport(
            category="poor_lighting",
            title="Old verified report",
            latitude=TEST_LAT,
            longitude=TEST_LON,
            severity="MEDIUM",
            status="RESOLVED",
            verification_status="VERIFIED",
            created_at=now - timedelta(days=5),
        )
    )
    db.commit()
    db.close()

    res = client.get(f"/api/v1/safety-pulse/history?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500&time_range=30d")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert len(data["history"]) >= 4
    assert "trend_summary" in data


def test_safety_pulse_end_to_end_resolution_workflow():
    """
    End-to-End Test (Steps 4-11 of Prompt Scenario):
    1. Create a verified unresolved safety report.
    2. Request Safety Pulse -> score drops to reflect hazard.
    3. Mark the report RESOLVED via update endpoint / workflow.
    4. Recalculate Safety Pulse -> score improves, hazard excluded from active signals.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    rep = SafetyReport(
        category="road_damage",
        title="Hazardous Trench near Crossing",
        description="Dangerous uncovered pit",
        latitude=TEST_LAT,
        longitude=TEST_LON,
        severity="HIGH",
        status="OPEN",
        verification_status="VERIFIED",
        created_at=now - timedelta(hours=1),
    )
    db.add(rep)
    db.commit()
    report_id = str(rep.id)
    db.close()

    # Step 2: Request pulse with active unresolved hazard
    res1 = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "available"
    score_unresolved = data1["score"]
    assert data1["verified_unresolved_reports"] == 1
    assert len(data1["strongest_signals"]) == 1

    # Step 3: Resolve report directly in database / workflow
    db = SessionLocal()
    r = db.query(SafetyReport).filter(SafetyReport.id == rep.id).first()
    r.status = "RESOLVED"
    db.commit()
    db.close()

    # Step 4: Recalculate Safety Pulse
    res2 = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res2.status_code == 200
    data2 = res2.json()

    # Resolved report no longer contributes as active hazard
    assert data2["verified_unresolved_reports"] == 0
    assert data2["verified_resolved_reports"] == 1
    assert len(data2["strongest_signals"]) == 0
    # Score should improve substantially after resolution
    assert data2["score"] > score_unresolved


def test_safety_pulse_database_unavailable(monkeypatch):
    """
    Test M: Database unavailable returns graceful 503 error state.
    """
    def mock_calc_failure(*args, **kwargs):
        raise RuntimeError("Simulated database connection failure")

    monkeypatch.setattr(safety_pulse_service, "calculate_safety_pulse", mock_calc_failure)

    res = client.get(f"/api/v1/safety-pulse?latitude={TEST_LAT}&longitude={TEST_LON}&radius=500")
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"]


def test_reusable_get_location_safety_assessment():
    """
    Verifies that get_location_safety_assessment() provides a clean reusable interface
    for location assessments (ready for Step 10 Safety-Aware Routing waypoints).
    """
    from app.services.safety_pulse_service import get_location_safety_assessment

    db = SessionLocal()
    try:
        assessment = get_location_safety_assessment(
            db=db,
            latitude=TEST_LAT,
            longitude=TEST_LON,
            radius_meters=500.0,
            time_context="morning",
        )
        assert assessment is not None
        assert assessment.status in ["available", "insufficient_data"]
    finally:
        db.close()


def test_module_level_function_exports():
    """
    Verifies all module-level functions required by Step 9 specification are callable:
    - calculate_safety_pulse()
    - get_location_safety_assessment()
    - get_nearby_safety_signals()
    - calculate_report_contribution()
    - calculate_data_confidence()
    - calculate_data_freshness()
    - get_safety_pulse_history()
    """
    from app.services.safety_pulse_service import (
        calculate_safety_pulse,
        get_location_safety_assessment,
        get_nearby_safety_signals,
        calculate_report_contribution,
        calculate_data_confidence,
        calculate_data_freshness,
        get_safety_pulse_history,
    )

    assert callable(calculate_safety_pulse)
    assert callable(get_location_safety_assessment)
    assert callable(get_nearby_safety_signals)
    assert callable(calculate_report_contribution)
    assert callable(calculate_data_confidence)
    assert callable(calculate_data_freshness)
    assert callable(get_safety_pulse_history)

    # Validate deterministic confidence evaluation
    assert calculate_data_confidence(0, 0, 0, False) == "insufficient"
    assert calculate_data_confidence(1, 0, 1, False) == "low"
    assert calculate_data_confidence(2, 0, 1, False) == "moderate"
    assert calculate_data_confidence(4, 0, 2, False) == "high"

    # Validate freshness evaluation
    assert calculate_data_freshness(None) == "insufficient"
    assert calculate_data_freshness(12.0) == "fresh"
    assert calculate_data_freshness(48.0) == "moderate"
    assert calculate_data_freshness(300.0) == "limited"
    assert calculate_data_freshness(800.0) == "stale"
