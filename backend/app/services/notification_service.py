from typing import List, Dict, Any, Optional
from app.core.config import settings


class NotificationService:
    """
    Push notification service interface supporting Firebase Cloud Messaging (FCM).
    Prepared for dispatching SOS alarms, emergency ward alerts for guardians,
    and journey check-in reminders.
    """

    def __init__(self, credentials_path: Optional[str] = None):
        self.credentials_path = credentials_path or settings.FIREBASE_CREDENTIALS_PATH
        self.project_id = settings.FIREBASE_PROJECT_ID

    def is_fcm_initialized(self) -> bool:
        """Checks if Firebase Admin SDK service account key is configured."""
        return bool(self.credentials_path)

    async def send_emergency_alert(
        self,
        recipient_tokens: List[str],
        sender_name: str,
        location: Dict[str, float],
        alert_type: str = "SOS"
    ) -> Dict[str, Any]:
        """
        Dispatches high-priority push notification to trusted circle contacts and guardians.
        """
        return {
            "status": "queued_placeholder",
            "fcm_ready": self.is_fcm_initialized(),
            "alert_type": alert_type,
            "recipient_count": len(recipient_tokens),
            "payload": {
                "title": f"EMERGENCY ALERT: {sender_name} triggered {alert_type}",
                "body": f"Location: {location.get('lat')}, {location.get('lng')}. Tap for immediate live tracking.",
                "priority": "high",
            }
        }

    async def send_journey_update(
        self,
        recipient_token: str,
        user_name: str,
        journey_status: str
    ) -> Dict[str, Any]:
        """
        Sends milestone or delay notifications during an active journey.
        """
        return {
            "status": "queued_placeholder",
            "journey_status": journey_status,
            "payload": {
                "title": f"SafeSphere Journey Update: {user_name}",
                "body": f"Journey status has updated to: {journey_status}",
            }
        }


notification_service = NotificationService()
