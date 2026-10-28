FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CLINIC_ENABLE_SERVICE_PREVIEW=false
ARG CLINIC_SITE_MODE=staging
ARG CLINIC_CANONICAL_ORIGIN=
ARG CLINIC_ALLOW_PRODUCTION_BUILD=false
ENV CLINIC_SITE_MODE=${CLINIC_SITE_MODE}
ENV CLINIC_CANONICAL_ORIGIN=${CLINIC_CANONICAL_ORIGIN}
ENV CLINIC_ALLOW_PRODUCTION_BUILD=${CLINIC_ALLOW_PRODUCTION_BUILD}
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
    if [ "$CLINIC_SITE_MODE" = 'production' ]; then \
      test "$CLINIC_ALLOW_PRODUCTION_BUILD" = 'true' && \
      test "$CLINIC_CANONICAL_ORIGIN" = 'https://havenhub.com.ua' && \
      pnpm --filter @vcard/clinic-web build:production; \
    elif [ "$CLINIC_SITE_MODE" = 'staging' ]; then \
      pnpm --filter @vcard/clinic-web build:staging; \
    else \
      echo 'CLINIC_SITE_MODE must be staging or production' >&2; exit 1; \
    fi && \
    pnpm --filter @vcard/clinic-web check:metadata

FROM nginx:1.25.4-alpine@sha256:31bad00311cb5eeb8a6648beadcf67277a175da89989f14727420a80e2e76742 AS runtime

ARG VCS_REF=unknown
LABEL org.opencontainers.image.source="https://github.com/SterbenXIII/Nazar_drip_vcard" \
    org.opencontainers.image.revision="$VCS_REF"

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx
COPY --chown=nginx:nginx --chmod=644 apps/clinic-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/apps/clinic-web/dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1
