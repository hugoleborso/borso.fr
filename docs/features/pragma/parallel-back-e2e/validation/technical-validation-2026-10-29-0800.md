# Technical validation — Parallel back-e2e suites for pragma

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/gallant-franklin-vfg0cg
- Base: origin/main (148ae4bf)
- Run at: 2026-10-29T08:13:42Z
- Touched workspaces: @borso-app/pragma (test harness and `vitest.config.ts` only), docs/knowledge

0 use cases routed to /visual-validation; out of scope for this report. The spec has no *Use cases / edge cases* or *Test strategy* section, so category D is built from its *Done means* list (see Notes).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Decision 1 | Template database migrated once per project in `globalSetup` | apps/pragma/test/setup-postgres.ts:141-148 | `const templateName = \`${prefix}_template\`;` … `await administration.unsafe(\`CREATE DATABASE "${templateName}"\`);` … `await applyMigrations(urlOfDatabase(baseUrl, templateName));` | PASS |
| A02 | Decision 1 | Each worker gets its own database cloned with `CREATE DATABASE ... TEMPLATE` | apps/pragma/test/worker-database.setup.ts:5,13-15,19 | `const workerDatabaseName = \`${source.workerDatabasePrefix}${String(process.pid)}\`;` … `` `CREATE DATABASE "${workerDatabaseName}" TEMPLATE "${source.templateName}"` `` … `process.env.DATABASE_URL = workerDatabaseUrl.toString();` | PASS |
| A03 | Decision 1 / plan | Files run in parallel: `maxWorkers` raised, `fileParallelism: false` removed, `isolate: false` kept | apps/pragma/vitest.config.ts:19,23,25-26 | `const DATABASE_WORKERS = 4;` `setupFiles: ['./test/worker-database.setup.ts'],` `maxWorkers: DATABASE_WORKERS,` `isolate: false,` (diff removes `fileParallelism: false`) | PASS |
| A04 | Decision 2 | `truncateAllTables`, `countLockWaiters`, `abortCommitsWritingTable` scoped to one worker's database | apps/pragma/test/database-utils.ts:46-47,64-65,170 (unchanged) | `return getDatabase();` · `WHERE datname = current_database() AND wait_event_type = 'Lock'` · `const database = getDatabase();` — and `getDatabase()` reads `DATABASE_URL` (api/src/database/client.ts:46), which the setup file sets before any test module calls it | PASS |
| A05 | Decision 3 | Runs in CI, where `DATABASE_URL` names a superuser | .github/workflows/ci.yml:348,359 (unchanged) | `POSTGRES_USER: app` … `DATABASE_URL: postgres://app:app@localhost:5432/app` (the postgres image makes `POSTGRES_USER` a superuser, so `CREATE DATABASE` is allowed). The CI-shaped `vitest run --project back-e2e-assistants` passed locally: 15 files / 74 tests in 40.8 s | PASS |
| A06 | Decision 4 / plan | `pnpm run dev:db` still migrates and seeds the dev database | apps/pragma/test/dev-database.setup.ts:10-16 | `await applyMigrations(databaseUrl);` `process.env.STAGE = 'dev';` `const summary = await seedPreviewFixture(...)`; ran `pnpm run dev:db`: exit 0, `[dev:db] migrations applied, fixture seeded: 4 members` | PASS |
| A07 | Decision 5 / plan | Other apps unchanged, with a recorded reason | `git diff --name-status origin/main...HEAD` | Only `apps/pragma/**` and `docs/knowledge/**` appear; plan row 5 gives 5 s, 7 s and 8 s serial suites and about 80 lines of harness per app | PASS |
| A08 | Plan, decision 1 | Leftover worker databases dropped before the run and in teardown | apps/pragma/test/setup-postgres.ts:144,155-158 | `await dropWorkerDatabases(administration, workerDatabasePrefix);` (setup and returned teardown). After run 1, `pg_database` held only the two `_template` databases and no `_worker_` database | PASS |
| A09 | Done means | "The suite passes with several workers locally" | `pnpm --filter @borso-app/pragma run test`, run three times | 44 files / 378 tests passed each time: 3m16s, 2m59s, 3m05s | PASS |
| A10 | Done means | "…and in CI, and stays green on three consecutive CI runs" | — | No pull request exists yet; no CI run of this branch can be read from here | UNVERIFIABLE |
| A11 | Done means | "Before and after wall-clock times, locally and in CI, are in the pull request" | — | No pull request yet. Local figures measured here: 7 min 42 s / 491 s before (spec), 2m59s–3m16s after | UNVERIFIABLE |
| A12 | Done means | "No test is skipped or weakened" | `git diff --name-status origin/main...HEAD` | No `*.test.ts` file in the diff; 378 database tests and 2848 core tests ran, none skipped | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent, no one-letter locals | Read all four changed TS files | `administration`, `workerDatabasePrefix`, `templateName`, `databaseNamePrefix`, `urlOfDatabase`; `datname` is the Postgres column name it destructures | PASS |
| B02 | Function names describe the result | Read new functions | `readDatabaseUrl`, `databaseNamePrefix`, `urlOfDatabase`, `dropWorkerDatabases`, `withAdministration` | PASS |
| B03 | Magic numbers / strings named | Read changed files | `DATABASE_WORKERS = 4`, `NON_IDENTIFIER_CHARACTERS`; the remaining `max: 1` and `timeout: 5` are option values named by their key, same shape as the existing `applyMigrations` | PASS |
| B04 | No comments | Read changed files | No comments added; the only JSDoc is the `@Blueprint` block on vitest.config.ts:37-43, a machine-read annotation | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z{]'` on changed files | none found; `pool: 'forks' as const` is unchanged | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | One hit, in a user-facing string: dev-database.setup.ts:20 `` `[dev:db] sign in as any of: ...` `` — not a type | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | Read changed files | No index access in new code; `baseUrl.pathname.slice(1)` returns a string | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware` on the four changed TS files | exit 0, no output | PASS |
| B09 | Formatting | `pnpm exec oxfmt --check` on the four changed TS files | `All matched files use the correct format.` | PASS |
| B10 | Typecheck | `pnpm exec tsc --noEmit -p tsconfig.json` in apps/pragma (`test/**/*.ts` and `vitest.config.ts` are included) | exit 0 | PASS |
| B11 | knip | `pnpm exec knip` | exit 0; the newly exported `applyMigrations` has a consumer (dev-database.setup.ts:4) | PASS |
| B12 | `useEffect` | grep on changed files | no `.tsx` changed, none found | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (database suites) | `pnpm --filter @borso-app/pragma run test` ×3 | 0, 0, 0 (44 files, 378 tests each) | PASS |
| C02 | @borso-app/pragma (assistants, as CI runs it) | `pnpm exec vitest run --project back-e2e-assistants` | 0 (15 files, 74 tests) | PASS |
| C03 | @borso-app/pragma (core + per-file coverage gate; `vitest.config.ts` changed) | `pnpm --filter @borso-app/pragma run test:core` | 0 (289 files, 2848 tests, thresholds held) | PASS |
| C04 | `*.utils.ts` in touched workspaces | `git diff --name-status` | No `*.utils.ts` / `*.core.ts` added or changed | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Workers do not share database state (truncation between tests) | **structural:** worker-database.setup.ts:5 names the database after `process.pid`, which no two live processes share; exercised by the full suite (C01) where every file truncates in `beforeEach` while three others run | PASS |
| D02 | Lock-wait helpers count only their own worker's waiters | **structural:** database-utils.ts:65 `WHERE datname = current_database()`; the lock tests passed in all three parallel runs (C01), which the spec makes the flakiness criterion | PASS |
| D03 | `abortCommitsWritingTable`'s fixed-name objects do not collide | **structural:** the sequence, function and trigger are created through `getDatabase()` (database-utils.ts:170-171) in the worker's own database, so the fixed names are per database | PASS |
| D04 | Suite stays green on three consecutive CI runs | — (no CI run of the branch yet) | UNVERIFIABLE |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Application write paths | Check-then-write | `git diff --name-status` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`; the diff writes only test databases | PASS |
| E02 | `CREATE DATABASE <prefix><pid>` (worker-database.setup.ts:12-15) | Two processes claiming the same worker database | Held by the name: pid is unique among live processes, and the name includes the project slug and the per-checkout base name (`pragma_test_<checkout>`), so two worktrees do not collide | PASS |
| E03 | Module state in worker-database.setup.ts and the cached client (api/src/database/client.ts:29) | Per-process state | All per-process by design; the one cross-process resource is the database, keyed in E02. A process reused across project groups keeps its first database (plan risk 2), which is still its own | PASS |
| E04 | Concurrent proof | Has the per-worker isolation been seen under real concurrency? | The full suite with `maxWorkers: 4`, three runs, all green (C01) | PASS |

## Notes

- A10, A11, D04: no pull request exists yet, so the CI runs and the before/after times the spec wants in the PR body cannot be read from here. Paste these rows into the PR description, and record the CI timing of `app-tests (pragma-e2e)` from the first green run there.
- The spec has no *Use cases / edge cases* and no *Test strategy* section; category D was built from *Decisions 2* and *Done means*. For a harness change that may be enough, but `/specification` would normally require a Test strategy section.
- Question: two `pnpm run test` invocations in the same checkout at once share one prefix, and each run's global setup runs `DROP DATABASE ... WITH (FORCE)` on the other's worker databases and template. Read from the code, not probed. Before this change two such runs would have truncated each other's tables, so the hazard is not new; the code suggests it would now surface as dropped connections. Is a concurrent run in one checkout a case worth guarding?
- Observation, not a rule breach: worker-database.setup.ts:6-7 rebuilds the URL inline instead of reusing `urlOfDatabase` from setup-postgres.ts, so the URL logic exists in two places.
- Question: a process reused by the second project group clones a database from the second template that it never uses, because `getDatabase()` already holds a client to its first one. Harmless, and it costs one clone per reused process. Is it worth skipping?
- The two `_template` databases are left in place after the run (only worker databases are dropped in teardown); the next run's setup recreates them. Fine as is, noted for completeness.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
