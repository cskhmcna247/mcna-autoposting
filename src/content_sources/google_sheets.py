import logging
from datetime import datetime

import gspread
from google.oauth2.service_account import Credentials

from src.config_loader import (
    GOOGLE_SHEET_ID,
    GOOGLE_SHEET_NAME,
    GOOGLE_SHEETS_CREDENTIALS_FILE,
)

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Cot mac dinh trong Google Sheet:
# A: title | B: content | C: image_url | D: platforms (facebook,linkedin)
# E: status (pending/posted/failed) | F: scheduled_time | G: posted_at


class GoogleSheetsSource:
    def __init__(self):
        creds = Credentials.from_service_account_file(
            GOOGLE_SHEETS_CREDENTIALS_FILE, scopes=SCOPES
        )
        self.client = gspread.authorize(creds)
        self.sheet = self.client.open_by_key(GOOGLE_SHEET_ID).worksheet(
            GOOGLE_SHEET_NAME
        )
        logger.info("Ket noi Google Sheets thanh cong")

    def get_pending_posts(self) -> list[dict]:
        rows = self.sheet.get_all_records()
        pending = []
        for i, row in enumerate(rows, start=2):
            row = {str(k).lower().strip(): v for k, v in row.items()}
            if str(row.get("status", "")).lower().strip() != "pending":
                continue

            scheduled = str(row.get("scheduled_time", "")).strip()
            if scheduled:
                try:
                    sched_time = datetime.strptime(scheduled, "%Y-%m-%d %H:%M")
                    if sched_time > datetime.now():
                        continue
                except ValueError:
                    logger.warning(f"Dong {i}: scheduled_time khong hop le: {scheduled}")

            platforms_raw = str(row.get("platforms", "facebook,linkedin"))
            platforms = [p.strip().lower() for p in platforms_raw.split(",") if p.strip()]

            pending.append({
                "row_index": i,
                "title": str(row.get("title", "")),
                "content": str(row.get("content", "")),
                "image_url": str(row.get("image_url", "")),
                "platforms": platforms,
                "source": "google_sheets",
            })

        logger.info(f"Tim thay {len(pending)} bai dang pending tu Google Sheets")
        return pending

    def mark_posted(self, row_index: int, status: str = "posted"):
        status_col = 5  # Column E
        posted_at_col = 7  # Column G
        self.sheet.update_cell(row_index, status_col, status)
        self.sheet.update_cell(
            row_index, posted_at_col, datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        logger.info(f"Cap nhat dong {row_index} -> {status}")

    def mark_failed(self, row_index: int, error_msg: str = ""):
        self.mark_posted(row_index, status=f"failed: {error_msg[:50]}")
