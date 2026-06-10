# 04 — Referência da API REST

> **Base URL (local):** `http://localhost:8000`  
> **Versão:** 0.1.0  
> **Formato:** JSON  
> **Autenticação:** Não requerida (MVP público)

---

## Endpoints

### `GET /editions/`

Lista todas as edições coletadas, com filtro opcional por data de publicação.

**Rate Limit:** 60 requisições por minuto por IP.

**Parâmetros de Query**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `pub_date` | `date` (YYYY-MM-DD) | Não | Filtra edições por data de publicação |
| `limit` | `int` (1–500) | Não | Máximo de resultados (padrão: 100) |
| `offset` | `int` (≥0) | Não | Paginação (padrão: 0) |

**Respostas**

| Código | Descrição |
|--------|-----------|
| `200 OK` | Lista de edições (pode ser vazia `[]`) |
| `422 Unprocessable Entity` | Formato de data inválido |

**Exemplo — Busca por data**

```http
GET /editions/?pub_date=2026-05-24
Accept: application/json
```

```json
[
  {
    "id": 1,
    "title": "Diário Oficial da União - Seção 1",
    "edition_number": "87",
    "pub_date": "2026-05-24",
    "page_count": 257,
    "pdf_url": "https://imprensa.in.gov.br/web/guest/materia/-/asset_publisher/Kujrw0TZC2Mb/content/id/...",
    "scraped_at": "2026-05-24T06:15:00.123456"
  },
  {
    "id": 2,
    "title": "Diário Oficial da União - Seção 2",
    "edition_number": "87",
    "pub_date": "2026-05-24",
    "page_count": 89,
    "pdf_url": "https://...",
    "scraped_at": "2026-05-24T06:15:01.456789"
  },
  {
    "id": 3,
    "title": "Diário Oficial da União - Seção 3",
    "edition_number": "87",
    "pub_date": "2026-05-24",
    "page_count": 412,
    "pdf_url": "https://...",
    "scraped_at": "2026-05-24T06:15:02.789012"
  }
]
```

---

### `GET /editions/{edition_id}`

Retorna o detalhe de uma edição específica pelo seu ID interno.

**Parâmetros de Path**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `edition_id` | `int` | ID da edição (gerado pelo banco) |

**Respostas**

| Código | Descrição |
|--------|-----------|
| `200 OK` | Objeto da edição |
| `404 Not Found` | ID não encontrado |
| `422 Unprocessable Entity` | ID não é inteiro |

**Exemplo**

```http
GET /editions/1
Accept: application/json
```

```json
{
  "id": 1,
  "title": "Diário Oficial da União - Seção 1",
  "edition_number": "87",
  "pub_date": "2026-05-24",
  "page_count": 257,
  "pdf_url": "https://...",
  "scraped_at": "2026-05-24T06:15:00.123456"
}
```

**Exemplo — Erro 404**

```json
{
  "detail": "Edition not found"
}
```

---

## Schema `EditionOut`

```python
class EditionOut(BaseModel):
    id: int
    title: str
    edition_number: str
    pub_date: date
    page_count: int | None
    pdf_url: str | None
    scraped_at: datetime

    model_config = {"from_attributes": True}
```

---

## Exemplos com cURL

```bash
# Listar todas as edições
curl http://localhost:8000/editions/

# Filtrar por data específica
curl "http://localhost:8000/editions/?pub_date=2026-05-24"

# Buscar edição por ID
curl http://localhost:8000/editions/1

# Formatar JSON com jq
curl -s http://localhost:8000/editions/ | jq '.[].title'
```

---

## Exemplos com Python (httpx)

```python
import httpx

BASE_URL = "http://localhost:8000"

# Buscar edições de hoje
with httpx.Client() as client:
    response = client.get(f"{BASE_URL}/editions/", params={"pub_date": "2026-05-24"})
    response.raise_for_status()
    editions = response.json()
    for edition in editions:
        print(f"[{edition['edition_number']}] {edition['title']} — {edition['page_count']} páginas")
```

---

---

### `GET /editions/{edition_id}/summary`

Retorna o resumo executivo de uma edição gerado pelo Gemini. Na primeira chamada, baixa o PDF, envia para a IA e persiste o resultado. Chamadas subsequentes retornam o resumo em cache do banco.

**Parâmetros de Path**

| Nome | Tipo | Descrição |
|------|------|-----------|
| `edition_id` | `int` | ID da edição |

**Rate Limit:** 30 requisições por minuto por IP.

**Respostas**

| Código | Descrição |
|--------|-----------|
| `200 OK` | Resumo gerado ou recuperado do cache |
| `404 Not Found` | Edição não existe |
| `422 Unprocessable Entity` | Edição não possui `pdf_url` |
| `429 Too Many Requests` | Rate limit excedido |
| `502 Bad Gateway` | Falha ao baixar PDF da Imprensa Nacional (tentativa de re-scrape automático também falhou) |
| `503 Service Unavailable` | `GEMINI_API_KEY` não configurada |
| `500 Internal Server Error` | Erro interno na sumarização com IA |

