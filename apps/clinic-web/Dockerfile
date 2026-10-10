FROM node:24.20.0-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CLINIC_ENABLE_SERVICE_PREVIEW=false
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/clinic-web/package.json ./apps/clinic-web/
RUN pnpm install --filter @vcard/clinic-web... --frozen-lockfile

COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY tsconfig.base.json ./
COPY apps/clinic-web/astro.config.mjs apps/clinic-web/tsconfig.json ./apps/clinic-web/
COPY apps/clinic-web/src ./apps/clinic-web/src
COPY apps/clinic-web/public ./apps/clinic-web/public
COPY apps/clinic-web/scripts/check-metadata.mjs apps/clinic-web/scripts/emit-seo-artifacts.mjs ./apps/clinic-web/scripts/
RUN pnpm --filter @vcard/shared build && \
    pnpm --filter @vcard/clinic-web build:normal && \
    pnpm --filter @vcard/clinic-web check:metadata

FROM nginx:1.25.4-alpine@sha256:31bad00311cb5eeb8a6648beadcf67277a175da89989f14727420a80e2e76742 AS runtime

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx
COPY --chown=nginx:nginx --chmod=644 apps/clinic-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/apps/clinic-web/dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1
