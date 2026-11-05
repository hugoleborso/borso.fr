---
status: done
summary: |
  Fix round 3 (visual validation rows 25, 27, 30 and 38) is done, each row reproduced in pnpm dev,
  fixed and re-measured. Rows 25 and 38 had two causes. Each query's retry timer is set at its own
  instant, so the setTimeout(0) opened by the first retry missed timers set 3 ms later. A read whose
  lone GET had failed was not counted as a retry, so "Try again" split it from the gathered retries.
  A failed batch now gathers its retries until every failed caller came back, or 100 ms after the
  first one, then releases them into the open group. Row 27 was the microtask closer. The ticket and
  the preload's next wave join in one task, a few promise turns apart. Groups now close with
  setTimeout, the closer the plan's never-run D13 prototype was meant to pick. Row 30 is fixed. The
  preload now reads each next setlist with its entries, and origin/main shows the same defect
  (measured). Gates pass on the touched files.
artifacts:
  - apps/pragma/site/src/lib/read-batch.adapter.ts
  - apps/pragma/site/src/lib/read-batch.adapter.test.ts
  - apps/pragma/site/src/lib/api.client.test.ts
  - apps/pragma/site/src/lib/queries/setlists.queries.ts
  - apps/pragma/site/src/lib/queries/offline-reading.queries.ts
  - apps/pragma/site/src/lib/queries/offline-reading.queries.test.ts
  - apps/pragma/site/src/lib/queries/improvements.queries.test.tsx
  - apps/pragma/site/src/lib/queries/instruments.queries.test.tsx
  - apps/pragma/site/src/lib/queries/notifications.queries.test.tsx
  - docs/features/pragma/open-in-two-calls/plan/plan.md
next:
  kind: validate
---

# Fix round 3, visual validation rows 25, 27, 30 and 38

## Goal

One client never sends more than 10 reads at once. Reads issued together leave as one batch, and reads that fail together retry as one batch. The smallest change has three parts. Close a group at the end of its task. Gather a failed batch's retries by count, not by one timer turn. Preload the next setlist's own read.

Data shape: `RetryGathering = { awaited: FailedCallers, gathered: WaitingRead[] }`, one per failed batch. `FailedCallers` is the existing `Map<readIdentity, count>`.

## Method

All measurements come from `pnpm dev` at 375 px, signed in as Hugo, with an init script that wraps `window.fetch` and logs method, path, batch reads, start and end. A second init script wraps `queueMicrotask` and `setTimeout` and logs each call the transport makes, with its stack. "Cold" removes `pragma.query-cache` before opening the route.

## Row 27, the ticket alone on cold `/`

Cause (measured). The transport logged the ticket's join at 1285.3 ms and the next session's join at 1294.8 ms, in the same task by the MessageChannel task marker. `queueMicrotask` closed the ticket's group before the preload's continuation issued its reads. The preload has to await the songs and sessions lists and seed every song first. With a temporary `closeGroup: setTimeout` in `api.client.ts`, cold `/` sent 3 requests, and the ticket rode in the next session's batch.

The ticket is a read the batch carries. `api.client.test.ts` already sends it inside a batch.

Fix. `closeGroup` now defaults to `closeAtEndOfTask`, which is `setTimeout(close)`. This is the decision the plan's D13 prototype was meant to record. It was never run. The plan row now records the counts. The adapter test `keeps a group open for a read issued a few promise turns later in the same task` fails on the old adapter and passes on the new one (measured).

| Route, cold | Before (microtask) | After (task) |
|---|---|---|
| `/` | 4: batch[7], ticket alone, batch[2], entries | 3: batch[7], batch[ticket, session, setlists], batch[setlist, entries] |
| `/setlists/:setlistId` | 4 (report) | 3 |
| `/catalog` | 4 (report) | 4 |

The task closer delayed the mount reads in three query tests past their `flushMicrotasks`. `improvements`, `instruments` and `notifications` now call the existing `flushTasks` after mounting. No assertion changed. The whole site core suite passes, 251 files and 2369 tests (measured).

## Rows 38 and 25, retries in more than one group

Before (measured, `/api/**` aborted, cold `/`):

