---
date: 2026-08-20
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#63'
fix-pr: '#71'
fix-commits: [cb69f25]
eradication-level: 2
time-to-detect: 40 minutes
tags: [git, tooling, ci, husky, testing]
---

# The scoped gate that charged me for all of main

## Symptom

Merging `main` into PR #63's branch, and then pushing, produced this:

```
[pre-push] gating 491 changed file(s) — range: this push
[pre-push] borso-fr: mutating 78 changed gated file(s)
```

Four applications of tests and seventy-eight mutated files, for a push whose
own work was twenty-three files. It timed out twice before it was clear the
hook was not broken — it was doing exactly what it had been told to do.

The branch had been open two days and `main` had moved forty-six commits.

## Root-cause chain

1. **Why did the hook gate 491 files?**
   Because `git diff --name-only <remote sha> HEAD` says 491 files changed,
   and that is true.

2. **Why is it true?**
   The push contained a merge commit. Everything `main` did since the branch
   last pushed arrived in the same range as the branch's own three commits.

3. **Why did the hook count main's commits as this push's work?**
   Its base is the remote sha of *the branch being pushed*, and nothing else.
   The range is "commits new to this ref", which is the right question for a
   linear push and the wrong one for a merge.

4. **Why was the merge case not considered?**
   The hook was written to replace a `merge-base HEAD origin/main` base that
   re-gated the whole branch every time — fifty minutes to prove a one-line
   shell change moved nothing. The fix aimed squarely at that, and the merge
   commit is the one shape where the new base is *larger* than the old one.

5. **Why did nothing catch that?**
   The hook has no tests. It cannot easily have them — it reads git's stdin
   protocol and shells out to four package managers — and its behaviour was
   only ever observed on ordinary pushes, where it is correct.

**Root cause:** thought *the commits new to this ref are the commits this push
adds*, actually *a merge commit makes those two sets differ by the whole of the
base branch, which was already gated when it landed there*.

The backstop the hook's own header names —
[`full-suite.yml`](../../.github/workflows/full-suite.yml), unscoped, on `main`
— is the proof that main's commits need no second gate. The header states the
principle and the code did not apply it.

## Detection failure causes

- **Typing / linter:** it is a shell script; `sh -n` accepts it, and it was
  syntactically perfect.
- **Functional validation locally:** it ran correctly on every ordinary push
  for weeks. The merge push is rare, and the failure looks like slowness rather
  than wrongness.
- **CI:** does not run the hook.
- **Code review:** the base computation is four lines and reads as obviously
  right. Knowing it is wrong requires holding a merge commit in mind while
  reading it.
- **The operator:** caught it, at the cost of two timed-out pushes, and logged
  it through `scripts/kaizen.sh` — which is the only reason this entry exists.

## Countermeasure

None during the pull request. The push was waited out twice.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate now excludes what `main` already carries)

**Reference:** [PR #71](https://github.com/hugoleborso/borso.fr/pull/71), the kaizen
sweep of [PR #63](https://github.com/hugoleborso/borso.fr/pull/63)

**The actual fix:**

```diff
+main_tip=$(git rev-parse --verify --quiet origin/main 2>/dev/null || true)
+if [ -n "$main_tip" ] &&
+  git merge-base --is-ancestor "$main_tip" HEAD 2>/dev/null &&
+  ! git merge-base --is-ancestor "$main_tip" "$push_base" 2>/dev/null; then
+  push_base="$main_tip"
+  range_label="this push, minus the commits it merged from origin/main"
+fi
```

`origin/main` being reachable from `HEAD` means it has been merged in; it not
being reachable from the remote sha means the merge is inside *this* push.
Both together are the only shape that needs re-basing, and diffing against
main's tip then leaves exactly the branch's own work.

**It cannot under-gate.** A file `main` changed that the branch took verbatim
is byte-identical to main's tip, so it drops out of the range — correctly, as
`full-suite.yml` gated it there. A file both sides touched, or the branch alone
touched, still differs from main's tip and is still gated. The only thing the
change can add is a file the branch changed in an *earlier* push and `main` did
not touch, which is over-gating, and cheap.

**Measured on the commit that provoked it**, `9b2ff2b`, rather than reasoned
about — the four push shapes, with the base each one selects:

| Push shape | base chosen | files gated |
| --- | --- | --- |
| ordinary push, no merge | remote sha | 1 |
| **the push that merges main** | **main's tip** | **23** (was 491) |
| later push, main merged earlier | remote sha | 6 |
| `origin/main` unavailable | remote sha | 491 (unchanged) |

The last row is the deliberate degradation: a shallow clone or a fresh worktree
keeps today's behaviour rather than failing.

**Sibling defect swept:** the same shape, one hook over, and this pull request
tripped it. `scripts/blueprints/blueprint-defects.ts` reads the blueprint
annotations *and* every dantotsu's front matter, but `.husky/pre-commit` only
ran it when a `.ts`/`.tsx` file was staged — so a commit that adds only a
dantotsu could never run the check its own content invalidates. Four commits on
this branch skipped it and CI caught the stale page on the fifth. The condition
is now the union of the generator's two inputs, `apps/`, `infra/` and
`docs/dantotsus/`, and was proven by staging a dantotsu-only change against a
stale page: the old condition selects nothing, the new one runs the generator,
and the generator exits 1.

## See also

- [`../knowledge/gate-timings-before-and-after.md`](../knowledge/gate-timings-before-and-after.md)
  — what each gate costs, which is the arithmetic that makes 491 files
  unaffordable and 23 fine.
- [`../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md)
  — the other way this hook's parallel wave reads as a bug when it is a cost.
- [`the-entry-existed-and-i-lost-the-hour-anyway.md`](./the-entry-existed-and-i-lost-the-hour-anyway.md)
  — the merge that triggered this was the fix for that entry. One repair paid
  for by another.
