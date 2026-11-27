---
date: 2026-11-12
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#316'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/merge-deploys-prod.core.ts]
time-to-detect: hours
tags: [hooks, gates, github-actions, deploy, harness]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
weak-point: gate-measures-nothing
recurs: none (two-merges-sixteen-seconds-apart-one-untested-main covers a green pull request beside an untested base, not a red one)
---

# A red pull request only luck kept off main

## User impact

Nothing reached production. The session of PR #316 was asked to merge
Dependabot's pull requests, and its first act was a merge of #311, whose
`build` check had failed. A merge to `main` deploys every changed app to prod.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #311 at 17:20 | refused by `merge-on-moved-base`, because `main` had moved under its CI | refused because `build` was red |
| Branch rule on `main` | none: `rules/branches/main` returned `[]`, `protected: false` (measured then, and `[]` again this session) | a rule that holds a red check |

## Causal chain

- A session called the merge of #311, whose `build` check had failed.
  - It called the merge without reading the head's check conclusions, on the
    belief that a red merge would be refused (inferred: the transcript of #316
    was not read for this entry).
    - `main` carries no ruleset, so GitHub would have merged it.
      - An earlier entry left the rule unset.
        [`the-backstop-nobody-was-standing-behind`](./the-backstop-nobody-was-standing-behind.md)
        chose level 4 over a required check because "this repository cannot
        observe its own branch protection". `gh api -X GET
        repos/hugoleborso/borso.fr/rules/branches/main` reads it in one call.
  - The merge hook let the call reach GitHub. `pretool-merge-deploys-prod.sh`
    read the check runs only for their start time, to find base commits CI
    never saw.
    - The merge stopped only because `main` had moved and both sides changed
      a file.

## Root cause of occurrence

*Thought GitHub refuses a merge whose checks are red, actually `main` carries no
ruleset and the merge API merges a red head.* **Machine.** No ruleset holds
`main`, and the one record of the question said it could not be read, so nobody
had looked.

## Detection failure causes

- **Hooks:** every merge refusal before this one judged the base, never the
  head's own checks.
- **GitHub:** no ruleset on `main`, and no check reads `rules/branches/main`, so
  its emptiness stayed invisible.

## Countermeasure

The operator chose on 2026-11-12, in the sweep of PR #316, that a merge waits
for green. The merge hook now reads every check run on the pull request's head
and refuses the merge while one is failed, cancelled, timed out or still
running. Skipped and neutral count as green.

## Eradication

**Type:** DevX check (level 2), with a gap: it fails open.

**Reference:** the commit adding this file shipped it in
`pretool-merge-deploys-prod.sh`. Commit `458e886` (#411) ported it to
`judgeChecks` in `scripts/hooks/checks/merge-deploys-prod.core.ts`.

```ts
function judgeChecks(merge: Merge, comparedHead: string): Verdict | string {
  const unknown = 'unknown — the check runs of this head could not be read';
  if (!merge.isNumbered || comparedHead === '' || !merge.hasGh) return unknown;
```

The gap: a merge with no pull-request number (`gh pr merge` on the current
branch), an unreadable head, or a session without `gh` goes through with
`Checks on the head: unknown`. A merge from the web UI never meets the hook.

**Proof it can fail:** fed `pullNumber: 311` with `KAIZEN_LOG_REFUSALS=0`, the
shell hook exited 2 and printed:

```
[merge-on-red] refused: pull request 311 has checks that are not green on its head:
    build: failure
```

Fed `pullNumber: 316`, it exited 0 and printed `Checks on the head: green`.

**Similar instances:** `gh pr merge` in a Bash call goes through the same check,
which matches both shapes. `grep -ril ruleset docs/operator-backlog/` prints
nothing, so no backlog entry asks for the rule.

**Proposed:** a ruleset on `main` that requires the `ci` checks. It closes every
path at once: the web UI, an unnumbered `gh pr merge` and an unreadable head.
Setting it needs repository settings, so it goes to the operator as
`docs/operator-backlog/main-ruleset-requires-ci.md`. A session-start or CI check that reads
`rules/branches/main` and fails on `[]` would keep the rule observable. The hook
then stays only as the early notice.
