# Technical validation — the pragma API emits one wide event per request

- Spec: [`../../../../adr/202611111318-pragma-api-emits-one-wide-event-per-request.md`](../../../../adr/202611111318-pragma-api-emits-one-wide-event-per-request.md) (no `spec.md` exists; the ADR's *Decision* and *Consequences* are the contract)
- Plan: none
- Branch: claude/optimistic-maxwell-2i2zzt
- Base: origin/main (merge base 17c785daac826e2da75cbce819dde272fce2f7da)
- Run at: 2026-11-11T14:18:05Z
- Round: 2
- Reviewed: 2485e597da26e360934e1f4cfefb9b94413e8b02
- Previous: [`technical-validation-2026-11-11-1400.md`](./technical-validation-2026-11-11-1400.md) (Reviewed: 0cace964992f4fac4647b2220ac4eeb0b5be5242)
- Touched workspaces: @borso-app/pragma, @borso-app/last-loop-lepin, @borso-app/banana-rush, @borso-app/talos (api only); repo root `.oxlintrc.json`

This round reads `git diff 0cace964..2485e597` only: 7 commits, 61 files. The contract is still the ADR, read like a short-form spec. Round-1 blocking rows D11, D12, D17, D18, D20 and D21 each get a row below. Dismissed row B11 gets a row checking its stated reason. Round-1 non-blocking rows A06, A25, B10 and B12, which the commits say they fixed, get a row too. The three app copies (last-loop-lepin, banana-rush, talos) are new code in this round's diff. They are walked against the ADR's amended `~` bullet, which is their whole contract. 0 use cases routed to /visual-validation; out of scope for this report.

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D11 (blocking) `member.id` set by the session gate | `294548ce` apps/pragma/api/src/free-slots/free-slots.controller.test.ts:444-481. The test sends a cookie-authenticated `GET /api/free-slots`, which mounts `requireMemberSession` (free-slots.controller.ts:11 `new Hono().use('*', requireMemberSession)`), and asserts `'member.id': first.memberId,` at :467 inside a `toStrictEqual([...])` of every written line. Deleting `rememberMemberId(context, verdict.memberId)` at member-session.middleware.ts:35, or `addWideEventFields({ 'member.id': memberId })` at :42, removes the field and fails that assertion. | PASS |
| R02 | D12 (blocking) `member.id` set by the MCP bearer check | `294548ce` apps/pragma/api/src/mcp/mcp.controller.test.ts:245-265 `it('writes the member the bearer token belongs to on the event of an assistant call', …)`. It posts to `/mcp` with `Bearer ${tokens.accessToken}` only, through `requireBearerSession` (mcp.controller.ts:71), and asserts `'member.id': owner.memberId,` at :262 in a one-element `toStrictEqual`. bearer-session.middleware.ts:21 calls `rememberMemberId`, so skipping the field there fails it. | PASS |
| R03 | D17 (blocking) `calendar_feed.failures` | `294548ce` free-slots.controller.test.ts:468-473: one feed answers 404, one answers 200 with `'not a calendar'`, and the test asserts `'calendar_feed.failures': expect.arrayContaining(['needs-reconnecting', 'unavailable'])`, the member ids and `'calendar_feed.failed_statuses': expect.arrayContaining(['404', 'unknown'])`. Deleting the `addWideEventFields` call at calendar-feeds.service.ts:82-86 fails it. | PASS |
| R04 | D18 (blocking) `free_slots.*` fields | `294548ce` free-slots.controller.test.ts:474-479: `'free_slots.members': 2`, `'free_slots.feeds_read': 0`, `'free_slots.feeds_failed': 2`, `'free_slots.excluded': 2`, `'free_slots.slots': freeSlots.slots.length`, `'free_slots.duration_ms': expect.any(Number)`. | PASS |
| R05 | D20 (blocking) streak reminder inside a `scheduled` scope | `294548ce` apps/pragma/api/src/streaks/streak-reminder.service.test.ts:210-229 drives `handler({ job: STREAK_REMINDER_JOB })` from `../main`, keeps every line carrying `'event.kind'`, and asserts exactly one with `'event.kind': 'scheduled'`, `'scheduled.job': 'streak-reminder'`, `outcome: 'success'`, `'push.failures': ['streak_push_failed']`, `'push.failed_statuses': ['500']`. Removing `runInWideEvent` at main.ts:40 turns the push fields into `detached` lines, and the `toStrictEqual` of one `scheduled` element fails. | PASS |
| R06 | D21 (blocking) WebSocket handler inside a `socket` scope | `294548ce` apps/pragma/api/src/realtime/realtime.controller.test.ts:149-173 calls `handler` from `../main.websocket` with a ticket signed by a zero key on `$connect`, asserts `expect(reply).toStrictEqual({ statusCode: 401 });` and one line with `'event.kind': 'socket'`, `'socket.route_key': '$connect'`, `'socket.status_code': 401`, `outcome: 'refused'`. This is the failing case round 1 named. | PASS |
| R07 | B11 (non-blocking, dismissed: "every file under helpers/ uses .core.ts for its pure part") | `find apps/pragma/api/src/helpers \( -name '*.utils.ts' -o -name '*.core.ts' \) ! -name '*.test.ts'` lists 11 files, all `.core.ts` (`client-address`, `json`, `lambda-event`, `error-reporting`, `wide-event`, `reorder`, `paris-time`, `conflict-abort`, `deletion`, `insertion`, `reference`) and no `.utils.ts`. The claim holds for pragma, which is where B11 was raised. It does not hold for talos; see B05. | PASS |
| R08 | A06 (non-blocking) `main.dev.ts` keeps `console.log` | `135d1e6e` ADR Decision now reads "every `console.*` call in `apps/pragma/api/src` go, except the two lines `main.dev.ts` prints when the local server starts", and `.oxlintrc.json:1014` keeps `"apps/*/api/src/main.dev.ts"` in the `no-console: off` override. | PASS |
| R09 | A25 (non-blocking) practice-free-slots spec names removed log lines | `135d1e6e` docs/features/pragma/practice-free-slots/spec/spec.md:173 now reads "adds its kind, its member id and its status code to the request's wide event (`calendar_feed.failures`, `calendar_feed.failed_member_ids`, `calendar_feed.failed_statuses`)". | PASS |
| R10 | B10 (non-blocking) `find…` returns `undefined` | `294548ce` error-reporting.adapter.ts:82-83 `export function findActiveTraceId(): string \| null {` / `return Sentry.getActiveSpan()?.spanContext().traceId ?? null;`; wide-event.adapter.ts:68 `function findOpenScope(): WideEventScope \| null {`. The test now reads `expect(findActiveTraceId()).toBeNull();` (error-reporting.adapter.test.ts:182). | PASS |
| R11 | B12 (non-blocking) wrong blueprint claim | `294548ce` wide-event.middleware.ts:10-15 now declares `@Blueprint middleware-wide-event`, indexed at `.claude/skills/blueprint/blueprint-index.md:187`. The three app copies follow it with `// @FollowsBlueprint middleware-wide-event`. | PASS |

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | A plan maps the decision to files | none | `plan.md` is still absent, and this round's diff adds three app copies no plan names. Files were taken from the diff and the ADR's `~` bullet. | UNVERIFIABLE |
| A01 | Consequences `~` "last-loop-lepin, banana-rush and talos follow the same shape, each with its own copy" | apps/{last-loop-lepin,banana-rush,talos}/api/src/helpers/observability/{wide-event.core,wide-event.adapter,wide-event.middleware,wide-event.environment,route-name.core}.ts | `diff -u` of the lepin copy against the banana-rush and talos copies differs only at wide-event.core.ts:25 `const SERVICE_NAME = 'last-loop-lepin-api';` / `'banana-rush-api'` / `'talos-api'`. No file imports across apps. | PASS |
| A02 | Decision "A Hono middleware opens the event … `hono/logger` … go", per app | apps/last-loop-lepin/api/src/app.ts:19, apps/banana-rush/api/src/app.ts:17, apps/talos/api/src/app.ts:31 | each reads `.use('*', recordWideEvents)` where `.use('*', logger())` was; `grep -rn "hono/logger" apps/*/api/src` returns nothing | PASS |
| A03 | `~` "They write to stdout only, because none of them records a Sentry request span" | apps/last-loop-lepin/api/src/helpers/observability/wide-event.adapter.ts:26-28 (same in the other two) | `function emitWideEvent(fields: WideEventFields): void {` / `process.stdout.write(serializeWideEvent(fields));`; the adapter imports only `node:async_hooks`, its core and its environment reader. `grep -rn tracesSampleRate` in the three API trees hits only lepin error-reporting.adapter.ts:35 `tracesSampleRate: NO_TRACING,`, which matches the ADR's "last-loop-lepin sets `tracesSampleRate: 0`, banana-rush and talos set none". | PASS |
| A04 | `~` "They carry no identity field" | `grep -rn "addWideEventFields(" apps/{last-loop-lepin,banana-rush,talos}/api/src` outside tests | Only the middlewares (route, status, duration, failure), banana-rush main.websocket.ts:18 (`'socket.status_code'`, `outcome`), talos routine-fire.adapter.ts:47 `'routine.fire_failure'` and talos parameter-store.client.ts:26-29 (`'parameter_store.failed_parameters': [parameterName]`, `'parameter_store.failure_types'`). None holds a session id, a player token or an owner. The parameter name is a path, not its value. | PASS |
| A05 | `~` "The `no-console` ban covers every `apps/*/api/src` tree" | .oxlintrc.json:535-538 | `"files": ["apps/*/api/src/**/*.ts"],` / `"no-console": ["error", { "allow": [] }]`. The four `console.*` calls the three trees held on origin/main (lepin unhandled-error.middleware.ts:16, talos routine-fire.adapter.ts:45, talos parameter-store.client.ts:24, plus the dev entry points) are gone or under the `main.dev.ts` override at .oxlintrc.json:1014. `oxlint --type-aware` on the four API trees exits 0. | PASS |
| A06 | Decision "the error behind a 500" lands on the event, per app | lepin unhandled-error.middleware.ts:16 (removed `console.error(error);`); wide-event.middleware.ts:27 `failure: context.error,` | Hono's compose sets `context.error = err;` before `onError` (node_modules/.pnpm/hono@4.13.7/…/compose.js:25), so the stack the removed `console.error` printed now lands in `error.stack`. The talos e2e output shows it live: `"http.response.status_code":503,…,"outcome":"failed","error.type":"TalosError","error.message":"not-configured","error.stack":"TalosError: not-configured…`. | PASS |
| A07 | Decision "The scheduled … and the WebSocket handler run inside the same scope", per app | apps/banana-rush/api/src/main.websocket.ts:13-27; apps/talos/api/src/main.export.ts:6-8 | `return await runInWideEvent(` / `{ 'event.kind': 'socket', 'socket.route_key': event.requestContext.routeKey },` and `export const handler = reportHandlerFailures(answerSocketEvent);`; talos `await runInWideEvent({ 'event.kind': 'scheduled', 'scheduled.job': 'export' }, () =>` | PASS |
| A08 | Same, talos restore drill | apps/talos/api/src/main.restore-drill.ts:4 | `export const handler = async (): Promise<RestoreDrillStep> => await runRestoreDrill();`. Failing case: invoking this handler (the `talos-restore-drill` Lambda, cdk/bin/cdk.ts:42) writes no wide event, while main.export.ts's sibling scheduled job writes one `event.kind: scheduled` line. Nothing on that path adds fields today, so nothing is lost; the job is simply absent from the event stream. | FAIL (non-blocking) |
| A09 | Round-1 note: repeated slice failures append, not overwrite | apps/pragma/api/src/songs/spotify.adapter.ts:93-94, realtime.service.ts:85-86 | `'spotify.failure': [failure.type],` / `'realtime.broadcast_failure': [failure.type],`; `mergeWideEventFields` concatenates two string lists | PASS |
| A10 | Round-1 note: `calendar_feed.failed_statuses` with no status | apps/pragma/api/src/calendar-feeds/calendar-feeds.service.ts:16, :85 | `const UNKNOWN_STATUS = 'unknown';` / `'calendar_feed.failed_statuses': [status === null ? UNKNOWN_STATUS : String(status)],`; pinned by `expect.arrayContaining(['404', 'unknown'])` at free-slots.controller.test.ts:473 | PASS |
| A11 | Outside the ADR: lepin `pnpm dev` seeds the database it reads | apps/last-loop-lepin/dev-db.sh:11, :31 | `DATABASE_URL="$(../../scripts/local-postgres.sh start ${APP_SLUG} dev)"` matches package.json:9 `dev:api` (`local-postgres.sh start last-loop-lepin dev`), and `local-postgres.sh` documents the `[purpose]` argument at :21-26. `'scrypt\$6ccc…\$6019…'` now passes a literal `$` instead of expanding `$6` under `set -u`. | PASS |

## B. Code cleanliness

Changed source files read in full: the five observability files in each of lepin, banana-rush and talos; banana-rush main.websocket.ts and app.ts; talos app.ts, main.export.ts, routine-fire.adapter.ts, parameter-store.client.ts; lepin app.ts, unhandled-error.middleware.ts; pragma calendar-feeds.service.ts, error-reporting.adapter.ts, wide-event.adapter.ts, wide-event.middleware.ts, realtime.service.ts, spotify.adapter.ts. No `VOCABULARY.md` changed.

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <every added or modified .ts under apps/>`, then on `apps/{pragma,last-loop-lepin,banana-rush,talos}/api/src` | exit 0 both runs, no output | PASS |
| B02 | No `any` | `grep -nP '\bany\b' <changed files>` | only prose in test names ("outside any request") and `expect.any(Number)` | PASS |
| B03 | Type assertions only `as const` / `as unknown`; no prose comments | `grep -nP '\bas (?!const\b\|unknown\b)'`, `grep -nE '^\s*//'` | assertion hits are prose inside strings; the only `//` lines are `@FollowsBlueprint` markers and the pre-existing reasoned `eslint-disable` at pragma error-reporting.adapter.ts:103 | PASS |
| B04 | Standards checklist (01-naming): "a `find…` returns `null` rather than a sentinel", and `select…` returns what it says | read in full | `function findOpenScope(): WideEventScope \| null {` in each copy (lepin wide-event.adapter.ts:59); `selectRouteName`, `selectRequestOutcome`, `selectRequestId`, `selectLambdaRequestId` each return a value from their input | PASS |
| B05 | Standards checklist (02-purity): "the choice between `.core.ts` and `.utils.ts`" | read in full | `apps/talos/api/src/helpers/observability/wide-event.core.ts` and `route-name.core.ts` hold `serializeWideEvent`, `selectRouteName`, `selectLambdaRequestId`: plumbing no owner of talos would recognise. 02-purity-and-core-files.md:127-137 assigns that to `.utils.ts` and cites talos's own `api/src/helpers/calendar/paris-clock.utils.ts`; talos helpers already hold two `.utils.ts` files (`paris-clock.utils.ts`, `secret-comparison.utils.ts`), so the B11 dismissal's local-precedent reason does not carry to talos. Introduced: this branch; Fix size: two file renames plus their imports in four talos source files (wide-event.adapter.ts, wide-event.middleware.ts, routine-fire.adapter.ts, parameter-store.client.ts) and their tests | FAIL (non-blocking) |
| B06 | Standards checklist (01-naming): "a file name says what the file holds" | read in full | `route-name.core.ts` holds `selectRouteName`; `wide-event.environment.ts` holds `readServiceStage`, following `environment-reader` (blueprint-index.md:158) | PASS |
| B07 | Standards checklist (03-typing): "a derived type is derived" | read in full | banana-rush main.websocket.ts:9 imports `type SocketEvent, type SocketReply` from realtime.service.ts:42, :47 rather than restating them | PASS |
| B08 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read the new `it(…)` names | e.g. `'records a socket event with no connection as refused'`, `'answers undefined for a parameter it cannot read and names it on the wide event'`, `'records the failure of an export that threw and throws it on'` | PASS |
| B09 | Blueprint claims match | blueprint-index.md:187, :158, :112, :69 | `@FollowsBlueprint middleware-wide-event` on a `MiddlewareHandler` that never refuses and awaits `next` inside `runInWideEvent` (lepin wide-event.middleware.ts:9-32) | PASS |
| B10 | `useEffect` | `grep -nE '\buseEffect\('` on changed files | none (no site file changed) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 0cace964… --coverage --reporter=verbose` | 0; 8 files, 104 tests; coverage 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 0cace964… --reporter=verbose` | 0; 50 files, 458 tests, including free-slots.controller.test.ts, mcp.controller.test.ts, realtime.controller.test.ts, streak-reminder.service.test.ts, wide-event.middleware.test.ts | PASS |
| C03 | @borso-app/last-loop-lepin | same two commands | core 0 (3 files, 49 tests, coverage 100%); e2e 0 (12 files, 58 tests, including wide-event.middleware.test.ts and unhandled-error.middleware.test.ts) | PASS |
| C04 | @borso-app/banana-rush | same two commands | core 0 (3 files, 49 tests, coverage 100%); e2e 0 (3 files, 39 tests, including wide-event.middleware.test.ts and main.websocket.test.ts) | PASS |
| C05 | @borso-app/talos | same two commands | core 0 (5 files, 62 tests, coverage 100%); e2e 0 (20 files, 108 tests, including main.export.test.ts, parameter-store.client.test.ts, wide-event.middleware.test.ts) | PASS |
| C06 | all four | `scripts/mutate-changed.sh 0cace964992f4fac4647b2220ac4eeb0b5be5242` | 0; banana-rush 3 files, last-loop-lepin 3, pragma 4, talos 4, each "Final mutation score of 100.00"; "every changed gated file passed mutation (4 run(s))" | PASS |
| C07 | `*.utils.ts` in touched trees | `find` for each new pure file's sibling test | no `*.utils.ts` added; every new `.core.ts` and `.adapter.ts` has its sibling `.test.ts` (route-name.core, wide-event.core, wide-event.adapter in all three apps) | PASS |

## D. Test coverage of spec

Rows walk the ADR's amended `~` bullet, in order, for the three app copies. The pragma claims were graded in round 1 and in R01 to R06 above.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Each of the three APIs writes one JSON line per request with route, status, duration, outcome and handler-added fields | `it('writes one event per request with its route, status, outcome and the fields its handlers added', …)` at lepin/banana-rush/talos wide-event.middleware.test.ts:44; `expect(events).toHaveLength(1);` and `'http.route': '/api/rows/:rowId'`, `'http.response.status_code': 200`, `outcome: 'success'`, `'rows.read': 1` (lepin :50-60) | PASS |
| D02 | Refused below 500, failed with `error.*` from 500 | `it('records a refusal as refused, with no error fields', …)` :66 (`expect(event).not.toHaveProperty('error.type');` :78) and `it('records the error behind a 500 as error fields', …)` :81 (`'error.type': 'TypeError'`, `'error.stack': expect.stringContaining('TypeError: cannot read the row')` :92-94), in each copy | PASS |
| D03 | `service.name` names the app | lepin :54 `'service.name': 'last-loop-lepin-api'`; banana-rush main.websocket.test.ts:30 `'service.name': 'banana-rush-api'`; talos main.export.test.ts:33 `'service.name': 'talos-api'` | PASS |
| D04 | stdout only, no Sentry span | **structural:** wide-event.adapter.ts in each copy imports nothing but `node:async_hooks`, `./wide-event.core` and `./wide-event.environment`, and emits through `process.stdout.write` at :27 and :71 | PASS |
| D05 | No identity field | **structural:** the `addWideEventFields` call sites listed in A04 are the only writers, and none passes an identifier | PASS |
| D06 | `no-console` covers every `apps/*/api/src` | **structural:** .oxlintrc.json:535 `"files": ["apps/*/api/src/**/*.ts"]`, held by the lint gate (B01) | PASS |
| D07 | banana-rush WebSocket handler runs in a `socket` scope with an outcome from its status | `it('writes one socket event naming the route and its accepted status', …)` at banana-rush main.websocket.test.ts:20 (`'event.kind': 'socket'`, `'socket.status_code': 200`, `outcome: 'success'`); `it('records a socket event with no connection as refused', …)` :39 (`'socket.status_code': 400`, `outcome: 'refused'`) | PASS |
| D08 | talos export job runs in a `scheduled` scope, success and failure | main.export.test.ts:26 `it('runs the weekly export inside one scheduled wide event', …)` (`'event.kind': 'scheduled'`, `outcome: 'success'`); :43 `it('records the failure of an export that threw and throws it on', …)` (`await expect(handler()).rejects.toBe(failure);`, `outcome: 'failed', 'error.message': 'the export answered 503'`) | PASS |
| D09 | talos's replaced `console.warn` lines become event fields | parameter-store.client.test.ts:42 (`'parameter_store.failed_parameters': ['/talos/fire-url', '/talos/fire-token']`, `expect(write).toHaveBeenCalledOnce();`); routine-fire.adapter.test.ts:66 (`'routine.fire_failure': 'TypeError'`) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | `git diff 0cace964..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` touches pragma calendar-feeds.service.ts:85 and realtime.service.ts:85-86 only, both `addWideEventFields` argument changes; no `insert(`, `update(`, `delete(`, `onConflict` or `transaction(` added | PASS |
| E02 | `let isColdStart = true;` (wide-event.adapter.ts:24 in each copy) | Per-process state | Per instance by design: the ADR field table sources `lambda.cold_start` from "a module-level flag". No application-wide rule depends on it. | PASS |

## Blocking findings

- none

## Non-blocking findings

- A08 — talos `main.restore-drill.ts` runs outside any wide event, while its sibling `main.export.ts` writes a `scheduled` event.
- B05 — talos `wide-event.core.ts` and `route-name.core.ts` hold plumbing 02-purity assigns to `.utils.ts`, and talos's own helpers already use `.utils.ts`, so the B11 dismissal reason does not carry there.

## Notes

- A00 (UNVERIFIABLE): no plan exists, and this round added three app copies that no plan names. Run `/technical-conception` for a change of this size next time.
- No test asserts that `app.ts` in last-loop-lepin, banana-rush or talos mounts `recordWideEvents`: no test that spies `process.stdout.write` in those trees imports `createApp` (grep, measured). Deleting `.use('*', recordWideEvents)` there would pass every test (inferred, not run). Round 1 accepted the middleware-level test for pragma's D01 on the same terms. Should one app-level request per app pin the mount?
- talos e2e output prints full wide events, stacks included, because talos's controller tests do not capture stdout. Is that noise worth silencing in its test setup?
- `routine.fire_failure` (talos routine-fire.adapter.ts:47) is a scalar while the other failure fields are lists. Only proposals.service.ts:95 calls `fireRoutine`, once per request, so no overwrite happens today. Should it be a list for consistency?
- banana-rush `main.websocket.ts:13` exports `answerSocketEvent` beside `handler` so its test can skip `reportHandlerFailures`. The `api-lambda-entrypoint` blueprint says the entry point exports only the adapted handler. Is the extra export acceptable, or should the test drive `handler` as pragma's realtime test does?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
