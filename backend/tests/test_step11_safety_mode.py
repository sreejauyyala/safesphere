import pytest
from datetime import datetime, timezone, timedelta, date
from uuid import uuid4
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.models.journey import Journey
from app.models.help_point import HelpPoint
from app.models.guardian import Guardian
from app.models.safety_mode import SafetyModeSession

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def setup_safety_mode_users():
    """
    Sets up an adult user and a minor user with guardian for testing.
    """
    db = SessionLocal()

    # Clear previous test safety sessions and journeys for idempotent tests
    db.query(SafetyModeSession).delete()
    adult_existing = db.query(User).filter(User.firebase_uid == "test_safety_mode_adult").first()
    if adult_existing:
        db.query(Journey).filter(Journey.user_id == adult_existing.id).delete()
    db.commit()

    # Adult User
    adult = db.query(User).filter(User.firebase_uid == "test_safety_mode_adult").first()
    if not adult:
        adult = User(
            firebase_uid="test_safety_mode_adult",
            full_name="Alex Adult",
            email="alex.adult@safesphere.test",
            phone="+15551112222",
            date_of_birth=date(1998, 5, 12),
            age=28,
            is_minor=False,
            user_type="General Public",
            role="USER",
            is_active=True,
        )
        db.add(adult)
        db.commit()
        db.refresh(adult)

    # Minor User with Guardian
    minor = db.query(User).filter(User.firebase_uid == "test_safety_mode_minor").first()
    if not minor:
        minor = User(
            firebase_uid="test_safety_mode_minor",
            full_name="Maya Minor",
            email="maya.minor@safesphere.test",
            phone="+15553334444",
            date_of_birth=date(2010, 8, 20),
            age=16,
            is_minor=True,
            user_type="Student",
            role="USER",
            is_active=True,
        )
        db.add(minor)
        db.commit()
        db.refresh(minor)

    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    if not guardian:
        guardian = Guardian(
            minor_user_id=minor.id,
            guardian_name="Helen Guardian",
            guardian_phone="+15559998888",
            guardian_email="helen.guardian@safesphere.test",
            relationship="Mother",
            verification_status="VERIFIED",
            consent_status="ACCEPTED",
        )
        db.add(guardian)
        db.commit()

    # Other User (for unauthorized ownership tests)
    other = db.query(User).filter(User.firebase_uid == "test_safety_mode_other").first()
    if not other:
        other = User(
            firebase_uid="test_safety_mode_other",
            full_name="Oscar Other",
            email="oscar.other@safesphere.test",
            phone="+15555556666",
            date_of_birth=date(1995, 2, 10),
            age=31,
            is_minor=False,
            user_type="General Public",
            role="USER",
            is_active=True,
        )
        db.add(other)
        db.commit()
        db.refresh(other)

    # Verified Help Points in Bengaluru (near test coordinates: 12.9716, 77.5946)
    hp = db.query(HelpPoint).filter(HelpPoint.name == "Cubbon Park Police Haven").first()
    if not hp:
        hp = HelpPoint(
            name="Cubbon Park Police Haven",
            point_type="police_station",
            category="police",
            latitude=12.9740,
            longitude=77.5920,
            address="Kasturba Road, Bengaluru",
            is_verified=True,
            is_24_hours=True,
        )
        db.add(hp)
        db.commit()

    db.close()
    return {
        "adult_uid": "test_safety_mode_adult",
        "minor_uid": "test_safety_mode_minor",
        "other_uid": "test_safety_mode_other",
    }


def test_safety_mode_activation_without_journey(setup_safety_mode_users):
    """
    User activates Safety Mode with GPS coordinates, but no active journey.
    Should create session, return help points, and report location status as available.
    """
    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "notify_trusted_contacts": True,
        "user_note": "Felt uncomfortable near unlit crossroad.",
    }

    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["session"]["status"] == "ACTIVE"
    assert data["session"]["activation_latitude"] == 12.9716
    assert data["session"]["activation_longitude"] == 77.5946
    assert data["session"]["notification_status"] in ("NOT_CONFIGURED", "SENT")
    assert data["location_status"] == "available"
    assert data["journey_id"] is None
    assert len(data["nearby_help_points"]) > 0
    assert data["nearby_help_points"][0]["name"] == "Cubbon Park Police Haven"
    assert data["nearby_help_points"][0]["distance_m"] < 1000.0


def test_safety_mode_activation_idempotency(setup_safety_mode_users):
    """
    Repeated activation call while active returns existing active session.
    """
    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    res1 = client.get("/api/v1/safety-mode/current", headers=headers)
    assert res1.status_code == 200
    session_id_1 = res1.json()["session"]["id"]

    # Re-activate
    payload = {"latitude": 12.9720, "longitude": 77.5950}
    res2 = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res2.status_code == 201
    session_id_2 = res2.json()["session"]["id"]

    assert session_id_1 == session_id_2


