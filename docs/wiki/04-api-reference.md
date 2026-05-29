# 04 — Referência da API REST

> **Base URL (local):** `http://localhost:8000`  
> **Versão:** 0.1.0  
> **Formato:** JSON  
> **Autenticação:** Não requerida (MVP público)

---

## Endpoints

### `GET /editions/`

Lista todas as edições coletadas, com filtro opcional por data de publicação.

**Parâmetros de Query**

| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `pub_date` | `date` (YYYY-MM-DD) | Não | Filtra edições por data de publicação |

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

## Endpoints Planejados (Fases Futuras)

| Método | Caminho | Fase | Descrição |
|--------|---------|------|-----------|
| `GET` | `/editions/{id}/summary` | 4 | Resumo IA da edição |
| `GET` | `/editions/{id}/articles` | 4 | Artigos indexados |
| `POST` | `/alerts/` | 5 | Criar alerta de nome |
| `GET` | `/alerts/` | 5 | Listar alertas do usuário |
| `DELETE` | `/alerts/{id}` | 5 | Remover alerta |
| `POST` | `/auth/register` | 8 | Registro de usuário |
| `POST` | `/auth/token` | 8 | Login (JWT) |

---

## Limites e Observações

- **Paginação**: não implementada no MVP. Todas as edições são retornadas de uma vez. Será necessária na Fase 3+ quando o volume de dados crescer.
- **Cache**: Redis está provisionado mas não utilizado na API. Cache de 5 minutos por `pub_date` será adicionado na Fase 7.
- **Autenticação**: o MVP é público (sem autenticação). JWT será adicionado na Fase 8 junto com o sistema de alertas pessoais.
- **Rate Limiting**: não implementado. Será necessário antes do deploy público (Fase 9).
