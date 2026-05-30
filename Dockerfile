FROM python:3.12-slim

# Dependências de sistema para compilação Python (psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root e diretório dedicado para os binários do Playwright
RUN useradd -m appuser && mkdir /ms-playwright && chown appuser:appuser /ms-playwright

WORKDIR /app

# Instala dependências Python como root (precisa de acesso a compilação)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

# Instala as libs de sistema do Playwright (apt, requer root)
RUN playwright install-deps chromium

# A partir daqui tudo roda como appuser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
USER appuser

# Baixa o binário do Chromium no diretório controlado pelo appuser
RUN playwright install chromium

# Copia o código com ownership correto
COPY --chown=appuser:appuser . /app
COPY --chown=appuser:appuser --chmod=755 entrypoint.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
