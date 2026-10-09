import re
import pytest
from datetime import datetime, date, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from app.main import app
# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.core.database import SessionLocal, init_db
# pyrefly: ignore [missing-import]
from app.core.phone_utils import mask_email
# pyrefly: ignore [missing-import]
from app.models.user import User
# pyrefly: ignore [missing-import]
from app.models.guardian import Guardian, GuardianVerificationChallenge
# pyrefly: ignore [missing-import]
from app.services.otp_service import format_otp_email
# pyrefly: ignore [missing-import]
from app.services.email_provider import (
    DeliveryStatus,
    ResendEmailProvider,
    SendGridEmailProvider,
    DevMockEmailProvider,
)

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def setup_email_test_users():
    """Sets up test minor user for email OTP delivery tests."""
    db: Session = SessionLocal()

    # Clean existing fixtures
    uids = ["test_otp_email_minor_01", "test_otp_email_minor_02"]
    existing = db.query(User).filter(User.firebase_uid.in_(uids)).all()
    for u in existing:
        db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.minor_user_id == u.id).delete()
        db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
        db.delete(u)
    db.commit()

    minor = User(
        firebase_uid="test_otp_email_minor_01",
        full_name="Ananya Minor",
        email="ananya.minor@example.com",
        phone="+919876543222",
        date_of_birth=date(2009, 8, 15),
        age=17,
        is_minor=True,
        user_type="Student",
        role="USER",
        is_active=True,
    )
    db.add(minor)
    db.commit()
    db.refresh(minor)
    db.close()

    return {"minor": minor}


def test_format_otp_email():
    """Verifies format_otp_email returns expected subject and body containing code and 5 minute expiry."""
    subject, text, html = format_otp_email("492019", 300)
    assert "SafeSphere" in subject
    assert "Guardian Verification Code" in subject
    assert "492019" in text
    assert "expires in 5 minutes" in text
    assert "Do not share" in text
    assert "492019" in html


def test_dev_mock_email_provider_captures_otp():
    """Verifies that DevMockEmailProvider captures dispatched emails for testing."""
    DevMockEmailProvider.clear()
    provider = DevMockEmailProvider()
    assert provider.is_configured() is True

    import anyio
    res = anyio.run(provider.send_email, "parent@example.com", "Test Subject", "Your code is 654321", None)
    assert res.success is True
    assert res.status == DeliveryStatus.REQUEST_ACCEPTED
    assert res.provider_name == "dev_mock"

    latest = DevMockEmailProvider.get_latest_for("parent@example.com")
    assert latest is not None
    assert latest["to"] == "parent@example.com"
    assert "654321" in latest["body"]


def test_email_masking():
    """Verifies email masking hides characters before @ sign."""
    assert mask_email("victor@gmail.com") == "v******@gmail.com"
    assert mask_email("patricia.miller@example.org") == "p******@example.org"
    assert mask_email("a@b.com") == "a******@b.com"


def test_request_and_verify_email_otp_flow(setup_email_test_users):
    """
    End-to-end test of selecting Email delivery:
    1. Register guardian with valid email.
    2. Request OTP via delivery_method='email'.
    3. Verify real OTP dispatched to DevMockEmailProvider.
    4. Submit received OTP to verify-otp endpoint.
    5. Confirm guardian email_verified=True and verification_status='VERIFIED'.
    """
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    DevMockEmailProvider.clear()

    # 1. Register guardian
    g_res = client.post(
        "/api/v1/guardians",
        headers=headers,
        json={
            "guardian_name": "Deepa Sharma",
            "guardian_phone": "+91 98765 88888",
            "guardian_email": "deepa.guardian@example.com",
            "relationship": "Mother",
        },
    )
    assert g_res.status_code == 201
    g_data = g_res.json()
    guardian_id = g_data["id"]

    # 2. Request OTP via email
    # Clear any challenges to bypass cooldown from registration auto-dispatch
    db = SessionLocal()
    import uuid as _uuid
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == _uuid.UUID(str(guardian_id))).delete()
    db.commit()
    db.close()

    req_res = client.post(
        "/api/v1/guardians/request-otp",
        headers=headers,
        json={"guardian_id": str(guardian_id), "delivery_method": "email"},
    )
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["success"] is True
    assert req_data["delivery_method"] == "email"
    assert req_data["masked_destination"] == "d******@example.com"
    assert req_data["delivery_status"] in (DeliveryStatus.REQUEST_ACCEPTED, DeliveryStatus.NOT_CONFIGURED)
    challenge_id = req_data["challenge_id"]

    # 3. Inspect captured email
    captured = DevMockEmailProvider.get_latest_for("deepa.guardian@example.com")
    assert captured is not None
    match = re.search(r"\b(\d{6})\b", captured["body"])
    assert match is not None
    real_otp = match.group(1)

    # 4. Verify OTP using the real extracted OTP
    verify_res = client.post(
        "/api/v1/guardians/verify-otp",
        headers=headers,
        json={"otp": real_otp, "challenge_id": challenge_id},
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["verification_status"] == "VERIFIED"
    assert v_data["consent_status"] == "ACCEPTED"
    assert v_data["email_verified"] is True
    assert v_data["verified_delivery_method"] == "email"


def test_request_email_otp_without_guardian_email_rejected(setup_email_test_users):
    """Verifies that requesting Email delivery when no email was provided returns 400 Bad Request."""
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    # Update guardian to remove email
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    assert guardian is not None
    guardian.guardian_email = None
    guardian.verification_status = "PENDING"
    # Delete challenges to avoid cooldown
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    res = client.post(
        "/api/v1/guardians/request-otp",
        headers=headers,
        json={"delivery_method": "email"},
    )
    assert res.status_code == 400
    assert "email address is not registered" in res.json()["detail"].lower()


def test_unconfigured_email_provider_returns_503(setup_email_test_users):
    """Verifies that requesting Email OTP when email gateway is unconfigured returns 503."""
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    assert guardian is not None
    guardian.guardian_email = "test.unconfigured@example.com"
    guardian.verification_status = "PENDING"
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    with patch.object(settings, "OTP_DEV_MODE", False), patch.object(settings, "EMAIL_PROVIDER", ""), patch.object(settings, "SMTP_HOST", ""), patch.object(settings, "EMAIL_API_KEY", ""):
        res = client.post(
            "/api/v1/guardians/request-otp",
            headers=headers,
            json={"delivery_method": "email"},
        )
        assert res.status_code == 503
        assert "Email verification is not configured" in res.json()["detail"]


@pytest.mark.anyio
async def test_resend_email_provider_dispatch():
    """Verifies ResendEmailProvider sends via HTTP REST API."""
    provider = ResendEmailProvider()
    provider.api_key = "re_test_key_123"
    provider.from_address = "noreply@safesphere.app"
    assert provider.is_configured() is True

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"content-type": "application/json"}
        mock_resp.json.return_value = {"id": "resend_msg_001"}
        mock_post.return_value = mock_resp

        res = await provider.send_email(
            "parent@example.com",
            "SafeSphere Verification",
            "Your code is 123456",
            "<p>Your code is 123456</p>",
        )
        assert res.success is True
        assert res.status == DeliveryStatus.REQUEST_ACCEPTED
        assert res.provider_name == "resend"
        assert res.provider_message_id == "resend_msg_001"


