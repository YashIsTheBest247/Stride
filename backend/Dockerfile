# syntax=docker/dockerfile:1.7

# --- stage 1: builder ---------------------------------------------------------
# Installs Python deps + downloads the Tectonic musl-static binary.
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Only need curl + CA certs at build time. The musl Tectonic binary embeds
# its own fontconfig / harfbuzz / freetype / icu / ssl, so no system libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG TECTONIC_VERSION=0.16.9
RUN curl -fsSL \
        "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
        -o /tmp/tectonic.tar.gz \
    && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin \
    && chmod +x /usr/local/bin/tectonic \
    && rm /tmp/tectonic.tar.gz \
    && /usr/local/bin/tectonic --version

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- stage 2: runtime ---------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# Just CA certs for HTTPS calls (Gemini, Tectonic bundle downloads).
# The musl Tectonic binary needs no system libraries.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=builder /root/.local /root/.local

WORKDIR /app
COPY app/ ./app/

ENV TECTONIC_BIN=tectonic

# Render injects $PORT. Default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
