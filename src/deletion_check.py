"""Phát hiện bài đã bị xóa trực tiếp trên Facebook / LinkedIn / WordPress.

Với mỗi bài đã đăng gần đây, hỏi từng nền tảng xem bài còn không (theo post_id đã lưu khi đăng).
Bài không còn -> đánh dấu "deleted" trong kết quả của nền tảng đó.
Mọi nền tảng đều đã xóa -> trạng thái bài chuyển thành "deleted".
"""
import json
import logging
import threading
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def _init_checkers(platforms: set) -> dict:
    checkers = {}
    makers = {
        "facebook": ("src.social_media.facebook_poster", "FacebookPoster"),
        "linkedin": ("src.social_media.linkedin_poster", "LinkedInPoster"),
        "wordpress": ("src.social_media.wordpress_poster", "WordPressPoster"),
    }
    for p in platforms:
        if p not in makers:
            continue
        mod, cls = makers[p]
        try:
            checkers[p] = getattr(__import__(mod, fromlist=[cls]), cls)()
        except Exception as e:
            logger.warning(f"Kiem tra xoa: khong khoi tao duoc {p} - {e}")
    return checkers


def check_deleted_posts(table, days: int = 30) -> dict:
    """table: bảng posts của Supabase. Trả về thống kê lần quét."""
    if not _lock.acquire(blocking=False):
        return {"skipped": True, "message": "Dang kiem tra, vui long doi"}
    try:
        since = (datetime.now() - timedelta(days=days)).isoformat()
        rows = (table.select("id, status, error_message")
                .gte("posted_at", since).not_.is_("error_message", "null").execute().data)

        todo = []
        for row in rows:
            status = row.get("status") or ""
            if not (status == "posted" or status.startswith("partial")):
                continue
            try:
                data = json.loads(row["error_message"])
            except (ValueError, TypeError):
                continue
            if isinstance(data, dict) and isinstance(data.get("results"), list):
                todo.append((row, data))

        need = {r["platform"] for _, d in todo for r in d["results"]
                if r.get("ok") and r.get("post_id") and not r.get("deleted")}
        checkers = _init_checkers(need)

        checked = deleted = 0
        now = datetime.now().isoformat()
        for row, data in todo:
            changed = False
            for r in data["results"]:
                if not (r.get("ok") and r.get("post_id")) or r.get("deleted"):
                    continue
                checker = checkers.get(r["platform"])
                if not checker:
                    continue
                checked += 1
                alive = checker.exists(r["post_id"])
                if alive is False:
                    r["deleted"] = True
                    r["deleted_at"] = now
                    changed = True
                    deleted += 1
                    logger.info(f"Bai ID {row['id']} da bi xoa tren {r['platform']}")
            if changed:
                data["checked_at"] = now
                update = {"error_message": json.dumps(data, ensure_ascii=False)}
                ok_items = [r for r in data["results"] if r.get("ok")]
                if ok_items and all(r.get("deleted") for r in ok_items):
                    update["status"] = "deleted"
                table.update(update).eq("id", row["id"]).execute()

        logger.info(f"Kiem tra bai bi xoa: {checked} luot kiem tra, phat hien {deleted} bai da xoa")
        return {"checked": checked, "deleted": deleted, "checked_at": now}
    finally:
        _lock.release()
