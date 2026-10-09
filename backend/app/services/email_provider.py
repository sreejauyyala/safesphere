import logging
import uuid
import smtplib
import ssl
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.message import EmailMessage
import anyio
import httpx

from app.core.config import settings
from app.services.sms_provider import DeliveryStatus

logger = logging.getLogger("safesphere.email")


@dataclass
class EmailDeliveryResult:
    """Result of an email dispatch request with provider reference and truthful delivery state."""
    success: bool
    status: str  # DeliveryStatus constant
    provider_name: str
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = field(default_factory=dict)
    dispatched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BaseEmailProvider(ABC):
    """Abstract base class for email delivery gateways."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if valid provider credentials exist in the environment."""
        pass

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        """Sends an email message to the specified recipient email address."""
        pass


class SMTPEmailProvider(BaseEmailProvider):
    """
    Standard SMTP email provider with STARTTLS / SSL support.
    Uses Python standard library smtplib in a background thread to prevent blocking asyncio.
    """

    def __init__(self):
        self.host = settings.SMTP_HOST.strip()
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER.strip()
        self.password = settings.SMTP_PASSWORD.strip()
        self.use_tls = settings.SMTP_USE_TLS
        self.from_address = settings.EMAIL_FROM_ADDRESS.strip()
        self.from_name = (settings.EMAIL_FROM_NAME or "SafeSphere").strip()

    def is_configured(self) -> bool:
        return bool(self.host and self.from_address)

    def _sync_send(self, to_email: str, subject: str, text_body: str, html_body: Optional[str] = None) -> EmailDeliveryResult:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_address}>" if self.from_name else self.from_address
        msg["To"] = to_email
        msg.set_content(text_body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        msg_id = f"smtp_{uuid.uuid4().hex[:12]}"
        try:
            # Check if port 465 SSL or standard STARTTLS
            if self.port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=10.0) as server:
                    if self.user and self.password:
                        server.login(self.user, self.password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=10.0) as server:
                    if self.use_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                    if self.user and self.password:
                        server.login(self.user, self.password)
                    server.send_message(msg)

            logger.info(f"SMTP accepted email to {to_email} (Msg ID: {msg_id})")
            return EmailDeliveryResult(
                success=True,
                status=DeliveryStatus.REQUEST_ACCEPTED,
                provider_name="smtp",
                provider_message_id=msg_id,
            )
        except smtplib.SMTPAuthenticationError as auth_err:
            logger.error(f"SMTP authentication failure sending to {to_email}: {auth_err}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="smtp",
                error_message="SMTP provider authentication failed. Check credentials.",
            )
        except (smtplib.SMTPConnectError, TimeoutError, OSError) as conn_err:
            logger.error(f"SMTP connection error sending to {to_email}: {conn_err}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="smtp",
                error_message="Email server connection timed out or unreachable.",
            )
        except Exception as exc:
            logger.error(f"SMTP dispatch failure sending to {to_email}: {exc}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="smtp",
                error_message="Could not send verification email via SMTP server.",
            )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        if not self.is_configured():
            logger.warning("SMTP requested but host or sender address is missing.")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.NOT_CONFIGURED,
                provider_name="smtp",
                error_message="Email service is not configured. Contact the application administrator.",
            )

        return await anyio.to_thread.run_sync(self._sync_send, to_email, subject, text_body, html_body)


class ResendEmailProvider(BaseEmailProvider):
    """
    Resend API provider (https://resend.com).
    Uses official HTTP REST API via httpx for reliable non-blocking async dispatch.
    """

    def __init__(self):
        self.api_key = settings.EMAIL_API_KEY.strip()
        self.from_address = settings.EMAIL_FROM_ADDRESS.strip()
        self.from_name = (settings.EMAIL_FROM_NAME or "SafeSphere").strip()
        self.api_url = "https://api.resend.com/emails"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.from_address)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        if not self.is_configured():
            logger.warning("Resend email requested but API key or from_address is missing.")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.NOT_CONFIGURED,
                provider_name="resend",
                error_message="Email service is not configured. Contact the application administrator.",
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        sender_header = f"{self.from_name} <{self.from_address}>" if self.from_name else self.from_address
        payload = {
            "from": sender_header,
            "to": [to_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            payload["html"] = html_body

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.api_url, json=payload, headers=headers)

            data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}

            if res.status_code in (200, 201):
                msg_id = data.get("id", f"resend_{uuid.uuid4().hex[:10]}")
                logger.info(f"Resend accepted email to {to_email} (ID: {msg_id})")
                return EmailDeliveryResult(
                    success=True,
                    status=DeliveryStatus.REQUEST_ACCEPTED,
                    provider_name="resend",
                    provider_message_id=msg_id,
                    raw_response=data,
                )
            else:
                err_message = data.get("message") or res.text
                logger.error(f"Resend rejected email to {to_email}: {err_message} (HTTP {res.status_code})")
                return EmailDeliveryResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    provider_name="resend",
                    error_message=f"Email dispatch rejected by provider: {err_message}",
                    raw_response=data,
                )
        except httpx.TimeoutException:
            logger.error(f"Resend request timed out for {to_email}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="resend",
                error_message="Email gateway connection timed out. Please try again.",
            )
        except Exception as exc:
            logger.error(f"Resend dispatch error: {exc}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="resend",
                error_message="Internal error communicating with email provider.",
            )


