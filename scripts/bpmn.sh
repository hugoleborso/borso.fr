#!/usr/bin/env bash
# Lint and render the BPMN journeys under docs/bpmn/ with the bpmn.io CLI
# tools (bpmnlint, bpmn-to-image). bpmn-to-image drives Puppeteer, whose
# bundled Chromium is never downloaded here (pnpm blocks the postinstall),
# so this script points Puppeteer at a browser that actually exists:
# the sandbox image's Chromium needs --no-sandbox (the process runs as
# root), which only a wrapper can add because Puppeteer takes a path, not
# arguments. Same class of trap as scripts/browser.sh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SANDBOX_CHROMIUM="/opt/pw-browsers/chromium"
MACOS_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

resolve_browser() {
  if [ -n "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
    return
  fi
  if [ -x "$SANDBOX_CHROMIUM" ]; then
    local wrapper_dir
    wrapper_dir="$(mktemp -d)"
    printf '#!/bin/sh\nexec %s --no-sandbox --disable-gpu "$@"\n' "$SANDBOX_CHROMIUM" \
      >"$wrapper_dir/chromium-no-sandbox"
    chmod +x "$wrapper_dir/chromium-no-sandbox"
    export PUPPETEER_EXECUTABLE_PATH="$wrapper_dir/chromium-no-sandbox"
    return
  fi
  if [ -x "$MACOS_CHROME" ]; then
    export PUPPETEER_EXECUTABLE_PATH="$MACOS_CHROME"
  fi
}

shopt -s nullglob
diagrams=(docs/bpmn/*.bpmn)
if [ ${#diagrams[@]} -eq 0 ]; then
  echo "[bpmn] no .bpmn file under docs/bpmn/"
  exit 1
fi

echo "[bpmn] linting ${#diagrams[@]} diagram(s) against bpmnlint:recommended"
pnpm exec bpmnlint --config docs/bpmn/.bpmnlintrc "${diagrams[@]}"

resolve_browser
for diagram in "${diagrams[@]}"; do
  stem="${diagram%.bpmn}"
  echo "[bpmn] rendering ${stem}.svg"
  pnpm exec bpmn-to-image --title="$(basename "$stem")" "${diagram}:${stem}.svg"
done
