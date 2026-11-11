---
date: 2026-11-11
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#295'
fix-pr: none (the kaizen pull request of PR #295 lands it; its number is not known when this is written)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.oxlintrc.json, apps/talos/vitest.config.ts]
time-to-detect: minutes
tags: [vitest, testing, gates, last-loop-lepin, talos]
zone: apps/last-loop-lepin/api/src/helpers/observability/wide-event.middleware.test.ts
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
      - back-e2e runs `isolate: false` in one fork, so every file shares one module cache
        - a hoisted `vi.mock` cannot replace a module the cache already holds

## Root cause of occurrence

*Thought a `vi.mock` at the top of a file applies to that file, actually under
`isolate: false` it applies only if no earlier file loaded the module.*

`apps/last-loop-lepin/vitest.config.ts` gives back-e2e `pool: 'forks'`,
`maxWorkers: 1`, `isolate: false`, as banana-rush, talos and pragma's database
suites do. Nothing told the author the file would run in such a project.

## Detection failure causes

- **Local:** the agent ran the file alone, where the mock applies.
- **Lint:** no rule knew which test files run with a shared module cache.

## Countermeasure

PR #295 (`bece68f92`) injected the trace-id reader into the middleware, so
the test passes a stub and mocks no module. This entry stops the next one.

## Eradication

**Type:** DevX check (level 2). `eslint/no-restricted-properties` refuses
`vi.mock` in every API test file that a back-e2e project runs. The core,
utils, adapter and schema tests run in the isolated `core` project and are
exempt by name, with pragma's `main.test.ts`, which pragma lists there.
`vi.doMock` stays allowed: it follows `vi.resetModules()` and a dynamic
import, which is the form that works in a shared cache
(`apps/talos/api/src/helpers/secrets/parameter-store.client.test.ts`).

The check found one more file with the same hazard,
`apps/talos/api/src/main.export.test.ts`, which mocked the export adapter from
back-e2e. It moves to talos's `core` project, as pragma's `main.test.ts` did.

```diff
+    {
+      "files": ["apps/*/api/src/**/*.test.ts", "apps/*/test/**/*.test.ts"],
+      "rules": {
+        "eslint/no-restricted-properties": [
+          "error",
+          { "object": "vi", "property": "mock", "message": "This file runs in a back-e2e project with isolate: false, …" }
+        ]
+      }
+    },
```

**Proof it can fail:** the test file as it stood before `bece68f92`, linted with the rule:

```
apps/last-loop-lepin/api/src/helpers/observability/wide-event.middleware.test.ts:7:1: error eslint(no-restricted-properties): 'vi.mock' is restricted from being used
```

**Similar instances:** `grep -rl 'vi.mock(' apps/*/api` found 15 files. 13 are
adapter tests and one is pragma's `main.test.ts`, all in an isolated project.
The last is talos's `main.export.test.ts`, moved. `oxlint apps` exits 0 after the move.
