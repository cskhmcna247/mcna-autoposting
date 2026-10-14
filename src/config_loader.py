import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


def get_env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def get_env_required(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise ValueError(f"Thieu bien moi truong bat buoc: {key}")
    return value


FACEBOOK_PAGE_ID = get_env("FACEBOOK_PAGE_ID")
FACEBOOK_APP_ID = get_env("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = get_env("FACEBOOK_APP_SECRET")
FACEBOOK_ACCESS_TOKEN = get_env("FACEBOOK_ACCESS_TOKEN")

LINKEDIN_ACCESS_TOKEN = get_env("LINKEDIN_ACCESS_TOKEN")
LINKEDIN_PERSON_URN = get_env("LINKEDIN_PERSON_URN")
LINKEDIN_ORG_URN = get_env("LINKEDIN_ORG_URN")

GOOGLE_SHEETS_CREDENTIALS_FILE = get_env("GOOGLE_SHEETS_CREDENTIALS_FILE", "config/google_credentials.json")
GOOGLE_SHEET_ID = get_env("GOOGLE_SHEET_ID")
GOOGLE_SHEET_NAME = get_env("GOOGLE_SHEET_NAME", "Sheet1")

WORDPRESS_URL = get_env("WORDPRESS_URL")
WORDPRESS_USERNAME = get_env("WORDPRESS_USERNAME")
WORDPRESS_APP_PASSWORD = get_env("WORDPRESS_APP_PASSWORD")

SUPABASE_URL = get_env("SUPABASE_URL")
SUPABASE_KEY = get_env("SUPABASE_KEY")

SCHEDULE_DAILY_TIME = get_env("SCHEDULE_DAILY_TIME", "09:00")
SCHEDULE_HOURLY_INTERVAL = int(get_env("SCHEDULE_HOURLY_INTERVAL", "60"))

CONTENT_SOURCE = get_env("CONTENT_SOURCE", "both")

LOG_LEVEL = get_env("LOG_LEVEL", "INFO")


def setup_logging():
    os.makedirs("logs", exist_ok=True)
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler("logs/workflow.log", encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
