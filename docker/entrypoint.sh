#!/bin/sh
# Fails fast when the mounted database directory is not writable, instead of
# letting SQLite report a confusing error on first request.
set -eu

NEGOTIA_DATABASE_PATH="${NEGOTIA_DATABASE_PATH:-/app/data/negotia.db}"
export NEGOTIA_DATABASE_PATH

if [ "$NEGOTIA_DATABASE_PATH" != ":memory:" ]; then
  directory="$(dirname "$NEGOTIA_DATABASE_PATH")"
  if ! mkdir -p "$directory" 2>/dev/null || [ ! -w "$directory" ]; then
    echo "entrypoint: database directory '$directory' is not available or not writable by uid $(id -u)." >&2
    echo "entrypoint: mount a volume or bind mount owned by that uid; see docs/deployment-docker.md." >&2
    exit 1
  fi
fi

exec "$@"
