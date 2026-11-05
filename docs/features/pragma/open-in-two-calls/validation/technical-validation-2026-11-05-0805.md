# Technical validation — pragma never asks the API for more than two things at once

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/wizardly-mendel-0nq8qs
- Base: 60345e484dade9b81a3d88f44045fe2341e16a6a (round 1's `Reviewed:`)
- Run at: 2026-11-05T08:05:32Z
- Round: 2
- Reviewed: 47a357db1c83652f237c485867df09e42ece106b
- Touched workspaces: @borso-app/pragma, the root `eslint-rules/` tooling

Round 2 reads only `git diff 60345e484..47a357db1` and re-checks every round-1 finding. The previous report is [`technical-validation-2026-11-05-0727.md`](./technical-validation-2026-11-05-0727.md). The fix round's outcome table is `runs/2026-11-05-0410-ttc/agents/implementation-06.md`.

The `technical-validator` agent could not be dispatched, because this session has no Agent tool. Its brief was followed inline.

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A05 / D19 / B13 (blocking). A body that is not JSON answers `400 read-batch-invalid` and reports | 47a357db1. apps/pragma/api/src/read-batch/read-batch.controller.ts:15-18 `const readBatch = readBatchSchema.safeParse(parseJsonOrNull(await context.req.text()));` then `reportInvalidReadBatch(context.req.path);` `return context.json({ error: READ_BATCH_INVALID }, 400);`. Test at read-batch.controller.test.ts:153-178 covers `application/json` and `text/plain`, asserts `{ error: 'read-batch-invalid' }` and `toHaveBeenCalledExactlyOnceWith({ name: 'read-batch-invalid', … })`. Both cases passed in C02. The VOCABULARY line of B13 is now true. | PASS |
| R02 | A22 / D16 (blocking). Reads that failed in one batch retry again as one group | 47a357db1. read-batch.adapter.ts:159-176 routes a remembered identity to `retryGroup`, closed by `setTimeout`. Fixed for the single failed batch round 1 measured: api.client.test.ts:188 `resends its reads once, again as one batch` sends `['POST /api/read-batch', 'POST /api/read-batch']` for five reads under a real `QueryClient` with `retry: 1`. Not fixed when two failed batches come due at different times, see A01. | FAIL (blocking), see A01 |
| R03 | B10 (non-blocking). `ReadBatch` hand-written beside the schema | read-batch.schema.ts:13 `export const readBatchSchema: z.ZodType<ReadBatch> = z.strictObject({`. Typecheck now fails on drift. The dismissal of `z.infer` holds: `grep -rn "from 'zod'" apps/pragma/domain` finds no import. | PASS |
| R04 | B11 (non-blocking). Blueprint marker on a `.core.ts` | apps/pragma/site/src/lib/read-batch.core.ts:44 `// @FollowsBlueprint core-decision` | PASS |
| R05 | B12 (non-blocking). D13 counts missing from the slice-4 commit body | Dismissed: adding them rewrites a pushed commit, which needs a force-push, the operator's call. The claim holds (slice 4 is in `origin` history before 60345e484). The counts still belong in the PR body. | PASS (dismissal holds) |
| R06 | Note. Abort listener never removed | read-batch.adapter.ts:183-187 `const listening = new AbortController();` … `{ signal: listening.signal }`, aborted when the answer settles. Tests at read-batch.adapter.test.ts:527, 541 | PASS |
| R07 | Note. Reads outside `PRAGMA_REQUEST_HEADERS` or `/api/` bypass the cap | Dismissed: no site read carries such a header or path. The claim holds (grep of `header: {` in non-test site code, no match, as in round 1). | PASS (dismissal holds) |

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Error cases, batch fails (spec.md:101) | "Every caller in the group gets that failure. `retry: 1` resends them once, again as one group." | apps/pragma/site/src/lib/read-batch.adapter.ts:159-163 | `function closeOpenRetryGroup(): void {` `waiting = mergeIdenticalReads(waiting, retryGroup);` `retryGroup = [];` `failedReads = new Set();` The first retry group to close forgets every failed identity, including those of a batch whose retries are not yet due. Measured with a temporary test (removed after) under a real `QueryClient` with `retry: 1`, fake timers and a fetch answering `503`, where the second request answers 50 ms after the first. Thirteen reads in one group, so two batches of 10 and 3, sent `["POST /api/read-batch","POST /api/read-batch","POST /api/read-batch","GET /api/songs/s10","GET /api/songs/s11","GET /api/songs/s12"]`. Two groups of two reads sent `[…3 POST…, "GET /api/songs/c","GET /api/songs/d"]`. The control, both batches failing at once, sent four POSTs. Throttling is the case where batches answer at different times. The 2-in-flight cap still holds. Fix size: one line (delete only the identities that joined the retry group). | FAIL (blocking) |
| A02 | Error cases, malformed batch | A non-JSON body answers `400 read-batch-invalid` and runs nothing | read-batch.controller.ts:15-19 | `if (!readBatch.success) {` … `return context.json({ error: READ_BATCH_INVALID }, 400);` before `answerReadBatch` | PASS |
| A03 | D10, D11, I3 (rule B) | The rule refuses every array iteration that sends, a request sent without `await` in a loop body, and a read awaited in a loop through `Promise.all`, `prefetchQuery` or `ensureQueryData` | eslint-rules/no-request-fan-out-in-site.js:32-45, 192-215 | `const ITERATION_METHOD_NAMES = new Set([` … `'forEach', 'reduce', …`; `function forEachOutermostUnawaitedRequest(node, isRequest, visit) {`; `function awaitsRead(call, readSenders) {`. `scripts/lint-repository.sh` exits 0 over every site, so the wider rule refuses no existing code. | PASS |
| A04 | Changes, docs | Standard 06 *Enforced by* describes the rule as it now is | docs/standards/06-data-fetching.md:246-254 | "an array iteration (`.map`, `.flatMap`, `.forEach`, `.reduce`, `.filter`, `.some` and the rest, or `Array.from`)" | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <10 changed .ts/.js>` | exit 0, no output | PASS |
| B02 | Lint clean over every site | `scripts/lint-repository.sh` | exit 0 | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | No `any`, assertions only `as const` / `as unknown` | grep on the changed sources | none found | PASS |
| B05 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the diff | none found | PASS |
| B06 | Controller imports only its service (`no-controller-imports-outside-service`) | read in full | read-batch.service.ts:8 `export { parseJsonOrNull } from '../helpers/json/json.core';`; the controller imports it from `./read-batch.service` | PASS |
| B07 | Names and verbs (01) | read every changed source in full | `closeAfterWaitingTimers`, `rememberFailedBatch`, `joinGroup`, `closeOpenRetryGroup`, `forEachOutermostUnawaitedRequest`, `awaitsRead` each say what they do; no abbreviation, no negated boolean | PASS |
| B08 | Magic numbers | read in full | no new literal in source; tests name `RETRIED_SONGS`, `SERVICE_UNAVAILABLE` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm exec vitest run --project core --changed 60345e484 --coverage --reporter=verbose` | 0. 65 files, 424 tests, `api.client.test.ts` and `read-batch.adapter.test.ts` among them. Coverage of the changed gated files 100% statements (169/169), branches (73/73), functions and lines | PASS |
| C02 | @borso-app/pragma | `pnpm run test:e2e --changed 60345e484 --reporter=verbose` | 0. 46 files, 443 tests, both `refuses a body that is not JSON under …` cases among them | PASS |
| C03 | root tooling | `pnpm exec vitest run eslint-rules/no-request-fan-out-in-site.test.js` | 0. 35 tests | PASS |
| C04 | @borso-app/pragma | `scripts/mutate-changed.sh 60345e484` | 0. "Final mutation score of 100.00", "every changed gated file passed mutation (1 run(s))" | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Error. A non-JSON body answers `400 read-batch-invalid` and is reported | `refuses a body that is not JSON under %s with read-batch-invalid, and reports it` at read-batch.controller.test.ts:153; `expect(reportFailure).toHaveBeenCalledExactlyOnceWith({` at :172 | PASS |
| D02 | Error. `retry: 1` resends a failed group once, as one group, for one failed batch | `resends its reads once, again as one batch` at api.client.test.ts:188; `expect(sent).toStrictEqual(['POST /api/read-batch', 'POST /api/read-batch']);` at :216 | PASS |
| D03 | Error. The same, for a group of more than 10 whose batches fail at different times | No test sets up two failed batches whose retries come due apart. `forget the failed reads once the retry group left` at read-batch.adapter.test.ts:454 pins the over-wide clear as intended behaviour. The probe in A01 shows the claim is false. | FAIL (blocking, same defect as A01) |
| D04 | Rule B. Every iteration, unawaited loop request and awaited `Promise.all` read is refused | 14 new cases in eslint-rules/no-request-fan-out-in-site.test.js, run in C03 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | The diff adds no write. `git diff 60345e484..47a357db1 -- '*.service.ts' '*.repository.ts' '*.controller.ts'` adds no `insert(`, `update(`, `delete(`, `onConflict` or `transaction(` | PASS |
| E02 | Site transport state (`retryGroup`, `failedReads`) | Per-process state | Held per tab in `createReadTransport` (read-batch.adapter.ts:74-75), as D15 states the cap per tab. The set's lifetime is the defect in A01, not a cross-process one. | PASS |

## Blocking findings

- A01 / D03 / R02 — The first retry group to close clears every remembered failed read, so a second failed batch retries as one `GET` per read (13 reads, two batches failing 50 ms apart, sent 3 lone GETs, measured). Fix: remove only the identities that joined the closing retry group, and test two batches failing apart.

## Non-blocking findings

- None new.

## Notes

- A remembered identity whose query does not retry (cancelled, unmounted) stays in `failedReads` until a later read of the same path arrives. That read then waits one timer turn. No failing case beyond the delay was found.
- Carried from round 1 and left for the orchestrator: whether an offline tab should raise `read-batch-failed`, and the route counts above the inferred bounds.

## Verdict: FAIL
