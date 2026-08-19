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
# written. `--restart` closes it first.
#
# Usage:
#   scripts/browser.sh open https://borsouvertures-pr-55.preview.borso.fr/
#   scripts/browser.sh snapshot
#   scripts/browser.sh errors
#   scripts/browser.sh --restart open http://localhost:5173/
#   scripts/browser.sh --session pragma open …    one browser per session name
#
# Every argument is passed through, so this is a drop-in for `agent-browser`.

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

if [ "${1-}" = '--restart' ]; then
  shift
  pnpm exec agent-browser close > /dev/null 2>&1 || true
  note 'closed the running daemon, so the settings below apply'
fi

if [ "$#" -eq 0 ]; then
  note 'usage: scripts/browser.sh [--restart] <agent-browser args...>'
  exit 64
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
exec pnpm exec agent-browser "$@"
