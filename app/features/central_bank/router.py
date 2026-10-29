from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/api/macro/policy",
    tags=["central_bank"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def get_central_bank_policies(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub")}


@router.post("/analyze")
async def analyze_central_bank_speech(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    return {"status": "success", "user_id": current_user.get("sub"), "payload": payload}
