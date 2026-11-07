import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request

from server.dependencies import get_db
from server.schemas import PostCreate, PostUpdate
from server.routers.auth import get_current_user, _require_admin
from src.content_sources.database import DatabaseSource
from src.config_loader import SUPABASE_URL, SUPABASE_KEY
from supabase import create_client

router = APIRouter(prefix="/api/posts", tags=["posts"])

BUCKET = "post-images"


@router.get("")
def list_posts(
    status: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DatabaseSource = Depends(get_db),
):
    posts, total = db.get_all_posts(status=status, limit=limit, offset=offset)
    return {"posts": posts, "total": total, "limit": limit, "offset": offset}


@router.get("/review")
def list_my_review_posts(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: DatabaseSource = Depends(get_db),
):
    """Tab Duyệt bài: chỉ trả về bài chờ duyệt do chính người đăng nhập tạo."""
    user = _require_user(request)
    posts, total = db.get_all_posts(status="draft", limit=limit, offset=offset,
                                    created_by=user["display_name"])
    # Bài đã duyệt gần đây của chính mình, kèm kết quả đăng từng nền tảng
    mine, _ = db.get_all_posts(limit=30, created_by=user["display_name"])
    recent = [p for p in mine if p.get("status") != "draft"][:20]
    return {"posts": posts, "total": total, "recent": recent, "limit": limit, "offset": offset}


@router.post("/check-deleted")
def check_deleted(request: Request, db: DatabaseSource = Depends(get_db)):
    """Nút "Kiểm tra bài bị xóa": hỏi từng nền tảng xem các bài đã đăng (30 ngày gần nhất) còn không."""
    _require_user(request)
    from src.deletion_check import check_deleted_posts
    return check_deleted_posts(db.table)


@router.get("/calendar")
def get_calendar(
    start: str = Query(...),
    end: str = Query(...),
    db: DatabaseSource = Depends(get_db),
):
    posts = db.get_calendar_posts(start, end)
    return {"posts": posts}


@router.get("/{post_id}")
def get_post(post_id: int, db: DatabaseSource = Depends(get_db)):
    post = db.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("", status_code=201)
def create_post(body: PostCreate, request: Request, db: DatabaseSource = Depends(get_db)):
    user = get_current_user(request)

    created_by = user["display_name"] if user else body.created_by
    # Bài mới nằm ở tab "Duyệt bài"; người viết tự duyệt thì mới được đăng
    status = "draft"

    new_id = db.create_post(
        title=body.title,
        content=body.content,
        image_url=body.image_url,
        platforms=body.platforms,
        scheduled_time=body.scheduled_time,
        created_by=created_by,
        priority=body.priority,
        status=status,
        content_social=body.content_social,
        wp_category_ids=body.wp_category_ids,
        comment_text=body.comment_text,
        wp_meta=body.wp_meta,
    )
    return {"id": new_id, "status": status, "message": "Post created"}


@router.put("/{post_id}")
def update_post(post_id: int, body: PostUpdate, db: DatabaseSource = Depends(get_db)):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    ok = db.update_post(post_id, **fields)
    if not ok:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post updated"}


@router.delete("/{post_id}")
def delete_post(post_id: int, db: DatabaseSource = Depends(get_db)):
    ok = db.delete_post(post_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}


# ─── Duyệt bài: mỗi người chỉ được duyệt / từ chối bài do chính mình tạo ───


def _require_user(request: Request) -> dict:
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chua dang nhap")
    return user


def _require_own_post(post_id: int, request: Request, db: DatabaseSource) -> dict:
    user = _require_user(request)
    post = db.get_post_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if (post.get("created_by") or "").strip() != (user["display_name"] or "").strip():
        raise HTTPException(status_code=403, detail="Ban chi duoc duyet bai do chinh minh tao")
    return user


@router.post("/{post_id}/approve")
def approve_post(post_id: int, request: Request, db: DatabaseSource = Depends(get_db)):
    user = _require_own_post(post_id, request, db)
    ok = db.approve_post(post_id, approved_by=user["display_name"])
    if not ok:
        raise HTTPException(status_code=400, detail="Bai khong o trang thai cho duyet hoac khong ton tai")
    # Duyệt xong mà không hẹn giờ -> đăng ngay
    post = db.get_post_by_id(post_id)
    if post and not post.get("scheduled_time"):
        from server.routers.workflow import start_workflow_background
        start_workflow_background()
    return {"message": "Da duyet bai dang"}


@router.post("/{post_id}/reject")
def reject_post(post_id: int, request: Request, db: DatabaseSource = Depends(get_db)):
    user = _require_own_post(post_id, request, db)
    ok = db.reject_post(post_id, approved_by=user["display_name"])
    if not ok:
        raise HTTPException(status_code=400, detail="Bai khong o trang thai draft hoac khong ton tai")
    return {"message": "Da tu choi bai dang"}


@router.post("/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    urls = []
    for file in files:
        ext = (file.filename or "image.png").rsplit(".", 1)[-1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        content = await file.read()
        client.storage.from_(BUCKET).upload(
            filename,
            content,
            {"content-type": file.content_type or "image/png"},
        )
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"
        urls.append(public_url)
    return {"urls": urls}
