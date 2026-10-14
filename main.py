import argparse
import time
import logging

import schedule

from src.config_loader import setup_logging, SCHEDULE_DAILY_TIME, SCHEDULE_HOURLY_INTERVAL
from src.workflow import run_workflow

logger = logging.getLogger(__name__)


def run_once():
    setup_logging()
    logger.info("Chay workflow 1 lan...")
    run_workflow()


def run_daily():
    setup_logging()
    logger.info(f"Dat lich dang bai hang ngay luc {SCHEDULE_DAILY_TIME}")
    schedule.every().day.at(SCHEDULE_DAILY_TIME).do(run_workflow)

    run_workflow()

    while True:
        schedule.run_pending()
        time.sleep(30)


def run_hourly():
    setup_logging()
    logger.info(f"Dat lich dang bai moi {SCHEDULE_HOURLY_INTERVAL} phut")
    schedule.every(SCHEDULE_HOURLY_INTERVAL).minutes.do(run_workflow)

    run_workflow()

    while True:
        schedule.run_pending()
        time.sleep(30)


def verify_tokens():
    setup_logging()
    logger.info("Kiem tra API tokens...")

    try:
        from src.social_media.facebook_poster import FacebookPoster
        fb = FacebookPoster()
        fb_ok = fb.verify_token()
        print(f"  Facebook: {'OK' if fb_ok else 'THAT BAI'}")
    except Exception as e:
        print(f"  Facebook: LOI - {e}")

    try:
        from src.social_media.linkedin_poster import LinkedInPoster
        li = LinkedInPoster()
        li_ok = li.verify_token()
        print(f"  LinkedIn: {'OK' if li_ok else 'THAT BAI'}")
    except Exception as e:
        print(f"  LinkedIn: LOI - {e}")


def main():
    parser = argparse.ArgumentParser(description="Workflow dang bai tu dong Facebook & LinkedIn")
    parser.add_argument(
        "mode",
        choices=["once", "daily", "hourly", "verify"],
        help="Che do chay: once (1 lan), daily (hang ngay), hourly (hang gio), verify (kiem tra token)",
    )
    args = parser.parse_args()

    if args.mode == "once":
        run_once()
    elif args.mode == "daily":
        run_daily()
    elif args.mode == "hourly":
        run_hourly()
    elif args.mode == "verify":
        verify_tokens()


if __name__ == "__main__":
    main()
