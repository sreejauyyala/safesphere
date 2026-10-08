from fastapi import APIRouter
from app.services.notification_service import notification_service

router = APIRouter()


@router.post("/trigger")
async def trigger_emergency_sos():
    alert_result = await notification_service.send_emergency_alert(
        recipient_tokens=[],
        sender_name="Emergency User",
        location={"lat": 12.9716, "lng": 77.5946},
        alert_type="SOS_PANIC"
    )
    return {
        "status": "triggered_placeholder",
        "notification_dispatch": alert_result,
        "message": "Immediate SOS trigger module placeholder ready."
    }


@router.post("/cancel")
async def cancel_emergency_sos():
    return {
        "status": "cancelled_placeholder",
        "message": "SOS emergency cancellation placeholder ready."
    }
