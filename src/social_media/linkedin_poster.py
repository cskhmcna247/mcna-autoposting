import logging
from urllib.parse import quote

import requests

from src.config_loader import LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, LINKEDIN_ORG_URN

logger = logging.getLogger(__name__)

API = "https://api.linkedin.com/v2"


class LinkedInPoster:
    def __init__(self):
        self.token = LINKEDIN_ACCESS_TOKEN
        self.author_urn = LINKEDIN_ORG_URN or LINKEDIN_PERSON_URN

    def verify_token(self):
        if not self.token or not self.author_urn:
            logger.error("Thieu LINKEDIN_ACCESS_TOKEN hoac LINKEDIN_PERSON_URN/LINKEDIN_ORG_URN")
            return False

        resp = requests.get(
            f"{API}/userinfo",
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=10,
        )
        if resp.status_code != 200:
            logger.error("LinkedIn token khong hop le: %s", resp.text)
            return False
        return True

    def _upload_image(self, image_url):
        """Tai anh ve roi upload len LinkedIn, tra ve asset URN."""
        img_resp = requests.get(image_url, timeout=30)
        img_resp.raise_for_status()

        reg = requests.post(
            f"{API}/assets?action=registerUpload",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            json={
                "registerUploadRequest": {
                    "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                    "owner": self.author_urn,
                    "serviceRelationships": [
                        {
                            "relationshipType": "OWNER",
                            "identifier": "urn:li:userGeneratedContent",
                        }
                    ],
                }
            },
            timeout=20,
        )
        if reg.status_code not in (200, 201):
            raise RuntimeError(f"LinkedIn registerUpload loi: {reg.text}")

        value = reg.json()["value"]
        upload_url = value["uploadMechanism"][
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]["uploadUrl"]
        asset = value["asset"]

        put = requests.put(
            upload_url,
            headers={"Authorization": f"Bearer {self.token}"},
            data=img_resp.content,
            timeout=60,
        )
        if put.status_code not in (200, 201):
            raise RuntimeError(f"LinkedIn upload anh loi: {put.status_code} {put.text}")

        return asset

    def post(self, message, image_url=None):
        if not self.token or not self.author_urn:
            raise RuntimeError("Thieu LINKEDIN_ACCESS_TOKEN hoac LINKEDIN_PERSON_URN/LINKEDIN_ORG_URN")

        share_content = {
            "shareCommentary": {"text": message},
            "shareMediaCategory": "NONE",
        }

        if image_url:
            asset = self._upload_image(image_url)
            share_content["shareMediaCategory"] = "IMAGE"
            share_content["media"] = [{"status": "READY", "media": asset}]

        payload = {
            "author": self.author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }

        resp = requests.post(
            f"{API}/ugcPosts",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            json=payload,
            timeout=20,
        )

        if resp.status_code not in (200, 201):
            raise RuntimeError(f"LinkedIn API loi: {resp.text}")

        post_id = resp.headers.get("x-restli-id", "")
        logger.info("Da dang bai LinkedIn, post_id=%s", post_id)
        return post_id

    def comment(self, post_urn, message):
        resp = requests.post(
            f"{API}/socialActions/{quote(post_urn, safe='')}/comments",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            json={"actor": self.author_urn, "message": {"text": message}},
            timeout=20,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"LinkedIn binh luan loi: {resp.status_code} {resp.text}")

        logger.info("Da binh luan LinkedIn vao %s", post_urn)