- 38. The batch of 7 failed. The retry left as `GET /api/sessions` at 2467 ms, then `POST batch[6]` at 2469 ms.
- 25. "Try again" sent `GET /api/sessions` and `POST batch[6]` 7 ms apart. Their `retry: 1` then sent `GET sessions`, `GET instruments` and `POST batch[5]`.

Causes (inferred from the logs and the code, then confirmed by tests that fail on the old adapter).

1. Each query's retry timer is set when its rejection is handled. Synchronous work in that task spreads the due times by milliseconds. The old retry group closed on a `setTimeout(0)` opened by the first retry, so later timers formed their own groups.
2. `sendAlone` records no failure. The `sessions` read that failed alone was a fresh read on "Try again", so it joined the microtask group, while the batch's reads waited for the retry timer turn.

Fix. Each failed batch records its failed callers in a `RetryGathering`. A read that matches one joins it. The gathering releases its reads into the open group when every awaited caller has come back, or `RETRY_STRAGGLER_WAIT_MS` (100 ms) after the first, whichever comes first. Fresh reads and released retries in one task share one group. The 100 ms only applies when a failed caller never retries. On cold `/` that is the session probe, which has `retry: false` and shares `/api/instruments` with the list. So the measured retry leaves about 1100 ms after the failure instead of 1000 ms. A reset drops every gathering, and a straggler timer that fires after a reset does nothing.

After (measured, same setup):

- 38. `POST batch[7]` failed at 1931 ms. The retry is one `POST batch[7]` at 3035 ms.
- 25. "Try again" sends one `POST batch[7]`, and its retry is one `POST batch[7]`.

Tests that fail on the old adapter (measured):

- `api.client.test.ts`, `resend as one batch, though each query took its own millisecond to fail`. A real `QueryClient` with `retry: 1`, seven queries rejecting 0 to 6 ms apart.
- `api.client.test.ts`, `try again as one batch, though one of them had failed alone`. A real `QueryClient` and `refetchQueries({ type: 'active' })`.
- The adapter's retry section is rewritten on `waitForStragglers`. It adds the straggler release and the case of fresh and retried reads in one task.

## Row 30, the offline setlist says it no longer exists

Cause (measured). The preload never read `GET /api/setlists/:id`. The setlist page's detail query has no data offline and is paused. `isLoading` is false, so the page renders `setlist.notFound`. The by-session summary cannot seed the detail key. It lacks `targetSongCount`, and its `kind` and `status` are resolved rather than stored values.

origin/main (`6250f706a`, a separate `git worktree` with its own `pnpm dev`) shows the same "This setlist no longer exists." under the offline banner (measured). So the defect predates this branch.

Fix. `setlists.queries.ts` exposes `setlistQueryOptions` and `mapSetlists`, and `useSetlist` uses the options. The preload reads each setlist of the next session together with its entries. They leave as one batch, so cold `/` stays at 3 requests. Offline, the link now opens "Set principal, 6 songs" with its rows (screenshot read, broken-image scan empty). The offline preload test now expects `/api/setlists/setlist-next` and its cached detail.

## Rows 03, 07 and 08, re-measured for the orchestrator

| Route | Mode | Report | Now |
|---|---|---|---|
| `/` | cold | 4 | 3 |
| `/` | warm | 1 | 1 |
| `/catalog/:songId` | cold | 5 | 5 |
| `/sessions/:sessionId/audience` | cold | 5 | 5 |
| `/sessions/:sessionId/setlist` | cold | 5 | 3 (the run ended on `/sessions/:sessionId` after the redirect) |
| `/setlists/:setlistId/audience` | cold | 5 | 5 |
| `/setlists/:setlistId` | cold | 4 | 3 |
| `/setlists/:setlistId/order` | warm | 2 | 2 (ticket, then entries) |

The routes still at 5 send the route's own second wave and the preload's next-session wave in different tasks.

## Gates (measured)

- `oxlint --type-aware` on the nine changed source and test files, exit 0.
- `oxfmt --check`, all formatted.
- `pnpm --filter @borso-app/pragma run typecheck`, exit 0.
- `pnpm build`, built.
- Site core suite, 251 files, 2369 tests passed.
- Coverage of `read-batch.adapter.ts` and `read-batch.core.ts`, 100% statements, branches, functions and lines.
- Stryker on `read-batch.adapter.ts`, score 100, 121 killed, 1 timeout, 0 survived. No `.core.ts` file changed.
- No e2e file is touched.
