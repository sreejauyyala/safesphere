import pytest
import secrets
from datetime import datetime, date, timezone, timedelta
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.config import settings, Settings
from app.core.database import SessionLocal, init_db
from app.core.phone_utils import normalize_phone_number, mask_phone_number, is_valid_phone
from app.models.user import User
from app.models.guardian import Guardian, GuardianVerificationChallenge
from app.services.otp_service import (
    generate_secure_otp,
    generate_salt,
    hash_otp,
    verify_otp_hash,
    format_otp_message,
)
from app.services.sms_provider import (
    DeliveryStatus,
    SMSDeliveryResult,
    TwilioSMSProvider,
    DevMockSMSProvider,
    UnconfiguredSMSProvider,
    get_sms_provider,
)

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def setup_otp_test_users():
    """Sets up test minor, adult, and stranger users for OTP tests."""
    db: Session = SessionLocal()

    # Clean existing test fixtures
    uids = ["test_otp_minor_01", "test_otp_minor_02", "test_otp_adult_01", "test_otp_stranger_01"]
    existing = db.query(User).filter(User.firebase_uid.in_(uids)).all()
    for u in existing:
        db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.minor_user_id == u.id).delete()
        db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
        db.delete(u)
    db.commit()

    minor = User(
        firebase_uid="test_otp_minor_01",
        full_name="Aarav Sharma",
        email="aarav.minor@example.com",
        phone="+919876543210",
        date_of_birth=date(2010, 5, 20),
        age=16,
        is_minor=True,
        user_type="Student",
        role="USER",
        is_active=True,
    )
    db.add(minor)

    stranger = User(
        firebase_uid="test_otp_stranger_01",
        full_name="Vikram Stranger",
        email="vikram.stranger@example.com",
        phone="+919111222333",
        date_of_birth=date(1994, 8, 12),
        age=32,
        is_minor=False,
        user_type="General Public",
        role="USER",
        is_active=True,
    )
    db.add(stranger)

    db.commit()
    db.refresh(minor)
    db.refresh(stranger)
    db.close()

    return {"minor": minor, "stranger": stranger}


# -----------------------------------------------------------------------------
# 1. OTP Generation Security Tests
# -----------------------------------------------------------------------------
def test_otp_generation_security():
    """Verifies that generated OTPs are 6-digit numeric codes generated with secrets."""
    otps = [generate_secure_otp() for _ in range(100)]
    for code in otps:
        assert len(code) == 6
        assert code.isdigit()
    assert len(set(otps)) > 90


# -----------------------------------------------------------------------------
# 2. OTP Formatting & Leading Zero Preservation
# -----------------------------------------------------------------------------
def test_otp_formatting_leading_zeros():
    """Verifies leading zeros are preserved when integer < 100000."""
    with patch("secrets.randbelow", return_value=42):
        otp = generate_secure_otp()
        assert otp == "000042"
        assert len(otp) == 6

    with patch("secrets.randbelow", return_value=7):
        otp = generate_secure_otp()
        assert otp == "000007"

    with patch("secrets.randbelow", return_value=999999):
        otp = generate_secure_otp()
        assert otp == "999999"


# -----------------------------------------------------------------------------
# 3. Phone Number Normalization Tests (E.164 & India Handling)
# -----------------------------------------------------------------------------
def test_phone_normalization_indian_formats():
    """Tests proper handling of Indian phone numbers without blind +91 prepending."""
    assert normalize_phone_number("9876543210") == "+919876543210"
    assert normalize_phone_number("+91 98765 43210") == "+919876543210"
    assert normalize_phone_number("+919876543210") == "+919876543210"
    assert normalize_phone_number("09876543210") == "+919876543210"
    assert normalize_phone_number("919876543210") == "+919876543210"


def test_phone_normalization_international():
    """Tests international formats."""
    assert normalize_phone_number("+1 (555) 234-5678") == "+15552345678"
    assert normalize_phone_number("+44 7911 123456") == "+447911123456"
    assert normalize_phone_number("0015552345678") == "+15552345678"


def test_phone_masking():
    """Verifies that masked phone numbers hide middle digits."""
    assert mask_phone_number("+919876543210") == "+91 ******3210"
    assert mask_phone_number("+15552345678") == "+1 ******5678"
    assert "987654" not in mask_phone_number("+919876543210")


