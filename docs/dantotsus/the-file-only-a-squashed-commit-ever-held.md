---
date: 2026-11-27
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#411'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/quality/dantotsu-corpus.ts, scripts/quality/check-dantotsu-front-matter.ts]
time-to-detect: minutes
tags: [ci, gates, git, documentation]
zone: scripts/quality/dantotsu-corpus.ts
recurs: none (the first gate found reading a branch's own commits, which a squash merge discards)
---

# The file only a squashed commit ever held

## User impact

The PR #410 sweep (#411) merged with every check green. Main's `build` job
went red five minutes later, and stayed red until PR #417's last commit fixed
the entry (run 45968893002, measured).

| | Seen | Expected |
| --- | --- | --- |
| PR #411's CI | the dantotsu front-matter check passes | the check refuses `.claude/hooks/pretool-agent-after-route.sh`, a path main never held |
| main after the merge, 08:53 UTC | `build` fails: "eradication path .claude/hooks/pretool-agent-after-route.sh was never in the repository" | green, as on the pull request |
| PR #417 | the next feature fixes a dantotsu it did not write, in a `docs(meta)` commit | a feature branch that touches only its feature |

## Causal chain

- Main's `build` failed on a dantotsu its pull request had passed.
  - `the-deadline-that-skipped-the-mockups.md` names the bash hook as its
    eradication path. The hook was written in `4a926f71` and deleted in
    `eaf16df2`, both inside #411, when every hook moved to TypeScript.
    - The squash merge kept neither commit, so main never held the file.
      - `readPathsEverTracked` reads `git log … HEAD`. On the branch, `HEAD`
        still holds both commits, so the path reads as once tracked.

## Root cause of occurrence

*Thought a path some commit on `HEAD` added is a path the repository held,
actually a squash merge keeps only the branch's final tree, so a branch's own
commits do not outlive it.*

`scripts/quality/dantotsu-corpus.ts` before this fix:

```ts
for (const path of runGit(['log', '--format=', '--name-only', '--diff-filter=AR', 'HEAD']).split(
```

`28726eb4` is one commit with one parent, titled `… (#417)`, the shape every
merge to main has (measured with `git log origin/main`).

## Detection failure causes

- **Pull request CI:** it ran the same check on the branch's `HEAD`, whose
  history differs from the history main will have.
- **PR #411's own review:** it changed this exact reader, in `count a
  renamed-in path as one the repository once held`, and read `HEAD` as
  the repository's history there too.

## Countermeasure

The check reads paths main's history added (`origin/main`), plus the paths in
the branch's own tree. A file a branch adds and deletes again no longer
counts. The PR #410 sweep's entry already points at the TypeScript hook,
fixed in `a81f8b43`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
-export function readPathsEverTracked(): ReadonlySet<string> {
+export function readPathsEverTracked(historyReference = 'HEAD'): ReadonlySet<string> {
-  const everTracked = readPathsEverTracked();
+  const everTracked = readPathsEverTracked(MAIN_REFERENCE);
```

The weak-point page keeps `HEAD`. It runs on main, where the two are the same.

**Proof it can fail:** in a worktree at #411's head, against today's `origin/main`.

| Check | Exit |
| --- | --- |
| before | 0, "342 dantotsus carry a complete, resolvable front matter" |
| after | 1, "the-deadline-that-skipped-the-mockups: eradication path .claude/hooks/pretool-agent-after-route.sh was never in the repository" |

**Similar instances:** `git grep -n "'HEAD'" -- 'scripts/**/*.ts'` lists the
other readers of `HEAD`. None of them asks whether main ever held a path.
They name the commit being built, diff a branch against its base, or count
commits in runs that start on main.
