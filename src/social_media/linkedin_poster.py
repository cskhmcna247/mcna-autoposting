import logging
import requests

from src.config_loader import LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, LINKEDIN_ORG_URN

logger = logging.getLogger(__name__)

LINKEDIN_API_BASE = "https://api.linkedin.com/v2"


class LinkedInPoster:
    def __init__(self):
        if not LINKEDIN_ACCESS_TOKEN:
            raise ValueError("Thieu LINKEDIN_ACCESS_TOKEN trong .env")
        self.access_token = LINKEDIN_ACCESS_TOKEN
        self.author = LINKEDIN_ORG_URN if LINKEDIN_ORG_URN else LINKEDIN_PERSON_URN
        if not self.author:
            raise ValueError("Thieu LINKEDIN_PERSON_URN hoac LINKEDIN_ORG_URN trong .env")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

    def post(self, content: str, image_url: str = "", title: str = "") -> dict:
        if image_url:
            urls = [u.strip() for u in image_url.split(",") if u.strip()]
            return self._post_with_images(content, urls)
        return self._post_text(content)

    def _post_text(self, content: str) -> dict:
        url = f"{LINKEDIN_API_BASE}/ugcPosts"
        payload = {
            "author": self.author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": content},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

        resp = requests.post(url, json=payload, headers=self._headers(), timeout=30)

        if resp.status_code not in (200, 201):
            error_msg = resp.text[:300]
            logger.error(f"LinkedIn post that bai ({resp.status_code}): {error_msg}")
            raise RuntimeError(f"LinkedIn API error: {error_msg}")

        post_id = resp.json().get("id", "")
        logger.info(f"Dang bai LinkedIn thanh cong: {post_id}")
        return {"platform": "linkedin", "post_id": post_id, "success": True}

    def _register_upload(self) -> tuple:
        url = f"{LINKEDIN_API_BASE}/assets?action=registerUpload"
        payload = {
            "registerUploadRequest": {
                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                "owner": self.author,
                "serviceRelationships": [
                    {
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent",
                    }
                ],
            }
        }
        resp = requests.post(url, json=payload, headers=self._headers(), timeout=30)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Register upload failed: {resp.text[:200]}")

        data = resp.json()
        upload_url = data["value"]["uploadMechanism"][
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]["uploadUrl"]
        asset = data["value"]["asset"]
        return upload_url, asset

    def _upload_image(self, image_url: str) -> str:
        img_resp = requests.get(image_url, timeout=30)
        if img_resp.status_code != 200:
            raise RuntimeError(f"Download anh that bai: {image_url}")

        upload_url, asset = self._register_upload()

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": img_resp.headers.get("Content-Type", "image/png"),
        }
        up_resp = requests.put(upload_url, data=img_resp.content, headers=headers, timeout=60)
        if up_resp.status_code not in (200, 201):
            raise RuntimeError(f"Upload anh len LinkedIn that bai: {up_resp.text[:200]}")

        logger.info(f"Upload anh LinkedIn thanh cong: {asset}")
        return asset

    def _post_with_images(self, content: str, image_urls: list) -> dict:
        media_list = []
        for img_url in image_urls:
            try:
                asset = self._upload_image(img_url)
                media_list.append({
                    "status": "READY",
                    "media": asset,
                })
            except Exception as e:
                logger.warning(f"Bo qua anh {img_url}: {e}")

        if not media_list:
            logger.warning("Khong upload duoc anh nao, dang bai text")
            return self._post_text(content)

        url = f"{LINKEDIN_API_BASE}/ugcPosts"
        payload = {
            "author": self.author,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": content},
                    "shareMediaCategory": "IMAGE",
                    "media": media_list,
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

        resp = requests.post(url, json=payload, headers=self._headers(), timeout=60)

        if resp.status_code not in (200, 201):
            error_msg = resp.text[:300]
            logger.error(f"LinkedIn post (co anh) that bai ({resp.status_code}): {error_msg}")
            raise RuntimeError(f"LinkedIn API error: {error_msg}")

        post_id = resp.json().get("id", "")
        logger.info(f"Dang bai LinkedIn ({len(media_list)} anh) thanh cong: {post_id}")
        return {"platform": "linkedin", "post_id": post_id, "success": True}

    def comment(self, post_id: str, message: str) -> dict:
        url = f"{LINKEDIN_API_BASE}/socialActions/{post_id}/comments"
        payload = {
            "actor": self.author,
            "message": {"text": message},
        }
        resp = requests.post(url, json=payload, headers=self._headers(), timeout=30)
        if resp.status_code in (200, 201):
            comment_id = resp.json().get("$URN", resp.json().get("id", ""))
            logger.info(f"LinkedIn comment thanh cong: {comment_id}")
            return {"success": True, "comment_id": comment_id}
        error_msg = resp.text[:300]
        logger.error(f"LinkedIn comment that bai ({resp.status_code}): {error_msg}")
        return {"success": False, "error": error_msg}

    def verify_token(self) -> bool:
        url = f"{LINKEDIN_API_BASE}/userinfo"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                name = data.get("name", "Unknown")
                logger.info(f"LinkedIn token hop le: {name}")
                return True
            logger.error(f"LinkedIn token khong hop le: {resp.status_code}")
            return False
        except Exception as e:
            logger.error(f"Khong the kiem tra LinkedIn token: {e}")
            return False