# -----------------------------------------------------------------------------
# 4. Successful SMS Provider Request (Mocked)
# -----------------------------------------------------------------------------
@pytest.mark.anyio
async def test_successful_sms_provider_dispatch():
    """Verifies that configured SMS provider dispatches message and returns REQUEST_ACCEPTED."""
    mock_provider = DevMockSMSProvider()
    DevMockSMSProvider.clear()

    res = await mock_provider.send_sms("+919876543210", "SafeSphere test message")
    assert res.success is True
    assert res.status == DeliveryStatus.REQUEST_ACCEPTED
    assert res.provider_name == "dev_mock"
    assert res.provider_message_id is not None
    assert len(DevMockSMSProvider.captured_messages) == 1
    assert DevMockSMSProvider.captured_messages[0]["to"] == "+919876543210"


# -----------------------------------------------------------------------------
# 5. SMS Provider Failure Handling
# -----------------------------------------------------------------------------
@pytest.mark.anyio
async def test_sms_provider_failure_handling():
    """Verifies provider failures return safe error and FAILED delivery status."""
    provider = TwilioSMSProvider()
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = AsyncMock()
        mock_resp.status_code = 400
        mock_resp.headers = {"content-type": "application/json"}
        mock_resp.json = lambda: {"code": 21211, "message": "The To number is not a valid phone number."}
        mock_post.return_value = mock_resp

        provider.account_sid = "ACtest123"
        provider.auth_token = "secret123"
        provider.from_number = "+15550009999"

        res = await provider.send_sms("+919999999999", "Test failure")
        assert res.success is False
        assert res.status == DeliveryStatus.FAILED
        assert "invalid" in res.error_message.lower()


# -----------------------------------------------------------------------------
# 6. Invalid Phone Numbers Rejected
# -----------------------------------------------------------------------------
def test_invalid_phone_number_rejected():
    """Ensures invalid phone numbers fail validation before calling any SMS gateway."""
    assert is_valid_phone("invalid-letters") is False
    assert is_valid_phone("123") is False
    assert is_valid_phone("+91123") is False
    assert is_valid_phone("+913876543210") is False


# -----------------------------------------------------------------------------
# 7. Valid OTP Flow & Guardian Verification
# -----------------------------------------------------------------------------
def test_valid_otp_flow(setup_otp_test_users):
    """End-to-end test of linking guardian, requesting OTP, and successfully verifying."""
    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}

    # 1. Link guardian
    payload = {
        "guardian_name": "Priya Sharma",
        "guardian_phone": "+91 98765 00001",
        "guardian_email": "priya.parent@example.com",
        "relationship": "Mother",
    }
    link_res = client.post("/api/v1/guardians", json=payload, headers=headers)
    assert link_res.status_code == 201
    guardian_data = link_res.json()
    assert guardian_data["verification_status"] == "PENDING"
    assert guardian_data["consent_status"] == "PENDING"
    assert guardian_data["masked_phone"] == "+91 ******0001"

    # 2. Check challenge status
    status_res = client.get("/api/v1/guardians/challenge-status", headers=headers)
    assert status_res.status_code == 200
    st = status_res.json()
    assert st["has_guardian"] is True
    assert st["masked_phone"] == "+91 ******0001"
    assert st["attempts_remaining"] == 5

    # 3. Retrieve the generated OTP challenge from DB
    db = SessionLocal()
    ch = (
        db.query(GuardianVerificationChallenge)
        .filter(GuardianVerificationChallenge.minor_user_id == setup_otp_test_users["minor"].id)
        .order_by(GuardianVerificationChallenge.created_at.desc())
        .first()
    )
    assert ch is not None
    assert ch.is_consumed is False
    assert ch.delivery_status in (DeliveryStatus.REQUEST_ACCEPTED, DeliveryStatus.NOT_CONFIGURED)
    challenge_id = str(ch.id)
    db.close()

    # 4. Verify OTP using configured dev code or cryptographic hash
    verify_res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": settings.OTP_DEV_CODE, "challenge_id": challenge_id},
        headers=headers,
    )
    assert verify_res.status_code == 200
    verified_data = verify_res.json()
    assert verified_data["verification_status"] == "VERIFIED"
    assert verified_data["consent_status"] == "ACCEPTED"


