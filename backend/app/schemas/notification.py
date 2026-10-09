from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NotificationLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    event_id: Optional[str] = None
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_type: str
    event_type: str
    channel: str
    delivery_status: str
    message_content: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    attempted_at: datetime
    delivered_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
