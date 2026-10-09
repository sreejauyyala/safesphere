import pytest
from datetime import datetime, date, timezone, timedelta
from uuid import UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, init_db
from app.core.config import settings
from app.models.user import User
from app.models.guardian import Guardian
from app.models.trusted_contact import TrustedContact
from app.models.journey import Journey
from app.models.journey_sharing import JourneySharingSession
from app.models.sos import SOSSession
from app.models.safety_mode import SafetyModeSession
from app.models.notification_log import NotificationLog
from app.services.sms_provider import (
    BaseSMSProvider,
    SMSDeliveryResult,
    DeliveryStatus,
    DevMockSMSProvider,
)
import app.services.notification_service as notif_service_mod
import app.services.sms_provider as sms_prov_mod

init_db()
client = TestClient(app)


@pytest.fixture(scope="function")
def integration_data():
    """
    Sets up a clean set of test users, contacts, and guardians for each test.
    """
    db: Session = SessionLocal()

    # Clean existing test fixtures
    uids = ["int_test_adult", "int_test_minor", "int_test_stranger"]
    existing_users = db.query(User).filter(User.firebase_uid.in_(uids)).all()
    for u in existing_users:
        db.query(NotificationLog).filter(NotificationLog.user_id == u.id).delete()
        db.query(JourneySharingSession).filter(JourneySharingSession.user_id == u.id).delete()
        db.query(SOSSession).filter(SOSSession.user_id == u.id).delete()
        db.query(SafetyModeSession).filter(SafetyModeSession.user_id == u.id).delete()
        db.query(TrustedContact).filter(TrustedContact.user_id == u.id).delete()
        db.query(Journey).filter(Journey.user_id == u.id).delete()
        db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
        db.delete(u)
    db.commit()

    # 1. Adult User
    adult = User(
        firebase_uid="int_test_adult",
        full_name="Alice Adult",
        email="alice.int@safesphere.test",
        phone="+15551000001",
        date_of_birth=date(1995, 3, 20),
        age=31,
        is_minor=False,
        user_type="General Public",
        role="USER",
        is_active=True,
    )
    db.add(adult)

    # 2. Minor User
    minor = User(
        firebase_uid="int_test_minor",
        full_name="Ben Minor",
        email="ben.int@safesphere.test",
        phone="+15551000002",
        date_of_birth=date(2011, 8, 15),
        age=15,
        is_minor=True,
        user_type="Student",
        role="USER",
        is_active=True,
    )
    db.add(minor)
    db.commit()
    db.refresh(adult)
    db.refresh(minor)

    # Verified Contact 1: Location sharing authorized
    c1 = TrustedContact(
        user_id=adult.id,
        contact_name="Verified Contact Location-Allowed",
        phone="+15552000001",
        email="contact1@test.com",
        relationship="Sister",
        verification_status="VERIFIED",
        is_emergency_recipient=True,
        notify_safety_mode=True,
        notify_sos=True,
        share_live_location=True,
        is_active=True,
    )
    db.add(c1)

    # Verified Contact 2: Location sharing NOT authorized
    c2 = TrustedContact(
        user_id=adult.id,
        contact_name="Verified Contact Location-Withheld",
        phone="+15552000002",
        email="contact2@test.com",
        relationship="Colleague",
        verification_status="VERIFIED",
        is_emergency_recipient=True,
        notify_safety_mode=True,
        notify_sos=True,
        share_live_location=False,
        is_active=True,
    )
    db.add(c2)

    # Contact 3: Unverified (PENDING)
    c3 = TrustedContact(
        user_id=adult.id,
        contact_name="Unverified Contact",
        phone="+15552000003",
        email="contact3@test.com",
        relationship="Neighbor",
        verification_status="PENDING",
        is_emergency_recipient=True,
        notify_safety_mode=True,
        notify_sos=True,
        share_live_location=True,
        is_active=True,
    )
    db.add(c3)

    # Contact 4: Notifications disabled
    c4 = TrustedContact(
        user_id=adult.id,
        contact_name="Opted Out Contact",
        phone="+15552000004",
        email="contact4@test.com",
        relationship="Friend",
        verification_status="VERIFIED",
        is_emergency_recipient=False,
        notify_safety_mode=False,
        notify_sos=False,
        share_live_location=False,
        is_active=True,
    )
    db.add(c4)

    # Verified Guardian for Minor
    guardian_verified = Guardian(
        minor_user_id=minor.id,
        guardian_name="Verified Parent",
        guardian_phone="+15553000001",
        guardian_email="parent.verified@test.com",
        relationship="Parent",
        verification_status="VERIFIED",
        consent_status="ACCEPTED",
    )
    db.add(guardian_verified)

    db.commit()
    db.refresh(c1)
    db.refresh(c2)
    db.refresh(c3)
    db.refresh(c4)
    db.refresh(guardian_verified)

    user_info = {
        "adult_id": str(adult.id),
        "adult_uid": adult.firebase_uid,
        "minor_id": str(minor.id),
        "minor_uid": minor.firebase_uid,
        "c1_id": str(c1.id),
        "c2_id": str(c2.id),
        "c3_id": str(c3.id),
        "c4_id": str(c4.id),
        "guardian_id": str(guardian_verified.id),
    }

    db.close()
    yield user_info

    # Cleanup after test
    cleanup_db = SessionLocal()
    for u_uid in uids:
        u_obj = cleanup_db.query(User).filter(User.firebase_uid == u_uid).first()
        if u_obj:
            cleanup_db.query(NotificationLog).filter(NotificationLog.user_id == u_obj.id).delete()
            cleanup_db.query(JourneySharingSession).filter(JourneySharingSession.user_id == u_obj.id).delete()
            cleanup_db.query(SOSSession).filter(SOSSession.user_id == u_obj.id).delete()
            cleanup_db.query(SafetyModeSession).filter(SafetyModeSession.user_id == u_obj.id).delete()
            cleanup_db.query(TrustedContact).filter(TrustedContact.user_id == u_obj.id).delete()
            cleanup_db.query(Journey).filter(Journey.user_id == u_obj.id).delete()
            cleanup_db.query(Guardian).filter(Guardian.minor_user_id == u_obj.id).delete()
            cleanup_db.delete(u_obj)
    cleanup_db.commit()
    cleanup_db.close()


