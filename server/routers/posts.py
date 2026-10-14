import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image

from server.auth import get_current_admin, get_current_user
from src.config_loader import BASE_DIR
from src.content_sources import database
from src.workflow import publish_post, WorkflowPartialError, comment_warnings, is_comment_key

router = APIRouter(prefix="/api/posts", tags=["posts"])

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MIN_IMAGE_WIDTH = 1080


@router.get("")
def list_posts(status: str = "all", limit: int = 20, offset: int = 0, user=Depends(get_current_user)):
    return database.list_posts_paginated(status=status, limit=limit, offset=offset)


@router.get("/calendar")
def calendar(start: str, end: str, user=Depends(get_current_user)):
    return {"posts": database.list_posts_in_range(start, end)}


@router.get("/{post_id}")
def get_post(post_id: int, user=Depends(get_current_user)):
    post = database.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")
    return post


@router.post("")
def create_post(data: dict, user=Depends(get_current_user)):
    is_admin = user.get("role") == "admin"
    data["status"] = "draft" if not is_admin else data.get("status", "draft")
    created = database.create_post(data)
    if not created:
        raise HTTPException(status_code=500, detail="Khong the tao bai dang")
    return created


@router.put("/{post_id}")
def update_post(post_id: int, data: dict, user=Depends(get_current_user)):
    existing = database.get_post(post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")

    updated = database.update_post(post_id, data)
    if not updated:
        raise HTTPException(status_code=500, detail="Khong the cap nhat bai dang")
    return updated


@router.delete("/{post_id}")
def delete_post(post_id: int, user=Depends(get_current_user)):
    existing = database.get_post(post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")

    database.delete_post(post_id)
    return {"status": "deleted"}


@router.post("/{post_id}/approve")
def approve_post(post_id: int, admin=Depends(get_current_admin)):
    post = database.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")
    if post["status"] != "draft":
        raise HTTPException(status_code=400, detail="Chi co the duyet bai dang o trang thai nhap")

    database.update_post(post_id, {"approved_by": admin.get("display_name", ""), "approved_at": datetime.now(timezone.utc).isoformat()})
    return {"status": "approved"}


@router.post("/{post_id}/publish")
def publish_now(post_id: int, admin=Depends(get_current_admin)):
    post = database.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")

    status = post["status"] or ""
    if not (status == "draft" or status.startswith("failed")):
        raise HTTPException(
            status_code=400,
            detail=f"Khong the dang bai o trang thai '{status}'. Chi dang duoc bai nhap hoac bai da that bai.",
        )

    if not database.claim_post(post_id, status):
        raise HTTPException(status_code=409, detail="Bai dang dang duoc xu ly boi tien trinh khac")

    try:
        results = publish_post(post)
    except WorkflowPartialError as exc:
        database.mark_partial_or_failed(post_id, exc.results, exc.failed_platforms)
        ok = [p for p, r in exc.results.items() if r == "ok" and not is_comment_key(p)]
        return {"status": "partial" if ok else "failed", "results": exc.results}
    except Exception as exc:
        database.mark_failed(post_id, str(exc))
        raise HTTPException(status_code=500, detail=str(exc))

    database.mark_posted(post_id)
    warning = comment_warnings(results)
    if warning:
        database.update_post(post_id, {"error_message": warning[:1000]})
    return {"status": "posted", "results": results}


@router.post("/{post_id}/reject")
def reject_post(post_id: int, admin=Depends(get_current_admin)):
    post = database.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Khong tim thay bai dang")

    database.update_post(
        post_id,
        {
            "status": "rejected",
            "approved_by": admin.get("display_name", ""),
            "approved_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {"status": "rejected"}


@router.post("/upload-images")
async def upload_images(files: list[UploadFile], user=Depends(get_current_user)):
    urls = []
    low_res = []
    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Dinh dang anh khong ho tro: {ext}")

        new_name = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / new_name
        content = await file.read()
        dest.write_bytes(content)
        urls.append(f"/uploads/{new_name}")

        try:
            with Image.open(io.BytesIO(content)) as img:
                width, height = img.size
            if width < MIN_IMAGE_WIDTH:
                low_res.append({"name": file.filename, "width": width, "height": height})
        except Exception:
            pass

    return {"urls": urls, "low_res": low_res, "min_width": MIN_IMAGE_WIDTH}
