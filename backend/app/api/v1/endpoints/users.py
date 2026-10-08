from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserUpdateRequest, UserProfileResponse

router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieves the authenticated user's profile, safety account attributes, and guardian link.
    """
    response = UserProfileResponse.model_validate(current_user)
    response.has_guardian = bool(current_user.guardian)
    if current_user.guardian:
        response.guardian = current_user.guardian
    return response


@router.put("/me", response_model=UserProfileResponse)
def update_user_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates editable profile attributes (full_name, phone, user_type, profile_image_url).
    Sensitive attributes (email, date_of_birth, age, is_minor, role) are strictly protected.
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if payload.phone is not None:
        current_user.phone = payload.phone.strip()

    if payload.user_type is not None:
        current_user.user_type = payload.user_type

    if payload.profile_image_url is not None:
        current_user.profile_image_url = payload.profile_image_url

    db.commit()
    db.refresh(current_user)

    response = UserProfileResponse.model_validate(current_user)
    response.has_guardian = bool(current_user.guardian)
    if current_user.guardian:
        response.guardian = current_user.guardian
    return response


@router.get("/admin/system-status")
def get_admin_system_status(
    admin_user: User = Depends(require_role("SYSTEM_ADMIN", "ORGANIZATION_ADMIN"))
):
    """
    Protected administrative route demonstrating RBAC dependency.
    """
    return {
        "status": "operational",
        "admin_uid": admin_user.firebase_uid,
        "admin_role": admin_user.role,
    }
