# syntax=docker/dockerfile:1.7

# --- stage 1: builder ---------------------------------------------------------
# Installs Tectonic + Python deps. Multi-stage keeps the runtime layer small.
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps Tectonic needs at runtime (libfontconfig + libssl + libharfbuzz)
# + curl to download the Tectonic release.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        fontconfig \
        libfontconfig1 \
        libfreetype6 \
        libgraphite2-3 \
        libharfbuzz0b \
        libicu72 \
        libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Pin Tectonic to a known-good version. Linux ships a static binary that
# bundles fontconfig support, so unlike Windows we don't need a fonts.conf.
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

# Runtime system deps only (no curl/build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        fontconfig \
        libfontconfig1 \
        libfreetype6 \
        libgraphite2-3 \
        libharfbuzz0b \
        libicu72 \
        libssl3 \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=builder /root/.local /root/.local

WORKDIR /app
COPY app/ ./app/

# Tectonic is on PATH; no FONTCONFIG_FILE needed on Linux (system fontconfig
# discovers /usr/share/fonts automatically).
ENV TECTONIC_BIN=tectonic

# Render injects $PORT. Default to 8000 for local `docker run`.
ENV PORT=8000
EXPOSE 8000

# Use a shell form so $PORT gets expanded at runtime.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
