import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.services.map_seed import seed_dev_map_data

init_db()
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_map_seed():
    """Ensure map tables are seeded with development test data."""
    db = SessionLocal()
    seed_dev_map_data(db)
    db.close()


def test_get_map_safety_reports():
    """Tests fetching safety reports and verifying privacy protections."""
    res = client.get("/api/v1/map/reports")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 5

    # Check privacy: ensure no reporter identity or contact fields are exposed
    for r in data:
        assert "user_id" not in r
        assert "email" not in r
        assert "phone" not in r
        assert "reporter" not in r
        assert "category" in r
        assert "latitude" in r
        assert "longitude" in r
        assert "severity" in r
        assert "status" in r
        assert "verification_status" in r


def test_filter_safety_reports_by_category():
    """Tests filtering reports by specific category."""
    res = client.get("/api/v1/map/reports?category=poor_lighting")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all(r["category"] == "poor_lighting" for r in data)


def test_filter_safety_reports_by_proximity():
    """Tests geographic Haversine filtering near center coords."""
    # Near Bangalore center (within 3km)
    res = client.get("/api/v1/map/reports?latitude=12.9716&longitude=77.5946&radius_meters=3000")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1

    # Far away (e.g. London coordinates) -> should return 0 reports
    res_far = client.get("/api/v1/map/reports?latitude=51.5074&longitude=-0.1278&radius_meters=3000")
    assert res_far.status_code == 200
    assert len(res_far.json()) == 0


def test_get_map_help_points_verified_only():
    """Tests fetching help points and ensuring only verified points appear."""
    res = client.get("/api/v1/map/help-points")
    assert res.status_code == 200
    points = res.json()
    assert len(points) >= 4
    # All points must be verified
    assert all(p["verified"] is True for p in points)
    # Check types exist
    types = [p["type"] for p in points]
    assert "police_station" in types
    assert "hospital" in types


def test_filter_help_points_by_type():
    """Tests filtering help points by point_type."""
    res = client.get("/api/v1/map/help-points?type=police_station")
    assert res.status_code == 200
    points = res.json()
    assert len(points) >= 1
    assert all(p["type"] == "police_station" for p in points)


def test_get_map_hotspots():
    """Tests fetching hotspot overlays."""
    res = client.get("/api/v1/map/hotspots")
    assert res.status_code == 200
    hotspots = res.json()
    assert len(hotspots) >= 2
    for h in hotspots:
        assert "label" in h
        assert "level" in h
        assert "radius" in h
        assert h["radius"] > 0
        # Wording must use respectful community signal cluster terminology
        assert ("Signal Cluster" in h["source"] or "Civic" in h["source"])


def test_get_consolidated_map_data():
    """Tests the /api/v1/map/data consolidated endpoint."""
    res = client.get("/api/v1/map/data?latitude=12.9716&longitude=77.5946&radius_meters=15000")
    assert res.status_code == 200
    bundle = res.json()
    assert "reports" in bundle
    assert "help_points" in bundle
    assert "hotspots" in bundle
    assert len(bundle["reports"]) >= 5
    assert len(bundle["help_points"]) >= 4
    assert len(bundle["hotspots"]) >= 2
