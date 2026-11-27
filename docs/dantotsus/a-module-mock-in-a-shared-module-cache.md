---
date: 2026-11-11
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#295'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/vitest.config.ts, apps/last-loop-lepin/vitest.config.ts, apps/banana-rush/vitest.config.ts, apps/talos/vitest.config.ts]
time-to-detect: minutes
tags: [vitest, testing, gates, last-loop-lepin, talos]
zone: apps/last-loop-lepin/vitest.config.ts
recurs: none (the-connection-parameter-no-mock-could-refuse is about what a mock cannot see, not about a mock that never applies)
---

# A mock that applied alone and vanished in the suite

## User impact

The test that pinned the wide event's `trace.id` in last-loop-lepin passed
when run alone and failed in the suite CI runs. Round 1 of technical
validation caught it (C02, D07); had it not, CI would have gone red on a test
that looked correct.

| | Seen | Expected |
| --- | --- | --- |
| `vitest run wide-event.middleware.test.ts` | 4 of 4 passed | 4 of 4 passed |
| the same file after `app.test.ts` in back-e2e | `expected { …(11) } to match object { trace.id }` | pass |

## Causal chain

- The `trace.id` assertion failed in the suite only
  - `findActiveTraceId` answered `null`: the real adapter ran, not the mock
    - `app.test.ts`, earlier in the same fork, had loaded the real `error-reporting.adapter`
      - back-e2e ran `isolate: false` in one fork, so every file shared one module cache, and a hoisted `vi.mock` cannot replace a module the cache already holds

        ```ts
        pool: 'forks',
        maxWorkers: 1,
        isolate: false, // ❌ one module cache for every back-e2e file
        fileParallelism: false,
        ```

        - Commit `f1c25506e` (2026-08-09, an agent) moved every workspace to vitest 4. The vitest 2 config said `poolOptions: { forks: { singleFork: true } }` and no `isolate`, so each file had its own module cache under vitest's default `isolate: true`. The commit wrote `isolate: false` beside `maxWorkers: 1` and described both as "Vitest 4's spelling of what `poolOptions.forks.singleFork` used to say".
          - The vitest 4 migration guide's example config moves `singleFork` and an existing `isolate: false` out of `poolOptions.forks` together, and its after block shows `maxWorkers: 1` next to `isolate: false`. Its text says only "`singleThread` and `singleFork` are now `maxWorkers: 1`" (read this session at `raw.githubusercontent.com/vitest-dev/vitest/v4.0.0/docs/guide/migration.md`). (Material)

## Root cause of occurrence

*Thought vitest 4 spells `singleFork` as `maxWorkers: 1` plus `isolate: false`,
actually `singleFork` is `maxWorkers: 1` alone, and `isolate: false` makes every
file share one module cache.*

Material, inferred. The commit's wording matches the guide's example block,
where `isolate: false` sits beside the migrated `singleFork` because the
example's before config already had it. The commit's own reason, "the back-e2e
suites share one Postgres", needs serial files only, and `maxWorkers: 1` with
`fileParallelism: false` gives that. Whether the agent read the guide's text
line or only its example is not recorded.

## Detection failure causes

- **Local:** the agent ran the file alone, where the mock applies.
- **Lint:** nothing knew which test files share a module cache.
- **Review of `f1c25506e`:** the message gave one reason for two settings, so a reader saw a justified block.

## Countermeasure

PR #295 (`bece68f92`) injected the trace-id reader, so its test mocks no
module. The kaizen sweep then first added a lint rule refusing `vi.mock` in
back-e2e files, with a list of exempt files written by hand. That list copied
which files the vitest projects isolate; it drifted within the hour, when
PR #298 added an isolated test that mocks modules. The operator rejected the
approach: a list maintained by hand is not a fix, and refusing a standard
vitest tool to protect a setting nobody chose is backwards.

## Eradication

**Type:** structural impossibility (level 1), by subtraction. Every back-e2e
project runs with vitest's default isolation, so each file gets its own module
cache and a hoisted mock always applies. The lint rule and its list are
deleted.

**Reference:** the commit adding this file (`fix-commits: [self]`).

```diff
           pool: 'forks',
           maxWorkers: 1,
-          isolate: false,
           fileParallelism: false,
```

Cost, measured on 2026-11-12: last-loop-lepin's back-e2e went from 5.1 s to
22.0 s and pragma's from 114 s to 173 s. Almost all of it is module import
(last-loop-lepin 1.4 s to 14.2 s), the per-file cost of loading each API's
dependency graph. Test time barely moved (2.8 s to 3.6 s).

Isolation also surfaced a second hidden coupling. pragma's
`test/auth-utils.ts` numbered test usernames with a module counter, unique
only because every file shared it; isolated, two files both created
`tester4` and the insert failed. The username now carries the member id.

**Proof it can fail:** PR #295's original test, which hoisted
`vi.mock('./error-reporting.adapter', …)`, run after `app.test.ts` in one
back-e2e run: failed in round 1 with `isolate: false`
(`expected { …(11) } to match object { trace.id }`), passes now (11 of 11).

**Similar instances:** `grep -n "isolate" apps/*/vitest.config.ts` returns
nothing; all four full-stack apps run isolated, and every back-e2e suite
passes (last-loop-lepin 145, banana-rush 43, talos 167, pragma 467 tests).
