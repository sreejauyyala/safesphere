from datetime import datetime, timezone
import logging
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.safety_mode import SafetyModeSession
from app.models.user import User
from app.models.journey import Journey
from app.models.journey_sharing import JourneySharingSession
from app.models.guardian import Guardian
from app.models.help_point import HelpPoint
from app.models.trusted_contact import TrustedContact
from app.models.notification_log import NotificationLog
from app.schemas.safety_mode import (
    SafetyModeActivateRequest,
    SafetyModeEndRequest,
    NearbyHelpPointItem,
    SafetyModeSessionResponse,
    SafetyModeActiveDetailResponse,
)
from app.schemas.sos import SOSRecipientNotificationItem
from app.services.safety_pulse_service import haversine_distance
from app.services.notification_service import notification_service

logger = logging.getLogger("safesphere.safety_mode")


class SafetyModeService:
    """
    Service managing Step 11 "I Feel Unsafe" preventive safety mode.
    Coordinates GPS telemetry, journey linking, help-point discovery, and notification status.
    """

    @classmethod
    async def activate(
        cls,
        db: Session,
        user: User,
        payload: SafetyModeActivateRequest,
    ) -> SafetyModeSession:
        """
        Activates a preventive Safety Mode session.
        If an active session already exists for the user, updates location and returns it.
        Links to an active journey if one exists or if journey_id is provided.
        Dispatches preventive notification to authorized contacts and verified guardians.
        """
        now = datetime.now(timezone.utc)

        # 1. Check for existing ACTIVE session (idempotency: do not re-dispatch duplicate notifications)
        existing_session = (
            db.query(SafetyModeSession)
            .filter(SafetyModeSession.user_id == user.id, SafetyModeSession.status == "ACTIVE")
            .first()
        )
        if existing_session:
            if payload.latitude is not None and payload.longitude is not None:
                existing_session.last_latitude = payload.latitude
                existing_session.last_longitude = payload.longitude
                existing_session.last_location_update = now
                db.commit()
                db.refresh(existing_session)
            logger.info(f"User {user.id} accessed existing active SafetyModeSession {existing_session.id}")
            return existing_session

        # 2. Check and link journey
        linked_journey: Optional[Journey] = None
        if payload.journey_id:
            linked_journey = (
                db.query(Journey)
                .filter(Journey.id == payload.journey_id, Journey.user_id == user.id)
                .first()
            )
            if not linked_journey:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Specified journey not found or does not belong to the authenticated user.",
                )
        else:
            # Check if user has an ongoing ACTIVE journey
            linked_journey = (
                db.query(Journey)
                .filter(Journey.user_id == user.id, Journey.status == "ACTIVE")
                .first()
            )

        if linked_journey:
            linked_journey.is_safe_mode_active = True

        # 3. Create new SafetyModeSession first (with PENDING status so session.id is available)
        session = SafetyModeSession(
            user_id=user.id,
            journey_id=linked_journey.id if linked_journey else None,
            status="ACTIVE",
            activated_at=now,
            activation_latitude=payload.latitude,
            activation_longitude=payload.longitude,
            last_latitude=payload.latitude,
            last_longitude=payload.longitude,
            last_location_update=now if payload.latitude is not None else None,
            notification_status="PENDING",
            user_note=payload.user_note,
        )
        db.add(session)
        db.flush()

        # 4. Dispatch preventive notification if requested
        notification_status = "NOT_CONFIGURED"
        if payload.notify_trusted_contacts:
            sharing_url: Optional[str] = None
            if linked_journey:
                sharing_session = (
                    db.query(JourneySharingSession)
                    .filter(
                        JourneySharingSession.journey_id == linked_journey.id,
                        JourneySharingSession.is_active == True
                    )
                    .first()
                )
                if sharing_session:
                    sharing_url = f"/shared-journey/{sharing_session.share_token}"

            logs = await notification_service.notify_safety_mode_activated(
                session_id=session.id,
                user=user,
                db=db,
                latitude=payload.latitude,
                longitude=payload.longitude,
                user_note=payload.user_note,
                sharing_url=sharing_url,
            )

            if logs:
                if any(l.delivery_status in ("SENT", "DELIVERED") for l in logs):
                    notification_status = "SENT"
                elif all(l.delivery_status == "NOT_CONFIGURED" for l in logs):
                    notification_status = "NOT_CONFIGURED"
                elif all(l.delivery_status == "FAILED" for l in logs):
                    notification_status = "FAILED"
                else:
                    notification_status = logs[0].delivery_status
            else:
                notification_status = "NOT_CONFIGURED"
        else:
            notification_status = "NOT_CONFIGURED"

        session.notification_status = notification_status
        db.commit()
        db.refresh(session)

        logger.info(
            f"SafetyModeSession {session.id} activated for user {user.id}. "
            f"Journey linked: {bool(linked_journey)}, Notif status: {notification_status}"
        )
        return session

    @classmethod
    def get_current_session(cls, db: Session, user: User) -> Optional[SafetyModeSession]:
        """
        Retrieves the currently active Safety Mode session for the user, if one exists.
        """
        return (
            db.query(SafetyModeSession)
            .filter(SafetyModeSession.user_id == user.id, SafetyModeSession.status == "ACTIVE")
            .first()
        )

    @classmethod
    def get_session_by_id(cls, db: Session, user: User, session_id: UUID) -> SafetyModeSession:
        """
        Retrieves a session ensuring strict user ownership.
        """
        session = db.query(SafetyModeSession).filter(SafetyModeSession.id == session_id).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Safety Mode session not found.",
            )

        if session.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or modify this Safety Mode session.",
            )

        return session

    @classmethod
    async def end_session(
        cls,
        db: Session,
        user: User,
        session_id: UUID,
        payload: SafetyModeEndRequest,
    ) -> SafetyModeSession:
        """
        Ends an active Safety Mode session.
        Idempotent: if already ended, returns without error.
        Resets journey.is_safe_mode_active without ending the underlying journey.
        Dispatches safe resolution notice if contacts were previously notified.
        """
        session = cls.get_session_by_id(db, user, session_id)

        # Idempotent return if already ended
        if session.status == "ENDED":
            return session

        now = datetime.now(timezone.utc)
        session.status = "ENDED"
        session.deactivated_at = now
        session.deactivation_reason = payload.deactivation_reason or "user_safe"
        if payload.user_note:
            session.user_note = payload.user_note

        # Disengage journey safe mode flag while preserving active journey
        if session.journey_id:
            journey = db.query(Journey).filter(Journey.id == session.journey_id).first()
            if journey:
                journey.is_safe_mode_active = False

        db.commit()
        db.refresh(session)

        # Dispatch safe confirmation notice if requested and contacts were alerted
        if payload.send_safe_confirmation_update:
            has_activated_notifs = (
                db.query(NotificationLog)
                .filter(
                    NotificationLog.event_id == str(session.id),
                    NotificationLog.event_type == "SAFETY_MODE_ACTIVATED"
                )
                .count()
            )
            if has_activated_notifs > 0:
                await notification_service.notify_safety_mode_ended(
                    session_id=session.id,
                    user=user,
                    db=db,
                    reason=session.deactivation_reason
                )

        logger.info(f"SafetyModeSession {session.id} ended for user {user.id}. Reason: {session.deactivation_reason}")
        return session

    @classmethod
    def get_history(cls, db: Session, user: User, limit: int = 20) -> List[SafetyModeSession]:
        """
        Returns chronological session history for the authenticated user.
        """
        return (
            db.query(SafetyModeSession)
            .filter(SafetyModeSession.user_id == user.id)
            .order_by(SafetyModeSession.activated_at.desc())
            .limit(limit)
            .all()
        )

    @classmethod
    def get_nearby_verified_help_points(
        cls,
        db: Session,
        latitude: float,
        longitude: float,
        radius_m: float = 10000.0,
        limit: int = 8,
    ) -> List[NearbyHelpPointItem]:
        """
        Finds physical verified safe havens sorted by calculated ground distance.
        """
        help_points = db.query(HelpPoint).filter(HelpPoint.is_verified == True).all()
        results: List[Tuple[float, HelpPoint]] = []

        for hp in help_points:
            dist = haversine_distance(latitude, longitude, hp.latitude, hp.longitude)
            if dist <= radius_m:
                results.append((dist, hp))

        results.sort(key=lambda x: x[0])

        items: List[NearbyHelpPointItem] = []
        for dist, hp in results[:limit]:
            items.append(
                NearbyHelpPointItem(
                    id=hp.id,
                    name=hp.name,
                    point_type=hp.point_type,
                    category=hp.category,
                    latitude=hp.latitude,
                    longitude=hp.longitude,
                    distance_m=round(dist, 1),
                    address=hp.address,
                    phone_number=hp.phone_number,
                    is_verified=hp.is_verified,
                    is_24_hours=hp.is_24_hours,
                )
            )

        return items

    @classmethod
    def build_detail_response(
        cls,
        db: Session,
        user: User,
        session: SafetyModeSession,
        current_lat: Optional[float] = None,
        current_lon: Optional[float] = None,
    ) -> SafetyModeActiveDetailResponse:
        """
        Constructs the comprehensive active safety assistance detail response.
        """
        # Determine location coordinates
        lat = current_lat if current_lat is not None else session.last_latitude
        lon = current_lon if current_lon is not None else session.last_longitude

        if lat is not None and lon is not None:
            location_status = "available"
            nearby_hp = cls.get_nearby_verified_help_points(db, lat, lon)
        else:
            location_status = "permission_required"
            nearby_hp = []

        # Journey details
        journey_id = session.journey_id
        journey_title = None
        journey_dest = None
        journey_status = None

        if journey_id:
            journey = db.query(Journey).filter(Journey.id == journey_id).first()
            if journey:
                journey_title = journey.title
                journey_dest = journey.destination_name
                journey_status = journey.status

        # Guardian status
        guardian_info: Dict[str, Any] = {
            "is_minor": user.is_minor,
            "has_guardian": False,
            "status": "NOT_APPLICABLE" if not user.is_minor else "NOT_CONFIGURED",
        }
        if user.is_minor:
            g = db.query(Guardian).filter(Guardian.minor_user_id == user.id).first()
            if g:
                guardian_info = {
                    "is_minor": True,
                    "has_guardian": True,
                    "guardian_name": g.guardian_name,
                    "relationship": g.relationship,
                    "verification_status": g.verification_status,
                    "consent_status": g.consent_status,
                    "status": "VERIFIED" if g.verification_status == "VERIFIED" else "PENDING",
                }

        # Notifications query
        logs = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.event_id == str(session.id),
                NotificationLog.event_type.in_(["SAFETY_MODE_ACTIVATED", "SAFETY_MODE_ENDED"])
            )
            .all()
        )

        notif_items = []
        for log in logs:
            loc_shared = False
            if log.message_content:
                loc_shared = ("(" in log.message_content and ")" in log.message_content) or ("/shared-journey/" in log.message_content)
            notif_items.append(
                SOSRecipientNotificationItem(
                    recipient_id=log.recipient_id or "unknown",
                    recipient_name=log.recipient_name or "Trusted Contact",
                    recipient_type=log.recipient_type,
                    delivery_status=log.delivery_status,
                    channel=log.channel,
                    attempted_at=log.attempted_at,
                    error_message=log.error_message,
                    location_shared=loc_shared,
                )
            )

        # Sharing URL if linked journey has active sharing
        sharing_url = None
        if journey_id:
            active_ss = (
                db.query(JourneySharingSession)
                .filter(
                    JourneySharingSession.journey_id == journey_id,
                    JourneySharingSession.is_active == True
                )
                .first()
            )
            if active_ss:
                sharing_url = f"/shared-journey/{active_ss.share_token}"

        is_provider_ready = notification_service.is_sms_configured() or notification_service.is_fcm_configured()

        # Notification message
        if session.notification_status == "SENT":
            notif_msg = "Selected trusted contacts and verified guardians have been notified of your active safety mode."
        elif session.notification_status == "NOT_CONFIGURED":
            notif_msg = "Trusted-contact notifications will be available after setup."
        elif session.notification_status == "FAILED":
            notif_msg = "Notification attempt encountered a network limitation. Local safety assistance remains active."
        else:
            notif_msg = "Notification dispatch is in progress."

        assistance_features = [
            "Nearby Verified Safe Havens & Police Posts",
            "Alternative Lower-Risk Route Review",
            "High-Frequency Foreground GPS Watchdog",
            "Direct 1-Touch Emergency SOS Dispatch",
        ]

        return SafetyModeActiveDetailResponse(
            session=SafetyModeSessionResponse.model_validate(session),
            journey_id=journey_id,
            journey_title=journey_title,
            journey_destination=journey_dest,
            journey_status=journey_status,
            nearby_help_points=nearby_hp,
            location_status=location_status,
            notification_message=notif_msg,
            guardian_status=guardian_info,
            available_assistance=assistance_features,
            notifications=notif_items,
            recipients_count=len(notif_items),
            location_sharing_url=sharing_url,
            provider_configured=is_provider_ready,
        )


safety_mode_service = SafetyModeService()
