from fastapi import APIRouter, Depends

from server.auth import get_current_user
from src.content_sources import database

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(user=Depends(get_current_user)):
    return database.count_by_status()


@router.get("/recent")
def recent(limit: int = 10, user=Depends(get_current_user)):
    result = database.list_posts_paginated(status="all", limit=limit, offset=0)
    return result["posts"]
