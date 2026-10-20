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

`main` is protected: it only moves through pull requests with a green CI. No direct pushes, no force pushes.

1. Branch from an up-to-date `main` using a prefix that says what the change is:
   `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`
2. Keep one concern per branch. A bug fix and a new feature go in separate PRs.
3. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `fix(api): serve OpenAPI schema behind /api`
4. Run the checks locally before pushing:
   - `pytest`
   - `cd frontend && npm run lint && npx tsc --noEmit -p tsconfig.app.json && npm test -- --run`
5. Open the pull request against `main` and fill in the template. CI must pass before merging.
6. Merge with **squash**. The branch is deleted automatically after the merge.

Dependency updates come from Dependabot, grouped weekly into one PR per ecosystem.

## Code Style

- Python: follows the project's existing style (no strict linter config — just keep it readable)
- TypeScript: strict mode enabled, no `any`

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce

For **security vulnerabilities**, see [SECURITY.md](SECURITY.md).
