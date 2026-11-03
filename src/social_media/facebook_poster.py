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

    def _call(self, path, data, timeout=60):
        resp = requests.post(f"{GRAPH_API}/{path}", data=data, timeout=timeout)
        body = resp.json()
        if "error" in body:
            raise RuntimeError(f"Facebook API loi: {body['error'].get('message')}")
        return body

    def post(self, message, image_urls=None):
        if not self.page_id or not self.token:
            raise RuntimeError("Thieu FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN")

        if isinstance(image_urls, str):
            image_urls = [image_urls]
        urls = [u for u in (image_urls or []) if u]

        if not urls:
            body = self._call(f"{self.page_id}/feed", {"message": message, "access_token": self.token}, 30)
        elif len(urls) == 1:
            body = self._call(
                f"{self.page_id}/photos",
                {"url": urls[0], "caption": message, "access_token": self.token},
            )
        else:
            photo_ids = []
            for url in urls:
                photo = self._call(
                    f"{self.page_id}/photos",
                    {"url": url, "published": "false", "access_token": self.token},
                )
                photo_ids.append(photo["id"])

            payload = {"message": message, "access_token": self.token}
            for i, photo_id in enumerate(photo_ids):
                payload[f"attached_media[{i}]"] = '{"media_fbid":"%s"}' % photo_id
            body = self._call(f"{self.page_id}/feed", payload, 30)

        post_id = body.get("post_id") or body.get("id")
        logger.info("Da dang bai Facebook (%d anh), post_id=%s", len(urls), post_id)
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
