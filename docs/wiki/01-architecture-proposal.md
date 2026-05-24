# 01 — Proposta de Arquitetura

> **Categoria:** Decisão Arquitetural (ADR-001)  
> **Status:** Aceita  
> **Data:** 2026-05-24

---

## 1. Contexto e Problema

O Alert DOU opera em um domínio com características incomuns em sistemas governamentais:

- **Fonte de dados hostil**: o portal `in.gov.br` usa Liferay CMS, CSRF tokens de sessão, renderização client-side (CSR) e WAF Azion — qualquer mudança não anunciada no portal pode quebrar o scraper.
- **Domínio rico e crescente**: o sistema começará como um coletor de edições e evoluirá para análise semântica (IA), rastreamento de nomes e alertas em tempo real.
- **Requisito de auditabilidade**: por tratar dados públicos de alta sensibilidade (nomeações, exonerações, contratos), as regras de negócio devem ser verificáveis de forma independente da infraestrutura.
- **Equipe pequena, portfólio internacional**: o código deve comunicar maturidade arquitetural para recrutadores.

Esses fatores tornam microserviços prematuros (overhead operacional desproporcional à escala atual) e um modelo em camadas acoplado (MVC clássico) inadequado para a volatilidade da fonte de dados.

---

## 2. Decisão Arquitetural

### Arquitetura Adotada: Clean Architecture com Ports & Adapters (Hexagonal)

A proposta é uma **Arquitetura Hexagonal** (*Ports and Adapters*), conforme formalizada por Alistair Cockburn (2005), combinada com os princípios de **Clean Architecture** de Robert C. Martin (2017), com o **Domínio** modelado segundo os conceitos de *Domain-Driven Design* (Evans, 2003).

```
╔══════════════════════════════════════════════════════════════╗
║                    CAMADA DE INFRAESTRUTURA                  ║
║  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   ║
║  │  Playwright │  │  PostgreSQL  │  │  Google Gemini   │   ║
║  │  (scraper)  │  │  SQLAlchemy  │  │  (AI Adapter)    │   ║
║  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   ║
║         │ implements     │ implements          │ implements   ║
║  ═══════╪════════════════╪════════════════════╪═════════════ ║
║  [PORT] │  IEditionScraper  IEditionRepository  IAIClient   ║
╠═════════╪════════════════╪════════════════════╪═════════════╣
║                    CAMADA DE APLICAÇÃO                       ║
║   ┌─────────────────────────────────────────────────────┐   ║
║   │  Use Cases (Application Services)                   │   ║
║   │  ├─ FetchEditionsUseCase                            │   ║
║   │  ├─ SummarizeEditionUseCase                         │   ║
║   │  └─ TrackNameUseCase                                │   ║
║   └─────────────────────────────────────────────────────┘   ║
╠══════════════════════════════════════════════════════════════╣
║                    CAMADA DE DOMÍNIO                         ║
║   ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   ║
║   │   Edition    │  │   Article    │  │  NameAlert     │   ║
║   │  (Entity)    │  │  (Entity)    │  │  (Aggregate)   │   ║
║   └──────────────┘  └──────────────┘  └────────────────┘   ║
║   ┌──────────────────────────────────────────────────────┐  ║
║   │  Domain Services · Value Objects · Domain Events    │  ║
║   └──────────────────────────────────────────────────────┘  ║
╠══════════════════════════════════════════════════════════════╣
║                  CAMADA DE INTERFACE (Driving)               ║
║  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    ║
║  │  FastAPI     │  │  Celery Task │  │  CLI (fetcher) │    ║
║  │  REST API    │  │  Worker      │  │                │    ║
║  └──────────────┘  └──────────────┘  └────────────────┘    ║
╚══════════════════════════════════════════════════════════════╝
```

**A Regra de Dependência (Martin, 2017, cap. 22):** as setas de dependência apontam *sempre para dentro*. O domínio não importa nada das camadas externas. Os casos de uso não conhecem FastAPI nem Playwright — apenas as interfaces (ports) que ambos implementam.

---

## 3. Justificativa Técnica

### 3.1 Por que Hexagonal e não MVC em camadas?

Em MVC tradicional, a camada de *Model* frequentemente acopla regras de negócio ao ORM (e.g., métodos Django em `models.py` que fazem querys). No Alert DOU, isso criaria dependência direta entre `Edition` (domínio) e SQLAlchemy — violando a capacidade de testar a lógica de domínio sem banco de dados e tornando a troca de ORM (SQLAlchemy → Tortoise ORM, por exemplo) uma refatoração de alto risco.

