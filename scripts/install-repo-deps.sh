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
#   - AWS CLI v2 (only when AWS_ACCESS_KEY_ID is set in the env, e.g. on
#     claude.ai/code remote sessions configured per docs/aws-setup.md §12)
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

# 4. AWS CLI v2 — only if the session has AWS creds configured (cloud sessions).
# Local sessions without AWS_ACCESS_KEY_ID set don't pay this install cost.
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && ! command -v aws >/dev/null 2>&1; then
  log "AWS_ACCESS_KEY_ID is set but aws CLI is missing; installing AWS CLI v2"
  arch=$(uname -m)
  case "$arch" in
    x86_64) awscli_url="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" ;;
    aarch64) awscli_url="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" ;;
    *) fail "Unsupported architecture for AWS CLI v2 auto-install: $arch" ;;
  esac
  tmp=$(mktemp -d)
  curl -fsSL "$awscli_url" -o "$tmp/awscliv2.zip"
  unzip -q "$tmp/awscliv2.zip" -d "$tmp"
  "$tmp/aws/install" --bin-dir "$HOME/.local/bin" --install-dir "$HOME/.local/aws-cli" --update
  rm -rf "$tmp"
  log "aws: $(aws --version)"
fi

# 5. actionlint — workflow linter, used by the pre-push hook to catch
# GitHub Actions misuses (paths-filter base, action versions, shell
# quoting in run blocks, etc.) before they hit CI. Lightweight Go binary.
if ! command -v actionlint >/dev/null 2>&1; then
  log "actionlint not found; installing the prebuilt binary into ~/.local/bin"
  arch=$(uname -m)
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  case "$arch" in
    x86_64) actionlint_arch="amd64" ;;
    aarch64|arm64) actionlint_arch="arm64" ;;
    *) fail "Unsupported architecture for actionlint auto-install: $arch" ;;
  esac
  case "$os" in
    linux|darwin) actionlint_os="$os" ;;
    *) fail "Unsupported OS for actionlint auto-install: $os" ;;
  esac
  tmp=$(mktemp -d)
  curl -fsSL \
    "https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_${actionlint_os}_${actionlint_arch}.tar.gz" \
    | tar -xz -C "$tmp" actionlint
  install -m 0755 "$tmp/actionlint" "$HOME/.local/bin/actionlint"
  rm -rf "$tmp"
  log "actionlint: $(actionlint -version | head -n 1)"
fi

# 6. agent-browser — LLM-oriented browser automation CLI used by the
# /visual-validation skill (see .claude/agents/visual-validator.md). Global
# npm install + a one-shot post-install that provisions Chromium for the
# daemon. Skipped on machines without npm (rare in this repo, but the
# install is non-fatal there — the validator surfaces the missing tool as
# a FAIL row rather than the session refusing to start).
if ! command -v agent-browser >/dev/null 2>&1; then
  if command -v npm >/dev/null 2>&1; then
    log "agent-browser not found; installing globally via npm"
    npm install -g agent-browser >/dev/null
    agent-browser install >/dev/null || log "agent-browser install (Chromium provision) failed; /visual-validation will surface this"
    log "agent-browser: $(agent-browser --version 2>/dev/null || echo 'installed')"
  else
    log "npm not available; skipping agent-browser install (/visual-validation will surface this)"
  fi
fi

log "done"
