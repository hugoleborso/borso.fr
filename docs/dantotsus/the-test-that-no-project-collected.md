---
date: 2026-09-18
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#108'
fix-commits: [2d5502de8f]
eradication-level: 5
eradication-paths: [apps/pragma/vitest.config.ts, apps/last-loop-lepin/vitest.config.ts]
time-to-detect: months
tags: [gates, testing, vitest, pragma, last-loop-lepin, meta]
zone: apps/last-loop-lepin/vitest.config.ts
weak-point: gate-measures-nothing
recurs: [three-green-gates-on-code-that-ran-nowhere]
---

# The test that no project collected

## User impact

A session wrote a new test at `apps/pragma/site/src/sw/service-worker.test.ts`
and ran it. Vitest refused to find it (measured, PR #108):

```
No test files found, exiting with code 1

filter: site/src/sw/service-worker.test.ts
projects: core

include: domain/**/*.core.test.ts, api/src/**/*.core.test.ts,
  api/src/**/*.utils.test.ts, api/src/**/*.adapter.test.ts,
  api/src/**/*.schema.test.ts, cdk/test/**/*.test.ts,
  site/src/**/*.utils.test.ts, site/src/**/*.core.test.ts,
  site/src/**/*.adapter.test.ts, site/src/**/*.test.tsx
```

| | Seen | Expected |
| --- | --- | --- |
| `vitest run` without a filter | green, the new file silently absent | green with the new file run, or red |
| `vitest run site/src/sw/service-worker.test.ts` | `No test files found` | the file's tests run |

Only the filtered run showed it. Unfiltered, the suite passed without the
file. That is why `apps/pragma/site/public/sw.js` had no test: anyone who
wrote one got a pass and no test.

## Causal chain

- The new test file did not run.
  - The `core` project of `apps/pragma/vitest.config.ts` listed its
    `site/src` includes by suffix:
    `'site/src/**/*.utils.test.ts'`, `'site/src/**/*.core.test.ts'`,
    `'site/src/**/*.adapter.test.ts'`, `'site/src/**/*.test.tsx'`.
    A `.test.ts` named after its subject matched none of them.
    - The includes mirror `coverage.include`, which selects the gated pure
      files by the same suffixes. Collection copied the coverage list.
      - The two full-stack workspaces, pragma and last-loop-lepin, carried
        the suffix lists since before the vitest 4 move, `f1c25506e`, which
        copied them unchanged out of `vitest.workspace.ts` (inferred: the
        commit that first wrote them was not traced further). Each new
        layer suffix, such as `.adapter.test.ts` in `f27096f86`, was added
        to both lists by hand.
        - The config held two copies of one fact, which files are
          gated, and used the second copy to decide which files run. A
          test named outside the list fell between them (Machine).

## Root cause of occurrence

*Thought a committed test file runs, actually it runs only if some project's
include matches its name, and the includes were a suffix list copied from
coverage.* (Machine)

The front-end-only workspaces did not share the shape. `borso-fr` collects
`site/src/**/*.test.{ts,tsx}`. The config's structure, not the writer,
made the suffix a precondition for running.

## Detection failure causes

- **Typing:** a test file that is never loaded still typechecks.
- **Linter:** the `borso/test-file-has-sibling-source` rule reads source to
  test. It asks whether a gated file has a test beside it, never whether a
  test is loaded. knip treats every `*.test.ts` as an entry point, so an
  uncollected test still reads as reachable.
- **Local validation and CI:** an unfiltered `vitest run` prints a file
  count nobody compares against the tracked file count. Coverage cannot
  report a file no test loaded, so absence and success look the same.
- **Review:** a reviewer reads the test and the source. The include list
  lives in a config the diff does not touch.

## Countermeasure

Both full-stack workspaces were widened to `site/src/**/*.test.{ts,tsx}`,
which the other two already used.

```diff
-           'site/src/**/*.utils.test.ts',
-           'site/src/**/*.core.test.ts',
-           'site/src/**/*.adapter.test.ts',
-           'site/src/**/*.test.tsx',
+           'site/src/**/*.test.{ts,tsx}',
```

Verified: the filtered run then collected `service-worker.test.ts`.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`2d5502d`](https://github.com/hugoleborso/borso.fr/commit/2d5502de8f7e3f47272dbea3d02a0f23c3165f7a) (PR #109).

What holds today is the widened `site/src` glob in
`apps/pragma/vitest.config.ts` and `apps/last-loop-lepin/vitest.config.ts`.
It closes this folder only. The `core` project of pragma still collects
`scripts/**` by `.core.test.ts` and `.adapter.test.ts`, `domain/**` by
`.core.test.ts`, and four `api/src` files one by one. A test elsewhere in
those folders with another name would run nowhere again.

The gate that covered the class, `scripts/check-every-test-is-collected.sh`,
asked `vitest list --filesOnly` which files it collects and compared that to
the tracked test files. Commit `c54e32da7` (#224) deleted it, by operator
decision, and its message says "a test file no project collects ... now
pass[es] silently". So no check holds the class today, and the level is
the floor.

**Proof it can fail:** before its deletion, the gate named every file that
stopped being collected when pragma's include was narrowed back (measured in
PR #109). Nothing exists to fail today.

**Proposed:** make collection complete by construction. Each workspace would
have one catch-all project that includes `**/*.test.{ts,tsx}` and excludes
exactly the files the other projects include, read from the same constants.
pragma's `back-e2e` project already uses this shape: it includes
`api/src/**/*.test.ts` and excludes `PURE_TEST_FILES` and
`ASSISTANT_TEST_FILES`. Every test file would then land in some project
without a list or a gate, and the suffix would stop deciding whether a test
runs.

**Similar instances:**
`git ls-files 'apps/*' | grep -E '\.test\.tsx?$' | grep -vE '^apps/[^/]+/(site/src/|api/src/|test/|cdk/test/)' | grep -vE '^apps/[^/]+/(domain/.*\.core\.test\.ts|scripts/.*\.(core|adapter)\.test\.ts)$'`
prints nothing on 2026-11-27, so no tracked test sits outside those
patterns today (measured, a rough match that ignores per-app differences).

**Related.**

- [The allowance that parked a duplicate, and then let it grow](./the-allowance-that-let-a-duplicate-grow.md), the defect this one was found while fixing.
- [Three green gates on fifty-eight lines that ran nowhere](./three-green-gates-on-code-that-ran-nowhere.md), the same family: a gate whose green says less than it appears to.
