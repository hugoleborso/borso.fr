#!/usr/bin/env bash
# PreToolUse hook for `gh pr create` invocations.
#
# Refuses to let the command run unless the PR body satisfies the
# /open-pr standard (`.claude/skills/open-pr/standard.md`):
#   - ≥ 800 characters
#   - ≥ 3 `<details>` blocks (progressive-disclosure pattern)
#   - a `## Validation` block when the feature has validation reports
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is
#     surfaced to the agent so it can self-correct. Exit 1 does NOT block:
#     the harness treats any non-zero-but-not-2 code as a non-blocking
#     error, prints it, and runs the command anyway.
#
# The hook never edits the command. The /open-pr skill is the only path
# that produces a compliant body.

set -euo pipefail

# Read the tool-input JSON from stdin (Claude Code hook contract).
INPUT="$(cat)"

# Only act on Bash invocations of `gh pr create`. Everything else is
# passed through.
COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

# Match an invocation, not a mention. Heredoc bodies are dropped first,
# because a commit message or a documentation edit that quotes the command
# is text being written rather than a pull request being opened: the first
# commit of the sweep that armed this hook was refused by it for saying the
# words. What survives that strip still has to carry the command at the head
# of a segment, which is the only place a shell would run it from.
COMMAND_TO_RUN="$(printf '%s' "$COMMAND" | python3 "$(dirname "$0")/strip-heredocs.py")"

if ! grep -qE '(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+create\b' <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

block() {
  echo "[open-pr] $1" >&2
  echo "[open-pr] Use the /open-pr skill to draft a progressive-disclosure PR body." >&2
  echo "[open-pr] See .claude/skills/open-pr/SKILL.md." >&2
  exit 2
}

# Extract the body. Two shapes:
#   gh pr create … --body "literal"
#   gh pr create … --body-file <path>
# `--body-file -` reads stdin, which the hook can't inspect — treat as
# rich and let the skill be the gatekeeper if it called us.
BODY=""
if grep -qE -- '--body-file\b' <<<"$COMMAND_TO_RUN"; then
  BODY_PATH="$(sed -E 's/.*--body-file[ =]([^ ]+).*/\1/' <<<"$COMMAND_TO_RUN")"
  if [[ "$BODY_PATH" == "-" ]]; then exit 0; fi
  if [[ ! -f "$BODY_PATH" ]]; then
    block "--body-file points at a missing path: $BODY_PATH"
  fi
  BODY="$(cat "$BODY_PATH")"
elif grep -qE -- '--body\b' <<<"$COMMAND_TO_RUN"; then
  # Heuristic: capture everything between the first `--body "..."` quotes.
  # POSIX-portable via sed; if the operator passed something exotic, the
  # length / details checks below catch a short body anyway.
  BODY="$(sed -nE 's/.*--body[ =]"([^"]*)".*/\1/p' <<<"$COMMAND_TO_RUN")"
  if [[ -z "$BODY" ]]; then
    BODY="$(sed -nE "s/.*--body[ =]'([^']*)'.*/\\1/p" <<<"$COMMAND_TO_RUN")"
  fi
else
  block "no --body / --body-file flag — PRs without a body are rejected."
fi

BODY_LENGTH=${#BODY}
if (( BODY_LENGTH < 800 )); then
  block "PR body is too short ($BODY_LENGTH chars; threshold 800). A description that fits in a tweet underserves reviewers."
fi

DETAILS_COUNT=$(grep -oE '<details' <<<"$BODY" | wc -l | tr -d '[:space:]')
if (( DETAILS_COUNT < 3 )); then
  block "PR body has only ${DETAILS_COUNT} <details> blocks (need ≥ 3). Reviewers can't navigate three levels of disclosure without them."
fi

# Validation block check — only enforced when the feature has at least
# one validation report under docs/features/.
HAS_VALIDATION_DIR=$(find docs/features -type d -name validation 2>/dev/null | head -n1)
if [[ -n "$HAS_VALIDATION_DIR" ]] && ! grep -qE '^## Validation\b' <<<"$BODY"; then
  block "no '## Validation' section in the body, but docs/features has validation reports. Surface the verdicts up-front."
fi

# Everything checked out. Let `gh pr create` run.
exit 0
