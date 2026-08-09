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

# Optional tools install independently of each other. They used to run under
# the script's `set -e` in sequence, so the first one whose download failed
# took every later step with it: a GitHub API 403 while fetching rtk left the
# session with no actionlint, no agent-browser, no /tmp/cdk.out sweep and no
# branch check, and said nothing about any of it. Each failure is now recorded
# and re-stated at the end, because a tool that is quietly absent turns the
# gate that needs it into a gate that skips itself.
missing_optional=()
note_missing() {
  missing_optional+=("$1")
  printf '[install-repo-deps] WARN: %s\n' "$2" >&2
}

# 1. jq — required by the rtk PreToolUse hook
if ! command -v jq >/dev/null 2>&1; then
  fail "jq is missing. Install it: apt-get install jq / brew install jq / etc."
fi

# 2. rtk — install via upstream installer if missing.
# Installer puts the binary in ~/.local/bin; ensure that's on PATH for this run.
export PATH="$HOME/.local/bin:$PATH"
if ! command -v rtk >/dev/null 2>&1; then
  log "rtk not found; installing from rtk-ai/rtk install.sh"
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh || true
fi
if command -v rtk >/dev/null 2>&1; then
  log "rtk: $(rtk --version)"
else
  note_missing rtk "rtk did not install (its installer reads the GitHub API, which answers 403 when rate-limited; pin with RTK_VERSION=vX.Y.Z). The PreToolUse hook passes commands through unrewritten, which costs tokens and breaks nothing."
fi

# 3. pnpm deps
if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm is missing. Enable corepack (corepack enable) or install pnpm 10 manually."
fi
log "running pnpm install"
pnpm install --frozen-lockfile

# 4. AWS CLI v2 — only if the session has AWS creds configured (cloud sessions).
# Local sessions without AWS_ACCESS_KEY_ID set don't pay this install cost.
install_aws_cli() {
  local arch awscli_url tmp
  arch=$(uname -m)
  case "$arch" in
    x86_64) awscli_url="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" ;;
    aarch64) awscli_url="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" ;;
    *) return 1 ;;
  esac
  tmp=$(mktemp -d)
  curl -fsSL "$awscli_url" -o "$tmp/awscliv2.zip" &&
    unzip -q "$tmp/awscliv2.zip" -d "$tmp" &&
    "$tmp/aws/install" --bin-dir "$HOME/.local/bin" --install-dir "$HOME/.local/aws-cli" --update
  local status=$?
  rm -rf "$tmp"
  return $status
}

if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && ! command -v aws >/dev/null 2>&1; then
  log "AWS_ACCESS_KEY_ID is set but aws CLI is missing; installing AWS CLI v2"
  if install_aws_cli; then
    log "aws: $(aws --version)"
  else
    note_missing aws "AWS CLI v2 did not install on $(uname -m). Every 'aws ...' read in a session will fail until it does."
  fi
fi

# 5. actionlint — workflow linter, used by the pre-push hook to catch
# GitHub Actions misuses (paths-filter base, action versions, shell
# quoting in run blocks, etc.) before they hit CI. Lightweight Go binary.
install_actionlint() {
  local arch os actionlint_arch actionlint_os tmp status
  arch=$(uname -m)
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  case "$arch" in
    x86_64) actionlint_arch="amd64" ;;
    aarch64|arm64) actionlint_arch="arm64" ;;
    *) return 1 ;;
  esac
  case "$os" in
    linux|darwin) actionlint_os="$os" ;;
    *) return 1 ;;
  esac
  tmp=$(mktemp -d)
  curl -fsSL \
    "https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_${actionlint_os}_${actionlint_arch}.tar.gz" |
    tar -xz -C "$tmp" actionlint &&
    install -m 0755 "$tmp/actionlint" "$HOME/.local/bin/actionlint"
  status=$?
  rm -rf "$tmp"
  return $status
}

if ! command -v actionlint >/dev/null 2>&1; then
  log "actionlint not found; installing the prebuilt binary into ~/.local/bin"
  install_actionlint || true
fi
if command -v actionlint >/dev/null 2>&1; then
  log "actionlint: $(actionlint -version | head -n 1)"
else
  note_missing actionlint "actionlint did not install. pre-push refuses any push that changes .github/workflows/, so this has to be fixed before shipping a workflow change."
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
    npm install -g agent-browser >/dev/null || true
    agent-browser install >/dev/null 2>&1 || log "agent-browser install (Chromium provision) failed; /visual-validation will surface this"
  else
    log "npm not available; skipping agent-browser install"
  fi
fi
if command -v agent-browser >/dev/null 2>&1; then
  log "agent-browser: $(agent-browser --version 2>/dev/null || echo 'installed')"
else
  note_missing agent-browser "agent-browser did not install; /visual-validation cannot drive a browser and will report a FAIL row rather than a verdict."
fi

# 7. /tmp/cdk.out staging dirs left by previous sessions can fill the
# sandbox disk and break vitest with ENOSPC. CDK's AssetStaging copies
# the asset tree under /tmp/cdk.out<random>/ and doesn't clean up on
# process exit. Wipe them at SessionStart so a long-running sandbox
# can't accrete tens of GBs. See
# docs/knowledge/cdk-out-tmp-fills-the-sandbox-disk.md.
find /tmp -maxdepth 1 -name 'cdk.out*' -type d -exec rm -rf {} + 2>/dev/null || true

# 8. Branch-context check — flag when the current branch is fully merged
# into origin/main, which usually means an orchestrator handoff to a
# stale branch. See
# docs/dantotsus/designated-branch-was-a-merged-pr-head.md.
"$REPO_ROOT/scripts/check-branch-context.sh" || true

if [ ${#missing_optional[@]} -gt 0 ]; then
  printf '[install-repo-deps] WARN: optional tools missing: %s\n' "${missing_optional[*]}" >&2
  printf '[install-repo-deps] WARN: re-run ./scripts/install-repo-deps.sh once the network settles.\n' >&2
fi

log "done"
