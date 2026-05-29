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

### ⏳ Fase 4 — AI Summaries (Gemini Pro)

**Objetivo:** Gerar resumos executivos de edições por seção usando IA.

**Critérios de conclusão:**
- [ ] Endpoint `GET /editions/{id}/summary` retorna resumo gerado
- [ ] Prompt especializado por seção (normativos, pessoal, contratos)
- [ ] Resumo armazenado na tabela `ai_summaries` (cache)
- [ ] Não chama Gemini se resumo já existe no banco
- [ ] Testes: mock do Gemini client, teste do use case

**Decisões técnicas pendentes:**
- Gemini 1.5 Pro vs Gemini 2.0 Flash (custo × qualidade)
- Summarização por edição completa ou por artigo individual
- Idioma do resumo: PT-BR (natural para o domínio)

**Estrutura esperada:**
```
infrastructure/
└── ai/
    ├── gemini_client.py
    └── prompts/
        ├── section1_summary.txt
        ├── section2_summary.txt
        └── section3_summary.txt

application/
└── use_cases/
    └── summarize_edition.py
```

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

### ⏳ Fase 6 — Docker Completo

**Objetivo:** Setup completo do ambiente com um único comando.

**Critérios de conclusão:**
- [ ] `Dockerfile` para a API
- [ ] `Dockerfile` para o scraper/worker
- [ ] `docker-compose.yml` inclui todos os serviços (api, worker, postgres, redis)
- [ ] `docker-compose up` inicia tudo sem configuração adicional
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] Health checks nos serviços

---

### ⏳ Fase 7 — Celery + Redis (Worker Automático)

**Objetivo:** Scraping e processamento executados automaticamente, sem intervenção manual.

**Critérios de conclusão:**
- [ ] Celery Beat agenda scraping diário às 06:00 BRT (dias úteis)
- [ ] Task `scheduled_scrape` coleta e persiste edições
- [ ] Task `summarize_edition` enfileirada após cada nova edição
- [ ] Task `check_name_alerts` enfileirada após indexação de artigos
- [ ] Monitoramento: Flower (dashboard Celery) em `/flower`
- [ ] Retry automático com backoff exponencial (tenacity)
- [ ] Testes: task enfileirada, task executada, idempotência garantida

---

### ⏳ Fase 8 — Frontend (React + Tailwind)

**Objetivo:** Interface web para consulta de edições, resumos IA e gerenciamento de alertas.

**Critérios de conclusão:**
- [ ] Dashboard: edições mais recentes com link para PDF
- [ ] Resumos IA exibidos por seção
- [ ] Tela de alertas: cadastrar/remover/visualizar ocorrências
- [ ] Dark mode
- [ ] Responsivo (mobile-first)
- [ ] Autenticação JWT (login, registro, logout)
- [ ] Deploy independente (Vercel ou Netlify)

**Stack:**
- React 18+ com TypeScript
- Tailwind CSS
- TanStack Query (react-query) para gerenciamento de estado de servidor
- Vite como bundler

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

| Item | Impacto | Fase para Resolver |
|------|---------|-------------------|
| Alembic não configurado | Alto — risco em produção | Fase 6 |
| Sem testes (unitários / integração) | Alto — regressões não detectadas | Fase 4 |
| Sem paginação na API | Médio — crescerá com o volume | Fase 4 |
| Scraper síncrono | Médio — bloqueia em execução | Fase 7 |
| Sem retry no scraper | Médio — falha silenciosa | Fase 7 |
| Redis não utilizado | Baixo — já provisionado | Fase 7 |
| Sem rate limiting | Baixo (MVP local) | Fase 9 |
| Sem autenticação | Baixo (dados públicos) | Fase 8 |

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
