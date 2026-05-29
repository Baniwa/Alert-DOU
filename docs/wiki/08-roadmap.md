# 08 — Roadmap e Fases do Projeto

> Planejamento técnico por fases, com critérios de conclusão, dívida técnica identificada e visão de longo prazo.

---

## Visão de Longo Prazo

O Alert DOU tem como objetivo ser uma **plataforma de inteligência sobre dados públicos governamentais** — começando pelo DOU e potencialmente expandindo para outros diários (Diários Estaduais, DODF, DOU Municipal de grandes cidades).

A arquitetura é projetada para suportar essa expansão: novos scrapers são apenas novos adaptadores que implementam `IEditionScraper`.

---

## Status Atual por Fase

### ✅ Fase 1 — Scraper

**Objetivo:** Coletar edições do DOU automaticamente, contornando proteções do portal.

**Concluído:**
- Playwright + playwright-stealth
- Bypass de WAF Azion, CSRF Liferay, CSR
- Solução para jQuery UI Datepicker
- Parsing HTML com BeautifulSoup
- CLI: `python -m scraper.fetcher [data] [--debug]`

**Dívida técnica identificada:**
- Sem retry automático em falhas de rede
- Scraper síncrono (bloqueia thread principal)
- Sem suporte a edições extras (`-A`, `-B`)
- Sem testes unitários

---

### ✅ Fase 2 — Database

**Objetivo:** Persistir edições coletadas com garantia de idempotência.

**Concluído:**
- SQLAlchemy 2.0 + PostgreSQL 16
- Tabela `editions` com constraint de unicidade
- Context manager `get_session()` com auto-commit/rollback
- Insert idempotente via `ON CONFLICT DO NOTHING`
- Docker Compose com PostgreSQL + Redis

**Dívida técnica:**
- Sem Alembic configurado (migrações feitas via `create_all()`)
- Sem testes de integração

---

### ✅ Fase 3 — REST API

**Objetivo:** Expor dados coletados via API REST documentada.

**Concluído:**
- FastAPI com lifespan hook
- `GET /editions/` com filtro por `pub_date`
- `GET /editions/{id}` com 404 adequado
- Pydantic `EditionOut` com `from_attributes`
- Swagger UI em `/docs`

**Dívida técnica:**
- Sem paginação
- Sem cache (Redis inativo)
- Sem autenticação
- Sem rate limiting
- Sem testes de endpoint

---

### ✅ Fase 4 — AI Summaries (Gemini Flash)

**Objetivo:** Gerar resumos executivos de edições por seção usando IA.

**Concluído:**
- `GeminiClient` em `ai/client.py` usando `google-genai` SDK
- Modelo: `gemini-3.5-flash` (custo/performance otimizado)
- Detecção automática de seção pelo título da edição (`_detect_section`)
- Prompts especializados por seção em `ai/prompts/section{1,2,3}.txt`
- Endpoint `GET /editions/{id}/summary` com cache automático no banco
- Endpoint `GET /summaries/` para histórico de todos os resumos gerados
- Tabela `ai_summaries` com `UNIQUE (edition_id)` — sem reprocessamento desnecessário
- Re-scrape automático quando link do PDF expira

**Dívida técnica:**
- Sem testes unitários (mock do GeminiClient)
- Sem controle de tokens por requisição
- Sem versioning de prompts

---

### ⏳ Fase 5 — Name Tracker

**Objetivo:** Permitir que usuários cadastrem nomes/CPFs para monitoramento no DOU.

**Critérios de conclusão:**
- [ ] Indexação de artigos individuais (tabela `articles`)
- [ ] API: `POST /alerts/`, `GET /alerts/`, `DELETE /alerts/{id}`
- [ ] Match exato por string no corpo do artigo
- [ ] Match fuzzy (tolerância a variações de nome)
- [ ] Tabela `name_occurrences` registra cada match com referência ao artigo
- [ ] Notificação: webhook ou e-mail (escolha pendente)
- [ ] Testes: busca exata, busca fuzzy, zero falsos negativos em casos conhecidos

---

### ✅ Fase 6 — Docker Completo

**Objetivo:** Setup completo do ambiente com um único comando.

**Concluído:**
- `Dockerfile` multi-stage com `python:3.12-slim`, usuário não-root (`appuser`)
- `docker-compose.yml` com 4 serviços: `api`, `worker`, `db` (PostgreSQL 16.3), `redis` (7)
- Health checks nos serviços `db` e `redis`
- `entrypoint.sh`: executa `alembic upgrade head` antes de subir o Uvicorn
- `.dockerignore` excluindo `.venv`, `__pycache__`, `.env`
- `docker compose up --build` inicia tudo

**Dívida técnica:**
- Credenciais padrão hardcoded em `docker-compose.yml` (`alertdou:alertdou`) — sempre sobrescrever via `.env` em produção
- Sem `.env.example` no repositório para guiar novos contribuidores

---

### ✅ Fase 7 — Worker Automático (schedule)

**Objetivo:** Scraping executado automaticamente sem intervenção manual.

