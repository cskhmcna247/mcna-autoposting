import logging

from src.config_loader import CONTENT_SOURCE, PUBLIC_BASE_URL
from src.content_sources import database
from src.social_media.facebook_poster import FacebookPoster
from src.social_media.linkedin_poster import LinkedInPoster
from src.social_media.wordpress_poster import WordPressPoster
from src.text_format import social_text

logger = logging.getLogger(__name__)


def _to_absolute_url(url):
    """Anh upload noi bo luu dang '/uploads/xxx.jpg' (relative path).
    Facebook/WordPress API can URL tuyet doi de tai anh ve."""
    if not url:
        return url
    url = url.split(",")[0].strip()  # chi lay anh dau tien neu co nhieu anh phan cach dau phay
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"{PUBLIC_BASE_URL.rstrip('/')}/{url.lstrip('/')}"


COMMENT_SUFFIX = "_comment"
COMMENT_PLATFORMS = ("facebook", "linkedin")


def is_comment_key(key):
    return key.endswith(COMMENT_SUFFIX)


def comment_warnings(results):
    """Gom cac loi binh luan tu dong (bai van dang thanh cong)."""
    return "; ".join(f"{k}: {v}" for k, v in results.items() if is_comment_key(k) and v != "ok")


def _post_facebook(poster, post):
    return poster.post(social_text(post), image_url=_to_absolute_url(post.get("image_url")))


def _post_linkedin(poster, post):
    return poster.post(social_text(post), image_url=_to_absolute_url(post.get("image_url")))


def _post_wordpress(poster, post):
    poster.post(
        title=post["title"],
        content=post.get("content_social") or post["content"],
        image_url=_to_absolute_url(post.get("image_url")),
        category_ids=post.get("wp_category_ids"),
    )


POSTERS = {
    "facebook": (FacebookPoster, _post_facebook),
    "linkedin": (LinkedInPoster, _post_linkedin),
    "wordpress": (WordPressPoster, _post_wordpress),
}


class WorkflowPartialError(Exception):
    def __init__(self, results, failed_platforms):
        self.results = results
        self.failed_platforms = failed_platforms
        super().__init__(f"Loi tren cac platform: {', '.join(failed_platforms)}")


def publish_post(post):
    """Dang 1 bai len tat ca platform duoc chi dinh. Tra ve dict {platform: ok/error}."""
    platforms = [p.strip().lower() for p in (post.get("platforms") or "").split(",") if p.strip()]
    if not platforms:
        raise RuntimeError("Bai dang khong co platform nao duoc chi dinh")

    results = {}
    errors = []

    for platform in platforms:
        entry = POSTERS.get(platform)
        if not entry:
            results[platform] = f"Khong ho tro platform: {platform}"
            errors.append(platform)
            continue

        poster_cls, post_fn = entry
        try:
            poster = poster_cls()
            platform_post_id = post_fn(poster, post)
            results[platform] = "ok"
        except Exception as exc:
            logger.exception("Loi khi dang len %s", platform)
            results[platform] = str(exc)
            errors.append(platform)
            continue

        comment_text = (post.get("comment_text") or "").strip()
        if comment_text and platform in COMMENT_PLATFORMS and platform_post_id:
            try:
                poster.comment(platform_post_id, comment_text)
                results[platform + COMMENT_SUFFIX] = "ok"
            except Exception as exc:
                logger.exception("Loi khi binh luan tren %s", platform)
                results[platform + COMMENT_SUFFIX] = str(exc)

    if errors:
        raise WorkflowPartialError(results, errors)

    return results


def run_workflow():
    if CONTENT_SOURCE not in ("database", "both"):
        logger.error("CONTENT_SOURCE=%s chua duoc ho tro (chi ho tro 'database')", CONTENT_SOURCE)
        return

    posts = database.get_pending_posts()
    logger.info("Tim thay %d bai can dang", len(posts))

    for post in posts:
        post_id = post["id"]
        if not database.claim_post(post_id, post["status"]):
            logger.info("Bo qua bai %s: da co tien trinh khac xu ly", post_id)
            continue
        try:
            results = publish_post(post)
            database.mark_posted(post_id)
            warning = comment_warnings(results)
            if warning:
                database.update_post(post_id, {"error_message": warning[:1000]})
            logger.info("Dang thanh cong bai %s: %s", post_id, results)
        except WorkflowPartialError as exc:
            database.mark_partial_or_failed(post_id, exc.results, exc.failed_platforms)
            logger.error("Dang that bai mot phan bai %s: %s", post_id, exc.results)
        except Exception as exc:
            database.mark_failed(post_id, str(exc))
            logger.error("Dang that bai bai %s: %s", post_id, exc)
