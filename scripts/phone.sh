#!/usr/bin/env bash
# A real touch tap at phone width, on an agent-browser session.
#
# A synthetic click is not a tap: `agent-browser click` sends a mouse press, and
# `set device` gives neither touch events nor a coarse pointer. `touch` sends
# CDP Input.dispatchTouchEvent at the session's 375 x 812 viewport with touch
# emulation on, and exits 1 unless touchstart and a touch click reached the
# element. `drag` sends touchStart on one element, touchMove steps, and
# touchEnd over another, the gesture react-chessboard and dnd-kit need, and
# exits 1 unless the touches reached the page and lifted over the second
# element. The browser is agent-browser's own, so `agent-browser --session
# phone snapshot`, `screenshot` and `eval` work on the same page in between.
#
# `swipe` is the same drag, lifted a given number of CSS pixels away from where
# it started, for a gesture judged by distance and angle rather than by target.
#
# A target is a CSS selector, or `text=<name>` for the innermost visible element
# whose aria-label or text is exactly <name>, such as a lyric line or a button
# named only by its label.
#
# Usage:
#   scripts/phone.sh start <url>                   open url in the "phone" session at 375 x 812
#   scripts/phone.sh touch '<target>'              real touch tap on the first visible match
#   scripts/phone.sh drag '<from>' '<to>'          real touch drag between two first visible matches
#   scripts/phone.sh swipe '<from>' <dx> <dy>      real touch swipe from the first visible match, by dx, dy px
#   scripts/phone.sh stop                          close the session

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SESSION=phone
PHONE_WIDTH=375
PHONE_HEIGHT=812

fail() {
  printf '[phone] %s\n' "$1" >&2
  exit "${2:-1}"
}

cdp_port() {
  # No session makes agent-browser exit non-zero, and pipefail would end the
  # script here, before the caller's fail names the missing session.
  { agent-browser --session "$SESSION" get cdp-url 2>/dev/null || true; } |
    sed -n 's#^ws://[^:]*:\([0-9]*\)/.*#\1#p'
}

case "${1:-}" in
  start)
    [ $# -eq 2 ] || fail "usage: scripts/phone.sh start <url>"
    agent-browser --session "$SESSION" open "$2"
    agent-browser --session "$SESSION" set viewport "$PHONE_WIDTH" "$PHONE_HEIGHT"
    ;;
  touch)
    [ $# -eq 2 ] || fail "usage: scripts/phone.sh touch '<target>'"
    port="$(cdp_port)"
    [ -n "$port" ] || fail "no '$SESSION' session — scripts/phone.sh start <url>"
    pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$port"
    ;;
  drag | swipe)
    if [ "$1" = drag ]; then
      [ $# -eq 3 ] || fail "usage: scripts/phone.sh drag '<from target>' '<to target>'" 2
      destination=(--to "$3")
    else
      [ $# -eq 4 ] || fail "usage: scripts/phone.sh swipe '<from target>' <dx px> <dy px>" 2
      destination=(--by "$3,$4")
    fi
    port="$(cdp_port)"
    [ -n "$port" ] || fail "no '$SESSION' session — scripts/phone.sh start <url>"
    pnpm exec tsx scripts/browser/touch-drag.ts --from "$2" "${destination[@]}" --port "$port"
    ;;
  stop)
    agent-browser --session "$SESSION" close
    ;;
  *)
    fail "usage: scripts/phone.sh start <url> | touch '<target>' | drag '<from>' '<to>' | swipe '<from>' <dx> <dy> | stop"
    ;;
esac
