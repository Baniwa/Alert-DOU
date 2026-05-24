# 02 — Modelo de Domínio

> Este documento descreve o domínio do problema usando os conceitos de *Domain-Driven Design* (Evans, 2003). A linguagem ubíqua aqui definida deve ser usada em código, testes, PRs e conversas.

---

## 1. Linguagem Ubíqua (Ubiquitous Language)

| Termo (PT-BR) | Termo em Código | Definição |
|---------------|-----------------|-----------|
| Edição | `Edition` | Uma publicação diária do DOU, identificada pelo número de edição e data. Pode conter múltiplas seções. |
| Seção | `Section` | Subdivisão temática de uma edição: Seção 1 (atos normativos), Seção 2 (pessoal), Seção 3 (contratos). |
| Artigo / Ato | `Article` | Unidade mínima de publicação dentro de uma seção (um decreto, uma portaria, uma nomeação). |
| Data de Publicação | `PublicationDate` | Data oficial do DOU, sempre um dia útil. Pode diferir da data do scraper. |
| Resumo IA | `AISummary` | Síntese gerada por modelo de linguagem (Gemini Pro) para uma edição ou artigo. |
| Rastreamento de Nome | `NameAlert` | Configuração de alerta para um nome, CPF ou CNPJ a ser monitorado no DOU. |
| Ocorrência | `NameOccurrence` | Resultado de uma busca: um artigo em que o nome rastreado foi encontrado. |
| Usuário | `User` | Pessoa que configura alertas e recebe notificações. |

---

## 2. Entidades Principais

### 2.1 `Edition`

Representa uma edição completa do DOU publicada em um dia. É a agregação de seções disponíveis naquele dia.

```
Edition
├── id: int                        (PK gerada pelo banco)
├── edition_number: str            (ex: "87", "87-A" para extra)
├── pub_date: date                 (data oficial, não data de scraping)
├── title: str                     (ex: "Diário Oficial da União - Seção 1")
├── section: Section               (enum derivado do título)
├── page_count: int                (total de páginas da edição em PDF)
├── pdf_url: str                   (URL do PDF completo na Imprensa Nacional)
└── scraped_at: datetime           (timestamp de quando o sistema coletou)
```

**Invariantes do domínio:**
- Uma `Edition` é única por `(edition_number, pub_date, section)`.
- `pdf_url` é obrigatório — sem PDF não há edição válida.
- `page_count` deve ser inteiro positivo.

### 2.2 `Article` *(Fase 4 — Planejado)*

Representa um ato publicado individualmente dentro de uma edição.

```
Article
├── id: int
├── edition_id: int                (FK → Edition)
├── section: Section
├── organ: str                     (ex: "Ministério da Fazenda")
├── title: str                     (título do ato)
├── body: str                      (texto completo)
├── page_number: int
└── article_url: str               (URL individual no portal)
```

### 2.3 `NameAlert` *(Fase 5 — Planejado)*

Agregado que representa a intenção de monitoramento de um usuário.

```
NameAlert
├── id: int
├── user_id: int                   (FK → User)
├── query: str                     (nome, CPF, CNPJ ou frase)
├── section_filter: Section | None (None = busca em todas as seções)
├── match_type: MatchType          (exact | fuzzy)
├── active: bool
└── created_at: datetime
```

---

## 3. Objetos de Valor (Value Objects)

### 3.1 `Section`

```python
from enum import Enum

class Section(str, Enum):
    SECTION_1 = "secao1"  # Atos normativos, decretos, portarias
    SECTION_2 = "secao2"  # Pessoal: nomeações, exonerações, aposentadorias
    SECTION_3 = "secao3"  # Contratos, licitações, editais
    EXTRA     = "extra"   # Edições extras (sufixo "-A", "-B")
```

**Nota semântica**: a Seção 2 é a mais relevante para o *Name Tracker* — é onde aparecem nomeações e exonerações de servidores públicos.

### 3.2 `PublicationDate`

Um Value Object que encapsula as regras de data do DOU:
- O DOU só é publicado em dias úteis (segunda a sexta, exceto feriados nacionais).
- A publicação ocorre entre 00h e 08h (horário de Brasília).
- Edições extras podem ser publicadas a qualquer hora.

---

## 4. Diagrama de Relacionamento (Entidade-Relação)

```
┌─────────────────┐         ┌─────────────────┐
│     Edition     │◄────────│    Article      │
│─────────────────│  1    N │─────────────────│
│ id              │         │ id              │
│ edition_number  │         │ edition_id (FK) │
│ pub_date        │         │ organ           │
│ title           │         │ title           │
│ section         │         │ body            │
│ page_count      │         │ page_number     │
│ pdf_url         │         │ article_url     │
│ scraped_at      │         └────────┬────────┘
└─────────────────┘                  │
                                     │ N
                              ┌──────┴──────────┐
                              │  NameOccurrence │
                              │─────────────────│
                              │ id              │
                              │ article_id (FK) │
                              │ alert_id (FK)   │
                              │ matched_at      │
                              └──────┬──────────┘
                                     │ N
                              ┌──────┴──────────┐
                              │   NameAlert     │
                              │─────────────────│
                              │ id              │
                              │ user_id (FK)    │
                              │ query           │
                              │ match_type      │
                              │ active          │
                              └──────┬──────────┘
                                     │ N
                              ┌──────┴──────────┐
                              │     User        │
                              │─────────────────│
                              │ id              │
                              │ email           │
                              │ created_at      │
                              └─────────────────┘
```

---

## 5. Contextos Delimitados (Bounded Contexts)

Seguindo Evans (2003, cap. 14), o sistema é dividido em contextos com fronteiras explícitas:

| Contexto | Responsabilidade | Módulo Atual |
|----------|-----------------|-------------|
| **Publication Context** | Coleta e armazenamento de edições | `scraper/` + `database/` |
| **Query Context** | Consulta e exposição de dados | `api/` |
| **AI Context** | Sumarização inteligente *(Fase 4)* | `ai/` (planejado) |
| **Alert Context** | Rastreamento de nomes *(Fase 5)* | `alerts/` (planejado) |
| **User Context** | Autenticação e preferências *(Fase 8)* | `users/` (planejado) |

**Anti-Corruption Layer (ACL):** o `scraper` representa o ACL entre o sistema externo (`in.gov.br`) e o domínio interno. Qualquer mudança no portal (estrutura HTML, endpoints) é absorvida aqui, sem propagar para o domínio.

---

## 6. Eventos de Domínio *(Planejados)*

Eventos são o mecanismo de comunicação assíncrona entre contextos delimitados (Vernon, 2013, cap. 8).

| Evento | Produtor | Consumidor |
|--------|----------|------------|
| `EditionPublished` | Publication Context | AI Context, Alert Context |
| `ArticleIndexed` | Publication Context | Alert Context |
| `SummaryGenerated` | AI Context | Query Context |
| `NameMatchFound` | Alert Context | Notification Service |

Esses eventos serão publicados via **Celery + Redis** (Fase 7) como tarefas assíncronas.
