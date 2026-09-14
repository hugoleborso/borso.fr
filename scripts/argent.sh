#!/usr/bin/env bash
# Drive a phone-shaped Chromium with argent, in one command.
#
# argent (`@swmansion/argent`) is the tool that sends real touch input — taps,
# swipes, pinches, keystrokes — over the Chrome DevTools Protocol. A synthetic
# click through `agent-browser` is not a tap, so any question about touch
# behaviour, thumb reach or gesture handling is answered here rather than there.
#
# Every non-obvious part of the setup is encoded below, because each one has
# already cost this repository a debugging session:
#
#   * argent does not launch a browser. It probes CDP ports, so a Chromium must
#     be running first, started as a long-lived process — one started inside an
#     ordinary shell call is reaped when the call returns.
#   * argent and agent-browser cannot share a browser. Playwright owns its
#     targets, and argent's `Page.navigate`, `Runtime.evaluate` and input
#     dispatch then time out against them. That shared-browser hazard is the
#     most likely cause of the "gesture-tap is broken" note this repository
#     carried for months, which was wrong and cost two phone audits.
#   * The tool-server binds 127.0.0.1:3001 by default, which is the port both
#     full-stack apps' dev APIs use. Start argent while one is down and it takes
#     the port; the site's /api proxy then reaches argent, every call answers
#     401, and the app says "Wrong password." This script never uses 3001.
#   * A Chromium that inherits HTTPS_PROXY sends http://localhost:… through the
#     proxy and renders ERR_CONNECTION_REFUSED, which `describe` reports as a
#     page whose only content is Chromium's error screen.
#
# Usage:
#   scripts/argent.sh start [url]     boot the browser + server, open url
#   scripts/argent.sh run <args...>   argent run <args>, with udid and proxy set
#   scripts/argent.sh describe        the screen as normalised frames
#   scripts/argent.sh tap <x> <y>     tap at normalised [0,1] coordinates
#   scripts/argent.sh status          what is running
#   scripts/argent.sh stop            kill both
#
# Coordinates are fractions of the screen, not pixels: `describe` prints each
# frame as (x, y, width, height) in [0,1], and a tap goes to the centre,
# x + width / 2, y + height / 2.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 3001 is the dev API port of every full-stack app here; 4310 is free and stays
# out of the way of Vite (5173+) and the CDP range (9222+).
TOOL_SERVER_PORT="${ARGENT_TOOL_SERVER_PORT:-4310}"
CDP_PORT="${ARGENT_CDP_PORT:-9222}"
UDID="chromium-cdp-${CDP_PORT}"
PHONE_WIDTH="${ARGENT_WIDTH:-375}"
PHONE_HEIGHT="${ARGENT_HEIGHT:-812}"
PROFILE_DIR="/tmp/argent-chromium-${CDP_PORT}"
SERVER_LOG="/tmp/argent-server-${TOOL_SERVER_PORT}.log"
BROWSER_LOG="/tmp/argent-chromium-${CDP_PORT}.log"
READY_TIMEOUT_SECONDS=30

export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

fail() {
  printf '\033[31m[argent]\033[0m %s\n' "$1" >&2
  exit 1
}

note() {
  printf '\033[36m[argent]\033[0m %s\n' "$1"
}

# A browser started for localhost cannot reach a preview and vice versa, and the
# browser's flags are fixed at launch, so the target decides them. Anything that
# is not loopback is treated as remote, which is the safe default: the remote
# flags still reach a LAN address, the localhost flags reach nothing off-box.
TARGET_IS_REMOTE=no
classify_target() {
  case "${1:-}" in
    '' | http://localhost* | http://127.0.0.1* | https://localhost* | https://127.0.0.1*)
      TARGET_IS_REMOTE=no
      ;;
    *)
      TARGET_IS_REMOTE=yes
      ;;
  esac
}

