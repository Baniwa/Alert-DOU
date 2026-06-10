# Alert DOU — AI-Powered Monitor for Brazil's Official Gazette

> Automated scraping, AI summarization and personal name tracking for the *Diário Oficial da União* — Brazil's federal government journal, published daily across hundreds of pages.

[![CI](https://github.com/Baniwa/Alert-DOU/actions/workflows/ci.yml/badge.svg)](https://github.com/Baniwa/Alert-DOU/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

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
| API | FastAPI + Pydantic + slowapi (rate limiting) |
| Task queue | Celery + Redis |
| Database | PostgreSQL 16 + SQLAlchemy 2 + Alembic |
| Frontend | React 19 + TypeScript + Tailwind CSS + Vite |
| Infrastructure | Docker Compose (4 services: api, worker, db, redis) |
| Deploy | Railway (backend) + Vercel (frontend) |
| CI | GitHub Actions (pytest + tsc + vitest + pip-audit + npm audit) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Celery worker (daily schedule)                              │
│    └─► Playwright scrapes pesquisa.in.gov.br                 │
│          └─► PDFs downloaded from download.in.gov.br         │
│                └─► pdfplumber extracts text                  │
│                      └─► Gemini Flash generates summary      │
│                            └─► PostgreSQL stores everything  │
└──────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────┐       ┌──────────────────────────────┐
│  FastAPI (REST API)  │◄─────►│  React frontend (Vercel)     │
│  Railway             │       │  - Newspaper home (3 cols)   │
│  /editions           │       │  - Section summaries         │
│  /summaries/search   │       │  - PT/EN toggle              │
│  /editions/{id}/sum… │       │  - Name Tracker (localStorage│
└──────────────────────┘       └──────────────────────────────┘
```

---

## Quick Start (Docker)

```bash
git clone https://github.com/Baniwa/Alert-DOU.git
cd Alert-DOU

cp .env.example .env          # set POSTGRES_PASSWORD and GEMINI_API_KEY

docker compose up --build
```

The API is available at `http://localhost:8000`. The frontend dev server runs separately:

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/editions/` | List editions (paginated, filterable by date) |
| GET | `/editions/dates` | List distinct publication dates |
| GET | `/editions/{id}` | Get a single edition |
| GET | `/editions/{id}/summary` | Get or generate the Portuguese AI summary |
| GET | `/editions/{id}/summary/en` | Get or generate the English translation |
| GET | `/summaries/` | List all summaries (paginated) |
| GET | `/summaries/search?q=` | Full-text search across summaries |
| GET | `/health` | Health check |

All endpoints are read-only. Rate limits are enforced per IP (10–60 req/min depending on cost).

---

## Security

- **SSRF protection** — PDF downloads validated against an allowlist of `*.in.gov.br` hostnames
- **PII redaction** — CPF patterns replaced with `[REDACTED]` in structured JSON logs before writing
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `COOP`, `CORP`, `Permissions-Policy`, `Referrer-Policy`, HSTS (production)
- **Request size limit** — bodies over 64 KB rejected before routing
- **No stack traces in production** — global exception handler returns generic 500
- **API docs disabled in production** — `/docs`, `/redoc`, `/openapi.json` return 404
- **Prompt injection guard** — translation prompt begins with an explicit instruction to ignore content-embedded instructions

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
