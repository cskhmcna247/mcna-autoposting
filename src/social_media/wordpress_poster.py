import logging

import requests

from src.config_loader import WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD

logger = logging.getLogger(__name__)


class WordPressPoster:
    def __init__(self):
        self.url = WORDPRESS_URL.rstrip("/")
        self.auth = (WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)

    def verify_token(self):
        if not self.url or not WORDPRESS_USERNAME or not WORDPRESS_APP_PASSWORD:
            logger.error("Thieu WORDPRESS_URL, WORDPRESS_USERNAME hoac WORDPRESS_APP_PASSWORD")
            return False

        resp = requests.get(f"{self.url}/wp-json/wp/v2/users/me", auth=self.auth, timeout=10)
        if resp.status_code != 200:
            logger.error("WordPress credentials khong hop le: %s", resp.text)
            return False
        return True

    def post(self, title, content, image_url=None, category_ids=None):
        if not self.url or not WORDPRESS_USERNAME or not WORDPRESS_APP_PASSWORD:
            raise RuntimeError("Thieu WORDPRESS_URL, WORDPRESS_USERNAME hoac WORDPRESS_APP_PASSWORD")

        payload = {
            "title": title,
            "content": content,
            "status": "publish",
        }
        if category_ids:
            payload["categories"] = category_ids

        featured_media_id = None
        if image_url:
            featured_media_id = self._upload_image(image_url)
            if featured_media_id:
                payload["featured_media"] = featured_media_id

        resp = requests.post(
            f"{self.url}/wp-json/wp/v2/posts",
            auth=self.auth,
            json=payload,
            timeout=30,
        )

        if resp.status_code not in (200, 201):
            raise RuntimeError(f"WordPress API loi: {resp.text}")

        data = resp.json()
        post_id = data.get("id")
        logger.info("Da dang bai WordPress, post_id=%s", post_id)
        return post_id

    def _upload_image(self, image_url):
        try:
            img_resp = requests.get(image_url, timeout=20)
            img_resp.raise_for_status()
        except Exception:
            logger.exception("Khong tai duoc anh tu %s", image_url)
            return None

        filename = image_url.split("/")[-1].split("?")[0] or "image.jpg"
        content_type = img_resp.headers.get("Content-Type", "image/jpeg")

        resp = requests.post(
            f"{self.url}/wp-json/wp/v2/media",
            auth=self.auth,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": content_type,
            },
            data=img_resp.content,
            timeout=30,
        )

        if resp.status_code not in (200, 201):
            logger.error("Khong upload duoc anh len WordPress: %s", resp.text)
            return None

        return resp.json().get("id")
