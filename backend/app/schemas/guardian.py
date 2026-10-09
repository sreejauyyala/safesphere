from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.core.phone_utils import (
    normalize_phone_number,
    mask_phone_number,
    mask_email,
    mask_destination,
)


class GuardianCreateRequest(BaseModel):
    """
    Guardian registration payload submitted by a minor account holder.
    Normalizes phone number to E.164.
    """
    guardian_name: str = Field(..., min_length=2, max_length=150)
    guardian_phone: str = Field(..., min_length=7, max_length=25)
    guardian_email: Optional[EmailStr] = None
    relationship: Literal["Parent", "Guardian", "Mother", "Father", "Other"]

    @field_validator("guardian_phone")
    def validate_and_normalize_phone(cls, v: str) -> str:
        try:
            normalize_phone_number(v)
            return v
        except ValueError as err:
            raise ValueError(str(err))


class GuardianUpdateRequest(BaseModel):
    """
    Guardian update payload.
    """
    guardian_name: Optional[str] = Field(None, min_length=2, max_length=150)
    guardian_phone: Optional[str] = Field(None, min_length=7, max_length=25)
    guardian_email: Optional[EmailStr] = None
    relationship: Optional[Literal["Parent", "Guardian", "Mother", "Father", "Other"]] = None

    @field_validator("guardian_phone")
    def validate_and_normalize_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                normalize_phone_number(v)
                return v
            except ValueError as err:
                raise ValueError(str(err))
        return v


class GuardianOTPTriggerRequest(BaseModel):
    """
    Payload when requesting or resending an OTP challenge.
    Supports selecting delivery method: 'sms' (default) or 'email'.
    """
    guardian_id: Optional[UUID] = None
    guardian_phone: Optional[str] = None
    delivery_method: Optional[Literal["sms", "email"]] = "sms"


class GuardianVerifyOTPRequest(BaseModel):
    """
    OTP submission payload to verify guardian consent.
    Accepts either otp_code or otp for broad client compatibility.
    """
    otp_code: Optional[str] = Field(None, min_length=4, max_length=10)
    otp: Optional[str] = Field(None, min_length=4, max_length=10)
    challenge_id: Optional[UUID] = None
    delivery_method: Optional[Literal["sms", "email"]] = None

    def get_code(self) -> str:
        code = self.otp_code or self.otp
        if not code or not code.strip():
            raise ValueError("Verification code (otp or otp_code) is required.")
        return code.strip()


class GuardianResponse(BaseModel):
    """
    Standard Guardian response schema with masked phone/email for safe display.
    """
    id: UUID
    minor_user_id: UUID
    guardian_name: str
    guardian_phone: str
    masked_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    masked_email: Optional[str] = None
    relationship: str
    verification_status: str
    consent_status: str
    phone_verified: bool = False
    email_verified: bool = False
    verified_delivery_method: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    def model_post_init(self, __context):
        if not self.masked_phone and self.guardian_phone:
            self.masked_phone = mask_phone_number(self.guardian_phone)
        if not self.masked_email and self.guardian_email:
            self.masked_email = mask_email(self.guardian_email)


class GuardianOTPRequestResponse(BaseModel):
    """
    Response returned when an OTP challenge is requested or resent.
    Satisfies Section 4 API contract while preserving diagnostic and dev properties.
    Never exposes raw OTP in production.
    """
    success: bool = True
    challenge_id: UUID
    guardian_id: Optional[UUID] = None
    delivery_method: str = "sms"
    destination: Optional[str] = None
    masked_destination: Optional[str] = None
    masked_phone: str
    masked_email: Optional[str] = None
    status: Optional[str] = None  # e.g. "REQUEST_ACCEPTED"
    delivery_status: str  # NOT_CONFIGURED, PENDING, REQUEST_ACCEPTED, SENT, DELIVERED, FAILED
    expires_in_seconds: int
    resend_after_seconds: Optional[int] = None
    resend_cooldown_seconds: int
    attempts_remaining: int
    provider_name: str
    message: str
    dev_otp: Optional[str] = None  # Populated strictly in development/test mode

    def model_post_init(self, __context):
        if self.status is None:
            self.status = self.delivery_status
        if self.resend_after_seconds is None:
            self.resend_after_seconds = self.resend_cooldown_seconds
        if not self.masked_destination:
            if self.delivery_method == "email" and self.masked_email:
                self.masked_destination = self.masked_email
            else:
                self.masked_destination = self.masked_phone


class GuardianChallengeStatusResponse(BaseModel):
    """
    Status of the currently active OTP challenge for Guardian Connect.
    """
    success: bool = True
    has_guardian: bool
    guardian: Optional[GuardianResponse] = None
    active_challenge_id: Optional[UUID] = None
    delivery_method: Optional[str] = "sms"
    destination: Optional[str] = None
    masked_destination: Optional[str] = None
    masked_phone: Optional[str] = None
    masked_email: Optional[str] = None
    sms_configured: bool = False
    email_configured: bool = False
    status: Optional[str] = None
    delivery_status: Optional[str] = None
    expires_in_seconds: Optional[int] = None
    resend_after_seconds: Optional[int] = None
    resend_cooldown_seconds: Optional[int] = None
    attempts_remaining: Optional[int] = None
    provider_name: Optional[str] = None
    message: Optional[str] = None
    dev_otp: Optional[str] = None

    def model_post_init(self, __context):
        if self.status is None and self.delivery_status is not None:
            self.status = self.delivery_status
        if self.resend_after_seconds is None and self.resend_cooldown_seconds is not None:
            self.resend_after_seconds = self.resend_cooldown_seconds
        if not self.masked_destination:
            if self.delivery_method == "email" and self.masked_email:
                self.masked_destination = self.masked_email
            else:
                self.masked_destination = self.masked_phone

