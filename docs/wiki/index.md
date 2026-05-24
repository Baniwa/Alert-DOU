# Alert DOU — Wiki Técnica

> **Versão:** 0.1.0 · **Última atualização:** 2026-05-24  
> **Repositório:** https://github.com/Baniwa/Alert-DOU  
> **Autora:** Giulia Gabriela

---

## O que é o Alert DOU?

O **Alert DOU** é uma plataforma de monitoramento inteligente do *Diário Oficial da União* (DOU), o veículo oficial de publicação de atos normativos, nomeações e contratos do Governo Federal Brasileiro. O sistema automatiza a coleta, armazenamento, sumarização via Inteligência Artificial e o envio de alertas personalizados — eliminando a necessidade de leitura manual de um diário que supera 1.000 páginas por dia útil.

---

## Índice da Wiki

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [Proposta de Arquitetura](./01-architecture-proposal.md) | Clean Architecture · Hexagonal · DDD · Referências acadêmicas |
| 02 | [Modelo de Domínio](./02-domain-model.md) | Entidades, agregados, linguagem ubíqua (DDD) |
| 03 | [Componentes do Sistema](./03-components.md) | Módulos, responsabilidades, dependências |
| 04 | [Referência da API](./04-api-reference.md) | Endpoints REST, schemas, exemplos de resposta |
| 05 | [Engenharia do Scraper](./05-scraper-engineering.md) | WAF bypass, CSRF, CSR, Playwright stealth |
| 06 | [Banco de Dados](./06-database.md) | Schema, índices, estratégia de migrações |
| 07 | [Guia de Desenvolvimento](./07-development-guide.md) | Gitflow, PRs, testes, setup local |
| 08 | [Roadmap](./08-roadmap.md) | Fases, milestones, dívida técnica |

---

## Status Atual

```
Fase 1 — Scraper (Playwright + Stealth)  ✅ Completo
Fase 2 — Database (SQLAlchemy + PG)      ✅ Completo
Fase 3 — REST API (FastAPI)              ✅ Completo
Fase 4 — AI Summaries (Gemini Pro)      ⏳ Planejado
Fase 5 — Name Tracker                   ⏳ Planejado
Fase 6 — Docker (setup completo)        ⏳ Planejado
Fase 7 — Celery + Redis (worker)        ⏳ Planejado
Fase 8 — Frontend (React + Tailwind)    ⏳ Planejado
Fase 9 — Deploy (AWS / Railway)         ⏳ Planejado
```

---

## Princípios Não Negociáveis

1. **Auditabilidade** — todo ato de coleta e processamento deve ser rastreável.
2. **Testabilidade** — regras de negócio são testadas isoladamente da infraestrutura.
3. **Portabilidade** — adaptadores de infraestrutura (scraper, banco, AI) são substituíveis sem alteração do domínio.
4. **Governança de código** — Gitflow estrito, PRs descritivos, commits semânticos.
5. **Documentação como artefato de primeira classe** — esta wiki é atualizada a cada PR.
