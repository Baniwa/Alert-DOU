# Alert DOU — AI-Powered Monitor for Brazil's Official Gazette

> Automated scraping, AI summarisation and personal name tracking for the *Diário Oficial da União* — Brazil's federal government journal, published daily across hundreds of pages.

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is the DOU?

The *Diário Oficial da União* is Brazil's equivalent of the Federal Register. Every federal appointment, dismissal, regulation, public notice and government contract must be published there before taking legal effect. It comes out every weekday in three sections:

- **Seção 1** — Regulatory acts (laws, decrees, ordinances)
- **Seção 2** — Personnel acts (appointments, dismissals, retirements)
- **Seção 3** — Contracts, public notices, authorisations

Each edition runs 300–600 pages. Roughly 220 editions are published per year. Anyone waiting for a federal appointment, tracking a contract, or monitoring regulation changes has no choice but to read it manually — or build something like this.

---

## What This Project Does

- **Scrapes the DOU daily** via a headless Chromium browser (the portal's WAF blocks plain HTTP clients)
- **Extracts text from PDFs** — each section is a signed PDF; the scraper downloads and parses them
- **Summarises each section with Gemini Flash** — produces a concise, structured digest per edition
- **Translates summaries to English on demand** — cached in the database after the first request
- **Calendar date picker** — iPhone-style widget showing green dots on days with indexed editions; click any past weekday to navigate or trigger a live scrape
- **On-demand scraping** — "Buscar no DOU" button fetches metadata for any unindexed date in ~20 s, without downloading PDFs or running AI
- **Backfill system** — `POST /editions/backfill` queues lightweight metadata scrapes for a date range via Celery, covering the full history since January 2026
- **Text highlights** — select any phrase in a summary to highlight it; persisted locally via localStorage
- **Exposes a REST API** — paginated endpoints for editions, summaries and full-text search
- **Serves a React frontend** — newspaper-style homepage with date navigation and section columns
- **Name Tracker** — store a name or CPF locally; the app highlights any mention in AI summaries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Scraper | Playwright + playwright-stealth (headless Chromium, WAF bypass) |
| PDF extraction | pdfplumber + curl-cffi (HTTP/2, Chrome impersonation) |
| AI | Google Gemini Flash (summarisation + EN translation) |
| API | FastAPI 0.136 + Pydantic + slowapi (rate limiting) |
| Task queue | Celery + Redis |
| Database | PostgreSQL 16 + SQLAlchemy 2 + Alembic |
| Frontend | React 19 + TypeScript + Tailwind CSS v4 + Vite |
| State management | TanStack Query (React Query) |
| Infrastructure | Docker Compose (4 services: api, worker, db, redis) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Celery worker (daily schedule + on-demand backfill)         │
│    └─► Playwright scrapes pesquisa.in.gov.br                 │
│          └─► PDFs downloaded from download.in.gov.br         │
│                └─► pdfplumber extracts text                  │
│                      └─► Gemini Flash generates summary      │
│                            └─► PostgreSQL stores everything  │
└──────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────┐       ┌──────────────────────────────┐
│  FastAPI (REST API)  │◄─────►│  React frontend              │
│  :8000               │       │  - Newspaper home (3 cols)   │
│  /editions           │       │  - Calendar date picker      │
│  /summaries/search   │       │  - PT/EN summary toggle      │
│  /editions/{id}/sum… │       │  - Text highlights           │
└──────────────────────┘       │  - Name Tracker (localStorage│
                               └──────────────────────────────┘
```

---

## Quick Start (Docker)

```bash
git clone https://github.com/Baniwa/Alert-DOU.git
cd Alert-DOU

cp .env.example .env          # set POSTGRES_PASSWORD and GEMINI_API_KEY

docker compose up -d          # API :8000 · DB :5432 · Redis :6379 · Worker
```

The `docker-compose.override.yml` included in the repo mounts the source code into the container and starts uvicorn with `--reload`, so any Python change you make is reflected immediately without rebuilding the image.

Start the frontend separately:

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

API docs are available at `http://localhost:8000/docs`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password |
| `GEMINI_API_KEY` | ✅ | Google AI Studio key — [get one free](https://aistudio.google.com/app/apikey) |
| `POSTGRES_USER` | optional | Default: `alertdou` |
| `POSTGRES_DB` | optional | Default: `alertdou` |
| `CORS_ORIGINS` | optional | Comma-separated allowed origins. Default: `http://localhost:5173,http://localhost:4173` |
| `ENVIRONMENT` | optional | Set to `production` to enable HSTS |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/editions/` | List editions (paginated, filterable by date) |
| GET | `/editions/dates` | List distinct publication dates with indexed data |
| GET | `/editions/{id}` | Get a single edition |
| GET | `/editions/{id}/summary` | Get or generate the Portuguese AI summary |
| GET | `/editions/{id}/summary/en` | Get or generate the English translation |
| POST | `/editions/fetch-date?date=YYYY-MM-DD` | Scrape a specific date synchronously (~20 s) |
| POST | `/editions/backfill` | Queue metadata scrapes for a date range via Celery |
| GET | `/summaries/` | List all summaries (paginated) |
| GET | `/summaries/search?q=` | Full-text search across summaries |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |

Rate limits are enforced per IP (3–60 req/min depending on endpoint cost).

---

## Security

- **SSRF protection** — PDF downloads validated against an allowlist of `*.in.gov.br` hostnames
- **PII redaction** — CPF patterns replaced with `[CPF]` in structured logs before writing
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `COOP`, `CORP`, `Permissions-Policy`, `Referrer-Policy`, HSTS (production)
- **Request size limit** — bodies over 64 KB rejected before routing
- **No stack traces in production** — global exception handler returns generic 500
- **Prompt injection guard** — translation and summarisation prompts include explicit guards against content-embedded instructions

See [SECURITY.md](SECURITY.md) to report a vulnerability.

---

## Scraper Notes

The DOU portal uses Liferay with session-based CSRF tokens and sits behind an Azion WAF. A plain HTTP client gets blocked immediately. The scraper:

1. Launches a real Chromium instance via Playwright with stealth patches applied
2. Navigates to the search form and submits it — this triggers a cross-domain redirect to `pesquisa.in.gov.br` with a valid session
3. Extracts edition metadata (title, edition number, date, page count, PDF URL)
4. Downloads PDFs from `download.in.gov.br` using curl-cffi with Chrome impersonation

PDF download URLs are signed and expire. If a URL has expired, the scraper detects the `%PDF` magic-byte absence in the response and re-scrapes to obtain a fresh URL.

---

## Background

Built as a portfolio project to demonstrate end-to-end engineering across scraping, AI integration, REST API design, security hardening and frontend development. The motivation is personal: as both a developer and a *concurseira* (someone pursuing Brazilian federal civil service positions), I spent hours each week manually checking the DOU for appointment notices. This is the tool I wished I had.

---

*Python 3.12 · React 19 · FastAPI · PostgreSQL · Gemini Flash*
