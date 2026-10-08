from datetime import date, datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
import re


class UserRegisterRequest(BaseModel):
    """
    User registration payload from frontend after Firebase Auth account creation.
    """
    firebase_uid: str = Field(..., min_length=4, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=25)
    date_of_birth: date
    user_type: Literal["Student", "Employee", "General Public", "Other"]
    profile_image_url: Optional[str] = None

    @field_validator("phone")
    def validate_phone(cls, v: str) -> str:
        # Strip spaces and hyphens for formatting
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
            raise ValueError("Phone number must be a valid format with 7 to 15 digits (e.g. +1234567890).")
        return v


class UserUpdateRequest(BaseModel):
    """
    Fields that can be updated on personal user profile.
    """
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, min_length=7, max_length=25)
    user_type: Optional[Literal["Student", "Employee", "General Public", "Other"]] = None
    profile_image_url: Optional[str] = None

    @field_validator("phone")
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = re.sub(r"[\s\-\(\)]", "", v)
            if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
                raise ValueError("Phone number must be a valid format with 7 to 15 digits.")
        return v


class GuardianSummaryResponse(BaseModel):
    """
    Safe summary of guardian details attached to a minor user profile.
    """
    id: UUID
    guardian_name: str
    guardian_phone: str
    guardian_email: Optional[str] = None
    relationship: str
    verification_status: str
    consent_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    """
    Complete SafeSphere user profile response.
    """
    id: UUID
    firebase_uid: str
    full_name: str
    email: str
    phone: str
    date_of_birth: date
    age: int
    is_minor: bool
    user_type: str
    role: str
    profile_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    has_guardian: bool = False
    guardian: Optional[GuardianSummaryResponse] = None

    model_config = ConfigDict(from_attributes=True)
