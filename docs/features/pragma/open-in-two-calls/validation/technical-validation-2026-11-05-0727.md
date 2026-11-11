# Technical validation — pragma never asks the API for more than two things at once

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/wizardly-mendel-0nq8qs
- Base: origin/main (merge base 6250f706a)
- Run at: 2026-11-05T07:27:43Z
- Round: 1
- Reviewed: 60345e484dade9b81a3d88f44045fe2341e16a6a
- Touched workspaces: @borso-app/pragma, the root `eslint-rules/` tooling

The branch head moved to a5ce2995f during the run. That commit changes only `runs/2026-11-05-0410-ttc/state.json` and `journal.md.jsonl`, so the code reviewed is the code at 60345e484.

The validator agent could not be dispatched, because this session has no Agent tool. The `technical-validator` brief was followed inline, with no implementation summary as input.

4 use cases routed to /visual-validation; out of scope for this report. They are the per-route request counts and peaks (I1, D7), the hidden-tab return (I2, happy path 3), the route that reads nothing past the shell, and the opening screen's look and motion.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | D15, Types | Constants 10 and 2 and the batch path live in one domain file both sides read | apps/pragma/domain/read-batch.core.ts:3-5 | `export const MOST_READS_PER_BATCH = 10;` `export const MOST_READS_IN_FLIGHT = 2;` | PASS |
| A02 | Types | `BatchedRead`, `ReadBatch`, `BatchedAnswer`, `ReadBatchAnswer` as specified | apps/pragma/domain/read-batch.core.ts:13-30 | `readonly headers: Readonly<Partial<Record<PragmaRequestHeader, string>>>;` | PASS |
| A03 | Error cases, malformed batch | A path outside `/api/`, the batch path, or `/api/../x` is refused | apps/pragma/domain/read-batch.core.ts:42-48 | `if (resolved.pathname !== rawPathname) return false;` `return !isReadBatchItself(rawPathname);` | PASS |
| A04 | Error cases, malformed batch | 0 or more than 10 reads, an unknown header, or an extra field answers `400 read-batch-invalid` | apps/pragma/api/src/read-batch/read-batch.schema.ts:7-15, read-batch.controller.ts:13-17 | `reads: z.array(batchedReadSchema).min(FIRST_READ).max(MOST_READS_PER_BATCH)`; `return context.json({ error: READ_BATCH_INVALID }, 400);` | PASS |
| A05 | Error cases, malformed batch; Zero-defect `read-batch-invalid` | A body that is not JSON answers `400` with `read-batch-invalid` and is reported | apps/pragma/api/src/read-batch/read-batch.controller.ts:13 | `zValidator('json', readBatchSchema, (result, context) => {`. Hono's validator throws `HTTPException(400, "Malformed JSON in request body")` before the hook runs (`hono/dist/validator/validator.js:20-21`), and `answerUnhandledError` passes that response through. Measured with `createApp().request` on `POST /api/read-batch` with `content-type: application/json` and body `{"reads": [`: status `400`, body `Malformed JSON in request body`, `reportTaggedFailure` called 0 times. The same request as `text/plain` answers `{"error":"read-batch-invalid"}` and reports once. | FAIL (blocking) |
| A06 | D14 | Each read runs through `app.fetch` with the outer headers, minus `content-type` and `content-length`, plus its own allowed headers | apps/pragma/api/src/read-batch/read-batch.core.ts:12-16; app.ts:109-112 | `for (const name of OUTER_ONLY_HEADERS) headers.delete(name);` `buildReadBatchRouter((request, environment) => app.fetch(request, environment))` | PASS |
| A07 | D14 | Answers drop every header but `content-type` | apps/pragma/api/src/read-batch/read-batch.service.ts:24-28 | `toBatchedAnswer(response.status, response.headers.get(CONTENT_TYPE_HEADER), await response.text())` | PASS |
| A08 | D9 | `200` whenever the batch parsed, per-item status, in order | apps/pragma/api/src/read-batch/read-batch.service.ts:23-35; controller.ts:26 | `await Promise.all(params.batch.reads.map(async (read) => {` … `return context.json(answer, 200);` | PASS |
| A09 | D14 | Mounted in `createApp` outside the typed chain | apps/pragma/api/src/app.ts:107-112 | `const app = buildAppRouter(options);` `app.route(READ_BATCH_PATH, …)` | PASS |
| A10 | Stale scope | `api/read-batch` is a silent write path; `offline-manifest` leaves the three tables | apps/pragma/api/src/realtime/stale-scope.core.ts:21; domain/stale-scope.core.ts; site/src/lib/queries/query-read-roots.core.ts | `['api', 'read-batch'],` and the three `- 'offline-manifest'` lines in the diff | PASS |
| A11 | Changes, MCP | The manifest exclusion is replaced by `POST /api/read-batch` | apps/pragma/api/src/mcp/tool-coverage.core.ts:38-39 | `'POST /api/read-batch': 'The transport a browser tab folds its reads into; an assistant calls each tool.'` | PASS |
| A12 | Analytics | `read_batch.size` on the batch span | apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts:64-68 | `Sentry.getActiveSpan()?.setAttribute(READ_BATCH_SIZE_ATTRIBUTE, size);` | PASS |
| A13 | D3 | The manifest route, core, test and service function are deleted | git diff --name-status | `D apps/pragma/api/src/sessions/offline-manifest.core.ts`, `D …offline-manifest.core.test.ts`; `buildOfflineManifestRouter` and `getNextSessionOfflineManifest` removed | PASS |
| A14 | D3 | The preload reads the two lists, picks the next session with `selectNextSession`, then the session, its setlists and their entries | apps/pragma/site/src/lib/queries/offline-reading.queries.ts:55-63 | `const nextSession = selectNextSession(sessions, new Date());` `await loadNextSession(queryClient, nextSession.id)` | PASS |
| A15 | D12 | One helper for entries per setlist, with the inline disable, used by both callers | apps/pragma/site/src/lib/queries/setlist-entries.queries.ts:75-80; offline-reading.queries.ts:46-50 | `// eslint-disable-next-line borso/no-request-fan-out-in-site -- one read per setlist of one session; …` | PASS |
| A16 | D13 | The transport sits in the `fetch` option of `hc`, under `fetchWatchingSessionEnd` | apps/pragma/site/src/lib/api.client.ts:72 | `const response = await readTransport.send(input, signWrite(init));` | PASS |
| A17 | D13, D17 | A group closes at the end of its task; one read leaves as a `GET`, two or more as one `POST` | apps/pragma/site/src/lib/read-batch.adapter.ts:62, 117-121, 152 | `closeGroup = queueMicrotask,` `const leaving = loneRead === null ? sendBatch(batch) : sendAlone(loneRead);` | PASS |
| A18 | D15 | At most 2 read requests in flight; a group of more than 10 leaves as consecutive batches of at most 10 | apps/pragma/site/src/lib/read-batch.adapter.ts:129-136 | `if (readsInFlight >= MOST_READS_IN_FLIGHT \|\| waiting.length === 0) return;` `const { batch, rest } = takeNextBatch(waiting);` | PASS |
| A19 | D16 | Writes skip the batch and the cap | apps/pragma/site/src/lib/read-batch.core.ts:50-51; adapter.ts:146-147 | `if (method.toUpperCase() !== READ_METHOD) return null;` `if (read === null) return fetchResponse(input, init);` | PASS |
| A20 | Edge, headers | Only `PRAGMA_REQUEST_HEADERS` ride an item | apps/pragma/site/src/lib/read-batch.core.ts:55-57 | `if (!headers.every(([name]) => isPragmaRequestHeader(name))) return null;` | PASS |
| A21 | Error cases, batch fails | A refused or dropped batch fails every caller of the group | apps/pragma/site/src/lib/read-batch.adapter.ts:95-114 | `callersOf(batch).forEach((caller) => caller.resolve(toCallerResponse(failure)));` and `caller.reject(error)` | PASS |
| A22 | Error cases, batch fails | "`retry: 1` resends them once, again as one group" | apps/pragma/site/src/lib/read-batch.adapter.ts:62, 152; query-client.setup.ts:31 (`retry: 1`) | Measured with a real `QueryClient` (`retry: 1`) and the real transport over a fake `fetch`. Five `fetchQuery` calls in one tick whose batch answers `503` sent `["POST /api/read-batch","GET /api/a","GET /api/b","GET /api/c","GET /api/d","GET /api/e"]`. Each retry timer fires in its own task, so `queueMicrotask` closes one group per retry. The 2-in-flight cap still holds. | FAIL (blocking) |
| A23 | Zero-defect `read-batch-failed` | The transport reports a failed batch with its status and size | apps/pragma/site/src/observability/error-reporting.adapter.ts; error-reporting.setup.ts | `Sentry.captureMessage(READ_BATCH_FAILED, { level: 'error', tags: { 'read_batch.status': …, 'read_batch.size': … } })`; `onReadBatchFailed(reportReadBatchFailed);` | PASS |
| A24 | D6, D18, Types | Gate states `sign-in-required \| opening \| opening-failed \| granted`; the wait ends when band data lands | apps/pragma/site/src/components/organisms/session-gate.core.ts:3, 41-63 | `if (queries.some(hasBandData)) return 'band-data';` `failed: 'opening-failed',` | PASS |
| A25 | Error case, cold open fails | A failed first batch shows the failure, not `/login` | apps/pragma/site/src/components/organisms/session-gate.core.ts:61 | `if (!hasMarker \|\| isProbeAuthenticated === false) return 'sign-in-required';` (an undefined probe no longer means sign-in) | PASS |
| A26 | Happy path 1 | The route mounts beneath the overlay, inert and hidden | apps/pragma/site/src/components/organisms/RequireSession.tsx:123-127, 163-165 | `opening: { isInert: true, className: 'contents invisible' },` `<div inert={routeLook.isInert} className={routeLook.className}>` | PASS |
| A27 | Result, failure | "Try again" refetches every active query in one group | apps/pragma/site/src/components/organisms/RequireSession.tsx:149-151 | `void queryClient.refetchQueries({ type: 'active' });` | PASS |
| A28 | Result, i18n | `opening.loading`, `opening.failed`, `opening.offline`, `opening.retry` in both catalogues | apps/pragma/site/src/i18n/en.json, fr.json | `"loading": "Tuning up…"` / `"loading": "On s'accorde…"` | PASS |
| A29 | Result, the downbeat | Only `transform` and `opacity` animate | apps/pragma/site/src/styles/tokens.css | Every property inside the `@keyframes downbeat*` blocks is `transform`, `opacity` or `animation-timing-function` (awk over the blocks: 21, 12, 14) | PASS |
| A30 | D10, D11, I3 | Rule B refuses a mapping fan-out and an awaited read in a loop, with the two messages, in every site | eslint-rules/no-request-fan-out-in-site.js:3-11, 222-239; .oxlintrc.json | Measured. A planted `Promise.all(ids.map((id) => queryClient.query(songQueryOptions(id))))` and an awaited `$get` in a `for…of` in `apps/pragma/site/src/lib/queries/` each drew the rule's error. File removed after. | PASS |
| A31 | Changes, VOCABULARY | Read batch and Opening screen in, Offline manifest out | apps/pragma/VOCABULARY.md | `## Read batch`, `## Opening screen`, `-## Offline manifest` | PASS |
| A32 | Changes, docs | Standard 06 and the ADR are written | docs/standards/06-data-fetching.md; docs/adr/2026-11-05T0445-pragma-reads-leave-in-one-batch-per-tick.md | both in `git diff --name-status` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <changed .ts/.tsx/.js>` | exit 0, no output | PASS |
| B02 | Lint clean over every site, since rule B reaches all of them | `scripts/lint-repository.sh` | exit 0 | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | No `any` | `grep -nP ':\s*any\b\|<any>\|\bas any\b'` on changed sources | none found | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\b\|unknown\b)[A-Z{(\[]'` | none found | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed sources | none found. The gate reads the cache through `useSyncExternalStore` (opening-wait.hook.ts:18) | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | indexed access in new code | `queryKey[0] !== AUTH_QUERY_ROOT` (session-gate.core.ts:25) compares with a possibly undefined value; `answerList[index]` passes through `hasAnswer` (site read-batch.core.ts:157-158) | PASS |
| B08 | Disable reasons are checkable (12) | `grep -n eslint-disable` | setlist-entries.queries.ts:79 `-- one read per setlist of one session; production holds at most 1 per session (measured)` names a checkable claim | PASS |
| B09 | Names and verbs (01) | read every new source in full | `buildItemRequest` builds, `selectOpeningWait` and `selectSessionGateState` select, `toCallerResponse` converts, no negated boolean | PASS |
| B10 | Standards checklist (03): "a derived type is derived … a request body from `z.infer`" | read in full | `export interface ReadBatch { readonly reads: readonly BatchedRead[]; }` at apps/pragma/domain/read-batch.core.ts:18-20 is written by hand beside `readBatchSchema` at api/src/read-batch/read-batch.schema.ts:13, which the controller types its body from. Introduced: this branch. Fix size: one file, or a dismissal (domain is shared with a site that does not load the schema). | FAIL (non-blocking) |
| B11 | Blueprint claim matches the layer | read in full | `// @FollowsBlueprint utils-pure-module` on `toBatchedRead` in apps/pragma/site/src/lib/read-batch.core.ts:44, a `.core.ts` file. Introduced: this branch. Fix size: one line. | FAIL (non-blocking) |
| B12 | Plan self-check, D13 prototype | `git log -1 --format=%B 81f8abc37` | The plan's row asks for the six counts (three routes, two closers) in the slice-4 commit body. The body gives one count ("A cold open of / sent 5 requests in pnpm dev"). The comparison is in `runs/…/agents/implementation-04.md` ("`setTimeout(0)` sent the same count on all three measured routes"), without the numbers. Introduced: this branch. Fix size: none in code; record the counts in the PR. | FAIL (non-blocking) |
| B13 | Standards checklist (01): a `VOCABULARY.md` definition is still true | read in full | "A malformed batch answers `400` `read-batch-invalid` and runs nothing." (apps/pragma/VOCABULARY.md, Read batch) is false for a body that is not JSON. Same defect as A05; it closes when A05 closes. | PASS (tracked under A05) |
| B14 | Standards checklist (08): more than two visual variants through `cva`, not a conditional | read in full | `OpeningScreen`'s four phases go through the `PHASE_LOOK` lookup table (OpeningScreen.tsx:23-56), not a conditional expression | PASS |
| B15 | Standards checklist (09): key path names screen and element | read en.json | `opening.loading`, `opening.failed`, `opening.offline`, `opening.retry` | PASS |
| B16 | Standards checklist (05): no prop family of booleans | read in full | `OpeningScreen` takes one `phase` string and one `connectionNote` string | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 103 files, 715 tests. Coverage of the changed gated files 100% statements, branches, functions and lines. The feature's own files ran, among them `domain/read-batch.core.test.ts`, `api/src/read-batch/read-batch.{core,schema}.test.ts`, `site/src/lib/read-batch.{core,adapter}.test.ts`, `session-gate.core.test.ts`, `RequireSession.test.tsx`, `OpeningScreen.test.tsx`, `offline-reading.queries.test.ts`, `api.client.test.ts`, `query-client.setup.test.ts`, `i18n-parity.core.test.ts` | PASS |
| C02 | @borso-app/pragma | `pnpm run test:e2e --changed origin/main --reporter=verbose` | 0. 50 files, 450 tests, `api/src/read-batch/read-batch.controller.test.ts` among them | PASS |
| C03 | root tooling | `pnpm exec vitest run eslint-rules/no-request-fan-out-in-site.test.js` | 0. 21 tests | PASS |
| C04 | @borso-app/pragma | `scripts/mutate-changed.sh origin/main` | 0. 717 mutants, 716 killed, 1 timed out, 0 survived, score 100.00 ("every changed gated file passed mutation (1 run(s))") | PASS |
| C05 | `*.utils.ts` have sibling tests | changed `*.utils.ts` | `site/src/lib/queries/offline-reading.utils.ts` has `offline-reading.utils.test.ts`, which ran in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy path 1. With an empty cache, the gate shows the opening screen and mounts the route beneath it, inert | `mounts the route inert beneath the opening screen, so the probe and its read leave in one batch` at site/src/components/organisms/RequireSession.test.tsx:128; `expect(readSongsWrapper()?.hasAttribute('inert')).toBe(true);` | PASS |
| D02 | Happy path 1. The probe and the route's reads leave in one batch | same test; `expect(raw).toEqual([\`POST ${READ_BATCH_PATH}\`]);` | PASS |
| D03 | Happy path 1. The answer fills the cache and the overlay exits | same test, then `plays the exit once the mark was seen moving, then leaves for good` at :155; `expect(readOverlay()).toBeNull();` | PASS |
| D04 | Happy path 2. A warm open renders the cached screen at once | `renders a cached screen at once, with no opening screen` at RequireSession.test.tsx:177; `expect(readOverlay()).toBeNull();` | PASS |
| D05 | Happy path 2. Stale mounted queries refetch in one batch | `leave as one batch, and each caller gets its own answer` at site/src/lib/read-batch.adapter.test.ts:75 | PASS |
| D06 | Happy path 4. An invalidation refetches the mounted keys in batches, never more than 2 at once | `refetches twelve songs in two batches, never more than two at once` at site/src/lib/api.client.test.ts:137 | PASS |
| D07 | Happy path 5. The offline preload fills the catalogue, the next session, its setlists and entries | `reads the two lists, then the next session, its setlists and their entries` at site/src/lib/queries/offline-reading.queries.test.ts:57 | PASS |
| D08 | Edge. The same path twice in one group sends one item and hands each caller its own `Response` | `send a read asked twice once, and give each caller a body of its own` at read-batch.adapter.test.ts:140 | PASS |
| D09 | Edge. More than 10 reads leave as consecutive batches of at most 10, under the cap | `send 23 reads of one live invalidation as 10, 10, then 3 once a slot frees` at read-batch.adapter.test.ts:236 | PASS |
| D10 | Edge. Only `PRAGMA_REQUEST_HEADERS` ride an item | `carries the ballot token a public read needs` at site/src/lib/read-batch.core.test.ts:38; `let a read with a header the batch cannot carry leave alone at once` at read-batch.adapter.test.ts:284 | PASS |
| D11 | Edge. A session today that already started is preloaded | `preloads a session that started earlier today, as home shows it` at offline-reading.queries.test.ts:94 | PASS |
| D12 | Edge. No session ahead stops the preload after the lists | `stops after the two lists when no session lies ahead` at offline-reading.queries.test.ts:107 | PASS |
| D13 | Error. One read fails inside a batch (`401` gated, `500` thrown) and only that caller sees it | `fails only the gated read when the batch carries no cookie` and `answers 500 for a read that throws while the others answer 200` at api/src/read-batch/read-batch.controller.test.ts:97, 109; `expect(answers.map((answer) => answer.status)).toStrictEqual([200, 500, 200]);` | PASS |
| D14 | Error. An ended-session `401` on one item ends the session once | `ends the session once when one read of a batch answers that the session is gone` at site/src/lib/api.client.test.ts:66; `expect(ended).toHaveBeenCalledTimes(1);` | PASS |
| D15 | Error. The batch itself fails (status or network) and every caller gets that failure | `hands every caller the status of a refused batch, and reports it` and `rejects every caller when the network drops, and reports it` at read-batch.adapter.test.ts:321, 339 | PASS |
| D16 | Error. `retry: 1` resends the failed group once, as one group | `merge the groups that waited into one batch when a slot frees` at read-batch.adapter.test.ts:210 closes its groups by hand and never runs TanStack's retry. No test sets up a retry. The probe in A22 shows the claim is false. | FAIL (blocking, same defect as A22) |
| D17 | Error. A cold open whose first batch fails shows the failure and its retry | `shows the failure when the first batch fails, and retries every read in one batch` at RequireSession.test.tsx:196; `expect(readStatus()).toBe(FAILED_EN);` | PASS |
| D18 | Error. A malformed batch (11 reads, a write method, outside `/api/`, the batch path, a disallowed header) answers `400 read-batch-invalid` and runs nothing | `refuses %s with 400 and runs nothing` at read-batch.controller.test.ts:125; `expect(listInstruments).not.toHaveBeenCalled();` | PASS |
| D19 | Error. A body that is not JSON answers `400 read-batch-invalid` | `refuses a body that is not JSON with 400` at read-batch.controller.test.ts:153 asserts only `expect(response.status).toBe(400);`, which the wrong answer of A05 also satisfies | FAIL (blocking, same defect as A05) |
| D20 | Test strategy, unit. `domain/read-batch.core.ts` allows `/api/songs?x=1` and refuses `/mcp`, `/api/read-batch`, `/api/../x` | `allows the API read %s` and `refuses %s` at apps/pragma/domain/read-batch.core.test.ts:17, 24 | PASS |
| D21 | Test strategy, unit. A `204` answer rebuilds a `Response` | `keeps an empty body on a status that may carry one` and the null-body case in the `the response each caller receives` block at site/src/lib/read-batch.core.test.ts:179-212 | PASS |
| D22 | Test strategy, unit. An item carries the outer cookie and its ballot token, and an answer drops `set-cookie` | `carries the outer cookie and the item ballot token, and no body headers` and `keeps the status, the content type and the body, and nothing else` at api/src/read-batch/read-batch.core.test.ts:29, 67 | PASS |
| D23 | Test strategy, rule B. The invalid and valid cases listed | 13 invalid cases at eslint-rules/no-request-fan-out-in-site.test.js:169-181, valid near misses including a back-end file at :151-152 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | The diff adds no write. `git diff origin/main...60345e484 -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` matches nothing. The batch route only runs `GET`s (`const READ_METHOD = 'GET';`, api/src/read-batch/read-batch.core.ts:3). | PASS |
| E02 | API module state | Per-process state | No new module-level `let`, `Map` or `Set` under `apps/pragma/api` (grep on the diff, no match). `MOST_READS_PER_BATCH` bounds one batch per request, not per instance. | PASS |
| E03 | Site transport state (`openGroup`, `waiting`, `readsInFlight`) | Per-process state | Held per tab in `createReadTransport` (read-batch.adapter.ts:66-69). The spec states the cap per tab ("2 read requests in flight per tab", D15), so per-tab state is the rule. | PASS |

