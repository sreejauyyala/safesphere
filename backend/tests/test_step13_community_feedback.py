import pytest
from datetime import date
from uuid import uuid4
from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
# pyrefly: ignore [missing-import]
from app.models.safety_report import SafetyReport
# pyrefly: ignore [missing-import]
from app.models.journey import Journey
from app.models.community_feedback import CommunityFeedback
from app.models.report_audit_log import ReportAuditLog


@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_users(db_session):
    u1_uid = f"dev-fb-user-1-{uuid4().hex[:6]}"
    u2_uid = f"dev-fb-user-2-{uuid4().hex[:6]}"
    admin_uid = f"dev-fb-admin-{uuid4().hex[:6]}"

    user1 = User(
        firebase_uid=u1_uid,
        email=f"{u1_uid}@safesphere.test",
        full_name="Alice Community",
        phone="+15551110001",
        date_of_birth=date(1995, 5, 15),
        age=29,
        user_type="CITIZEN",
        role="USER",
        is_minor=False,
    )
    user2 = User(
        firebase_uid=u2_uid,
        email=f"{u2_uid}@safesphere.test",
        full_name="Bob Community",
        phone="+15551110002",
        date_of_birth=date(1995, 5, 15),
        age=29,
        user_type="CITIZEN",
        role="USER",
        is_minor=False,
    )
    admin = User(
        firebase_uid=admin_uid,
        email=f"{admin_uid}@safesphere.test",
        full_name="Admin Moderator",
        phone="+15551110003",
        date_of_birth=date(1990, 1, 1),
        age=34,
        user_type="CITIZEN",
        role="SYSTEM_ADMIN",
        is_minor=False,
    )
    db_session.add_all([user1, user2, admin])
    db_session.commit()
    db_session.refresh(user1)
    db_session.refresh(user2)
    db_session.refresh(admin)
    return user1, user2, admin


