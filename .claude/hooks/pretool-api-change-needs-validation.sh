#!/usr/bin/env bash
# PreToolUse — a pull request that changes an API carries a technical review.
#
# PR #274 changed 102 files, the request validation of three APIs among them,
# and opened with no /technical-validation report. Six rows of
# docs/quality/feature-cost.md said "no technical validation ran" by then. The
# operator chose the scope on 2026-11-05: a gate on API changes only, because a
# review of every change is too slow.
#
# So the hook refuses to open a pull request whose diff against main touches
# apps/<app>/api/ unless the same diff adds a technical-validation report under
# docs/features/<app|meta>/<slug>/validation/. It answers both ways a session
# opens one: `mcp__github__create_pull_request` and a Bash `gh pr create`.
#
# The operator added the front end on 2026-11-14: 7 of the 8 latest pragma
# features had opened with no /visual-validation report. A diff that touches
# source under apps/<app>/site/ (tests and markdown aside) must add a
# visual-validation report the same way.
#
# Output contract: exit 0 lets the call run, exit 2 with stderr refuses it.

set -euo pipefail

INPUT="$(cat)"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

HEAD_BRANCH="$(jq -r '.tool_input.head // empty' <<<"$INPUT")"
if [[ -z "$HEAD_BRANCH" ]]; then
  COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
  [[ -n "$COMMAND" ]] || exit 0
  COMMAND="$(printf '%s' "$COMMAND" | python3 "$(dirname "$0")/strip-heredocs.py")"
  grep -qE '(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+create\b' <<<"$COMMAND" || exit 0
  HEAD_BRANCH="$(sed -nE 's/.*--head[ =]([^ ]+).*/\1/p' <<<"$COMMAND")"
fi

# The checkout is shared, so a named head is read from origin, not from HEAD.
# See docs/dantotsus/the-pull-request-hooks-read-the-checkout.md.
COMPARED_HEAD=HEAD
if [[ -n "$HEAD_BRANCH" ]]; then
  git -C "$REPO_ROOT" fetch -q origin main "$HEAD_BRANCH" 2>/dev/null || true
  git -C "$REPO_ROOT" rev-parse -q --verify "origin/$HEAD_BRANCH" >/dev/null && COMPARED_HEAD="origin/$HEAD_BRANCH"
fi

CHANGED="$(git -C "$REPO_ROOT" diff --name-only "origin/main...$COMPARED_HEAD" 2>/dev/null || true)"
API_FILES="$(grep -E '^apps/[^/]+/api/' <<<"$CHANGED" || true)"
SITE_FILES="$(grep -E '^apps/[^/]+/site/' <<<"$CHANGED" | grep -vE '\.(test\.tsx?|md)$' || true)"

if [[ -n "$API_FILES" ]] && ! grep -qE '^docs/features/[^/]+/[^/]+/validation/technical-validation-[^/]+\.md$' <<<"$CHANGED"; then
  {
    echo "[api-validation] this branch changes $(wc -l <<<"$API_FILES" | tr -d ' ') file(s) under apps/*/api/ and commits no technical-validation report."
    echo "[api-validation] Run /technical-validation, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request."
    echo "[api-validation] Run it on finished work. A branch gets two rounds, and a round run on unfinished code to get past this gate is spent: PR #298 merged on a FAIL verdict that way."
    echo "[api-validation] If the work needs its preview before it is finished, ask the operator."
    echo "[api-validation] First files: $(head -3 <<<"$API_FILES" | tr '\n' ' ')"
  } >&2
  "$(dirname "$0")/kaizen-refusal.sh" api-validation "opened a pull request changing an API without a technical-validation report"
  exit 2
fi

if [[ -n "$SITE_FILES" ]] && ! grep -qE '^docs/features/[^/]+/[^/]+/validation/visual-validation-[^/]+\.md$' <<<"$CHANGED"; then
  {
    echo "[visual-validation] this branch changes $(wc -l <<<"$SITE_FILES" | tr -d ' ') front-end file(s) under apps/*/site/ and commits no visual-validation report."
    echo "[visual-validation] Run /visual-validation once the work is finished, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request."
    echo "[visual-validation] First files: $(head -3 <<<"$SITE_FILES" | tr '\n' ' ')"
  } >&2
  "$(dirname "$0")/kaizen-refusal.sh" visual-validation "opened a pull request changing a front end without a visual-validation report"
  exit 2
fi