# =============================================================================
# 1. Safety Mode Integration Tests
# =============================================================================

def test_safety_mode_creates_preventive_alert_and_respects_permissions(integration_data, monkeypatch):
    """
    1. Safety Mode creates a preventive safety notification event (SAFETY_MODE_ACTIVATED).
    2. Only authorized eligible contacts receive alerts.
    3. Contact with share_live_location=False does NOT have coordinates in message.
    4. Contact with share_live_location=True has coordinates or journey info.
    5. Detail response includes notifications list with location_shared accurately flagged.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "notify_trusted_contacts": True,
        "user_note": "Feeling followed near market street",
    }

    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["session"]["status"] == "ACTIVE"
    assert data["session"]["notification_status"] in ("SENT", "PENDING")
    assert data["recipients_count"] == 2  # Only c1 and c2 are eligible (c3 unverified, c4 opted-out)

    # Verify notifications array in response
    notifs = data["notifications"]
    assert len(notifs) == 2

    c1_notif = next((n for n in notifs if n["recipient_name"] == "Verified Contact Location-Allowed"), None)
    c2_notif = next((n for n in notifs if n["recipient_name"] == "Verified Contact Location-Withheld"), None)

    assert c1_notif is not None
    assert c1_notif["location_shared"] is True
    assert c1_notif["delivery_status"] in ("SENT", "DELIVERED")

    assert c2_notif is not None
    assert c2_notif["location_shared"] is False
    assert c2_notif["delivery_status"] in ("SENT", "DELIVERED")

    # Verify NotificationLog rows in database
    db = SessionLocal()
    logs = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SAFETY_MODE_ACTIVATED",
        )
        .all()
    )
    assert len(logs) == 2

    # Verify that contact without permission did NOT have coordinates in message body
    log_c2 = next(l for l in logs if l.recipient_name == "Verified Contact Location-Withheld")
    assert "37.7749" not in log_c2.message_content
    assert "-122.4194" not in log_c2.message_content
    assert "has activated Safety Mode and may need assistance." in log_c2.message_content
    assert "Open SafeSphere to view shared journey information if you are authorized." in log_c2.message_content

    # Verify contact with permission received coordinates
    log_c1 = next(l for l in logs if l.recipient_name == "Verified Contact Location-Allowed")
    assert "37.7749" in log_c1.message_content
    assert "-122.4194" in log_c1.message_content

    db.close()


def test_safety_mode_idempotent_activation(integration_data, monkeypatch):
    """
    Duplicate requests during an active Safety Mode session must not create duplicate notifications.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "notify_trusted_contacts": True,
    }

    # First activation
    res1 = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res1.status_code == 201
    sess_id = res1.json()["session"]["id"]

    db = SessionLocal()
    count_first = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SAFETY_MODE_ACTIVATED",
        )
        .count()
    )
    assert count_first == 2
    db.close()

    # Second activation call while still active
    res2 = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res2.status_code in (200, 201)
    assert res2.json()["session"]["id"] == sess_id

    # Count must remain 2 (no duplicate notifications)
    db = SessionLocal()
    count_second = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SAFETY_MODE_ACTIVATED",
        )
        .count()
    )
    assert count_second == 2
    db.close()


