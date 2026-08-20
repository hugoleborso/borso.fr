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
#
# These warnings go to stdout, not stderr. The SessionStart hook surfaces only
# stdout in the banner an agent reads at the top of a session, so a warning on
# stderr is a warning nobody sees — which is the failure this whole mechanism
# exists to stop. Observed on the first session to run the fixed script: rtk
# failed, the run correctly carried on, and not one WARN line reached the
# banner.
note_missing() {
  missing_optional+=("$1")
  printf '[install-repo-deps] WARN: %s\n' "$2"
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

# 3b. Build @borso/infra. Its consumers import it by package entry, so every
# app's `cdk/` typecheck — and every `cdk/test/stack.test.ts` — fails with
# "Cannot find module '@borso/infra'" until `dist/` exists. CI builds it before
# `pnpm -r typecheck` and again in each test job; a fresh session starts from a
# clean checkout and had no equivalent, so the first typecheck of a session was
# red for a reason unrelated to whatever was being changed.
#
# Built unconditionally rather than guarded on `dist/` existing, because a
# *stale* dist is its own hazard — see
# docs/dantotsus/shared-deploy-stale-dist.md.
log "building @borso/infra (its dist is what app cdk typechecks resolve)"
pnpm --filter @borso/infra run build ||
  note_missing '@borso/infra dist' "@borso/infra did not build. Every app cdk typecheck and cdk/test/stack.test.ts will fail on \"Cannot find module '@borso/infra'\" until you run: pnpm --filter @borso/infra run build"

# 4. AWS CLI v2 — only if the session has AWS creds that can actually authenticate.
#
# The gate used to be `[ -n "$AWS_ACCESS_KEY_ID" ]`, which a placeholder satisfies.
# Remote sessions arrive with the literal string `proxy-injected` in both credential
# variables, so every one of them installed the CLI, printed its version into the
# SessionStart banner, and handed the agent a tool whose every call fails with
# `InvalidClientTokenId`. One session read that error as an expired key and spent four
# messages diagnosing an account that was never broken.
#
# An IAM access key id is 16-128 chars beginning `AKIA` (user) or `ASIA` (temporary).
# Checking the shape costs nothing and turns a misleading tool into an explicit
# "AWS is unavailable here" line in the banner.
looks_like_aws_access_key() {
  case "${1:-}" in
    AKIA* | ASIA*) [ "${#1}" -ge 16 ] ;;
    *) return 1 ;;
  esac
}
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

if looks_like_aws_access_key "${AWS_ACCESS_KEY_ID:-}"; then
  if command -v aws >/dev/null 2>&1; then
    log "aws: $(aws --version)"
  else
    log "AWS_ACCESS_KEY_ID looks like a real key but aws CLI is missing; installing AWS CLI v2"
    if install_aws_cli; then
      log "aws: $(aws --version)"
    else
      note_missing aws "AWS CLI v2 did not install on $(uname -m). Every 'aws ...' read in a session will fail until it does."
    fi
  fi
elif [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  log "AWS unavailable: AWS_ACCESS_KEY_ID is set to '${AWS_ACCESS_KEY_ID}', which is not an access key id (expected AKIA…/ASIA…). Do not diagnose the AWS account from this — no aws command in this session can authenticate, and nothing is wrong with the account's keys."
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
# agent-browser looks for a browser in its own cache, in the system Chrome
# locations, and in Puppeteer's and Playwright's caches — none of which is
# where this environment keeps one. The managed container ships a Chromium at
# $PLAYWRIGHT_BROWSERS_PATH and asks that nothing download a second copy, so
# the CLI reports "Chrome not found. Run `agent-browser install`" and the
# obvious next step is the one the environment forbids. Pointing its user-level
# config at the browser that is already on disk makes the first `agent-browser
# open` of a session work with no flag at all, which matters because
# `--executable-path` is ignored once a daemon is running: the flag looks like
# it does not work, and the fix is `agent-browser close --all` first.
#
# Only written when absent, so an operator's own config is never overwritten,
# and a no-op on a machine that has no Playwright browsers directory.
browsers_root="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
agent_browser_config="$HOME/.agent-browser/config.json"
if command -v agent-browser >/dev/null 2>&1 && [ ! -f "$agent_browser_config" ]; then
  chromium_binary=""
  if [ -x "$browsers_root/chromium" ]; then
    chromium_binary="$browsers_root/chromium"
  else
    chromium_binary=$(find "$browsers_root" -maxdepth 3 -type f -name chrome -path '*chrome-linux*' 2>/dev/null | sort | tail -n1)
  fi
  if [ -n "$chromium_binary" ]; then
    mkdir -p "$(dirname "$agent_browser_config")"
    printf '{"executablePath":"%s"}\n' "$chromium_binary" > "$agent_browser_config"
    log "agent-browser: pointed at $chromium_binary"
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

# 9. KAIZEN.md — the friction log `/after-task-dantotsus` sweeps at merge.
# Created empty here rather than on first use, because a file that already
# exists gets appended to and a file somebody has to remember to create does
# not: PR 50 maintained none, and its inventory had to be rebuilt from the
# transcript, the commit history and 22 agent journals. Gitignored, so it never
# reaches a commit.
if [ ! -f "$REPO_ROOT/KAIZEN.md" ]; then
  "$REPO_ROOT/scripts/kaizen.sh" init
  log 'KAIZEN.md ready — log friction as you hit it: scripts/kaizen.sh "<what went wrong>"'
else
  kaizen_entries="$(grep -c '^- \[' "$REPO_ROOT/KAIZEN.md" || true)"
  log "KAIZEN.md carries ${kaizen_entries:-0} entries logged earlier in this task"
fi

# 10. The generated files, none of which is committed. Agents read
# blueprint-index.md before writing a file, the pre-write hook reads
# blueprint-context.json on every Write, and the standards reviewer reads
# enforcement-ledger.md; all three read the working tree, so a fresh checkout
# has to produce them before anything asks.
#
# The blueprint group runs here and now, and the rest in the background. That
# hook is best-effort by contract and exits 0 when its lookup is missing, so a
# race would not break a write — it would silently write a file with no
# blueprint in front of it, which is worse than a failure because nothing says
# it happened. Four seconds at session start buys that away; the maps take
# fourteen and nothing in the first turn reads them.
#
# A session is not the only reader. A subagent given its own worktree never
# runs this hook at all, which is why every skill that opens one of these files
# runs `scripts/reports.sh` itself.
log 'generating the lookups an agent reads before its first write'
"$REPO_ROOT/scripts/reports.sh" blueprints >/dev/null 2>&1 || true

log 'generating the reports and the maps in the background'
(
  "$REPO_ROOT/scripts/reports.sh" standards >/dev/null 2>&1 || true
  "$REPO_ROOT/scripts/reports.sh" maps >/dev/null 2>&1 || true
) &

if [ ${#missing_optional[@]} -gt 0 ]; then
  printf '[install-repo-deps] WARN: optional tools missing: %s\n' "${missing_optional[*]}"
  printf '[install-repo-deps] WARN: re-run ./scripts/install-repo-deps.sh once the network settles.\n'
fi

log "done"
