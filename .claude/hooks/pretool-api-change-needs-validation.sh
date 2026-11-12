#!/usr/bin/env bash
# PreToolUse — a pull request that changes an API carries a technical review.
#
# PR #274 changed 102 files, the request validation of three APIs among them,
# and opened with no /technical-validation report. Six rows of
# docs/quality/feature-cost.md said "no technical validation ran" by then. The
# operator chose the scope on 2026-11-05: a gate on API changes only, because a
# review of every change is too slow.
#
# So the hook refuses a pull request whose diff against main touches
# apps/<app>/api/ unless the same diff adds a technical-validation report under
# docs/features/<app|meta>/<slug>/validation/.
#
# It refuses at the moment the pull request becomes mergeable, not at the
# moment it exists. A draft opens without a report, because a pull request is
# the only way to get a preview, and on PR #298 the preview was the measuring
# instrument: the report this gate asked for reviewed one lever of five, and it
# spent one of the two rounds a branch gets. GitHub refuses to merge a draft,
# so the gate moves to the call that marks it ready.
# See docs/dantotsus/the-review-spent-to-buy-a-preview.md.
#
# It answers the four ways a session reaches that moment:
#   `mcp__github__create_pull_request` without `draft: true`
#   `mcp__github__update_pull_request` with `draft: false`
#   a Bash `gh pr create` without `--draft`
#   a Bash `gh pr ready`
#
# Output contract: exit 0 lets the call run, exit 2 with stderr refuses it.

set -euo pipefail

INPUT="$(cat)"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

TOOL="$(jq -r '.tool_name // ""' <<<"$INPUT")"
DRAFT="$(jq -r '.tool_input.draft | if . == null then "" else tostring end' <<<"$INPUT")"
HEAD_BRANCH="$(jq -r '.tool_input.head // empty' <<<"$INPUT")"

head_of_pull_request() {
  local owner repo
  owner="$(jq -r '.tool_input.owner // empty' <<<"$INPUT")"
  repo="$(jq -r '.tool_input.repo // empty' <<<"$INPUT")"
  [[ -n "$owner" && -n "$repo" && -n "$1" ]] || return 0
  (cd "$REPO_ROOT" && gh api "repos/$owner/$repo/pulls/$1" --jq .head.ref 2>/dev/null) || true
}

case "$TOOL" in
  mcp__github__create_pull_request)
    [[ "$DRAFT" == "true" ]] && exit 0
    ;;
  mcp__github__update_pull_request)
    [[ "$DRAFT" == "false" ]] || exit 0
    HEAD_BRANCH="$(head_of_pull_request "$(jq -r '.tool_input.pullNumber // empty' <<<"$INPUT")")"
    ;;
  *)
    COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
    [[ -n "$COMMAND" ]] || exit 0
    COMMAND="$(printf '%s' "$COMMAND" | python3 "$(dirname "$0")/strip-heredocs.py")"
    INVOCATION='(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+'
    if grep -qE "${INVOCATION}create\b" <<<"$COMMAND"; then
      grep -qE '(^|[[:space:]])(--draft|-d)([[:space:]]|$)' <<<"$COMMAND" && exit 0
      HEAD_BRANCH="$(sed -nE 's/.*--head[ =]([^ ]+).*/\1/p' <<<"$COMMAND")"
    elif grep -qE "${INVOCATION}ready\b" <<<"$COMMAND"; then
      grep -qE '(^|[[:space:]])--undo([[:space:]]|$)' <<<"$COMMAND" && exit 0
    else
      exit 0
    fi
    ;;
esac

# The checkout is shared, so a named head is read from origin, not from HEAD.
# See docs/dantotsus/the-pull-request-hooks-read-the-checkout.md.
COMPARED_HEAD=HEAD
if [[ -n "$HEAD_BRANCH" ]]; then
  git -C "$REPO_ROOT" fetch -q origin main "$HEAD_BRANCH" 2>/dev/null || true
  git -C "$REPO_ROOT" rev-parse -q --verify "origin/$HEAD_BRANCH" >/dev/null && COMPARED_HEAD="origin/$HEAD_BRANCH"
fi

CHANGED="$(git -C "$REPO_ROOT" diff --name-only "origin/main...$COMPARED_HEAD" 2>/dev/null || true)"
API_FILES="$(grep -E '^apps/[^/]+/api/' <<<"$CHANGED" || true)"
[[ -n "$API_FILES" ]] || exit 0
grep -qE '^docs/features/[^/]+/[^/]+/validation/technical-validation-[^/]+\.md$' <<<"$CHANGED" && exit 0

{
  echo "[api-validation] this branch changes $(wc -l <<<"$API_FILES" | tr -d ' ') file(s) under apps/*/api/ and commits no technical-validation report."
  echo "[api-validation] Run /technical-validation, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request or mark it ready."
  echo "[api-validation] If the work is not finished and its preview is what you need next, open the pull request as a draft: a draft deploys its preview, cannot be merged, and meets this gate when it is marked ready."
  echo "[api-validation] First files: $(head -3 <<<"$API_FILES" | tr '\n' ' ')"
} >&2
"$(dirname "$0")/kaizen-refusal.sh" api-validation "made a pull request changing an API mergeable without a technical-validation report"
exit 2
