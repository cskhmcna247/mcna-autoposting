from datetime import datetime, timedelta, timezone

from src.supabase_client import get_client

TABLE = "posts"

VN_TZ = timezone(timedelta(hours=7))


def get_pending_posts():
    """Bai co status='draft' va (chua co lich hoac da den han).

    scheduled_time duoc luu dang gio Viet Nam khong kem mui gio (gia tri nguoi dung nhap),
    nen phai so sanh voi gio VN hien tai, khong phai UTC."""
    client = get_client()
    now_iso = datetime.now(VN_TZ).replace(tzinfo=None).isoformat()
    resp = (
        client.table(TABLE)
        .select("*")
        .eq("status", "draft")
        .or_(f"scheduled_time.is.null,scheduled_time.lte.{now_iso}")
        .order("created_at")
        .execute()
    )
    return resp.data or []


def list_posts():
    client = get_client()
    resp = client.table(TABLE).select("*").order("created_at", desc=True).execute()
    return resp.data or []


def list_posts_paginated(status=None, limit=20, offset=0):
    client = get_client()
    query = client.table(TABLE).select("*", count="exact").order("created_at", desc=True)
    if status and status != "all":
        if status == "failed":
            query = query.like("status", "failed%")
        elif status == "pending":
            query = query.eq("status", "draft").not_.is_("scheduled_time", "null")
        else:
            query = query.eq("status", status)
    resp = query.range(offset, offset + limit - 1).execute()
    return {"posts": resp.data or [], "total": resp.count or 0}


def list_posts_in_range(start_iso, end_iso):
    client = get_client()
    resp = (
        client.table(TABLE)
        .select("*")
        .gte("scheduled_time", start_iso)
        .lte("scheduled_time", end_iso)
        .execute()
    )
    return resp.data or []


def count_by_status():
    client = get_client()
    resp = client.table(TABLE).select("status").execute()
    rows = resp.data or []

    counts = {"total": len(rows), "draft": 0, "pending": 0, "posted": 0, "failed": 0, "rejected": 0}
    for row in rows:
        s = (row.get("status") or "").lower()
        if s == "draft":
            counts["draft"] += 1
        elif s == "pending":
            counts["pending"] += 1
        elif s == "posted":
            counts["posted"] += 1
        elif s == "rejected":
            counts["rejected"] += 1
        elif s.startswith("failed") or s.startswith("partial"):
            counts["failed"] += 1
    return counts


def get_post(post_id):
    client = get_client()
    resp = client.table(TABLE).select("*").eq("id", post_id).maybe_single().execute()
    return resp.data if resp else None


def create_post(data):
    client = get_client()
    resp = client.table(TABLE).insert(data).execute()
    return resp.data[0] if resp.data else None


def update_post(post_id, data):
    client = get_client()
    resp = client.table(TABLE).update(data).eq("id", post_id).execute()
    return resp.data[0] if resp.data else None


def delete_post(post_id):
    client = get_client()
    client.table(TABLE).delete().eq("id", post_id).execute()


def claim_post(post_id, expected_status):
    """Giu cho bai (chuyen sang 'pending') neu status con dung nhu da doc.

    Tra ve False neu co tien trinh khac (worker / nut dang ngay) da lay bai truoc,
    de tranh dang trung len mang xa hoi."""
    client = get_client()
    resp = (
        client.table(TABLE)
        .update({"status": "pending"})
        .eq("id", post_id)
        .eq("status", expected_status)
        .execute()
    )
    return bool(resp.data)


def mark_posted(post_id):
    client = get_client()
    client.table(TABLE).update(
        {
            "status": "posted",
            "posted_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None,
        }
    ).eq("id", post_id).execute()


def mark_failed(post_id, error_message):
    client = get_client()
    client.table(TABLE).update(
        {
            "status": "failed",
            "error_message": str(error_message)[:1000],
        }
    ).eq("id", post_id).execute()


def mark_partial_or_failed(post_id, results, failed_platforms):
    """Khop convention da thay trong du lieu that: 'partial: ok=X,Y fail=Z'."""
    client = get_client()
    ok_platforms = [p for p, r in results.items() if r == "ok" and not p.endswith("_comment")]

    if ok_platforms:
        status = f"partial: ok={','.join(ok_platforms)} fail={','.join(failed_platforms)}"
        posted_at = datetime.now(timezone.utc).isoformat()
    else:
        status = f"failed: {','.join(failed_platforms)}"
        posted_at = None

    error_message = "; ".join(f"{p}: {r}" for p, r in results.items() if r != "ok")

    update_data = {
        "status": status,
        "error_message": error_message[:1000],
    }
    if posted_at:
        update_data["posted_at"] = posted_at

    client.table(TABLE).update(update_data).eq("id", post_id).execute()
