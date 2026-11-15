# Docker deployment

Negotia ships as one container: a Next.js server that imports the domain layer from `src/` and
stores business data in a local SQLite file (`libsql`).

## What the image contains

- `Dockerfile` — multi-stage build (`deps` → `builder` → `runner`), Node 20 on Debian slim.
- `web/.next` production build, `web/node_modules`, root `node_modules` (native `libsql`), `src/`,
  `config/`, and `scripts/` (account creation).
- Runs as the unprivileged `node` user (uid 1000), not as root.
- `docker/entrypoint.sh` verifies the database directory is writable before starting the server.
- Health check: `GET /login` must return 2xx.

## Build and run

```bash
docker compose build
docker compose up -d
docker compose logs -f app
```

Or without Compose:

```bash
docker build -t negotia:latest .
docker run -d --name negotia -p 3000:3000 \
  -e NEGOTIA_ENVIRONMENT=production \
  -v negotia-data:/app/data negotia:latest
```

Then create the first account against the same volume:

```bash
docker compose run --rm account admin@example.com "Trade Admin" admin
```

The password prompt needs an interactive terminal. The account command writes into the same
`negotia-data` volume the app reads, and refuses to run when stdin/stdout are not a TTY. It runs
through the image entrypoint, so an unwritable volume fails with the same clear message as the app.

## Configuration

Copy `.env.example` to `.env` and adjust it; Compose reads that file automatically. Never commit
`.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEGOTIA_DATABASE_PATH` | `/app/data/negotia.db` | SQLite file location. Keep it inside the mounted volume. |
| `NEGOTIA_ENVIRONMENT` | `staging` (compose) | Environment badge: `production`, `staging`, `sandbox`. Anything else shows "not configured". |
| `NEGOTIA_PORT` | `3000` | Host port published by Compose. |
| `NEGOTIA_SEED_DEMO` | unset | Set to `1` only on a fresh, empty database to insert the two demo conversations. It never overwrites existing data. |
| `PORT` | `3000` | Port the server listens on inside the container. |

## Persistence and ownership

The container mounts `/app/data`. A Docker named volume inherits the image directory ownership, so
the default Compose setup works without extra steps.

For a bind mount, the host directory must be owned by uid 1000 (the `node` user):

```bash
mkdir -p /srv/negotia-data && sudo chown 1000:1000 /srv/negotia-data
docker run -v /srv/negotia-data:/app/data ...
```

If it is not writable the entrypoint exits immediately with an explicit message instead of failing
later on the first request.

SQLite with WAL is safe for the intended single-container deployment. Do not run multiple replicas
against the same file, and do not place it on a network filesystem.

## Backup

Stop writes or use SQLite's online backup, then copy the database and its `-wal`/`-shm` files:

```bash
docker compose exec app sh -c 'ls -l /app/data'
docker run --rm -v negotia-data:/data -v "$PWD:/backup" node:20-bookworm-slim \
  sh -c 'tar czf /backup/negotia-data.tgz -C /data .'
```

## HTTPS and cookies

Sessions use `HttpOnly`, `SameSite=Strict` cookies and add the `Secure` flag when
`NODE_ENV=production`. Terminate TLS at a reverse proxy that forwards the original `Host` and
`Origin` headers; write requests are rejected when `Origin` does not match the request URL. Set the
public hostname correctly or every write will fail with 403.

## Health and operations

- `docker compose ps` shows the health state (the check comes from the image's `HEALTHCHECK`).
- `docker compose` runs with `init: true` so the npm wrapper forwards `SIGTERM`; with plain
  `docker run`, add `--init`.
- Logs: `docker compose logs -f app`.
- Shut down cleanly: `docker compose down` (the volume is kept; `down -v` deletes data).
- The image contains no cron, worker, or email sender; those are not implemented features.

## Known limitations

- One container, one SQLite file; there is no horizontal scaling story yet.
- No built-in TLS, reverse proxy, or process supervisor; use the host's.
- Secrets are passed as environment variables; keep them out of the image and the repository.
- Building the image in this development container is disabled by project policy. The `docker` job
  in `.github/workflows/quality.yml` builds the image and checks that `/login` responds after start.
