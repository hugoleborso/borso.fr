---
date: 2026-10-27
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#95'
fix-pr: '#202'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh, scripts/pr/deploy-fanout.core.ts, plugins/borso-harness/scripts/check-hook-decisions.sh]
time-to-detect: 2 months
tags: [hooks, deploy, gates, meta, github-actions]
zone: .claude/hooks
weak-point: gate-measures-nothing
recurs: [a-warning-that-had-to-become-a-gate]
---

# The merge whose blast radius nobody printed

## Symptom

PR #199 was merged with `gh pr merge 199 --squash --delete-branch`. Six
applications deployed to production. Nothing was printed before the call, and
the pull request's own body said the merge would deploy three.

Both halves were wrong in the same direction, and neither contradicted the
other out loud.

## Root-cause chain

1. **Why did nothing print?**
   `.claude/hooks/pretool-merge-deploys-prod.sh` was registered on the matcher
   `mcp__github__merge_pull_request` and on nothing else.
2. **Why did that matcher not cover the merge?**
   The merge went through the Bash tool. A hook matched to an MCP tool name
   never sees a shell command, whatever that command does.
3. **Why was only one shape registered?**
   The hook was written on PR #95, in a session that merged through the GitHub
   MCP server, and the shape that session used was the shape it guarded. The
   repository already had four Bash-matched hooks, one of them for
   `gh pr create`, so the second way of reaching GitHub was known and simply
   not applied here.
4. **Why did the pull-request body say three applications?**
   Its author read the diff and named the applications under `apps/`. The diff
   also touched `infra/cdk/**`, and `deploy.yml` fans that out to every
   application, which is a rule written in the workflow and nowhere a body
   author looks.
5. **Why did nothing reconcile the two?**
   The hook computed the fan-out correctly, inline, in shell, and was the only
   thing that did. Silent, it took its correct answer with it.

**Root cause:** thought a hook guards an action, actually a hook guards a tool
shape — and the one piece of code that knew the real blast radius was matched
to the shape that was not used.

## Detection failure causes

- **Typing:** a matcher string in `settings.json` has no type that relates it
  to the commands a hook can parse.
- **Linter / static analysis:** nothing reads `settings.json` against the hooks
  it names.
- **CI (tests / build):** `check-hook-decisions.sh` holds each refusing hook to
  both halves of its contract, and had a second loop for hooks that inform —
  but both loops walked `plugins/borso-harness/hooks/` only. This hook lives in
  `.claude/hooks/`, outside every loop, with no row of its own.
- **Code review:** the body's "deploys pragma, last-loop-lepin and banana-rush"
  reads as a fact about the diff, and checking it means knowing `deploy.yml`'s
  fan-out rule by heart.
- **Production monitoring:** the deploy succeeded. Six green jobs are not an
  alert.

## Countermeasure

- **Code:** the hook answers both tool shapes, and stops computing the
  application list itself.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a gate that fails on the planted defect)

**Reference:** PR #202 · commit `self`

**The actual fix:** three changes that each close one step of the chain.

The hook reads the Bash shape, matching an invocation and not a mention, the
way every other Bash hook here does:

```diff
+  COMMAND=$(jq -r '.tool_input.command // ""' <<<"$INPUT")
+  grep -qE '(^|[;&|]|\bthen\b|\bdo\b)[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge\b' <<<"$COMMAND" || exit 0
```

and it is registered on `Bash` as well:

```diff
-    { "matcher": "mcp__github__merge_pull_request", ... }
+    … plus ".claude/hooks/pretool-merge-deploys-prod.sh" on the Bash matcher
```

The fan-out rule leaves the hook for `scripts/pr/deploy-fanout.core.ts`, which
mirrors `deploy.yml` and is covered per file, so a hook and a pull-request body
cannot answer the question differently:

```diff
+  if (changedPaths.some((changedPath) => changedPath.startsWith(CONSTRUCTS_PREFIX))) {
+    return { applications: sortedSlugs, everyApplication: true, … };
+  }
```

Run against PR #199's own merge commit it prints the six applications that
actually deployed.

And `check-hook-decisions.sh` now reaches hooks the consumer keeps outside the
plugin, accepts a hook that informs on plain stdout, and requires both halves
of their contract. Replanting the original defect — the hook reading only
`pullNumber` — makes it fail:

```
[check-hook-decisions] .claude/hooks/pretool-merge-deploys-prod.sh should
  inform (Applications this merge deploys), exited 0
```

**Sibling defects swept:** `.claude/hooks/pretool-blueprint-context.sh` was the
other repository-side hook that informs with no row in the table; it has both
halves now.

## See also

- [`a-warning-that-had-to-become-a-gate.md`](./a-warning-that-had-to-become-a-gate.md)
- [`the-hook-that-refused-the-page-explaining-it.md`](./the-hook-that-refused-the-page-explaining-it.md)
- [`a-dev-dependency-that-redeployed-every-app.md`](./a-dev-dependency-that-redeployed-every-app.md)
