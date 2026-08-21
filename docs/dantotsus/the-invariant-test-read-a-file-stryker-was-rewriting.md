---
date: 2026-08-21
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-commits: [93142d2]
eradication-level: 2
time-to-detect: ~25 minutes (one full pre-push wave)
tags: [stryker, mutation, vitest, testing, gates, blueprint]
---

# The invariant test read a file Stryker was rewriting

## Symptom

`apps/last-loop-lepin` ships two byte-identical copies of
`haversine.utils.ts`, one under `api/src/helpers/geo/` and one under
`site/src/lib/`. Nothing enforces the duplication — the old file header
asserted it, and was wrong about the twin's path.

Turning that assertion into a test looked obvious: read both files, strip
annotations, compare. It passed locally in 6 s. Then the pre-push mutation
gate died before running a single mutant:

```
ERROR DryRunExecutor One or more tests failed in the initial test run:
  the site copy of this module computes distance from the same source as this one
    expected 'function stryNS_9fa48() {\n  var g = …' to be 'function stryNS_9fa48() {\n  var g = …'
```

Two strings that print identically, compared unequal.

## Root-cause chain

1. **Why did two identical-looking strings differ?**
   They were not the source files. Stryker had **instrumented** both, wrapping
   each in its mutation switch scaffolding.
2. **Why did instrumentation break the comparison?**
   Each file gets its own mutant id range. Two copies of the same source come
   out of the instrumenter as two *different* strings.
3. **Why did it fail in the dry run, before any mutant?**
   The dry run executes the suite against the instrumented tree to collect
   per-test coverage. Instrumentation is already applied; only activation is
   not.
4. **Why did the test not anticipate this?**
   `haversine.utils.ts` is a gated pure module, so it is in Stryker's
   `--mutate` set. The test sat in that module's own sibling suite — the
   natural place for it, and the one place guaranteed to run while the file
   it reads is rewritten.

**Root cause:** we thought a test reading a file off disk observes the source;
actually it observes whatever is on disk at that moment, and under a mutation
run that is the instrumented copy. A source-invariant test and mutation
testing cannot share a workspace's gated files.

## Detection failure causes

- **Typing / linter:** neither reads a file at runtime.
- **Functional validation locally:** `vitest run` passed — 8 tests, 6 s. The
  file is only instrumented under Stryker.
- **CI:** would have caught it, and did: the pre-push gate is where it
  surfaced. The cost is that it surfaces ~25 minutes in, after the whole
  parallel wave.
- **Code review:** the test reads correctly. Nothing on the page says
  "this file is mutated".

## Countermeasure

The invariant moved to `infra/cdk/test/unit/eradication-checks.test.ts`,
commit `93142d2` — the file that already holds the repository's source-invariant
tests, in a workspace whose mutation run covers `infra/cdk` gated files and
never touches `apps/`.

Verified non-vacuous: appending `export const DRIFT = 1;` to the site copy
fails the test with the diverging line quoted; removing it passes.

## Eradication (mandatory — code-level)

**Level 2 — DevX check via the pattern's own definition.** The
`test-source-invariant` blueprint now states the constraint in its
`@BlueprintDescription`, which is the text a writer is shown by the pre-write
hook **before** creating a file of this kind:

> *"It lives in a workspace whose gated files Stryker does not mutate: a test
> that reads a file off disk sees that file instrumented during a mutation
> run, and comparing two instrumented copies fails in the dry run before a
> single mutant is activated."*

That is the highest level reachable here. Level 1 would mean making the
mistake unexpressible, which would require knowing at lint time that a given
`readFileSync` argument lands in a `--mutate` glob — a path that is computed,
and a glob that lives in another file.

The same description also dropped a sentence that PR #81 made false: it had
justified stripping comments before comparing, and there are no longer
comments to strip.

## Related

- [`the-mutants-were-judged-by-the-wrong-jury.md`](./the-mutants-were-judged-by-the-wrong-jury.md)
  — the other Stryker-instrumentation surprise from the same branch, on the
  scoring side rather than the reading side.
- [`a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md)
  — how to tell this failure (a real red test) from the timeout that shares
  the same gate.
