import pytest
from datetime import datetime, date, timezone, timedelta
from uuid import UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.guardian import Guardian
from app.models.trusted_contact import TrustedContact
from app.models.journey import Journey, JourneyLocationPoint
from app.models.journey_sharing import JourneySharingSession
from app.models.sos import SOSSession
from app.models.notification_log import NotificationLog

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_step12_users():
    """
    Sets up an adult user and an under-18 minor user with a verified guardian for testing Step 12.
    """
    db: Session = SessionLocal()

    # Clean existing test fixtures
    existing_uids = ["test_step12_adult", "test_step12_minor", "test_step12_stranger"]
    existing_users = db.query(User).filter(User.firebase_uid.in_(existing_uids)).all()
    for u in existing_users:
        db.query(NotificationLog).filter(NotificationLog.user_id == u.id).delete()
        db.query(JourneySharingSession).filter(JourneySharingSession.user_id == u.id).delete()
        db.query(SOSSession).filter(SOSSession.user_id == u.id).delete()
        db.query(TrustedContact).filter(TrustedContact.user_id == u.id).delete()
        db.query(Journey).filter(Journey.user_id == u.id).delete()
        db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
        db.delete(u)
    db.commit()

    # 1. Adult User
    adult = User(
        firebase_uid="test_step12_adult",
        full_name="Samantha Adult",
        email="samantha.adult@safesphere.test",
        phone="+15559990001",
        date_of_birth=date(1996, 4, 15),
        age=30,
        is_minor=False,
        user_type="General Public",
        role="USER",
        is_active=True,
    )
    db.add(adult)

    # 2. Minor User with Verified Guardian
    minor = User(
        firebase_uid="test_step12_minor",
        full_name="Leo Minor",
        email="leo.minor@safesphere.test",
        phone="+15559990002",
        date_of_birth=date(2011, 6, 10),
        age=15,
        is_minor=True,
        user_type="Student",
        role="USER",
        is_active=True,
    )
    db.add(minor)

    # 3. Stranger User (for cross-user authorization checks)
    stranger = User(
        firebase_uid="test_step12_stranger",
        full_name="Eve Stranger",
        email="eve.stranger@safesphere.test",
        phone="+15559990003",
        date_of_birth=date(1995, 1, 1),
        age=31,
        is_minor=False,
        user_type="General Public",
        role="USER",
        is_active=True,
    )
    db.add(stranger)
    db.commit()
    db.refresh(adult)
    db.refresh(minor)
    db.refresh(stranger)

    # Attach verified guardian to minor
    guardian = Guardian(
        minor_user_id=minor.id,
        guardian_name="Marcus Guardian",
        guardian_phone="+15559990099",
        guardian_email="marcus.parent@safesphere.test",
        relationship="Parent",
        verification_status="VERIFIED",
        consent_status="ACCEPTED",
    )
    db.add(guardian)
    db.commit()

    db.close()
    return {
        "adult_uid": "test_step12_adult",
        "minor_uid": "test_step12_minor",
        "stranger_uid": "test_step12_stranger",
    }


# =============================================================================
# 1. Trusted Circle Management Tests
# =============================================================================

def test_add_trusted_contact_initial_pending(setup_step12_users):
    """
    Adding a trusted contact creates a record with PENDING verification status.
    """
    token = f"dev-token-{setup_step12_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "contact_name": "Jordan Friend",
        "phone": "+15554441111",
        "email": "jordan@example.com",
        "relationship": "Friend",
        "is_emergency_recipient": True,
        "permissions": {
            "notify_journey_start": True,
            "notify_journey_end": True,
            "notify_safety_mode": True,
            "notify_sos": True,
            "share_live_location": True,
            "notify_emergency_updates": True,
        }
    }

    res = client.post("/api/v1/trusted-contacts", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["contact_name"] == "Jordan Friend"
    assert data["phone"] == "+15554441111"
    assert data["verification_status"] == "PENDING"
    assert data["permissions"]["notify_sos"] is True


def test_reject_duplicate_contact_phone(setup_step12_users):
    """
    Attempting to add a contact with the same phone number triggers a 409 conflict.
    """
    token = f"dev-token-{setup_step12_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "contact_name": "Jordan Duplicate",
        "phone": "+15554441111",
        "relationship": "Friend",
    }
    res = client.post("/api/v1/trusted-contacts", json=payload, headers=headers)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]


