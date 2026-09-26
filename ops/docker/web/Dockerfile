# Dockerfile for @vcard/web (Nginx static serving)

# --- Stage 1: Base (Shared Node.js + pnpm) ---
FROM node:24-bookworm-slim@sha256:e8e2e91b1378f83c5b2dd15f0247f34110e2fe895f6ca7719dbb780f929368eb AS base
LABEL org.opencontainers.image.source="https://github.com/SterbenXIII/Lubomyr_drip_vcard"
LABEL org.opencontainers.image.description="Build stage for Frontend"

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate && \
    apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Stage 2: Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @vcard/web --filter @vcard/shared --frozen-lockfile

# --- Stage 3: Builder ---
FROM deps AS builder
ARG DOMAIN_NAME
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV DOMAIN_NAME=${DOMAIN_NAME}
ENV PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY}

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY tsconfig.base.json tsconfig.json ./

RUN find . -name "*.tsbuildinfo" -delete

RUN pnpm --filter @vcard/shared build && \
    DOMAIN_NAME=${DOMAIN_NAME:-"localhost"} pnpm --filter @vcard/web build

# --- Stage 4: Web Runtime (Nginx) ---
FROM nginx:1.25.4-alpine@sha256:31bad00311cb5eeb8a6648beadcf67277a175da89989f14727420a80e2e76742 AS runtime
LABEL org.opencontainers.image.description="Frontend static serving via Nginx"

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

COPY ops/docker/nginx/default.conf /tmp/default.conf.template
COPY --from=builder --chown=nginx:nginx /app/apps/web/dist /usr/share/nginx/html

ENV DOMAIN_NAME=localhost
USER nginx
# Using unprivileged port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["sh", "-c", "envsubst '$$DOMAIN_NAME' < /tmp/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
