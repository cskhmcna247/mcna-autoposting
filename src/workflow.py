import logging
import re
from src.config_loader import CONTENT_SOURCE
from src.social_media.facebook_poster import FacebookPoster
from src.social_media.linkedin_poster import LinkedInPoster
from src.social_media.wordpress_poster import WordPressPoster

logger = logging.getLogger(__name__)


def _get_content_sources() -> list:
    sources = []
    source_type = CONTENT_SOURCE.lower()

    if source_type in ("google_sheets", "both"):
        try:
            from src.content_sources.google_sheets import GoogleSheetsSource
            sources.append(GoogleSheetsSource())
        except Exception as e:
            logger.error(f"Khong the ket noi Google Sheets: {e}")

    if source_type in ("database", "both"):
        try:
            from src.content_sources.database import DatabaseSource
            sources.append(DatabaseSource())
        except Exception as e:
            logger.error(f"Khong the ket noi Database: {e}")

    return sources


def _init_posters() -> dict:
    posters = {}
    try:
        posters["facebook"] = FacebookPoster()
    except Exception as e:
        logger.warning(f"Facebook poster khong kha dung: {e}")
    try:
        posters["linkedin"] = LinkedInPoster()
    except Exception as e:
        logger.warning(f"LinkedIn poster khong kha dung: {e}")
    try:
        posters["wordpress"] = WordPressPoster()
    except Exception as e:
        logger.warning(f"WordPress poster khong kha dung: {e}")
    return posters


def run_workflow():
    logger.info("=" * 50)
    logger.info("BAT DAU WORKFLOW DANG BAI TU DONG")
    logger.info("=" * 50)

    sources = _get_content_sources()
    if not sources:
        logger.error("Khong co nguon noi dung nao kha dung. Kiem tra cau hinh.")
        return

    posters = _init_posters()
    if not posters:
        logger.error("Khong co nen tang nao kha dung. Kiem tra API tokens.")
        return

    def _strip_html(html_text):
        text = re.sub(r'<br\s*/?>','\n', html_text)
        text = re.sub(r'</p>', '\n', text)
        text = re.sub(r'</li>', '\n', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    total_posted = 0
    total_failed = 0

    for source in sources:
        try:
            posts = source.get_pending_posts()
        except Exception as e:
            logger.error(f"Loi khi lay bai dang: {e}")
            continue

        for post in posts:
            post_id_key = post.get("row_index") or post.get("post_id")
            content = post["content"]
            if not content.strip():
                logger.warning(f"Bo qua bai dang {post_id_key}: noi dung rong")
                continue

            full_content = content
            if post["title"]:
                full_content = f"{post['title']}\n\n{content}"

            success_platforms = []
            failed_platforms = []

            social_content = post.get("content_social", "").strip()

            for platform in post["platforms"]:
                poster = posters.get(platform)
                if not poster:
                    logger.warning(f"Nen tang '{platform}' khong kha dung, bo qua")
                    continue

                if platform == "wordpress":
                    post_content = content
                elif social_content:
                    post_content = social_content
                    if post["title"]:
                        post_content = f"{post['title']}\n\n{social_content}"
                else:
                    post_content = _strip_html(full_content)

                try:
                    post_kwargs = {
                        "content": post_content,
                        "image_url": post.get("image_url", ""),
                        "title": post.get("title", ""),
                    }
                    if platform == "wordpress" and post.get("wp_category_ids"):
                        post_kwargs["categories"] = post["wp_category_ids"]
                    if platform == "wordpress" and post.get("wp_meta"):
                        post_kwargs["wp_meta"] = post["wp_meta"]
                    result = poster.post(**post_kwargs)
                    if result.get("success"):
                        success_platforms.append(platform)
                        logger.info(f"  -> {platform}: OK (ID: {result.get('post_id', 'N/A')})")

                        comment_text = post.get("comment_text", "").strip()
                        if comment_text and platform in ("facebook", "linkedin") and hasattr(poster, "comment"):
                            try:
                                cm = poster.comment(result["post_id"], comment_text)
                                if cm.get("success"):
                                    logger.info(f"  -> {platform} comment: OK")
                                else:
                                    logger.warning(f"  -> {platform} comment: {cm.get('error', 'that bai')}")
                            except Exception as ce:
                                logger.warning(f"  -> {platform} comment that bai: {ce}")
                except Exception as e:
                    failed_platforms.append(platform)
                    logger.error(f"  -> {platform}: THAT BAI - {e}")

            if success_platforms and not failed_platforms:
                source.mark_posted(post_id_key, "posted")
                total_posted += 1
            elif success_platforms and failed_platforms:
                status = f"partial: ok={','.join(success_platforms)} fail={','.join(failed_platforms)}"
                source.mark_posted(post_id_key, status)
                total_posted += 1
            else:
                error_msg = f"Tat ca nen tang that bai: {','.join(failed_platforms)}"
                source.mark_failed(post_id_key, error_msg)
                total_failed += 1

    logger.info(f"HOAN THANH: {total_posted} thanh cong, {total_failed} that bai")
    logger.info("=" * 50)
