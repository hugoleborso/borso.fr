---
date: 2026-08-20
introduced-at: conception
detected-at: ci
severity: high
related-pr: '#49'
fix-pr: TBD
fix-commits: [a9e0d1b]
eradication-level: 4
time-to-detect: days
tags: [ci, gates, github-actions, testing, process]
---

# The backstop nobody was standing behind

## Symptom

`full-suite`, the only unscoped run of every suite in the repository,
failed on `main` on 2026-08-16 and failed on every push afterwards.
Twenty consecutive red runs, four days, across nine merged pull
requests. Nobody noticed, and nothing said anything.

It was found because somebody opened the Actions list for an unrelated
reason while merging a Dependabot queue.

## Root-cause chain

1. **Why did nobody notice a red gate?**
   Nothing reports it. It is not a required check, it never appears on
   a pull request, and a failed run on `main` sends no notification
   anyone was reading.
2. **Why does it not appear on a pull request?**
   By design: it runs `on: push: branches: [main]`, after the merge.
   Its own header comment says it runs "on main, where nobody is
   waiting on it" — offered as a reason it can afford to be slow.
3. **Why is being unwatched acceptable in that design?**
   Because the assumption was that a red run is loud. On a
   pull request it would be: it sits in the check list above the merge
   button. On `main` there is no such surface.
4. **Why did nine subsequent merges not surface it either?**
   Each new push starts a fresh run. The run *before* it, red, scrolls
   into history. There is no accumulating signal, only a list nobody
   reads.
5. **Why did the scoped gates not catch what it was catching?**
   They are scoped on purpose. Pre-push mutates only the pure files a
   push touches and `ci` tests only the apps a pull request changes.
   Both are deliberately cheap so they get run rather than skipped,
   and this workflow is named in its own comment as the hole's
   backstop.

**Root cause:** thought *"a gate that fails is a gate that is heard"*,
actually *a gate whose only audience is a workflow list nobody opens
is a log file, and the whole justification for scoping the cheap gates
rested on it.*

## Detection failure causes

- **Typing / linter:** not applicable.
- **Functional validation locally:** the pre-push hook deliberately
  runs no unscoped suite, and prints that the unscoped run "exists
  somewhere". It did exist. It was red.
- **CI:** the run itself was the detector and it worked perfectly. The
  missing layer is entirely downstream of it.
- **Code review:** the workflow was reviewed when written; its
  reporting gap is not visible in a diff of the file.
- **Production monitoring / alerting:** none configured for Actions.
  This is the layer that was absent.

## Countermeasure

- **Code:** commit `a9e0d1b` — a `report-failure` job, guarded by
  `if: failure()`, posting a commit comment on the failing commit.
- **Operator action:** none. What it was reporting the whole time is
  fixed separately, see the sibling entry below.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — the failure now arrives where a person
already looks)

**Reference:** commit `a9e0d1b`

**The actual fix:**

```diff
+ report-failure:
+   needs: [app, infra]
+   if: failure()
+   runs-on: ubuntu-latest
+   steps:
+     - uses: actions/github-script@v9
+       with:
+         script: |
+           await github.rest.repos.createCommitComment({ … })
```

A commit comment lands on the commit page and in the merge author's
GitHub notifications, which is the one surface a person who just
merged already opens. Green runs stay silent.

**Why level 4 and not higher.** Level 1 would be making `full-suite` a
required check, so a red backstop blocks the next merge outright. That
lives in branch protection, which CLAUDE.md's last *Don't* is
explicitly about: this repository cannot observe its own branch
protection, so a claim that the gate is required would age without
resistance and could not be tested from here. Making the failure
audible is what the repository itself can hold.

**Sibling defects swept:** none — the regression it had been reporting
since 2026-08-16 is
[`the-mutants-were-judged-by-the-wrong-jury.md`](./the-mutants-were-judged-by-the-wrong-jury.md),
fixed in PR #79.

## See also

- [`a-dependency-bump-that-no-app-filter-could-see.md`](./a-dependency-bump-that-no-app-filter-could-see.md)
  — the same pass's other gate that abstained rather than failed.
- [`an-approval-gate-that-only-existed-in-a-comment.md`](./an-approval-gate-that-only-existed-in-a-comment.md)
  — the previous time this repository believed in a protection that
  was not there.
