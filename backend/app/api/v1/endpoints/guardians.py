from fastapi import APIRouter

router = APIRouter()


@router.get("/wards")
async def list_guardian_wards():
    return {
        "status": "placeholder",
        "wards": [],
        "message": "Guardian ward monitoring list placeholder ready."
    }


@router.post("/link")
async def link_guardian_ward():
    return {
        "status": "placeholder",
        "message": "Guardian-ward relationship linkage placeholder ready."
    }