def test_verify_trusted_contact_dev_code(setup_step12_users):
    """
    Verifying a contact using the verification code transitions status to VERIFIED.
    """
    token = f"dev-token-{setup_step12_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch contacts
    list_res = client.get("/api/v1/trusted-contacts", headers=headers)
    assert list_res.status_code == 200
    contacts = list_res.json()
    assert len(contacts) > 0
    contact_id = contacts[0]["id"]

    # Wrong code rejected
    bad_res = client.post(f"/api/v1/trusted-contacts/{contact_id}/verify", json={"code": "000000"}, headers=headers)
    assert bad_res.status_code == 400

    # Correct code succeeds
    good_res = client.post(f"/api/v1/trusted-contacts/{contact_id}/verify", json={"code": "123456"}, headers=headers)
    assert good_res.status_code == 200
    assert good_res.json()["verification_status"] == "VERIFIED"


def test_update_trusted_contact_permissions(setup_step12_users):
    """
    User can update contact permissions (e.g. disable journey_start notification).
    """
    token = f"dev-token-{setup_step12_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    list_res = client.get("/api/v1/trusted-contacts", headers=headers)
    contact_id = list_res.json()[0]["id"]

    update_payload = {
        "notify_journey_start": False,
        "relationship": "Roommate",
    }
    res = client.put(f"/api/v1/trusted-contacts/{contact_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["permissions"]["notify_journey_start"] is False
    assert data["relationship"] == "Roommate"


def test_cross_user_contact_access_forbidden(setup_step12_users):
    """
    User B cannot inspect, update, or delete User A's trusted contact.
    """
    adult_token = f"dev-token-{setup_step12_users['adult_uid']}"
    stranger_token = f"dev-token-{setup_step12_users['stranger_uid']}"

    list_res = client.get("/api/v1/trusted-contacts", headers={"Authorization": f"Bearer {adult_token}"})
    contact_id = list_res.json()[0]["id"]

    # Stranger attempts access
    res = client.get(f"/api/v1/trusted-contacts/{contact_id}", headers={"Authorization": f"Bearer {stranger_token}"})
    assert res.status_code == 403

    del_res = client.delete(f"/api/v1/trusted-contacts/{contact_id}", headers={"Authorization": f"Bearer {stranger_token}"})
    assert del_res.status_code == 403


# =============================================================================
# 2. Journey Notifications & Guardian Alerts Tests
# =============================================================================

def test_minor_journey_start_and_end_notifies_guardian(setup_step12_users):
    """
    When an under-18 minor starts and completes an authorized journey,
    the verified guardian receives notification dispatch events in the outbox.
    """
    token = f"dev-token-{setup_step12_users['minor_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Minor starts journey
    journey_payload = {
        "destination_name": "Central High School",
        "title": "Morning Commute",
        "start_latitude": 12.9716,
        "start_longitude": 77.5946,
        "destination_latitude": 12.9800,
        "destination_longitude": 77.6000,
    }
    j_res = client.post("/api/v1/journeys", json=journey_payload, headers=headers)
    assert j_res.status_code == 201
    journey_id = j_res.json()["id"]

    # 2. Check outbox for JOURNEY_STARTED alert sent to guardian
    notifs_res = client.get("/api/v1/notifications", headers=headers)
    assert notifs_res.status_code == 200
    logs = notifs_res.json()
    guardian_start_logs = [l for l in logs if l["event_type"] == "JOURNEY_STARTED" and l["recipient_type"] == "GUARDIAN"]
    assert len(guardian_start_logs) >= 1
    assert "Central High School" in guardian_start_logs[0]["message_content"]

    # 3. Minor ends journey
    end_res = client.post(f"/api/v1/journeys/{journey_id}/end", headers=headers)
    assert end_res.status_code == 200

    # 4. Check outbox for JOURNEY_COMPLETED alert sent to guardian
    notifs_res2 = client.get("/api/v1/notifications", headers=headers)
    logs2 = notifs_res2.json()
    guardian_end_logs = [l for l in logs2 if l["event_type"] == "JOURNEY_COMPLETED" and l["recipient_type"] == "GUARDIAN"]
    assert len(guardian_end_logs) >= 1


# =============================================================================
# 3. Live Location Sharing & Temporary Link Tests
# =============================================================================

def test_live_journey_sharing_session_and_revocation(setup_step12_users):
    """
    User starts a journey, generates a secure time-limited sharing token,
    authorized viewer accesses telemetry, and access ceases when revoked.
    """
    token = f"dev-token-{setup_step12_users['adult_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    # Start journey
    j_res = client.post("/api/v1/journeys", json={
        "destination_name": "City Tech Park",
        "start_latitude": 12.9700,
        "start_longitude": 77.5900,
    }, headers=headers)
    assert j_res.status_code == 201
    journey_id = j_res.json()["id"]

    # Create sharing session
    share_res = client.post("/api/v1/sharing/sessions", json={
        "journey_id": journey_id,
        "duration_hours": 3,
    }, headers=headers)
    assert share_res.status_code == 201
    share_data = share_res.json()
    share_token = share_data["share_token"]
    session_id = share_data["id"]

    # Viewer queries via public token endpoint
    view_res = client.get(f"/api/v1/sharing/sessions/{share_token}")
    assert view_res.status_code == 200
    telemetry = view_res.json()
    assert telemetry["destination_name"] == "City Tech Park"
    assert telemetry["status"] == "ACTIVE"
    assert telemetry["is_active"] is True

    # User revokes sharing session
    revoke_res = client.delete(f"/api/v1/sharing/sessions/{session_id}", headers=headers)
    assert revoke_res.status_code == 200

    # Subsequent access fails with 404
    view_revoked = client.get(f"/api/v1/sharing/sessions/{share_token}")
    assert view_revoked.status_code == 404

    # End the journey to clean up
    client.post(f"/api/v1/journeys/{journey_id}/end", headers=headers)


# =============================================================================
# 4. SOS Emergency System Tests
# =============================================================================

def test_sos_activation_and_guardian_alert(setup_step12_users):
    """
    User activates SOS. Session is created, GPS position recorded,
    and verified contacts and guardians are alerted.
    """
    token = f"dev-token-{setup_step12_users['minor_uid']}"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "latitude": 12.9720,
        "longitude": 77.5950,
        "accuracy": 8.5,
        "emergency_notes": "Cornered near unlit alley",
    }
    sos_res = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert sos_res.status_code == 201
    sos_data = sos_res.json()

    assert sos_data["status"] == "ACTIVE"
    assert sos_data["initial_latitude"] == 12.9720
    assert sos_data["guardian_alerted"] is True
    assert len(sos_data["notifications"]) >= 1

    session_id = sos_data["id"]

    # Query current SOS
    curr_res = client.get("/api/v1/sos/current", headers=headers)
    assert curr_res.status_code == 200
    assert curr_res.json()["id"] == session_id

    # Update foreground location
    loc_res = client.post(f"/api/v1/sos/{session_id}/location", json={
        "latitude": 12.9725,
        "longitude": 77.5955,
        "accuracy": 5.0,
    }, headers=headers)
    assert loc_res.status_code == 200
    assert loc_res.json()["latest_latitude"] == 12.9725

    # End SOS
    end_res = client.post(f"/api/v1/sos/{session_id}/end", json={
        "deactivation_reason": "Police escort arrived"
    }, headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "ENDED"

    # Current SOS is now None
    curr_res2 = client.get("/api/v1/sos/current", headers=headers)
    assert curr_res2.status_code == 200
    assert curr_res2.json() is None


def test_sos_idempotency_and_cross_user_isolation(setup_step12_users):
    """
    Repeated activate call returns existing active session.
    Stranger cannot view or end user's SOS session.
    """
    adult_token = f"dev-token-{setup_step12_users['adult_uid']}"
    stranger_token = f"dev-token-{setup_step12_users['stranger_uid']}"

    # Activate SOS for adult
    res1 = client.post("/api/v1/sos/activate", json={"latitude": 12.90, "longitude": 77.50}, headers={"Authorization": f"Bearer {adult_token}"})
    assert res1.status_code == 201
    session_id = res1.json()["id"]

    # Second call returns same session
    res2 = client.post("/api/v1/sos/activate", json={"latitude": 12.91, "longitude": 77.51}, headers={"Authorization": f"Bearer {adult_token}"})
    assert res2.status_code == 201
    assert res2.json()["id"] == session_id

    # Stranger attempts to end adult's SOS session
    cross_end = client.post(f"/api/v1/sos/{session_id}/end", json={}, headers={"Authorization": f"Bearer {stranger_token}"})
    assert cross_end.status_code == 403

    # Clean up
    client.post(f"/api/v1/sos/{session_id}/end", json={}, headers={"Authorization": f"Bearer {adult_token}"})
