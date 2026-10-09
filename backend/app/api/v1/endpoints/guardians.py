from datetime import datetime, timezone, timedelta
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.core.phone_utils import (
    normalize_phone_number,
    mask_phone_number,
    mask_email,
    mask_destination,
    is_valid_phone,
    is_valid_email,
)
from app.models.user import User
from app.models.guardian import Guardian, GuardianVerificationChallenge
from app.schemas.guardian import (
    GuardianCreateRequest,
    GuardianUpdateRequest,
    GuardianVerifyOTPRequest,
    GuardianOTPTriggerRequest,
    GuardianResponse,
    GuardianOTPRequestResponse,
    GuardianChallengeStatusResponse,
)
from app.services.sms_provider import get_sms_provider, DeliveryStatus
from app.services.email_provider import get_email_provider
from app.services.otp_service import (
    generate_secure_otp,
    generate_salt,
    hash_otp,
    verify_otp_hash,
    format_otp_message,
    format_otp_email,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger("safesphere.guardian")
router = APIRouter()
notification_service = NotificationService()


async def _issue_and_dispatch_otp_challenge(
    db: Session,
    guardian: Guardian,
    minor_user: User,
    delivery_method: str = "sms",
) -> GuardianVerificationChallenge:
    """
    Internal helper:
    1. Validates destination based on selected delivery method (SMS or Email).
    2. Supersedes all existing active challenges for this guardian.
    3. Generates a cryptographically secure 6-digit OTP and cryptographic salt.
    4. Hashes the OTP verifier using HMAC-SHA256 (plaintext is never persisted).
    5. Dispatches OTP via configured SMS or Email gateway.
    6. Records the challenge and notification audit log.
    """
    method = (delivery_method or "sms").lower().strip()
    if method not in ("sms", "email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery method. Supported options are 'sms' and 'email'."
        )

    now = datetime.now(timezone.utc)
    expiry = now + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)

    # 1. Validate destination
    if method == "sms":
        if not guardian.guardian_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guardian phone number is required for SMS delivery."
            )
        try:
            destination = normalize_phone_number(guardian.guardian_phone)
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))
    else:  # email
        if not guardian.guardian_email or not guardian.guardian_email.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guardian email address is not registered. Please provide a guardian email first or choose SMS delivery."
            )
        if not is_valid_email(guardian.guardian_email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Guardian email address is not valid."
            )
        destination = guardian.guardian_email.strip().lower()

    # 2. Supersede any existing challenges
    previous_challenges = (
        db.query(GuardianVerificationChallenge)
        .filter(
            GuardianVerificationChallenge.guardian_id == guardian.id,
            GuardianVerificationChallenge.is_consumed.is_(False),
            GuardianVerificationChallenge.is_superseded.is_(False),
        )
        .all()
    )
    for prev in previous_challenges:
        prev.is_superseded = True

    # 3. Generate secure OTP
    otp_code = generate_secure_otp()
    salt = generate_salt()
    otp_verifier_hash = hash_otp(otp_code, salt, settings.JWT_SECRET_KEY)

    # 4. Dispatch via selected provider
    if method == "sms":
        sms_message = format_otp_message(otp_code, settings.OTP_EXPIRY_SECONDS)
        provider = get_sms_provider()
        dispatch_result = await provider.send_sms(destination, sms_message)
        notification_channel = "SMS" if provider.is_configured() else "DEV_MOCK"
        message_content = sms_message
    else:
        subject, text_body, html_body = format_otp_email(otp_code, settings.OTP_EXPIRY_SECONDS)
        provider = get_email_provider()
        dispatch_result = await provider.send_email(destination, subject, text_body, html_body)
        notification_channel = "EMAIL" if provider.is_configured() else "DEV_MOCK"
        message_content = text_body

    # 5. Persist Challenge entity
    challenge = GuardianVerificationChallenge(
        guardian_id=guardian.id,
        minor_user_id=minor_user.id,
        phone_number=guardian.guardian_phone,
        delivery_method=method,
        destination=destination,
        otp_hash=otp_verifier_hash,
        otp_salt=salt,
        expires_at=expiry,
        attempts_used=0,
        max_attempts=settings.OTP_MAX_ATTEMPTS,
        is_consumed=False,
        is_superseded=False,
        delivery_status=dispatch_result.status,
        provider_name=dispatch_result.provider_name,
        provider_reference=dispatch_result.provider_message_id,
        provider_error=dispatch_result.error_message,
    )
    db.add(challenge)

    # 6. Legacy compatibility fields on Guardian model
    # (Allows test_step2 and existing dev mocks to verify seamlessly in dev mode)
    guardian.verification_otp = otp_code if (settings.OTP_DEV_MODE and settings.ENVIRONMENT != "production") else None
    guardian.otp_expires_at = expiry

    # 7. Record notification audit trail
    notification_service.record_notification_result(
        db=db,
        user_id=minor_user.id,
        event_id=str(guardian.id),
        recipient_id=str(guardian.id),
        recipient_name=guardian.guardian_name,
        recipient_phone=guardian.guardian_phone if method == "sms" else None,
        recipient_type="GUARDIAN",
        event_type="GUARDIAN_OTP_VERIFICATION",
        channel=notification_channel,
        delivery_status=dispatch_result.status,
        message_content=message_content,
        provider_message_id=dispatch_result.provider_message_id,
        error_message=dispatch_result.error_message,
    )

    db.commit()
    db.refresh(challenge)

    # Temporarily stash generated plaintext OTP onto instance strictly for dev mode
    if settings.OTP_DEV_MODE and settings.ENVIRONMENT != "production":
        challenge._generated_plaintext_otp = otp_code
    else:
        challenge._generated_plaintext_otp = None

    return challenge