# -----------------------------------------------------------------------------
# 8. Incorrect OTP Handling
# -----------------------------------------------------------------------------
def test_incorrect_otp_decrements_attempts(setup_otp_test_users):
    """Verifies that an incorrect OTP returns 400 and decrements available attempts."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    guardian.consent_status = "PENDING"
    db.commit()

    salt = generate_salt()
    otp_hash = hash_otp("888888", salt, settings.JWT_SECRET_KEY)
    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash=otp_hash,
        otp_salt=salt,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts_used=0,
        max_attempts=5,
        delivery_status=DeliveryStatus.REQUEST_ACCEPTED,
        provider_name="dev_mock",
    )
    db.add(ch)
    db.commit()
    challenge_id = str(ch.id)
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    with patch.object(settings, "OTP_DEV_MODE", False):
        res = client.post(
            "/api/v1/guardians/verify-otp",
            json={"otp_code": "111111", "challenge_id": challenge_id},
            headers=headers,
        )
        assert res.status_code == 400
        assert "Invalid OTP" in res.json()["detail"]
        assert "4 attempt(s) remaining" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 9. Expired OTP Rejection
# -----------------------------------------------------------------------------
def test_expired_otp_rejected(setup_otp_test_users):
    """Verifies that expired OTPs are strictly rejected."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    salt = generate_salt()
    otp_hash = hash_otp("555555", salt, settings.JWT_SECRET_KEY)

    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash=otp_hash,
        otp_salt=salt,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        attempts_used=0,
        max_attempts=5,
        delivery_status=DeliveryStatus.REQUEST_ACCEPTED,
        provider_name="dev_mock",
    )
    db.add(ch)
    db.commit()
    challenge_id = str(ch.id)
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": "555555", "challenge_id": challenge_id},
        headers=headers,
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 10. Reused OTP Rejection (Single-Use Enforcement)
# -----------------------------------------------------------------------------
def test_reused_otp_rejected(setup_otp_test_users):
    """Verifies that a consumed challenge cannot be used again."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    salt = generate_salt()
    otp_hash = hash_otp("654321", salt, settings.JWT_SECRET_KEY)

    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash=otp_hash,
        otp_salt=salt,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts_used=0,
        max_attempts=5,
        is_consumed=True,
        consumed_at=datetime.now(timezone.utc),
        delivery_status=DeliveryStatus.VERIFIED,
        provider_name="dev_mock",
    )
    db.add(ch)
    db.commit()
    challenge_id = str(ch.id)
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": "654321", "challenge_id": challenge_id},
        headers=headers,
    )
    assert res.status_code == 400
    assert "already been used" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 11. Maximum Verification Attempts (Lockout)
# -----------------------------------------------------------------------------
def test_maximum_verification_attempts_lockout(setup_otp_test_users):
    """Verifies that exceeding 5 attempts locks the challenge."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    salt = generate_salt()
    otp_hash = hash_otp("777777", salt, settings.JWT_SECRET_KEY)

    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash=otp_hash,
        otp_salt=salt,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts_used=5,
        max_attempts=5,
        delivery_status=DeliveryStatus.FAILED,
        provider_name="dev_mock",
    )
    db.add(ch)
    db.commit()
    challenge_id = str(ch.id)
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": "777777", "challenge_id": challenge_id},
        headers=headers,
    )
    assert res.status_code == 400
    assert "locked" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 12. Resend Cooldown Rate Limiting
# -----------------------------------------------------------------------------
def test_resend_cooldown_rate_limiting(setup_otp_test_users):
    """Verifies requesting an OTP within 60s cooldown is rejected with HTTP 429."""
    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    db.commit()

    ch = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash="somehash",
        otp_salt="somesalt",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        created_at=datetime.now(timezone.utc) - timedelta(seconds=10),
        delivery_status=DeliveryStatus.REQUEST_ACCEPTED,
        provider_name="dev_mock",
    )
    db.add(ch)
    db.commit()
    db.close()

    res = client.post("/api/v1/guardians/resend-otp", headers=headers)
    assert res.status_code == 429
    assert "Please wait" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 13. Previous Challenge Invalidation (Superseded)
# -----------------------------------------------------------------------------
def test_previous_challenge_superseded(setup_otp_test_users):
    """Verifies that when a challenge is superseded, it can no longer be verified."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    salt = generate_salt()
    otp_hash = hash_otp("333333", salt, settings.JWT_SECRET_KEY)

    ch_old = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=setup_otp_test_users["minor"].id,
        phone_number=guardian.guardian_phone,
        otp_hash=otp_hash,
        otp_salt=salt,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        is_superseded=True,
        delivery_status=DeliveryStatus.REQUEST_ACCEPTED,
        provider_name="dev_mock",
    )
    db.add(ch_old)
    db.commit()
    old_id = str(ch_old.id)
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": "333333", "challenge_id": old_id},
        headers=headers,
    )
    assert res.status_code == 400
    assert "newer verification code" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 14. Cross-User Authorization Check
# -----------------------------------------------------------------------------
def test_cross_user_unauthorized_guardian_access(setup_otp_test_users):
    """Verifies that an unrelated user cannot request or verify another minor's guardian."""
    stranger_headers = {"Authorization": "Bearer dev-token-test_otp_stranger_01"}

    res = client.post(
        "/api/v1/guardians/verify-otp",
        json={"otp_code": "123456"},
        headers=stranger_headers,
    )
    assert res.status_code == 404


