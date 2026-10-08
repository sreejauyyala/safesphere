import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.age import validate_and_evaluate_dob
from app.core.security import get_current_user, decode_token_payload
from app.models.user import User
from app.schemas.user import UserRegisterRequest, UserProfileResponse

logger = logging.getLogger("safesphere.auth")
router = APIRouter()


@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user profile linked to a Firebase authenticated account.
    Calculates exact age and minor status (<18) automatically from date of birth.
    """
    # 1. Validate Date of Birth and calculate age & minor status
    age, is_minor = validate_and_evaluate_dob(payload.date_of_birth)

    # 2. Check for duplicate email
    existing_email = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A SafeSphere account with this email address already exists."
        )

    # 3. Check for duplicate Firebase UID
    existing_uid = db.query(User).filter(User.firebase_uid == payload.firebase_uid).first()
    if existing_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This Firebase account is already linked to an existing profile."
        )

    # 4. Create User entity with default USER role
    user = User(
        firebase_uid=payload.firebase_uid,
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone.strip(),
        date_of_birth=payload.date_of_birth,
        age=age,
        is_minor=is_minor,
        user_type=payload.user_type,
        role="USER",  # Strictly assigned by backend
        profile_image_url=payload.profile_image_url,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"User registered: {user.id} ({user.email}), age={user.age}, is_minor={user.is_minor}")

    response = UserProfileResponse.model_validate(user)
    response.has_guardian = False
    return response


@router.get("/me", response_model=UserProfileResponse)
def get_auth_me(current_user: User = Depends(get_current_user)):
    """
    Returns current authenticated user profile and guardian status.
    """
    response = UserProfileResponse.model_validate(current_user)
    response.has_guardian = bool(current_user.guardian)
    if current_user.guardian:
        response.guardian = current_user.guardian
    return response
