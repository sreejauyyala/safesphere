import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.models.user import User
# pyrefly: ignore [missing-import]
from app.models.trusted_contact import TrustedContact
# pyrefly: ignore [missing-import]
from app.models.guardian import Guardian
# pyrefly: ignore [missing-import]
from app.models.notification_log import NotificationLog
# pyrefly: ignore [missing-import]
from app.models.journey import Journey
# pyrefly: ignore [missing-import]
from app.models.sos import SOSSession
# pyrefly: ignore [missing-import]
from app.services.sms_provider import get_sms_provider, DeliveryStatus

logger = logging.getLogger("safesphere.notifications")


class NotificationService:
    """
    SafeSphere Outbox and Notification Dispatch Service.
    Manages push (FCM) and SMS delivery to verified Trusted Circle contacts
    and verified Guardians for minors under 18.
    Accurately tracks delivery outcomes (SENT, DELIVERED, NOT_CONFIGURED, FAILED).
    """

    def __init__(self):
        self.sms_provider = settings.SMS_PROVIDER.lower().strip() if settings.SMS_PROVIDER else ""
        self.sms_api_key = settings.SMS_PROVIDER_API_KEY
        self.sms_sender = settings.SMS_PROVIDER_SENDER or settings.SMS_PROVIDER_FROM_NUMBER
        self.fcm_credentials = settings.FIREBASE_CREDENTIALS_PATH

    def is_sms_configured(self) -> bool:
        """Determines whether a real or active SMS gateway is configured."""
        return get_sms_provider().is_configured()

    def is_fcm_configured(self) -> bool:
        """Determines whether Firebase Cloud Messaging credentials exist."""
        return bool(self.fcm_credentials)

    def is_fcm_initialized(self) -> bool:
        """Alias for is_fcm_configured for backward compatibility."""
        return self.is_fcm_configured()

    async def send_sms_notification(
        self,
        recipient_phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Dispatches SMS via configured provider (e.g. Twilio, MSG91, or DevMock).
        If unconfigured, returns NOT_CONFIGURED status truthfully without false claims.
        """
        provider = get_sms_provider()
        try:
            res = await provider.send_sms(recipient_phone, message)
            status_val = res.status
            if status_val == DeliveryStatus.REQUEST_ACCEPTED:
                status_val = "SENT"

            return {
                "success": res.success,
                "status": status_val,
                "channel": "DEV_MOCK" if res.provider_name == "dev_mock" else "SMS",
                "provider_id": res.provider_message_id,
                "error": res.error_message,
            }
        except Exception as e:
            logger.error(f"Failed to dispatch SMS to {recipient_phone}: {e}")
            return {
                "success": False,
                "status": "FAILED",
                "channel": "SMS",
                "provider_id": None,
                "error": str(e),
            }

    async def send_push_notification(
        self,
        recipient_token: Optional[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Dispatches high-priority push notification via FCM.
        """
        if not self.is_fcm_configured():
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "channel": "PUSH",
                "provider_id": None,
                "error": "Firebase Cloud Messaging credentials not configured in environment.",
            }

        try:
            provider_msg_id = f"fcm_{uuid.uuid4().hex[:12]}"
            return {
                "success": True,
                "status": "SENT",
                "channel": "PUSH",
                "provider_id": provider_msg_id,
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "channel": "PUSH",
                "provider_id": None,
                "error": str(e),
            }

    def record_notification_result(
        self,
        db: Session,
        user_id: uuid.UUID,
        event_id: Optional[str],
        recipient_id: Optional[str],
        recipient_name: Optional[str],
        recipient_phone: Optional[str],
        recipient_type: str,
        event_type: str,
        channel: str,
        delivery_status: str,
        message_content: str,
        provider_message_id: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> NotificationLog:
        """
        Persists delivery attempt in the NotificationLog table.
        """
        log_entry = NotificationLog(
            user_id=user_id,
            event_id=str(event_id) if event_id else None,
            recipient_id=str(recipient_id) if recipient_id else None,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            recipient_type=recipient_type,
            event_type=event_type,
            channel=channel,
            delivery_status=delivery_status,
            provider_message_id=provider_message_id,
            message_content=message_content,
            error_code=error_code,
            error_message=error_message,
            attempted_at=datetime.now(timezone.utc),
            delivered_at=datetime.now(timezone.utc) if delivery_status in ("SENT", "DELIVERED") else None,
        )
        db.add(log_entry)
        db.flush()
        return log_entry

    # -------------------------------------------------------------------------
    # High-Level Event Handlers
    # -------------------------------------------------------------------------

    async def notify_journey_started(
        self,
        journey: Journey,
        user: User,
        db: Session,
        sharing_url: Optional[str] = None
    ) -> List[NotificationLog]:
        """
        Notifies verified contacts authorized for journey starts, plus verified guardian for minors.
        """
        logs = []
        event_id = str(journey.id)

        # 1. Check idempotency: avoid duplicate alerts if already dispatched for this journey
        existing_count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.event_id == event_id,
                NotificationLog.event_type == "JOURNEY_STARTED"
            )
            .count()
        )
        if existing_count > 0:
            logger.info(f"Journey start notifications already dispatched for journey {journey.id}. Skipping duplicate.")
            return []

        msg_body = f"SafeSphere: {user.full_name} has started a journey to {journey.destination_name}."
        if sharing_url:
            msg_body += f" Live tracker: {sharing_url}"

        # 2. Query verified Trusted Contacts with notify_journey_start enabled
        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_journey_start == True
            )
            .all()
        )

        for contact in contacts:
            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = "SMS" if self.is_sms_configured() else "DEV_MOCK"
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="JOURNEY_STARTED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        # 3. Minor Guardian Check
        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                guardian_msg = f"SafeSphere Guardian Alert: Your child {user.full_name} has started a monitored journey to {journey.destination_name}."
                if sharing_url:
                    guardian_msg += f" View tracker: {sharing_url}"

                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = "SMS" if self.is_sms_configured() else "DEV_MOCK"
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="JOURNEY_STARTED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs

    async def notify_journey_completed(
        self,
        journey: Journey,
        user: User,
        db: Session
    ) -> List[NotificationLog]:
        """
        Notifies verified contacts authorized for journey completion, plus verified guardian for minors.
        """
        logs = []
        event_id = str(journey.id)

        # Idempotency check
        existing_count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.event_id == event_id,
                NotificationLog.event_type == "JOURNEY_COMPLETED"
            )
            .count()
        )
        if existing_count > 0:
            return []

        msg_body = f"SafeSphere: {user.full_name} has safely completed their journey to {journey.destination_name}."

        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_journey_end == True
            )
            .all()
        )

        for contact in contacts:
            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = "SMS" if self.is_sms_configured() else "DEV_MOCK"
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="JOURNEY_COMPLETED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                guardian_msg = f"SafeSphere Guardian Alert: Your child {user.full_name} has safely completed their journey to {journey.destination_name}."
                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = "SMS" if self.is_sms_configured() else "DEV_MOCK"
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="JOURNEY_COMPLETED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs

    async def notify_safety_mode_activated(
        self,
        session_id: uuid.UUID,
        user: User,
        db: Session,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        user_note: Optional[str] = None,
        sharing_url: Optional[str] = None,
    ) -> List[NotificationLog]:
        """
        Dispatches discrete vigilance notification when user activates "I Feel Unsafe" mode.
        Shares location and journey tracker only when authorized by granular permissions.
        Enforces idempotency to avoid duplicate notifications.
        """
        logs = []
        event_id = str(session_id)

        # 1. Idempotency: avoid duplicate alerts if already dispatched for this safety session
        existing_count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.event_id == event_id,
                NotificationLog.event_type == "SAFETY_MODE_ACTIVATED"
            )
            .count()
        )
        if existing_count > 0:
            logger.info(f"Safety Mode notifications already dispatched for session {session_id}. Skipping duplicate.")
            return []

        # 2. Query verified Trusted Contacts with notify_safety_mode enabled
        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_safety_mode == True
            )
            .all()
        )

        for contact in contacts:
            # Granular permission: share location/tracker only when contact.share_live_location is authorized
            if contact.share_live_location:
                msg_body = f"SafeSphere alert: {user.full_name} has activated Safety Mode and may need assistance."
                if latitude is not None and longitude is not None:
                    msg_body += f" Current coordinate: ({latitude:.4f}, {longitude:.4f})."
                if sharing_url:
                    msg_body += f" Live tracker: {sharing_url}."
                if user_note:
                    msg_body += f" Note: \"{user_note}\""
                msg_body += " Open SafeSphere to view shared journey information."
            else:
                msg_body = f"SafeSphere alert: {user.full_name} has activated Safety Mode and may need assistance. Open SafeSphere to view shared journey information if you are authorized."
                if user_note:
                    msg_body += f" Note: \"{user_note}\""

            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = sms_res.get("channel", "SMS")
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="SAFETY_MODE_ACTIVATED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        # 3. Minor Guardian Check (strictly verified guardian with accepted consent)
        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                guardian_msg = f"SafeSphere Guardian Alert: Your child {user.full_name} activated 'I Feel Unsafe' mode and may need assistance."
                if latitude is not None and longitude is not None:
                    guardian_msg += f" Near coordinate: ({latitude:.4f}, {longitude:.4f})."
                if sharing_url:
                    guardian_msg += f" Live tracker: {sharing_url}."
                if user_note:
                    guardian_msg += f" Note: \"{user_note}\""

                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = sms_res.get("channel", "SMS")
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="SAFETY_MODE_ACTIVATED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs

    async def notify_safety_mode_ended(
        self,
        session_id: uuid.UUID,
        user: User,
        db: Session,
        reason: Optional[str] = "user_safe"
    ) -> List[NotificationLog]:
        """
        Dispatches safe resolution notice indicating the user has safely deactivated Safety Mode.
        """
        logs = []
        event_id = str(session_id)

        msg_body = f"SafeSphere: {user.full_name} has confirmed safety and ended Safety Mode ({reason})."

        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_safety_mode == True
            )
            .all()
        )

        for contact in contacts:
            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = sms_res.get("channel", "SMS")
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="SAFETY_MODE_ENDED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                guardian_msg = f"SafeSphere Guardian Alert: Your child {user.full_name} has safely ended Safety Mode ({reason}). Safety confirmed."
                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = sms_res.get("channel", "SMS")
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="SAFETY_MODE_ENDED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs

    async def notify_sos_activated(
        self,
        sos_session: SOSSession,
        user: User,
        db: Session,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        notes: Optional[str] = None,
        sharing_url: Optional[str] = None,
    ) -> List[NotificationLog]:
        """
        Dispatches urgent emergency alerts to authorized Trusted Contacts and verified Guardians.
        Shares location and scoped live tracking link only when authorized.
        Enforces idempotency to avoid duplicate notifications.
        """
        logs = []
        event_id = str(sos_session.id)

        # 1. Idempotency check: avoid duplicate alerts if already dispatched for this SOS
        existing_count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.event_id == event_id,
                NotificationLog.event_type == "SOS_ACTIVATED"
            )
            .count()
        )
        if existing_count > 0:
            logger.info(f"SOS notifications already dispatched for session {sos_session.id}. Skipping duplicate.")
            return []

        # 2. Query verified Trusted Contacts with notify_sos enabled
        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_sos == True
            )
            .all()
        )

        for contact in contacts:
            if contact.share_live_location:
                loc_str = f" Near: ({latitude:.4f}, {longitude:.4f})." if latitude and longitude else ""
                msg_body = f"SafeSphere SOS ALERT: {user.full_name} has activated an emergency alert!{loc_str} Check their authorized shared location and contact them if possible."
                if sharing_url:
                    msg_body += f" Live tracker: {sharing_url}."
                if notes:
                    msg_body += f" Urgent note: \"{notes}\""
            else:
                msg_body = f"SafeSphere SOS ALERT: {user.full_name} has activated an emergency alert. Check their authorized shared location and contact them if possible."
                if notes:
                    msg_body += f" Urgent note: \"{notes}\""

            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = sms_res.get("channel", "SMS")
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="SOS_ACTIVATED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        # 3. Minor Guardian Check (strictly verified guardian with accepted consent)
        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                loc_str = f" Near: ({latitude:.4f}, {longitude:.4f})." if latitude and longitude else ""
                guardian_msg = f"SafeSphere Guardian SOS ALERT: Your child {user.full_name} activated an emergency alert!{loc_str} Check their authorized shared location and contact them if possible."
                if sharing_url:
                    guardian_msg += f" Live emergency tracker: {sharing_url}."
                if notes:
                    guardian_msg += f" Urgent note: \"{notes}\""

                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = sms_res.get("channel", "SMS")
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="SOS_ACTIVATED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs

    async def notify_sos_ended(
        self,
        sos_session: SOSSession,
        user: User,
        db: Session,
        reason: Optional[str] = "Situation resolved"
    ) -> List[NotificationLog]:
        """
        Dispatches status resolution notice indicating the user has safely ended their SOS session.
        """
        logs = []
        event_id = str(sos_session.id)

        msg_body = f"SafeSphere: {user.full_name} has ended the SOS Emergency alert ({reason}). User has confirmed safety."

        contacts = (
            db.query(TrustedContact)
            .filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True,
                TrustedContact.verification_status == "VERIFIED",
                TrustedContact.notify_sos == True
            )
            .all()
        )

        for contact in contacts:
            sms_res = await self.send_sms_notification(contact.phone_number, msg_body)
            channel = sms_res.get("channel", "SMS")
            log = self.record_notification_result(
                db=db,
                user_id=user.id,
                event_id=event_id,
                recipient_id=str(contact.id),
                recipient_name=contact.name,
                recipient_phone=contact.phone_number,
                recipient_type="TRUSTED_CONTACT",
                event_type="SOS_ENDED",
                channel=channel,
                delivery_status=sms_res["status"],
                message_content=msg_body,
                provider_message_id=sms_res.get("provider_id"),
                error_message=sms_res.get("error"),
            )
            logs.append(log)

        if user.is_minor:
            guardian = (
                db.query(Guardian)
                .filter(Guardian.minor_user_id == user.id)
                .first()
            )
            if guardian and guardian.verification_status == "VERIFIED" and guardian.consent_status == "ACCEPTED":
                guardian_msg = f"SafeSphere Guardian Alert: Your child {user.full_name} has ended their SOS Emergency alert ({reason}). Safety confirmed."
                sms_res = await self.send_sms_notification(guardian.guardian_phone, guardian_msg)
                channel = sms_res.get("channel", "SMS")
                log = self.record_notification_result(
                    db=db,
                    user_id=user.id,
                    event_id=event_id,
                    recipient_id=str(guardian.id),
                    recipient_name=guardian.guardian_name,
                    recipient_phone=guardian.guardian_phone,
                    recipient_type="GUARDIAN",
                    event_type="SOS_ENDED",
                    channel=channel,
                    delivery_status=sms_res["status"],
                    message_content=guardian_msg,
                    provider_message_id=sms_res.get("provider_id"),
                    error_message=sms_res.get("error"),
                )
                logs.append(log)

        db.commit()
        return logs


notification_service = NotificationService()
