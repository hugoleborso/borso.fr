#!/usr/bin/env bash
# Install everything the repo needs to function. Idempotent — safe to re-run.
#
# Used in two places:
#   - SessionStart hook in .claude/settings.json (every Claude session)
#   - Manual bootstrap on a fresh checkout
#
# Installs:
#   - rtk (token-saving CLI proxy used by .claude/hooks/rtk-rewrite.sh)
#   - pnpm workspace dependencies
#
# Pre-requisites the script does NOT install:
#   - jq (rtk runtime dep) — apt-get install jq / brew install jq
#   - pnpm (provided via corepack from the packageManager field)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log() { printf '[install-repo-deps] %s\n' "$*"; }
fail() { printf '[install-repo-deps] ERROR: %s\n' "$*" >&2; exit 1; }

# 1. jq — required by the rtk PreToolUse hook
if ! command -v jq >/dev/null 2>&1; then
  fail "jq is missing. Install it: apt-get install jq / brew install jq / etc."
fi

# 2. rtk — install via upstream installer if missing.
# Installer puts the binary in ~/.local/bin; ensure that's on PATH for this run.
export PATH="$HOME/.local/bin:$PATH"
if ! command -v rtk >/dev/null 2>&1; then
  log "rtk not found; installing from rtk-ai/rtk install.sh"
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
fi
if ! command -v rtk >/dev/null 2>&1; then
  fail "rtk install completed but binary still not on PATH (~/.local/bin not in PATH?)."
fi
log "rtk: $(rtk --version)"

# 3. pnpm deps
if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm is missing. Enable corepack (corepack enable) or install pnpm 10 manually."
fi
log "running pnpm install"
pnpm install --frozen-lockfile

log "done"
