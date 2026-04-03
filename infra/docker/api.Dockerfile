# ==============================================================================
# AYNIPOINT - DOCKERFILE API CORE (PYTHON 3.13)
# ==============================================================================
FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/code/packages

WORKDIR /code

# Instalamos dependencias C para criptografía
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# En un monorepo Python moderno, instalamos UV o Poetry a nivel raíz
COPY pyproject.toml .
# Si usas requirements.txt tradicional a nivel raíz, descomenta la siguiente línea:
# COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install fastapi uvicorn pydantic psycopg2-binary passlib bcrypt

RUN useradd -m -u 1000 appuser
# El código se monta por volumen en desarrollo
RUN chown -R appuser:appuser /code
USER appuser

EXPOSE 8000