@router.post("", response_model=GuardianResponse, status_code=status.HTTP_201_CREATED)
def link_guardian(
    payload: GuardianCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Connects a primary guardian to a minor account (<18).
    Normalizes phone number, prevents self-assignment, and saves guardian contact details.
    Contact verification via OTP is not enabled.
    """
    # 1. Validate that user is a minor
    if not current_user.is_minor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guardian Connect is only applicable for minor accounts under age 18. Adult accounts do not require a guardian."
        )

    # 2. Normalize and validate guardian phone
    try:
        clean_guardian_phone = normalize_phone_number(payload.guardian_phone)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))

    # 3. Prevent self-assignment as guardian
    if current_user.phone and payload.guardian_phone.strip() == current_user.phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot assign themselves as their own guardian. Please provide a parent or legal guardian's contact."
        )

    if payload.guardian_email and current_user.email and payload.guardian_email.lower() == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot assign their own email address as the guardian contact."
        )

    # 4. Check if minor already has a guardian record
    existing_guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()

    if existing_guardian:
        existing_guardian.guardian_name = payload.guardian_name.strip()
        existing_guardian.guardian_phone = clean_guardian_phone
        existing_guardian.guardian_email = payload.guardian_email.lower() if payload.guardian_email else None
        existing_guardian.relationship = payload.relationship
        existing_guardian.verification_status = "NOT_VERIFIED"
        existing_guardian.consent_status = "PENDING"
        existing_guardian.phone_verified = False
        existing_guardian.email_verified = False
        guardian = existing_guardian
    else:
        guardian = Guardian(
            minor_user_id=current_user.id,
            guardian_name=payload.guardian_name.strip(),
            guardian_phone=clean_guardian_phone,
            guardian_email=payload.guardian_email.lower() if payload.guardian_email else None,
            relationship=payload.relationship,
            verification_status="NOT_VERIFIED",
            consent_status="PENDING",
            phone_verified=False,
            email_verified=False,
        )
        db.add(guardian)

    db.commit()
    db.refresh(guardian)

    logger.info(f"Guardian registered for minor {current_user.id}: {guardian.guardian_name} ({guardian.relationship}) - verification not enabled")
    return guardian


@router.get("/me", response_model=GuardianResponse)
def get_my_guardian(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
):
    """
    Updates details for the connected guardian.
    Contact verification via OTP is not enabled.
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
        clean_phone = normalize_phone_number(payload.guardian_phone)
        user_phone = current_user.phone or ""
        try:
            user_phone = normalize_phone_number(user_phone) if user_phone else ""
        except Exception:
            pass

        if clean_phone == user_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot assign their own phone number as guardian contact."
            )

        if clean_phone != guardian.guardian_phone:
            guardian.guardian_phone = clean_phone
            guardian.verification_status = "NOT_VERIFIED"
            guardian.consent_status = "PENDING"
            guardian.phone_verified = False

    if payload.guardian_email is not None:
        if current_user.email and payload.guardian_email.lower() == current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot assign their own email as guardian contact."
            )
        clean_email = payload.guardian_email.lower().strip() if payload.guardian_email else None
        if clean_email != guardian.guardian_email:
            guardian.guardian_email = clean_email
            guardian.email_verified = False

    if payload.relationship is not None:
        guardian.relationship = payload.relationship

    db.commit()
    db.refresh(guardian)
    logger.info(f"Guardian updated for minor {current_user.id}: {guardian.guardian_name} - verification not enabled")
    return guardian


