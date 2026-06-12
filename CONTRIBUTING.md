# Contributing to Alert DOU

Thanks for your interest! Here's how to get started.

## Getting Started

```bash
git clone https://github.com/Baniwa/Alert-DOU.git
cd Alert-DOU
cp .env.example .env   # fill in your keys
docker compose up -d   # starts API + DB + Redis + Worker
cd frontend && npm install && npm run dev
```

## Requirements

- Docker + Docker Compose
- Node.js 20+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run the tests: `pytest` (Python) and `npm run build` (frontend typecheck)
4. Open a pull request with a clear description of what changed and why

## Code Style

- Python: follows the project's existing style (no strict linter config — just keep it readable)
- TypeScript: strict mode enabled, no `any`

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md).
