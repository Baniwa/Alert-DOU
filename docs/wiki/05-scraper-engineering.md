# 05 — Engenharia do Scraper

> Este documento descreve os desafios técnicos encontrados na coleta de dados do portal `in.gov.br` e as soluções implementadas. Serve como referência de engenharia reversa e decisões de contorno.

---

## 1. Contexto: Por que o Scraping é Difícil?

O portal `in.gov.br` é operado pela **Imprensa Nacional** e usa uma pilha tecnológica que dificulta a automação:

| Camada | Tecnologia | Desafio |
|--------|-----------|---------|
| CMS | Liferay DXP | CSRF tokens de sessão (`p_auth`) por request |
| Proteção | WAF Azion | Fingerprinting de browser; bloqueia HTTP puro e headless naïve |
| Renderização | JavaScript (CSR) | Conteúdo não está no HTML inicial; requer execução de JS |
| Busca | jQuery UI Datepicker | `input.value = '...'` não funciona; requer API do datepicker |

---

## 2. Desafios e Soluções

### 2.1 WAF Azion: Bloqueio de HTTP Puro

**Problema:** Qualquer requisição HTTP direta (`requests`, `httpx`, `curl`) ao portal retorna `403 Forbidden`. O WAF detecta que não é um browser real por:
- Ausência de headers típicos (`sec-ch-ua`, `sec-fetch-*`)
- Fingerprint de TLS diferente de browsers modernos
- User-Agent sem contexto JS

**Solução:** Playwright com `playwright-stealth`.

```python
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    stealth_sync(page)  # Aplica ~20 patches de fingerprint
    page.goto("https://in.gov.br/consulta/-/buscar/dou")
```

O `playwright-stealth` corrige:
- `navigator.webdriver = true` → `false`
- `navigator.languages` ausente
- Fingerprint de Canvas e WebGL
- Propriedades do objeto `chrome`

### 2.2 CSRF Token Liferay (`p_auth`)

**Problema:** O Liferay gera tokens `p_auth` por sessão. Requests sem o token correto retornam `403`. O token é embutido no DOM após o carregamento da página.

**Solução:** Por usar um browser real via Playwright, a sessão com cookies e tokens é mantida automaticamente. O browser já inclui `p_auth` nos formulários porque a página foi renderizada normalmente.

### 2.3 Client-Side Rendering (CSR)

**Problema:** O HTML retornado pela primeira requisição é um shell vazio. O conteúdo das edições é carregado via chamadas AJAX disparadas pelo JavaScript da página.

**Solução:** Em vez de fazer scraping do HTML inicial, aguardamos a execução do JS via `page.wait_for_load_state("networkidle")` — isso garante que todas as chamadas AJAX foram concluídas.

### 2.4 jQuery UI Datepicker

**Problema:** O campo de data de busca usa jQuery UI Datepicker. Tentar setar o valor diretamente via `input.value = '...'` não funciona porque o componente jQuery não detecta a mudança:

```python
# ERRADO — não funciona
page.fill("#data-inicio", "24/05/2026")
```

**Solução:** Usar a API JavaScript do próprio datepicker:

```python
page.evaluate("""
    () => {
        var dt = new Date(2026, 4, 24);  // mês é 0-indexed
        $('#data-inicio').datepicker('setDate', dt);
    }
""")
```

### 2.5 Cross-Domain Navigation (`pesquisa.in.gov.br`)

**Problema:** Ao clicar em "Buscar", o formulário é submetido via `doSearch('advancedSearch')`, que faz um POST para `pesquisa.in.gov.br/imprensa/core/jornalList.action` — um domínio *diferente* do `in.gov.br`. Chamadas diretas a esse endpoint sem a sessão do `in.gov.br` são bloqueadas.

**Descoberta:** Engenharia reversa do JavaScript `getAdvancedSearchData()` no bundle do portal revelou que `doSearch` usa `sistema-busca=2` para submeter para o endpoint de pesquisa.

