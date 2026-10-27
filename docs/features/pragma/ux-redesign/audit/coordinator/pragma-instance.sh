#!/usr/bin/env bash
# Run one private pragma instance (postgres database + api + site) for the UX audit.
# Usage: pragma-instance.sh <start|stop|status|reseed> <site-port>
#   site-port 5181 -> api port 3181, database purpose audit5181, logs and pids in $STATE_DIR.
set -euo pipefail

ACTION="${1:?usage: pragma-instance.sh <start|stop|status|reseed> <site-port>}"
SITE_PORT="${2:?site port, e.g. 5181}"
API_PORT="${API_PORT:-$((SITE_PORT - 2000))}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
PRAGMA="$REPO/apps/pragma"
STATE_DIR="${STATE_DIR:-$HERE/state-$SITE_PORT}"
mkdir -p "$STATE_DIR"

database_url() { "$REPO/scripts/local-postgres.sh" start pragma "audit${SITE_PORT}"; }

seed() {
  local url; url="$(database_url)"
  ( cd "$PRAGMA" && DATABASE_URL="$url" PORT="$API_PORT" pnpm exec tsx test/dev-database.setup.ts )
  ( cd "$PRAGMA" && DATABASE_URL="$url" pnpm exec tsx --tsconfig ./tsconfig.json "$HERE/seed-audit.mts" 2>&1 | grep '^\[seed-audit\]' )
}

wait_for() {
  for _ in $(seq 1 60); do curl -s -o /dev/null "$1" && return 0; sleep 1; done
  echo "timed out waiting for $1" >&2; return 1
}

start() {
  seed
  local url; url="$(database_url)"
  cd "$PRAGMA"
  DATABASE_URL="$url" STAGE=dev ALLOW_TEST_SEED=1 PORT="$API_PORT" \
    setsid nohup pnpm exec tsx api/src/main.dev.ts < /dev/null > "$STATE_DIR/api.log" 2>&1 &
  echo $! > "$STATE_DIR/api.pid"
  setsid nohup node "$HERE/vite-site.mjs" "$SITE_PORT" "$API_PORT" < /dev/null > "$STATE_DIR/site.log" 2>&1 &
  echo $! > "$STATE_DIR/site.pid"
  wait_for "http://127.0.0.1:$API_PORT/api/health"
  wait_for "http://127.0.0.1:$SITE_PORT/"
  echo "pragma up: site http://localhost:$SITE_PORT  api http://localhost:$API_PORT  (sign in as hugo / pragma-preview)"
}

kill_tree() {
  local pid_file="$1"
  [ -f "$pid_file" ] || return 0
  local pid; pid="$(cat "$pid_file")"
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

stop() {
  kill_tree "$STATE_DIR/site.pid"
  kill_tree "$STATE_DIR/api.pid"
  for port in "$SITE_PORT" "$API_PORT"; do
    pid="$(lsof -t -iTCP:$port -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
    [ -n "$pid" ] && kill -TERM "$pid" 2>/dev/null || true
  done
  echo "pragma instance $SITE_PORT stopped (the shared postgres cluster keeps running; stop it with: $REPO/scripts/local-postgres.sh stop pragma)"
}

status() {
  for port in "$SITE_PORT" "$API_PORT"; do
    if curl -s -o /dev/null "http://127.0.0.1:$port/"; then echo "port $port: up"; else echo "port $port: down"; fi
  done
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  reseed) seed ;;
  *) echo "unknown action $ACTION" >&2; exit 64 ;;
esac
