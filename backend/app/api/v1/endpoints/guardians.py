from datetime import datetime, timezone, timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.guardian import Guardian
from app.schemas.guardian import (
    GuardianCreateRequest,
    GuardianUpdateRequest,
    GuardianVerifyOTPRequest,
    GuardianResponse,
)

logger = logging.getLogger("safesphere.guardian")
router = APIRouter()


@router.post("", response_model=GuardianResponse, status_code=status.HTTP_201_CREATED)
def link_guardian(
    payload: GuardianCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Connects a primary guardian to a minor account (<18).
    Adults cannot establish a minor guardian link.
    Prevents self-assignment and initializes verification protocol.
    """
    # 1. Validate that user is a minor
    if not current_user.is_minor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guardian Connect is only applicable for minor accounts under age 18. Adult accounts do not require a guardian."
        )

    # 2. Prevent self-assignment as guardian
    clean_guardian_phone = payload.guardian_phone.strip()
    if clean_guardian_phone == current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot assign themselves as their own guardian. Please provide a parent or legal guardian's contact."
        )

    if payload.guardian_email and payload.guardian_email.lower() == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot assign their own email address as the guardian contact."
        )

    # 3. Check if minor already has a guardian record
    existing_guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()

    now = datetime.now(timezone.utc)
    otp = settings.OTP_DEV_CODE
    otp_expiry = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    if existing_guardian:
        # Update existing record
        existing_guardian.guardian_name = payload.guardian_name.strip()
        existing_guardian.guardian_phone = clean_guardian_phone
        existing_guardian.guardian_email = payload.guardian_email.lower() if payload.guardian_email else None
        existing_guardian.relationship = payload.relationship
        existing_guardian.verification_status = "PENDING"
        existing_guardian.consent_status = "PENDING"
        existing_guardian.verification_otp = otp
        existing_guardian.otp_expires_at = otp_expiry
        guardian = existing_guardian
    else:
        # Create new Guardian
        guardian = Guardian(
            minor_user_id=current_user.id,
            guardian_name=payload.guardian_name.strip(),
            guardian_phone=clean_guardian_phone,
            guardian_email=payload.guardian_email.lower() if payload.guardian_email else None,
            relationship=payload.relationship,
            verification_status="PENDING",
            consent_status="PENDING",
            verification_otp=otp,
            otp_expires_at=otp_expiry,
        )
        db.add(guardian)

    db.commit()
    db.refresh(guardian)

    logger.info(f"Guardian registered for minor {current_user.id}: {guardian.guardian_name} ({guardian.relationship})")
    return guardian


@router.get("/me", response_model=GuardianResponse)
def get_my_guardian(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the primary guardian connected to the minor account.
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian currently linked to this minor account."
        )
    return guardian


@router.put("/me", response_model=GuardianResponse)
def update_my_guardian(
    payload: GuardianUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates details for the connected guardian.
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian found to update. Complete guardian setup first."
        )

    if payload.guardian_name is not None:
        guardian.guardian_name = payload.guardian_name.strip()

    if payload.guardian_phone is not None:
        clean_phone = payload.guardian_phone.strip()
        if clean_phone == current_user.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot assign their own phone number as guardian contact."
            )
        guardian.guardian_phone = clean_phone
        guardian.verification_status = "PENDING"
        guardian.consent_status = "PENDING"

    if payload.guardian_email is not None:
        if payload.guardian_email.lower() == current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot assign their own email as guardian contact."
            )
        guardian.guardian_email = payload.guardian_email.lower()

    if payload.relationship is not None:
        guardian.relationship = payload.relationship

    db.commit()
    db.refresh(guardian)
    return guardian


@router.delete("/me", status_code=status.HTTP_200_OK)
def remove_my_guardian(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Removes the linked guardian record.
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian found to remove."
        )

    db.delete(guardian)
    db.commit()
    return {
        "status": "removed",
        "message": "Guardian relationship removed successfully. A minor account will require guardian setup before engaging in SafeSphere journeys."
    }


@router.post("/verify", response_model=GuardianResponse)
def verify_guardian_otp(
    payload: GuardianVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifies guardian consent via OTP verification.
    Transitions verification_status to VERIFIED and consent_status to ACCEPTED.
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian record found to verify."
        )

    now = datetime.now(timezone.utc)
    expiry = guardian.otp_expires_at
    if expiry:
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification OTP has expired. Please request a new verification code."
            )

    # Check OTP (support configured code or dev code)
    expected_otp = guardian.verification_otp or settings.OTP_DEV_CODE
    if payload.otp_code.strip() != expected_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP verification code. Please check the code sent to the guardian."
        )

    guardian.verification_status = "VERIFIED"
    guardian.consent_status = "ACCEPTED"
    guardian.verification_otp = None
    guardian.otp_expires_at = None

    db.commit()
    db.refresh(guardian)

    logger.info(f"Guardian verified successfully for minor user {current_user.id}")
    return guardian
