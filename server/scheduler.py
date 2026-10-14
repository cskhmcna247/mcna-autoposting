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


def add_workflow_job(interval_minutes: int = 60):
    from src.workflow import run_workflow

    sched = get_scheduler()
    job_id = "auto_post_workflow"

    if sched.get_job(job_id):
        sched.remove_job(job_id)

    sched.add_job(
        run_workflow,
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
