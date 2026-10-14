import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from supabase import create_client

from src.config_loader import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = "mcna-auto-posting-secret-key-2026"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

_supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str = ""


class UpdateRoleRequest(BaseModel):
    role: str


class CreateUserRequest(BaseModel):
    email: str
    password: str
    display_name: str = ""
    role: str = "member"


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            "id": payload["sub"],
            "email": payload["email"],
            "display_name": payload["display_name"],
            "role": payload["role"],
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def _require_admin(request: Request) -> dict:
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Chi admin moi co quyen thuc hien")
    return user


@router.post("/register")
def register(body: RegisterRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Mat khau phai co it nhat 6 ky tu")

    existing = _supabase.table("profiles").select("id").eq("email", body.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email da duoc su dung")

    display_name = body.display_name or body.email.split("@")[0]

    all_users = _supabase.table("profiles").select("id").limit(1).execute()
    is_first_user = len(all_users.data) == 0

    new_user = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "password_hash": _hash_password(body.password),
        "display_name": display_name,
        "role": "admin" if is_first_user else "member",
    }
    _supabase.table("profiles").insert(new_user).execute()

    token = _create_token(new_user)
    logger.info(f"Dang ky thanh cong: {body.email}")

    return {
        "token": token,
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "display_name": new_user["display_name"],
            "role": new_user["role"],
        },
    }


@router.post("/login")
def login(body: LoginRequest):
    result = _supabase.table("profiles").select("*").eq("email", body.email.lower()).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Email hoac mat khau khong dung")

    user = result.data[0]
    if not user.get("password_hash") or not _check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoac mat khau khong dung")

    token = _create_token(user)
    logger.info(f"Dang nhap thanh cong: {body.email}")

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
        },
    }


@router.get("/me")
def get_me(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    return user


# ─── Admin: User Management ───


@router.get("/users")
def list_users(request: Request):
    _require_admin(request)
    result = _supabase.table("profiles").select("id, email, display_name, role, created_at").order("created_at").execute()
    return {"users": result.data}


@router.post("/users")
def admin_create_user(body: CreateUserRequest, request: Request):
    _require_admin(request)

    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role phai la admin hoac member")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Mat khau phai co it nhat 6 ky tu")

    existing = _supabase.table("profiles").select("id").eq("email", body.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email da duoc su dung")

    new_user = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "password_hash": _hash_password(body.password),
        "display_name": body.display_name or body.email.split("@")[0],
        "role": body.role,
    }
    _supabase.table("profiles").insert(new_user).execute()
    logger.info(f"Admin tao user: {body.email} ({body.role})")

    return {
        "id": new_user["id"],
        "email": new_user["email"],
        "display_name": new_user["display_name"],
        "role": new_user["role"],
    }


@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, body: UpdateRoleRequest, request: Request):
    admin = _require_admin(request)

    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role phai la admin hoac member")
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Khong the thay doi role cua chinh minh")

    result = _supabase.table("profiles").update({"role": body.role}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User khong ton tai")

    logger.info(f"Admin doi role user {user_id} -> {body.role}")
    return {"message": f"Da cap nhat role thanh {body.role}"}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, request: Request):
    admin = _require_admin(request)

    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Khong the xoa chinh minh")

    result = _supabase.table("profiles").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User khong ton tai")

    logger.info(f"Admin xoa user {user_id}")
    return {"message": "Da xoa user"}
