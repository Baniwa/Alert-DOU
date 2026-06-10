# 07 — Guia de Desenvolvimento

> Este guia define os processos obrigatórios de desenvolvimento: setup local, fluxo Gitflow, padrões de commit, criação de PRs e estratégia de testes.

---

## 1. Pré-requisitos

| Ferramenta | Versão Mínima | Verificação |
|------------|--------------|-------------|
| Python | 3.12+ | `python --version` |
| Docker Desktop | 4.x | `docker --version` |
| Git | 2.40+ | `git --version` |
| Node.js | 20+ (Fase 8) | `node --version` |

---

## 2. Setup do Ambiente Local

### 2.1 Clonar e Configurar

```bash
git clone https://github.com/Baniwa/Alert-DOU.git
cd Alert-DOU

# Criar ambiente virtual
python -m venv .venv

# Ativar (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Ativar (Linux/macOS)
source .venv/bin/activate

# Instalar dependências do projeto em modo editável
pip install -e .

# Instalar browser Chromium para o Playwright
playwright install chromium
```

### 2.2 Variáveis de Ambiente

```bash
cp .env.example .env
# Editar .env com as credenciais locais
```

Conteúdo mínimo de `.env`:

```env
POSTGRES_DB=alertdou
POSTGRES_USER=alertdou
POSTGRES_PASSWORD=sua_senha_local
DATABASE_URL=postgresql://alertdou:sua_senha_local@localhost:5432/alertdou
REDIS_URL=redis://localhost:6379/0
```

### 2.3 Subir Stack Completa com Docker

A stack inteira (API, Worker, PostgreSQL, Redis) é orquestrada pelo Docker Compose:

```bash
# Build e start de todos os serviços
docker compose up --build

# Em background
docker compose up --build -d

# Ver logs
docker compose logs -f api
docker compose logs -f worker
```

O `entrypoint.sh` garante que o Alembic rode as migrações (`alembic upgrade head`) **antes** de a API subir. Não é necessário rodar migrações manualmente.

**Serviços expostos:**

| Serviço | Porta | URL |
|---------|-------|-----|
| API FastAPI | 8000 | `http://localhost:8000/docs` |
| PostgreSQL | 5432 | `localhost:5432` |
| Redis | 6379 | `localhost:6379` |

**Verificar que a API está de pé:**

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### 2.4 Executar sem Docker (desenvolvimento local)

Para desenvolvimento com hot-reload, é possível rodar apenas o banco via Docker e a API localmente:

```bash
# Apenas infraestrutura
docker compose up -d db redis

# Rodar migrações
alembic upgrade head

# API com hot-reload
uvicorn api.main:app --reload

# Worker em outro terminal
python -m workers.scheduler

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173
```

---

## 3. Gitflow Obrigatório

Este projeto segue o **Gitflow** (Driessen, 2010) estritamente. Nenhum código deve ser commitado diretamente em `main` ou `develop`.

### 3.1 Estrutura de Branches

```
main                    ← código de produção (tags de versão)
└── develop             ← integração contínua de features
    ├── feature/*       ← novas funcionalidades
    ├── fix/*           ← correções de bug
    ├── refactor/*      ← refatorações sem mudança de comportamento
    ├── docs/*          ← apenas documentação
    └── chore/*         ← dependências, configuração, CI
```

### 3.2 Fluxo de Feature

```bash
# 1. Garantir que develop está atualizado
git checkout develop
git pull origin develop

# 2. Criar branch de feature
git checkout -b feature/ai-summarization

# 3. Desenvolver + commits incrementais
git add database/models.py
git commit -m "feat(database): add ai_summaries table migration"

# 4. Push da branch
git push -u origin feature/ai-summarization

# 5. Abrir Pull Request → develop (via GitHub)

# 6. Após merge aprovado, deletar branch local
git branch -d feature/ai-summarization
```

### 3.3 Nomenclatura de Branches

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Feature | `feature/<escopo-curto>` | `feature/name-tracker` |
| Fix | `fix/<descrição-do-bug>` | `fix/scraper-date-parse` |
| Refactor | `refactor/<alvo>` | `refactor/hexagonal-domain` |
| Docs | `docs/<tópico>` | `docs/api-reference` |
| Chore | `chore/<pacote-ou-config>` | `chore/upgrade-playwright` |

---

## 4. Padrão de Commits (Conventional Commits)