class SendGridEmailProvider(BaseEmailProvider):
    """
    SendGrid Mail Send API provider.
    Uses official v3/mail/send API via httpx.
    """

    def __init__(self):
        self.api_key = settings.EMAIL_API_KEY.strip()
        self.from_address = settings.EMAIL_FROM_ADDRESS.strip()
        self.from_name = (settings.EMAIL_FROM_NAME or "SafeSphere").strip()
        self.api_url = "https://api.sendgrid.com/v3/mail/send"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.from_address)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        if not self.is_configured():
            logger.warning("SendGrid email requested but API key or from_address is missing.")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.NOT_CONFIGURED,
                provider_name="sendgrid",
                error_message="Email service is not configured. Contact the application administrator.",
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        content_list = [{"type": "text/plain", "value": text_body}]
        if html_body:
            content_list.append({"type": "text/html", "value": html_body})

        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": self.from_address, "name": self.from_name},
            "subject": subject,
            "content": content_list,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.api_url, json=payload, headers=headers)

            if res.status_code in (200, 202):
                msg_id = res.headers.get("X-Message-Id", f"sg_{uuid.uuid4().hex[:10]}")
                logger.info(f"SendGrid accepted email to {to_email} (ID: {msg_id})")
                return EmailDeliveryResult(
                    success=True,
                    status=DeliveryStatus.REQUEST_ACCEPTED,
                    provider_name="sendgrid",
                    provider_message_id=msg_id,
                )
            else:
                logger.error(f"SendGrid rejected email to {to_email}: {res.text} (HTTP {res.status_code})")
                return EmailDeliveryResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    provider_name="sendgrid",
                    error_message="Email dispatch rejected by SendGrid provider.",
                )
        except Exception as exc:
            logger.error(f"SendGrid dispatch error: {exc}")
            return EmailDeliveryResult(
                success=False,
                status=DeliveryStatus.FAILED,
                provider_name="sendgrid",
                error_message="Could not send verification code via SendGrid email gateway.",
            )


class DevMockEmailProvider(BaseEmailProvider):
    """
    Development & test provider.
    Active strictly when OTP_DEV_MODE=True or EMAIL_PROVIDER="dev"|"mock" in non-production environments.
    Captures dispatched emails in-memory for testing without sending real network requests.
    """

    captured_messages: List[Dict[str, Any]] = []

    def is_configured(self) -> bool:
        return True

    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        mock_id = f"dev_email_{uuid.uuid4().hex[:10]}"
        record = {
            "to": to_email,
            "subject": subject,
            "body": text_body,
            "html": html_body,
            "mock_id": mock_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        DevMockEmailProvider.captured_messages.append(record)
        logger.info(f"[DEV_MOCK_EMAIL] Captured OTP Email to {to_email}: Subject='{subject}'")

        return EmailDeliveryResult(
            success=True,
            status=DeliveryStatus.REQUEST_ACCEPTED,
            provider_name="dev_mock",
            provider_message_id=mock_id,
            raw_response={"mock": True, "captured": True},
        )

    @classmethod
    def get_latest_for(cls, email: str) -> Optional[Dict[str, Any]]:
        for item in reversed(cls.captured_messages):
            if item["to"] == email:
                return item
        return None

    @classmethod
    def clear(cls):
        cls.captured_messages.clear()


class UnconfiguredEmailProvider(BaseEmailProvider):
    """
    Truthful fallback provider used when no email gateway credentials are configured.
    Never claims email was delivered.
    """

    def is_configured(self) -> bool:
        return False

    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
    ) -> EmailDeliveryResult:
        logger.warning(
            f"Email dispatch requested for {to_email}, but no email gateway is configured in the environment."
        )
        return EmailDeliveryResult(
            success=False,
            status=DeliveryStatus.NOT_CONFIGURED,
            provider_name="unconfigured",
            error_message="Email service is not configured. Contact the application administrator.",
        )


def get_email_provider() -> BaseEmailProvider:
    """
    Provider factory adhering to configured environment and active provider choice.
    Ensures OTP_DEV_MODE is only respected in development/testing.
    """
    provider_name = (settings.EMAIL_PROVIDER or "").strip().lower()

    # 1. Explicit SMTP
    if provider_name == "smtp":
        return SMTPEmailProvider()

    # 2. Explicit Resend
    if provider_name == "resend":
        return ResendEmailProvider()

    # 3. Explicit SendGrid
    if provider_name == "sendgrid":
        return SendGridEmailProvider()

    # 4. Explicit dev/mock or OTP_DEV_MODE enabled
    if provider_name in ("dev", "mock") or settings.OTP_DEV_MODE:
        if settings.ENVIRONMENT == "production":
            logger.error("Attempted to use DevMockEmailProvider in production environment!")
            return UnconfiguredEmailProvider()
        return DevMockEmailProvider()

    # 5. Auto-detection if credentials present
    if settings.SMTP_HOST and settings.EMAIL_FROM_ADDRESS:
        return SMTPEmailProvider()
    if settings.EMAIL_API_KEY and settings.EMAIL_FROM_ADDRESS:
        return ResendEmailProvider()

    # 6. Default unconfigured fallback
    return UnconfiguredEmailProvider()
