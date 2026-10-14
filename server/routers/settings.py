from fastapi import APIRouter, Depends

from server.auth import get_current_admin
from src.config_loader import CONTENT_SOURCE, SCHEDULE_DAILY_TIME, SCHEDULE_HOURLY_INTERVAL

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings(admin=Depends(get_current_admin)):
    return {
        "content_source": CONTENT_SOURCE,
        "database": {
            "type": "supabase",
            "host": "-",
            "port": "-",
            "name": "posts",
        },
        "schedule": {
            "daily_time": SCHEDULE_DAILY_TIME,
            "hourly_interval": SCHEDULE_HOURLY_INTERVAL,
        },
    }
