#!/usr/bin/env bash
# Stop the server listening on one port, and everything its process group
# started, without touching another agent's processes.
#
#   scripts/stop-port.sh 5173
#
# This is the recipe `.claude/hooks/pretool-no-broad-kill.sh` printed as three
# lines after refusing a pkill. Forty archived friction logs hold eighty of
# those refusals: a recipe read after the refusal costs a retry every time,
# where a command an agent can name first costs nothing.
#
# It kills the process group of the listener, so pnpm, concurrently and every
# server they started go together. A server started without setsid inside a
# pipeline shares the caller's group; that group is skipped, because killing
# it would kill the caller. Start servers as `setsid pnpm dev > log 2>&1 &`.
set -euo pipefail

port="${1:?usage: scripts/stop-port.sh <port>}"

listener="$(lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
if [ -z "$listener" ]; then
  echo "[stop-port] nothing listens on $port" >&2
  exit 0
fi

group="$(ps -o pgid= -p "$listener" | tr -d ' ')"
own_group="$(ps -o pgid= -p "$$" | tr -d ' ')"
if [ "$group" = "$own_group" ] || [ "$group" = "$(ps -o pgid= -p "$PPID" | tr -d ' ')" ]; then
  echo "[stop-port] $port is served from this shell's own process group; stopping only pid $listener" >&2
  kill "$listener"
  exit 0
fi

kill -- "-$group"
echo "[stop-port] stopped process group $group, which listened on $port" >&2
