from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
import re


class GuardianCreateRequest(BaseModel):
    """
    Guardian registration payload submitted by a minor account holder.
    """
    guardian_name: str = Field(..., min_length=2, max_length=150)
    guardian_phone: str = Field(..., min_length=7, max_length=25)
    guardian_email: Optional[EmailStr] = None
    relationship: Literal["Parent", "Guardian", "Mother", "Father", "Other"]

    @field_validator("guardian_phone")
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
            raise ValueError("Guardian phone must be a valid format with 7 to 15 digits.")
        return v


class GuardianUpdateRequest(BaseModel):
    """
    Guardian update payload.
    """
    guardian_name: Optional[str] = Field(None, min_length=2, max_length=150)
    guardian_phone: Optional[str] = Field(None, min_length=7, max_length=25)
    guardian_email: Optional[EmailStr] = None
    relationship: Optional[Literal["Parent", "Guardian", "Mother", "Father", "Other"]] = None

    @field_validator("guardian_phone")
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = re.sub(r"[\s\-\(\)]", "", v)
            if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
                raise ValueError("Guardian phone must be a valid format with 7 to 15 digits.")
        return v


class GuardianVerifyOTPRequest(BaseModel):
    """
    OTP submission payload to verify guardian consent.
    """
    otp_code: str = Field(..., min_length=4, max_length=10)


class GuardianResponse(BaseModel):
    """
    Standard Guardian response schema.
    """
    id: UUID
    minor_user_id: UUID
    guardian_name: str
    guardian_phone: str
    guardian_email: Optional[str] = None
    relationship: str
    verification_status: str
    consent_status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