Este projeto segue a especificação **Conventional Commits** (https://www.conventionalcommits.org):

```
<tipo>(<escopo>): <descrição imperativa em minúsculas>

[corpo opcional — por quê, não o quê]

[rodapé opcional — breaking changes, issue refs]
```

### Tipos Permitidos

| Tipo | Quando usar |
|------|------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem mudar comportamento |
| `test` | Adicionar ou corrigir testes |
| `docs` | Apenas documentação |
| `chore` | Dependências, configuração, CI/CD |
| `perf` | Melhoria de performance |
| `ci` | Mudanças em GitHub Actions / pipelines |

### Exemplos

```bash
# Feature nova
git commit -m "feat(scraper): add retry logic with exponential backoff"

# Correção
git commit -m "fix(api): return 404 when edition not found instead of 500"

# Refatoração sem quebra
git commit -m "refactor(database): extract session context manager to utils"

# Testes
git commit -m "test(scraper): add unit tests for _parse_html with mock HTML"

# Documentação
git commit -m "docs(wiki): add scraper engineering reference"
```

**Regras:**
- Mensagem no **imperativo** ("add" não "added", "fix" não "fixed")
- Sem ponto final na primeira linha
- Primeira linha ≤ 72 caracteres
- **Nunca** incluir assinaturas automáticas de ferramentas (Co-authored-by de IA, etc.)

---

## 5. Pull Requests

### 5.1 Checklist Obrigatório antes de Abrir um PR

- [ ] Branch criada a partir de `develop` atualizado
- [ ] Código compila/executa sem erros
- [ ] Testes adicionados para o novo comportamento
- [ ] Todos os testes existentes passam
- [ ] Documentação da wiki atualizada (se aplicável)
- [ ] `CHANGELOG.md` atualizado (se feature significativa)

### 5.2 Template de PR

```markdown
## O que este PR faz?
<!-- Uma frase clara descrevendo a mudança -->

## Por que é necessário?
<!-- Contexto: qual problema resolve, qual fase do roadmap avança -->

## Como testar?
<!-- Passo a passo para verificar o comportamento -->
1. `python -m scraper.fetcher 2026-05-24`
2. `curl http://localhost:8000/editions/?pub_date=2026-05-24`
3. Verificar que retornou 3 seções

## Checklist
- [ ] Testes adicionados
- [ ] Sem credenciais hardcoded
- [ ] Wiki atualizada
```

### 5.3 Critérios de Review

| Critério | Obrigatório |
|----------|-------------|
| Lógica correta | ✅ |
| Testes cobrindo o novo comportamento | ✅ |
| Sem regressão em testes existentes | ✅ |
| Segredos fora do código (`.env`, não `settings.py`) | ✅ |
| Sem print/debug esquecido | ✅ |
| Documentação atualizada | ⬜ (depende da mudança) |

---

## 6. Estratégia de Testes

### 6.1 Pirâmide de Testes

```
        ┌───┐
        │E2E│      ← poucos, lentos, confiam em toda a stack
        └───┘
      ┌─────────┐
      │ Integr. │  ← médio volume, testam interação entre módulos
      └─────────┘
    ┌─────────────┐
    │   Unitário  │ ← muitos, rápidos, testam lógica isolada
    └─────────────┘
```

### 6.2 O que testar em cada camada

**Testes Unitários** (`tests/unit/`)
- Parsing HTML: `_parse_html()` com HTML de fixture (sem browser)
- Conversão de datas: DD/MM/YYYY → date object
- Validação de schemas Pydantic: campos obrigatórios, formatos
- Domain entities: invariantes (edition_number não vazio, page_count > 0)

**Testes de Integração** (`tests/integration/`)
- Persistência: inserir edição, verificar que aparece em query
- Conflito de constraint: segundo insert com mesmo `(edition_number, pub_date, title)` deve ser silencioso
- API endpoints contra banco real (PostgreSQL de teste)

**Testes E2E** (`tests/e2e/`)
- Fluxo completo: scraper → banco → API → resposta JSON
- Requer Docker com PostgreSQL

### 6.3 Fixtures e Dados de Teste

```python
# tests/fixtures/editions.py
SAMPLE_HTML = """
<table id="ResultadoConsulta">
  <tbody>
    <tr>
      <td>Diário Oficial da União - Seção 1</td>
      <td>87</td>
      <td>24/05/2026</td>
      <td>257</td>
      <td><a onclick="redirecionaSelect('https://...')">PDF</a></td>
    </tr>
  </tbody>
</table>
"""
```

### 6.4 Executar Testes

```bash
# Todos os testes
pytest

# Apenas unitários (sem banco)
pytest tests/unit/

# Com cobertura
pytest --cov=. --cov-report=html

# Relatório em htmlcov/index.html
```

### 6.5 Meta de Cobertura

| Módulo | Meta |
|--------|------|
| `domain/` (futuro) | 100% |
| `application/` (futuro) | 95%+ |
| `scraper/fetcher.py` | 80%+ |
| `api/routes.py` | 90%+ |
| `database/` | 85%+ |

---

## 7. Ferramentas de Qualidade de Código

```bash
# Linting e formatação
pip install ruff

# Checar estilo
ruff check .

# Corrigir automaticamente
ruff check --fix .

# Formatação (substitui black)
ruff format .

# Type checking (futuro)
pip install mypy
mypy . --strict
```

### Configuração no `pyproject.toml`

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```