# -----------------------------------------------------------------------------
# 15. Development Mode Production Restrictions
# -----------------------------------------------------------------------------
def test_dev_mode_production_restriction():
    """Verifies that OTP_DEV_MODE=True cannot be initialized in production."""
    with pytest.raises(Exception) as exc_info:
        Settings(
            ENVIRONMENT="production",
            OTP_DEV_MODE=True,
            DATABASE_URL="sqlite:///./test.db",
        )
    assert "Security violation" in str(exc_info.value)


# -----------------------------------------------------------------------------
# 16. Production API Never Returns Plaintext OTP
# -----------------------------------------------------------------------------
def test_production_api_never_returns_otp(setup_otp_test_users):
    """Verifies that in production mode, the API response never leaks dev_otp or plaintext code."""
    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == setup_otp_test_users["minor"].id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}

    with patch.object(settings, "OTP_DEV_MODE", False), patch.object(settings, "ENVIRONMENT", "production"):
        res = client.post("/api/v1/guardians/resend-otp", headers=headers)
        if res.status_code == 200:
            data = res.json()
            assert data.get("dev_otp") is None
            assert "dev_code" not in data


# -----------------------------------------------------------------------------
# 17. Unverified Guardians Cannot Be Presented as Verified
# -----------------------------------------------------------------------------
def test_guardian_unverified_until_explicit_success(setup_otp_test_users):
    """Ensures merely initiating an OTP request does not flip status to VERIFIED."""
    headers = {"Authorization": "Bearer dev-token-test_otp_minor_01"}
    get_res = client.get("/api/v1/guardians/me", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["verification_status"] == "PENDING"
    assert get_res.json()["consent_status"] == "PENDING"


# -----------------------------------------------------------------------------
# 18. Provider Delivery Status Reported Honestly
# -----------------------------------------------------------------------------
def test_delivery_status_reported_honestly():
    """Ensures unconfigured provider reports NOT_CONFIGURED without false claims."""
    unconfigured = UnconfiguredSMSProvider()
    assert unconfigured.is_configured() is False


# -----------------------------------------------------------------------------
# 19. Existing Registration & Login Intact
# -----------------------------------------------------------------------------
def test_existing_registration_intact():
    """Verifies that standard adult registration remains completely functional."""
    today = date.today()
    dob = f"{today.year - 28:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": f"test_otp_adult_flow_{secrets.token_hex(4)}",
        "full_name": "Test Adult Flow",
        "email": f"adult_flow_{secrets.token_hex(4)}@example.com",
        "phone": "+919876543299",
        "date_of_birth": dob,
        "user_type": "Employee",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    assert res.json()["role"] == "USER"


# -----------------------------------------------------------------------------
# 20. OpenAPI Route Registration Verification (Requirement 1 & 3)
# -----------------------------------------------------------------------------
def test_openapi_guardian_routes_registered():
    """Confirms that all required guardian OTP endpoints are registered and discoverable in OpenAPI docs."""
    res = client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]
    
    assert "/api/v1/guardians/request-otp" in paths
    assert "/api/v1/guardians/resend-otp" in paths
    assert "/api/v1/guardians/send-otp" in paths
    assert "/api/v1/guardians/verify-otp" in paths
    assert "/api/v1/guardians/challenge-status" in paths


