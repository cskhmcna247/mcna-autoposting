from typing import Optional

from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str = ""
    content: str
    content_social: Optional[str] = None
    image_url: str = ""
    platforms: str = "facebook,linkedin"
    scheduled_time: Optional[str] = None
    created_by: str = ""
    priority: str = "medium"
    wp_category_ids: Optional[str] = None
    comment_text: Optional[str] = None
    wp_meta: Optional[str] = None  # JSON: slug, excerpt, tags, SEO, muc luc


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_social: Optional[str] = None
    image_url: Optional[str] = None
    platforms: Optional[str] = None
    status: Optional[str] = None
    scheduled_time: Optional[str] = None
    priority: Optional[str] = None
    wp_category_ids: Optional[str] = None
    comment_text: Optional[str] = None
    wp_meta: Optional[str] = None
