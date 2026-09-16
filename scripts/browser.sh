#!/usr/bin/env bash
# Run agent-browser with the settings this sandbox needs, in one command.
#
# `agent-browser` is the Playwright-backed CLI for functional walkthroughs:
# `snapshot`, `a11y`, `vitals`, `find role`, `screenshot`, `errors`. Every
# question about touch behaviour goes to `scripts/argent.sh` instead, because a
# synthetic click is not a tap.
#
# Two settings are not optional here, and each one has already cost a session:
#
#   * There is no browser in agent-browser's own cache, so the first call fails
#     with "Chrome not found" and offers `agent-browser install`. Do not take
#     that offer: the image already ships Chromium for Playwright and the
#     environment brief says not to fetch a second copy.
#   * Without `--ssl-version-max=tls1.2` every https navigation fails with
#     ERR_CONNECTION_RESET, because the outbound proxy cannot complete a TLS 1.3
#     handshake with Chromium. The symptom points away from TLS in four
#     directions at once — curl reaches the same host through the same proxy,
#     Chromium is launched with the right --proxy-server and reaches it, the
#     proxy logs no rejected CONNECT, and a localhost dev server loads fine — so
#     nobody rediscovers this by reasoning about the evidence.
#
# The daemon reads both when it starts and ignores them afterwards, which is why
# a wrongly started daemon keeps failing however carefully the next call is
# written. `--restart` closes it first, and may appear anywhere in the argument
# list: agent-browser's own flags are order-sensitive in ways its help does not
# state, and a wrapper flag that inherits that is a trap for no reason.
#
# A session also wedges. Three times in one task, at roughly forty to fifty
# drives, a session stopped completing its fetches: a reload never returned, a
# React mutation stayed pending so a button read as permanently disabled, and a
# panel froze mid-round with two polls logged where thirty were due. Every one
# of those reads as an application defect, which is how a validator issues a
# false FAIL. So this counts the drives per session and says so before the
# count gets there — the count is the one piece of evidence that tells the two
# apart, and it is not otherwise visible from inside a browser session.
#
# Usage:
#   scripts/browser.sh open https://borsouvertures-pr-55.preview.borso.fr/
#   scripts/browser.sh snapshot
#   scripts/browser.sh errors
#   scripts/browser.sh --restart open http://localhost:5173/
#   scripts/browser.sh --session pragma open …    one browser per session name
#
# Every other argument is passed through, so this is a drop-in for
# `agent-browser`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# WebGL runs on SwiftShader because there is no GPU. Without it borso-fr's
# galaxy background logs an error and does not draw, which reads as a defect in
# the page. `--disable-gpu` produces the error this avoids rather than fixing
# it.
BROWSER_ARGS='--ssl-version-max=tls1.2,--enable-unsafe-swiftshader,--use-gl=angle,--use-angle=swiftshader,--no-sandbox'

note() {
  printf '\033[36m[browser]\033[0m %s\n' "$1"
}

find_chromium() {
  ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1
}

DRIVE_STATE_DIR="${TMPDIR:-/tmp}/borso-browser-drives"
DRIVES_BEFORE_WARNING=30

restart_requested=0
session_name='default'
passthrough=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --restart)
      restart_requested=1
      ;;
    --session)
      session_name="${2-default}"
      passthrough+=("$1")
      [ "$#" -gt 1 ] && passthrough+=("$2") && shift
      ;;
    *)
      passthrough+=("$1")
      ;;
  esac
  shift
done

mkdir -p "$DRIVE_STATE_DIR"
drive_count_file="${DRIVE_STATE_DIR}/$(printf '%s' "$session_name" | tr -c 'A-Za-z0-9_.-' '_')"

if [ "$restart_requested" -eq 1 ]; then
  pnpm exec agent-browser close > /dev/null 2>&1 || true
  : > "$drive_count_file"
  note 'closed the running daemon, so the settings below apply; drive count reset'
fi

if [ "${#passthrough[@]}" -eq 0 ]; then
  note 'usage: scripts/browser.sh [--restart] <agent-browser args...>'
  exit 64
fi

drives_so_far=$(( $(cat "$drive_count_file" 2>/dev/null || echo 0) + 1 ))
echo "$drives_so_far" > "$drive_count_file"

if [ "$drives_so_far" -ge "$DRIVES_BEFORE_WARNING" ]; then
  note "drive ${drives_so_far} of session '${session_name}'."
  note 'Past roughly forty, a session has wedged here three times: a reload that'
  note 'never returns, a mutation stuck pending so a button reads disabled, a'
  note 'panel frozen mid-poll. Each looks exactly like an application defect.'
  note "Before recording a FAIL, run: scripts/browser.sh --restart --session ${session_name} open <url>"
  note 'and check whether the symptom survives a fresh daemon.'
fi

chromium="$(find_chromium)"
if [ -n "$chromium" ]; then
  export AGENT_BROWSER_EXECUTABLE_PATH="$chromium"
else
  # A developer machine has a real Chrome and needs no help finding it. Only the
  # sandbox image keeps its browser somewhere agent-browser does not look.
  note 'no Chromium under /opt/pw-browsers, leaving the browser choice to agent-browser'
fi

export AGENT_BROWSER_ARGS="$BROWSER_ARGS"
exec pnpm exec agent-browser "${passthrough[@]}"
