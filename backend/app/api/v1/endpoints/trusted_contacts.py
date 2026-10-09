import logging
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.trusted_contact import TrustedContact
from app.schemas.trusted_contact import (
    TrustedContactCreateRequest,
    TrustedContactUpdateRequest,
    TrustedContactVerifyRequest,
    TrustedContactResponse,
    TrustedContactPermissions,
)
from app.services.notification_service import notification_service

logger = logging.getLogger("safesphere.trusted_contacts")
router = APIRouter()


def _to_response(tc: TrustedContact) -> TrustedContactResponse:
    perms = TrustedContactPermissions(
        notify_journey_start=tc.notify_journey_start if tc.notify_journey_start is not None else True,
        notify_journey_end=tc.notify_journey_end if tc.notify_journey_end is not None else True,
        notify_safety_mode=tc.notify_safety_mode if tc.notify_safety_mode is not None else True,
        notify_sos=tc.notify_sos if tc.notify_sos is not None else True,
        share_live_location=tc.share_live_location if tc.share_live_location is not None else True,
        notify_emergency_updates=tc.notify_emergency_updates if tc.notify_emergency_updates is not None else True,
    )
    return TrustedContactResponse(
        id=tc.id,
        user_id=tc.user_id,
        contact_name=tc.name,
        phone=tc.phone_number,
        email=tc.email,
        relationship=tc.relationship,
        verification_status=tc.verification_status,
        is_emergency_recipient=tc.is_emergency_recipient,
        is_active=tc.is_active,
        permissions=perms,
        created_at=tc.created_at,
        updated_at=tc.updated_at,
    )


