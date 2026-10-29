#!/usr/bin/env bash
# PreToolUse — merging to `main` is the prod deploy, so name what it is about to
# deploy before it happens.
#
# CLAUDE.md said, for months, that only the human can merge to `main` ("Claude
# cannot"), and built the case for automatic prod deploys on it: the merge IS
# the gate. On PR #95 the operator asked Claude to merge and Claude merged.
# Nothing in this repository can see a branch-protection rule, so the sentence
# was never checkable — it was a belief about the harness written in a file
# that cannot observe the harness, exactly what CLAUDE.md's own last "Don't"
# forbids.
#
# The honest replacement is not a confirmation prompt. CLAUDE.md rules that out
# for owner-triggered deploys in a one-person lab, and prefers making the
# consequence visible beforehand. So this hook prints the consequence: which
# applications this merge will deploy to production, and whether the merge owes
# a `shared-deploy` dispatch afterwards.
#
# It answers two tool shapes, because there are two ways to merge from here and
# for months it watched only one. Registered on `mcp__github__merge_pull_request`
# alone, it stayed silent through PR #199's `gh pr merge` in a Bash call, and six
# applications deployed to production with nothing printed. See
# docs/dantotsus/the-merge-whose-blast-radius-nobody-printed.md.
#
# The application list is NOT computed here. `scripts/pr/deploy-fanout.ts` holds
# the rule, mirrors deploy.yml's own fan-out, and is covered per file, so the
# hook and a pull-request body cannot answer the question differently.
#
# The notice goes back as `additionalContext`, not on stdout. A PreToolUse
# hook's plain stdout reaches the debug log and not the model, which is how the
# first fix to this hook half-missed: it started firing on `gh pr merge`, printed
# the blast radius, and the session merged PR #202 without ever seeing it. A
# hook that runs and is inaudible is the same defect as a hook that never runs.
#
# Best-effort by contract: it ALWAYS exits 0. It never blocks a merge — the
# operator's instruction is the gate, and a gate that guesses would be the
# confirmation step CLAUDE.md says not to add.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
BASE_BRANCH=main
SHARED_SNAPSHOT=infra/shared/test/unit/__snapshots__/borso-shared.template.json
STRIP_HEREDOCS="$REPO_ROOT/plugins/borso-harness/hooks/strip-heredocs.py"
FANOUT="$REPO_ROOT/scripts/pr/deploy-fanout.ts"
TSX="$REPO_ROOT/node_modules/.bin/tsx"

PR=$(jq -r '.tool_input.pullNumber // empty' <<<"$INPUT")

if [ -z "$PR" ]; then
  # The Bash shape. Match an invocation, not a mention: a commit message or a
  # documentation edit that quotes the command is text being written, and the
  # heredoc that carries it is dropped before matching, as every other Bash
  # hook here does.
  COMMAND=$(jq -r '.tool_input.command // ""' <<<"$INPUT")
  [ -n "$COMMAND" ] || exit 0
  if [ -x "$STRIP_HEREDOCS" ] || [ -f "$STRIP_HEREDOCS" ]; then
    COMMAND=$(printf '%s' "$COMMAND" | python3 "$STRIP_HEREDOCS" 2>/dev/null || printf '%s' "$COMMAND")
  fi
  grep -qE '(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge\b' <<<"$COMMAND" || exit 0
  PR=$(grep -oE 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+[0-9]+' <<<"$COMMAND" | grep -oE '[0-9]+$' || true)
  [ -n "$PR" ] || PR='the current branch'
fi

# Anything that cannot be determined is reported as unknown rather than as
# absent, because a silent "no" is the failure this hook exists to prevent.
if [ -x "$TSX" ] && [ -f "$FANOUT" ]; then
  APPS=$(cd "$REPO_ROOT" && "$TSX" "$FANOUT" "origin/$BASE_BRANCH" HEAD 2>/dev/null) \
    || APPS="unknown from this checkout — read the pull request's Files changed tab"
else
  APPS="unknown — scripts/pr/deploy-fanout.ts did not run in this checkout"
fi

CHANGED=$(cd "$REPO_ROOT" && git diff --name-only "origin/$BASE_BRANCH...HEAD" 2>/dev/null || true)
if [ -z "$CHANGED" ]; then
  SHARED="unknown from this checkout"
elif printf '%s\n' "$CHANGED" | grep -qF "$SHARED_SNAPSHOT"; then
  SHARED="YES — the committed borso-shared template moved, so a shared-deploy dispatch is owed after this merge"
else
  SHARED="no — the committed borso-shared template is unchanged in this diff"
fi

NOTICE="[merge-deploys-prod] merging pull request $PR into $BASE_BRANCH deploys to production.

There is no approval step after this call. Pushing to $BASE_BRANCH runs
.github/workflows/deploy.yml, which deploys each affected application to prod
automatically. The merge is the gate, and this call is the merge.

  Applications this merge deploys: $APPS
  shared-deploy dispatch owed:     $SHARED

Merge only on an explicit instruction from the operator for THIS pull request.
After it lands, surface both post-merge follow-ups CLAUDE.md requires: the
shared-deploy dispatch when the snapshot moved, and a kaizen for
/after-task-kaizen in a new conversation, never in this one. Propose the
kaizen; call spawn_task only once the operator approves it."

jq -n --arg context "$NOTICE" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $context}}'

exit 0
