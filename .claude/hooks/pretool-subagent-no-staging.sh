#!/usr/bin/env bash
# PreToolUse hook for git commands that write the index, run by a subagent in
# the main checkout.
#
# Every agent of a session shares the main checkout's one index, and the main
# session commits by explicit paths. A subagent that stages a file puts it in
# the next commit of whoever commits first. CLAUDE.md said so in prose, and on
# PR #327 a subagent told not to stage ran `git mv`, which stages the rename,
# and had to remember to unstage it.
#
# Claude Code sets `agent_id` on every hook input fired inside a subagent and
# leaves it out in the main session. A linked worktree has its own index, so a
# workflow subagent committing on its worktree branch passes.
#
# See docs/dantotsus/a-rename-that-staged-itself.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct.

set -euo pipefail

INPUT="$(cat)"

AGENT_ID="$(jq -r '.agent_id // ""' <<<"$INPUT")"
if [[ -z "$AGENT_ID" ]]; then exit 0; fi

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

STAGING_PATTERN='(^|[;&|(]|\bthen\b|\bdo\b)[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(add|mv|rm|commit)([[:space:]]|$)'
STAGING="$(grep -oE "$STAGING_PATTERN" <<<"$COMMAND_TO_RUN" | head -1 || true)"
if [[ -z "$STAGING" ]]; then exit 0; fi

TARGET="$(jq -r '.cwd // empty' <<<"$INPUT")"
TARGET="${TARGET:-$PWD}"
LEADING_CD="$(sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&|]+).*/\1/p' <<<"$COMMAND_TO_RUN")"
[ -n "$LEADING_CD" ] && TARGET="$LEADING_CD"
EXPLICIT_DIRECTORY="$(sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p' <<<"$STAGING")"
[ -n "$EXPLICIT_DIRECTORY" ] && TARGET="$EXPLICIT_DIRECTORY"

OWN_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-dir 2>/dev/null || true)"
SHARED_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [[ -z "$OWN_GIT_DIR" || "$OWN_GIT_DIR" != "$SHARED_GIT_DIR" ]]; then exit 0; fi

echo "[subagent-no-staging] A subagent shares this checkout's index with every other agent, and the main session commits." >&2
echo "[subagent-no-staging] Change the working tree only, and name the paths in your report:" >&2
echo "[subagent-no-staging]   git mv a b  ->  mv a b       git rm a  ->  rm a       git add, git commit  ->  nothing" >&2
"$(dirname "$0")/kaizen-refusal.sh" subagent-no-staging "a subagent ran a git command that writes the shared index"
exit 2
