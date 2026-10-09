import logging
import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
import httpx

from app.core.config import settings

logger = logging.getLogger("safesphere.sms")


class DeliveryStatus:
    """Accurate lifecycle delivery states for OTP and SMS dispatch."""
    NOT_CONFIGURED = "NOT_CONFIGURED"
    PENDING = "PENDING"
    REQUEST_ACCEPTED = "REQUEST_ACCEPTED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    VERIFIED = "VERIFIED"


@dataclass
class SMSDeliveryResult:
    """Result of an SMS dispatch request with provider reference and truthful delivery state."""
    success: bool
    status: str  # DeliveryStatus constant
    provider_name: str
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = field(default_factory=dict)
    dispatched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BaseSMSProvider(ABC):
    """Abstract base for SMS gateways."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if valid provider credentials exist in the environment."""
        pass

    @abstractmethod
    async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
        """Sends an SMS message to the specified recipient phone number."""
        pass


class TwilioSMSProvider(BaseSMSProvider):
    """
    Twilio Programmable Messaging provider.
    Uses official Twilio REST API via httpx for reliable non-blocking async dispatch.
    """

    def __init__(self):
        self.account_sid = (settings.SMS_PROVIDER_ACCOUNT_SID or settings.SMS_PROVIDER_API_KEY).strip()
        self.auth_token = settings.SMS_PROVIDER_AUTH_TOKEN.strip()
        self.from_number = (settings.SMS_PROVIDER_FROM_NUMBER or settings.SMS_PROVIDER_SENDER).strip()
        self.api_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
        if not self.is_configured():
            logger.warning("Twilio SMS requested but credentials are incomplete.")
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.NOT_CONFIGURED,
                provider_name="twilio",
                error_message="SMS service is not configured. Contact the application administrator.",
            )

        payload = {
            "To": to_phone,
            "From": self.from_number,
            "Body": message,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.api_url,
                    data=payload,
                    auth=(self.account_sid, self.auth_token),
                )

            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}

            if response.status_code in (200, 201):
                sid = data.get("sid", f"twilio_{uuid.uuid4().hex[:10]}")
                twilio_status = data.get("status", "queued")
                logger.info(f"Twilio accepted message {sid} to {to_phone} (status: {twilio_status})")
                # Truthful delivery reporting: Twilio API acceptance is REQUEST_ACCEPTED, not DELIVERED
                return SMSDeliveryResult(
                    success=True,
                    status=DeliveryStatus.REQUEST_ACCEPTED,
                    provider_name="twilio",
                    provider_message_id=sid,
                    raw_response=data,
                )
            else:
                error_code = data.get("code")
                raw_err = data.get("message", response.text)
                logger.error(f"Twilio rejected SMS to {to_phone}: Code {error_code} - {raw_err}")

                # Friendly safe error descriptions
                if error_code == 21211:
                    friendly_err = "The provided phone number is invalid according to carrier records."
                elif error_code == 21608:
                    friendly_err = "The destination number is unverified on the trial SMS account."
                elif error_code == 20003:
                    friendly_err = "SMS provider authentication failed. Check API credentials."
                elif error_code == 21614:
                    friendly_err = "The sender phone number cannot route messages to this destination."
                elif error_code == 20429:
                    friendly_err = "SMS provider rate limit exceeded. Please try again shortly."
                else:
                    friendly_err = "Could not send verification code via SMS provider. Please try again later."

                return SMSDeliveryResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    provider_name="twilio",
                    provider_message_id=data.get("sid"),
                    error_message=friendly_err,
                    raw_response=data,
                )

        except httpx.TimeoutException:
            logger.error(f"Twilio SMS request timed out for {to_phone}")
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="twilio",
                error_message="SMS gateway connection timed out. Please try again.",
            )
        except Exception as exc:
            logger.error(f"Twilio SMS unexpected dispatch failure: {exc}")
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="twilio",
                error_message="Internal error communicating with SMS provider.",
            )


