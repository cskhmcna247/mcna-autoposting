import requests
from fastapi import APIRouter, Depends

from server.auth import get_current_user
from src.config_loader import (
    FACEBOOK_PAGE_ID,
    FACEBOOK_ACCESS_TOKEN,
    LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_PERSON_URN,
    LINKEDIN_ORG_URN,
    WORDPRESS_URL,
    WORDPRESS_USERNAME,
    WORDPRESS_APP_PASSWORD,
)
from src.social_media.facebook_poster import FacebookPoster
from src.social_media.linkedin_poster import LinkedInPoster

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


@router.get("/status")
def status(user=Depends(get_current_user)):
    return {
        "facebook": {
            "configured": bool(FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN),
            "page_id": FACEBOOK_PAGE_ID,
        },
        "linkedin": {
            "configured": bool(LINKEDIN_ACCESS_TOKEN and (LINKEDIN_PERSON_URN or LINKEDIN_ORG_URN)),
        },
        "wordpress": {
            "configured": bool(WORDPRESS_URL and WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD),
        },
    }


@router.post("/facebook/verify")
def verify_facebook(user=Depends(get_current_user)):
    poster = FacebookPoster()
    ok = poster.verify_token()
    return {"ok": ok, "info": {"page_id": FACEBOOK_PAGE_ID} if ok else None, "error": None if ok else "Token khong hop le"}


@router.post("/linkedin/verify")
def verify_linkedin(user=Depends(get_current_user)):
    poster = LinkedInPoster()
    ok = poster.verify_token()
    return {"ok": ok, "info": {"author_urn": poster.author_urn} if ok else None, "error": None if ok else "Token khong hop le"}


@router.get("/wordpress/categories")
def wordpress_categories(user=Depends(get_current_user)):
    if not (WORDPRESS_URL and WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD):
        return {"ok": False, "categories": []}

    try:
        resp = requests.get(
            f"{WORDPRESS_URL.rstrip('/')}/wp-json/wp/v2/categories",
            auth=(WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
            params={"per_page": 100},
            timeout=15,
        )
        resp.raise_for_status()
        categories = [{"id": c["id"], "name": c["name"]} for c in resp.json()]
        return {"ok": True, "categories": categories}
    except Exception:
        return {"ok": False, "categories": []}