**Exemplo**

```http
GET /editions/42/summary
Accept: application/json
```

```json
{
  "id": 7,
  "edition_id": 42,
  "edition_number": "98",
  "edition_title": "Diário Oficial da União - Seção 1",
  "model": "gemini-3.5-flash",
  "summary": "## Resumo da Seção 1 — Atos Normativos\n\n**Decretos e Portarias...**",
  "pages_read": 8,
  "created_at": "2026-05-29T10:32:15.123456+00:00"
}
```

**Comportamento de re-scrape:** Se o link do PDF expirou (erro de download), o endpoint tenta automaticamente re-fazer o scraping da edição para obter um link atualizado antes de retornar o erro 502.

---

### `GET /summaries/`

Lista todos os resumos IA gerados, em ordem decrescente de data. Inclui metadados da edição associada.

**Rate Limit:** 60 requisições por minuto por IP.

**Parâmetros de Query**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `limit` | `int` (1–500) | Não | Máximo de resultados (padrão: 100) |
| `offset` | `int` (≥0) | Não | Paginação (padrão: 0) |

**Respostas**

| Código | Descrição |
|--------|-----------|
| `200 OK` | Lista de resumos (pode ser vazia `[]`) |

**Exemplo**

```http
GET /summaries/
Accept: application/json
```

```json
[
  {
    "id": 7,
    "edition_id": 42,
    "edition_number": "98",
    "edition_title": "Diário Oficial da União - Seção 1",
    "model": "gemini-3.5-flash",
    "summary": "## Resumo...",
    "pages_read": 8,
    "created_at": "2026-05-29T10:32:15.123456+00:00"
  }
]
```

---

### `GET /summaries/search`

Busca resumos IA por texto — nome, CPF, órgão ou qualquer trecho.  
Usado pelo **Name Tracker** para encontrar menções nos resumos gerados.

**Rate Limit:** 20 requisições por minuto por IP (proteção contra enumeração de nomes/CPFs).

**Parâmetros de Query**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `q` | `string` (2–100 chars) | Sim | Texto a buscar (nome, CPF, órgão) |
| `limit` | `int` (1–50) | Não | Máximo de resultados (padrão: 20) |

**Segurança**
- CPF no parâmetro `q` é detectado e redactado como `[CPF]` nos logs de auditoria antes de persistir.
- Busca usa `ILIKE` parametrizado — imune a SQL injection.

**Respostas**

| Código | Descrição |
|--------|-----------|
| `200 OK` | Lista de resumos onde o texto aparece |
| `422 Unprocessable Entity` | `q` ausente, menor que 2 ou maior que 100 chars |
| `429 Too Many Requests` | Rate limit excedido |

**Exemplo**

```http
GET /summaries/search?q=João+da+Silva&limit=10
Accept: application/json
```

---

### `GET /editions/dates`

Lista todas as datas que possuem edições no banco, em ordem decrescente. Usado pelo frontend para popular o seletor de datas disponíveis.

**Rate Limit:** 30 requisições por minuto por IP.

**Resposta**

```json
["2026-06-02", "2026-05-30", "2026-05-29"]
```

---

### `GET /health`

Health check para orquestradores (Docker, Kubernetes). Retorna `200 OK` se a API está de pé.

**Resposta**

```json
{ "status": "ok" }
```

---

## Schema `SummaryOut`

```python
class SummaryOut(BaseModel):
    id: int
    edition_id: int
    edition_number: str | None = None   # via relationship com Edition
    edition_title: str | None = None    # via relationship com Edition
    model: str
    summary: str
    pages_read: int
    created_at: datetime

    model_config = {"from_attributes": True}
```

---

## Security Headers

Todos os responses incluem os seguintes headers de segurança (middleware global):

| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

---

## Endpoints Planejados (Fases Futuras)

| Método | Caminho | Fase | Descrição |
|--------|---------|------|-----------|
| `POST` | `/auth/register` | 9 | Registro de usuário |
| `POST` | `/auth/token` | 9 | Login (JWT) |

---

## Limites e Observações

- **Paginação**: implementada via `limit`/`offset` em todos os endpoints de listagem.
- **Cache de resumos**: resumos IA são persistidos no banco (`ai_summaries`) — segunda chamada retorna instantaneamente sem custo de API Gemini.
- **Rate Limiting**: ativo em todos os endpoints via SlowAPI (por IP). Protege contra Denial-of-Wallet na API do Gemini.
- **SSRF Protection**: `pdf_url` de edições é validada contra allowlist de hosts antes de qualquer download (`www.in.gov.br`, `in.gov.br`, `pesquisa.in.gov.br`, `download.in.gov.br`).
- **Autenticação**: o MVP é público (dados públicos). JWT planejado para Fase 9.
- **CORS**: origens permitidas configuráveis via `CORS_ORIGINS` no `.env`.