## Blocking findings

- A05 / D19 — A batch body that is not JSON answers `400 Malformed JSON in request body` and reports nothing, where the spec asks for `400 read-batch-invalid` and a Sentry report (measured). The test asserts only the status.
- A22 / D16 — Reads that failed together in one batch retry as one request each, not as one group: five failed reads retried as five `GET`s (measured). No test exercises TanStack's retry.

## Non-blocking findings

- B10 — `ReadBatch` is written by hand beside `readBatchSchema`, not derived with `z.infer`.
- B11 — `@FollowsBlueprint utils-pure-module` sits on a `.core.ts` file.
- B12 — The D13 prototype's six counts are not in the slice-4 commit body as the plan asks.

## Notes

- Request counts per route are `/visual-validation`'s. `runs/2026-11-05-0410-ttc/agents/implementation-05.md` reports seven routes one request above the spec's inferred bounds (cold `/` at 5 against 3, among them), with the peak at most 2 everywhere (measured by the implementer, not by this validator). Does the orchestrator accept those bounds, or change the closer? That is a spec decision.
- Does a network error while offline need to reach Sentry as `read-batch-failed`? `sendBatch` reports `{ status: null }` on every rejected fetch (read-batch.adapter.ts:112), including a tab that is simply offline. The spec's alert is "3 in 10 minutes".
- The abort listener added at read-batch.adapter.ts:151 is never removed. A caller that settles keeps its listener until its signal is collected. No failing case was found.
- The batch answer size against Lambda's response limit, and the batch latency on a cold Lambda, stay unknown until the preview, as the plan's risk register says.
- The spec's ADR says "A read must go through `api`". A read with a header outside `PRAGMA_REQUEST_HEADERS`, or a path outside `/api/`, bypasses the cap (read-batch.adapter.ts:145-147). No such read exists in the site today (grep of `header: {` in non-test site code, no match).

## Verdict: FAIL