def test_safety_mode_unconfigured_provider(integration_data, monkeypatch):
    """
    Missing provider shows NOT_CONFIGURED. No false claims of delivery.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", False)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "")
    monkeypatch.setattr(settings, "SMS_PROVIDER_ACCOUNT_SID", "")
    monkeypatch.setattr(settings, "SMS_PROVIDER_AUTH_TOKEN", "")
    monkeypatch.setattr(settings, "SMS_PROVIDER_API_KEY", "")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "notify_trusted_contacts": True,
    }

    res = client.post("/api/v1/safety-mode/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["session"]["notification_status"] == "NOT_CONFIGURED"
    assert data["provider_configured"] is False
    assert any(n["delivery_status"] == "NOT_CONFIGURED" for n in data["notifications"])


# =============================================================================
# 2. SOS Emergency Integration Tests
# =============================================================================

def test_sos_creates_urgent_alert_and_scoped_live_sharing(integration_data, monkeypatch):
    """
    1. SOS creates an urgent alert event (SOS_ACTIVATED).
    2. Suggest message is dispatched.
    3. Scoped JourneySharingSession is provisioned.
    4. Location is included for Contact 1 (permitted) and withheld for Contact 2 (withheld).
    5. Detail response returns valid location_sharing_url.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 10.0,
        "emergency_notes": "Immediate assistance needed",
    }

    res = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["status"] == "ACTIVE"
    assert data["recipients_count"] == 2
    assert data["location_sharing_url"] is not None
    assert data["location_sharing_active"] is True

    # Check recipient notification statuses
    notifs = data["notifications"]
    assert len(notifs) == 2

    c1_notif = next(n for n in notifs if n["recipient_name"] == "Verified Contact Location-Allowed")
    c2_notif = next(n for n in notifs if n["recipient_name"] == "Verified Contact Location-Withheld")

    assert c1_notif["location_shared"] is True
    assert c2_notif["location_shared"] is False

    # Check notification log message contents
    db = SessionLocal()
    logs = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SOS_ACTIVATED",
        )
        .all()
    )
    assert len(logs) == 2

    log_c1 = next(l for l in logs if l.recipient_name == "Verified Contact Location-Allowed")
    log_c2 = next(l for l in logs if l.recipient_name == "Verified Contact Location-Withheld")

    assert "SafeSphere SOS ALERT:" in log_c1.message_content
    assert "has activated an emergency alert" in log_c1.message_content
    assert "Check their authorized shared location and contact them if possible" in log_c1.message_content
    assert "Live tracker:" in log_c1.message_content
    assert "37.7749" in log_c1.message_content

    assert "SafeSphere SOS ALERT:" in log_c2.message_content
    assert "has activated an emergency alert" in log_c2.message_content
    assert "Live tracker:" not in log_c2.message_content
    assert "37.7749" not in log_c2.message_content

    # Public sharing session check
    sharing_url = data["location_sharing_url"]
    token = sharing_url.split("/shared-journey/")[1]
    public_res = client.get(f"/api/v1/sharing/sessions/{token}")
    assert public_res.status_code == 200
    assert public_res.json()["is_active"] is True

    db.close()


