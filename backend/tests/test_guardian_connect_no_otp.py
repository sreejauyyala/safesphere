import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.user import User
from app.models.guardian import Guardian, GuardianVerificationChallenge

init_db()
client = TestClient(app)


@pytest.fixture(scope="module")
def setup_guardian_test_users():
    """Sets up dedicated test users for guardian no-OTP tests."""
    db: Session = SessionLocal()

    uids = ["test_uid_no_otp_minor", "test_uid_no_otp_adult"]
    existing = db.query(User).filter(User.firebase_uid.in_(uids)).all()
    for u in existing:
        db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.minor_user_id == u.id).delete()
        db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
        db.delete(u)
    db.commit()

    minor_user = User(
        firebase_uid="test_uid_no_otp_minor",
        full_name="Alex Minor",
        email="alex.minor@example.com",
        phone="+919876543200",
        date_of_birth=date(2010, 6, 15),
        age=16,
        is_minor=True,
        user_type="Student",
        role="USER",
        is_active=True,
    )
    adult_user = User(
        firebase_uid="test_uid_no_otp_adult",
        full_name="Jordan Adult",
        email="jordan.adult@example.com",
        phone="+919876543201",
        date_of_birth=date(1995, 3, 10),
        age=31,
        is_minor=False,
        user_type="Employee",
        role="USER",
        is_active=True,
    )
    db.add_all([minor_user, adult_user])
    db.commit()
    db.refresh(minor_user)
    db.refresh(adult_user)

    yield {"minor": minor_user, "adult": adult_user}

    # Teardown
    db = SessionLocal()
    for uid in uids:
        u = db.query(User).filter(User.firebase_uid == uid).first()
        if u:
            db.query(GuardianVerificationChallenge).filter(GuardianVerificationChallenge.minor_user_id == u.id).delete()
            db.query(Guardian).filter(Guardian.minor_user_id == u.id).delete()
            db.delete(u)
    db.commit()


