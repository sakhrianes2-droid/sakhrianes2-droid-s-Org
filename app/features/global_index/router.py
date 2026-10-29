from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/api/macro/global_index",
    tags=["global_index"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def get_global_macro_index(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub")}
