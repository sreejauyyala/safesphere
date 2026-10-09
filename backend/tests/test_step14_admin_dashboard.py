import pytest
from datetime import date, datetime, timezone
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.organization_membership import OrganizationMembership
from app.models.safety_report import SafetyReport
from app.models.issue_assignment import IssueAssignment
from app.models.issue_resolution import IssueResolution
from app.models.admin_audit_log import AdministrativeAuditLog


@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_setup(db_session: Session):
    # Create two organizations
    org1 = Organization(
        name="Apex University Campus",
        org_type="COLLEGE",
        contact_email="safety@apex.edu",
        status="ACTIVE",
        is_verified=True,
    )
    org2 = Organization(
        name="Metro Business Park",
        org_type="COMPANY",
        contact_email="security@metropark.com",
        status="ACTIVE",
        is_verified=True,
    )
    db_session.add_all([org1, org2])
    db_session.commit()
    db_session.refresh(org1)
    db_session.refresh(org2)

    # 1. Normal user
    u_uid = f"user-{uuid4().hex[:8]}"
    normal_user = User(
        firebase_uid=u_uid,
        email=f"{u_uid}@example.com",
        full_name="Normal Citizen",
        phone="+15550000001",
        date_of_birth=date(1998, 1, 1),
        age=26,
        user_type="General Public",
        role="USER",
        is_minor=False,
    )

    # 2. Org 1 admin
    o1_uid = f"org1admin-{uuid4().hex[:8]}"
    org1_admin = User(
        firebase_uid=o1_uid,
        email=f"{o1_uid}@example.com",
        full_name="Apex Campus Safety Lead",
        phone="+15550000002",
        date_of_birth=date(1985, 2, 2),
        age=39,
        user_type="Employee",
        role="ORGANIZATION_ADMIN",
        organization_id=org1.id,
        is_minor=False,
    )

    # 3. Org 2 admin
    o2_uid = f"org2admin-{uuid4().hex[:8]}"
    org2_admin = User(
        firebase_uid=o2_uid,
        email=f"{o2_uid}@example.com",
        full_name="Metro Park Security Officer",
        phone="+15550000003",
        date_of_birth=date(1988, 3, 3),
        age=36,
        user_type="Employee",
        role="ORGANIZATION_ADMIN",
        organization_id=org2.id,
        is_minor=False,
    )

    # 4. Global system admin
    sys_uid = f"sysadmin-{uuid4().hex[:8]}"
    system_admin = User(
        firebase_uid=sys_uid,
        email=f"{sys_uid}@example.com",
        full_name="Global SafeSphere Admin",
        phone="+15550000004",
        date_of_birth=date(1980, 4, 4),
        age=44,
        user_type="General Public",
        role="SYSTEM_ADMIN",
        is_minor=False,
    )

    db_session.add_all([normal_user, org1_admin, org2_admin, system_admin])
    db_session.commit()
    db_session.refresh(normal_user)
    db_session.refresh(org1_admin)
    db_session.refresh(org2_admin)
    db_session.refresh(system_admin)

    # Add membership records
    mem1 = OrganizationMembership(organization_id=org1.id, user_id=org1_admin.id, role="ADMIN")
    mem2 = OrganizationMembership(organization_id=org2.id, user_id=org2_admin.id, role="ADMIN")
    db_session.add_all([mem1, mem2])
    db_session.commit()

    # Create safety reports for test
    rep1 = SafetyReport(
        user_id=normal_user.id,
        category="poor_lighting",
        title="Unlit campus pathway",
        description="Dark stretch for 80m behind dorm B.",
        severity="medium",
        latitude=12.9716,
        longitude=77.5946,
        status="OPEN",
        verification_status="PENDING",
        assigned_organization_id=org1.id,
    )
    rep2 = SafetyReport(
        user_id=normal_user.id,
        category="road_damage",
        title="Large pothole at Metro Park entrance",
        description="Hazardous hole in entry lane.",
        severity="high",
        latitude=12.9800,
        longitude=77.6000,
        status="OPEN",
        verification_status="PENDING",
        assigned_organization_id=org2.id,
    )
    db_session.add_all([rep1, rep2])
    db_session.commit()
    db_session.refresh(rep1)
    db_session.refresh(rep2)

    return {
        "org1": org1,
        "org2": org2,
        "normal_user": normal_user,
        "org1_admin": org1_admin,
        "org2_admin": org2_admin,
        "system_admin": system_admin,
        "rep1": rep1,
        "rep2": rep2,
    }


def test_normal_user_cannot_access_admin_dashboard(test_setup):
    client = TestClient(app)
    user = test_setup["normal_user"]
    res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer dev-token-{user.firebase_uid}"},
    )
    assert res.status_code == 403


