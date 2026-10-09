import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.notification_log import NotificationLog
from app.schemas.notification import NotificationLogResponse

logger = logging.getLogger("safesphere.notifications_endpoint")
router = APIRouter()


@router.get("", response_model=List[NotificationLogResponse])
def get_user_notifications(
    limit: int = 25,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns private audit log of all outward safety notifications dispatched on behalf of the user.
    """
    logs = (
        db.query(NotificationLog)
        .filter(NotificationLog.user_id == current_user.id)
        .order_by(NotificationLog.attempted_at.desc())
        .limit(max(1, min(100, limit)))
        .all()
    )
    return logs


@router.get("/{notification_id}", response_model=NotificationLogResponse)
def get_notification_detail(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves details for a specific notification log entry with ownership validation.
    """
    log = db.query(NotificationLog).filter(NotificationLog.id == notification_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found.")

    if log.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this notification log.")

    return log