def test_1_add_guardian_details_no_otp(setup_guardian_test_users):
    """1. Minor adds guardian details without OTP generation."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}
    payload = {
        "guardian_name": "Patricia Miller",
        "guardian_phone": "+91 98765 11111",
        "guardian_email": "patricia.m@example.com",
        "relationship": "Mother",
    }
    response = client.post("/api/v1/guardians", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()

    assert data["guardian_name"] == "Patricia Miller"
    assert data["relationship"] == "Mother"
    assert data["guardian_phone"] == "+919876511111"
    assert data["guardian_email"] == "patricia.m@example.com"
    # Verification status must NOT be VERIFIED automatically
    assert data["verification_status"] == "NOT_VERIFIED"
    assert data["phone_verified"] is False
    assert data["email_verified"] is False
    assert data["consent_status"] == "PENDING"
    # Masked fields
    assert data["masked_phone"] == "+91 ******1111"
    assert data["masked_email"] == "p******@example.com"

    # Confirm NO OTP challenge was created in the database
    db = SessionLocal()
    challenges = (
        db.query(GuardianVerificationChallenge)
        .filter(GuardianVerificationChallenge.minor_user_id == setup_guardian_test_users["minor"].id)
        .all()
    )
    assert len(challenges) == 0


def test_2_get_saved_guardian_details_persist(setup_guardian_test_users):
    """6. Reload/retrieve guardian details and confirm persistence."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}
    response = client.get("/api/v1/guardians/me", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["guardian_name"] == "Patricia Miller"
    assert data["guardian_phone"] == "+919876511111"
    assert data["guardian_email"] == "patricia.m@example.com"
    assert data["relationship"] == "Mother"
    assert data["verification_status"] == "NOT_VERIFIED"
    assert data["phone_verified"] is False
    assert data["masked_phone"] == "+91 ******1111"


def test_3_update_guardian_details_no_otp(setup_guardian_test_users):
    """2. Update guardian details without OTP dispatch."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}
    update_payload = {
        "guardian_name": "Patricia Miller-Smith",
        "guardian_phone": "+91 98765 22222",
        "guardian_email": "patricia.updated@example.com",
        "relationship": "Parent",
    }
    response = client.put("/api/v1/guardians/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["guardian_name"] == "Patricia Miller-Smith"
    assert data["guardian_phone"] == "+919876522222"
    assert data["guardian_email"] == "patricia.updated@example.com"
    assert data["relationship"] == "Parent"
    assert data["verification_status"] == "NOT_VERIFIED"
    assert data["phone_verified"] is False
    assert data["masked_phone"] == "+91 ******2222"

    # Confirm NO OTP challenge was created during update
    db = SessionLocal()
    challenges = (
        db.query(GuardianVerificationChallenge)
        .filter(GuardianVerificationChallenge.minor_user_id == setup_guardian_test_users["minor"].id)
        .all()
    )
    assert len(challenges) == 0


def test_4_validate_missing_and_invalid_fields():
    """5. Validate missing required fields and invalid formats."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}

    # Missing guardian_phone
    res1 = client.post("/api/v1/guardians", json={"guardian_name": "Incomplete", "relationship": "Parent"}, headers=headers)
    assert res1.status_code == 422

    # Missing guardian_name
    res2 = client.post("/api/v1/guardians", json={"guardian_phone": "+919876543210", "relationship": "Parent"}, headers=headers)
    assert res2.status_code == 422

    # Invalid phone format
    res3 = client.post("/api/v1/guardians", json={"guardian_name": "Invalid Phone", "guardian_phone": "abc", "relationship": "Parent"}, headers=headers)
    assert res3.status_code in [400, 422]


def test_5_self_assignment_prevention():
    """Verify minor cannot assign their own phone or email as guardian."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}

    # Own phone
    res_phone = client.post(
        "/api/v1/guardians",
        json={
            "guardian_name": "Self Contact",
            "guardian_phone": "+919876543200",  # Alex Minor's own phone
            "relationship": "Parent"
        },
        headers=headers,
    )
    assert res_phone.status_code == 400
    assert "cannot assign themselves" in res_phone.json()["detail"]

    # Own email
    res_email = client.post(
        "/api/v1/guardians",
        json={
            "guardian_name": "Self Email",
            "guardian_phone": "+919876533333",
            "guardian_email": "alex.minor@example.com",  # Alex's own email
            "relationship": "Parent"
        },
        headers=headers,
    )
    assert res_email.status_code == 400
    assert "own email address" in res_email.json()["detail"]


def test_6_adult_cannot_link_guardian(setup_guardian_test_users):
    """Adult user is rejected from Guardian Connect (minor only)."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_adult"}
    payload = {
        "guardian_name": "Adult Guardian",
        "guardian_phone": "+91 98765 44444",
        "relationship": "Parent"
    }
    response = client.post("/api/v1/guardians", json=payload, headers=headers)
    assert response.status_code == 400
    assert "minor accounts" in response.json()["detail"].lower()


def test_7_unverified_guardians_not_marked_verified(setup_guardian_test_users):
    """9. Verify unverified guardians are not marked verified."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}
    res = client.get("/api/v1/guardians/me", headers=headers)
    assert res.status_code == 200
    guardian_data = res.json()
    assert guardian_data["verification_status"] == "NOT_VERIFIED"
    assert guardian_data["phone_verified"] is False
    assert guardian_data["consent_status"] != "ACCEPTED"


def test_8_remove_guardian_details():
    """3. Remove guardian details."""
    headers = {"Authorization": "Bearer dev-token-test_uid_no_otp_minor"}
    response = client.delete("/api/v1/guardians/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "removed"

    # Confirm retrieval now returns 404
    get_res = client.get("/api/v1/guardians/me", headers=headers)
    assert get_res.status_code == 404
