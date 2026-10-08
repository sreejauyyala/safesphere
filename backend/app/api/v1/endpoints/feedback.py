from fastapi import APIRouter
from app.schemas.entities import FeedbackCreate

router = APIRouter()


@router.post("")
async def submit_feedback(payload: FeedbackCreate):
    return {
        "status": "placeholder",
        "rating": payload.rating,
        "message": "User feedback received successfully."
    }