**Solução:** Deixar o browser navegar naturalmente:

```python
# Captura a URL de destino após o cross-domain POST
with page.expect_navigation():
    page.evaluate("doSearch('advancedSearch')")
html = page.content()
```

O browser segue o POST automaticamente, mantendo cookies e tokens de sessão entre domínios.

---

## 3. Fluxo Completo de Execução

```
1. Iniciar Chromium headless com stealth patches
2. Navegar para https://in.gov.br/consulta/-/buscar/dou
   ├─ WAF Azion: fingerprint de browser real → PASS
   └─ Liferay: session cookie + p_auth gerado
3. Aguardar networkidle (AJAX de render concluído)
4. Executar JS: $('#data-inicio').datepicker('setDate', date)
5. Executar JS: doSearch('advancedSearch')
   └─ POST para pesquisa.in.gov.br/jornalList.action
       └─ Browser segue cross-domain → nova página carregada
6. Aguardar networkidle na nova página
7. Capturar page.content() (HTML da tabela de resultados)
8. BeautifulSoup: localizar <table id="ResultadoConsulta">
9. Para cada <tr> na <tbody>:
   ├─ Extrair: título da seção (col 0)
   ├─ Extrair: número da edição (col 1)
   ├─ Extrair: data de publicação (col 2) — formato DD/MM/YYYY
   ├─ Extrair: número de páginas (col 3)
   └─ Extrair: URL do PDF via regex no onclick da col 4
10. Persistir via INSERT ... ON CONFLICT DO NOTHING
```

---

## 4. Modo Debug

Para diagnóstico, o fetcher suporta `--debug`:

```bash
python -m scraper.fetcher 2026-05-24 --debug
```

Artefatos gerados:

| Arquivo | Conteúdo |
|---------|----------|
| `debug_before.png` | Screenshot da página antes da busca |
| `debug_after.png` | Screenshot após navegação para pesquisa.in.gov.br |
| `debug_response.html` | HTML bruto capturado para análise |

---

## 5. Parsing HTML

O parser usa BeautifulSoup com `lxml` para localizar a tabela de resultados:

```python
def _parse_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", id="ResultadoConsulta")
    if not table:
        return []
    rows = table.find("tbody").find_all("tr")
    result = []
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue
        pdf_onclick = cols[4].find("a", onclick=True)
        pdf_match = re.search(r"redirecionaSelect\('([^']+)'", pdf_onclick.get("onclick", ""))
        result.append({
            "title": cols[0].get_text(strip=True),
            "edition": cols[1].get_text(strip=True),
            "date": cols[2].get_text(strip=True),
            "pages": cols[3].get_text(strip=True),
            "pdf_url": pdf_match.group(1) if pdf_match else None,
        })
    return result
```

---

## 6. Idempotência na Persistência

O insert usa a constraint única `(edition_number, pub_date, title)` para garantir que re-execuções não criem duplicatas:

```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

stmt = pg_insert(Edition).values(editions_data)
stmt = stmt.on_conflict_do_nothing(
    index_elements=["edition_number", "pub_date", "title"]
)
session.execute(stmt)
```

Isso torna o scraper **idempotente**: seguro para rodar múltiplas vezes no mesmo dia sem corromper dados.

---

## 7. Limitações Conhecidas

| Limitação | Impacto | Solução Planejada |
|-----------|---------|-------------------|
| Scraper síncrono (Playwright sync API) | Apenas um scraping por vez | Migrar para `async_playwright` na Fase 7 |
| Sem retry automático em falhas de rede | Pode perder edições em instabilidades do portal | Adicionar `tenacity` com backoff exponencial |
| Sem suporte a edições extras (`-A`, `-B`) | Edições extras não são coletadas | Adicionar lógica de detecção por sufixo |
| Scraping manual (não agendado) | Requer execução manual | Celery Beat na Fase 7 |
