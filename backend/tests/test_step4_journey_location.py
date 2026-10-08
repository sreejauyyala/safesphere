import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db, SessionLocal
from app.models.user import User
from app.models.journey import Journey, JourneyLocationPoint

init_db()
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_users():
    """Seed test users for Step 4 journey testing."""
    db = SessionLocal()
    # Clean previous journey test records
    db.query(JourneyLocationPoint).delete()
    db.query(Journey).delete()
    db.commit()

    today = date.today()
    dob_adult = f"{today.year - 24:04d}-{today.month:02d}-{today.day:02d}"
    dob_minor = f"{today.year - 16:04d}-{today.month:02d}-{today.day:02d}"

    # Ensure User 1 exists
    user1 = db.query(User).filter(User.firebase_uid == "test_uid_journey_user1").first()
    if not user1:
        client.post(
            "/api/v1/auth/register",
            json={
                "firebase_uid": "test_uid_journey_user1",
                "full_name": "Alice Walker",
                "email": "alice.walker@example.com",
                "phone": "+15551112233",
                "date_of_birth": dob_adult,
                "user_type": "Employee",
            },
        )

    # Ensure User 2 exists
    user2 = db.query(User).filter(User.firebase_uid == "test_uid_journey_user2").first()
    if not user2:
        client.post(
            "/api/v1/auth/register",
            json={
                "firebase_uid": "test_uid_journey_user2",
                "full_name": "Bob Stone",
                "email": "bob.stone@example.com",
                "phone": "+15554445566",
                "date_of_birth": dob_minor,
                "user_type": "Student",
            },
        )
    db.close()


