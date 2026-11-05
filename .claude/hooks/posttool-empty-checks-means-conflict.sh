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
#
# It also speaks on a list that is not finished, or not whole. On PR #206 the
# orchestrator told the operator CI was green while a job was still running, and
# a list read with a page size shows a few runs of a total it names in the same
# answer. Both read as "every check I can see passed". The hook names the runs
# still going and the runs the page left out, because "green" is a claim about
# all of them. See docs/dantotsus/green-said-of-a-run-still-going.md.
#
# It answers with `additionalContext`: plain stdout from a PostToolUse hook
# reaches the debug log and not the model, which is what this hook printed into
# until 2026-10-10. See docs/adr/0030-knowledge-is-delivered-by-trigger.md.

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

PARSED=$(jq -c 'if type == "string" then (fromjson? // {}) else . end' <<<"$RESPONSE" 2>/dev/null)
TOTAL=$(jq -r '.total_count // empty' <<<"$PARSED" 2>/dev/null)
PR=$(jq -r '.tool_input.pullNumber // "the pull request"' <<<"$INPUT")

if [ "$TOTAL" != "0" ]; then
  [ "$METHOD" = get_check_runs ] || exit 0
  jq -e '.check_runs | type == "array"' <<<"$PARSED" >/dev/null 2>&1 || exit 0
  SHOWN=$(jq -r '.check_runs | length' <<<"$PARSED")
  RUNNING=$(jq -r '[.check_runs[] | select(.status != "completed") | .name] | join(", ")' <<<"$PARSED")
  [ -z "$RUNNING" ] && [ "$SHOWN" -ge "${TOTAL:-0}" ] && exit 0
  NOTE="[unfinished-checks] get_check_runs for pull request $PR is not a verdict yet."
  if [ -n "$RUNNING" ]; then
    NOTE="$NOTE
Still running: $RUNNING. CI is not green until every run has completed;
say which are still going rather than calling the rest green."
  fi
  if [ "$SHOWN" -lt "${TOTAL:-0}" ]; then
    NOTE="$NOTE
This page shows $SHOWN of $TOTAL runs. Read the rest (perPage up to 100, or the
next page) before saying anything about all of them."
  fi
  jq -n --arg context "$NOTE" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $context}}'
  exit 0
fi

NOTE=$(
  cat <<NOTE
[empty-checks] $METHOD returned no checks for pull request $PR.

A conflicted pull request gets NO workflow run at all — GitHub cannot build
refs/pull/<n>/merge, so there is nothing to report and nothing that says why.
An empty checks list looks identical to a dropped webhook or an Actions outage,
and it is almost always the conflict.

Read the one field that settles it before concluding anything else:

  mcp__github__pull_request_read method:get  ->  .mergeable_state

"dirty" means conflict: merge the base branch in, resolve, push, and the checks
come back. See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/a-conflicted-pull-request-gets-no-checks.md.
NOTE
)

jq -n --arg context "$NOTE" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $context}}'

exit 0
