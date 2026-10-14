import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.config_loader import setup_logging, BASE_DIR
from server.routers import auth, dashboard, posts, workflow, platforms, settings

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Auto Posting MCNA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://autoposting.mcna.vn",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = BASE_DIR / "uploads"
upload_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(posts.router)
app.include_router(workflow.router)
app.include_router(platforms.router)
app.include_router(settings.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
