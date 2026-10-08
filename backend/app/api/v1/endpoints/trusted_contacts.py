from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_trusted_contacts():
    return {
        "status": "placeholder",
        "contacts": [],
        "message": "Trusted Circle contacts list placeholder ready."
    }


@router.post("")
async def add_trusted_contact():
    return {
        "status": "placeholder",
        "message": "Add contact to Trusted Circle placeholder ready."
    }
