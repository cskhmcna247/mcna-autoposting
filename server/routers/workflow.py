import threading
import logging
from io import StringIO

from fastapi import APIRouter

from server.scheduler import add_workflow_job, remove_workflow_job, get_scheduler

router = APIRouter(prefix="/api/workflow", tags=["workflow"])

_last_log: str = ""
_running: bool = False


@router.post("/run")
def run_workflow_now():
    global _last_log, _running

    if _running:
        return {"status": "already_running", "message": "Workflow dang chay"}

    def _execute():
        global _last_log, _running
        _running = True
        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        try:
            from src.workflow import run_workflow
            run_workflow()
        except Exception as e:
            logging.error(f"Workflow error: {e}")
        finally:
            root_logger.removeHandler(handler)
            _last_log = log_stream.getvalue()
            _running = False

    thread = threading.Thread(target=_execute, daemon=True)
    thread.start()
    return {"status": "started", "message": "Workflow bat dau chay"}


@router.get("/status")
def workflow_status():
    return {"running": _running}


@router.get("/logs")
def get_logs():
    return {"logs": _last_log}


@router.post("/schedule")
def set_schedule(interval_minutes: int = 60):
    add_workflow_job(interval_minutes)
    return {"message": f"Scheduled every {interval_minutes} minutes"}


@router.delete("/schedule")
def remove_schedule():
    remove_workflow_job()
    return {"message": "Schedule removed"}


@router.get("/schedule")
def get_schedule_info():
    sched = get_scheduler()
    job = sched.get_job("auto_post_workflow")
    if job:
        return {
            "active": True,
            "next_run": str(job.next_run_time),
            "trigger": str(job.trigger),
        }
    return {"active": False}