@router.get("", response_model=List[TrustedContactResponse])
def list_trusted_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists all active trusted contacts for the authenticated user.
    """
    contacts = (
        db.query(TrustedContact)
        .filter(TrustedContact.user_id == current_user.id, TrustedContact.is_active == True)
        .order_by(TrustedContact.created_at.desc())
        .all()
    )
    return [_to_response(c) for c in contacts]


@router.post("", response_model=TrustedContactResponse, status_code=status.HTTP_201_CREATED)
async def add_trusted_contact(
    payload: TrustedContactCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adds a new trusted contact to the user's Trusted Circle.
    Newly added contacts start with verification_status = 'PENDING'.
    """
    cleaned_phone = payload.phone.strip()
    
    # Check duplicate phone for this user
    existing = (
        db.query(TrustedContact)
        .filter(
            TrustedContact.user_id == current_user.id,
            TrustedContact.phone_number == cleaned_phone,
            TrustedContact.is_active == True,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A contact with this phone number already exists in your Trusted Circle.",
        )

    # Valid relationships
    valid_relationships = [
        "Parent", "Guardian", "Friend", "Sibling", "Spouse", "Partner", "Roommate", "Other"
    ]
    rel_normalized = payload.relationship.strip().capitalize()
    if rel_normalized not in valid_relationships:
        rel_normalized = "Friend"

    perms = payload.permissions or TrustedContactPermissions()

    contact = TrustedContact(
        user_id=current_user.id,
        name=payload.contact_name.strip(),
        phone_number=cleaned_phone,
        email=payload.email,
        relationship=rel_normalized,
        verification_status="PENDING",
        verification_code=settings.OTP_DEV_CODE,
        is_emergency_recipient=payload.is_emergency_recipient,
        is_active=True,
        notify_journey_start=perms.notify_journey_start,
        notify_journey_end=perms.notify_journey_end,
        notify_safety_mode=perms.notify_safety_mode,
        notify_sos=perms.notify_sos,
        share_live_location=perms.share_live_location,
        notify_emergency_updates=perms.notify_emergency_updates,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    # Log initial invitation attempt
    invitation_msg = (
        f"SafeSphere: {current_user.full_name} added you as a trusted emergency contact. "
        f"Your verification code is: {settings.OTP_DEV_CODE}"
    )
    sms_res = await notification_service.send_sms_notification(contact.phone_number, invitation_msg)
    channel = "SMS" if notification_service.is_sms_configured() else "DEV_MOCK"
    notification_service.record_notification_result(
        db=db,
        user_id=current_user.id,
        event_id=str(contact.id),
        recipient_id=str(contact.id),
        recipient_name=contact.name,
        recipient_phone=contact.phone_number,
        recipient_type="TRUSTED_CONTACT",
        event_type="CONTACT_INVITATION",
        channel=channel,
        delivery_status=sms_res["status"],
        message_content=invitation_msg,
        provider_message_id=sms_res.get("provider_id"),
        error_message=sms_res.get("error"),
    )
    db.commit()

    return _to_response(contact)


@router.get("/{contact_id}", response_model=TrustedContactResponse)
def get_trusted_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves details for a specific trusted contact with ownership validation.
    """
    contact = db.query(TrustedContact).filter(TrustedContact.id == contact_id).first()
    if not contact or not contact.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found.")

    if contact.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this contact.")

    return _to_response(contact)


@router.put("/{contact_id}", response_model=TrustedContactResponse)
def update_trusted_contact(
    contact_id: UUID,
    payload: TrustedContactUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates contact metadata or granular safety notification permissions.
    """
    contact = db.query(TrustedContact).filter(TrustedContact.id == contact_id).first()
    if not contact or not contact.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found.")

    if contact.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update another user's contact.")

    if payload.contact_name is not None:
        contact.name = payload.contact_name.strip()
    if payload.phone is not None:
        contact.phone_number = payload.phone.strip()
    if payload.email is not None:
        contact.email = payload.email
    if payload.relationship is not None:
        contact.relationship = payload.relationship.strip().capitalize()
    if payload.is_emergency_recipient is not None:
        contact.is_emergency_recipient = payload.is_emergency_recipient

    # Permission toggles
    if payload.notify_journey_start is not None:
        contact.notify_journey_start = payload.notify_journey_start
    if payload.notify_journey_end is not None:
        contact.notify_journey_end = payload.notify_journey_end
    if payload.notify_safety_mode is not None:
        contact.notify_safety_mode = payload.notify_safety_mode
    if payload.notify_sos is not None:
        contact.notify_sos = payload.notify_sos
    if payload.share_live_location is not None:
        contact.share_live_location = payload.share_live_location
    if payload.notify_emergency_updates is not None:
        contact.notify_emergency_updates = payload.notify_emergency_updates

    db.commit()
    db.refresh(contact)
    return _to_response(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_200_OK)
def delete_trusted_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes a contact from the user's Trusted Circle.
    """
    contact = db.query(TrustedContact).filter(TrustedContact.id == contact_id).first()
    if not contact or not contact.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found.")

    if contact.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another user's contact.")

    contact.is_active = False
    contact.verification_status = "REVOKED"
    db.commit()
    return {"status": "success", "message": f"Contact '{contact.name}' removed from Trusted Circle."}


@router.post("/{contact_id}/verify", response_model=TrustedContactResponse)
def verify_trusted_contact(
    contact_id: UUID,
    payload: TrustedContactVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verifies a pending trusted contact using OTP verification code.
    Accepts configured OTP code or dev mock code.
    """
    contact = db.query(TrustedContact).filter(TrustedContact.id == contact_id).first()
    if not contact or not contact.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found.")

    if contact.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot verify another user's contact.")

    entered_code = payload.code.strip()
    valid_codes = [settings.OTP_DEV_CODE]
    if contact.verification_code:
        valid_codes.append(contact.verification_code)

    if entered_code not in valid_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again.",
        )

    contact.verification_status = "VERIFIED"
    db.commit()
    db.refresh(contact)
    return _to_response(contact)


@router.post("/{contact_id}/resend-code")
async def resend_verification_code(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resends verification code to the contact's phone number.
    """
    contact = db.query(TrustedContact).filter(TrustedContact.id == contact_id).first()
    if not contact or not contact.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trusted contact not found.")

    if contact.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot resend code for another user's contact.")

    contact.verification_code = settings.OTP_DEV_CODE
    db.commit()

    invitation_msg = (
        f"SafeSphere: Verification code for {current_user.full_name}'s Trusted Circle is: {settings.OTP_DEV_CODE}"
    )
    sms_res = await notification_service.send_sms_notification(contact.phone_number, invitation_msg)
    channel = "SMS" if notification_service.is_sms_configured() else "DEV_MOCK"
    notification_service.record_notification_result(
        db=db,
        user_id=current_user.id,
        event_id=str(contact.id),
        recipient_id=str(contact.id),
        recipient_name=contact.name,
        recipient_phone=contact.phone_number,
        recipient_type="TRUSTED_CONTACT",
        event_type="CONTACT_VERIFICATION",
        channel=channel,
        delivery_status=sms_res["status"],
        message_content=invitation_msg,
        provider_message_id=sms_res.get("provider_id"),
        error_message=sms_res.get("error"),
    )
    db.commit()

    return {
        "status": "success",
        "message": f"Verification code sent to {contact.phone_number}.",
        "delivery_status": sms_res["status"],
        "dev_code": settings.OTP_DEV_CODE if settings.ENVIRONMENT == "development" else None,
    }