@pytest.mark.anyio
async def test_sendgrid_email_provider_dispatch():
    """Verifies SendGridEmailProvider sends via HTTP REST API."""
    provider = SendGridEmailProvider()
    provider.api_key = "SG.test_key_123"
    provider.from_address = "noreply@safesphere.app"
    assert provider.is_configured() is True

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 202
        mock_resp.headers = {"X-Message-Id": "sg_msg_002"}
        mock_post.return_value = mock_resp

        res = await provider.send_email(
            "parent@example.com",
            "SafeSphere Verification",
            "Your code is 123456",
            None,
        )
        assert res.success is True
        assert res.status == DeliveryStatus.REQUEST_ACCEPTED
        assert res.provider_name == "sendgrid"
        assert res.provider_message_id == "sg_msg_002"


def test_cross_channel_challenge_mismatch(setup_email_test_users):
    """Verifies that an OTP challenge issued for SMS cannot be verified as Email (and vice versa)."""
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    guardian.guardian_email = "parent.channel@example.com"
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()

    # Create an SMS challenge
    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=minor.id,
        phone_number=guardian.guardian_phone,
        delivery_method="sms",
        destination=guardian.guardian_phone,
        otp_hash="some_hash",
        otp_salt="some_salt",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts_used=0,
        max_attempts=5,
        delivery_status=DeliveryStatus.REQUEST_ACCEPTED,
        provider_name="twilio",
    )
    db.add(ch)
    db.commit()
    challenge_id = str(ch.id)
    db.close()

    # Attempt to verify submitting delivery_method='email' on an 'sms' challenge
    res = client.post(
        "/api/v1/guardians/verify-otp",
        headers=headers,
        json={
            "challenge_id": challenge_id,
            "otp_code": "123456",
            "delivery_method": "email",
        },
    )
    assert res.status_code == 400
    assert "Cross-channel mismatch" in res.json()["detail"]


def test_challenge_id_mismatch(setup_email_test_users):
    """Verifies that an arbitrary non-existent or mismatched challenge_id is rejected with 404."""
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    import uuid
    random_challenge_id = str(uuid.uuid4())
    res = client.post(
        "/api/v1/guardians/verify-otp",
        headers=headers,
        json={
            "challenge_id": random_challenge_id,
            "otp_code": "123456",
        },
    )
    assert res.status_code == 404
    assert "Verification challenge not found" in res.json()["detail"]


def test_cooldown_not_triggered_by_unconfigured_or_failed_requests(setup_email_test_users):
    """Verifies that an unconfigured or failed request does NOT trigger a 60-second cooldown."""
    minor = setup_email_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    guardian.guardian_email = "parent.cooldown@example.com"
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    with patch.object(settings, "OTP_DEV_MODE", False), patch.object(settings, "EMAIL_PROVIDER", ""), patch.object(settings, "SMTP_HOST", ""):
        # First request returns 503 (unconfigured)
        res1 = client.post(
            "/api/v1/guardians/request-otp",
            headers=headers,
            json={"delivery_method": "email"},
        )
        assert res1.status_code == 503

        # Immediate second request should return 503 again, NOT 429 cooldown lockout!
        res2 = client.post(
            "/api/v1/guardians/request-otp",
            headers=headers,
            json={"delivery_method": "email"},
        )
        assert res2.status_code == 503
        assert "429" not in str(res2.status_code)