find_chromium() {
  local candidate
  candidate="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)"
  [ -n "$candidate" ] || fail "no Chromium under /opt/pw-browsers — is this the sandbox image?"
  printf '%s' "$candidate"
}

is_cdp_up() {
  curl -s -m 2 "http://127.0.0.1:${CDP_PORT}/json/version" > /dev/null 2>&1
}

is_server_up() {
  # The tool-server answers 401 without a bearer token, which still proves it is
  # listening and is ours; a foreign listener on this port answers something else
  # or nothing at all.
  curl -s -m 2 "http://127.0.0.1:${TOOL_SERVER_PORT}/tools" 2>/dev/null | grep -q 'Tool-server requires'
}

has_rendered() {
  pnpm exec argent run describe --udid "$UDID" --json 2>/dev/null \
    | grep -q 'clickable'
}

wait_for() {
  local check="$1" what="$2" waited=0
  until "$check"; do
    waited=$((waited + 1))
    [ "$waited" -lt "$READY_TIMEOUT_SECONDS" ] || fail "$what did not come up in ${READY_TIMEOUT_SECONDS}s — see $SERVER_LOG and $BROWSER_LOG"
    sleep 1
  done
}

start_browser() {
  if is_cdp_up; then
    note "Chromium already listening on CDP ${CDP_PORT}"
    return
  fi
  local chromium
  chromium="$(find_chromium)"
  rm -rf "$PROFILE_DIR"
  mkdir -p "$PROFILE_DIR"
  # Two mutually exclusive network modes, because the flags that make localhost
  # work are the flags that make a preview unreachable.
  #
  # localhost: `env -u` strips the proxy the sandbox exports and
  # --no-proxy-server stops Chromium reading any other source for one. Without
  # both, a Chromium that inherited HTTPS_PROXY sends http://localhost:5174 out
  # through the proxy and renders ERR_CONNECTION_REFUSED.
  #
  # remote: the proxy is the only route off this sandbox, so it has to stay,
  # and --ssl-version-max=tls1.2 has to be added because the proxy cannot
  # complete a TLS 1.3 handshake with Chromium. Stripping the proxy here fails
  # as ERR_CERT_AUTHORITY_INVALID, which reads as a broken certificate on the
  # preview rather than as a flag meant for the other mode.
  if [ "$TARGET_IS_REMOTE" = yes ]; then
    nohup "$chromium" \
      --remote-debugging-port="${CDP_PORT}" --remote-allow-origins='*' \
      --headless=new --no-sandbox --disable-dev-shm-usage \
      --ssl-version-max=tls1.2 \
      --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
      --window-size="${PHONE_WIDTH},${PHONE_HEIGHT}" \
      --user-data-dir="$PROFILE_DIR" about:blank \
      > "$BROWSER_LOG" 2>&1 &
  else
    env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
      nohup "$chromium" \
      --remote-debugging-port="${CDP_PORT}" --remote-allow-origins='*' \
      --headless=new --no-sandbox --disable-dev-shm-usage --no-proxy-server \
      --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader \
      --window-size="${PHONE_WIDTH},${PHONE_HEIGHT}" \
      --user-data-dir="$PROFILE_DIR" about:blank \
      > "$BROWSER_LOG" 2>&1 &
  fi
  disown || true
  wait_for is_cdp_up "Chromium CDP on ${CDP_PORT}"
  note "Chromium up on CDP ${CDP_PORT}, window ${PHONE_WIDTH}x${PHONE_HEIGHT}"
}

start_server() {
  if is_server_up; then
    note "tool-server already listening on ${TOOL_SERVER_PORT}"
    return
  fi
  if curl -s -m 2 -o /dev/null "http://127.0.0.1:${TOOL_SERVER_PORT}/"; then
    fail "port ${TOOL_SERVER_PORT} is taken by something that is not argent — set ARGENT_TOOL_SERVER_PORT"
  fi
  # ARGENT_CHROMIUM_PORTS is read by the server, not by the CLI, so it has to be
  # set here; setting it on an `argent run` call does nothing once a server is up.
  ARGENT_CHROMIUM_PORTS="${CDP_PORT}" nohup pnpm exec argent server start \
    --port "${TOOL_SERVER_PORT}" > "$SERVER_LOG" 2>&1 &
  disown || true
  wait_for is_server_up "argent tool-server on ${TOOL_SERVER_PORT}"
  note "tool-server up on ${TOOL_SERVER_PORT}"
}