@pytest.fixture
def test_report(db_session, test_users):
    user1, _, _ = test_users
    report = SafetyReport(
        user_id=user1.id,
        category="poor_lighting",
        title="Broken streetlight on 5th Ave",
        description="Dark street for over 50 meters, completely unlit.",
        latitude=12.9716,
        longitude=77.5946,
        severity="medium",
        status="OPEN",
        verification_status="PENDING",
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    return report


@pytest.fixture
def test_journey(db_session, test_users):
    user1, _, _ = test_users
    journey = Journey(
        user_id=user1.id,
        destination_name="Central Library",
        start_latitude=12.9716,
        start_longitude=77.5946,
        destination_latitude=12.9750,
        destination_longitude=77.5980,
        status="COMPLETED",
        distance_travelled=2.4,
    )
    db_session.add(journey)
    db_session.commit()
    db_session.refresh(journey)
    return journey


def test_user_confirms_issue(test_users, test_report):
    client = TestClient(app)
    user1, _, _ = test_users

    res = client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={
            "feedback_type": "CONFIRM_ISSUE",
            "response_value": "YES",
            "comment": "I walk here every night and it is still completely dark.",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["confirm_count"] == 1
    assert data["dispute_count"] == 0
    assert data["total_responses"] == 1
    assert data["user_response"]["feedback_type"] == "CONFIRM_ISSUE"


def test_user_updates_own_response_one_vote_per_user(test_users, test_report):
    client = TestClient(app)
    user1, _, _ = test_users

    # First vote: CONFIRM_ISSUE
    client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={"feedback_type": "CONFIRM_ISSUE"},
    )

    # Second vote from same user: DISPUTE_ISSUE
    res = client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={
            "feedback_type": "DISPUTE_ISSUE",
            "concern_category": "wrong_location",
            "comment": "The light was actually on the adjacent block, not here.",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_responses"] == 1
    assert data["confirm_count"] == 0
    assert data["dispute_count"] == 1
    assert data["flagged_for_review"] is True


def test_community_confirmation_does_not_auto_verify(db_session, test_users, test_report):
    client = TestClient(app)
    user1, user2, _ = test_users

    # Two confirmations
    client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={"feedback_type": "CONFIRM_ISSUE"},
    )
    res = client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user2.firebase_uid}"},
        json={"feedback_type": "CONFIRM_ISSUE"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["confirm_count"] == 2
    # Must NOT be officially VERIFIED
    assert data["verification_status"] != "VERIFIED"


def test_unauthorized_user_cannot_moderate_report(test_users, test_report):
    client = TestClient(app)
    _, user2, _ = test_users

    # Normal user attempts to officially verify
    res = client.post(
        f"/api/v1/reports/{test_report.id}/moderate",
        headers={"Authorization": f"Bearer dev-token-{user2.firebase_uid}"},
        json={"new_verification_status": "VERIFIED"},
    )
    assert res.status_code == 403


def test_authorized_reviewer_moderates_and_verifies_report(test_users, test_report):
    client = TestClient(app)
    _, _, admin = test_users

    res = client.post(
        f"/api/v1/reports/{test_report.id}/moderate",
        headers={"Authorization": f"Bearer dev-token-{admin.firebase_uid}"},
        json={
            "new_verification_status": "VERIFIED",
            "review_notes": "Confirmed by field municipal inspector.",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "VERIFIED"


def test_resolution_confirmation_and_dispute_workflow(db_session, test_users, test_report):
    client = TestClient(app)
    user1, user2, admin = test_users

    # 1. Admin marks report RESOLVED
    mod_res = client.post(
        f"/api/v1/reports/{test_report.id}/moderate",
        headers={"Authorization": f"Bearer dev-token-{admin.firebase_uid}"},
        json={"new_status": "RESOLVED", "review_notes": "City workers replaced bulb."},
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["status"] == "RESOLVED"

    # 2. Community confirms resolution
    conf_res = client.post(
        f"/api/v1/reports/{test_report.id}/resolution-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={"feedback_type": "CONFIRM_RESOLVED", "comment": "Light is back on!"},
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["resolved_count"] == 1

    # 3. Another user reports issue is STILL PRESENT
    disp_res = client.post(
        f"/api/v1/reports/{test_report.id}/resolution-feedback",
        headers={"Authorization": f"Bearer dev-token-{user2.firebase_uid}"},
        json={"feedback_type": "REPORT_STILL_PRESENT", "comment": "Bulb flickered and died again."},
    )
    assert disp_res.status_code == 200
    data = disp_res.json()
    assert data["status"] == "RESOLUTION_DISPUTED"
    assert data["reopen_requested"] is True
    assert data["flagged_for_review"] is True

    # 4. Admin reopens report
    reopen_res = client.post(
        f"/api/v1/reports/{test_report.id}/moderate",
        headers={"Authorization": f"Bearer dev-token-{admin.firebase_uid}"},
        json={"new_status": "REOPENED", "review_notes": "Reopening for wiring check."},
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "REOPENED"


def test_audit_logs_recorded(test_users, test_report):
    client = TestClient(app)
    user1, _, _ = test_users

    # Submit feedback to generate audit log
    client.post(
        f"/api/v1/reports/{test_report.id}/verification-feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={"feedback_type": "CONFIRM_ISSUE"},
    )

    res = client.get(f"/api/v1/reports/{test_report.id}/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    assert any(log["action"] == "COMMUNITY_CONFIRMED" for log in logs)


def test_duplicate_report_detection(db_session, test_users, test_report):
    client = TestClient(app)
    _, user2, _ = test_users

    # Create a duplicate report nearby (50 meters away)
    dup = SafetyReport(
        user_id=user2.id,
        category="poor_lighting",
        title="Dark street near corner",
        description="Completely unlit corner.",
        latitude=test_report.latitude + 0.0002,
        longitude=test_report.longitude + 0.0002,
        severity="medium",
        status="OPEN",
        verification_status="PENDING",
    )
    db_session.add(dup)
    db_session.commit()

    res = client.get(f"/api/v1/reports/{dup.id}/duplicates?radius_meters=150")
    assert res.status_code == 200
    candidates = res.json()
    match = any(c["id"] == str(test_report.id) for c in candidates)
    assert match is True, f"Found {candidates} but wanted {test_report.id} (status={test_report.status}, cat={test_report.category})"


def test_journey_feedback_and_ownership(test_users, test_journey):
    client = TestClient(app)
    user1, user2, _ = test_users

    # User 1 submits valid feedback for own journey
    res = client.post(
        f"/api/v1/journeys/{test_journey.id}/feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={
            "rating": 5,
            "route_accuracy": "MOSTLY_YES",
            "safety_info_usefulness": "USEFUL",
            "comment": "Route felt safe with good lighting throughout.",
        },
    )
    assert res.status_code == 201
    fb = res.json()
    assert fb["rating"] == 5
    assert fb["safety_info_usefulness"] == "USEFUL"

    # User 2 attempts to submit feedback for User 1's journey -> 403 Forbidden
    res_unauth = client.post(
        f"/api/v1/journeys/{test_journey.id}/feedback",
        headers={"Authorization": f"Bearer dev-token-{user2.firebase_uid}"},
        json={"rating": 3},
    )
    assert res_unauth.status_code == 403

    # Rating boundary validation
    res_invalid = client.post(
        f"/api/v1/journeys/{test_journey.id}/feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={"rating": 6},
    )
    assert res_invalid.status_code == 422


def test_general_feedback_and_history_isolation(test_users):
    client = TestClient(app)
    user1, user2, _ = test_users

    # User 1 submits general platform feedback
    client.post(
        "/api/v1/feedback",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
        json={
            "category": "map_accuracy",
            "rating": 4,
            "comment": "Map tiles loaded very quickly, good street names.",
        },
    )

    # User 2 queries their own feedback history
    res2 = client.get(
        "/api/v1/feedback/me",
        headers={"Authorization": f"Bearer dev-token-{user2.firebase_uid}"},
    )
    assert res2.status_code == 200
    assert len(res2.json()) == 0

    # User 1 queries their history
    res1 = client.get(
        "/api/v1/feedback/me",
        headers={"Authorization": f"Bearer dev-token-{user1.firebase_uid}"},
    )
    assert res1.status_code == 200
    assert len(res1.json()) >= 1
    assert res1.json()[0]["concern_category"] == "map_accuracy"
