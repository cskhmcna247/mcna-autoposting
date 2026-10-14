from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from server.auth import (
    create_token,
    get_current_admin,
    hash_password,
    verify_password,
)
from src.content_sources import users as users_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    email: str
    password: str
    display_name: str


class CreateUserIn(BaseModel):
    email: str
    password: str
    display_name: str
    role: str = "member"


class RoleIn(BaseModel):
    role: str


def _to_public_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": user.get("display_name", ""),
        "role": user.get("role", "member"),
    }


@router.post("/login")
def login(data: LoginIn):
    user = users_db.get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoac mat khau khong dung")

    public_user = _to_public_user(user)
    token = create_token(public_user)
    return {"token": token, "user": public_user}


@router.post("/register")
def register(data: RegisterIn):
    existing = users_db.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email da duoc dang ky")

    is_first_user = users_db.count_users() == 0
    role = "admin" if is_first_user else "member"

    created = users_db.create_user(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=role,
    )
    if not created:
        raise HTTPException(status_code=500, detail="Khong the tao tai khoan")

    public_user = _to_public_user(created)
    token = create_token(public_user)
    return {"token": token, "user": public_user}


@router.get("/users")
def list_users(admin=Depends(get_current_admin)):
    return {"users": users_db.list_users()}


@router.post("/users")
def create_user(data: CreateUserIn, admin=Depends(get_current_admin)):
    existing = users_db.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email da duoc dang ky")

    created = users_db.create_user(
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    if not created:
        raise HTTPException(status_code=500, detail="Khong the tao tai khoan")
    return _to_public_user(created)


@router.put("/users/{user_id}/role")
def update_role(user_id: str, data: RoleIn, admin=Depends(get_current_admin)):
    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role khong hop le")

    updated = users_db.update_role(user_id, data.role)
    if not updated:
        raise HTTPException(status_code=404, detail="Khong tim thay tai khoan")
    return _to_public_user(updated)


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin=Depends(get_current_admin)):
    if user_id == admin.get("id"):
        raise HTTPException(status_code=400, detail="Khong the tu xoa chinh minh")

    users_db.delete_user(user_id)
    return {"status": "deleted"}
