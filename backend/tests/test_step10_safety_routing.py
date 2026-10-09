import pytest
import json
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from app.main import app
# pyrefly: ignore [missing-import]
from app.core.database import SessionLocal, init_db
# pyrefly: ignore [missing-import]
from app.models.user import User
# pyrefly: ignore [missing-import]
from app.models.safety_report import SafetyReport
# pyrefly: ignore [missing-import]
from app.models.help_point import HelpPoint
# pyrefly: ignore [missing-import]
from app.models.journey import Journey
# pyrefly: ignore [missing-import]
from app.services.route_safety_service import route_safety_service, RouteSafetyService

init_db()
client = TestClient(app)

# Isolated test coordinates far from other fixtures
ROUTE_ORIGIN_LAT = 28.5355
ROUTE_ORIGIN_LON = 77.3910
ROUTE_DEST_LAT = 28.5455
ROUTE_DEST_LON = 77.4010


@pytest.fixture(autouse=True)
def clean_test_location_data():
    """Cleans up any test reports and journeys at the test coordinates before and after tests."""
    db = SessionLocal()
    try:
        db.query(SafetyReport).filter(
            SafetyReport.latitude.between(ROUTE_ORIGIN_LAT - 0.2, ROUTE_DEST_LAT + 0.2),
            SafetyReport.longitude.between(ROUTE_ORIGIN_LON - 0.2, ROUTE_DEST_LON + 0.2),
        ).delete(synchronize_session=False)
        db.query(HelpPoint).filter(
            HelpPoint.latitude.between(ROUTE_ORIGIN_LAT - 0.2, ROUTE_DEST_LAT + 0.2),
            HelpPoint.longitude.between(ROUTE_ORIGIN_LON - 0.2, ROUTE_DEST_LON + 0.2),
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        db.query(SafetyReport).filter(
            SafetyReport.latitude.between(ROUTE_ORIGIN_LAT - 0.2, ROUTE_DEST_LAT + 0.2),
            SafetyReport.longitude.between(ROUTE_ORIGIN_LON - 0.2, ROUTE_DEST_LON + 0.2),
        ).delete(synchronize_session=False)
        db.query(HelpPoint).filter(
            HelpPoint.latitude.between(ROUTE_ORIGIN_LAT - 0.2, ROUTE_DEST_LAT + 0.2),
            HelpPoint.longitude.between(ROUTE_ORIGIN_LON - 0.2, ROUTE_DEST_LON + 0.2),
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_routing_valid_origin_destination():
    """1. Valid origin and destination returns valid candidate routes."""
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
            "profile": "walking",
            "alternatives": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "routes" in data
    assert len(data["routes"]) >= 1
    assert data["recommendation_status"] in ["recommended", "insufficient_data", "no_alternatives"]
    
    first_route = data["routes"][0]
    assert "route_id" in first_route
    assert first_route["distance_m"] > 0
    assert first_route["duration_seconds"] > 0
    assert "geometry" in first_route
    assert first_route["geometry"]["type"] == "LineString"
    assert len(first_route["geometry"]["coordinates"]) >= 2


def test_routing_invalid_coordinates():
    """2. Invalid coordinates (out of range latitude/longitude) are rejected with 422."""
    # Latitude > 90
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": 95.0, "longitude": 77.3910},
            "destination": {"latitude": 28.5455, "longitude": 77.4010},
        },
    )
    assert resp.status_code == 422

    # Longitude < -180
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": 28.5355, "longitude": -195.0},
            "destination": {"latitude": 28.5455, "longitude": 77.4010},
        },
    )
    assert resp.status_code == 422


def test_routing_identical_origin_destination():
    """3. Origin and destination too close/identical returns validation error."""
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
        },
    )
    assert resp.status_code in [400, 422]


def test_routing_multiple_alternatives():
    """4. Requesting alternatives returns multiple route options."""
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
            "profile": "walking",
            "alternatives": True,
        },
    )
    assert resp.status_code == 200
    routes = resp.json()["routes"]
    assert len(routes) >= 2


def test_routing_geometry_sampling():
    """Route geometry is correctly sampled at controlled intervals."""
    test_coords = [
        [77.3910, 28.5355],
        [77.3950, 28.5395],
        [77.4010, 28.5455],
    ]
    samples = RouteSafetyService.sample_route_geometry(test_coords, interval_meters=200, max_samples=10)
    assert len(samples) >= 3
    assert all(len(s) == 3 for s in samples)  # (lat, lon, cum_dist)


