---
date: 2026-11-12
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#316'
fix-pr: none (the kaizen pull request of PR #316, not yet numbered)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh]
time-to-detect: hours
tags: [hooks, gates, github-actions, deploy, harness]
zone: .claude/hooks/pretool-merge-deploys-prod.sh
weak-point: gate-measures-nothing
recurs: none (two-merges-sixteen-seconds-apart-one-untested-main covers a green pull request beside an untested base, not a red one)
---

# A red pull request only luck kept off main

## User impact

Nothing reached production. The session of PR #316 was asked to merge
Dependabot's pull requests, and its first act was a merge of #311, whose
`build` check had failed.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #311 at 17:20 | refused by `merge-on-moved-base`, because `main` had moved under its CI | refused because `build` was red |
| Branch rule on `main` | none: `rules/branches/main` returned `[]`, `protected: false` (measured) | something that holds a red check |

## Causal chain

- A session called the merge on a pull request with a failed check.
  - No hook read the head's check conclusions. `pretool-merge-deploys-prod.sh`
    read the check runs only for their start time, to find base commits CI
    never saw.
    - `main` carries no branch protection, so GitHub would have merged it.
      - Only the coincidence that `main` had moved and both sides changed a
        file stopped the merge.

## Root cause of occurrence

*Thought a merge happens only on green, actually nothing checked it.* The merge
hook printed what a merge deploys and refused one untested combination. Neither
covered a red head.

## Detection failure causes

- **Hooks:** every merge refusal before this one is about the base, never the
  head's own checks.
- **GitHub:** no branch rule, and none is readable or settable from a session.

## Countermeasure

The operator chose on 2026-11-12, in the sweep of PR #316, that a merge waits
for green.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file

`pretool-merge-deploys-prod.sh` now reads every check run on the pull
request's head and refuses the merge while one is failed, cancelled, timed out
or still running. Skipped and neutral count as green. When the check runs
cannot be read, the merge goes through and the notice prints
`Checks on the head: unknown`.

```diff
+    NOT_GREEN=$(awk -F'\t' '$2 != "completed" || ($3 != "success" && $3 != "skipped" && $3 != "neutral") ...
+    if [ -n "$NOT_GREEN" ]; then
+        echo "[merge-on-red] refused: pull request $PR has checks that are not green on its head:"
+      exit 2
```

**Proof it can fail:** fed `pullNumber: 311` with `KAIZEN_LOG_REFUSALS=0`, the
hook exited 2 and printed:

```
[merge-on-red] refused: pull request 311 has checks that are not green on its head:
    build: failure
```

Fed `pullNumber: 316`, it exited 0 and printed `Checks on the head: green`.

**Similar instances:** `gh pr merge` in a Bash call goes through the same hook,
which matches both shapes. A merge with no pull-request number
(`gh pr merge` on the current branch) cannot name a head, so it is not checked.
