#!/usr/bin/env bash
# Walk pragma's top tasks with real touch input at 390x844 in emulated standalone mode.
# Starts a private pragma instance with the audit seed, opens an agent-browser session for it,
# runs task-metrics.setup.ts with every argument passed through, then stops what it started.
# Usage: run-task-metrics.sh [--tasks 1,2,...|all|none] [--routes] [--slice-1] [--slice-2] [--slice-3] [--slice-4] [--slice-6] [--screen-rule] [--seed audit|no-upcoming-session] [--out file.json] [--compare baseline.json]
# The site port comes from TASK_METRICS_PORT (default 5182).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
PORT="${TASK_METRICS_PORT:-5182}"
export BASE="http://localhost:$PORT"
# One agent-browser session per site port, so two runs on two ports do not meet.
SESSION="pragma-task-metrics-$PORT"

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

without_proxy() {
  env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy "$@"
}

cleanup() {
  agent-browser --session "$SESSION" close > /dev/null 2>&1 || true
  "$HERE/pragma-instance.sh" stop "$PORT" || true
}
trap cleanup EXIT
"$HERE/pragma-instance.sh" start "$PORT"
# A Chromium that inherits the proxy variables sends localhost through the proxy.
without_proxy agent-browser --session "$SESSION" open "$BASE/login" > /dev/null
TASK_METRICS_CDP_PORT="$(agent-browser --session "$SESSION" get cdp-url | sed -n 's#^ws://[^:]*:\([0-9]*\)/.*#\1#p')"
[ -n "$TASK_METRICS_CDP_PORT" ] || { echo "[task-metrics] no CDP port for session $SESSION" >&2; exit 1; }
export TASK_METRICS_CDP_PORT
cd "$REPO/apps/pragma"
without_proxy pnpm exec tsx scripts/task-metrics/task-metrics.setup.ts "${absolute_arguments[@]}"
