from fastapi import APIRouter

from src.config_loader import (
    FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN,
    LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN,
    WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD,
)

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("/status")
def platforms_status():
    result = {
        "facebook": {
            "configured": bool(FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN),
            "page_id": FACEBOOK_PAGE_ID or None,
        },
        "linkedin": {
            "configured": bool(LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN),
        },
        "wordpress": {
            "configured": bool(WORDPRESS_URL and WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD),
            "url": WORDPRESS_URL or None,
        },
    }
    return result


@router.post("/facebook/verify")
def verify_facebook():
    if not FACEBOOK_ACCESS_TOKEN:
        return {"ok": False, "error": "Token chua cau hinh"}
    try:
        from src.social_media.facebook_poster import FacebookPoster
        poster = FacebookPoster()
        info = poster.verify_token()
        return {"ok": True, "info": info}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/linkedin/verify")
def verify_linkedin():
    if not LINKEDIN_ACCESS_TOKEN:
        return {"ok": False, "error": "Token chua cau hinh"}
    try:
        from src.social_media.linkedin_poster import LinkedInPoster
        poster = LinkedInPoster()
        info = poster.verify_token()
        return {"ok": True, "info": info}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/wordpress/verify")
def verify_wordpress():
    if not WORDPRESS_URL or not WORDPRESS_USERNAME:
        return {"ok": False, "error": "WordPress chua cau hinh"}
    try:
        from src.social_media.wordpress_poster import WordPressPoster
        poster = WordPressPoster()
        info = poster.verify_token()
        return {"ok": True, "info": info}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/wordpress/categories")
def wordpress_categories():
    if not WORDPRESS_URL or not WORDPRESS_USERNAME:
        return {"ok": False, "categories": [], "error": "WordPress chua cau hinh"}
    try:
        from src.social_media.wordpress_poster import WordPressPoster
        import requests as req
        poster = WordPressPoster()
        resp = req.get(
            f"{poster.api_url}/categories",
            headers=poster.headers,
            params={"per_page": 100},
            timeout=10,
        )
        if resp.status_code == 200:
            cats = [{"id": c["id"], "name": c["name"], "slug": c["slug"]} for c in resp.json()]
            return {"ok": True, "categories": cats}
        return {"ok": False, "categories": [], "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"ok": False, "categories": [], "error": str(e)}
