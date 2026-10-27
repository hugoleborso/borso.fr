#!/usr/bin/env bash
# Rerun the task-metrics baseline from nothing: starts a pragma instance with the audit seed,
# boots argent at 390x844, walks every top task with real argent input, measures every route,
# then stops what it started. Usage: run-baseline.sh [site-port] [out.json]
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
C="$HERE/../coordinator"
PORT="${1:-5182}"
OUT="${2:-$HERE/baseline.json}"
OFFSET=$((PORT - 5180))
export ARGENT_CDP_PORT=$((9280 + OFFSET)) ARGENT_TOOL_SERVER_PORT=$((4380 + OFFSET)) ARGENT_WIDTH=390 ARGENT_HEIGHT=844
export BASE="http://localhost:$PORT"
cleanup() {
  ( cd "$(git -C "$HERE" rev-parse --show-toplevel)" && scripts/argent.sh stop ) || true
  "$C/pragma-instance.sh" stop "$PORT" || true
}
trap cleanup EXIT
"$C/pragma-instance.sh" start "$PORT"
( cd "$(git -C "$HERE" rev-parse --show-toplevel)" && scripts/argent.sh start "$BASE/login" > /dev/null )
rm -f "$OUT"
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
  node "$HERE/run-baseline.mjs" --tasks all --with-8b --routes --out "$OUT"
