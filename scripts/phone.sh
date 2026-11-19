#!/usr/bin/env bash
# A real touch tap at phone width, on an agent-browser session.
#
# A synthetic click is not a tap: `agent-browser click` sends a mouse press, and
# `set device` gives neither touch events nor a coarse pointer. `touch` sends
# CDP Input.dispatchTouchEvent at a 375 x 812 mobile viewport with touch
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
# Usage:
#   scripts/phone.sh start <url>                   open url in the "phone" session at 375 x 812
#   scripts/phone.sh touch '<selector>'            real touch tap on the first visible match
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
  agent-browser --session "$SESSION" get cdp-url 2>/dev/null | sed -n 's#^ws://[^:]*:\([0-9]*\)/.*#\1#p'
}

restore_viewport() {
  local status=$? width
  agent-browser --session "$SESSION" set viewport "$PHONE_WIDTH" "$PHONE_HEIGHT" >/dev/null
  width="$(agent-browser --session "$SESSION" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
  if [ "$width" != "$PHONE_WIDTH" ]; then
    printf '[phone] after the gesture the page is %s px wide, not %s; measurements would be wrong\n' \
      "${width:-unknown}" "$PHONE_WIDTH" >&2
    exit 1
  fi
  exit "$status"
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
    # touch-tap.ts emulates the phone on its own CDP connection, and Chromium
    # drops that override when the connection closes, which leaves the page at
    # the 1280 px window while screenshots still crop to 375. Re-apply it.
    trap restore_viewport EXIT
    pnpm exec tsx scripts/browser/touch-tap.ts --selector "$2" --port "$port" \
      --width "$PHONE_WIDTH" --height "$PHONE_HEIGHT"
    ;;
  drag | swipe)
    if [ "$1" = drag ]; then
      [ $# -eq 3 ] || fail "usage: scripts/phone.sh drag '<from css selector>' '<to css selector>'" 2
      destination=(--to "$3")
    else
      [ $# -eq 4 ] || fail "usage: scripts/phone.sh swipe '<from css selector>' <dx px> <dy px>" 2
      destination=(--by "$3,$4")
    fi
    port="$(cdp_port)"
    [ -n "$port" ] || fail "no '$SESSION' session — scripts/phone.sh start <url>"
    # The driver's phone metrics end with its CDP connection and take the
    # session's 375 px viewport with them, so set it again before returning.
    trap restore_viewport EXIT
    pnpm exec tsx scripts/browser/touch-drag.ts --from "$2" "${destination[@]}" --port "$port" \
      --width "$PHONE_WIDTH" --height "$PHONE_HEIGHT"
    ;;
  stop)
    agent-browser --session "$SESSION" close
    ;;
  *)
    fail "usage: scripts/phone.sh start <url> | touch '<css selector>' | drag '<from>' '<to>' | swipe '<from>' <dx> <dy> | stop"
    ;;
esac