def test_org_admin_sees_only_own_organization_data(test_setup):
    client = TestClient(app)
    org1_admin = test_setup["org1_admin"]

    res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_global_scope"] is False
    assert data["organization_name"] == "Apex University Campus"
    assert data["total_reports_in_scope"] == 1


def test_system_admin_has_global_scope(test_setup):
    client = TestClient(app)
    sys_admin = test_setup["system_admin"]

    res = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer dev-token-{sys_admin.firebase_uid}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_global_scope"] is True
    assert data["total_reports_in_scope"] >= 2


def test_cross_organization_isolation_enforced(test_setup):
    client = TestClient(app)
    org1_admin = test_setup["org1_admin"]
    rep2 = test_setup["rep2"]  # Assigned to org2

    # Org1 admin attempts to view Org2's report
    res = client.get(
        f"/api/v1/admin/reports/{rep2.id}",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
    )
    assert res.status_code == 403
    assert "another organization" in res.json()["detail"].lower()


def test_report_verification_and_moderation_workflow(test_setup):
    client = TestClient(app)
    org1_admin = test_setup["org1_admin"]
    rep1 = test_setup["rep1"]

    # Verify report
    res_verify = client.post(
        f"/api/v1/admin/reports/{rep1.id}/verify",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
        json={"reason": "Confirmed by night security officer."},
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["verification_status"] == "VERIFIED"

    # Flag for review
    res_flag = client.post(
        f"/api/v1/admin/reports/{rep1.id}/flag",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
        json={"reason": "Need electrician estimate."},
    )
    assert res_flag.status_code == 200
    assert res_flag.json()["verification_status"] == "UNDER_REVIEW"
    assert res_flag.json()["flagged_for_review"] is True


def test_issue_assignment_workflow(test_setup):
    client = TestClient(app)
    org1_admin = test_setup["org1_admin"]
    rep1 = test_setup["rep1"]
    org1 = test_setup["org1"]

    # Assign report
    res_asgn = client.post(
        "/api/v1/admin/assignments",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
        json={
            "report_id": str(rep1.id),
            "organization_id": str(org1.id),
            "priority": "HIGH",
            "action_description": "Replace burned-out street ballast and fixture.",
        },
    )
    assert res_asgn.status_code == 201
    data = res_asgn.json()
    assert data["priority"] == "HIGH"
    assert data["status"] == "ASSIGNED"
    asgn_id = data["id"]

    # Update assignment to IN_PROGRESS
    res_patch = client.patch(
        f"/api/v1/admin/assignments/{asgn_id}",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
        json={"status": "IN_PROGRESS"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "IN_PROGRESS"


def test_resolution_and_reopening_workflow(test_setup):
    client = TestClient(app)
    org1_admin = test_setup["org1_admin"]
    rep1 = test_setup["rep1"]

    # Record resolution
    res_res = client.post(
        f"/api/v1/admin/reports/{rep1.id}/resolution",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
        json={
            "report_id": str(rep1.id),
            "action_taken": "Installed new 150W LED fixture on campus pole #4.",
            "resolution_notes": "Tested illuminance: 45 lux recorded.",
        },
    )
    assert res_res.status_code == 201
    resolution = res_res.json()
    assert resolution["status"] == "RESOLVED"
    res_id = resolution["id"]

    # Reopen resolution following citizen dispute
    res_reopen = client.post(
        f"/api/v1/admin/resolutions/{res_id}/reopen?reason=Pole%20light%20flickering%20again.",
        headers={"Authorization": f"Bearer dev-token-{org1_admin.firebase_uid}"},
    )
    assert res_reopen.status_code == 200
    assert res_reopen.json()["status"] == "DISPUTED"


def test_preventive_action_queue_deterministic_prioritization(test_setup):
    client = TestClient(app)
    sys_admin = test_setup["system_admin"]

    res = client.get(
        "/api/v1/admin/action-queue",
        headers={"Authorization": f"Bearer dev-token-{sys_admin.firebase_uid}"},
    )
    assert res.status_code == 200
    queue = res.json()
    assert len(queue) >= 2
    # Check that high severity items score higher or are ordered first
    assert queue[0]["priority_score"] >= queue[-1]["priority_score"]
    assert "priority_score" in queue[0]
    assert "administrative_priority" in queue[0]


def test_admin_analytics_and_audit_trail(test_setup):
    client = TestClient(app)
    sys_admin = test_setup["system_admin"]

    # Query analytics
    res_an = client.get(
        "/api/v1/admin/analytics",
        headers={"Authorization": f"Bearer dev-token-{sys_admin.firebase_uid}"},
    )
    assert res_an.status_code == 200
    analytics = res_an.json()
    assert "reports_by_category" in analytics
    assert "resolution_rate_percent" in analytics
    assert "monthly_trends" in analytics

    # Query audit logs
    res_logs = client.get(
        "/api/v1/admin/audit-logs",
        headers={"Authorization": f"Bearer dev-token-{sys_admin.firebase_uid}"},
    )
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 1
