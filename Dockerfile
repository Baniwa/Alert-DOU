FROM python:3.12-slim

# Instala dependências do sistema necessárias para compilação (psycopg2) e ferramentas base
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root
RUN useradd -m appuser

WORKDIR /app

# Instala dependências e playwright browsers (usando --no-cache-dir)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir . && \
    playwright install chromium --with-deps

# Copia o código da aplicação
COPY --chown=appuser:appuser . /app
COPY --chown=appuser:appuser --chmod=755 entrypoint.sh /app/entrypoint.sh

# Transfere a permissão para o appuser
USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]

# O default cmd (API)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
