import logging
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler()
    return _scheduler


def start_scheduler():
    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info("APScheduler started")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")


def _run_scheduled():
    # Dùng chung luồng chạy với nút "Chạy ngay" để không bao giờ chạy 2 workflow cùng lúc
    from server.routers.workflow import start_workflow_background
    start_workflow_background()


def _run_deletion_check():
    from server.dependencies import get_db
    from src.deletion_check import check_deleted_posts
    try:
        check_deleted_posts(get_db().table)
    except Exception as e:
        logger.error(f"Kiem tra bai bi xoa loi: {e}")


def add_deletion_check_job(interval_minutes: int = 30):
    """Định kỳ kiểm tra bài đã đăng có bị xóa trên Facebook/LinkedIn/WordPress không."""
    get_scheduler().add_job(
        _run_deletion_check,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="deletion_check",
        replace_existing=True,
    )
    logger.info(f"Kiem tra bai bi xoa moi {interval_minutes} phut")


def add_workflow_job(interval_minutes: int = 60):
    sched = get_scheduler()
    job_id = "auto_post_workflow"

    if sched.get_job(job_id):
        sched.remove_job(job_id)

    sched.add_job(
        _run_scheduled,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=job_id,
        replace_existing=True,
    )
    logger.info(f"Workflow job scheduled every {interval_minutes} minutes")


def remove_workflow_job():
    sched = get_scheduler()
    if sched.get_job("auto_post_workflow"):
        sched.remove_job("auto_post_workflow")
        logger.info("Workflow job removed")
