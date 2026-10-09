"""
Development-only seed data service for SafeSphere Safety Map.
Populates realistic community reports, verified 24/7 help points, and
community signal clusters around center coordinates (Bangalore demo sector).
Clearly flagged as development data.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.safety_report import SafetyReport
from app.models.help_point import HelpPoint
from app.models.hotspot import Hotspot


def seed_dev_map_data(db: Session, force: bool = False) -> None:
    """
    Seeds initial realistic development sample data for Step 5 Safety Map.
    Only seeds if tables are empty, unless force=True.
    """
    reports_count = db.query(SafetyReport).count()
    help_points_count = db.query(HelpPoint).count()
    hotspots_count = db.query(Hotspot).count()

    now = datetime.now(timezone.utc)

    # 1. Seed Safety Reports if empty
    if reports_count == 0 or force:
        sample_reports = [
            SafetyReport(
                category="poor_lighting",
                title="Non-functional Streetlights along 8th Cross",
                description="Consecutive 4 streetlights have been out for 3 days. Narrow passage becomes pitch dark after 7:30 PM.",
                latitude=12.9745,
                longitude=77.5978,
                severity="medium",
                status="verified",
                verification_status="verified",
                verification_count=4,
                created_at=now - timedelta(hours=2, minutes=15),
            ),
            SafetyReport(
                category="road_damage",
                title="Deep Trench & Open Utility Duct near Metro Gate 2",
                description="Uncovered construction excavation without barricades or hazard reflectors right beside the pedestrian walkway.",
                latitude=12.9692,
                longitude=77.5925,
                severity="high",
                status="verified",
                verification_status="verified",
                verification_count=6,
                created_at=now - timedelta(hours=5),
            ),
            SafetyReport(
                category="road_obstruction",
                title="Demolition Debris Blocking Sidewalk",
                description="Piles of gravel and brick obstruction forcing commuters to step onto fast-moving traffic lane.",
                latitude=12.9730,
                longitude=77.5890,
                severity="low",
                status="under_verification",
                verification_status="under_verification",
                verification_count=1,
                created_at=now - timedelta(hours=8),
            ),
            SafetyReport(
                category="isolated_area",
                title="Unpatrolled Pedestrian Subway with Zero Lighting",
                description="Pedestrian underpass connecting bus terminal. Deserted at night with broken surveillance mirrors.",
                latitude=12.9670,
                longitude=77.5960,
                severity="critical",
                status="verified",
                verification_status="verified",
                verification_count=8,
                created_at=now - timedelta(days=1),
            ),
            SafetyReport(
                category="transport_issue",
                title="Unscheduled Bus Stand Bottleneck & Auto Stand",
                description="Frequent aggressive solicitations and overcrowding without traffic warden supervision during late evening hours.",
                latitude=12.9775,
                longitude=77.5935,
                severity="medium",
                status="under_verification",
                verification_status="under_verification",
                verification_count=2,
                created_at=now - timedelta(hours=14),
            ),
            SafetyReport(
                category="general_safety",
                title="Damaged Overhanging Power Cables",
                description="Low-hanging electric service line dangling near residential tree line at head height.",
                latitude=12.9760,
                longitude=77.6015,
                severity="high",
                status="verified",
                verification_status="verified",
                verification_count=5,
                created_at=now - timedelta(days=2),
            ),
        ]
        db.add_all(sample_reports)

    # 2. Seed Verified Help Points if empty
    if help_points_count == 0 or force:
        sample_help_points = [
            HelpPoint(
                name="Ashok Nagar Police Station & Help Desk",
                point_type="police_station",
                category="police",
                latitude=12.9710,
                longitude=77.6030,
                address="Police Station Rd, Ashok Nagar, Bengaluru",
                phone_number="112",
                is_verified=True,
                is_24_hours=True,
                notes="24/7 Citizen Help Desk & Women Assistance Cell",
            ),
            HelpPoint(
                name="Victoria Hospital Emergency & Trauma Care",
                point_type="hospital",
                category="hospital",
                latitude=12.9640,
                longitude=77.5750,
                address="Fort Rd, Near City Market, Bengaluru",
                phone_number="108",
                is_verified=True,
                is_24_hours=True,
                notes="Level 1 Trauma Center, 24/7 Security & Safe Haven",
            ),
            HelpPoint(
                name="Central Tech Park Security Post & Safe Haven",
                point_type="security_desk",
                category="security_post",
                latitude=12.9755,
                longitude=77.5955,
                address="Gate 1, Residency Road Tech Hub",
                phone_number="+91 80 2234 5678",
                is_verified=True,
                is_24_hours=True,
                notes="Armed Security, 24/7 CCTV surveillance perimeter",
            ),
            HelpPoint(
                name="St. Joseph Campus Security Control Room",
                point_type="campus_security",
                category="security_post",
                latitude=12.9698,
                longitude=77.6010,
                address="Langford Road Campus Gate B",
                phone_number="+91 80 2221 1429",
                is_verified=True,
                is_24_hours=True,
                notes="Student and Public Assistance Booth with Emergency Intercom",
            ),
            HelpPoint(
                name="24x7 Apollo Pharmacy & Well-Lit Haven",
                point_type="verified_help_point",
                category="pharmacy",
                latitude=12.9780,
                longitude=77.5985,
                address="Brigade Road Junction, Bengaluru",
                phone_number="1860-500-0101",
                is_verified=True,
                is_24_hours=True,
                notes="Verified illuminated storefront with staff on site 24 hours",
            ),
        ]
        db.add_all(sample_help_points)

    # 3. Seed Hotspot / Safety Concern Clusters if empty
    if hotspots_count == 0 or force:
        sample_hotspots = [
            Hotspot(
                label="Community Safety Signal Cluster - Poor Lighting Corridor",
                level="elevated",
                latitude=12.9740,
                longitude=77.5975,
                radius=320.0,
                source="Community Safety Signal Cluster",
                description="Cluster of multiple verified low illumination reports along narrow pedestrian alley.",
            ),
            Hotspot(
                label="Elevated Estimated Risk Area - Construction Transit Zone",
                level="moderate",
                latitude=12.9685,
                longitude=77.5930,
                radius=380.0,
                source="Civic Safety Telemetry",
                description="Multiple road work excavations and restricted pedestrian walkway reports.",
            ),
        ]
        db.add_all(sample_hotspots)

    db.commit()
