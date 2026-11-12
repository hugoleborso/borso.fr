#!/usr/bin/env bash
# PreToolUse — a pull request that changes an API is reviewed before it merges.
#
# PR #274 changed 102 files, the request validation of three APIs among them,
# and opened with no /technical-validation report. Six rows of
# docs/quality/feature-cost.md said "no technical validation ran" by then. The
# operator chose the scope on 2026-11-05: a gate on API changes only, because a
# review of every change is too slow.
#
# So the hook refuses to merge a pull request whose diff against main touches
# apps/<app>/api/ unless the same diff adds a technical-validation report under
# docs/features/<app|meta>/<slug>/validation/. It answers both ways a session
# merges one: `mcp__github__merge_pull_request` and a Bash `gh pr merge`.
#
# Until 2026-11-12 it refused to open the pull request instead. A pull request
# is the only way to get a preview, and on PR #298 the preview was the
# measuring instrument: the report the hook asked for reviewed two lines of
# code, spent one of the two rounds a branch gets, and the pull request merged
# on a FAIL verdict. The operator moved the gate to the merge that day. What
# the move gives up: API code reaches a preview before any review, and a merge
# the operator makes in GitHub meets no hook.
# See docs/dantotsus/the-review-spent-to-buy-a-preview.md.
#
# Output contract: exit 0 lets the call run, exit 2 with stderr refuses it.

set -euo pipefail

INPUT="$(cat)"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

PULL_REQUEST="$(jq -r '.tool_input.pullNumber // empty' <<<"$INPUT")"
if [[ -z "$PULL_REQUEST" ]]; then
  COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
  [[ -n "$COMMAND" ]] || exit 0
  COMMAND="$(printf '%s' "$COMMAND" | python3 "$(dirname "$0")/strip-heredocs.py")"
  grep -qE '(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge\b' <<<"$COMMAND" || exit 0
  PULL_REQUEST="$(grep -oE 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+[0-9]+' <<<"$COMMAND" | grep -oE '[0-9]+$' || true)"
fi

# The checkout is shared, so a numbered pull request is read at its own head
# commit, over REST, and the checkout's HEAD stands in only when that fails.
# See docs/dantotsus/the-pull-request-hooks-read-the-checkout.md.
git -C "$REPO_ROOT" fetch -q origin main 2>/dev/null || true
COMPARED_HEAD=HEAD
if [[ "$PULL_REQUEST" =~ ^[0-9]+$ ]] && command -v gh >/dev/null 2>&1; then
  OWNER="$(jq -r '.tool_input.owner // "{owner}"' <<<"$INPUT")"
  REPO="$(jq -r '.tool_input.repo // "{repo}"' <<<"$INPUT")"
  HEAD_COMMIT="$(cd "$REPO_ROOT" && gh api "repos/$OWNER/$REPO/pulls/$PULL_REQUEST" --jq .head.sha 2>/dev/null || true)"
  if [[ -n "$HEAD_COMMIT" ]] && { git -C "$REPO_ROOT" cat-file -e "$HEAD_COMMIT^{commit}" 2>/dev/null \
    || git -C "$REPO_ROOT" fetch -q origin "pull/$PULL_REQUEST/head" 2>/dev/null; }; then
    COMPARED_HEAD="$HEAD_COMMIT"
  fi
fi

CHANGED="$(git -C "$REPO_ROOT" diff --name-only "origin/main...$COMPARED_HEAD" 2>/dev/null || true)"
API_FILES="$(grep -E '^apps/[^/]+/api/' <<<"$CHANGED" || true)"
[[ -n "$API_FILES" ]] || exit 0
grep -qE '^docs/features/[^/]+/[^/]+/validation/technical-validation-[^/]+\.md$' <<<"$CHANGED" && exit 0

{
  echo "[api-validation] this pull request changes $(wc -l <<<"$API_FILES" | tr -d ' ') file(s) under apps/*/api/ and its branch commits no technical-validation report."
  echo "[api-validation] Run /technical-validation, commit its report under docs/features/<app>/<slug>/validation/, push, then merge."
  echo "[api-validation] First files: $(head -3 <<<"$API_FILES" | tr '\n' ' ')"
} >&2
"$(dirname "$0")/kaizen-refusal.sh" api-validation "merged a pull request changing an API without a technical-validation report"
exit 2
