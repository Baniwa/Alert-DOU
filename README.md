# Alert DOU — AI-Powered Brazilian Official Gazette Monitor

> Real-time monitoring of Brazil's *Diário Oficial da União* (DOU) — the federal government's official journal — with automated data extraction and a personal name-alert system.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Playwright](https://img.shields.io/badge/Playwright-headless_scraping-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Status](https://img.shields.io/badge/status-in_development-yellow)](https://github.com/Baniwa/Alert-DOU)

---

## The Problem

Brazil's federal government publishes hundreds of official acts daily across three DOU sections — appointments, decrees, public notices, regulations. Finding a specific name or tracking relevant acts requires manually reading 300–600 pages of dense bureaucratic text. Every. Single. Day.

## The Solution

Alert DOU automates this entirely:

- **Automated scraping** — fetches every DOU edition as soon as it's published
- **AI summarization** — uses Gemini Pro to generate concise summaries per section *(coming soon)*
- **Personal Name Tracker** — monitors for CPF numbers or names and sends an alert the moment they appear *(coming soon)*
- **REST API** — serves structured data for downstream consumption *(coming soon)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Scraping | Playwright + playwright-stealth (bypasses WAF) |
| HTML Parsing | BeautifulSoup4 |
| API | FastAPI + Pydantic *(planned)* |
| Task Queue | Celery + Redis *(planned)* |
| Database | PostgreSQL + SQLAlchemy *(planned)* |
| AI | Google Gemini Pro *(planned)* |
| Infrastructure | Docker Compose *(planned)* |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Alert DOU Pipeline                │
│                                                     │
│  Playwright ──► pesquisa.in.gov.br ──► Parser       │
│  (headless)       (legacy API)       (BeautifulSoup)│
│       │                                    │        │
│       └──────────────┬─────────────────────┘        │
│                      ▼                              │
│              PostgreSQL (editions + articles)        │
│                      │                              │
│          ┌───────────┼───────────┐                  │
│          ▼           ▼           ▼                  │
│       FastAPI     Celery      Gemini Pro             │
│       (REST)    (scheduler)  (summaries)            │
└─────────────────────────────────────────────────────┘
```

---

## Engineering Challenges Solved

The DOU portal presented several real-world scraping obstacles, all resolved:

1. **Session-based CSRF tokens** — portal uses Liferay's `p_auth` token for AJAX calls
2. **Client-side rendering** — results are never in the server-side HTML; JavaScript must execute
3. **WAF blocking HTTP clients** — Cloudflare edge (BSB node) blocks raw requests
4. **WAF blocking headless browsers** — solved with `playwright-stealth` to spoof browser fingerprints
5. **No documented public API** — reverse-engineered the legacy `pesquisa.in.gov.br` POST endpoint via DevTools

---

## Project Status

| Phase | Description | Status |
|---|---|---|
| 1 | Scraper — fetch DOU editions via headless browser | ✅ Done |
| 2 | Database — store editions with SQLAlchemy + PostgreSQL | 🔄 In progress |
| 3 | REST API — FastAPI endpoints for querying publications | ⏳ Planned |
| 4 | AI Summaries — Gemini Pro section summarization | ⏳ Planned |
| 5 | Name Tracker — personal alert system | ⏳ Planned |
| 6 | Docker — one-command local setup | ⏳ Planned |

---

## Quick Start

```bash
git clone https://github.com/Baniwa/Alert-DOU.git
cd Alert-DOU

python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

pip install -e .
playwright install chromium

python -m scraper.fetcher
```

Expected output:
```
INFO: Loading DOU search page...
INFO: Triggering search via JavaScript...
INFO: 3 editions found.

Found: 3 publications — 2026-05-12
  - Diário Oficial da União - Seção 1 | Edition 87 | 257 pages
  - Diário Oficial da União - Seção 2 | Edition 87 | 84 pages
  - Diário Oficial da União - Seção 3 | Edition 87 | 328 pages
```

---

## Background

This project was born from a personal frustration: as both a software developer and a *concurseira* (someone pursuing Brazilian federal civil service positions), I spent hours each week manually checking the DOU for appointment notices. This is the tool I wished I had.

---

*Built with Python 3.12+ · Targeting senior engineering roles globally*
