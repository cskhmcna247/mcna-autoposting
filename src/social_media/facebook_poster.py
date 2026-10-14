import logging
import requests

from src.config_loader import FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


class FacebookPoster:
    def __init__(self):
        if not FACEBOOK_PAGE_ID or not FACEBOOK_ACCESS_TOKEN:
            raise ValueError("Thieu FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN trong .env")
        self.page_id = FACEBOOK_PAGE_ID
        self.access_token = self._ensure_page_token(FACEBOOK_ACCESS_TOKEN)

    def _ensure_page_token(self, token):
        long_lived = self._extend_token(token)
        page_token = self._get_page_token(long_lived)
        self._log_token_permissions(page_token)
        return page_token

    def _extend_token(self, token):
        if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
            logger.warning("Thieu APP_ID/APP_SECRET, khong the tao long-lived token")
            return token
        try:
            resp = requests.get(
                f"{GRAPH_API_BASE}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "fb_exchange_token": token,
                },
                timeout=10,
            )
            data = resp.json()
            if "access_token" in data:
                logger.info("Da chuyen sang long-lived token (60 ngay)")
                return data["access_token"]
            logger.warning(f"Khong the extend token: {data.get('error', {}).get('message', data)}")
        except Exception as e:
            logger.warning(f"Loi extend token: {e}")
        return token

    def _get_page_token(self, token):
        try:
            resp = requests.get(
                f"{GRAPH_API_BASE}/{self.page_id}",
                params={"fields": "access_token", "access_token": token},
                timeout=10,
            )
            data = resp.json()
            if "access_token" in data:
                logger.info("Da lay Page Access Token (vinh vien)")
                return data["access_token"]
            logger.warning(f"Khong the lay Page Token: {data.get('error', {}).get('message', data)}")
        except Exception as e:
            logger.warning(f"Loi lay Page Token: {e}")
        return token

    def _log_token_permissions(self, token):
        try:
            resp = requests.get(
                f"{GRAPH_API_BASE}/me/permissions",
                params={"access_token": token},
                timeout=10,
            )
            data = resp.json()
            if "data" in data:
                granted = [p["permission"] for p in data["data"] if p.get("status") == "granted"]
                logger.info(f"Token permissions: {', '.join(granted)}")
                if "pages_manage_engagement" not in granted:
                    logger.warning("THIEU pages_manage_engagement! Comment se that bai.")
            else:
                logger.warning(f"Khong doc duoc permissions: {data}")
        except Exception as e:
            logger.warning(f"Loi kiem tra permissions: {e}")

    def post(self, content: str, image_url: str = "", title: str = "") -> dict:
        if not image_url:
            return self._post_text(content)

        urls = [u.strip() for u in image_url.split(",") if u.strip()]
        if len(urls) == 1:
            return self._post_with_image(content, urls[0])
        return self._post_multi_images(content, urls)

    def _post_text(self, content: str) -> dict:
        url = f"{GRAPH_API_BASE}/{self.page_id}/feed"
        payload = {
            "message": content,
            "access_token": self.access_token,
        }

        resp = requests.post(url, data=payload, timeout=30)
        data = resp.json()

        if "error" in data:
            error_msg = data["error"].get("message", "Unknown error")
            logger.error(f"Facebook post that bai: {error_msg}")
            raise RuntimeError(f"Facebook API error: {error_msg}")

        post_id = data.get("id", "")
        logger.info(f"Dang bai Facebook thanh cong: {post_id}")
        return {"platform": "facebook", "post_id": post_id, "success": True}

    def _post_with_image(self, content: str, image_url: str) -> dict:
        url = f"{GRAPH_API_BASE}/{self.page_id}/photos"
        payload = {
            "message": content,
            "url": image_url,
            "access_token": self.access_token,
        }

        resp = requests.post(url, data=payload, timeout=60)
        data = resp.json()

        if "error" in data:
            error_msg = data["error"].get("message", "Unknown error")
            logger.error(f"Facebook photo post that bai: {error_msg}")
            raise RuntimeError(f"Facebook API error: {error_msg}")

        post_id = data.get("post_id", data.get("id", ""))
        logger.info(f"Dang bai Facebook (1 anh) thanh cong: {post_id}")
        return {"platform": "facebook", "post_id": post_id, "success": True}

    def _post_multi_images(self, content: str, image_urls: list) -> dict:
        photo_ids = []
        for img_url in image_urls:
            url = f"{GRAPH_API_BASE}/{self.page_id}/photos"
            payload = {
                "url": img_url,
                "published": "false",
                "access_token": self.access_token,
            }
            resp = requests.post(url, data=payload, timeout=60)
            data = resp.json()
            if "error" in data:
                error_msg = data["error"].get("message", "Unknown error")
                logger.error(f"Upload anh that bai ({img_url}): {error_msg}")
                raise RuntimeError(f"Facebook API error: {error_msg}")
            photo_ids.append(data["id"])
            logger.info(f"Upload anh unpublished: {data['id']}")

        url = f"{GRAPH_API_BASE}/{self.page_id}/feed"
        payload = {
            "message": content,
            "access_token": self.access_token,
        }
        for i, pid in enumerate(photo_ids):
            payload[f"attached_media[{i}]"] = f'{{"media_fbid":"{pid}"}}'

        resp = requests.post(url, data=payload, timeout=30)
        data = resp.json()

        if "error" in data:
            error_msg = data["error"].get("message", "Unknown error")
            logger.error(f"Facebook multi-photo post that bai: {error_msg}")
            raise RuntimeError(f"Facebook API error: {error_msg}")

        post_id = data.get("id", "")
        logger.info(f"Dang bai Facebook ({len(image_urls)} anh) thanh cong: {post_id}")
        return {"platform": "facebook", "post_id": post_id, "success": True}

    def comment(self, post_id: str, message: str) -> dict:
        url = f"{GRAPH_API_BASE}/{post_id}/comments"
        payload = {
            "message": message,
            "access_token": self.access_token,
        }
        resp = requests.post(url, data=payload, timeout=30)
        data = resp.json()
        if "error" in data:
            error_msg = data["error"].get("message", "Unknown error")
            logger.error(f"Facebook comment that bai: {error_msg}")
            return {"success": False, "error": error_msg}
        comment_id = data.get("id", "")
        logger.info(f"Facebook comment thanh cong: {comment_id}")
        return {"success": True, "comment_id": comment_id}

    def verify_token(self) -> bool:
        url = f"{GRAPH_API_BASE}/me"
        params = {"access_token": self.access_token}
        try:
            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()
            if "error" not in data:
                logger.info(f"Facebook token hop le: {data.get('name', 'N/A')}")
                return True
            logger.error(f"Facebook token khong hop le: {data['error'].get('message')}")
            return False
        except Exception as e:
            logger.error(f"Khong the kiem tra Facebook token: {e}")
            return False
