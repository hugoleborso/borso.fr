---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: [01e8a28]
eradication-level: 2
tags: [stryker, mutation, coverage, gates, infra, pre-push]
time-to-detect: months
---

# The gate that was never pointed at the code, and the number that covered for it

## Symptom

`infra/cdk` is the construct library every application deploys through. It is
gated at 100% coverage, the gate is real, and standard 02 said its `.utils.ts`
files also survive Stryker with no surviving mutant.

Nothing had ever run Stryker there. Pointing it at those five files once:

```
All files                     |  75.33 |   76.13 |      287 |         0 |         90 |        4 |        0 |
 statement-rewrites.utils.ts  |  51.69 |   51.69 |       61 |         0 |         57 |        0 |        0 |
```

**90 surviving mutants at 100% coverage.** Every line ran. For ninety changes to
those lines, no assertion would have noticed.

## Root-cause chain

1. The mutation gate is configured per workspace: each one ships a
   `stryker.config.js` naming its own mutate globs.
2. `infra/cdk` never got one. There is no `stryker.config.js` under `infra/` at
   all.
3. Both runners iterate `apps/`: `.husky/pre-push` derives its workspace list
   from paths matching `^apps/`, and `full-suite.yml` matrixes over `apps/*`.
4. So `infra/` was outside the loop *and* outside the configuration — two
   independent reasons for the same silence, either of which alone would have
   been enough.
5. **A gate that is not pointed at code produces no output.** It does not report
   zero; it reports nothing. Nothing looks identical to "not applicable".
6. The coverage gate, which *was* pointed at those files, reported 100%. A
   reader seeing one green number and no red one concludes the file is well
   tested, which is exactly the inference mutation testing exists to refuse.
7. The standard then wrote down the conclusion — "with zero surviving mutants
   under Stryker" — and the claim aged for months with nothing able to contradict
   it, because the thing that would have contradicted it was the gate that was
   not running.

## Detection failure causes

- **Absence has no output.** Every other failure in this repository announces
  itself with a red line. This one is the shape of a check that was never
  invoked, and no dashboard has a row for a job that does not exist.
- **The coverage number filled the gap.** 100% on a file is a strong-looking
  signal, and the whole argument for mutation testing is that it is not one.
  Having both gates on `apps/` and only one on `infra/` meant the weaker signal
  stood alone precisely where it was least examined.
- **The standard asserted it.** Once "survives Stryker" was written down, the
  question stopped being asked. See
  [an approval gate that only existed in a comment](./an-approval-gate-that-only-existed-in-a-comment.md)
  for the same shape in a different domain.
- **`infra/` is not an application**, and every convention in this repository is
  phrased in terms of applications. The construct library falls out of loops
  written that way, quietly, every time.

## Countermeasure

`scripts/check-mutation-covers-gated-files.sh`, in pre-commit and in CI. For
every workspace holding a `.core.ts`, `.utils.ts` or `.adapter.ts` it requires
a `stryker.config.js` that mutates that suffix.

The absence is now the thing that fails, which is the only way to gate a gate.

`infra/cdk` sits in the script's allowlist, with the number and the reason
written on the entry. That is this repository's existing shape for a gap that is
real and not yet closed — `check-pure-modules-have-callers.sh` and
`check-frontend-env-vars.sh` both carry one, and both require every entry to
state why. An allowlist entry is a decision with a name on it; a missing gate is
neither.

## Eradication

**DevX check, level 2**, shipped in `01e8a28`. Verified against both ways the
gap can appear:

| Reintroduced | Result |
| --- | --- |
| a workspace's `stryker.config.js` removed | fails, naming the workspace and a gated file in it |
| `*.adapter.ts` dropped from a config's mutate globs while adapters exist | fails, naming the suffix and the config |

**What is deliberately not done here, and why the allowlist is honest rather
than convenient.** Closing `infra/cdk`'s 90 requires a justified Stryker disable
comment per mutant that is equivalent for every input its function can receive
— the regex-quantifier mutants in `statement-rewrites.utils.ts` are most of
them. Wiring the gate red before that work is done ships a gate nobody can make
green, and a gate that cannot go green gets skipped, which is worse than the
gap it was meant to close.

PR #49 did close 21 of the 90 where the fix was a real assertion: every keyword
separator in the DSQL statement rewrites is `\s+`, every test fed canonical
single-space SQL, and the tolerance was therefore untested — the file could have
been narrowed to exact spacing with a green suite (`61d2dad`).

## The general shape

A gate reports on what it is pointed at. Ask of every quality number: *which
files produced this, and which files could have and did not?* A convention
phrased for one kind of workspace — "every application does X" — leaves every
other kind outside it silently, and the shared library that everything depends
on is usually the one that is not an application.

Cross-reads with
[a green mutation gate is not a green coverage gate](./a-green-mutation-gate-is-not-a-green-coverage-gate.md),
which is this defect's mirror: there, mutation was green and coverage was red on
the same file. Together they say the two gates measure different things and
neither substitutes for the other — including when one of them is silent.
