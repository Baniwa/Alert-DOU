FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install -e .


# ── API stage ────────────────────────────────────────────────
FROM base AS api

COPY . .

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]


# ── Worker stage ─────────────────────────────────────────────
FROM base AS worker

RUN playwright install chromium --with-deps

COPY . .

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info", "--concurrency=2"]


# ── Beat stage (scheduler) ───────────────────────────────────
FROM base AS beat

COPY . .

CMD ["celery", "-A", "workers.celery_app", "beat", "--loglevel=info"]
