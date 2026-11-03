import json
import logging
import re

import requests

from src.config_loader import (
    PUBLIC_BASE_URL,
    WORDPRESS_APP_PASSWORD,
    WORDPRESS_URL,
    WORDPRESS_USERNAME,
)

logger = logging.getLogger(__name__)


class WordPressPoster:
    def __init__(self):
        self.url = WORDPRESS_URL.rstrip("/")
        self.api_url = f"{self.url}/wp-json/wp/v2"
        self.auth = (WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)

    def _check_config(self):
        if not self.url or not WORDPRESS_USERNAME or not WORDPRESS_APP_PASSWORD:
            raise RuntimeError("Thieu WORDPRESS_URL, WORDPRESS_USERNAME hoac WORDPRESS_APP_PASSWORD")

    def verify_token(self):
        if not self.url or not WORDPRESS_USERNAME or not WORDPRESS_APP_PASSWORD:
            logger.error("Thieu WORDPRESS_URL, WORDPRESS_USERNAME hoac WORDPRESS_APP_PASSWORD")
            return False

        resp = requests.get(f"{self.api_url}/users/me", auth=self.auth, timeout=10)
        if resp.status_code != 200:
            logger.error("WordPress credentials khong hop le: %s", resp.text)
            return False
        return True

    @staticmethod
    def _clean_content(content):
        # Bo anh base64 dan truc tiep (WordPress khong nhan) va cac the rong
        cleaned = re.sub(r'<img[^>]+src="data:image/[^"]*"[^>]*/?>', "", content)
        cleaned = re.sub(r"<figure>\s*</figure>", "", cleaned)
        cleaned = re.sub(r"<p>\s*</p>", "", cleaned)
        # Anh upload noi bo dang '/uploads/x.jpg' -> doi sang URL day du de WordPress hien duoc
        cleaned = re.sub(
            r'src="/uploads/',
            f'src="{PUBLIC_BASE_URL.rstrip("/")}/uploads/',
            cleaned,
        )
        return cleaned.strip()

    @staticmethod
    def _parse_meta(wp_meta):
        if not wp_meta:
            return {}
        if isinstance(wp_meta, dict):
            return wp_meta
        try:
            return json.loads(wp_meta) or {}
        except ValueError:
            return {}

    @staticmethod
    def _parse_category_ids(category_ids):
        if not category_ids:
            return []
        if isinstance(category_ids, str):
            category_ids = category_ids.split(",")
        ids = []
        for c in category_ids:
            c = str(c).strip()
            if c.isdigit():
                ids.append(int(c))
        return ids

    def post(self, title, content, image_urls=None, category_ids=None, wp_meta=None, status="publish"):
        self._check_config()

        if isinstance(image_urls, str):
            image_urls = [image_urls]
        urls = [u for u in (image_urls or []) if u and not u.startswith("data:")]

        post_title = title or re.sub(r"<[^>]+>", "", content)[:60].strip()

        if "<" in content and ("</p>" in content or "</h" in content or "</li>" in content):
            html_content = self._clean_content(content)
        else:
            html_content = content.replace("\n", "<br/>")

        # Anh dau tien la anh dai dien; cac anh con lai chen dau noi dung
        if len(urls) > 1:
            extra = "".join(f'<figure><img src="{u}" alt="{post_title}"/></figure>' for u in urls[1:])
            html_content = f"{extra}\n{html_content}"

        payload = {"title": post_title, "content": html_content, "status": status}

        meta = self._parse_meta(wp_meta)
        if meta.get("slug"):
            payload["slug"] = meta["slug"]
        if meta.get("excerpt"):
            payload["excerpt"] = meta["excerpt"]

        tag_ids = self._resolve_tags(meta.get("tags", ""))
        if tag_ids:
            payload["tags"] = tag_ids

        # Yoast SEO: chi duoc luu neu WordPress cho phep ghi meta nay qua REST
        yoast = {
            "_yoast_wpseo_focuskw": meta.get("focus_kw"),
            "_yoast_wpseo_title": meta.get("seo_title"),
            "_yoast_wpseo_metadesc": meta.get("meta_desc"),
        }
        yoast = {k: v for k, v in yoast.items() if v}
        if yoast:
            payload["meta"] = yoast

        cat_ids = self._parse_category_ids(category_ids)
        if cat_ids:
            payload["categories"] = cat_ids

        if urls:
            featured_id = self._upload_image(urls[0])
            if featured_id:
                payload["featured_media"] = featured_id

        resp = requests.post(f"{self.api_url}/posts", auth=self.auth, json=payload, timeout=60)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"WordPress API loi: {resp.text[:300]}")

        data = resp.json()
        logger.info("Da dang bai WordPress, post_id=%s, status=%s, link=%s", data.get("id"), status, data.get("link"))
        return data.get("id")

    def delete(self, post_id):
        resp = requests.delete(f"{self.api_url}/posts/{post_id}", auth=self.auth, params={"force": "true"}, timeout=30)
        return resp.status_code in (200, 201)

    def _resolve_tags(self, tags):
        ids = []
        for name in [t.strip() for t in (tags or "").split(",") if t.strip()]:
            try:
                r = requests.get(f"{self.api_url}/tags", params={"search": name, "per_page": 20}, auth=self.auth, timeout=15)
                found = next((t for t in (r.json() if r.ok else []) if t.get("name", "").lower() == name.lower()), None)
                if not found:
                    r = requests.post(f"{self.api_url}/tags", json={"name": name}, auth=self.auth, timeout=15)
                    found = r.json() if r.status_code in (200, 201) else None
                if found and found.get("id"):
                    ids.append(found["id"])
            except Exception:
                logger.exception("Khong xu ly duoc the '%s'", name)
        return ids

    def _upload_image(self, image_url):
        try:
            img_resp = requests.get(image_url, timeout=30)
            img_resp.raise_for_status()
        except Exception:
            logger.exception("Khong tai duoc anh tu %s", image_url)
            return None

        filename = image_url.split("/")[-1].split("?")[0] or "image.jpg"
        content_type = img_resp.headers.get("Content-Type", "image/jpeg")

        resp = requests.post(
            f"{self.api_url}/media",
            auth=self.auth,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": content_type,
            },
            data=img_resp.content,
            timeout=60,
        )
        if resp.status_code not in (200, 201):
            logger.error("Khong upload duoc anh len WordPress: %s", resp.text[:200])
            return None

        return resp.json().get("id")
