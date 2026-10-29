from fastapi import Depends, FastAPI, WebSocket
from app.core.auth import authenticate_websocket, get_current_user
from app.features.central_bank.router import router as central_bank_router
from app.features.economic_calendar.router import router as economic_calendar_router
from app.features.global_index.router import router as global_index_router
from app.features.macro_bias.router import router as macro_bias_router

app = FastAPI(title="Supernova Macro Intelligence API")

app.include_router(central_bank_router, dependencies=[Depends(get_current_user)])
app.include_router(economic_calendar_router, dependencies=[Depends(get_current_user)])
app.include_router(global_index_router, dependencies=[Depends(get_current_user)])
app.include_router(macro_bias_router, dependencies=[Depends(get_current_user)])


@app.websocket("/ws/bias")
async def ws_macro_bias(websocket: WebSocket):
    claims = await authenticate_websocket(websocket)
    await websocket.send_json({"type": "status", "user": claims.get("sub")})
