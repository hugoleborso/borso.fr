#!/usr/bin/env bash
# PreToolUse hook for branch switches in a local repository's main checkout.
#
# On a laptop, every session the operator opens on this repository without a
# worktree works in the same folder. A `git switch` there moves every one of
# them. On PR #243 one session switched the folder to its own branch while
# another was mid-task, and the second session's three commits landed on the
# first one's branch. Neither session could see the other from git alone.
#
# A linked worktree has its own HEAD, so a switch there moves nobody else. A
# hosted session owns its container, so its checkout is not shared. Both pass.
#
# See docs/dantotsus/the-pull-request-hooks-read-the-checkout.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct.

set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && exit 0

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

SWITCH_PATTERN='(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(switch|checkout)\b[^;&|]*'
SWITCH="$(grep -oE "$SWITCH_PATTERN" <<<"$COMMAND_TO_RUN" | head -1 || true)"
if [[ -z "$SWITCH" ]]; then exit 0; fi

# A path restore keeps the branch: `git checkout -- <file>` or `--patch`.
if grep -qE '[[:space:]](--|-p|--patch)([[:space:]]|$)' <<<"$SWITCH"; then exit 0; fi

TARGET="$(jq -r '.cwd // empty' <<<"$INPUT")"
TARGET="${TARGET:-$PWD}"
LEADING_CD="$(sed -nE 's/^[[:space:]]*cd[[:space:]]+([^[:space:];&|]+).*/\1/p' <<<"$COMMAND_TO_RUN")"
[ -n "$LEADING_CD" ] && TARGET="$LEADING_CD"
EXPLICIT_DIRECTORY="$(sed -nE 's/.*git[[:space:]]+-C[[:space:]]+([^[:space:]]+).*/\1/p' <<<"$SWITCH")"
[ -n "$EXPLICIT_DIRECTORY" ] && TARGET="$EXPLICIT_DIRECTORY"

OWN_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-dir 2>/dev/null || true)"
SHARED_GIT_DIR="$(git -C "$TARGET" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [[ -z "$OWN_GIT_DIR" || "$OWN_GIT_DIR" != "$SHARED_GIT_DIR" ]]; then exit 0; fi

echo "[no-shared-checkout-switch] $TARGET is the main checkout, and other local sessions work in it too." >&2
echo "[no-shared-checkout-switch] A branch switch here moves their HEAD, and their next commit lands on your branch." >&2
echo "[no-shared-checkout-switch] Work on a branch in a worktree of your own:" >&2
echo "[no-shared-checkout-switch]   git worktree add <scratchpad>/<label> -b <branch> origin/main" >&2
echo "[no-shared-checkout-switch] To discard a file's changes, use git restore <file>, which leaves the branch alone." >&2
"$(dirname "$0")/kaizen-refusal.sh" no-shared-checkout-switch "switched branches in the main checkout other local sessions share"
exit 2
