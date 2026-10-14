import threading

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from server.auth import get_current_admin
from src.config_loader import LOG_FILE
from src.workflow import run_workflow

router = APIRouter(prefix="/api/workflow", tags=["workflow"])

_running_lock = threading.Lock()
_is_running = False

_scheduler = BackgroundScheduler()
_scheduler.start()
SCHEDULE_JOB_ID = "autoposting_workflow"


def _run_workflow_guarded():
    global _is_running
    with _running_lock:
        if _is_running:
            return
        _is_running = True
    try:
        run_workflow()
    finally:
        with _running_lock:
            _is_running = False


@router.post("/run")
def run_now(background_tasks: BackgroundTasks, admin=Depends(get_current_admin)):
    global _is_running
    with _running_lock:
        if _is_running:
            raise HTTPException(status_code=409, detail="Workflow dang chay")
    background_tasks.add_task(_run_workflow_guarded)
    return {"status": "started"}


@router.get("/status")
def status(admin=Depends(get_current_admin)):
    with _running_lock:
        return {"running": _is_running}


@router.get("/logs")
def logs(lines: int = 200, admin=Depends(get_current_admin)):
    if not LOG_FILE.exists():
        return {"logs": ""}
    with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
        all_lines = f.readlines()
    return {"logs": "".join(all_lines[-lines:])}


@router.get("/schedule")
def get_schedule(admin=Depends(get_current_admin)):
    job = _scheduler.get_job(SCHEDULE_JOB_ID)
    if not job:
        return {"active": False}
    return {
        "active": True,
        "trigger": str(job.trigger),
        "next_run": job.next_run_time.strftime("%Y-%m-%d %H:%M:%S") if job.next_run_time else None,
    }


@router.post("/schedule")
def set_schedule(interval_minutes: int, admin=Depends(get_current_admin)):
    if interval_minutes < 1:
        raise HTTPException(status_code=400, detail="Khoang thoi gian phai >= 1 phut")

    _scheduler.add_job(
        _run_workflow_guarded,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=SCHEDULE_JOB_ID,
        replace_existing=True,
    )
    return get_schedule(admin=admin)


@router.delete("/schedule")
def remove_schedule(admin=Depends(get_current_admin)):
    if _scheduler.get_job(SCHEDULE_JOB_ID):
        _scheduler.remove_job(SCHEDULE_JOB_ID)
    return {"active": False}
