from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_current_user_profile():
    return {
        "status": "placeholder",
        "message": "User profile retrieval placeholder ready."
    }


@router.patch("/me")
async def update_current_user_profile():
    return {
        "status": "placeholder",
        "message": "User profile update placeholder ready."
    }
