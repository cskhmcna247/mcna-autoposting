"""Kết quả đăng bài theo từng nền tảng, lưu dạng JSON để hiển thị cho người dùng."""
import json
import re

PLATFORM_NAMES = {"facebook": "Facebook", "linkedin": "LinkedIn", "wordpress": "WordPress"}


def post_link(platform: str, result: dict) -> str:
    if result.get("url"):
        return result["url"]
    pid = str(result.get("post_id") or "")
    if not pid:
        return ""
    if platform == "facebook":
        return f"https://www.facebook.com/{pid}"
    if platform == "linkedin":
        return f"https://www.linkedin.com/feed/update/{pid}"
    return ""


def _code(m: str, code: int) -> bool:
    """Có mã lỗi HTTP đứng riêng (không nằm trong một dãy số dài hơn)."""
    return re.search(f"(?<![0-9]){code}(?![0-9])", m) is not None


def friendly_error(platform: str, msg: str) -> str:
    """Đổi lỗi kỹ thuật thành câu dễ hiểu + gợi ý ai cần xử lý."""
    name = PLATFORM_NAMES.get(platform, platform)
    m = (msg or "").lower()
    if "khong kha dung" in m or "thieu" in m and ".env" in m:
        return f"{name} chưa được cấu hình trên hệ thống. Báo quản trị viên kiểm tra token/tài khoản."
    if "code\": 190" in m or "'code': 190" in m or "session has expired" in m or "access token" in m and "expired" in m \
            or "invalid_token" in m or "expired" in m and "token" in m or _code(m, 401):
        return f"Token đăng nhập {name} đã hết hạn hoặc không hợp lệ. Báo quản trị viên cập nhật token."
    if "permission" in m or _code(m, 403) or "(#200)" in m or "(#10)" in m or "not authorized" in m:
        return f"Tài khoản {name} không đủ quyền đăng bài. Báo quản trị viên kiểm tra quyền của ứng dụng."
    if "connection" in m or "timeout" in m or "timed out" in m or "max retries" in m or "name resolution" in m:
        return f"Không kết nối được tới {name} (mạng chập chờn hoặc {name} đang lỗi). Có thể thử đăng lại sau."
    if "anh" in m and ("upload" in m or "download" in m) or "image" in m or "photo" in m:
        return f"Lỗi khi tải ảnh lên {name}. Kiểm tra ảnh (định dạng, dung lượng) hoặc thử lại."
    if "duplicate" in m or "(#506)" in m:
        return f"{name} từ chối vì bài bị trùng với bài đã đăng trước đó."
    if "rate" in m and "limit" in m or "(#4)" in m or "(#32)" in m or _code(m, 429):
        return f"{name} đang giới hạn số lần đăng. Thử lại sau ít phút."
    return f"Đăng lên {name} thất bại. Gửi chi tiết lỗi bên dưới cho quản trị viên."


def ok(platform: str, result: dict, comment: dict = None) -> dict:
    item = {"platform": platform, "ok": True, "link": post_link(platform, result),
            "post_id": str(result.get("post_id") or "")}  # dùng để kiểm tra bài còn trên trang hay đã bị xóa
    if comment:
        item["comment"] = comment
    return item


def fail(platform: str, error: str) -> dict:
    error = str(error or "Lỗi không xác định")
    return {"platform": platform, "ok": False, "message": friendly_error(platform, error), "detail": error[:500]}


def dumps(results: list) -> str:
    return json.dumps({"results": results}, ensure_ascii=False)
