---
date: 2026-11-05
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#274'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/last-loop-lepin/test/setup-postgres.ts, apps/last-loop-lepin/package.json]
time-to-detect: hours
tags: [deps, testing, last-loop-lepin, ci, pnpm]
zone: apps/last-loop-lepin/test/setup-postgres.ts
recurs: none (no earlier entry covers a dependency kept for a branch nothing executes)
---

# A major bump to a path nothing ran

## User impact

PR #274 bumped `@testcontainers/postgresql` from 10 to 12 to clear five
advisories (`@grpc/grpc-js`, `protobufjs`, `tmp`, `@fastify/busboy`, `undici`
5). The branch that calls it ran in no test, locally or in CI, so the major
bump merged unexercised.

| | Seen | Expected |
| --- | --- | --- |
| last-loop-lepin back-e2e | 136 tests pass, the container branch skipped | A test of the code the bump changes, or no such code |

## Causal chain

- A major bump merged with no run of the code it changes.
  - `setup()` in `test/setup-postgres.ts` used `DATABASE_URL` when set and started a container only otherwise.

    ```ts
    import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
      container = await new PostgreSqlContainer('postgres:16-alpine') // ❌ reached by no gate
    ```

    - `test:e2e` sets `DATABASE_URL` through `scripts/local-postgres.sh`, and CI's `services: postgres` sets it too. So the fallback, and the library behind it, were dead in every gate.
      - Commit `6f3b84222` (2026-05-15, an agent) gave CI a `services: postgres` that sets `DATABASE_URL`. Its message calls CI and `scripts/local-postgres.sh` the "same contract, different boot". It left the container branch and the knowledge line below in place.
        - Commit `8985eeecd` (2026-05-12, an agent) wrote in `docs/knowledge/local-postgres-without-docker.md`: "keep the testcontainers branch as the CI path". PR #274 read the branch as live CI code and bumped its library. (Material)

## Root cause of occurrence

*Thought the testcontainers branch was the CI path, actually CI injects
`DATABASE_URL` and never reaches it.*

Material. The input PR #274's audit sweep had about this code was a knowledge
entry that restated `ci.yml` in prose: "keep the testcontainers branch as the
CI path". `.github/workflows/ci.yml` says the opposite: "test/setup-postgres.ts
trusts DATABASE_URL verbatim". The prose copy drifted three days after it was
written, when `6f3b84222` changed CI and did not touch it.

## Detection failure causes

- **knip:** the import is live, so the dependency reads as used.
- **Coverage:** `test/` sits outside every app's coverage `include`, and `setup-postgres.ts` runs as a back-e2e `globalSetup`, outside the core project that measures coverage.
- **Audit triage:** the sweep bumped four catalog entries, five direct dependencies and nine transitive ones in one commit, by the message of `6250f706a`. Each row was judged by its advisory, and no step asked which gate runs the code a bump changes.

## Countermeasure

`setup()` requires `DATABASE_URL` and throws without it, as pragma's already
did. The container branch, the teardown and the dependency are removed. The
knowledge entry and the README no longer describe a fallback.

## Eradication

**Type:** structural impossibility (level 1). The branch and its dependency no
longer exist, so no bump can reach them.

**Reference:** the commit adding this file (`fix-commits: [self]`).

```diff
-import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
-  container = await new PostgreSqlContainer('postgres:16-alpine')
+  if (externalUrl === undefined || externalUrl.length === 0) {
+    throw new Error('last-loop-lepin back-e2e: DATABASE_URL must be set. …');
+  }
```

**Proof it can fail:** `DATABASE_URL= pnpm exec vitest run --project back-e2e`
stops with `Error: last-loop-lepin back-e2e: DATABASE_URL must be set.`, and
`pnpm run test:e2e` passes 136 tests (measured on the PR #274 branch).
`pnpm audit` moved from 24 to 22 moderate findings.

**Similar instances:** `grep -rln testcontainers apps --include=package.json`
finds none left. pragma, banana-rush and talos already required `DATABASE_URL`.