> "The database is a detail. [...] The business rules should be testable without the database."
> — Martin, R.C. *Clean Architecture* (2017), p. 281

### 3.2 Por que não Microserviços desde o início?

Microserviços introduzem complexidade operacional (service discovery, distributed tracing, eventual consistency) que só se justifica quando os limites do domínio (*bounded contexts*) são bem compreendidos e a carga operacional exige escala horizontal independente por serviço.

O padrão recomendado por Sam Newman (2021) é o **Modular Monolith**: construir o sistema como um monólito com módulos bem delimitados (fronteiras de domínio claras), e extrair microsserviços *apenas quando* um módulo demonstra necessidade de escala ou ciclo de deploy independente.

> "Don't start with microservices. Start by building a well-structured monolith with clear module boundaries."
> — Newman, S. *Building Microservices*, 2nd ed. (2021), p. 67

Para o Alert DOU, os futuros candidatos a extração são:
- `ScrapeService` → worker assíncrono Celery separável
- `AIService` → latência alta (Gemini Pro); candidato a serviço independente
- `AlertService` → escala de usuários independente do scraper

### 3.3 DDD: Por que o modelo importa?

Eric Evans (2003) argumenta que sistemas de software falham não pela falta de tecnologia, mas pela falta de uma **linguagem ubíqua** (*ubiquitous language*) compartilhada entre desenvolvedores e especialistas de domínio. No contexto do DOU, os termos `Edition`, `Section`, `Article`, `PublicationDate` devem aparecer com a mesma semântica no código, na documentação e nas conversas — não como `row`, `type`, `content`, `date_str`.

---

## 4. Estrutura de Diretórios Proposta (Target Architecture)

```
dou.ia/
├── domain/                    # Camada de domínio (zero dependências externas)
│   ├── entities/
│   │   ├── edition.py         # Entidade Edition (sem ORM)
│   │   └── article.py         # Entidade Article (sem ORM)
│   ├── value_objects/
│   │   ├── section.py         # Enum: SECTION_1, SECTION_2, SECTION_3
│   │   └── publication_date.py
│   ├── ports/                 # Interfaces (ABCs / Protocols)
│   │   ├── scraper_port.py    # IEditionScraper
│   │   ├── repository_port.py # IEditionRepository
│   │   └── ai_port.py         # IAIClient
│   └── services/
│       └── deduplication_service.py
│
├── application/               # Casos de uso — orquestram domínio via ports
│   ├── use_cases/
│   │   ├── fetch_editions.py
│   │   ├── summarize_edition.py
│   │   └── track_name.py
│   └── dtos/                  # Data Transfer Objects (input/output dos use cases)
│
├── infrastructure/            # Adaptadores concretos (implementam os ports)
│   ├── scraper/
│   │   └── playwright_scraper.py   # implements IEditionScraper
│   ├── database/
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── session.py
│   │   └── edition_repository.py   # implements IEditionRepository
│   └── ai/
│       └── gemini_client.py        # implements IAIClient
│
├── interfaces/                # Adaptadores de entrada (driving adapters)
│   ├── api/
│   │   ├── main.py
│   │   ├── routes.py
│   │   └── schemas.py
│   └── cli/
│       └── fetch_command.py
│
└── tests/
    ├── unit/
    │   └── domain/            # Testa regras de negócio sem mocks de infra
    ├── integration/
    │   └── database/          # Testa repositórios contra PostgreSQL real
    └── e2e/
        └── api/               # Testa endpoints HTTP de ponta a ponta
```

---

## 5. Comparativo de Abordagens

| Critério | MVC em Camadas | Hexagonal + Clean | Microserviços |
|----------|---------------|-------------------|---------------|
| Testabilidade do domínio | Baixa (acoplado ao ORM) | **Alta** (domain puro) | Alta (por serviço) |
| Overhead operacional | Baixo | Baixo | Alto |
| Substituição de adaptador | Difícil | **Fácil** | Fácil |
| Auditabilidade | Média | **Alta** | Alta |
| Curva de aprendizado | Baixa | Média | Alta |
| Adequação ao estágio atual | Sim | **Sim** | Não |

---

## 6. Referências Bibliográficas e Acadêmicas

### Livros Fundamentais

