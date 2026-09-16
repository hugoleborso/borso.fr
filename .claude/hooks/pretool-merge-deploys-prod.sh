#!/usr/bin/env bash
# PreToolUse (mcp__github__merge_pull_request) — merging to `main` is the prod
# deploy, so name what it is about to deploy before it happens.
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
# Best-effort by contract: it ALWAYS exits 0. It never blocks a merge — the
# operator's instruction is the gate, and a gate that guesses would be the
# confirmation step CLAUDE.md says not to add.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)

BASE_BRANCH=main
SHARED_SNAPSHOT=infra/shared/test/unit/__snapshots__/borso-shared.template.json

PR=$(jq -r '.tool_input.pullNumber // empty' <<<"$INPUT")
[ -n "$PR" ] || exit 0

# The diff is read from the local checkout, which may be behind. Anything that
# cannot be determined is reported as unknown rather than as absent, because a
# silent "no" is the failure this hook exists to prevent.
CHANGED=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  CHANGED=$(git diff --name-only "origin/$BASE_BRANCH...HEAD" 2>/dev/null || true)
fi

if [ -z "$CHANGED" ]; then
  APPS="unknown from this checkout — read the pull request's Files changed tab"
  SHARED="unknown from this checkout"
else
  APPS=$(printf '%s\n' "$CHANGED" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u | tr '\n' ' ')
  [ -n "$CHANGED" ] && printf '%s\n' "$CHANGED" | grep -q '^\(infra/cdk\|pnpm-lock.yaml\|pnpm-workspace.yaml\)' && APPS="${APPS}(plus every app, via infra/cdk or the lockfile) "
  [ -z "$APPS" ] && APPS="none"
  if printf '%s\n' "$CHANGED" | grep -qF "$SHARED_SNAPSHOT"; then
    SHARED="YES — the committed borso-shared template moved, so a shared-deploy dispatch is owed after this merge"
  else
    SHARED="no — the committed borso-shared template is unchanged in this diff"
  fi
fi

cat <<NOTE
[merge-deploys-prod] merging pull request $PR into $BASE_BRANCH deploys to production.

There is no approval step after this call. Pushing to $BASE_BRANCH runs
.github/workflows/deploy.yml, which deploys each affected application to prod
automatically. The merge is the gate, and this call is the merge.

  Applications this diff touches: $APPS
  shared-deploy dispatch owed:    $SHARED

Merge only on an explicit instruction from the operator for THIS pull request.
After it lands, surface both post-merge follow-ups CLAUDE.md requires: the
shared-deploy dispatch when the snapshot moved, and /after-task-dantotsus.
NOTE

exit 0
