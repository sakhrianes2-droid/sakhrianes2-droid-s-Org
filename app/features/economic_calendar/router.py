from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/api/macro/calendar",
    tags=["economic_calendar"],
    dependencies=[Depends(get_current_user)],
)


@router.get("")
async def get_economic_calendar(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub"), "calendar": []}


@router.get("/alerts")
async def get_calendar_alerts(current_user: dict = Depends(get_current_user)):
    return {"status": "success", "user_id": current_user.get("sub"), "alerts": []}