def test_safety_mode_active_journey_linking(setup_safety_mode_users):
    """
    When user has an ACTIVE journey, Safety Mode links to it and sets journey.is_safe_mode_active = True.
    """
    db = SessionLocal()
    adult = db.query(User).filter(User.firebase_uid == setup_safety_mode_users['adult_uid']).first()

    # Clear prior safety mode
    db.query(SafetyModeSession).filter(SafetyModeSession.user_id == adult.id).delete()

    # Create active journey
    journey = Journey(
        user_id=adult.id,
        destination_name="Indiranagar Hub",
        title="Evening Commute",
        start_latitude=12.9352,
        start_longitude=77.6245,
        status="ACTIVE",
        is_safe_mode_active=False,
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)
    journey_id = str(journey.id)
    db.close()

    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "journey_id": journey_id,
        "latitude": 12.9400,
        "longitude": 77.6300,
        "notify_trusted_contacts": False,
    }

    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["journey_id"] == journey_id
    assert data["journey_destination"] == "Indiranagar Hub"
    assert data["journey_status"] == "ACTIVE"

    # Verify journey model flag updated
    db = SessionLocal()
    from uuid import UUID as PyUUID
    j = db.query(Journey).filter(Journey.id == PyUUID(journey_id)).first()
    assert j.is_safe_mode_active is True
    db.close()


def test_safety_mode_without_location_permission(setup_safety_mode_users):
    """
    User activates without coordinates (GPS permission denied).
    Should succeed and report location_status = 'permission_required'.
    """
    db = SessionLocal()
    adult = db.query(User).filter(User.firebase_uid == setup_safety_mode_users['adult_uid']).first()
    db.query(SafetyModeSession).filter(SafetyModeSession.user_id == adult.id).delete()
    db.commit()
    db.close()

    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"notify_trusted_contacts": False}
    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["location_status"] == "permission_required"
    assert data["session"]["activation_latitude"] is None
    assert len(data["nearby_help_points"]) == 0


def test_minor_account_guardian_status(setup_safety_mode_users):
    """
    Minor account activating Safety Mode includes verified guardian information.
    """
    token = f"dev-token-{setup_safety_mode_users['minor_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"latitude": 12.9716, "longitude": 77.5946}
    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["guardian_status"]["is_minor"] is True
    assert data["guardian_status"]["has_guardian"] is True
    assert data["guardian_status"]["guardian_name"] == "Helen Guardian"
    assert data["guardian_status"]["verification_status"] == "VERIFIED"


def test_safety_mode_end_flow(setup_safety_mode_users):
    """
    User presses 'I'm Safe Now' and ends Safety Mode.
    Status updates to ENDED, deactivated_at is recorded, and active journey remains ACTIVE.
    """
    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    res_cur = client.get("/api/v1/safety-mode/current", headers=headers)
    assert res_cur.status_code == 200
    session_id = res_cur.json()["session"]["id"]

    end_payload = {
        "deactivation_reason": "user_safe",
        "user_note": "Reached home safely.",
        "send_safe_confirmation_update": True,
    }

    res_end = client.post(f"/api/v1/safety-mode/{session_id}/end", json=end_payload, headers=headers)
    assert res_end.status_code == 200
    ended_session = res_end.json()
    assert ended_session["status"] == "ENDED"
    assert ended_session["deactivated_at"] is not None
    assert ended_session["deactivation_reason"] == "user_safe"

    # Current session endpoint now returns 404
    res_none = client.get("/api/v1/safety-mode/current", headers=headers)
    assert res_none.status_code == 404


def test_safety_mode_end_idempotency(setup_safety_mode_users):
    """
    Repeatedly calling end on an already ENDED session returns safely without error.
    """
    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    # Activate new session
    res = client.post("/api/v1/safety-mode/activate", json={}, headers=headers)
    session_id = res.json()["session"]["id"]

    # First end
    res1 = client.post(f"/api/v1/safety-mode/{session_id}/end", json={}, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "ENDED"

    # Second end
    res2 = client.post(f"/api/v1/safety-mode/{session_id}/end", json={}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "ENDED"


def test_safety_mode_unauthorized_access_rejected(setup_safety_mode_users):
    """
    User B cannot inspect or end User A's Safety Mode session (403 Forbidden).
    """
    token_adult = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    token_other = f"dev-token-{setup_safety_mode_users['other_uid']}"

    # Adult creates session
    res = client.post("/api/v1/safety-mode/activate", json={}, headers={"Authorization": f"Bearer {token_adult}"})
    session_id = res.json()["session"]["id"]

    # Other user tries to fetch adult's session
    res_unauth_get = client.get(
        f"/api/v1/safety-mode/{session_id}",
        headers={"Authorization": f"Bearer {token_other}"},
    )
    assert res_unauth_get.status_code == 403

    # Other user tries to end adult's session
    res_unauth_end = client.post(
        f"/api/v1/safety-mode/{session_id}/end",
        json={"deactivation_reason": "malicious_attempt"},
        headers={"Authorization": f"Bearer {token_other}"},
    )
    assert res_unauth_end.status_code == 403


def test_safety_mode_history_endpoint(setup_safety_mode_users):
    """
    History returns user's past sessions in descending chronological order.
    """
    token = f"dev-token-{setup_safety_mode_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/safety-mode/history", headers=headers)
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    # Verify ordered descending
    if len(history) > 1:
        assert history[0]["activated_at"] >= history[1]["activated_at"]
