import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_EXPIRES_SECONDS = 7 * 24 * 3600  # 7 ngay

security = HTTPBearer(auto_error=False)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(payload: dict) -> str:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY chua duoc cau hinh trong .env")

    header = {"alg": "HS256", "typ": "JWT"}
    body = {**payload, "exp": int(time.time()) + JWT_EXPIRES_SECONDS}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    body_b64 = _b64url_encode(json.dumps(body, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{body_b64}".encode()

    signature = hmac.new(JWT_SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{body_b64}.{sig_b64}"


def decode_token(token: str) -> dict:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY chua duoc cau hinh trong .env")

    try:
        header_b64, body_b64, sig_b64 = token.split(".")
    except ValueError:
        raise ValueError("Token khong dung dinh dang")

    signing_input = f"{header_b64}.{body_b64}".encode()
    expected_sig = hmac.new(JWT_SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()

    if not hmac.compare_digest(_b64url_encode(expected_sig), sig_b64):
        raise ValueError("Chu ky token khong hop le")

    body = json.loads(_b64url_decode(body_b64))

    if body.get("exp", 0) < time.time():
        raise ValueError("Token da het han")

    return body


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, dk_hex = stored_hash.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return hmac.compare_digest(dk.hex(), dk_hex)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    return payload


def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chi Admin moi co quyen thuc hien")
    return user
