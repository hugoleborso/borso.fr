---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#334'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/knip/skip-untracked-files.ts, scripts/knip/untracked-files.core.ts, .husky/pre-push, knip.json]
time-to-detect: minutes
tags: [gates, agents, hooks, tooling, git]
zone: .husky/pre-push
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# The push that waited for another agent's probe

## User impact

The operator saw a kaizen pull request arrive later than it could have. The
main session of PR #334's sweep had its commits ready and could not push them.

| | Seen | Expected |
| --- | --- | --- |
| First push of PR #334 | knip failed pre-push on probe files a running subagent had left under `scripts/` | the push is judged on the commits it carries |
| Until that agent finished | the main session waited | the main session pushes, and the agent keeps its probes |

## Causal chain

- The main session could not push.
  - knip, in `.husky/pre-push`, reported the probe files as unused files.
    - knip reads every file its `project` globs match on disk, tracked or not.
      - A subagent proving an eradication with Stryker wrote its probe in the
        shared checkout, because Stryker fails in a scratch worktree whose
        `node_modules` is a symlink. PR #334's own inventory, row S4, told
        agents to do exactly that: "A probe can run in the shared tree."

## Root cause of occurrence

*Thought a pre-push gate judges what the push carries, actually knip judges the
working tree.*

`pnpm exec knip --reporter json` with one untracked `scripts/zz-untracked-probe.ts`
printed `"files":[{"name":"scripts/zz-untracked-probe.ts"}]` and exited 1
(measured). A push carries commits. CI checks out a tree with no untracked
file, so it can never see what failed here.

## Detection failure causes

- **Local:** every gate was written for one agent per checkout, where an
  untracked file under `scripts/` is the author's own work in progress. Several
  agents share this checkout, so one agent's scratch file reaches another's push.
- **Review:** row S4 of PR #334's inventory chose the shared tree as the
  workaround and did not ask what else reads it.

## Countermeasure

Two changes, one per link of the chain.

- Pre-push runs knip with a preprocessor that drops every issue keyed by an
  untracked path and takes it off knip's counters, so the exit code follows.
- The Stryker knowledge entry now gives the worktree fix, a 6.9 s offline
  `pnpm install` (measured), so a probe has a home outside the shared tree.

Library search: knip's own `--preprocessor` option is the vendor's hook for
this. Nothing custom stands in for knip.

## Eradication

**Type:** structural impossibility (level 1). An untracked file can no longer
fail the push.

**Reference:** this commit.

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

**Similar instances:** the other pre-push gates take the changed paths from
`git diff` against the base, so they already read only what is committed.
