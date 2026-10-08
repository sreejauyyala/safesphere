import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from app.main import app
from app.core.database import init_db, SessionLocal
from app.core.age import calculate_age, validate_and_evaluate_dob
from app.models.user import User
from app.models.guardian import Guardian

# Ensure database tables are created
init_db()

# Clear previous test data for idempotent test execution
_db = SessionLocal()
_db.query(Guardian).delete()
_db.query(User).delete()
_db.commit()
_db.close()

client = TestClient(app)


# --------------------------------------------------------------------------
# Age Detection & Boundary Tests
# --------------------------------------------------------------------------
def test_age_calculation_adult():
    today = date.today()
    dob_25 = date(today.year - 25, today.month, today.day)
    age, is_minor = validate_and_evaluate_dob(dob_25)
    assert age == 25
    assert is_minor is False


def test_age_calculation_minor():
    today = date.today()
    dob_15 = date(today.year - 15, today.month, today.day)
    age, is_minor = validate_and_evaluate_dob(dob_15)
    assert age == 15
    assert is_minor is True


def test_age_calculation_boundary_18():
    today = date.today()
    # Exact 18th birthday today: is_minor should be FALSE
    dob_exact_18 = date(today.year - 18, today.month, today.day)
    age, is_minor = validate_and_evaluate_dob(dob_exact_18)
    assert age == 18
    assert is_minor is False

    # 1 day before 18th birthday: is_minor should be TRUE
    dob_almost_18 = dob_exact_18 + timedelta(days=1)
    age_almost, is_minor_almost = validate_and_evaluate_dob(dob_almost_18)
    assert age_almost == 17
    assert is_minor_almost is True


def test_invalid_dob_future():
    tomorrow = date.today() + timedelta(days=1)
    with pytest.raises(Exception):
        validate_and_evaluate_dob(tomorrow)


def test_invalid_dob_unrealistic_past():
    way_back = date(1850, 1, 1)
    with pytest.raises(Exception):
        validate_and_evaluate_dob(way_back)


# --------------------------------------------------------------------------
# User Registration & Profile Tests
# --------------------------------------------------------------------------
def test_register_adult_user():
    today = date.today()
    dob = f"{today.year - 24:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_adult_01",
        "full_name": "Sarah Connor",
        "email": "sarah.connor@example.com",
        "phone": "+15551234567",
        "date_of_birth": dob,
        "user_type": "Employee",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "sarah.connor@example.com"
    assert data["age"] == 24
    assert data["is_minor"] is False
    assert data["role"] == "USER"
    assert data["has_guardian"] is False


def test_register_minor_user():
    today = date.today()
    dob = f"{today.year - 16:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_minor_01",
        "full_name": "Tommy Vercetti",
        "email": "tommy.minor@example.com",
        "phone": "+15559876543",
        "date_of_birth": dob,
        "user_type": "Student",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "tommy.minor@example.com"
    assert data["age"] == 16
    assert data["is_minor"] is True
    assert data["role"] == "USER"
    assert data["has_guardian"] is False


def test_duplicate_email_registration_rejected():
    today = date.today()
    dob = f"{today.year - 20:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_adult_dup",
        "full_name": "Sarah Connor Clone",
        "email": "sarah.connor@example.com",  # Duplicate email
        "phone": "+15551234567",
        "date_of_birth": dob,
        "user_type": "Employee",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


