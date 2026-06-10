# 06 — Banco de Dados

> Documentação do esquema PostgreSQL, estratégia de índices, gerenciamento de migrações e decisões de modelagem.

---

## 1. Tecnologias

| Componente | Tecnologia | Versão |
|------------|-----------|--------|
| SGBD | PostgreSQL | 16 Alpine (Docker) |
| ORM | SQLAlchemy | 2.0+ |
| Driver | psycopg2-binary | 2.9+ |
| Migrações | Alembic | 1.18+ |

---

## 2. Esquema Atual

### Tabela `editions`

```sql
CREATE TABLE editions (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR NOT NULL,
    edition_number VARCHAR NOT NULL,
    pub_date       DATE NOT NULL,
    page_count     INTEGER,
    pdf_url        VARCHAR,
    scraped_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_edition_identity
        UNIQUE (edition_number, pub_date, title)
);
```

**Índices:**

```sql
-- Criado automaticamente pela constraint UNIQUE
INDEX uq_edition_identity ON editions (edition_number, pub_date, title);

-- Índice explícito para queries por data (caso de uso principal da API)
CREATE INDEX ix_editions_pub_date ON editions (pub_date DESC);
```

### Mapeamento ORM (SQLAlchemy 2.0)

```python
from sqlalchemy import Column, Integer, String, Date, DateTime
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass

class Edition(Base):
    __tablename__ = "editions"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    title          = Column(String, nullable=False)
    edition_number = Column(String, nullable=False)
    pub_date       = Column(Date, nullable=False, index=True)
    page_count     = Column(Integer)
    pdf_url        = Column(String)
    scraped_at     = Column(DateTime(timezone=True), server_default=func.now())
```

---

## 3. Esquema Planejado (Fases 4–5)

### Tabela `articles` *(Fase 4)*

```sql
CREATE TABLE articles (
    id          SERIAL PRIMARY KEY,
    edition_id  INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    organ       VARCHAR,
    title       VARCHAR NOT NULL,
    body        TEXT NOT NULL,
    section     VARCHAR(10) NOT NULL,  -- 'secao1' | 'secao2' | 'secao3'
    page_number INTEGER,
    article_url VARCHAR UNIQUE,
    indexed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_articles_edition_id ON articles (edition_id);
CREATE INDEX ix_articles_section    ON articles (section);
```

### Tabela `ai_summaries` *(Implementada na Fase 4)*

```sql
CREATE TABLE ai_summaries (
    id         SERIAL PRIMARY KEY,
    edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    model      VARCHAR(60) NOT NULL,     -- ex: 'gemini-3.5-flash'
    summary    TEXT NOT NULL,
    pages_read INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_ai_summary_edition UNIQUE (edition_id)
);
```

**Decisões de modelagem:**
- `UNIQUE (edition_id)` — uma edição tem no máximo um resumo. Gerar dois resumos para a mesma edição não agrega valor e desperdiça cota da API.
- `ON DELETE CASCADE` — ao deletar uma edição, o resumo é removido automaticamente.
- `pages_read` — quantas páginas do PDF foram processadas (limitado a 8 por padrão no extrator).
- `model` — registra qual versão do Gemini foi usada; útil para auditoria e comparação futura de qualidade.

**Mapeamento ORM atual:**

```python
class AISummary(Base):
    __tablename__ = "ai_summaries"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    edition_id: Mapped[int]      = mapped_column(ForeignKey("editions.id", ondelete="CASCADE"), nullable=False, unique=True)
    edition:    Mapped["Edition"] = relationship("Edition", lazy="joined")  # eager join
    model:      Mapped[str]      = mapped_column(String(60), nullable=False)
    summary:    Mapped[str]      = mapped_column(Text, nullable=False)
    pages_read: Mapped[int]      = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def edition_number(self) -> str | None:
        return self.edition.edition_number if self.edition else None

    @property
    def edition_title(self) -> str | None:
        return self.edition.title if self.edition else None
```

> **Por que `lazy="joined"` e não `lazy="select"`?**  
> O endpoint `GET /summaries/` retorna uma lista e precisa dos campos `edition_number` e `edition_title` de cada item. Com `lazy="select"` isso geraria N queries adicionais (problema N+1). Com `lazy="joined"`, o SQLAlchemy emite um único `SELECT ... JOIN` resolvendo tudo em uma só viagem ao banco.

### Tabelas de Alertas *(Fase 5)*

```sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR UNIQUE NOT NULL,
    password   VARCHAR NOT NULL,       -- bcrypt hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE name_alerts (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query          VARCHAR NOT NULL,
    section_filter VARCHAR(10),        -- NULL = todas as seções
    match_type     VARCHAR(10) NOT NULL DEFAULT 'exact',  -- 'exact' | 'fuzzy'
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE name_occurrences (
    id         SERIAL PRIMARY KEY,
    alert_id   INTEGER NOT NULL REFERENCES name_alerts(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id),
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_occurrence UNIQUE (alert_id, article_id)
);
```

---

## 4. Gerenciamento de Sessões

### Padrão Context Manager

O módulo `database/session.py` expõe `get_session()` como context manager. Isso garante:
- Auto-commit em caso de sucesso
- Auto-rollback em caso de exceção
- Fechamento garantido da sessão (sem connection leak)

```python
@contextmanager
def get_session() -> Generator[Session, None, None]:
    session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
```

**Anti-padrão evitado:** usar a sessão como variável global ou injetar via Depends (FastAPI) sem garantia de fechamento.

---

## 5. Estratégia de Migrações com Alembic

### Configuração Inicial

```bash
alembic init alembic
```

Após a init, editar `alembic/env.py` para usar o `Base` do projeto:

```python
from database.models import Base
target_metadata = Base.metadata
```

### Fluxo de Trabalho

```bash
# Gerar migração automática após mudança nos models
alembic revision --autogenerate -m "add articles table"

# Inspecionar o arquivo gerado em alembic/versions/
# Aplicar migração
alembic upgrade head

# Reverter última migração
alembic downgrade -1
```

### Regras de Migrações

1. **Nunca** usar `create_tables()` (que faz `Base.metadata.create_all()`) em produção. Esta função é apenas para desenvolvimento inicial.
2. **Sempre** inspecionar o arquivo de migração gerado pelo Alembic antes de aplicar — autogenerate comete erros com tipos customizados.
3. **Nunca** modificar migrações já aplicadas ao banco de produção — criar uma nova migração de correção.
4. Cada PR que altera modelos **deve** incluir o arquivo de migração correspondente.

---

## 6. Pool de Conexões e Performance

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,        # Base: 5 conexões mantidas vivas
    max_overflow=10,    # Pico: até 15 conexões simultâneas
    pool_pre_ping=True, # Verifica conexões antes de usar (evita "stale connection")
    echo=False          # True apenas em desenvolvimento para debug SQL
)
```

**Observação:** Em produção com múltiplos workers Uvicorn (via `--workers N`), o pool de conexões é *por processo*. Para N=4 workers, o banco precisará suportar até 60 conexões simultâneas (4 × 15). Considerar `PgBouncer` como pool externo na Fase 9.

---

## 7. Backup e Retenção

*(Planejado para Fase 9)*

| Tipo | Frequência | Retenção |
|------|-----------|----------|
| Full dump (`pg_dump`) | Diário | 30 dias |
| WAL archiving | Contínuo | 7 dias |

O DOU é público e os dados são recuperáveis via re-scraping, mas backups garantem auditabilidade histórica e performance (sem re-scraping de anos anteriores).
