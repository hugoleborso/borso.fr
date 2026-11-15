# Technical validation — Pragma's open Sentry issues go to zero

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/serene-ptolemy-hl4wza
- Base: origin/main (`cb076ea9bc1aa96103c685fbe348bb6121ce29e7`)
- Run at: 2026-11-14T23:11:03Z
- Round: 1
- Reviewed: a1fa62d245aaf569badeff5b81f11c7ec797df5a
- Touched workspaces: @borso-app/pragma (api, site); docs and `.claude/skills/quality-dashboard` (no workspace)

The spec is in the short form. It has *Behaviours* and *Out of scope*, with no Q.O.D., *Files to change* or *Test strategy*. Categories A and D are built from its three numbered behaviours, split claim by claim, and the files come from the plan. No merge of `main` sits above the base (`git rev-list --merges` printed nothing). 0 use cases routed to /visual-validation; out of scope for this report. No behaviour shows on screen.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Behaviour 1 | "tried up to 5 times" | apps/pragma/api/src/helpers/persistence/conflict-abort.core.ts:11, :53-55 | `export const CONFLICTED_WRITE_MAX_ATTEMPTS = 5;` / `return attempt < CONFLICTED_WRITE_MAX_ATTEMPTS && isConflictAbort(error);` | PASS |
| A02 | Behaviour 1 | Conflict abort means `OC000`, `OC001`, `40001` | conflict-abort.core.ts:3-8 | `new Set<string \| null>(['OC000', 'OC001', '40001'])` and `/\((OC00[01])\)/u` | PASS |
| A03 | Behaviour 1 | "waits 100, 200, 400 then 800 ms between attempts, 1.5 s in all" | conflict-abort.core.ts:12-19, :67 | `FIRST_CONFLICT_RETRY_DELAY_MS = 100; CONFLICT_RETRY_DELAY_GROWTH = 2;` `return FIRST_CONFLICT_RETRY_DELAY_MS * CONFLICT_RETRY_DELAY_GROWTH ** (attempt - 1);` `await wait(conflictRetryDelayAfter(attempt));` Waits happen only after attempts 1 to 4, since attempt 5 fails `isWorthRetrying` first. | PASS |
| A04 | Behaviour 1 | "Any other failure is not retried" | conflict-abort.core.ts:65-66 | `const isRetried = isWorthRetrying(error, attempt); if (!isRetried) throw error;` | PASS |
| A05 | Behaviour 1 | "A statement or transaction" is retried | conflict-abort.core.ts:100-106 | `retryingStatement(() => target.unsafe(...statement), wait);` and `await retryingConflictAborts(async () => await target.begin(...transaction), wait);` | PASS |
| A06 | Behaviour 1 | "The pure core takes the wait as an argument, and the DB client passes a `setTimeout` wait" | conflict-abort.core.ts:15, :59, :82, :97; apps/pragma/api/src/database/client.ts:55-57, :80 | `export type Wait = (milliseconds: number) => Promise<void>;` / `async function waitFor(milliseconds: number) { await new Promise((resolve) => setTimeout(resolve, milliseconds)); }` / `drizzle(retryingConflictAbortsOf(client, waitFor), { schema })` | PASS |
| A07 | Plan row 1 | Blueprint text says why the attempts wait | client.ts:68 | "The attempts wait 100, 200, 400 then 800 ms apart, because on 2026-11-14 a schema change on the shared cluster … failed three immediate attempts within 61 ms, and the same container answered again 1.24 s later (measured)." | PASS |
| A08 | Behaviour 2 | A network drop reports only "when a read in the batch is already on its retry" | apps/pragma/site/src/lib/read-batch.adapter.ts:135-139; read-batch.core.ts:109-113 | `const isGivenUp = hasRetriedCaller(batch); if (isGivenUp) reportBatchFailure({ status: null, size: batch.length }); failBatch(batch, error);` / `return batch.some((entry) => entry.callers.some((caller) => caller.hasRetried));` | PASS |
| A09 | Behaviour 2 | A refused batch (any status) still reports on the first failure | read-batch.adapter.ts:148-150 | `const isRefused = isRefusedBatch(response.status); if (isRefused) { reportBatchFailure({ status: response.status, size });` | PASS |
| A10 | Behaviour 2 | An answer that is not valid JSON or has the wrong count still reports on the first failure | read-batch.adapter.ts:166-167, :175-177 | `if (pairs === null) throw new Error(MALFORMED_BATCH_ANSWER);` … `} catch (error) { reportBatchFailure({ status: null, size }); failBatch(batch, error);` | PASS |
| A11 | Behaviour 2 | The drop still rejects or retries the callers as before | read-batch.adapter.ts:123-127 | `retryOnce(batch.flatMap((entry) => answerOrRetry(entry, true, (caller) => caller.reject(error))));`, the same body the old catch held | PASS |
| A12 | Behaviour 3 | `targets.md` has one `sentry-issues-open` row at 0 for each of the six apps | docs/quality/targets.md:43-48 | `` \| `sentry-issues-open` \| pragma \| 0 \| `` … `borsouvertures \| 0`. `readTargets` from scripts/quality/quality-dashboard.core.ts parsed exactly 6 such rows from the file (scratch run, exit 0). The six match `SENTRY_APPS` at scripts/quality/quality-dashboard.core.ts:102-109. | PASS |
| A13 | Behaviour 3 | The skill no longer calls the indicator unscored, and the "no row on purpose" rule is gone | .claude/skills/quality-dashboard/SKILL.md:37; docs/quality/targets.md:68-70 | "Its ceiling is 0 in `docs/quality/targets.md`." / "`sentry-issues-open` counts the distinct unresolved Sentry issues seen in the last 7 days. Its ceiling is 0 since 2026-11-14". `grep -rn "deliberately\|unscored"` over the skill and scripts/quality finds none. | PASS |
| A14 | Out of scope | Commits carry `Fixes BORSOFR-N` and `Fixes BORSOFR-Q` | `git log origin/main..HEAD` | `26b21812d fix(pragma): wait between DSQL conflict retries …` → `Fixes BORSOFR-N`; `1d61db59d fix(pragma): report a dropped read batch only when its retry fails too` → `Fixes BORSOFR-Q` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 8 changed source and test files | New names: `waitFor`, `milliseconds`, `conflictRetryDelayAfter`, `FIRST_CONFLICT_RETRY_DELAY_MS`, `hasRetriedCaller`, `fetchBatch`, `failBatch`, `isGivenUp`, `noWait`. None abbreviated. | PASS |
| B02 | Magic numbers extracted | read conflict-abort.core.ts | `100` and `2` are `FIRST_CONFLICT_RETRY_DELAY_MS` and `CONFLICT_RETRY_DELAY_GROWTH` (:12-13). | PASS |
| B03 | No prose comments | `borso/no-comments` via oxlint, and a read | The only comment in the changed hunks is the pre-existing `eslint-disable-next-line unicorn/no-thenable -- …` at conflict-abort.core.ts:85, whose reason is a checkable claim about that line. The client.ts change is inside the machine-read `@BlueprintDescription`. | PASS |
| B04 | Function names describe the result | read | `conflictRetryDelayAfter` returns a delay, `hasRetriedCaller` a boolean, `waitFor` waits. | PASS |
| B05 | Type assertions only `as const` / `as unknown` | read | None added. | PASS |
| B06 | No `any` | `grep -nP '\bany\b' <changed files>` | Hits are only inside test names ("any other failure", "headers in any order"). | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | No new index access. `wait.mock.calls.map(([milliseconds]) => milliseconds)` destructures a typed tuple. | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <8 changed .ts files>` | exit 0, no output | PASS |
| B09 | Types | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B10 | Dead exports | `pnpm exec knip --workspace apps/pragma` | exit 0; only three configuration hints, none about the changed files | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\(' <changed files>` | none found | PASS |
| B12 | Standards checklist (01-naming): "a boolean name is not negated" | read in full | `isGivenUp`, `isRetried`, `hasRetriedCaller` are positive. | PASS |
| B13 | Standards checklist (01-naming): "a file name says what the file holds" / (02): "the choice between `.core.ts` and `.utils.ts`" | read in full | `hasRetriedCaller` lands in read-batch.core.ts beside `splitForRetry`, a band-facing transport rule; `conflictRetryDelayAfter` beside `isWorthRetrying`. No new file. | PASS |
| B14 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read in full | `it.each([[[firstTry], false], [[firstTry, secondTry], true]])('says whether a batch holds a caller already on its retry', …)` at apps/pragma/site/src/lib/read-batch.core.test.ts:253-256. Both cases print the same name (seen twice in the verbose run), so a failure does not say which condition broke. A `%s`/`$isGivenUp` placeholder or two named `it`s would. Introduced: this branch. Fix size: one line. | FAIL (non-blocking) |
| B15 | Standards checklist (12-linting): "the reason on a disable comment is a claim about that line" | read in full | Only disable in changed files is the pre-existing conflict-abort.core.ts:85; its reason is about that thenable. | PASS |
| B16 | Standards checklist (04/11): multi-table write in one service-owned transaction; repository returns rows | read | The diff adds no repository, service or write. | PASS |
| B17 | Standards checklist (05, 08, 09, 06, 07): screens, styling, i18n keys, mutations, effects | read | The diff changes no `.tsx`, no i18n catalogue, no mutation and no effect. Not applicable. | PASS |
| B18 | Standards checklist (01-naming): a changed `VOCABULARY.md` definition still true | `git diff --name-status` | No `VOCABULARY.md` changed. The *Read batch* entry (apps/pragma/VOCABULARY.md:927-956) says nothing about reporting, so it stays true. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm exec vitest run --project core --changed cb076ea9bc1aa96103c685fbe348bb6121ce29e7 --coverage --reporter=verbose` (from apps/pragma) | 0. 77 files, 518 tests. Ran conflict-abort.core.test.ts, read-batch.adapter.test.ts, read-batch.core.test.ts. Coverage 100% statements, branches, functions and lines over the changed gated files. | PASS |
| C02 | @borso-app/pragma | `pnpm run test:e2e --changed cb076ea9bc1aa96103c685fbe348bb6121ce29e7 --reporter=verbose` | 0. 51 files, 490 tests, including tasks.controller.test.ts "gives up and writes nothing once every commit has lost a conflict" (1586 ms; the logged request ran `duration_ms: 1527`, so the real `setTimeout` waits ran) and both oauth conflict tests. | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh cb076ea9bc1aa96103c685fbe348bb6121ce29e7 apps/pragma` | 0. conflict-abort.core.ts 59 killed + 2 timeout, read-batch.adapter.ts 111 + 1, read-batch.core.ts 181 + 0. 0 survived, 0 no coverage, score 100.00. | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling test | 60 files, none missing its `*.utils.test.ts`. The branch changes no `*.utils.ts`. | PASS |
| C05 | scripts/quality | scratch vitest run of `readTargets` over the real docs/quality/targets.md | 0. 6 `sentry-issues-open` rows parse. | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | B1: a conflict abort is tried up to 5 times | `it('rethrows the conflict once every attempt has been aborted')` at apps/pragma/api/src/helpers/persistence/conflict-abort.core.test.ts:124. Fails if false: `expect(write).toHaveBeenCalledTimes(CONFLICTED_WRITE_MAX_ATTEMPTS);` (:128) with `expect(CONFLICTED_WRITE_MAX_ATTEMPTS).toBe(5);` (:83) and `expect(isWorthRetrying(conflict, 5)).toBe(false);` (:89) | PASS |
| D02 | B1: `OC000`, `OC001`, `40001` count as conflict aborts | `it('reads a DSQL or Postgres serialization failure as a conflict')` :21 and `it('reads a schema change under a running statement as a conflict')` :28. Fails if false: `expect(isConflictAbort({ code: 'OC001' })).toBe(true);` and `expect(isConflictAbort({ code: '40001' })).toBe(true);` | PASS |
| D03 | B1: waits 100, 200, 400 then 800 ms, 1.5 s in all | `it('rethrows the conflict once every attempt has been aborted')` :124. Fails if false: `expect(wait.mock.calls.map(([milliseconds]) => milliseconds)).toStrictEqual([100, 200, 400, 800]);` (:129-131). Also `conflictRetryDelayAfter` test :98 `expect(waits.reduce(…)).toBe(1500);` | PASS |
| D04 | B1: any other failure is not retried | `it('rethrows any other failure without trying again')` :134. Fails if false: `expect(write).toHaveBeenCalledTimes(1);`; and :179 for a statement, `expect(start).toHaveBeenCalledTimes(1);` | PASS |
| D05 | B1: a statement is retried | `it('starts the statement again when the first run lost to a schema change')` :167. Fails if false: `expect(start).toHaveBeenCalledTimes(2);` | PASS |
| D06 | B1: a transaction is retried whole | `it('runs a transaction again whole when it lost to a conflict')` :201. Fails if false: `await expect(client.begin()).resolves.toBe('committed');`; back-e2e `it('writes the task once when its first two commits lose a conflict on the claimed member')` in apps/pragma/api/src/tasks/tasks.controller.test.ts | PASS |
| D07 | B1: the DB client passes a `setTimeout` wait | structural: apps/pragma/api/src/database/client.ts:80 `drizzle(retryingConflictAbortsOf(client, waitFor), { schema })`, with `waitFor` at :55-57. `wait` is a required parameter, so the client cannot omit it and typecheck (B09). The back-e2e give-up test's request logged `duration_ms: 1527`. | PASS |
| D08 | B2: a drop whose retry answers reports nothing | `it('report nothing when the network drops a batch its retry then answers')` at apps/pragma/site/src/lib/read-batch.adapter.test.ts:503. Fails if false: `expect(tab.failures).toStrictEqual([]);` (:509) | PASS |
| D09 | B2: a drop with a read already on its retry reports | `it('rejects every caller when the network drops twice, and reports the second drop only')` :365. Fails if false: `expect(tab.failures).toStrictEqual([{ status: null, size: 2 }]);` (:371). Core: `it.each(…)('says whether a batch holds a caller already on its retry')` at read-batch.core.test.ts:253, `[[firstTry, secondTry], true]` | PASS |
| D10 | B2: a refused batch (any status) reports on the first failure | `it('hands every caller the status of the refused retry, and reports both tries')` :346, `expect(tab.failures).toStrictEqual([{ status: 503, size: 2 }, { status: 503, size: 2 }]);` (:359); `it('hands every caller the refusal at once, reports it, and waits for nothing')` :399, `expect(tab.failures).toStrictEqual([{ status: 400, size: 2 }]);` (:408) | PASS |
| D11 | B2: an answer that is not valid JSON reports on the first failure | `it('rejects every caller when the answer is not JSON, and reports it')` :374. Fails if false: `expect(tab.failures).toStrictEqual([{ status: null, size: 2 }, { status: null, size: 2 }]);` (:381-384) | PASS |
| D12 | B2: an answer with the wrong count reports on the first failure | `it('rejects every caller when the answer holds one answer too few, and reports it')` :387. Fails if false: `expect(tab.failures).toHaveLength(2);` (:394) | PASS |
| D13 | B3: one `sentry-issues-open` row at 0 for each of six apps | structural: docs/quality/targets.md:43-48 is configuration read by `readTargets`; the scratch run in C05 parsed 6 rows. No repository test reads the real file, which is the same for every other row of that table. | PASS |
| D14 | B3: the skill no longer calls the indicator unscored | structural: .claude/skills/quality-dashboard/SKILL.md:37 "Its ceiling is 0 in `docs/quality/targets.md`." Prose for agents; no test can read it. | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths in the diff | Check-then-write | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` finds 0 `insert(`, `update(`, `delete(`, `onConflict` or `transaction(` lines. The diff adds no write path. | PASS |
| E02 | Retry wrapper over every write (conflict-abort.core.ts:104-106) | Does retrying more often weaken a rule held at write time? | A transaction is retried whole: `await retryingConflictAborts(async () => await target.begin(...transaction), wait)`. Each retry re-runs the reads and the claim inside the callback, and an aborted attempt committed nothing, so a key or conditional write still decides. The back-e2e give-up test asserts nothing was written after `CONFLICTED_WRITE_MAX_ATTEMPTS` aborts (tasks.controller.test.ts:369-372). | PASS |
| E03 | Per-process state | Module-level variable added | `grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` over the diff prints nothing. `waitFor` is a stateless function. The site's `createReadTransport` closure state is per tab and pre-existing. | PASS |
| E04 | Concurrent proof | New key-held rule needing a `Promise.all` test | None: the diff adds no rule held by a key. | PASS |

## Blocking findings

- none

## Non-blocking findings

- B14 — `it.each` at apps/pragma/site/src/lib/read-batch.core.test.ts:253-256 gives both cases the same name, so a failure does not say which condition broke.

## Notes

- A batch whose response headers arrive but whose body stream drops mid-read makes `response.json()` reject inside `sendBatch` (read-batch.adapter.ts:166), which reports on the first failure with `status: null`. Is that a "network drop" the spec meant to quiet, or a malformed answer it meant to keep? The spec's measured case never reached the API, which `fetchBatch` handles.
- A request that runs several statements outside a transaction can now wait up to 1.5 s per statement that keeps losing OC001. Is the API Lambda's timeout far enough above a worst case of several such waits? The plan's *Risks* names the 1.5 s for one write, not for several statements in one request.
- `fetchBatch` (read-batch.adapter.ts:129) also reports and settles the callers on a drop and returns `null`. The name says only the fetch. Would `fetchOrFailBatch` read truer? No rule row covers it, so it stays a question.

## Verdict: PASS
