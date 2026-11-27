---
date: 2026-11-04
introduced-at: code-review
detected-at: operator-deploy
severity: low
related-pr: '#257'
fix-commits: [self, 572a62640, 458e886c4]
eradication-level: 4
eradication-paths: [scripts/hooks/checks/merge-deploys-prod.core.ts, .github/workflows/ci.yml]
time-to-detect: minutes
tags: [ci, github-actions, deploy, agents, hooks]
zone: scripts/hooks/checks/merge-deploys-prod.core.ts
recurs: [green-said-of-a-run-still-going]
---

# Two merges sixteen seconds apart, one untested main

## User impact

PR #257 went to production as a combination no CI run had tested. Main's own
`ci` run on `20eaa66` later passed (run 41748626420, measured), so nothing
broke. The operator noticed that the merge read `mergeable_state: unknown`.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #257 at 00:40:48 | merged with the CI of 00:32, run against main `c73518aa` | told that #249 had merged at 00:40:32, after that CI started |
| Main's `ci` on `e523fbe2` (#249) | cancelled by #257's push (run 41748592331) | a verdict on #249 alone |

## Causal chain

- Main `20eaa66` deployed without a pre-merge test of #249 and #257 together.
  - The #257 session merged 16 seconds after another session merged #249.
    - Its last `pull_request_read get` at 00:40:39 returned `mergeable_state: unknown`, because GitHub was recomputing after the base moved. The session read it as "not dirty" and called the merge. ← the faulty call
      - Its green checks came from a `pull_request` run started at 00:32:19 against main `c73518aa`, before #249 existed on main.
      - GitHub accepted the merge, because `main` has no protection rule and no ruleset (`gh api repos/hugoleborso/borso.fr/branches/main/protection` answers 404 and `.../rules/branches/main` answers `[]`, both run 2026-11-27). The sweep of PR #253 had left that setting to the operator (inventory row 08 of `lessons-from-pr-253`), and no `docs/operator-backlog/` file asks for it (`grep -ril "merge queue\|up to date" docs/operator-backlog/` finds none) (Machine).
  - Both PRs edited `docs/knowledge/README.md` and `docs/quality/feature-cost.md`, and git merged them textually.

## Root cause of occurrence

*Thought green checks on the head mean the merged main is tested, actually a
`pull_request` run tests the branch merged with main as main was when the run
started.* **Material:** nothing in the session's context said so. The
knowledge corpus explained `dirty` and said nothing about `unknown`
(`grep -rl mergeable_state docs/knowledge/` finds no entry on `unknown`, this
session).

Two kaizen sessions ran in parallel, as CLAUDE.md intends, so a base moving
under an open pull request is the normal case, not a race.

## Detection failure causes

- **Merge hook:** it named the deploy fan-out and not the base. It did not fetch `origin/main`.
- **Session:** `mergeable_state: unknown` reads as "not dirty".
- **Repository settings:** no rule required the branch to contain the base before merging, so GitHub's own merge button had nothing to refuse.
- **Repeat:** #253 merged while its CI still ran (row 08 of the #253 sweep). That was the first untested main in two merges.

## Countermeasure

The merge hook fetches main, reads when the head's Actions checks started, and
lists every first-parent main commit since then that the head does not
contain, with the files both sides changed. Replay on PR #257, measured at the
time:

```
[merge-on-moved-base] main moved after this pull request's CI started (2026-11-04T00:32:19Z).
These merged since, and no run tested them beside this branch:
    e523fbe2 docs: lessons from PRs #246 and #247 (#249)
Files both sides changed:
    docs/knowledge/README.md
    docs/quality/feature-cost.md
```

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file shipped the notice in
`.claude/hooks/pretool-merge-deploys-prod.sh`. Commit `572a62640` (PR #276,
2026-11-05) made it refuse. Commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4)
(PR #411, 2026-11-27) moved it to
`scripts/hooks/checks/merge-deploys-prod.core.ts`. The shell file no longer
exists.

What holds today, read this session (`merge-deploys-prod.core.ts:209-230`):

- **Files changed on both sides:** refused, exit 2, with "Merge main into the
  branch, push, wait for the check_suite event, then merge." This is the
  shape of this incident, and for it the hook is a level 2 check.
- **No file changed on both sides:** let through with a notice, exit 0. A
  notice that exits 0 is not detection. Main's own `ci` run, after the merge,
  is the first test of the combination (`ci.yml:17-20` runs on `push` to
  `main`).

The class is two merges whose combination no run tested. With the disjoint
case open, what holds for the whole class is main's CI after the merge, so
the level is 4.

**Proof it can fail:** the hook's 33 unit tests pass on today's `main` (run
this session), among them "refuses a merge beside base commits that change
the same files, because no CI run tested them together".

**Proposed:** close the disjoint case. On the no-overlap path, build the
merged tree with `git merge-tree --write-tree origin/main <head>` (git 2.43
here) and run the fast tree gates on it, such as
`scripts/check-numbered-sequences.sh` on its file list, refusing on a failure.
That catches the duplicate migration number of
[two-branches-took-the-same-migration-number.md](./two-branches-took-the-same-migration-number.md),
which is a disjoint merge. The level-1 fix is the repository setting "require
branches to be up to date before merging", or a merge queue. It trades a CI
re-run per parallel merge, so it is the operator's call, and it needs a
`docs/operator-backlog/` file, not yet written.

**Similar instances:** the same hook could not read the head in a hosted
session until
[the-merge-hook-asked-the-one-api-the-proxy-refuses](./the-merge-hook-asked-the-one-api-the-proxy-refuses.md)
was fixed. A green read too early is
[green-said-of-a-run-still-going](./green-said-of-a-run-still-going.md).
