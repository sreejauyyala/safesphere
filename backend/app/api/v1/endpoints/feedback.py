from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.community_feedback import (
    GeneralFeedbackCreate,
    CommunityFeedbackResponse,
)
from app.services.feedback_service import feedback_service

router = APIRouter()


@router.post("", response_model=CommunityFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_general_feedback(
    payload: GeneralFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits general community and platform feedback (e.g. app experience, map accuracy, route guidance).
    """
    return feedback_service.submit_general_feedback(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get("/me", response_model=List[CommunityFeedbackResponse])
def get_my_feedback_history(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves the authenticated user's private submission history of all community feedback.
    Never exposes feedback from other users.
    """
    return feedback_service.get_user_feedback_history(
        db=db,
        current_user=current_user,
        limit=limit,
        skip=skip,
    )
