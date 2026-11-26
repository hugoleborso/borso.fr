#!/usr/bin/env bash
# Start and stop one app's dev server without touching anyone else's.
#
#   scripts/dev-server.sh start <app> [--as <label>]   prints the site URL once it answers
#   scripts/dev-server.sh stop  <app> [--as <label>]   stops that server and every child it started
#
# Agents share this machine. A server started with `pnpm dev &` shares the
# caller's process group, so the only way left to stop it was a name pattern,
# and `pretool-no-broad-kill.sh` refused that 86 times across the archived
# friction logs by 2026-11-16. This script starts the server as the leader of
# its own session and keeps that id, so `stop` kills exactly its group.
# The label tells two agents running the same app apart. It defaults to main.
#
# See docs/dantotsus/the-dev-server-nobody-could-stop.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${TMPDIR:-/tmp}/borso-dev-servers"
START_TIMEOUT_SECONDS=180

usage() {
  echo "usage: scripts/dev-server.sh start|stop <app> [--as <label>]" >&2
  exit 2
}

[[ $# -ge 2 ]] || usage
ACTION="$1"
APP="$2"
LABEL=main
if [[ $# -eq 4 && "$3" == "--as" ]]; then LABEL="$4"; elif [[ $# -ne 2 ]]; then usage; fi
[[ -f "$REPO_ROOT/apps/$APP/package.json" ]] || {
  echo "[dev-server] no app named $APP: ls -d apps/*/" >&2
  exit 2
}

mkdir -p "$STATE_DIR"
GROUP_FILE="$STATE_DIR/$APP.$LABEL.pgid"
LOG_FILE="$STATE_DIR/$APP.$LABEL.log"

running_group() {
  [[ -f "$GROUP_FILE" ]] || return 1
  local group
  group="$(cat "$GROUP_FILE")"
  kill -0 -- "-$group" 2>/dev/null || return 1
  echo "$group"
}

site_url() {
  grep -oE 'Local:[[:space:]]+http://localhost:[0-9]+/' "${1:-$LOG_FILE}" 2>/dev/null |
    tail -1 | grep -oE 'http://localhost:[0-9]+/'
}

case "$ACTION" in
  start)
    for other in "$STATE_DIR/$APP".*.pgid; do
      [[ -d "$REPO_ROOT/apps/$APP/api" && "$other" != "$GROUP_FILE" ]] && GROUP_FILE="$other" running_group >/dev/null || continue
      echo "[dev-server] $APP already runs, and a second one would share its API ports. Use it: $(site_url "${other%.pgid}.log")" >&2
      exit 1
    done
    if running_group >/dev/null; then
      echo "[dev-server] $APP ($LABEL) already runs, log $LOG_FILE" >&2
    else
      rm -f "$GROUP_FILE"
      : >"$LOG_FILE"
      setsid bash -c 'echo $$ >"$1"; cd "$2" && exec pnpm dev' _ "$GROUP_FILE" "$REPO_ROOT/apps/$APP" \
        >"$LOG_FILE" 2>&1 </dev/null &
      until [[ -s "$GROUP_FILE" ]]; do sleep 0.1; done
    fi
    for ((second = 0; second < START_TIMEOUT_SECONDS; second++)); do
      site_url >/dev/null && break
      running_group >/dev/null || {
        echo "[dev-server] $APP exited before it answered. Log:" >&2
        tail -20 "$LOG_FILE" >&2
        exit 1
      }
      sleep 1
    done
    grep -E '^\[dev:db\]' "$LOG_FILE" >&2 || true
    site_url || {
      echo "[dev-server] $APP printed no URL within ${START_TIMEOUT_SECONDS}s, log $LOG_FILE" >&2
      exit 1
    }
    ;;
  stop)
    if group="$(running_group)"; then
      kill -- "-$group"
      echo "[dev-server] stopped $APP ($LABEL), process group $group" >&2
    else
      echo "[dev-server] $APP ($LABEL) was not running" >&2
    fi
    rm -f "$GROUP_FILE"
    ;;
  *) usage ;;
esac
