from fastapi import APIRouter, Depends

from server.dependencies import get_db
from src.content_sources.database import DatabaseSource

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: DatabaseSource = Depends(get_db)):
    return db.get_stats()


@router.get("/recent")
def get_recent(limit: int = 10, db: DatabaseSource = Depends(get_db)):
    posts, _ = db.get_all_posts(limit=limit, offset=0)
    return posts