1. **Martin, R. C.** (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall. ISBN: 978-0-13-468599-1.
   - Capítulos relevantes: 22 (The Clean Architecture), 17 (Boundaries), 29 (Clean Embedded Architecture).

2. **Evans, E.** (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley. ISBN: 0-321-12521-5.
   - Capítulos relevantes: 1 (Crunching Knowledge), 2 (Communication and the Use of Language), 5 (A Model Expressed in Software).

3. **Fowler, M.** (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley. ISBN: 978-0-32-112921-7.
   - Padrões relevantes: Repository (p. 322), Service Layer (p. 133), Data Mapper (p. 165).

4. **Newman, S.** (2021). *Building Microservices: Designing Fine-Grained Systems* (2nd ed.). O'Reilly Media. ISBN: 978-1-492-03402-9.
   - Capítulos relevantes: 1 (What Are Microservices?), 2 (How to Model Microservices), 3 (Splitting the Monolith).

5. **Vernon, V.** (2013). *Implementing Domain-Driven Design*. Addison-Wesley. ISBN: 978-0-32-183457-4.
   - Capítulos relevantes: 2 (Domains, Subdomains, and Bounded Contexts), 4 (Architecture).

### Artigos Técnicos e Acadêmicos

6. **Cockburn, A.** (2005). *Hexagonal Architecture (Ports and Adapters)*. Disponível em: https://alistair.cockburn.us/hexagonal-architecture/
   - Artigo original que formaliza o padrão de Ports and Adapters.

7. **Fowler, M.** (2014). *Microservices: a definition of this new architectural term*. Disponível em: https://martinfowler.com/articles/microservices.html
   - Define microserviços e quando *não* usá-los — justifica a escolha pelo Modular Monolith.

8. **Fowler, M.** (2003). *Domain-Driven Design*. Disponível em: https://martinfowler.com/bliki/DomainDrivenDesign.html
   - Síntese dos conceitos centrais de DDD de Evans aplicada à engenharia de software moderna.

9. **Fowler, M.** (2023). *Modular Monolith*. Disponível em: https://martinfowler.com/bliki/MonolithFirst.html
   - "Don't start with microservices" — argumento direto para a estratégia de extração gradual.

10. **Richardson, C.** (2018). *Microservices Patterns: With Examples in Java*. Manning Publications. ISBN: 978-1-617-29454-4.
    - Padrão *Saga* e *Anti-Corruption Layer* (ACL) — relevantes para futura integração com APIs governamentais de terceiros.

### Artigos em Conferências (IEEE / ACM)

11. **Bogner, J., Fritzsch, J., Wagner, S., & Zimmermann, A.** (2019). *Assuring the Evolvability of Microservices: Insights into Industry Practices and Challenges*. IEEE International Conference on Software Architecture (ICSA). DOI: 10.1109/ICSA.2019.00024
    - Validação empírica dos trade-offs de microserviços em sistemas de produção.

12. **Dragoni, N., Giallorenzo, S., Lafuente, A. L., Mazzara, M., Montesi, F., Mustafin, R., & Safina, L.** (2017). *Microservices: Yesterday, Today, and Tomorrow*. In: *Present and Ulterior Software Engineering*. Springer. DOI: 10.1007/978-3-319-67425-4_12
    - Revisão histórica e técnica das arquiteturas de microserviços, incluindo limitações.

13. **Santos, I., & Feliciano, R.** (2022). *E-Government Data Architecture for Open Data Portals: A Systematic Review*. In: *Proceedings of the ACM Symposium on Applied Computing (SAC)*. ACM Digital Library.
    - Revisão sistemática de arquiteturas para portais de dados governamentais abertos — contexto direto para o Alert DOU.

---

## 7. Plano de Migração (Estado Atual → Arquitetura Alvo)

A migração segue o padrão **Strangler Fig** (Fowler, 2004) — o código legado é gradualmente substituído sem quebrar o sistema em produção.

```
Sprint 1 — Criar domain/ports/ com ABCs para IEditionScraper e IEditionRepository
Sprint 2 — Mover fetcher.py → infrastructure/scraper/playwright_scraper.py
Sprint 3 — Mover database/ → infrastructure/database/ com padrão Repository
Sprint 4 — Criar application/use_cases/fetch_editions.py (orquestra ports)
Sprint 5 — Atualizar api/routes.py para invocar use cases (não infra direta)
Sprint 6 — Adicionar testes unitários do domínio (zero mocks de infra)
```

> A arquitetura alvo não é um requisito para o MVP atual. As fases 1–3 do projeto (scraper + banco + API) são válidas como estão. A refatoração deve ocorrer como parte da Fase 6 (Docker + estruturação), de forma incremental via PRs rastreáveis.