def test_sos_idempotent_activation(integration_data, monkeypatch):
    """
    Repeated calls to /sos/activate while active must not create duplicate notifications.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
    }

    res1 = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res1.status_code == 201
    sess_id = res1.json()["id"]

    db = SessionLocal()
    count_first = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SOS_ACTIVATED",
        )
        .count()
    )
    assert count_first == 2
    db.close()

    # Second call
    res2 = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res2.status_code in (200, 201)
    assert res2.json()["id"] == sess_id

    db = SessionLocal()
    count_second = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == UUID(integration_data["adult_id"]),
            NotificationLog.event_type == "SOS_ACTIVATED",
        )
        .count()
    )
    assert count_second == 2
    db.close()


def test_end_sos_revokes_sharing_session_and_preserves_independent_journey(integration_data, monkeypatch):
    """
    1. Ending SOS revokes temporary JourneySharingSession.
    2. If user already had an independent commute journey, it remains ACTIVE.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    db = SessionLocal()
    # Create independent user commute journey
    commute_journey = Journey(
        user_id=UUID(integration_data["adult_id"]),
        title="Evening Commute Home",
        destination_name="Home",
        start_latitude=37.7749,
        start_longitude=-122.4194,
        status="ACTIVE",
    )
    db.add(commute_journey)
    db.commit()
    db.refresh(commute_journey)
    db.close()

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}

    # Activate SOS with journey_id
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "journey_id": str(commute_journey.id),
    }
    res_act = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res_act.status_code == 201
    sos_data = res_act.json()
    sos_id = sos_data["id"]
    sharing_url = sos_data["location_sharing_url"]
    token = sharing_url.split("/shared-journey/")[1]

    # Verify sharing token is active
    pub_res = client.get(f"/api/v1/sharing/sessions/{token}")
    assert pub_res.status_code == 200

    # End SOS
    res_end = client.post(f"/api/v1/sos/{sos_id}/end", json={"deactivation_reason": "I am safe now"}, headers=headers)
    assert res_end.status_code == 200
    assert res_end.json()["status"] == "ENDED"

    # Token must now be revoked (404)
    pub_res_after = client.get(f"/api/v1/sharing/sessions/{token}")
    assert pub_res_after.status_code == 404

    # The user's commuting journey must still be ACTIVE!
    db = SessionLocal()
    refreshed_journey = db.query(Journey).filter(Journey.id == commute_journey.id).first()
    assert refreshed_journey.status == "ACTIVE"
    db.close()


def test_minor_sos_alerts_verified_guardian_only(integration_data, monkeypatch):
    """
    For minor accounts, only verified guardians with accepted consent receive SOS notifications.
    Unverified contacts or unverified guardians are excluded.
    """
    monkeypatch.setattr(settings, "OTP_DEV_MODE", True)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "dev")

    headers = {"Authorization": f"Bearer dev-token-{integration_data['minor_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
    }

    res = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["guardian_alerted"] is True
    assert data["recipients_count"] == 1

    notifs = data["notifications"]
    assert len(notifs) == 1
    assert notifs[0]["recipient_type"] == "GUARDIAN"
    assert notifs[0]["recipient_name"] == "Verified Parent"


def test_sos_provider_failure_truthfully_reported(integration_data, monkeypatch):
    """
    When notification provider fails, delivery status is truthfully reported as FAILED.
    """
    class FailingSMSProvider(BaseSMSProvider):
        def is_configured(self) -> bool:
            return True

        async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="mock_failing",
                error_message="Gateway connection timed out",
            )

    failing = FailingSMSProvider()
    monkeypatch.setattr(sms_prov_mod, "get_sms_provider", lambda: failing)
    monkeypatch.setattr(notif_service_mod, "get_sms_provider", lambda: failing)

    headers = {"Authorization": f"Bearer dev-token-{integration_data['adult_uid']}"}
    payload = {
        "latitude": 37.7749,
        "longitude": -122.4194,
    }

    res = client.post("/api/v1/sos/activate", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    # Recipient notifications must reflect FAILED and include error message
    assert len(data["notifications"]) == 2
    for notif in data["notifications"]:
        assert notif["delivery_status"] == "FAILED"
        assert "Gateway connection timed out" in (notif.get("error_message") or "")
