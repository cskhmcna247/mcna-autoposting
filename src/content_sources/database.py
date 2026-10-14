import logging
from datetime import datetime
from typing import Optional, List, Tuple
from collections import defaultdict
from itertools import cycle

from supabase import create_client
from src.config_loader import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)


class DatabaseSource:
    def __init__(self):
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.table = self.client.table("posts")
        self._last_posted_index = 0
        logger.info("Ket noi Supabase thanh cong")

    # ─── Workflow: lấy bài pending theo Priority + Round-Robin ───

    def get_pending_posts(self) -> List[dict]:
        now = datetime.now().isoformat()
        result = (
            self.table.select("id, title, content, content_social, image_url, platforms, created_by, priority, scheduled_time, wp_category_ids, comment_text, wp_meta")
            .eq("status", "pending")
            .or_(f"scheduled_time.is.null,scheduled_time.lte.{now}")
            .execute()
        )

        rows = result.data
        if not rows:
            logger.info("Khong co bai pending nao")
            return []

        priority_order = {"high": 0, "medium": 1, "low": 2}
        rows.sort(key=lambda r: priority_order.get(r.get("priority", "medium"), 1))

        by_creator = defaultdict(list)
        for row in rows:
            by_creator[row.get("created_by", "")].append(row)

        ordered = []
        if by_creator:
            creators = list(by_creator.keys())
            max_len = max(len(v) for v in by_creator.values())
            for i in range(max_len):
                for creator in creators:
                    posts_list = by_creator[creator]
                    if i < len(posts_list):
                        ordered.append(posts_list[i])

        pending = []
        for row in ordered:
            platforms = [p.strip().lower() for p in (row.get("platforms") or "facebook,linkedin").split(",") if p.strip()]
            pending.append({
                "post_id": row["id"],
                "title": row.get("title") or "",
                "content": row.get("content") or "",
                "content_social": row.get("content_social") or "",
                "image_url": row.get("image_url") or "",
                "platforms": platforms,
                "source": "database",
                "created_by": row.get("created_by", ""),
                "priority": row.get("priority", "medium"),
                "wp_category_ids": row.get("wp_category_ids") or "",
                "comment_text": row.get("comment_text") or "",
                "wp_meta": row.get("wp_meta") or "",
            })
        logger.info(f"Tim thay {len(pending)} bai pending (priority + round-robin)")
        return pending

    def mark_posted(self, post_id: int, status: str = "posted"):
        self.table.update({
            "status": status,
            "posted_at": datetime.now().isoformat(),
        }).eq("id", post_id).execute()
        logger.info(f"Cap nhat post ID {post_id} -> {status}")

    def mark_failed(self, post_id: int, error_msg: str = ""):
        self.table.update({
            "status": "failed",
            "error_message": error_msg,
        }).eq("id", post_id).execute()
        logger.warning(f"Post ID {post_id} that bai: {error_msg}")

    # ─── Approval: duyệt / từ chối bài ───

    def approve_post(self, post_id: int, approved_by: str = "") -> bool:
        result = self.table.update({
            "status": "pending",
            "approved_by": approved_by,
            "approved_at": datetime.now().isoformat(),
        }).eq("id", post_id).eq("status", "draft").execute()
        if result.data:
            logger.info(f"Duyet bai ID {post_id} boi {approved_by}")
            return True
        return False

    def reject_post(self, post_id: int, approved_by: str = "") -> bool:
        result = self.table.update({
            "status": "rejected",
            "approved_by": approved_by,
            "approved_at": datetime.now().isoformat(),
        }).eq("id", post_id).eq("status", "draft").execute()
        if result.data:
            logger.info(f"Tu choi bai ID {post_id} boi {approved_by}")
            return True
        return False

    # ─── CRUD ───

    def get_all_posts(self, status: str = None, limit: int = 50, offset: int = 0) -> Tuple[List[dict], int]:
        query = self.table.select("*", count="exact")
        if status:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        posts = []
        for row in result.data:
            for k in ("scheduled_time", "posted_at", "created_at", "approved_at"):
                if row.get(k):
                    row[k] = str(row[k])
            posts.append(row)

        total = result.count if result.count is not None else len(posts)
        return posts, total

    def get_post_by_id(self, post_id: int) -> Optional[dict]:
        result = self.table.select("*").eq("id", post_id).execute()
        if not result.data:
            return None
        row = result.data[0]
        for k in ("scheduled_time", "posted_at", "created_at", "approved_at"):
            if row.get(k):
                row[k] = str(row[k])
        return row

    def create_post(self, title: str, content: str, image_url: str = "",
                    platforms: str = "facebook,linkedin", scheduled_time: str = None,
                    created_by: str = "", priority: str = "medium",
                    status: str = "draft", content_social: str = None,
                    wp_category_ids: str = None, comment_text: str = None,
                    wp_meta: str = None) -> int:
        if priority not in ("high", "medium", "low"):
            priority = "medium"

        data = {
            "title": title,
            "content": content,
            "image_url": image_url,
            "platforms": platforms,
            "status": status,
            "created_by": created_by,
            "priority": priority,
        }
        if content_social:
            data["content_social"] = content_social
        if wp_category_ids:
            data["wp_category_ids"] = wp_category_ids
        if comment_text:
            data["comment_text"] = comment_text
        if wp_meta:
            data["wp_meta"] = wp_meta
        if scheduled_time:
            data["scheduled_time"] = datetime.strptime(scheduled_time, "%Y-%m-%dT%H:%M").isoformat()

        result = self.table.insert(data).execute()
        new_id = result.data[0]["id"]
        logger.info(f"Tao bai dang moi ID {new_id} (status={status}, priority={priority})")
        return new_id

    def update_post(self, post_id: int, **fields) -> bool:
        allowed = {"title", "content", "content_social", "image_url", "platforms", "status", "scheduled_time", "priority", "wp_category_ids", "comment_text", "wp_meta"}
        updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if not updates:
            return False

        if "scheduled_time" in updates and updates["scheduled_time"]:
            updates["scheduled_time"] = datetime.strptime(updates["scheduled_time"], "%Y-%m-%dT%H:%M").isoformat()

        if "priority" in updates and updates["priority"] not in ("high", "medium", "low"):
            updates["priority"] = "medium"

        result = self.table.update(updates).eq("id", post_id).execute()
        return len(result.data) > 0

    def delete_post(self, post_id: int) -> bool:
        result = self.table.delete().eq("id", post_id).execute()
        return len(result.data) > 0

    def get_stats(self) -> dict:
        result = self.table.select("status").execute()
        stats = {"total": 0, "draft": 0, "pending": 0, "posted": 0, "failed": 0, "rejected": 0}
        for row in result.data:
            s = (row.get("status") or "").lower()
            if s.startswith("failed") or s.startswith("partial"):
                stats["failed"] += 1
            elif s in stats:
                stats[s] += 1
            stats["total"] += 1
        return stats

    # ─── Calendar: lấy bài theo khoảng thời gian ───

    def get_calendar_posts(self, start: str, end: str) -> List[dict]:
        result = (
            self.table.select("id, title, content, status, platforms, scheduled_time, created_by, priority, created_at")
            .gte("scheduled_time", start)
            .lte("scheduled_time", end)
            .order("scheduled_time")
            .execute()
        )
        posts = []
        for row in result.data:
            for k in ("scheduled_time", "created_at"):
                if row.get(k):
                    row[k] = str(row[k])
            posts.append(row)
        return posts

    def close(self):
        logger.info("Dong ket noi Supabase")
