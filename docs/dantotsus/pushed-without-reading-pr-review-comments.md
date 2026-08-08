---
date: 2026-05-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/24
fix-pr: https://github.com/hugoleborso/borso.fr/pull/<TBD>
fix-commits: []
eradication-level: 4
time-to-detect: hours
tags: [harness, github, hooks, pre-push, workflow]
---

# Pushed two commits to a PR branch without reading any review thread

## Symptom

The agent worked on a branch with an open PR (#24, eight review
threads, three unresolved), and pushed two commits without ever
calling `mcp__github__pull_request_read get_review_comments`. The
user surfaced it explicitly:

> *« Est-ce que tu avais correctement lu les commentaires sur la
> PR au fait ? »*

The agent had to apologise and run the missing fetch *after* the
push. The unread threads were exactly the input the agent needed
to write commits — three of them were direct guidance for the
exact areas the agent was about to touch (library-search,
sanitiser claims, custom-script justification).

## Root-cause chain

1. **Why didn't the agent fetch review comments before pushing?**
   No step in the agent's commit-and-push flow says *"if this
   branch has an open PR, the unresolved review threads must be
   fetched before adding new commits"*. The agent reasoned about
   the local task (SPA fallback) and shipped it; the PR-side
   review context was invisible.
2. **Why isn't there such a step?**
   The repo's *outbound* PR-creation flow has the
   [`/open-pr`](../../.claude/skills/open-pr/SKILL.md) skill that
   walks the body before posting. The *follow-up* flow — pushing
   new commits to an *existing* PR — has no symmetric anchor.
   The agent's mental model treated the second push as "more of
   the same work", not as "an iteration that should integrate
   reviewer feedback".
3. **Why didn't the existing Husky `pre-push` hook catch this?**
   It runs `pnpm exec knip` and that's it. It has no awareness
   of GitHub state.

**Root cause:** *thought* the local task drives the next commit,
*actually* on a branch with an open PR, the *reviewer's
unresolved comments* drive the next commit. No procedural anchor
in the harness binds *"push to a `claude/*` branch with an open
PR"* → *"fetch the open review threads first"*.

## Detection failure causes

- **Husky pre-push** — does not look at GitHub state.
- **CI** — irrelevant; CI runs on the push, after the gap.
- **Operator review** — caught it, but only after one more cycle
  of "agent pushes again, user re-reads what landed". That's
  exactly the wasted-attention pattern the *Self-improvement
  loop* exists to prevent.

## Countermeasure

The agent fetched the threads (`mcp__github__pull_request_read
get_review_comments`), classified the three unresolved ones,
investigated, and shipped fixes in commit
[`2a4ecfc`](https://github.com/hugoleborso/borso.fr/commit/2a4ecfc) —
in the same PR, on the next push.

## Eradication (mandatory — code-level)

**Type:** detection nudge (level 4) — the Husky `pre-push` hook
prints a reminder when the branch being pushed matches
`claude/*` (the convention for agent-authored branches with an
open PR). The reminder lands in the agent's tool-output stream
and the next response addresses it before the push narrative
continues.

Level 2 alternative considered (a hard gate that REJECTS the
push unless the agent has called the MCP review-comments fetch
this session): rejected. The hook can't see prior MCP calls in
the session; the harness gives no telemetry surface to inspect
"has the agent read the threads?". A hard gate would either
block legitimate first-pushes (no PR exists yet) or rely on a
heuristic the agent can game.

**Reference:** [PR #<TBD>](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-24) ·
this kaizen PR.

**The actual fix:**

```diff
 # .husky/pre-push
 #!/usr/bin/env bash
 
 set -euo pipefail
 
 echo "[pre-push] running knip"
 pnpm exec knip
 
+# Detection nudge: on agent-authored branches (claude/*), the
+# branch likely has an open PR with unresolved review threads.
+# Print a reminder so the agent's next response addresses them
+# before relying on the "push succeeded" signal.
+# See docs/dantotsus/pushed-without-reading-pr-review-comments.md.
+current_branch=$(git rev-parse --abbrev-ref HEAD)
+if [[ "$current_branch" == claude/* ]]; then
+  printf '\n⚠️  pre-push reminder: pushing on %s.\n' "$current_branch"
+  printf '   If this branch has an open PR, fetch and address any\n'
+  printf '   unresolved review threads BEFORE relying on this push.\n'
+  printf '   Use: mcp__github__pull_request_read method:get_review_comments\n\n'
+fi
```

**Sibling defects swept:** the same workflow gap also covered
the *post-merge* arc — the agent doesn't auto-propose the
follow-up actions on a `merged` webhook event. That's tracked
separately under
[`post-merge-deploy-and-kaizen-reminder.md`](./post-merge-deploy-and-kaizen-reminder.md)
because the eradication surface is different (CLAUDE.md rule,
not Husky hook).

## See also

- [`designated-branch-was-a-merged-pr-head.md`](./designated-branch-was-a-merged-pr-head.md) — sibling: the *previous* anchor along the same flow (which branch you're on before you commit).
- [`post-merge-deploy-and-kaizen-reminder.md`](./post-merge-deploy-and-kaizen-reminder.md) — sibling: the *next* anchor (what to do once the PR merges).
