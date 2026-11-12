#!/usr/bin/env bash
# PreToolUse hook for `mcp__github__create_pull_request`.
#
# A feature is one branch and one pull request (`.claude/skills/route/SKILL.md`).
# The operator reviews it on one preview and merges it at once. That rule was a
# sentence, and a sentence did not hold: PR #216 was seven stacked pull
# requests, and on 2026-11-11 one session opened #286, #289 and #292 from
# `main` for work where each needed the one before. Two were closed unmerged
# and their code shipped in the third.
# See docs/dantotsus/three-pull-requests-for-one-afternoon-of-talos.md.
#
# The hook refuses two shapes:
#   1. a base that is not `main`, which is a stacked pull request;
#   2. a pull request from a session that already has one open. Every pull
#      request body ends with its session's address, so the open ones are
#      read from GitHub and matched on it.
#
# Work that is truly independent of the open pull request says so in the new
# body, as `Independent of #<number>: <reason>`, where the operator reads it.
#
# It fails open: with no session id, no `gh`, or no answer from GitHub, the
# call runs. Exit 2 blocks, any other status does not.
set -euo pipefail

INPUT="$(cat)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

OWNER="$(jq -r '.tool_input.owner // empty' <<<"$INPUT")"
REPO="$(jq -r '.tool_input.repo // empty' <<<"$INPUT")"
BASE="$(jq -r '.tool_input.base // empty' <<<"$INPUT")"
BODY="$(jq -r '.tool_input.body // ""' <<<"$INPUT")"
[[ -n "$OWNER" && -n "$REPO" ]] || exit 0

refuse() {
  "$(dirname "$0")/kaizen-refusal.sh" one-pull-request-per-session "$1"
  exit 2
}

if [[ -n "$BASE" && "$BASE" != "main" ]]; then
  {
    echo "[one-pull-request] the base is \`$BASE\`, not \`main\`: this is a stacked pull request."
    echo "[one-pull-request] A feature is one branch and one pull request. Push these commits to the branch of the open pull request, or base this one on \`main\`."
  } >&2
  refuse "opened a pull request stacked on a branch other than main"
fi

SESSION_ID="${CLAUDE_CODE_REMOTE_SESSION_ID:-}"
SESSION_ID="${SESSION_ID#cse_}"
[[ -n "$SESSION_ID" ]] || exit 0

OPEN="$(cd "$REPO_ROOT" && gh api "repos/$OWNER/$REPO/pulls?state=open&per_page=100" \
  --jq ".[] | select((.body // \"\") | contains(\"session_$SESSION_ID\")) | \"\(.number)\t\(.head.ref)\"" 2>/dev/null || true)"
[[ -n "$OPEN" ]] || exit 0

UNDECLARED=""
while IFS=$'\t' read -r number branch; do
  [[ -n "$number" ]] || continue
  grep -qE "Independent of #$number\b" <<<"$BODY" && continue
  UNDECLARED+="  #$number on \`$branch\`"$'\n'
done <<<"$OPEN"
[[ -n "$UNDECLARED" ]] || exit 0

{
  echo "[one-pull-request] this session already has a pull request open:"
  printf '%s' "$UNDECLARED"
  echo "[one-pull-request] Keep working in it: push the new commits to its branch and update its body. One preview, one merge."
  echo "[one-pull-request] If the new work shares no file and no behaviour with it, say so in the new body as \`Independent of #<number>: <reason>\`."
} >&2
refuse "opened a second pull request while the session already had one open"
