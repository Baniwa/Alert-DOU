import os

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

app = Celery(
    "alert_dou",
    broker=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    include=["workers.tasks"],
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)

app.conf.beat_schedule = {
    # Roda às 07:00 BRT (10:00 UTC) em dias úteis
    "scrape-dou-daily": {
        "task": "workers.tasks.scrape_today",
        "schedule": crontab(hour=10, minute=0, day_of_week="mon-fri"),
    },
}
