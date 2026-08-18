---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#24'
fix-pr: '#61'
fix-commits: [866e0cb]
eradication-level: 2
time-to-detect: 3 months
tags: [harness, gates, meta, git, self-improvement-loop]
---

# A warning that fired on every first commit

## Symptom

The session that fixed PR #60 opened with this, on a branch created
seconds earlier and carrying no commits at all:

```
⚠️  [branch-context] "claude/setlist-creation-bug-025jld" is fully merged into origin/main.
   Every commit on this branch already shipped, which usually
   means the orchestrator routed you to a branch whose PR is
   already closed. Confirm with the user that this is the
   intended work surface BEFORE committing …
```

There was nothing to confirm. The branch was new.

## Root-cause chain

1. **Why did it fire?** The check warns when `git rev-list --count
   origin/main..HEAD` is zero.
2. **Why is that zero on a new branch?** Because a branch created from
   main has no commits ahead of main — the same count as a branch whose
   every commit already merged.
3. **Why was the count trusted alone?** It is the exact signal of the
   incident the check was written for: an orchestrator handing over a
   merged pull-request head. It matches that case. It also matches the
   start of every task.
4. **Why did the header claim otherwise?** It states *"a
   freshly-branched-from-main branch with no new commits … [is] NOT
   flagged"*. The intent was right and the code never implemented it, so
   the file documented a discriminator it did not have.
5. **What does the false positive cost?** The warning asks the reader to
   stop and confirm with the user before committing. Firing it on every
   task teaches the reader to scroll past it — including on the session
   where it is right, which is the whole point of writing it.

**Root cause:** thought *"no commits ahead of main means the work
already shipped"*, actually *"it means that or that no work exists yet,
and the two are told apart by where the tip sits, not by the count"*.

## Detection failure causes

- **Typing:** shell.
- **Linter / static analysis:** nothing checks a script against its own
  header.
- **Functional validation locally:** the check was validated on the case
  it was written for — a merged head — which it handles correctly. The
  fresh-branch case was documented as excluded and never run.
- **CI:** a SessionStart script does not run in CI.
- **Code review:** the header asserts the exclusion, and a reviewer
  reading header-then-code sees an intent and an implementation that
  look like the same thing.
- **Production monitoring:** the failure mode of a false positive is
  that people ignore it, which is invisible until the true positive
  arrives.

## Countermeasure

- **Code:** commit `866e0cb` — a tip comparison before the count.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the false positive is now impossible)

**Reference:** [PR #61](https://github.com/hugoleborso/borso.fr/pull/61) · commit [`866e0cb`](https://github.com/hugoleborso/borso.fr/commit/866e0cb)

**The actual fix:**

```diff
+# A branch sitting exactly on origin/main is a fresh start, not a
+# shipped one: there is no work to be orphaned yet.
+if [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]]; then
+  exit 0
+fi
+
 if [[ "$unmerged_count" -eq 0 ]]; then
```

Verified both ways: silent on a branch just created from main, and still
warning on `claude/setlist-creation-bug-025jld` once its work had shipped
in PR #60, whose tip is an ancestor of main rather than equal to it.

**Sibling defects swept:** the header now explains the discriminator
instead of asserting an exclusion, so the next reader can check the code
against a claim that is testable.

## See also

- [`designated-branch-was-a-merged-pr-head`](./designated-branch-was-a-merged-pr-head.md) — the incident this check exists for.
- [`a-gate-that-reported-success-while-measuring-nothing`](./a-gate-that-reported-success-while-measuring-nothing.md) — the mirror image: a signal that never fires rather than one that always does.
