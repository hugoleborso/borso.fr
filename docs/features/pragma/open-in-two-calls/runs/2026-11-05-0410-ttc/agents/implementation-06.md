---
status: done
summary: |
  Fix round 1 is done. Both blocking findings are fixed and proven by tests that fail
  on the old code (measured). A body that is not JSON now answers 400 read-batch-invalid
  and reports once, under either content type. Reads that failed in one batch retry as
  one batch again: five reads under a real QueryClient with retry 1 sent two POSTs, where
  the old closer sent one POST and five GETs. The no-request-fan-out-in-site rule now
  catches every array iteration (forEach, reduce, filter and the rest) and any request
  sent without await in a loop body. It also catches a read awaited inside a loop through
  Promise.all, prefetchQuery or ensureQueryData. A planted forEach and a planted loop push
  each drew the rule's error, and the plant was removed. All three non-blocking findings
  are fixed or dismissed with a reason. Every gate passes.
artifacts:
  - apps/pragma/api/src/read-batch/read-batch.controller.ts
  - apps/pragma/api/src/read-batch/read-batch.controller.test.ts
  - apps/pragma/api/src/read-batch/read-batch.service.ts
  - apps/pragma/api/src/read-batch/read-batch.schema.ts
  - apps/pragma/site/src/lib/read-batch.adapter.ts
  - apps/pragma/site/src/lib/read-batch.adapter.test.ts
  - apps/pragma/site/src/lib/read-batch.core.ts
  - apps/pragma/site/src/lib/api.client.test.ts
  - eslint-rules/no-request-fan-out-in-site.js
  - eslint-rules/no-request-fan-out-in-site.test.js
  - docs/standards/06-data-fetching.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-06.md
next:
  kind: validate
---

# Implementation 06, fix round 1

Goal: one pragma client never sends more than the production API's reserved concurrency of 10, on any route.
Smallest change: answer the spec's code for a body that is not JSON, keep a failed group together on its retry, and widen the fan-out rule to the whole class.
Data shape: the transport keeps one more group, `retryGroup`, plus the set `failedReads` of read identities whose batch failed. A read whose identity is in that set joins `retryGroup`. That group closes on a timer turn instead of a microtask, then the set is cleared.

## Findings

| Finding | Type | Outcome | What changed, or why not |
|---|---|---|---|
| A05 / D19 / B13 | blocking | Fixed | `read-batch.controller.ts` no longer uses `zValidator`. Hono's json validator throws `Malformed JSON in request body` before the hook runs. The handler now reads the body as text, runs `parseJsonOrNull` (re-exported through the slice service, as `no-controller-imports-outside-service` asks), then `readBatchSchema.safeParse`, so the report and the `400 read-batch-invalid` share one path. The test now covers `application/json` and `text/plain` and asserts the code and exactly one report. On the old controller it fails for the JSON content type (measured). This also makes the VOCABULARY line from B13 true. |
| A22 / D16 | blocking | Fixed | `read-batch.adapter.ts` remembers the identities in a batch that was refused or dropped. A later read with one of those identities joins a retry group, and `closeRetryGroup` (default `setTimeout(close)`) closes it. TanStack schedules every retry timer of one failure in the same tick. Those timers expire before a zero-delay timer that the first retry starts, so every retry lands in the group (measured below). A lone `GET` that failed is not remembered, because it has no group to keep. `reset()` clears both. New tests: adapter cases for a refused and a dropped batch, a shared read with both callers, a fresh read closing in its own task, the set cleared after the retry group leaves and on reset, and a lone `GET`, a second retry carrying only its own reads, a retry dropped on reset, and the default timer closer under fake timers. That last test fails with `queueMicrotask` planted (measured). In `api.client.test.ts`, a real `QueryClient` with `retry: 1` and the default closers sends `['POST /api/read-batch', 'POST /api/read-batch']` for five reads. With the closer planted back to `queueMicrotask`, it sends one POST and five GETs (measured). |
| Orchestrator, rule B | added | Fixed | `no-request-fan-out-in-site.js` now treats every array iteration method as fan-out (`map`, `flatMap`, `forEach`, `reduce`, `reduceRight`, `filter`, `find*`, `some`, `every`, plus `Array.from`). In a loop body it reports the outermost request sent without `await`, once, including nested loops. It reports `readAwaitedInLoop` when an awaited call reaches a read anywhere in its arguments, for example `await Promise.all([query(a), query(b)])`. The read set adds `prefetchQuery` and `ensureQueryData`. The literal-array allowance, awaited writes in a loop and requests inside handlers still pass. The tests grow from 21 to 35 cases, and the rule has 100% line, branch and statement coverage (measured, `--coverage.include` on the rule). A plant in `apps/pragma/site/src/lib/queries/` with a `forEach` of `$get` and a `for…of` pushing `$get` drew two errors. The plant was removed. `scripts/lint-repository.sh` exits 0, so no existing site code trips the wider rule. Standard 06 *Enforced by* now describes the rule as it is. |
| B10 | non-blocking | Fixed | `domain/` imports no zod (grep), and the site never loads the API schema, so `ReadBatch` cannot be a `z.infer` in the domain. Instead the API schema is now typed `z.ZodType<ReadBatch>`, so typecheck fails if the schema and the domain type drift apart. |
| B11 | non-blocking | Fixed | `toBatchedRead` in `site/src/lib/read-batch.core.ts` now carries `// @FollowsBlueprint core-decision`. |
| B12 | non-blocking | Dismissed | The six D13 counts belong in the slice-4 commit body. Putting them there means rewriting a pushed commit, which needs a force-push, and that is the operator's call. `implementation-04.md` records that both closers sent equal counts but gives no numbers. The orchestrator should put the measured counts in the PR body, as the validator suggested. |
| Note: abort listener never removed | note | Fixed | Each caller's `abort` listener is now registered with the signal of a private `AbortController`. That controller aborts once the caller's promise settles. Two tests assert the listener is detached after an answer and after a failure. |
| Note: offline network error reported | note | Left for the orchestrator | Whether a tab that is simply offline should raise `read-batch-failed` is a product decision about the alert. The code is unchanged. |
| Note: route counts above the inferred bounds | note | Left for the orchestrator | This is a spec decision, already raised in `implementation-05.md`. |
| Note: non-batchable reads bypass the cap | note | Dismissed | No site read carries a header outside `PRAGMA_REQUEST_HEADERS` or a path outside `/api/` (validator's grep). Rule B and `no-direct-api-fetch-in-site` hold the shapes that would add one. |

## Gates

| Gate | Command | Result |
|---|---|---|
| Lint, type-aware | `pnpm exec oxlint --type-aware <changed files>` and `scripts/lint-repository.sh` | exit 0 |
| Format | `pnpm exec oxfmt --check <changed files>` | clean |
| Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 |
| Core tests with coverage | `pnpm exec vitest run --project core --changed origin/main --coverage` | 103 files, 728 tests passed, no threshold error |
| Back e2e | `pnpm run test:e2e api/src/read-batch/read-batch.controller.test.ts` | 13 passed |
| Rule tests | `pnpm exec vitest run eslint-rules/` | 50 files, 942 tests passed |
| Mutation | `scripts/mutate-changed.sh origin/main` | Run 1 left 2 survivors (`retryGroup = []` after a close and on reset) and 1 uncovered default closer. Three tests were added. Run 2 scored 100.00 with 732 killed, 1 timed out and 0 survived, and every changed gated file passed |

## Friction logged

Three lines under `fix-1`: the zValidator malformed-JSON trap, the retry-task assumption in the plan, and `eslint-rules/*.js` sitting outside the root coverage include.
