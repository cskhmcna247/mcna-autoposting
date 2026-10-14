import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "")
FACEBOOK_ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN", "")

LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_PERSON_URN = os.getenv("LINKEDIN_PERSON_URN", "")
LINKEDIN_ORG_URN = os.getenv("LINKEDIN_ORG_URN", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

WORDPRESS_URL = os.getenv("WORDPRESS_URL", "")
WORDPRESS_USERNAME = os.getenv("WORDPRESS_USERNAME", "")
WORDPRESS_APP_PASSWORD = os.getenv("WORDPRESS_APP_PASSWORD", "")

SCHEDULE_DAILY_TIME = os.getenv("SCHEDULE_DAILY_TIME", "09:00")
SCHEDULE_HOURLY_INTERVAL = int(os.getenv("SCHEDULE_HOURLY_INTERVAL", "60"))

CONTENT_SOURCE = os.getenv("CONTENT_SOURCE", "database")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = BASE_DIR / "logs"
LOG_FILE = LOG_DIR / "workflow.log"


def setup_logging():
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)

    root = logging.getLogger()
    if root.handlers:
        return

    root.setLevel(level)

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)
