# syntax=docker/dockerfile:1.7

# Negotia runs as a single Next.js server that imports the domain layer from
# ../src and stores business data in a local SQLite file. The runtime image
# therefore keeps the monorepo layout intact and mounts the database directory.

ARG NODE_VERSION=20.20.2

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY web/package.json web/package-lock.json ./web/
RUN npm ci --prefix web --ignore-scripts --no-audit --no-fund

FROM base AS builder
ENV NODE_ENV=production \
    NEGOTIA_DATABASE_PATH=/tmp/build.db
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY . .
RUN npm --prefix web run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEGOTIA_DATABASE_PATH=/app/data/negotia.db

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web/package.json web/next.config.mjs ./web/
COPY --from=builder /app/web/.next ./web/.next
COPY src ./src
COPY config ./config
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 0555 /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/data \
    && chown -R node:node /app/data

USER node
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "--prefix", "web", "run", "start"]
