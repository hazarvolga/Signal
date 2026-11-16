# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.22.0
ARG PNPM_VERSION=11.17.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV CI=true
ENV HUSKY=0
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate
WORKDIR /app

FROM base AS build
RUN apk add --no-cache python3 make g++ openssl
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --no-frozen-lockfile --ignore-scripts
COPY prisma ./prisma
RUN pnpm exec prisma generate
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY server.ts ./
RUN pnpm run build

FROM base AS production-dependencies
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --prod --no-frozen-lockfile --ignore-scripts \
  && pnpm exec prisma generate \
  && pnpm store prune

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=512"

# pg_dump/pg_restore must match the PostgreSQL server major (postgres:16-alpine).
RUN apk add --no-cache aws-cli curl dumb-init openssl postgresql16-client \
  && addgroup -S -g 10001 signal \
  && adduser -S -D -H -u 10001 -G signal signal \
  && mkdir -p /backups \
  && chown signal:signal /backups

WORKDIR /app

COPY --from=production-dependencies --chown=signal:signal /app/node_modules ./node_modules
COPY --from=build --chown=signal:signal /app/dist ./dist
COPY --from=build --chown=signal:signal /app/dist-server ./dist-server
COPY --from=build --chown=signal:signal /app/prisma ./prisma
COPY --from=build --chown=signal:signal /app/package.json ./package.json
COPY --from=build --chown=signal:signal /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --chown=signal:signal docker-entrypoint.sh scripts/backup.sh scripts/restore-test.sh ./
COPY --chown=signal:signal scripts/bootstrap-admin.mjs ./scripts/bootstrap-admin.mjs

RUN chmod 0555 /app/docker-entrypoint.sh /app/backup.sh /app/restore-test.sh /app/scripts/bootstrap-admin.mjs

USER signal
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent --show-error "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