# --------------------------------------------------------------------------
# User Profile Endpoints Tests
# --------------------------------------------------------------------------
def test_get_user_profile():
    headers = {"Authorization": "Bearer dev-token-test_uid_adult_01"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Sarah Connor"
    assert data["is_minor"] is False


def test_update_user_profile():
    headers = {"Authorization": "Bearer dev-token-test_uid_adult_01"}
    update_payload = {
        "full_name": "Sarah Connor Brewster",
        "user_type": "General Public"
    }
    response = client.put("/api/v1/users/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Sarah Connor Brewster"
    assert data["user_type"] == "General Public"


# --------------------------------------------------------------------------
# Guardian Connect Tests
# --------------------------------------------------------------------------
def test_adult_cannot_link_guardian():
    headers = {"Authorization": "Bearer dev-token-test_uid_adult_01"}
    guardian_payload = {
        "guardian_name": "John Connor",
        "guardian_phone": "+15559998888",
        "guardian_email": "john.connor@example.com",
        "relationship": "Father"
    }
    response = client.post("/api/v1/guardians", json=guardian_payload, headers=headers)
    assert response.status_code == 400
    assert "only applicable for minor accounts" in response.json()["detail"]


def test_minor_cannot_self_assign_guardian():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    # Using Tommy's own phone number
    self_payload = {
        "guardian_name": "Tommy Himself",
        "guardian_phone": "+15559876543",  # Matches minor's phone
        "guardian_email": "other@example.com",
        "relationship": "Parent"
    }
    response = client.post("/api/v1/guardians", json=self_payload, headers=headers)
    assert response.status_code == 400
    assert "cannot assign themselves" in response.json()["detail"]


def test_minor_links_guardian_success():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    guardian_payload = {
        "guardian_name": "Mary Vercetti",
        "guardian_phone": "+15550001111",
        "guardian_email": "mary.vercetti@example.com",
        "relationship": "Mother"
    }
    response = client.post("/api/v1/guardians", json=guardian_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["guardian_name"] == "Mary Vercetti"
    assert data["relationship"] == "Mother"
    assert data["verification_status"] == "PENDING"
    assert data["consent_status"] == "PENDING"


def test_get_linked_guardian():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    response = client.get("/api/v1/guardians/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["guardian_name"] == "Mary Vercetti"
    assert data["verification_status"] == "PENDING"


def test_verify_guardian_otp_invalid():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    response = client.post("/api/v1/guardians/verify", json={"otp_code": "000000"}, headers=headers)
    assert response.status_code == 400
    assert "Invalid OTP" in response.json()["detail"]


def test_verify_guardian_otp_valid():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    response = client.post("/api/v1/guardians/verify", json={"otp_code": "123456"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "VERIFIED"
    assert data["consent_status"] == "ACCEPTED"


def test_minor_profile_includes_verified_guardian():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["has_guardian"] is True
    assert data["guardian"] is not None
    assert data["guardian"]["guardian_name"] == "Mary Vercetti"
    assert data["guardian"]["verification_status"] == "VERIFIED"


def test_unauthenticated_request_rejected():
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_invalid_phone_rejected():
    today = date.today()
    dob = f"{today.year - 22:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_invalid_phone",
        "full_name": "Bad Phone User",
        "email": "badphone@example.com",
        "phone": "invalid-letters",
        "date_of_birth": dob,
        "user_type": "Student",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


def test_guardian_removal():
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    response = client.delete("/api/v1/guardians/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "removed"

    # Confirm it is removed
    get_res = client.get("/api/v1/guardians/me", headers=headers)
    assert get_res.status_code == 404


def test_adult_without_guardian_returns_404():
    headers = {"Authorization": "Bearer dev-token-test_uid_adult_01"}
    response = client.get("/api/v1/guardians/me", headers=headers)
    assert response.status_code == 404
    assert "No guardian currently linked" in response.json()["detail"]


def test_minor_without_guardian_state():
    # Register a minor who has not set up a guardian yet
    today = date.today()
    dob = f"{today.year - 16:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_minor_no_guardian",
        "full_name": "Unguarded Minor",
        "email": "unguarded@example.com",
        "phone": "+1-555-111-2222",
        "date_of_birth": dob,
        "user_type": "Student",
    }
    reg_res = client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201

    headers = {"Authorization": "Bearer dev-token-test_uid_minor_no_guardian"}
    profile_res = client.get("/api/v1/users/me", headers=headers)
    assert profile_res.status_code == 200
    data = profile_res.json()
    assert data["is_minor"] is True
    assert data["has_guardian"] is False
    assert data["guardian"] is None


def test_update_guardian_details():
    # Re-link guardian for minor
    headers = {"Authorization": "Bearer dev-token-test_uid_minor_01"}
    link_payload = {
        "guardian_name": "Mary Vercetti",
        "guardian_phone": "+1-555-987-6543",
        "guardian_email": "mary@example.com",
        "relationship": "Mother",
    }
    client.post("/api/v1/guardians", json=link_payload, headers=headers)

    # Update guardian name and relationship
    update_payload = {
        "guardian_name": "Mary Vercetti-Smith",
        "relationship": "Guardian",
    }
    response = client.put("/api/v1/guardians/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["guardian_name"] == "Mary Vercetti-Smith"
    assert data["relationship"] == "Guardian"


def test_user_cannot_register_as_admin():
    today = date.today()
    dob = f"{today.year - 30:04d}-{today.month:02d}-{today.day:02d}"
    payload = {
        "firebase_uid": "test_uid_fake_admin",
        "full_name": "Fake Admin",
        "email": "fakeadmin@example.com",
        "phone": "+1-555-999-0000",
        "date_of_birth": dob,
        "user_type": "Employee",
        "role": "SYSTEM_ADMIN",  # Attempting to escalate role
    }
    # Schema or endpoint will either reject or ignore the role field, setting role to USER
    reg_res = client.post("/api/v1/auth/register", json=payload)
    assert reg_res.status_code == 201
    assert reg_res.json()["role"] == "USER"


def test_rbac_user_forbidden_from_admin_route():
    headers = {"Authorization": "Bearer dev-token-test_uid_adult_01"}
    response = client.get("/api/v1/users/admin/system-status", headers=headers)
    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


def test_rbac_admin_allowed():
    # Create an admin user directly in the database
    db = SessionLocal()
    today = date.today()
    dob = date(today.year - 35, today.month, today.day)
    admin_user = User(
        firebase_uid="test_uid_sys_admin",
        full_name="System Admin User",
        email="sysadmin@safesphere.org",
        phone="+1-555-000-1111",
        date_of_birth=dob,
        age=35,
        is_minor=False,
        user_type="Employee",
        role="SYSTEM_ADMIN",
    )
    db.add(admin_user)
    db.commit()
    db.close()

    headers = {"Authorization": "Bearer dev-token-test_uid_sys_admin"}
    response = client.get("/api/v1/users/admin/system-status", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "operational"
    assert response.json()["admin_role"] == "SYSTEM_ADMIN"

