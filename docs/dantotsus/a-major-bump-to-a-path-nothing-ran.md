---
date: 2026-11-05
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#274'
fix-pr: none (opened by the kaizen pull request for #274)
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

- A major bump merged with no run of the code it changes
  - `setup()` takes `DATABASE_URL` when set and starts a container only otherwise
    - `test:e2e` sets it through `scripts/local-postgres.sh`, and CI's `services: postgres` sets it too
      - so the fallback, and the library behind it, were dead in every gate

## Root cause of occurrence

*Thought the testcontainers branch was the CI path, actually CI injects
`DATABASE_URL`.* `docs/knowledge/local-postgres-without-docker.md` said
"keep the testcontainers branch as the CI path", while `.github/workflows/ci.yml`
says "test/setup-postgres.ts trusts DATABASE_URL verbatim".

## Detection failure causes

- **knip:** the import is live, so the dependency reads as used.
- **Coverage:** `test/` sits outside the coverage globs.
- **Audit triage:** PR #274 bumped the package without asking who runs it.

## Countermeasure

`setup()` requires `DATABASE_URL` and throws without it, as pragma's
already did. The container branch, the teardown and the dependency are
removed, and the knowledge entry and the README no longer describe a
fallback.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `[self]` on the kaizen branch for PR #274

```diff
-import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
-  container = await new PostgreSqlContainer('postgres:16-alpine')
+  if (externalUrl === undefined || externalUrl.length === 0) {
+    throw new Error('last-loop-lepin back-e2e: DATABASE_URL must be set. …');
+  }
```

**Proof it can fail:** `DATABASE_URL= pnpm exec vitest run --project back-e2e`
stops with `Error: last-loop-lepin back-e2e: DATABASE_URL must be set.`;
`pnpm run test:e2e` passes 136 tests. `pnpm audit` moved from 24 to 22
moderate findings.

**Similar instances:** `grep -rln testcontainers apps --include=package.json`
finds none left. pragma, banana-rush and talos already required `DATABASE_URL`.