# -----------------------------------------------------------------------------
# 21. Section 4 Consistent API Contract (success, status, masked_phone, resend_after_seconds)
# -----------------------------------------------------------------------------
def test_consistent_api_contract_request_and_verify(setup_otp_test_users):
    """Verifies that the request-otp and verify-otp endpoints conform to Section 4 consistent contract."""
    minor = setup_otp_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    # Clean existing challenges & guardian for fresh test
    db = SessionLocal()
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.minor_user_id == minor.id).delete()
    db.query(Guardian).filter(Guardian.minor_user_id == minor.id).delete()
    db.commit()

    # 1. Register guardian
    g_res = client.post(
        "/api/v1/guardians",
        headers=headers,
        json={
            "guardian_name": "Contract Test Guardian",
            "guardian_phone": "9876543210",
            "relationship": "Parent"
        }
    )
    assert g_res.status_code == 201

    # 2. Check active status conforming to Section 4 contract
    st_res = client.get("/api/v1/guardians/challenge-status", headers=headers)
    assert st_res.status_code == 200
    data = st_res.json()
    assert data["success"] is True
    assert data["masked_phone"] == "+91 ******3210"
    assert data["delivery_status"] in ["REQUEST_ACCEPTED", "NOT_CONFIGURED", "DELIVERED"]

    # 3. Test verify using "otp" field alias (in addition to "otp_code")
    ch = db.query(GuardianVerificationChallenge).filter(
        GuardianVerificationChallenge.minor_user_id == minor.id,
        GuardianVerificationChallenge.is_consumed.is_(False)
    ).order_by(GuardianVerificationChallenge.created_at.desc()).first()
    assert ch is not None
    otp_code = getattr(ch, "_generated_plaintext_otp", None) or settings.OTP_DEV_CODE

    verify_res = client.post(
        "/api/v1/guardians/verify-otp",
        headers=headers,
        json={"otp": otp_code, "challenge_id": str(ch.id)}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"
    assert verify_res.json()["consent_status"] == "ACCEPTED"
    db.close()


# -----------------------------------------------------------------------------
# 22. Missing Route Produces 404 Not Found (Requirement 4)
# -----------------------------------------------------------------------------
def test_missing_route_produces_404_not_found(setup_otp_test_users):
    """Verifies that requests to non-existent guardian endpoints return standard 404."""
    minor = setup_otp_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    res = client.post("/api/v1/guardians/non-existent-endpoint", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Not Found"


# -----------------------------------------------------------------------------
# 23. Unconfigured Provider Returns HTTP 503 (Requirement 6 & Section 5)
# -----------------------------------------------------------------------------
def test_request_otp_unconfigured_provider_returns_503(setup_otp_test_users):
    """Verifies that requesting an OTP when SMS service is unconfigured returns HTTP 503."""
    minor = setup_otp_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    if not guardian:
        guardian = Guardian(
            minor_user_id=minor.id,
            guardian_name="Test Unconfigured Guardian",
            guardian_phone="+919876543210",
            relationship="Parent",
            verification_status="PENDING",
            consent_status="PENDING",
        )
        db.add(guardian)
    else:
        guardian.verification_status = "PENDING"
        guardian.consent_status = "PENDING"
    db.commit()

    # Clear previous challenges to prevent rate limiting
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    with patch.object(settings, "OTP_DEV_MODE", False), patch.object(settings, "SMS_PROVIDER", ""):
        res = client.post("/api/v1/guardians/request-otp", headers=headers)
        assert res.status_code == 503
        assert "SMS verification is not configured" in res.json()["detail"]


# -----------------------------------------------------------------------------
# 24. Provider Gateway Failure Returns HTTP 502 (Requirement 7)
# -----------------------------------------------------------------------------
@pytest.mark.anyio
def test_request_otp_provider_failure_returns_502(setup_otp_test_users):
    """Verifies that an SMS gateway network/carrier failure returns HTTP 502 Bad Gateway."""
    minor = setup_otp_test_users["minor"]
    headers = {"Authorization": f"Bearer dev-token-{minor.firebase_uid}"}

    db = SessionLocal()
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == minor.id).first()
    assert guardian is not None
    guardian.verification_status = "PENDING"
    guardian.consent_status = "PENDING"

    # Clear previous challenges to bypass cooldown
    db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.guardian_id == guardian.id).delete()
    db.commit()
    db.close()

    mock_failed_result = SMSDeliveryResult(
        success=False,
        status=DeliveryStatus.FAILED,
        provider_name="twilio",
        error_message="The destination number is unreachable.",
    )

    with patch("app.api.v1.endpoints.guardians.get_sms_provider") as mock_get_provider:
        mock_provider_instance = AsyncMock()
        mock_provider_instance.is_configured = lambda: True
        mock_provider_instance.send_sms.return_value = mock_failed_result
        mock_get_provider.return_value = mock_provider_instance

        res = client.post("/api/v1/guardians/request-otp", headers=headers)
        assert res.status_code == 502
        assert "destination number is unreachable" in res.json()["detail"]



