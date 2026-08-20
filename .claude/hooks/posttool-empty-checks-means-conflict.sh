#!/usr/bin/env bash
# PostToolUse (mcp__github__pull_request_read) — an empty checks list is the
# only symptom a conflicted pull request has, so say so at the moment it is
# read.
#
# A `pull_request` workflow runs against `refs/pull/<n>/merge`, the commit
# GitHub builds by merging the head into the base. A conflict means that ref
# cannot be built, so GitHub creates no workflow run at all — not a failed one,
# not a skipped one. `get_check_runs` answers `{"total_count": 0}` and
# `get_status` answers `pending` with no statuses, forever, and nothing else on
# the pull request says why.
#
# docs/knowledge/a-conflicted-pull-request-gets-no-checks.md has said this since
# 2026-08-18, written after it cost a session on PR #62. It cost another session
# an hour on PR #64 two days later, which is what a knowledge entry cannot fix:
# it is only found by someone who already suspects the answer. This hook is the
# detector that entry was missing — it fires on the reading itself, where the
# wrong conclusion ("Actions must be down") is formed.
#
# Best-effort by contract: it ALWAYS exits 0, and it never asserts the
# conflict — it names the one field that settles it. A pull request can also
# legitimately have no checks before its first workflow starts, and telling the
# reader to go and look is right in both cases.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)

METHOD=$(jq -r '.tool_input.method // empty' <<<"$INPUT")
case "$METHOD" in
  get_check_runs | get_status) ;;
  *) exit 0 ;;
esac

RESPONSE=$(jq -r '.tool_response // empty' <<<"$INPUT")
[ -z "$RESPONSE" ] && exit 0

TOTAL=$(jq -r 'if type == "string" then (fromjson? // {}) else . end | .total_count // empty' <<<"$RESPONSE" 2>/dev/null)
[ "$TOTAL" = "0" ] || exit 0

PR=$(jq -r '.tool_input.pullNumber // "the pull request"' <<<"$INPUT")

cat <<NOTE
[empty-checks] $METHOD returned no checks for pull request $PR.

A conflicted pull request gets NO workflow run at all — GitHub cannot build
refs/pull/<n>/merge, so there is nothing to report and nothing that says why.
An empty checks list looks identical to a dropped webhook or an Actions outage,
and it is almost always the conflict.

Read the one field that settles it before concluding anything else:

  mcp__github__pull_request_read method:get  ->  .mergeable_state

"dirty" means conflict: merge the base branch in, resolve, push, and the checks
come back. See docs/knowledge/a-conflicted-pull-request-gets-no-checks.md.
NOTE

exit 0
