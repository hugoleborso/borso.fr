#!/usr/bin/env bash
# Install everything the repo needs to function. Idempotent — safe to re-run.
#
# Used in two places:
#   - SessionStart hook in .claude/settings.json (every Claude session)
#   - Manual bootstrap on a fresh checkout
#
# Installs:
#   - pnpm workspace dependencies
#   - AWS CLI v2 (only when AWS_ACCESS_KEY_ID is set in the env, e.g. on
#     claude.ai/code remote sessions configured per docs/aws-setup.md §12)
#
# Pre-requisites the script does NOT install:
#   - jq (read by every hook in .claude/settings.json) — apt-get install jq / brew install jq
#   - pnpm (provided via corepack from the packageManager field)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log() { printf '[install-repo-deps] %s\n' "$*"; }
fail() { printf '[install-repo-deps] ERROR: %s\n' "$*" >&2; exit 1; }

# Optional tools install independently of each other. They used to run under
# the script's `set -e` in sequence, so the first one whose download failed
# took every later step with it: a GitHub API 403 while fetching one tool left the
# session with no actionlint, no agent-browser, no /tmp/cdk.out sweep and no
# branch check, and said nothing about any of it. Each failure is now recorded
# and re-stated at the end, because a tool that is quietly absent turns the
# gate that needs it into a gate that skips itself.
missing_optional=()
#
# These warnings go to stdout, not stderr. The SessionStart hook surfaces only
# stdout in the banner an agent reads at the top of a session, so a warning on
# stderr is a warning nobody sees — which is the failure this whole mechanism
# exists to stop. Observed on the first session to run the fixed script: one
# tool failed, the run correctly carried on, and not one WARN line reached the
# banner.
note_missing() {
  missing_optional+=("$1")
  printf '[install-repo-deps] WARN: %s\n' "$2"
}

# 1. jq — required by every hook in .claude/settings.json
if ! command -v jq >/dev/null 2>&1; then
  fail "jq is missing. Install it: apt-get install jq / brew install jq / etc."
fi

# 2. ~/.local/bin holds the tools installed below; put it on PATH for this run.
export PATH="$HOME/.local/bin:$PATH"

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

# 3c. Full history. A hosted session can start from a shallow clone, and then
# every commit older than the cut-off is absent: a dantotsu audit read 53 fix
# commits as dangling until someone ran the fetch by hand. The dantotsu check
# refuses a shallow clone; this makes sure a session never starts in one.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
  log "this clone is shallow; fetching the full history so old commits resolve"
  git fetch --quiet --unshallow origin ||
    note_missing 'full git history' "git fetch --unshallow failed, so commits older than the clone's cut-off do not resolve. Run it by hand before reading any dantotsu's fix-commits."
fi

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
# /visual-validation skill (see plugins/borso-harness/agents/visual-validator.md). Global
# npm install + a one-shot post-install that provisions Chromium for the
# daemon. Skipped on machines without npm (rare in this repo, but the
# install is non-fatal there — the validator surfaces the missing tool as
# a FAIL row rather than the session refusing to start).
#
# The global binary is held to the version package.json pins. The hosted image
# ships its own agent-browser, 0.27.0 on 2026-10-29, and every agent ran that
# one while the knowledge entries were verified on the pin. 0.27.0 let a
# `network route '**/api/streaks*' --abort` through with a 200 and printed
# Done; 0.35.2 aborted it. See
# docs/dantotsus/the-browser-on-path-was-not-the-pinned-one.md.
pinned_agent_browser=$(node -p "require('./package.json').devDependencies['agent-browser'] ?? ''" 2>/dev/null || true)
global_agent_browser=$(agent-browser --version 2>/dev/null | sed -n 's/^agent-browser //p' || true)
if command -v npm >/dev/null 2>&1; then
  if [ -z "$global_agent_browser" ]; then
    log "agent-browser not found; installing ${pinned_agent_browser:-latest} globally via npm"
    npm install -g "agent-browser@${pinned_agent_browser:-latest}" >/dev/null || true
    agent-browser install >/dev/null 2>&1 || log "agent-browser install (Chromium provision) failed; /visual-validation will surface this"
  elif [ -n "$pinned_agent_browser" ] && [ "$global_agent_browser" != "$pinned_agent_browser" ]; then
    log "agent-browser $global_agent_browser on PATH, $pinned_agent_browser pinned; installing the pin globally"
    npm install -g "agent-browser@$pinned_agent_browser" >/dev/null ||
      note_missing agent-browser "agent-browser $pinned_agent_browser did not install, so $global_agent_browser drives the browser and the knowledge entries may not describe it."
  fi
elif [ -z "$global_agent_browser" ]; then
  log "npm not available; skipping agent-browser install"
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

# 9. KAIZEN.md — the friction log `/after-task-kaizen` sweeps at merge. It is
# created at session start rather than on first use, because a file that
# already exists gets appended to and one somebody has to remember to create
# does not: PR 50 maintained none. The `kaizen.sh init` SessionStart entry in
# .claude/settings.json owns it, including parking a log another session left
# behind; calling init here as well raced that entry over the same rename.
log 'KAIZEN.md is opened by kaizen.sh init — log friction as you hit it: scripts/kaizen.sh "<what went wrong>"'

# 10. The two generated lookups a session reads, neither of which is
# committed: the blueprint index agents read before writing a file, and the
# knowledge-trigger lookup the knowledge hook reads on every call. Every other
# report is on demand, through `scripts/reports.sh <group>`. A subagent given
# its own worktree never runs this hook at all, which is why every skill that
# opens one of these files runs `scripts/reports.sh` itself.
log 'generating the blueprint index and the knowledge-trigger lookup'
"$REPO_ROOT/scripts/reports.sh" index >/dev/null 2>&1 || true

if [ ${#missing_optional[@]} -gt 0 ]; then
  printf '[install-repo-deps] WARN: optional tools missing: %s\n' "${missing_optional[*]}"
  printf '[install-repo-deps] WARN: re-run ./scripts/install-repo-deps.sh once the network settles.\n'
fi

log "done"
