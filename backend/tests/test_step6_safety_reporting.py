import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.user import User
from app.models.safety_report import SafetyReport

init_db()
client = TestClient(app)

# Test User Credentials
TEST_USER_A = {
    "firebase_uid": "test_reporter_uid_01",
    "full_name": "Priya Sharma",
    "email": "priya.reporter@example.com",
    "phone": "+919876543210",
    "date_of_birth": "2000-01-01",
    "user_type": "Student",
}

TEST_USER_B = {
    "firebase_uid": "test_reporter_uid_02",
    "full_name": "Rohan Patel",
    "email": "rohan.reporter@example.com",
    "phone": "+919876543211",
    "date_of_birth": "1998-05-15",
    "user_type": "Employee",
}

AUTH_HEADERS_USER_A = {"Authorization": f"Bearer dev-token-{TEST_USER_A['firebase_uid']}"}
AUTH_HEADERS_USER_B = {"Authorization": f"Bearer dev-token-{TEST_USER_B['firebase_uid']}"}


@pytest.fixture(scope="module", autouse=True)
def setup_users():
    """Ensure test users are registered in database."""
    client.post("/api/v1/auth/register", json=TEST_USER_A)
    client.post("/api/v1/auth/register", json=TEST_USER_B)


def test_unauthenticated_cannot_create_report():
    """Unauthenticated users must receive HTTP 401 Unauthorized."""
    payload = {
        "category": "poor_lighting",
        "description": "Dark stretch near bus stop with broken streetlights.",
        "severity": "MEDIUM",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    res = client.post("/api/v1/reports", json=payload)
    assert res.status_code == 401


def test_create_valid_safety_report():
    """Authenticated user creates a valid safety report."""
    payload = {
        "category": "poor_lighting",
        "description": "Streetlight near the bus stop is not working and footpath is pitch dark.",
        "severity": "MEDIUM",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "location_label": "Bus Stop Junction",
    }
    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res.status_code == 201
    data = res.json()
    assert data["category"] == "poor_lighting"
    assert data["severity"] == "MEDIUM"
    assert data["status"] == "OPEN"
    assert data["verification_status"] == "PENDING"
    assert data["location_label"] == "Bus Stop Junction"
    assert data["latitude"] == 12.9716
    assert data["longitude"] == 77.5946
    assert "id" in data
    assert "user_id" in data


def test_create_report_invalid_category():
    """Invalid category must be rejected."""
    payload = {
        "category": "non_existent_category",
        "description": "Something happened here.",
        "severity": "LOW",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res.status_code in [400, 422]


def test_create_report_invalid_severity():
    """Invalid severity must be rejected."""
    payload = {
        "category": "road_damage",
        "description": "Large pothole in the left driving lane.",
        "severity": "CRITICAL_DANGER",  # Only LOW, MEDIUM, HIGH permitted
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res.status_code in [400, 422]


def test_create_report_invalid_description_length():
    """Description shorter than 5 chars or whitespace must be rejected."""
    payload = {
        "category": "road_obstruction",
        "description": "   ",
        "severity": "LOW",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res.status_code in [400, 422]


def test_create_report_invalid_coordinates():
    """Coordinates out of bounds (-90 to +90, -180 to +180) must be rejected."""
    payload = {
        "category": "road_obstruction",
        "description": "Construction debris on the pedestrian crossing.",
        "severity": "LOW",
        "latitude": 112.9716,  # Invalid latitude > 90
        "longitude": 77.5946,
    }
    res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res.status_code in [400, 422]


def test_duplicate_report_protection():
    """Same user submitting identical category within 100m in 15min receives 409 Conflict."""
    payload = {
        "category": "road_damage",
        "description": "Deep trench without hazard markers near Metro Gate.",
        "severity": "HIGH",
        "latitude": 12.9800,
        "longitude": 77.6000,
        "location_label": "Metro Gate 1",
    }
    # First submission -> 201 Created
    res1 = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert res1.status_code == 201
    rep1_id = res1.json()["id"]

    # Duplicate immediate submission at nearly identical coordinates -> 409 Conflict
    payload_dup = {
        "category": "road_damage",
        "description": "Another report for the same deep trench.",
        "severity": "HIGH",
        "latitude": 12.9801,  # ~11 meters away
        "longitude": 77.6000,
        "location_label": "Metro Gate 1",
    }
    res2 = client.post("/api/v1/reports", json=payload_dup, headers=AUTH_HEADERS_USER_A)
    assert res2.status_code == 409
    detail = res2.json()["detail"]
    assert "recently submitted a similar report" in str(detail)


def test_get_my_reports():
    """User can view their own report history."""
    res = client.get("/api/v1/reports/me", headers=AUTH_HEADERS_USER_A)
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) >= 2
    # Verify all belong to User A
    for r in reports:
        assert r["status"] == "OPEN"
        assert r["verification_status"] == "PENDING"


def test_report_detail_and_privacy():
    """Owner sees full details; other user sees public-safe details (no reporter PII)."""
    # Create report by User A
    payload = {
        "category": "isolated_area",
        "description": "Poorly frequented back alley behind commercial complex.",
        "severity": "LOW",
        "latitude": 12.9550,
        "longitude": 77.5850,
        "location_label": "Commercial Lane",
    }
    create_res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    assert create_res.status_code == 201
    report_id = create_res.json()["id"]

    # User A (Owner) fetches report -> includes ownership metadata
    owner_res = client.get(f"/api/v1/reports/{report_id}", headers=AUTH_HEADERS_USER_A)
    assert owner_res.status_code == 200
    assert "user_id" in owner_res.json()

    # User B (Non-owner) fetches report -> private identity omitted
    other_res = client.get(f"/api/v1/reports/{report_id}", headers=AUTH_HEADERS_USER_B)
    assert other_res.status_code == 200
    other_data = other_res.json()
    assert "user_id" not in other_data
    assert "reporter" not in other_data
    assert "email" not in other_data
    assert "phone" not in other_data


def test_delete_report_ownership_enforcement():
    """User cannot delete another user's report (403); can delete own report (200)."""
    # Create report by User A
    payload = {
        "category": "transport_issue",
        "description": "Bus frequency reduced causing overcrowded waiting areas.",
        "severity": "LOW",
        "latitude": 12.9400,
        "longitude": 77.5700,
    }
    create_res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    report_id = create_res.json()["id"]

    # User B attempts to delete User A's report -> 403 Forbidden
    del_res_b = client.delete(f"/api/v1/reports/{report_id}", headers=AUTH_HEADERS_USER_B)
    assert del_res_b.status_code == 403

    # User A deletes their own report -> 200 OK
    del_res_a = client.delete(f"/api/v1/reports/{report_id}", headers=AUTH_HEADERS_USER_A)
    assert del_res_a.status_code == 200

    # Ensure report is now gone -> 404
    get_res = client.get(f"/api/v1/reports/{report_id}")
    assert get_res.status_code == 404


def test_report_appears_on_map_and_nearby():
    """Newly submitted report appears in public nearby query and /api/v1/map/reports."""
    payload = {
        "category": "general_safety",
        "description": "Water logging covering the entire walking pavement.",
        "severity": "MEDIUM",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "location_label": "MG Road",
    }
    create_res = client.post("/api/v1/reports", json=payload, headers=AUTH_HEADERS_USER_A)
    report_id = create_res.json()["id"]

    # Check nearby reports
    nearby_res = client.get("/api/v1/reports/nearby?latitude=12.9716&longitude=77.5946&radius_meters=1000")
    assert nearby_res.status_code == 200
    nearby_ids = [r["id"] for r in nearby_res.json()]
    assert report_id in nearby_ids

    # Check map reports endpoint from Step 5
    map_res = client.get("/api/v1/map/reports")
    assert map_res.status_code == 200
    map_ids = [r["id"] for r in map_res.json()]
    assert report_id in map_ids