class MSG91SMSProvider(BaseSMSProvider):
    """
    MSG91 Indian SMS Gateway provider.
    Supports transactional OTP dispatch via MSG91 flow / OTP API.
    """

    def __init__(self):
        self.auth_key = (settings.SMS_PROVIDER_API_KEY or settings.SMS_PROVIDER_AUTH_TOKEN).strip()
        self.sender = (settings.SMS_PROVIDER_SENDER or "SFSPHR").strip()
        self.template_id = (settings.SMS_PROVIDER_TEMPLATE_ID or settings.SMS_PROVIDER_SERVICE_ID).strip()
        self.api_url = "https://control.msg91.com/api/v5/flow/"

    def is_configured(self) -> bool:
        return bool(self.auth_key and self.template_id)

    async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
        if not self.is_configured():
            logger.warning("MSG91 SMS requested but authkey or template_id missing.")
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.NOT_CONFIGURED,
                provider_name="msg91",
                error_message="SMS service is not configured. Contact the application administrator.",
            )

        headers = {
            "authkey": self.auth_key,
            "content-type": "application/json",
        }
        # MSG91 expects number without '+'
        raw_number = to_phone.replace("+", "")
        payload = {
            "template_id": self.template_id,
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": raw_number,
                    "message": message,
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.api_url, json=payload, headers=headers)

            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}

            if res.status_code == 200 and data.get("type") != "error":
                req_id = data.get("message", f"msg91_{uuid.uuid4().hex[:10]}")
                return SMSDeliveryResult(
                    success=True,
                    status=DeliveryStatus.REQUEST_ACCEPTED,
                    provider_name="msg91",
                    provider_message_id=req_id,
                    raw_response=data,
                )
            else:
                err_msg = data.get("message", "MSG91 dispatch rejected.")
                return SMSDeliveryResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    provider_name="msg91",
                    error_message=err_msg,
                    raw_response=data,
                )
        except Exception as exc:
            logger.error(f"MSG91 SMS dispatch failure: {exc}")
            return SMSDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="msg91",
                error_message="Could not send verification code via MSG91 SMS gateway.",
            )


class DevMockSMSProvider(BaseSMSProvider):
    """
    Development & test provider.
    Active strictly when OTP_DEV_MODE=True in non-production environments.
    Captures dispatched messages in-memory for testing without sending real network SMS.
    """

    # Class-level capture for automated test inspection
    captured_messages: List[Dict[str, Any]] = []

    def is_configured(self) -> bool:
        return True

    async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
        mock_id = f"dev_mock_{uuid.uuid4().hex[:10]}"
        record = {
            "to": to_phone,
            "message": message,
            "mock_id": mock_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        DevMockSMSProvider.captured_messages.append(record)
        logger.info(f"[DEV_MOCK_SMS] Captured OTP SMS to {to_phone}: {message}")

        return SMSDeliveryResult(
            success=True,
            status=DeliveryStatus.REQUEST_ACCEPTED,
            provider_name="dev_mock",
            provider_message_id=mock_id,
            raw_response={"mock": True, "captured": True},
        )

    @classmethod
    def get_latest_for(cls, phone: str) -> Optional[Dict[str, Any]]:
        for item in reversed(cls.captured_messages):
            if item["to"] == phone:
                return item
        return None

    @classmethod
    def clear(cls):
        cls.captured_messages.clear()


class UnconfiguredSMSProvider(BaseSMSProvider):
    """
    Truthful fallback provider used when no SMS provider credentials are configured.
    Never claims SMS was delivered.
    """

    def is_configured(self) -> bool:
        return False

    async def send_sms(self, to_phone: str, message: str) -> SMSDeliveryResult:
        logger.warning(
            f"SMS dispatch requested for {to_phone}, but no SMS gateway is configured in the environment."
        )
        return SMSDeliveryResult(
            success=False,
            status=DeliveryStatus.NOT_CONFIGURED,
            provider_name="unconfigured",
            error_message="SMS service is not configured. Contact the application administrator.",
        )


def get_sms_provider() -> BaseSMSProvider:
    """
    Provider factory adhering to configured environment and active provider choice.
    Ensures OTP_DEV_MODE is only respected in development/testing.
    """
    provider_name = (settings.SMS_PROVIDER or "").strip().lower()

    # 1. Explicit Twilio
    if provider_name == "twilio":
        return TwilioSMSProvider()

    # 2. Explicit MSG91
    if provider_name == "msg91":
        return MSG91SMSProvider()

    # 3. Explicit dev/mock or OTP_DEV_MODE enabled
    if provider_name in ("dev", "mock") or settings.OTP_DEV_MODE:
        if settings.ENVIRONMENT == "production":
            logger.error("Attempted to use DevMockSMSProvider in production environment!")
            return UnconfiguredSMSProvider()
        return DevMockSMSProvider()

    # 4. Auto-detect if credentials provided
    if (settings.SMS_PROVIDER_ACCOUNT_SID or settings.SMS_PROVIDER_API_KEY) and settings.SMS_PROVIDER_AUTH_TOKEN:
        return TwilioSMSProvider()
    if settings.SMS_PROVIDER_TEMPLATE_ID and (settings.SMS_PROVIDER_API_KEY or settings.SMS_PROVIDER_AUTH_TOKEN):
        return MSG91SMSProvider()

    # 5. Default unconfigured fallback
    return UnconfiguredSMSProvider()