def test_route_safety_insufficient_data():
    """11. Route through an area with no safety data receives insufficient_data status."""
    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
            "profile": "walking",
            "alternatives": False,
        },
    )
    assert resp.status_code == 200
    routes = resp.json()["routes"]
    assert len(routes) >= 1
    assessment = routes[0]["risk_assessment"]
    assert assessment["status"] == "insufficient_data"
    assert assessment["risk_level"] in ["unknown", "insufficient_data"]
    assert assessment["score"] is None
    assert assessment["confidence"] == "insufficient"
    assert any("Insufficient civic data" in lim for lim in routes[0]["limitations"])


def get_or_create_test_user(db):
    user = db.query(User).first()
    if not user:
        user = User(
            id=uuid4(),
            email="route_test@safesphere.org",
            full_name="Route Tester",
            phone="+10000000000",
            date_of_birth=datetime(2000, 1, 1).date(),
            age=24,
            is_minor=False,
            user_type="General Public",
            firebase_uid="route_test_uid",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_route_safety_with_verified_reports():
    """9. Route corridor near verified unresolved safety reports reflects risk signals."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)

        # Add verified safety report near route corridor
        mid_lat = (ROUTE_ORIGIN_LAT + ROUTE_DEST_LAT) / 2
        mid_lon = (ROUTE_ORIGIN_LON + ROUTE_DEST_LON) / 2
        
        rep = SafetyReport(
            id=uuid4(),
            user_id=user.id,
            title="Dark street stretch",
            category="poor_lighting",
            description="Dark stretch with completely broken streetlights",
            severity="medium",
            latitude=mid_lat,
            longitude=mid_lon,
            location_label="Midway Ave",
            verification_status="VERIFIED",
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rep)
        db.commit()
    finally:
        db.close()

    resp = client.post(
        "/api/v1/routes/alternatives",
        json={
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
            "profile": "walking",
            "alternatives": True,
        },
    )
    assert resp.status_code == 200
    routes = resp.json()["routes"]
    # Check that at least one route detected the lighting issue
    all_signals = []
    for r in routes:
        all_signals.extend(r["strongest_signals"])
    
    assert any("lighting" in s["category"].lower() for s in all_signals)


def test_route_safety_duplicate_reports_deduplicated():
    """14. Overlapping adjacent samples do not duplicate the same safety report."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)
        mid_lat = (ROUTE_ORIGIN_LAT + ROUTE_DEST_LAT) / 2
        mid_lon = (ROUTE_ORIGIN_LON + ROUTE_DEST_LON) / 2

        rep = SafetyReport(
            id=uuid4(),
            user_id=user.id,
            title="Harassment hotspot",
            category="harassment_hotspot",
            description="Persistent catcalling corner",
            severity="high",
            latitude=mid_lat,
            longitude=mid_lon,
            location_label="Central Corner",
            verification_status="VERIFIED",
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rep)
        db.commit()

        # Evaluate safety for geometry that passes very close to this point with multiple dense samples
        coords = [
            [mid_lon - 0.001, mid_lat - 0.001],
            [mid_lon, mid_lat],
            [mid_lon + 0.001, mid_lat + 0.001],
        ]
        assessment, signals, limitations = route_safety_service.assess_route_safety(
            db=db,
            route_geometry={"type": "LineString", "coordinates": coords},
            distance_m=300.0,
            duration_seconds=200.0,
        )

        # Count occurrences of this report in signals
        harassment_signals = [s for s in signals if "harassment" in s.category.lower()]
        assert len(harassment_signals) <= 1, "Duplicate safety signal detected across adjacent route samples!"
    finally:
        db.close()


def test_assess_safety_endpoint_standalone():
    """Stand-alone POST /api/v1/routes/assess-safety endpoint works on arbitrary geometry."""
    coords = [
        [77.3910, 28.5355],
        [77.3950, 28.5395],
        [77.4010, 28.5455],
    ]
    resp = client.post(
        "/api/v1/routes/assess-safety",
        json={
            "route_id": "test-route-1",
            "geometry": {"type": "LineString", "coordinates": coords},
            "distance_m": 1200.0,
            "duration_seconds": 900.0,
            "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
            "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_assessment" in data
    assert "strongest_signals" in data
    assert "limitations" in data


def test_journey_creation_with_planned_route():
    """22-23. Journey creation preserves planned route geometry and metadata separate from GPS crumbs."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)
        coords = [
            [77.3910, 28.5355],
            [77.3950, 28.5395],
            [77.4010, 28.5455],
        ]
        journey_id = uuid4()
        journey = Journey(
            id=journey_id,
            user_id=user.id,
            start_latitude=ROUTE_ORIGIN_LAT,
            start_longitude=ROUTE_ORIGIN_LON,
            destination_latitude=ROUTE_DEST_LAT,
            destination_longitude=ROUTE_DEST_LON,
            destination_name="Sector 62 Noida",
            status="in_progress",
            started_at=datetime.now(timezone.utc),
            # Step 10 Planned Route fields
            selected_route_id="route-fastest-test",
            route_provider="osrm",
            route_geometry=json.dumps(coords),
            planned_distance_m=1250.0,
            planned_duration_seconds=950.0,
            estimated_risk_level="lower",
            route_data_coverage=0.85,
            route_assessed_at=datetime.now(timezone.utc),
        )
        db.add(journey)
        db.commit()

        # Query back and verify
        saved = db.query(Journey).filter(Journey.id == journey_id).first()
        assert saved is not None
        assert saved.selected_route_id == "route-fastest-test"
        assert saved.planned_distance_m == 1250.0
        assert json.loads(saved.route_geometry) == coords
        assert saved.estimated_risk_level == "lower"
        assert saved.route_data_coverage == 0.85
        # Clean up
        db.delete(saved)
        db.commit()
    finally:
        db.close()


def test_routing_transport_modes_all_supported():
    """Verify car, two-wheeler, bicycle, and walking profiles calculate genuine routes."""
    modes = ["walking", "driving", "cycling", "two_wheeler"]
    for m in modes:
        resp = client.post(
            "/api/v1/routes/alternatives",
            json={
                "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
                "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
                "profile": m,
                "alternatives": False,
            },
        )
        assert resp.status_code == 200, f"Mode {m} returned {resp.status_code}: {resp.text}"
        data = resp.json()
        assert len(data["routes"]) >= 1
        r = data["routes"][0]
        assert r["distance_m"] > 0
        assert r["duration_seconds"] > 0
        assert len(r["geometry"]["coordinates"]) >= 2
        # Check turn-by-turn steps
        assert "steps" in r
        if r["steps"]:
            first_step = r["steps"][0]
            assert "instruction" in first_step
        if m == "two_wheeler" and r.get("two_wheeler_disclaimer"):
            assert "Two-wheeler" in r["two_wheeler_disclaimer"]


def test_route_colour_classifications_green_yellow_red_grey():
    """Verify Green (80-100), Yellow (50-79), Red (0-49), and Grey classifications."""
    # 1. Grey: Insufficient data or low coverage with no reports
    risk, color, hex_val, label = route_safety_service.calculate_route_risk(score=None, data_coverage=0.0)
    assert color == "grey"
    assert hex_val == "#64748B"
    assert "Insufficient" in label

    # 2. Green: High safety score (85) with sufficient data coverage
    risk, color, hex_val, label = route_safety_service.calculate_route_risk(score=85, data_coverage=0.75)
    assert color == "green"
    assert hex_val == "#16A34A"
    assert "Lower Estimated Risk" in label

    # 3. Yellow: Moderate safety score (65)
    risk, color, hex_val, label = route_safety_service.calculate_route_risk(score=65, data_coverage=0.60)
    assert color == "yellow"
    assert hex_val == "#EAB308"
    assert "Moderate Estimated Risk" in label

    # 4. Red: Low safety score (35)
    risk, color, hex_val, label = route_safety_service.calculate_route_risk(score=35, data_coverage=0.80)
    assert color == "red"
    assert hex_val == "#DC2626"
    assert "Higher Estimated Risk" in label


def test_route_mode_sensitivity_scooty_potholes():
    """Verify two-wheeler / scooty mode applies heightened penalty to road damage/potholes."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)
        mid_lat = (ROUTE_ORIGIN_LAT + ROUTE_DEST_LAT) / 2
        mid_lon = (ROUTE_ORIGIN_LON + ROUTE_DEST_LON) / 2

        # Create road damage report
        rep = SafetyReport(
            id=uuid4(),
            user_id=user.id,
            title="Severe Pothole Trench",
            category="road_damage",
            description="Deep trench and crater pothole across driving lane",
            severity="high",
            latitude=mid_lat,
            longitude=mid_lon,
            location_label="Main Arterial",
            verification_status="VERIFIED",
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rep)
        db.commit()

        coords = [
            [mid_lon - 0.001, mid_lat - 0.001],
            [mid_lon, mid_lat],
            [mid_lon + 0.001, mid_lat + 0.001],
        ]
        geom = {"type": "LineString", "coordinates": coords}

        # Assess for walking
        res_walk = route_safety_service.assess_route_safety(
            db=db,
            route_geometry=geom,
            distance_m=300.0,
            duration_seconds=200.0,
            transport_mode="walking",
        )

        # Assess for two_wheeler (scooty)
        res_scooty = route_safety_service.assess_route_safety(
            db=db,
            route_geometry=geom,
            distance_m=300.0,
            duration_seconds=90.0,
            transport_mode="two_wheeler",
        )

        # Scooty score should be lower (more heavily penalized for potholes)
        assert res_scooty.assessment.score is not None
        assert res_walk.assessment.score is not None
        assert res_scooty.assessment.score < res_walk.assessment.score
        # Check explanation and relevance text
        assert any("two wheeler" in iss.mode_relevance.lower() or "pothole" in iss.mode_relevance.lower() for iss in res_scooty.relevant_issues)

        # Clean up
        db.delete(rep)
        db.commit()
    finally:
        db.close()


def test_route_night_time_lighting_weighting():
    """Verify night departure increases lighting hazard penalty compared to daytime."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)
        mid_lat = (ROUTE_ORIGIN_LAT + ROUTE_DEST_LAT) / 2
        mid_lon = (ROUTE_ORIGIN_LON + ROUTE_DEST_LON) / 2

        rep = SafetyReport(
            id=uuid4(),
            user_id=user.id,
            title="Dark Unlit Corridor",
            category="poor_lighting",
            description="All lamp posts broken along stretch",
            severity="high",
            latitude=mid_lat,
            longitude=mid_lon,
            location_label="Dark Lane",
            verification_status="VERIFIED",
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rep)
        db.commit()

        coords = [
            [mid_lon - 0.001, mid_lat - 0.001],
            [mid_lon, mid_lat],
            [mid_lon + 0.001, mid_lat + 0.001],
        ]
        geom = {"type": "LineString", "coordinates": coords}

        day_time = datetime(2026, 10, 9, 12, 0, 0, tzinfo=timezone.utc)
        night_time = datetime(2026, 10, 9, 23, 0, 0, tzinfo=timezone.utc)

        res_day = route_safety_service.assess_route_safety(
            db=db,
            route_geometry=geom,
            distance_m=300.0,
            duration_seconds=200.0,
            transport_mode="walking",
            departure_time=day_time,
        )

        res_night = route_safety_service.assess_route_safety(
            db=db,
            route_geometry=geom,
            distance_m=300.0,
            duration_seconds=200.0,
            transport_mode="walking",
            departure_time=night_time,
        )

        assert res_night.assessment.score is not None
        assert res_day.assessment.score is not None
        # Night score must be strictly lower due to 1.35x night penalty on lighting
        assert res_night.assessment.score < res_day.assessment.score
        assert res_night.relevant_issues[0].is_night_factor is True

        # Clean up
        db.delete(rep)
        db.commit()
    finally:
        db.close()


def test_route_alternatives_relevant_issues_and_explanation():
    """Verify POST /api/v1/routes/alternatives populates color, explanation, and relevant issues."""
    db = SessionLocal()
    try:
        user = get_or_create_test_user(db)
        mid_lat = (ROUTE_ORIGIN_LAT + ROUTE_DEST_LAT) / 2
        mid_lon = (ROUTE_ORIGIN_LON + ROUTE_DEST_LON) / 2

        rep = SafetyReport(
            id=uuid4(),
            user_id=user.id,
            title="Obstruction on sidewalk",
            category="road_obstruction",
            description="Debris blocking route",
            severity="medium",
            latitude=mid_lat,
            longitude=mid_lon,
            location_label="Sidewalk A",
            verification_status="VERIFIED",
            status="OPEN",
            created_at=datetime.now(timezone.utc),
        )
        db.add(rep)
        db.commit()

        resp = client.post(
            "/api/v1/routes/alternatives",
            json={
                "origin": {"latitude": ROUTE_ORIGIN_LAT, "longitude": ROUTE_ORIGIN_LON},
                "destination": {"latitude": ROUTE_DEST_LAT, "longitude": ROUTE_DEST_LON},
                "travel_mode": "scooty",
                "departure_time": "2026-10-09T20:00:00Z",
                "alternatives": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "routes" in data
        assert len(data["routes"]) >= 1
        first_route = data["routes"][0]
        assert "safety_assessment" in first_route
        sa = first_route["safety_assessment"]
        assert sa["color"] in ["green", "yellow", "red", "grey"]
        assert sa["color_hex"].startswith("#")
        assert "explanation" in first_route
        assert len(first_route["explanation"]) > 10
        assert "relevant_issues" in first_route
        assert "distinct_verified_issues_count" in first_route

        # Clean up
        db.delete(rep)
        db.commit()
    finally:
        db.close()


