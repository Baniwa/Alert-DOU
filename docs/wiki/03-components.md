# 03 — Componentes do Sistema

> Documentação detalhada de cada módulo, suas responsabilidades, dependências e contratos públicos.

---

## Visão Geral dos Módulos

```
dou.ia/
├── scraper/          ← Coleta de dados (adaptador de entrada de dados)
├── database/         ← Persistência (adaptador de armazenamento)
├── api/              ← Interface HTTP (adaptador de saída para clientes)
└── [planejados]
    ├── ai/           ← Sumarização por IA
    ├── alerts/       ← Rastreamento de nomes
    ├── workers/      ← Agendamento com Celery
    └── frontend/     ← Interface React
```

---

## 1. Módulo `scraper/`

### Responsabilidade
Coletar edições do DOU do portal `pesquisa.in.gov.br`, retornando dados estruturados para persistência.

### Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `fetcher.py` | Lógica principal de scraping com Playwright |

### Contrato Público

```python
# Entrada
fetch_dou_today(since: date | None = None, debug: bool = False) -> list[dict]

# Saída esperada
[
  {
    "title": "Diário Oficial da União - Seção 1",
    "edition": "87",
    "date": "24/05/2026",     # formato DD/MM/YYYY
    "pages": "257",
    "pdf_url": "https://..."
  },
  ...
]
```

### Dependências Externas

| Dependência | Versão | Motivo |
|-------------|--------|--------|
| `playwright` | 1.59+ | Automação de browser (Chromium) |
| `playwright-stealth` | 2.0+ | Bypass de WAF Azion via fingerprint spoofing |
| `beautifulsoup4` | 4.14+ | Parsing de HTML após carregamento JS |

### Fluxo Interno

```
launch_chromium_stealth()
    └─► navigate("in.gov.br/consulta/-/buscar/dou")
            └─► js: $('#data-inicio').datepicker('setDate', dt)
                └─► js: doSearch('advancedSearch')
                        └─► POST pesquisa.in.gov.br/jornalList.action
                                └─► _parse_html(html)
                                        └─► save_editions(editions)
```

---

## 2. Módulo `database/`

### Responsabilidade
Gerenciar o esquema de banco de dados, sessões e operações de persistência para edições do DOU.

### Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `models.py` | Definição das entidades ORM (SQLAlchemy) |
| `session.py` | Factory de conexão e gerenciamento de transações |
| `__init__.py` | API pública do módulo |

### API Pública

```python
from database import Edition, Base, create_tables, get_session

# Uso em contexto de transação
with get_session() as session:
    editions = session.query(Edition).filter_by(pub_date=today).all()
```

### Modelo `Edition` (atual)

```sql
CREATE TABLE editions (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR NOT NULL,
    edition_number VARCHAR NOT NULL,
    pub_date      DATE NOT NULL,
    page_count    INTEGER,
    pdf_url       VARCHAR,
    scraped_at    TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_edition UNIQUE (edition_number, pub_date, title)
);

CREATE INDEX ix_editions_pub_date ON editions (pub_date);
```

### Pool de Conexões

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,       # conexões mantidas abertas
    max_overflow=10    # conexões extras permitidas sob carga
)
```

---

## 3. Módulo `api/`

### Responsabilidade
Expor os dados de edições do DOU via REST API documentada com OpenAPI/Swagger.

### Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `main.py` | Fábrica da aplicação FastAPI + lifespan |
| `routes.py` | Handlers dos endpoints HTTP |
| `schemas.py` | Modelos Pydantic de request/response |

### Endpoints Disponíveis

| Método | Caminho | Parâmetros | Descrição |
|--------|---------|------------|-----------|
| `GET` | `/editions/` | `?pub_date=YYYY-MM-DD` | Lista edições (todas ou por data) |
| `GET` | `/editions/{id}` | `id: int` | Detalhe de uma edição |

### Schema de Resposta `EditionOut`

```json
{
  "id": 1,
  "title": "Diário Oficial da União - Seção 1",
  "edition_number": "87",
  "pub_date": "2026-05-24",
  "page_count": 257,
  "pdf_url": "https://imprensa.in.gov.br/...",
  "scraped_at": "2026-05-24T06:15:00"
}
```

### Documentação Interativa

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

---

## 4. Módulo `ai/` *(Fase 4 — Planejado)*

### Responsabilidade
Gerar resumos executivos de edições e artigos do DOU via Google Gemini Pro.

### Interface Esperada (Port)

```python
class IAIClient(Protocol):
    async def summarize(
        self,
        text: str,
        section: Section,
        focus: list[str] | None = None
    ) -> str:
        ...
```

### Adaptador Planejado

```
ai/
├── gemini_client.py   # IAIClient → Google Gemini 1.5 Pro
└── prompts/
    ├── section1.txt   # Prompt para atos normativos
    ├── section2.txt   # Prompt para pessoal (nomeações)
    └── section3.txt   # Prompt para contratos
```

---

## 5. Módulo `workers/` *(Fase 7 — Planejado)*

### Responsabilidade
Agendamento automático de scraping e processamento assíncrono de tarefas (AI, alertas).

### Stack

| Componente | Tecnologia |
|------------|-----------|
| Task Queue | Celery 5.x |
| Broker | Redis 7 |
| Beat Scheduler | Celery Beat |

### Tarefas Planejadas

```python
@celery_app.task
def scheduled_scrape():
    """Executada às 06:00 BRT em dias úteis."""
    editions = fetch_dou_today()
    save_editions(editions)
    emit_event(EditionPublished(editions))

@celery_app.task
def summarize_edition(edition_id: int):
    """Enfileirada após EditionPublished."""
    ...

@celery_app.task
def check_name_alerts(article_id: int):
    """Enfileirada após cada artigo indexado."""
    ...
```

---

## 6. Infraestrutura de Apoio

### Docker Compose (atual)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: alertdou
      POSTGRES_USER: alertdou
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | String de conexão PostgreSQL (fail-fast se ausente) |
| `REDIS_URL` | ⬜ | URL do Redis (usado a partir da Fase 7) |
| `GEMINI_API_KEY` | ⬜ | Chave Google Gemini (Fase 4) |