@router.delete("/me", status_code=status.HTTP_200_OK)
def remove_my_guardian(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes the linked guardian record and invalidates associated challenges.
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


@router.post("/request-otp", response_model=GuardianOTPRequestResponse, deprecated=True)
@router.post("/resend-otp", response_model=GuardianOTPRequestResponse, deprecated=True)
@router.post("/send-otp", response_model=GuardianOTPRequestResponse, deprecated=True)
async def request_or_resend_guardian_otp(
    payload: Optional[GuardianOTPTriggerRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Requests a new OTP verification challenge via SMS or Email.
    Enforces rate limiting (cooldown), invalidates previous challenges,
    dispatches via configured provider, and returns delivery status.
    """
    if not current_user.is_minor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guardian OTP verification is only applicable to minor accounts."
        )

    guardian = None
    if payload and payload.guardian_id:
        guardian = (
            db.query(Guardian)
            .filter(Guardian.id == payload.guardian_id, Guardian.minor_user_id == current_user.id)
            .first()
        )
    elif payload and payload.guardian_phone:
        try:
            norm_phone = normalize_phone_number(payload.guardian_phone)
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))
        guardian = (
            db.query(Guardian)
            .filter(Guardian.guardian_phone == norm_phone, Guardian.minor_user_id == current_user.id)
            .first()
        )

    if not guardian:
        guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()

    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian linked to this minor account. Add guardian details first."
        )

    if guardian.verification_status == "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guardian has already been verified and consent confirmed."
        )

    delivery_method = (payload.delivery_method if (payload and payload.delivery_method) else "sms").lower().strip()
    if delivery_method not in ("sms", "email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery method. Choose 'sms' or 'email'."
        )

    now = datetime.now(timezone.utc)

    # 1. Validate that requested provider is configured before attempting challenge or imposing cooldown
    provider = get_sms_provider() if delivery_method == "sms" else get_email_provider()
    if not provider.is_configured():
        service_name = "SMS" if delivery_method == "sms" else "Email"
        logger.warning(f"OTP requested for guardian {guardian.id}, but {service_name} gateway is unconfigured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{service_name} verification is not configured. Please contact the application administrator."
        )

    # 2. Rate limiting and Resend Cooldown (Section 5):
    # Only enforce cooldown if a previous legitimate challenge was successfully dispatched
    latest_dispatched_challenge = (
        db.query(GuardianVerificationChallenge)
        .filter(
            GuardianVerificationChallenge.guardian_id == guardian.id,
            GuardianVerificationChallenge.is_superseded.is_(False),
            GuardianVerificationChallenge.is_consumed.is_(False),
            GuardianVerificationChallenge.delivery_status.in_([
                DeliveryStatus.REQUEST_ACCEPTED,
                DeliveryStatus.SENT,
                DeliveryStatus.DELIVERED,
            ]),
        )
        .order_by(GuardianVerificationChallenge.created_at.desc())
        .first()
    )

    if latest_dispatched_challenge:
        created_at = latest_dispatched_challenge.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed_seconds = (now - created_at).total_seconds()
        if elapsed_seconds < settings.OTP_RESEND_COOLDOWN_SECONDS:
            cooldown_remaining = max(1, int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed_seconds))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {cooldown_remaining} seconds before requesting a new verification code."
            )

    # 3. Issue new challenge and dispatch via provider
    challenge = await _issue_and_dispatch_otp_challenge(db, guardian, current_user, delivery_method=delivery_method)

    if challenge.delivery_status == DeliveryStatus.FAILED:
        logger.error(f"OTP dispatch failed for guardian {guardian.id}: {challenge.provider_error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=challenge.provider_error or f"Could not send the verification code via {delivery_method.upper()}. Please try again later."
        )

    # Successful initiation
    masked_dest = mask_destination(challenge.destination, delivery_method)
    message = f"Verification code dispatched to {masked_dest}."

    dev_otp_val = None
    if settings.OTP_DEV_MODE and settings.ENVIRONMENT != "production":
        dev_otp_val = getattr(challenge, "_generated_plaintext_otp", settings.OTP_DEV_CODE)

    return GuardianOTPRequestResponse(
        success=True,
        challenge_id=challenge.id,
        guardian_id=guardian.id,
        delivery_method=delivery_method,
        destination=challenge.destination,
        masked_destination=masked_dest,
        masked_phone=mask_phone_number(guardian.guardian_phone),
        masked_email=mask_email(guardian.guardian_email) if guardian.guardian_email else None,
        status=challenge.delivery_status,
        delivery_status=challenge.delivery_status,
        provider_name=challenge.provider_name,
        expires_in_seconds=settings.OTP_EXPIRY_SECONDS,
        resend_after_seconds=settings.OTP_RESEND_COOLDOWN_SECONDS,
        resend_cooldown_seconds=settings.OTP_RESEND_COOLDOWN_SECONDS,
        attempts_remaining=challenge.max_attempts,
        message=message,
        dev_otp=dev_otp_val,
    )


@router.get("/challenge-status", response_model=GuardianChallengeStatusResponse, deprecated=True)
def get_guardian_challenge_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the real-time status of the active OTP challenge (Deprecated).
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        return GuardianChallengeStatusResponse(has_guardian=False)

    sms_configured = get_sms_provider().is_configured()
    email_configured = get_email_provider().is_configured()
    masked_phone = mask_phone_number(guardian.guardian_phone)
    masked_email = mask_email(guardian.guardian_email) if guardian.guardian_email else None

    now = datetime.now(timezone.utc)
    latest_challenge = (
        db.query(GuardianVerificationChallenge)
        .filter(
            GuardianVerificationChallenge.guardian_id == guardian.id,
            GuardianVerificationChallenge.is_superseded.is_(False),
        )
        .order_by(GuardianVerificationChallenge.created_at.desc())
        .first()
    )

    if not latest_challenge:
        return GuardianChallengeStatusResponse(
            has_guardian=True,
            guardian=guardian,
            delivery_method="sms",
            masked_phone=masked_phone,
            masked_email=masked_email,
            masked_destination=masked_phone,
            sms_configured=sms_configured,
            email_configured=email_configured,
            delivery_status=DeliveryStatus.NOT_CONFIGURED if (not sms_configured and not email_configured) else DeliveryStatus.PENDING,
            resend_cooldown_seconds=0,
            attempts_remaining=settings.OTP_MAX_ATTEMPTS,
        )

    # Cooldown and expiry only apply if challenge was legitimately and successfully dispatched
    is_dispatched = (
        not latest_challenge.is_consumed
        and latest_challenge.delivery_status in (
            DeliveryStatus.REQUEST_ACCEPTED,
            DeliveryStatus.SENT,
            DeliveryStatus.DELIVERED,
        )
    )

    if is_dispatched:
        exp = latest_challenge.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        seconds_until_expiry = max(0, int((exp - now).total_seconds()))

        created = latest_challenge.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (now - created).total_seconds()
        cooldown_left = max(0, int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed))
    else:
        seconds_until_expiry = 0
        cooldown_left = 0

    attempts_left = max(0, latest_challenge.max_attempts - latest_challenge.attempts_used)

    delivery_method = latest_challenge.delivery_method or "sms"
    masked_dest = mask_destination(latest_challenge.destination, delivery_method) if latest_challenge.destination else (masked_email if delivery_method == "email" else masked_phone)

    return GuardianChallengeStatusResponse(
        has_guardian=True,
        guardian=guardian,
        active_challenge_id=latest_challenge.id if is_dispatched else None,
        delivery_method=delivery_method,
        destination=latest_challenge.destination,
        masked_destination=masked_dest,
        masked_phone=masked_phone,
        masked_email=masked_email,
        sms_configured=sms_configured,
        email_configured=email_configured,
        delivery_status=latest_challenge.delivery_status,
        expires_in_seconds=seconds_until_expiry,
        resend_cooldown_seconds=cooldown_left,
        attempts_remaining=attempts_left,
        provider_name=latest_challenge.provider_name,
        message=latest_challenge.provider_error,
        dev_otp=None,
    )


@router.post("/verify-otp", response_model=GuardianResponse, deprecated=True)
@router.post("/verify", response_model=GuardianResponse, deprecated=True)
def verify_guardian_otp(
    payload: GuardianVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verifies guardian consent via OTP (Deprecated).
    Validates challenge ownership, single-use integrity, expiry, and attempt limits.
    Transitions verification_status to VERIFIED and consent_status to ACCEPTED.
    """
    guardian = db.query(Guardian).filter(Guardian.minor_user_id == current_user.id).first()
    if not guardian:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No guardian record found to verify."
        )

    if guardian.verification_status == "VERIFIED":
        return guardian

    now = datetime.now(timezone.utc)
    try:
        entered_code = payload.get_code()
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))

    # 1. Locate challenge
    challenge_query = db.query(GuardianVerificationChallenge).filter(
        GuardianVerificationChallenge.guardian_id == guardian.id
    )

    if payload.challenge_id:
        challenge = challenge_query.filter(GuardianVerificationChallenge.id == payload.challenge_id).first()
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification challenge not found or does not belong to this guardian."
            )
    else:
        # Default to latest non-superseded, non-consumed challenge
        q = (
            challenge_query
            .filter(GuardianVerificationChallenge.is_superseded.is_(False))
            .filter(GuardianVerificationChallenge.is_consumed.is_(False))
        )
        if payload.delivery_method:
            q = q.filter(GuardianVerificationChallenge.delivery_method == payload.delivery_method)
        challenge = q.order_by(GuardianVerificationChallenge.created_at.desc()).first()

    # 2. If no challenge entity exists (e.g., legacy Step 2 test fixture)
    if not challenge:
        # Fallback to legacy guardian columns
        expiry = guardian.otp_expires_at
        if expiry:
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry < now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The verification code has expired. Please request a new code."
                )

        expected_otp = guardian.verification_otp or (settings.OTP_DEV_CODE if settings.OTP_DEV_MODE else None)
        if not expected_otp or entered_code != expected_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP verification code. The verification code is incorrect."
            )

        guardian.verification_status = "VERIFIED"
        guardian.consent_status = "ACCEPTED"
        guardian.phone_verified = True
        guardian.verification_otp = None
        guardian.otp_expires_at = None
        db.commit()
        db.refresh(guardian)
        return guardian

    # 3. Validate cross-channel challenge integrity (Section 6)
    if payload.delivery_method and challenge.delivery_method != payload.delivery_method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cross-channel mismatch: This verification challenge was issued for {challenge.delivery_method.upper()}, but verification was submitted for {payload.delivery_method.upper()}. Please enter the code sent to your {payload.delivery_method.upper()} destination."
        )

    if challenge.is_consumed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has already been used. Please request a new code."
        )

    if challenge.is_superseded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A newer verification code has been issued. Please enter the latest code or request a new one."
        )

    if challenge.attempts_used >= challenge.max_attempts:
        challenge.delivery_status = DeliveryStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many invalid attempts. This verification code has been locked. Please request a new code."
        )

    # Check delivery status integrity for unconfigured challenge
    if challenge.delivery_status == DeliveryStatus.NOT_CONFIGURED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code was successfully dispatched for this challenge. Please request a new code."
        )

    exp = challenge.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now:
        challenge.delivery_status = DeliveryStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a new code."
        )

    # 5. Increment attempts counter
    challenge.attempts_used += 1

    # 6. Verify cryptographic keyed hash (or dev code in dev mode)
    is_valid_hash = verify_otp_hash(
        entered_otp=entered_code,
        salt=challenge.otp_salt,
        expected_hash=challenge.otp_hash,
        secret_key=settings.JWT_SECRET_KEY,
    )

    is_valid_dev_code = (
        settings.OTP_DEV_MODE
        and settings.ENVIRONMENT != "production"
        and entered_code == settings.OTP_DEV_CODE
    )

    if not (is_valid_hash or is_valid_dev_code):
        attempts_left = max(0, challenge.max_attempts - challenge.attempts_used)
        if attempts_left == 0:
            challenge.delivery_status = DeliveryStatus.FAILED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many invalid attempts. This verification code has been locked. Please request a new code."
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP verification code. {attempts_left} attempt(s) remaining. The verification code is incorrect. Check the latest code sent to your selected destination."
        )

    # 6. Verification Success
    challenge.is_consumed = True
    challenge.consumed_at = now
    challenge.delivery_status = DeliveryStatus.VERIFIED

    guardian.verification_status = "VERIFIED"
    guardian.consent_status = "ACCEPTED"
    if challenge.delivery_method == "email":
        guardian.email_verified = True
    else:
        guardian.phone_verified = True
    guardian.verified_delivery_method = challenge.delivery_method
    guardian.verification_otp = None
    guardian.otp_expires_at = None

    db.commit()
    db.refresh(guardian)

    logger.info(f"Guardian {guardian.id} verified successfully via OTP ({challenge.delivery_method}) for minor {current_user.id}")
    return guardian