**Concluído:**
- `workers/scheduler.py` usando biblioteca `schedule`
- Executa `fetch_dou_today()` + `save_editions()` diariamente às 08:00
- Roda uma vez na inicialização do container para cobrir edições do dia atual
- Containerizado como serviço `worker` no `docker-compose.yml`

**Dívida técnica:**
- Scheduler simples (não usa Celery): crash do container = scraping perdido até restart
- Sem retry automático em falha do scraper
- Sem Flower (dashboard de tarefas)
- Considerar migrar para Celery Beat na Fase 9 se a confiabilidade se tornar crítica

---

### ✅ Fase 8 — Frontend (React + TypeScript)

**Objetivo:** Interface web para consulta de edições e resumos IA.

**Concluído:**
- React 19 + TypeScript + Tailwind CSS + Vite
- Clean Architecture + DDD no frontend (`domain/`, `application/`, `infrastructure/`, `presentation/`)
- Identidade visual baseada no **design system gov.br** (azul `#1351B4`, verde `#168821`)
- **HomePage**: navegação por dia útil, seletor de data, grid de seções, banner de publicação
- **EditionDetailPage**: layout two-column, metadados + PDF link + painel de resumo IA
- **SummariesPage**: histórico de todos os resumos gerados, agrupados por edição
- **SummaryPanel**: estados idle/loading/error/display, renderização de Markdown com `react-markdown`
- **AppLayout**: sidebar gov.br com ícone institucional (Landmark), top bar decorativa
- **EditionCard**: cards com cores por seção, hover animations
- TanStack Query: `staleTime: Infinity` para resumos (imutáveis após geração)
- Rate limit 503 tratado no frontend com mensagem específica sobre API key

**Dívida técnica:**
- Sem Error Boundary global (erro em componente pode derrubar a app)
- Sem testes de componentes (Vitest + Testing Library)
- Sem i18n (interface em PT-BR hardcoded)
- Páginas "Alertas" e "Documentação" marcadas como "Em breve"

---

### ⏳ Fase 9 — Deploy em Produção

**Objetivo:** Sistema disponível publicamente com garantias de disponibilidade.

**Critérios de conclusão:**
- [ ] API deployada (Railway ou AWS ECS)
- [ ] PostgreSQL gerenciado (Railway PostgreSQL ou AWS RDS)
- [ ] Redis gerenciado (Railway Redis ou AWS ElastiCache)
- [ ] Celery worker em execução contínua
- [ ] HTTPS com certificado válido
- [ ] Monitoramento: Sentry (erros), Grafana/Prometheus (métricas)
- [ ] CI/CD: GitHub Actions com deploy automático em merge para `main`
- [ ] Rate limiting na API (via nginx ou middleware FastAPI)

---

## Dívida Técnica Consolidada

| Item | Impacto | Status |
|------|---------|--------|
| ~~Alembic não configurado~~ | ~~Alto — risco em produção~~ | ✅ Resolvido (Fase 6) |
| ~~`create_tables()` no lifespan~~ | ~~Alto — conflito com Alembic~~ | ✅ Resolvido (Fase 6) |
| ~~Sem rate limiting~~ | ~~Médio — Denial-of-Wallet~~ | ✅ Resolvido (Fase 4) |
| ~~CORS headers com `*`~~ | ~~Baixo (segurança)~~ | ✅ Resolvido (Fase 4) |
| ~~Sem Docker completo~~ | ~~Alto — ambiente inconsistente~~ | ✅ Resolvido (Fase 6) |
| ~~Sem worker automático~~ | ~~Alto — scraping manual~~ | ✅ Resolvido (Fase 7) |
| Sem testes (unitários / integração) | Alto — regressões não detectadas | Fase 9 |
| Sem paginação na API | Médio — crescerá com o volume | Fase 9 |
| Scraper síncrono | Médio — bloqueia thread | Fase 9 |
| Sem retry no scraper | Médio — falha silenciosa | Fase 9 |
| Redis não utilizado para cache | Baixo — já provisionado | Fase 9 |
| Sem autenticação | Baixo (dados públicos) | Fase 8+ |
| Sem Error Boundary no frontend | Médio — UX degradada em erro | Fase 9 |
| Sem `.env.example` | Baixo — onboarding | Pendente |

---

## Épicos e Issues Sugeridos

Para rastreamento no GitHub Issues:

```
[Epic] Fase 4 — AI Summaries
  ├── issue: Configure Gemini API key in .env + Secrets
  ├── issue: Create ai_summaries table migration (Alembic)
  ├── issue: Implement GeminiClient adapter (IAIClient port)
  ├── issue: Implement SummarizeEditionUseCase
  ├── issue: Add GET /editions/{id}/summary endpoint
  └── issue: Write unit tests for summarize use case

[Epic] Infra — Alembic Setup (Dívida Técnica)
  ├── issue: Install and configure alembic
  ├── issue: Generate initial migration from current schema
  └── issue: Document migration workflow in wiki/06-database.md
```