case "${1:-start}" in
  start)
    classify_target "${2:-}"
    if is_cdp_up; then
      note "reusing the Chromium already on ${CDP_PORT} — its network mode was fixed at launch; scripts/argent.sh stop first if the target changed"
    else
      [ "$TARGET_IS_REMOTE" = yes ] && note "remote target: keeping the proxy, capping TLS at 1.2"
    fi
    start_browser
    start_server
    if [ -n "${2:-}" ]; then
      pnpm exec argent run open-url --udid "$UDID" --url "$2" --json > /dev/null
      # `open-url` returns on navigation, not on render, and a single-page app
      # has an empty body until React mounts. Tapping then hits nothing, the
      # keystrokes go nowhere, and the caller reads three cheerful successes on
      # a page that never received them — so wait for something interactive.
      wait_for has_rendered "a rendered page at $2"
      note "opened $2"
    fi
    cat <<EOF

Ready. The device is ${UDID}.

  scripts/argent.sh describe            # every frame, as normalised [0,1] boxes
  scripts/argent.sh tap 0.5 0.95        # tap the centre of the bottom bar
  scripts/argent.sh run keyboard --text "hello"
  scripts/argent.sh run gesture-scroll --udid ${UDID} --x 0.5 --y 0.5 --deltaY 0.9
  scripts/argent.sh run gesture-drag --udid ${UDID} --fromX .. --fromY .. --toX .. --toY ..
  scripts/argent.sh run screenshot --udid ${UDID} --out /abs/path.png --json
  scripts/argent.sh stop

A tap goes to a frame's centre: x + width / 2, y + height / 2.

gesture-tap is a real touch event. gesture-swipe is NOT supported on Chromium —
it returns an issues list and changes nothing, which reads as the page ignoring
the gesture. Scroll with gesture-scroll (wheel) and drag with gesture-drag
(mouse); deltas there are fractions of the window, not pixels.
EOF
    ;;
  run)
    shift
    is_server_up || fail "nothing running — scripts/argent.sh start"
    # There is one device, so naming it on every call is noise the caller should
    # not have to remember. `list-devices` accepts the flag and ignores it.
    if printf '%s\n' "$@" | grep -qx -- '--udid'; then
      pnpm exec argent run "$@"
    else
      pnpm exec argent run "$@" --udid "$UDID"
    fi
    ;;
  describe)
    is_server_up || fail "nothing running — scripts/argent.sh start"
    pnpm exec argent run describe --udid "$UDID" --json
    ;;
  tap)
    [ $# -eq 3 ] || fail "usage: scripts/argent.sh tap <x> <y>, both in [0,1]"
    is_server_up || fail "nothing running — scripts/argent.sh start"
    pnpm exec argent run gesture-tap --udid "$UDID" --x "$2" --y "$3" --json
    ;;
  status)
    is_cdp_up && note "Chromium: up on ${CDP_PORT}" || note "Chromium: down"
    is_server_up && note "tool-server: up on ${TOOL_SERVER_PORT}" || note "tool-server: down"
    ;;
  stop)
    pkill -f "server start --port ${TOOL_SERVER_PORT}" 2>/dev/null || true
    pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true
    # Chromium keeps writing its profile for a moment after SIGTERM, so a delete
    # issued straight away fails with "Directory not empty".
    sleep 2
    rm -rf "$PROFILE_DIR" 2>/dev/null || true
    note "stopped"
    ;;
  *)
    fail "unknown command '$1' — start | run | describe | tap | status | stop"
    ;;
esac
