import logging

import requests

from src.config_loader import FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"


class FacebookPoster:
    def __init__(self):
        self.page_id = FACEBOOK_PAGE_ID
        self.token = FACEBOOK_ACCESS_TOKEN

    def verify_token(self):
        if not self.page_id or not self.token:
            logger.error("Thieu FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN")
            return False

        resp = requests.get(
            f"{GRAPH_API}/{self.page_id}",
            params={"fields": "id,name", "access_token": self.token},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            logger.error("Facebook token khong hop le: %s", data["error"].get("message"))
            return False
        return True

    def post(self, message, image_url=None):
        if not self.page_id or not self.token:
            raise RuntimeError("Thieu FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN")

        if image_url:
            resp = requests.post(
                f"{GRAPH_API}/{self.page_id}/photos",
                data={
                    "url": image_url,
                    "caption": message,
                    "access_token": self.token,
                },
                timeout=30,
            )
        else:
            resp = requests.post(
                f"{GRAPH_API}/{self.page_id}/feed",
                data={
                    "message": message,
                    "access_token": self.token,
                },
                timeout=30,
            )

        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"Facebook API loi: {data['error'].get('message')}")

        post_id = data.get("post_id") or data.get("id")
        logger.info("Da dang bai Facebook, post_id=%s", post_id)
        return post_id

    def comment(self, post_id, message):
        resp = requests.post(
            f"{GRAPH_API}/{post_id}/comments",
            data={"message": message, "access_token": self.token},
            timeout=30,
        )
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"Facebook binh luan loi: {data['error'].get('message')}")

        logger.info("Da binh luan Facebook, comment_id=%s", data.get("id"))
        return data.get("id")
