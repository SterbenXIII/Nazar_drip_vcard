# Dockerfile for @vcard/api (Node.js runtime)

# --- Stage 1: Base (Clean Node.js + System Updates) ---
FROM node:24-bookworm-slim@sha256:e8e2e91b1378f83c5b2dd15f0247f34110e2fe895f6ca7719dbb780f929368eb AS base
LABEL org.opencontainers.image.source="https://github.com/SterbenXIII/Lubomyr_drip_vcard"
LABEL org.opencontainers.image.description="API Runtime for vcard monorepo"

WORKDIR /app

# Upgrade system packages for security and install curl for healthcheck
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# --- Stage 2: Build Base (Adding pnpm for build steps) ---
FROM base AS build-base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate

# --- Stage 3: Dependencies (Build-time system tools + Node modules) ---
FROM build-base AS deps
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @vcard/api --filter @vcard/shared --frozen-lockfile

# --- Stage 4: Builder (Compilation) ---
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.base.json tsconfig.json ./

RUN find . -name "*.tsbuildinfo" -delete

RUN pnpm --filter @vcard/shared build && \
    NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @vcard/api build

# --- Stage 5: Production Dependencies ---
FROM build-base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @vcard/api --prod --frozen-lockfile

# --- Stage 6: API Runtime (Clean and Minimal) ---
FROM base AS runtime
LABEL org.opencontainers.image.description="Backend API runtime"

# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 && rm -rf /var/lib/apt/lists/*

# Remove npm and corepack to reduce attack surface (transitive vulnerabilities like minimatch/tar)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

ENV NODE_ENV=production

# Copy production dependencies and build artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/allowed_chats.json ./allowed_chats.json

RUN mkdir -p data && chown node:node data
USER node
EXPOSE 5678

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=5s \
    CMD curl -f http://localhost:5678/api/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
