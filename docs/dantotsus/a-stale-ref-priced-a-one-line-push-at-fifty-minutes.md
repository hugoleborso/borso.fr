---
date: 2026-08-20
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#49'
fix-pr: '#74'
fix-commits: []
eradication-level: 2
time-to-detect: 11 minutes
tags: [ci, git, hooks, gates]
---

# The push that paid for twenty-five commits it was not pushing

## Symptom

A one-line change to `.claude/settings.json` — adding `"outputStyle": "Concise"` —
was pushed from a hosted session. The push did not return. Two attempts were
abandoned, one after two minutes and one after nine, before anyone read the
first line the hook had printed:

```
[pre-push] gating 520 changed file(s) — range: the whole branch (new or unfetchable remote ref)
[pre-push] start: mutation-borso-fr
[pre-push] borsouvertures: mutating 27 changed gated file(s)
…
```

Six full mutation suites and four test suites were running, across every
application in the repository, to gate one line of JSON. After `git fetch origin
main`, the identical push printed `gating 1 changed file(s)` and completed in
about thirty seconds.

## Root-cause chain

1. **Why did the hook gate 520 files?**
   Because `push_base` fell back to `git merge-base HEAD origin/main`, and that
   merge-base was `347cc54` — twenty-five commits behind the real tip of `main`.
   Everything merged in between counted as "changed by this push".

2. **Why was the merge-base that far back?**
   Because `origin/main` is a local ref, and nothing had updated it. The session
   ran in a container cloned once at start; `main` had moved on GitHub since,
   and no command in the session had any reason to fetch it.

3. **Why did the hook use the fallback at all, rather than the pushed range?**
   Because the branch did not exist upstream yet. Git supplies `<remote sha>` as
   all zeros for a branch's first push, so there is no "what the remote already
   has" to subtract, and the hook falls back to the branch's fork point.

4. **Why did the fallback trust a ref it never refreshed?**
   Because the rescoping in PR #49 was written against the pathology it was
   fixing — a hook keyed on `merge-base` *every* time — and the fallback was
   left as the old behaviour, kept for the rare case. Nothing asked what that
   old behaviour costs when the ref feeding it is stale, and in a hosted session
   it is stale by construction.

   The same assumption has since been built on. PR #71 added a second base,
   `main_tip=$(git rev-parse origin/main)`, to stop a merge push re-gating what
   main already carried — a good fix, reading the same unrefreshed ref. Its own
   measurement table has a row for *"`origin/main` unavailable"*; it has no row
   for *"`origin/main` present and forty commits old"*, which is the case a
   hosted session is always in.

5. **Why did the label not make this obvious?**
   It read `the whole branch (new or unfetchable remote ref)`. Both of those are
   states of the *remote branch*, so the sentence reads as "this is a new
   branch, expect a wider range" — an explanation, not a warning, and it says
   nothing about the ref whose freshness decides how wide.

**Root cause:** thought the fallback base was "the branch's fork point", actually
it is "the fork point as of the last time anything happened to fetch `main`",
and in a container that clones once that is an unbounded distance in the past.

## Detection failure causes

- **Typing:** not applicable — shell.
- **Linter / static analysis:** no linter models what a git ref will contain at
  run time; the expression is correct git, and its answer is data.
- **Functional validation locally:** the hook was validated on a developer
  machine, where `origin/main` is fetched constantly by ordinary work. The
  failing condition only exists where nobody fetches, which is exactly where
  nobody was testing.
- **CI (tests / build):** CI never runs this hook. `full-suite.yml` deliberately
  runs everything unscoped, so the wasteful case looks normal there.
- **Code review:** the diff that introduced it was a large improvement in the
  common path; the fallback branch read as unchanged behaviour and drew no
  attention.
- **Staging / production monitoring:** not applicable — the cost is an
  operator's minutes, and nothing measures those.

## Countermeasure

`git fetch --quiet origin main` immediately before the fallback merge-base, so
the ref the base is computed from is the ref that exists. The hook is about to
open a connection to the same remote, so the cost is one extra round-trip on a
path that was already paying for the network.

## Eradication (mandatory — code-level)

**Type:** code diff · DevX check (level 2 — DevX check)

**Reference:** [PR #74](https://github.com/hugoleborso/borso.fr/pull/74)

**The actual fix:**

```diff
+git fetch --quiet origin main 2>/dev/null || true
+
 if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then
   range_label="this push"
 else
   push_base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)
-  range_label="the whole branch (new or unfetchable remote ref)"
+  range_label="the whole branch since main (no remote ref for this branch yet)"
 fi
```

The label changed too. `new or unfetchable remote ref` described the branch and
read as reassurance; `the whole branch since main` describes the *range*, which
is the number the reader has to react to when it is 520 and not 1.

**Sibling defects swept:** the fetch sits above *both* consumers of the ref, so
PR #71's `main_tip` base gets a fresh answer too — that is the larger half of
the fix, since its base is the one an ordinary merge push uses. The other
readers were checked: `scripts/check-branch-context.sh` compares branch names
rather than commits, and `.husky/pre-commit` never reaches for the ref.

## See also

- [`gate-timings-before-and-after.md`](../knowledge/gate-timings-before-and-after.md) — the measurements the pre-push scoping was built on.
- [`a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md) — the other way a gate wave reads as a hang.
- [`the-scoped-gate-that-charged-for-all-of-main.md`](./the-scoped-gate-that-charged-for-all-of-main.md) — the other way this hook over-gates, fixed in PR #71 by a base this entry's fetch keeps honest. Read the two together: that one picks the right ref, this one makes sure the ref is current.
- [`a-gate-that-reported-success-while-measuring-nothing.md`](./a-gate-that-reported-success-while-measuring-nothing.md) — the opposite failure: a gate whose scope collapsed to nothing.
