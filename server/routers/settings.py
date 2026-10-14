from fastapi import APIRouter

from src.config_loader import (
    CONTENT_SOURCE, SUPABASE_URL,
    SCHEDULE_DAILY_TIME, SCHEDULE_HOURLY_INTERVAL,
    LOG_LEVEL,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings():
    return {
        "content_source": CONTENT_SOURCE,
        "database": {
            "type": "supabase",
            "url": SUPABASE_URL,
        },
        "schedule": {
            "daily_time": SCHEDULE_DAILY_TIME,
            "hourly_interval": SCHEDULE_HOURLY_INTERVAL,
        },
        "log_level": LOG_LEVEL,
    }
