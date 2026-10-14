import json
import logging
import re
import requests
from base64 import b64encode

from src.config_loader import WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD

logger = logging.getLogger(__name__)


class WordPressPoster:
    def __init__(self):
        if not WORDPRESS_URL or not WORDPRESS_USERNAME or not WORDPRESS_APP_PASSWORD:
            raise ValueError("Thieu WORDPRESS_URL, WORDPRESS_USERNAME hoac WORDPRESS_APP_PASSWORD trong .env")
        self.base_url = WORDPRESS_URL.rstrip("/")
        self.api_url = f"{self.base_url}/wp-json/wp/v2"
        credentials = f"{WORDPRESS_USERNAME}:{WORDPRESS_APP_PASSWORD}"
        token = b64encode(credentials.encode("utf-8")).decode("utf-8")
        self.headers = {
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        }

    def _clean_content(self, content: str) -> str:
        cleaned = re.sub(
            r'<img[^>]+src="data:image/[^"]*"[^>]*/?>',
            '',
            content,
        )
        cleaned = re.sub(r'<figure>\s*</figure>', '', cleaned)
        cleaned = re.sub(r'<p>\s*</p>', '', cleaned)
        return cleaned.strip()

    def post(self, content: str, image_url: str = "", title: str = "", categories: str = "", wp_meta: str = "") -> dict:
        post_title = title or content[:60].strip()

        if "<" in content and ("</p>" in content or "</h" in content or "</li>" in content):
            html_content = self._clean_content(content)
        else:
            html_content = content.replace("\n", "<br/>")

        if image_url:
            urls = [u.strip() for u in image_url.split(",") if u.strip() and not u.strip().startswith("data:")]
            extra_urls = urls[1:]
            if extra_urls:
                images_html = "".join(
                    f'<figure><img src="{url}" alt="{post_title}"/></figure>' for url in extra_urls
                )
                html_content = f"{images_html}\n{html_content}"

        payload = {
            "title": post_title,
            "content": html_content,
            "status": "publish",
        }

        meta = {}
        if wp_meta:
            try:
                meta = json.loads(wp_meta) or {}
            except ValueError:
                meta = {}
        if meta.get("slug"):
            payload["slug"] = meta["slug"]
        if meta.get("excerpt"):
            payload["excerpt"] = meta["excerpt"]
        tag_ids = self._resolve_tags(meta.get("tags", ""))
        if tag_ids:
            payload["tags"] = tag_ids
        # Yoast SEO (chi luu duoc neu WordPress cho phep ghi meta qua REST)
        yoast = {
            "_yoast_wpseo_focuskw": meta.get("focus_kw"),
            "_yoast_wpseo_title": meta.get("seo_title"),
            "_yoast_wpseo_metadesc": meta.get("meta_desc"),
        }
        yoast = {k: v for k, v in yoast.items() if v}
        if yoast:
            payload["meta"] = yoast

        if categories:
            cat_ids = [int(c.strip()) for c in categories.split(",") if c.strip().isdigit()]
            if cat_ids:
                payload["categories"] = cat_ids

        if image_url:
            first_url = image_url.split(",")[0].strip()
            if not first_url.startswith("data:"):
                featured_id = self._upload_featured_image(first_url)
                if featured_id:
                    payload["featured_media"] = featured_id

        resp = requests.post(
            f"{self.api_url}/posts",
            json=payload,
            headers=self.headers,
            timeout=60,
        )

        if resp.status_code in (200, 201):
            data = resp.json()
            post_url = data.get("link", "")
            logger.info(f"WordPress: dang bai thanh cong - {post_url}")
            return {
                "success": True,
                "post_id": data.get("id"),
                "url": post_url,
            }

        logger.error(f"WordPress: that bai {resp.status_code} - {resp.text[:200]}")
        return {"success": False, "error": resp.text[:200]}

    def _resolve_tags(self, tags: str) -> list:
        ids = []
        for name in [t.strip() for t in (tags or "").split(",") if t.strip()]:
            try:
                r = requests.get(f"{self.api_url}/tags", params={"search": name, "per_page": 20},
                                 headers=self.headers, timeout=15)
                found = next((t for t in (r.json() if r.ok else []) if t.get("name", "").lower() == name.lower()), None)
                if not found:
                    r = requests.post(f"{self.api_url}/tags", json={"name": name},
                                      headers=self.headers, timeout=15)
                    found = r.json() if r.status_code in (200, 201) else None
                if found and found.get("id"):
                    ids.append(found["id"])
            except Exception as e:
                logger.warning(f"WordPress: tag '{name}' that bai - {e}")
        return ids

    def _upload_featured_image(self, image_url: str):
        if image_url.startswith("data:"):
            return None
        try:
            img_resp = requests.get(image_url, timeout=15)
            if img_resp.status_code != 200:
                return None

            content_type = img_resp.headers.get("Content-Type", "image/jpeg")
            ext = content_type.split("/")[-1].split(";")[0]
            if ext not in ("jpeg", "jpg", "png", "gif", "webp"):
                ext = "jpg"
            filename = f"auto-posting.{ext}"

            upload_headers = {
                "Authorization": self.headers["Authorization"],
                "Content-Type": content_type,
                "Content-Disposition": f'attachment; filename="{filename}"',
            }

            resp = requests.post(
                f"{self.api_url}/media",
                data=img_resp.content,
                headers=upload_headers,
                timeout=30,
            )

            if resp.status_code in (200, 201):
                media_id = resp.json().get("id")
                logger.info(f"WordPress: upload anh thanh cong, media_id={media_id}")
                return media_id
        except Exception as e:
            logger.warning(f"WordPress: upload anh that bai - {e}")
        return None

    def verify_token(self) -> dict:
        resp = requests.get(
            f"{self.api_url}/users/me",
            headers=self.headers,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "id": data.get("id"),
                "name": data.get("name"),
                "slug": data.get("slug"),
                "roles": data.get("roles", []),
                "url": data.get("link", ""),
            }
        raise Exception(f"WordPress verify that bai: {resp.status_code} - {resp.text[:200]}")
