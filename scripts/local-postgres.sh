#!/usr/bin/env bash
# Boot a sandbox-owned Postgres for any borso app that wants a real
# Postgres (Drizzle / postgres-js) without Docker.
#
# Why this exists: testcontainers needs a Docker daemon, which the
# claude.ai/code sandbox doesn't ship. This script uses the system
# `/usr/lib/postgresql/16/bin/initdb` + `pg_ctl` to spin up a private
# cluster under `/tmp/borso-pg-<app>` on a per-app port, with trust auth
# and the `<app>_test` database pre-created.
#
# Reusability contract (for the next app):
#   1. Add a `pretest` script that calls `scripts/local-postgres.sh start
#      <app-slug>` and prints `DATABASE_URL`.
#   2. The vitest `globalSetup` reads `DATABASE_URL` from the env — if
#      set, it skips testcontainers and uses the existing Postgres.
#   3. CI on GitHub Actions keeps using a `services: postgres:` block
#      that also exposes `DATABASE_URL`; the globalSetup uses the same
#      branch.
#
# Subcommands:
#   start <app-slug>     init + start cluster, create `<app>_test` db,
#                        print DATABASE_URL to stdout. Idempotent.
#   stop  <app-slug>     stop the cluster (cluster files kept).
#   wipe  <app-slug>     stop + rm -rf the cluster data dir.
#   url   <app-slug>     just print the DATABASE_URL (cluster must run).

set -euo pipefail

PG_VERSION="${PG_VERSION:-16}"
PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"
PG_USER_OS="postgres"
PG_USER_DB="lastloop"   # Same role for every app; the schema is the app's database.

usage() {
  cat >&2 <<EOF
usage: $0 <start|stop|wipe|url> <app-slug>

start <app>   init + start a private Postgres cluster, print DATABASE_URL.
              Hashes the app slug to pick a stable port in [50000, 65000).
stop  <app>   stop the cluster (kept on disk; restart is fast).
wipe  <app>   stop and rm -rf the cluster data dir.
url   <app>   just echo DATABASE_URL (cluster must already be running).
EOF
  exit 64
}

require_app_slug() {
  if [ -z "${1:-}" ]; then usage; fi
}

resolve_paths() {
  APP_SLUG="$1"
  PG_HOME="/tmp/borso-pg-${APP_SLUG}"
  PG_LOG="/tmp/borso-pg-${APP_SLUG}.log"
  # Stable port derived from the app slug — same app → same port across runs,
  # different apps → different ports (no cross-app interference).
  PORT_BASE=50000
  PORT_RANGE=15000
  HASH=$(printf '%s' "$APP_SLUG" | cksum | awk '{print $1}')
  PG_PORT=$(( PORT_BASE + (HASH % PORT_RANGE) ))
  DB_NAME="${APP_SLUG//-/_}_test"
}

ensure_pg_installed() {
  if [ ! -x "${PG_BIN}/initdb" ]; then
    echo "fatal: ${PG_BIN}/initdb is missing. Install postgresql-${PG_VERSION} (apt-get install postgresql)." >&2
    exit 70
  fi
}

run_as_postgres() {
  # initdb / pg_ctl refuse to run as root. We `su postgres` (the system
  # role created by the apt package) to invoke them, even when we're the
  # owner of the host's filesystem.
  if [ "$(id -u)" -eq 0 ]; then
    su -s /bin/sh "${PG_USER_OS}" -c "$1"
  else
    sh -c "$1"
  fi
}

is_running() {
  run_as_postgres "${PG_BIN}/pg_ctl -D '${PG_HOME}' status" >/dev/null 2>&1
}

cmd_start() {
  ensure_pg_installed
  if [ ! -f "${PG_HOME}/PG_VERSION" ]; then
    mkdir -p "${PG_HOME}"
    chown "${PG_USER_OS}:${PG_USER_OS}" "${PG_HOME}"
    run_as_postgres "${PG_BIN}/initdb -D '${PG_HOME}' -U '${PG_USER_DB}' --auth=trust --no-sync --encoding=UTF8" >/dev/null
  fi

  if ! is_running; then
    chown -R "${PG_USER_OS}:${PG_USER_OS}" "${PG_HOME}"
    run_as_postgres "${PG_BIN}/pg_ctl -D '${PG_HOME}' -l '${PG_LOG}' -o '-p ${PG_PORT} -h 127.0.0.1 -F' start" >/dev/null
  fi

  # Wait for readiness (cheap because we hit the local socket).
  for _ in $(seq 1 20); do
    if PGPASSWORD= "${PG_BIN}/psql" -h 127.0.0.1 -p "${PG_PORT}" -U "${PG_USER_DB}" -d postgres -c 'select 1' >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  # Create the per-app database if it doesn't exist yet.
  if ! PGPASSWORD= "${PG_BIN}/psql" -h 127.0.0.1 -p "${PG_PORT}" -U "${PG_USER_DB}" -d postgres -tAc "select 1 from pg_database where datname='${DB_NAME}'" | grep -q 1; then
    PGPASSWORD= "${PG_BIN}/psql" -h 127.0.0.1 -p "${PG_PORT}" -U "${PG_USER_DB}" -d postgres -c "create database \"${DB_NAME}\"" >/dev/null
  fi

  printf 'postgresql://%s@127.0.0.1:%d/%s\n' "${PG_USER_DB}" "${PG_PORT}" "${DB_NAME}"
}

cmd_stop() {
  if is_running; then
    run_as_postgres "${PG_BIN}/pg_ctl -D '${PG_HOME}' stop -m fast" >/dev/null
  fi
}

cmd_wipe() {
  cmd_stop
  rm -rf "${PG_HOME}" "${PG_LOG}"
}

cmd_url() {
  if ! is_running; then
    echo "fatal: Postgres for ${APP_SLUG} is not running. Run \`$0 start ${APP_SLUG}\` first." >&2
    exit 1
  fi
  printf 'postgresql://%s@127.0.0.1:%d/%s\n' "${PG_USER_DB}" "${PG_PORT}" "${DB_NAME}"
}

[ $# -ge 1 ] || usage
SUBCOMMAND="$1"
require_app_slug "${2:-}"
resolve_paths "$2"

case "${SUBCOMMAND}" in
  start) cmd_start ;;
  stop)  cmd_stop ;;
  wipe)  cmd_wipe ;;
  url)   cmd_url ;;
  *)     usage ;;
esac
