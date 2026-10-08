from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    id_token: str


@router.post("/register")
async def register_user():
    return {
        "status": "placeholder",
        "message": "User registration module ready. Firebase Auth integration will be expanded in Step 2."
    }


@router.post("/login")
async def login_user():
    return {
        "status": "placeholder",
        "message": "User authentication module ready. Firebase session verification will be expanded in Step 2."
    }


@router.post("/verify-token")
async def verify_token():
    return {
        "status": "placeholder",
        "message": "Token verification endpoint ready."
    }