def test_journey_lifecycle_full():
    headers = {"Authorization": "Bearer dev-token-test_uid_journey_user1"}

    # 1. No active journey initially
    res = client.get("/api/v1/journeys/active", headers=headers)
    assert res.status_code == 200
    assert res.json() is None

    # 2. Create a new active journey
    payload = {
        "destination_name": "City Library",
        "title": "Evening Commute",
        "start_latitude": 13.6288,
        "start_longitude": 79.4192,
        "destination_latitude": 13.6350,
        "destination_longitude": 79.4250,
    }
    create_res = client.post("/api/v1/journeys", json=payload, headers=headers)
    assert create_res.status_code == 201
    journey_data = create_res.json()
    journey_id = journey_data["id"]
    assert journey_data["destination_name"] == "City Library"
    assert journey_data["status"] == "ACTIVE"
    assert journey_data["start_latitude"] == 13.6288
    assert journey_data["distance_travelled"] == 0.0

    # 3. Attempting to start another journey returns 409 Conflict
    dup_res = client.post(
        "/api/v1/journeys",
        json={
            "destination_name": "University Campus",
            "start_latitude": 13.6288,
            "start_longitude": 79.4192,
        },
        headers=headers,
    )
    assert dup_res.status_code == 409
    assert "already have an active journey" in dup_res.json()["detail"]

    # 4. Check active journey endpoint
    active_res = client.get("/api/v1/journeys/active", headers=headers)
    assert active_res.status_code == 200
    assert active_res.json()["id"] == journey_id
    assert active_res.json()["status"] == "ACTIVE"

    # 5. Record breadcrumb location point
    # Move ~1.1 km north-east
    loc_payload_1 = {
        "latitude": 13.6330,
        "longitude": 79.4220,
        "accuracy": 8.5,
    }
    loc_res_1 = client.post(f"/api/v1/journeys/{journey_id}/location", json=loc_payload_1, headers=headers)
    assert loc_res_1.status_code == 201
    assert loc_res_1.json()["latitude"] == 13.6330
    assert loc_res_1.json()["accuracy"] == 8.5

    # Check that distance travelled increased
    j_check = client.get(f"/api/v1/journeys/{journey_id}", headers=headers).json()
    assert j_check["distance_travelled"] > 0.0
    dist_point_1 = j_check["distance_travelled"]

    # 6. Record second location point
    loc_payload_2 = {
        "latitude": 13.6350,
        "longitude": 79.4250,
        "accuracy": 5.0,
    }
    loc_res_2 = client.post(f"/api/v1/journeys/{journey_id}/location", json=loc_payload_2, headers=headers)
    assert loc_res_2.status_code == 201

    j_check_2 = client.get(f"/api/v1/journeys/{journey_id}", headers=headers).json()
    assert j_check_2["distance_travelled"] > dist_point_1

    # 7. Pause tracking
    pause_res = client.post(f"/api/v1/journeys/{journey_id}/pause", headers=headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    # Attempting to record location while paused should fail (HTTP 400)
    loc_paused = client.post(f"/api/v1/journeys/{journey_id}/location", json=loc_payload_2, headers=headers)
    assert loc_paused.status_code == 400
    assert "Tracking must be ACTIVE" in loc_paused.json()["detail"]

    # 8. Resume tracking
    resume_res = client.post(f"/api/v1/journeys/{journey_id}/resume", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "ACTIVE"

    # 9. Get breadcrumbs path
    points_res = client.get(f"/api/v1/journeys/{journey_id}/locations", headers=headers)
    assert points_res.status_code == 200
    points = points_res.json()
    # At least initial point + 2 updates = 3 points
    assert len(points) >= 3

    # 10. End Journey
    end_res = client.post(f"/api/v1/journeys/{journey_id}/end", headers=headers)
    assert end_res.status_code == 200
    summary = end_res.json()
    assert summary["status"] == "COMPLETED"
    assert summary["destination_name"] == "City Library"
    assert summary["distance_travelled"] > 0.0
    assert summary["duration_minutes"] >= 1
    assert summary["points_recorded"] >= 3

    # 11. Completed journey rejects new location points
    loc_ended = client.post(f"/api/v1/journeys/{journey_id}/location", json=loc_payload_1, headers=headers)
    assert loc_ended.status_code == 400

    # 12. Active journey is now None
    active_ended = client.get("/api/v1/journeys/active", headers=headers).json()
    assert active_ended is None

    # 13. Journey appears in history
    history_res = client.get("/api/v1/journeys", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) >= 1
    assert any(j["id"] == journey_id for j in history)


def test_journey_privacy_and_security_isolation():
    """Ensure user B cannot view, modify, pause, or record locations for user A's journey."""
    headers_user1 = {"Authorization": "Bearer dev-token-test_uid_journey_user1"}
    headers_user2 = {"Authorization": "Bearer dev-token-test_uid_journey_user2"}

    # User 1 starts a journey
    create_res = client.post(
        "/api/v1/journeys",
        json={
            "destination_name": "Private Destination",
            "start_latitude": 13.6000,
            "start_longitude": 79.4000,
        },
        headers=headers_user1,
    )
    assert create_res.status_code == 201
    journey_id = create_res.json()["id"]

    # User 2 tries to GET user 1's journey -> 403 Forbidden
    res_get = client.get(f"/api/v1/journeys/{journey_id}", headers=headers_user2)
    assert res_get.status_code == 403

    # User 2 tries to post location -> 403 Forbidden
    res_loc = client.post(
        f"/api/v1/journeys/{journey_id}/location",
        json={"latitude": 13.6050, "longitude": 79.4050},
        headers=headers_user2,
    )
    assert res_loc.status_code == 403

    # User 2 tries to pause user 1's journey -> 403 Forbidden
    res_pause = client.post(f"/api/v1/journeys/{journey_id}/pause", headers=headers_user2)
    assert res_pause.status_code == 403

    # User 2 tries to view user 1's location points -> 403 Forbidden
    res_points = client.get(f"/api/v1/journeys/{journey_id}/locations", headers=headers_user2)
    assert res_points.status_code == 403

    # User 2 tries to end user 1's journey -> 403 Forbidden
    res_end = client.post(f"/api/v1/journeys/{journey_id}/end", headers=headers_user2)
    assert res_end.status_code == 403

    # Clean up user 1's journey
    client.post(f"/api/v1/journeys/{journey_id}/end", headers=headers_user1)
