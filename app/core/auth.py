"""
FastAPI Backend Security & Asymmetric JWKS JWT Verification Module
Enforces RS256 / ES256 JWKS verification, required claims (exp, sub, aud="authenticated"),
rejects alg="none", and secures WebSocket connections via sec-websocket-protocol or initial handshake frame.
"""

import os
import json
from typing import Any, Dict, Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Request, WebSocket, WebSocketException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
JWKS_URL = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""

ALLOWED_ASYMMETRIC_ALGORITHMS = ["RS256", "ES256"]
REQUIRED_AUDIENCE = "authenticated"

security_scheme = HTTPBearer(auto_error=True)
_jwk_client: Optional[PyJWKClient] = None


def get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not JWKS_URL:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_URL is not configured for JWKS resolution.",
            )
        _jwk_client = PyJWKClient(JWKS_URL, cache_keys=True)
    return _jwk_client


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Cryptographically verifies a Bearer JWT against Supabase's asymmetric JWKS endpoint (RS256/ES256),
    explicitly enforcing required claims (exp, sub, aud="authenticated") and rejecting alg="none".
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed JWT header: {exc}",
        ) from exc

    alg = unverified_header.get("alg", "")
    if not alg or str(alg).lower() == "none":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Rejected JWT: alg="none" is strictly forbidden.',
        )

    if alg not in ALLOWED_ASYMMETRIC_ALGORITHMS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported JWT algorithm '{alg}'. Allowed: {ALLOWED_ASYMMETRIC_ALGORITHMS}",
        )

    try:
        jwk_client = get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=ALLOWED_ASYMMETRIC_ALGORITHMS,
            audience=REQUIRED_AUDIENCE,
            options={
                "require": ["exp", "sub", "aud"],
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
            },
        )
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing 'sub' claim in token.",
            )
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        ) from exc
    except jwt.InvalidAudienceError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience; expected 'authenticated'.",
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT cryptographic verification failed: {exc}",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Dict[str, Any]:
    """
    FastAPI Dependency to protect feature routers (central_bank, economic_calendar, global_index, macro_bias).
    """
    return verify_supabase_jwt(credentials.credentials)


async def authenticate_websocket(websocket: WebSocket) -> Dict[str, Any]:
    """
    Secures WebSocket connections by extracting short-lived JWT tokens from
    `sec-websocket-protocol` subprotocol or validating the initial handshake message frame.
    """
    subprotocols = websocket.scope.get("subprotocols", [])
    selected_subprotocol: Optional[str] = None
    token_candidate: Optional[str] = None

    for proto in subprotocols:
        if proto.lower() == "bearer":
            selected_subprotocol = "bearer"
        elif proto.count(".") == 2:
            token_candidate = proto

    if token_candidate:
        claims = verify_supabase_jwt(token_candidate)
        await websocket.accept(subprotocol=selected_subprotocol)
        return claims

    # Accept connection and immediately validate the first handshake message frame
    await websocket.accept()
    try:
        raw_message = await websocket.receive_text()
        frame = json.loads(raw_message)
        frame_token = frame.get("token") if isinstance(frame, dict) else None
        if not frame_token or frame.get("type") != "auth":
            raise WebSocketException(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Initial WebSocket frame must be an auth handshake containing a valid JWT.",
            )
        return verify_supabase_jwt(frame_token)
    except Exception as exc:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=f"WebSocket authentication failed: {exc}",
        ) from exc
