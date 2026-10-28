#!/usr/bin/env bash
# Walk pragma's top tasks with real argent input at 390x844 in emulated standalone mode.
# Starts a private pragma instance with the audit seed, boots argent on matching ports,
# runs task-metrics.setup.ts with every argument passed through, then stops what it started.
# Usage: run-task-metrics.sh [--tasks 1,2,...|all|none] [--routes] [--slice-1] [--slice-2] [--slice-3] [--seed audit|no-upcoming-session] [--out file.json] [--compare baseline.json]
# The site port comes from TASK_METRICS_PORT (default 5182).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
PORT="${TASK_METRICS_PORT:-5182}"
OFFSET=$((PORT - 5180))
export ARGENT_CDP_PORT=$((9280 + OFFSET)) ARGENT_TOOL_SERVER_PORT=$((4380 + OFFSET)) ARGENT_WIDTH=390 ARGENT_HEIGHT=844
export BASE="http://localhost:$PORT"

absolute_arguments=()
expects_path=no
expects_seed=no
for argument in "$@"; do
  [ "$argument" = "--" ] && continue
  if [ "$expects_seed" = yes ]; then
    export AUDIT_SEED_VARIANT="$argument"
  fi
  expects_seed=no
  [ "$argument" = "--seed" ] && expects_seed=yes
  if [ "$expects_path" = yes ] && [ "${argument#/}" = "$argument" ]; then
    argument="$PWD/$argument"
  fi
  expects_path=no
  case "$argument" in --out | --compare) expects_path=yes ;; esac
  absolute_arguments+=("$argument")
done

cleanup() {
  (cd "$REPO" && scripts/argent.sh stop) || true
  "$HERE/pragma-instance.sh" stop "$PORT" || true
}
trap cleanup EXIT
"$HERE/pragma-instance.sh" start "$PORT"
(cd "$REPO" && scripts/argent.sh start "$BASE/login" > /dev/null)
cd "$REPO/apps/pragma"
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
  pnpm exec tsx scripts/task-metrics/task-metrics.setup.ts "${absolute_arguments[@]}"
