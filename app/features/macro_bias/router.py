from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/api/macro",
    tags=["macro_bias"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/bias")
async def get_macro_bias(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub"), "biases": []}


@router.get("/feeds")
async def get_macro_feeds(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub"), "feeds": []}
