---
date: 2026-08-21
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#81'
fix-commits: [03e16d4d6d, 9514a2ffb]
eradication-level: 2
eradication-paths: [eslint-rules/no-api-declaration-repeated-in-site.js, .oxlintrc.json, apps/last-loop-lepin/domain/haversine.core.ts]
time-to-detect: ~25 minutes (one full pre-push wave)
tags: [stryker, mutation, vitest, testing, gates, blueprint]
zone: infra/cdk/test/unit/eradication-checks.test.ts
weak-point: gate-measures-nothing
recurs: [the-mutants-were-judged-by-the-wrong-jury]
---

# The invariant test read a file Stryker was rewriting

## User impact

The agent pushing PR #81 lost one pre-push wave, about 25 minutes, to a test
that passed locally in 6 s (measured, in that session). The mutation gate died
before running a single mutant:

```
ERROR DryRunExecutor One or more tests failed in the initial test run:
  the site copy of this module computes distance from the same source as this one
    expected 'function stryNS_9fa48() {\n  var g = …' to be 'function stryNS_9fa48() {\n  var g = …'
```

| | Seen | Expected |
| --- | --- | --- |
| Pre-push mutation gate | dry run fails, no score | a mutation score |
| The failing assertion | two strings that print the same, compared unequal | the two source files compared |

## Causal chain

- The mutation dry run failed on the invariant test.
  - The test compared two strings that differed.
    - They were not the source files. Stryker had instrumented both
      `haversine.utils.ts` copies, and gives each file its own mutant id
      range, so two copies of one source come out as two different strings.
      - The dry run executes the suite against the instrumented tree to
        collect per-test coverage, so the files are rewritten before any
        mutant is active.
        - The test sat in the sibling suite of `haversine.utils.ts`, a gated
          pure module in Stryker's `--mutate` set, and read both copies off
          disk.
          - The test existed to hold two byte-identical copies equal:
            `apps/last-loop-lepin/api/src/helpers/geo/haversine.utils.ts`
            and `apps/last-loop-lepin/site/src/lib/haversine.utils.ts`.
            - The site and the API had no shared folder, so a rule both
              needed lived twice. `domain/` arrived only with PR #166.
              (Machine)

## Root cause of occurrence

*Thought a test that reads a file off disk observes the source, actually it
observes whatever is on disk at that moment, and under a mutation run that is
the instrumented copy.* (Material)

The agent on PR #81 had no document saying Stryker rewrites gated files in
place for the dry run (inferred: the `test-source-invariant` blueprint gained
that sentence only in this entry's fix). The failing assertion above shows
the `stryNS_` scaffolding in both strings. Had the agent known, the test would
have lived outside a mutated workspace from the start.

## Detection failure causes

- **Typing and lint:** neither reads a file at runtime.
- **Local:** `vitest run` passed, 8 tests in 6 s. Files are instrumented only
  under Stryker.
- **Pre-push:** it caught the defect, about 25 minutes in, after the whole
  parallel wave.
- **Review:** the test reads correctly. Nothing on the page says the file it
  reads is mutated.

## Countermeasure

The invariant moved to `infra/cdk/test/unit/eradication-checks.test.ts`, the
file that already held the repository's source-invariant tests, in a
workspace whose mutation run never touches `apps/`. It landed on main in
`8621866aa`, already moved, so `git log -S` finds no commit on main with the
test in its first place. Appending `export const DRIFT = 1;` to the site
copy failed the test with the diverging line quoted, and removing it passed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `03e16d4d6` added the Stryker constraint to the
`@BlueprintDescription` of `test-source-invariant`, which still reads "It
lives in a workspace whose gated files Stryker does not mutate". That is a
written instruction, and the pre-write hook that showed blueprints was
deleted in `c54e32da7` (PR #224).

The cause was removed instead. Commit `9514a2ffb` (PR #166) moved the rule to
one copy, `apps/last-loop-lepin/domain/haversine.core.ts`, which the site and
the API both import through `@domain/*`. The invariant test was deleted in
the same commit, because nothing is left to compare. The lint rule
`borso/no-api-declaration-repeated-in-site`, enabled in `.oxlintrc.json`,
refuses a site declaration whose name the API or `domain/` already declares,
so a second copy cannot be written.

**Proof it can fail:** a duplicate planted in a scratch site file this
session, then removed (measured).

```text
apps/last-loop-lepin/site/src/lib/planted-haversine.utils.ts:1:17: error borso(no-api-declaration-repeated-in-site): `haversineDistanceMeters` is already declared in `apps/last-loop-lepin/domain/haversine.core.ts`.
```

**Similar instances:** `git ls-files | grep -i haversine` lists only the
`domain/` module and its test. The rule covers every app's site against its
API and `domain/`. A copy under a new name walks past it, which is the gap
left.
