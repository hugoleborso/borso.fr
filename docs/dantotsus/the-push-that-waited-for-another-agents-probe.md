---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#334'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/knip/skip-untracked-files.ts, scripts/knip/untracked-files.core.ts, .husky/pre-push]
time-to-detect: minutes
tags: [gates, agents, hooks, tooling, git]
zone: .husky/pre-push
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# The push that waited for another agent's probe

## User impact

The operator saw a kaizen pull request arrive later than it could have. The
main session of PR #334's sweep had its commits ready and could not push them
(measured in the session).

| | Seen | Expected |
| --- | --- | --- |
| First push of PR #334 | knip failed pre-push on probe files a running subagent had left under `scripts/` | the push is judged on the commits it carries |
| Until that agent finished | the main session waited | the main session pushes, and the agent keeps its probes |

Only a session sharing its checkout with a running agent is affected. CI,
which checks out a clean tree, is not.

## Causal chain

- The main session could not push.
  - knip, in `.husky/pre-push`, reported the probe files as unused files.
    - The gate ran knip over the working tree. The faulty line, from
      `9fc3b9a40` ("gate the push, not the branch"):

      ```bash
      # knip reads every file its project globs match on disk, tracked or not
      start_gate knip pnpm exec knip
      ```

      - `9fc3b9a40` scoped the other gates to the paths `git diff` names
        against the push base, and left knip whole-project.
        - knip's input is the disk, and the hook hands every gate the shared
          working tree, where one agent's scratch file sits beside another's
          commits (Machine).
  - The probe files were in the shared checkout.
    - A subagent proving an eradication with Stryker wrote its probe there,
      because Stryker failed in a scratch worktree whose `node_modules` is a
      symlink.
      - A workaround recorded in an earlier sweep, row S4, told agents "A
        probe can run in the shared tree" (Material, the brief the subagent
        followed; `docs/features/meta/lessons-from-pr-334/inventory.md:27`
        records that row 08 reopens S4).

## Root cause of occurrence

*Thought a pre-push gate judges what the push carries, actually knip, like
any tool that reads the disk, judges the working tree, and several agents
share that tree.* (Machine)

`pnpm exec knip --reporter json` with one untracked
`scripts/zz-untracked-probe.ts` printed
`"files":[{"name":"scripts/zz-untracked-probe.ts"}]` and exited 1 (measured).
A push carries commits. The gate harness runs every gate in the one checkout
the push starts from, so what the gate reads and what the push carries differ
as soon as another agent writes there.

## Detection failure causes

- **Local:** every gate was tried with one agent per checkout, where an
  untracked file under `scripts/` is the author's own work in progress.
- **CI:** CI checks out a tree with no untracked file, so it can never show
  this failure.
- **Review:** row S4 chose the shared tree as a workaround, and its review
  asked what the probe needs, not what else reads that tree.

## Countermeasure

Two changes, one per branch of the chain.

- Pre-push runs knip with a preprocessor that drops every issue keyed by an
  untracked path and takes it off knip's counters, so the exit code follows.
- The Stryker knowledge entry now gives the worktree fix, a 6.9 s offline
  `pnpm install` (measured), so a probe has a home outside the shared tree.

knip's own `--preprocessor` option is the vendor's hook for this. Nothing
custom stands in for knip.

## Eradication

**Type:** DevX check (level 2). It holds for knip only.

**Reference:** the commit adding this file.

```diff
-start_gate knip pnpm exec knip
+start_gate knip pnpm exec knip --preprocessor ./scripts/knip/skip-untracked-files.ts
```

`scripts/knip/untracked-files.core.ts` is pure, at 100% coverage. `total` and
`processed` count files read, not issues, so they stay untouched.

**Proof it can fail:** with an untracked `scripts/zz-untracked-probe.ts`, knip
alone printed `Unused files (1)` and exited 1. With the preprocessor it printed
`[knip] skipping 4 untracked file(s), which this push does not carry` and exited
0. The same file marked with `git add -N` printed `Unused files (1)` with the
preprocessor and exited 1, so a tracked file still fails.

**What stays possible:** an untracked file that imports a tracked export hides
that export's unused status locally. CI has no untracked file and still reports
it.

**Similar instances:** `grep -n start_gate .husky/pre-push` lists the gates.
Two more read the working tree. `typecheck-$app` (line 242) compiles every
file the app's tsconfig `include` matches, so an untracked `.ts` under
`apps/<app>/site/src/` would fail it (inferred from
`apps/pragma/tsconfig.json`). `lint_changed_files` (line 257) lints the
working-tree content of the changed paths, uncommitted edits included. The
class stays open.

**Proposed:** run the pre-push gates on `git worktree add --detach <pushed
sha>` instead of the shared checkout. Typecheck, oxlint, knip and vitest
would then read exactly what the push carries, and the knip preprocessor
could be deleted. Probes would also go in an isolated worktree, which the
6.9 s offline install now makes cheap.
