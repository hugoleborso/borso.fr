#!/usr/bin/env bash
# A real touch tap at phone width, on an agent-browser session.
#
# A synthetic click is not a tap: `agent-browser click` sends a mouse press, and
# `set device` gives neither touch events nor a coarse pointer. `touch` sends
# CDP Input.dispatchTouchEvent at a 375 x 812 mobile viewport with touch
# emulation on, and exits 1 unless touchstart and a touch click reached the
# element. The browser is agent-browser's own, so `agent-browser --session
# phone snapshot`, `screenshot` and `eval` work on the same page in between.
#
# Usage:
#   scripts/phone.sh start <url>          open url in the "phone" session at 375 x 812
#   scripts/phone.sh touch '<selector>'   real touch tap on the first match
#   scripts/phone.sh stop                 close the session

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SESSION=phone
PHONE_WIDTH=375
PHONE_HEIGHT=812

fail() {
  printf '[phone] %s\n' "$1" >&2
  exit 1
}

cdp_port() {
  agent-browser --session "$SESSION" get cdp-url 2>/dev/null | sed -n 's#^ws://[^:]*:\([0-9]*\)/.*#\1#p'
}

case "${1:-}" in
  start)
    [ $# -eq 2 ] || fail "usage: scripts/phone.sh start <url>"
    agent-browser --session "$SESSION" open "$2"
    agent-browser --session "$SESSION" set viewport "$PHONE_WIDTH" "$PHONE_HEIGHT"
    ;;
  touch)
    [ $# -eq 2 ] || fail "usage: scripts/phone.sh touch '<css selector>'"
    port="$(cdp_port)"
    [ -n "$port" ] || fail "no '$SESSION' session — scripts/phone.sh start <url>"
    pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$port" \
      --width "$PHONE_WIDTH" --height "$PHONE_HEIGHT"
    ;;
  stop)
    agent-browser --session "$SESSION" close
    ;;
  *)
    fail "usage: scripts/phone.sh start <url> | touch '<css selector>' | stop"
    ;;
esac
