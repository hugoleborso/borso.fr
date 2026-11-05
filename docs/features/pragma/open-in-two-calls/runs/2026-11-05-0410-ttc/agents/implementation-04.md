---
status: done
summary: |
  Slice 4 shipped. Every pragma read now goes through one transport in the `fetch` option of
  the Hono client. The reads issued in one task form one group. A group of one leaves as a
  plain GET, and two or more leave as one `POST /api/read-batch` of at most 10 reads. At
  most 2 read requests are in flight per tab, and a group that finds no free slot waits and
  merges with later groups. Writes, URL inputs, paths outside `/api/` and reads with a
  header outside `PRAGMA_REQUEST_HEADERS` go straight to `fetch`. Each caller gets its own
  `Response`, so query modules did not change. A failed batch reports `read-batch-failed`.
  The closer stays `queueMicrotask`, because `setTimeout(0)` sent the same count on all three
  measured routes. A cold open of `/` in `pnpm dev` sent 5 API requests with a peak of 2
  (measured), against 13 with a peak of 9 before (spec, inferred). Every slice 4 gate passes.
artifacts:
  - apps/pragma/site/src/lib/read-batch.core.ts
  - apps/pragma/site/src/lib/read-batch.core.test.ts
  - apps/pragma/site/src/lib/read-batch.adapter.ts
  - apps/pragma/site/src/lib/read-batch.adapter.test.ts
  - apps/pragma/site/src/lib/api.client.ts
  - apps/pragma/site/src/lib/api.client.test.ts
  - apps/pragma/site/src/lib/queries/queries.test-utils.tsx
  - apps/pragma/site/src/lib/query-client.setup.test.ts
  - apps/pragma/site/src/observability/error-reporting.adapter.ts
  - apps/pragma/site/src/observability/error-reporting.adapter.test.ts
  - apps/pragma/site/src/observability/error-reporting.setup.ts
  - apps/pragma/VOCABULARY.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-04.md
next:
  kind: validate
---

# Implementation 04, slice 4 (the client transport)

## Goal, smallest change, shape

- Goal. Every read one tab issues in one task leaves as one request, and at most 2 read
  requests are in flight, so one client never fills the API's 10 seats.
- Smallest change. One transport under `fetchWatchingSessionEnd`, a pure core for the item
  and answer mapping, `stubFetch` taught to unwrap a batch, and one Sentry report.
- Shape. A caller is `{ signal, resolve, reject }`. A waiting read is `{ read: BatchedRead,
  caller }`, and identical reads merge into `{ read, callers[] }`. The transport is a small
  state machine. The open group closes at the end of its task into the waiting list. While
  fewer than 2 requests are in flight, the first 10 waiting reads leave. One read leaves as
  a GET, more as a batch. A settled request frees its slot and drains again.

## Where the code differs from the plan, and why

- The transport instance lives in `api.client.ts`, not in the adapter. The adapter needs
  `API_BASE`, and `error-reporting.adapter.ts` already imports `api.client.ts`, so either
  direct import cycles (`import/no-cycle` is `error`). Sentry subscribes instead, through
  `onReadBatchFailed(reportReadBatchFailed)` in `error-reporting.setup.ts`, the same listener
  pattern as `onSessionEnded`.
- A lone read always leaves as a GET built from the item, with `credentials: 'include'` and
  its allowed headers, and its body is rebuilt per caller. A raw pass-through for one caller
  kept two branches that Stryker could only mutate into equivalents. No site code reads a
  response header other than `content-type`, or a binary body (measured, grep of
  `headers.get(`, `.blob()` and `arrayBuffer()`).
- `toLoneRead` and `takeNextBatch` replace `splitIntoBatches`. The adapter only ever takes
  the next batch, and the rest waits to merge with later groups.
- A batch answer that is not JSON rejects every caller with the parse error. A JSON answer
  of the wrong shape rejects with `read-batch-malformed`. Both report `status: null`.
- A refused batch (any status but 200) hands every caller a `Response` with that status and
  body, so `ApiError` and the `retry: 1` path work as for a lone failed read.
- `reportBatchFailure` is required, since an empty default is refused by `no-empty-function`.

## The cases the brief named

| Case | Behaviour | Held by |
| --- | --- | --- |
| Aborted request | Rejects at once if already aborted, leaves its group if aborted before the group leaves, rejects alone if its batch is in flight. No query passes a signal today (measured, grep of `signal` in `site/src/lib`) | `read-batch.adapter.test.ts` › a caller that stops waiting |
| `PRAGMA_REQUEST_HEADERS` | `x-ballot-token` rides an item. Any other header makes the read leave alone at once | `read-batch.core.test.ts`, `read-batch.adapter.test.ts` |
| Realtime ticket | Joins the batch of its tick, never cached | `api.client.test.ts` › sends the realtime ticket in the same batch |
| 401 in a batch | `fetchWatchingSessionEnd` sees each item's own `Response` and fires `onSessionEnded` once | `api.client.test.ts` › ends the session once |
| Network failure | Rejects every caller of the group, reports `status: null` | `read-batch.adapter.test.ts` › rejects every caller when the network drops |
| Live invalidation burst | 12 mounted songs refetch as 2 batches, peak 2. 23 reads leave as 10 and 10, then 3 once a slot frees | `api.client.test.ts`, `read-batch.adapter.test.ts` |

## D13 prototype, microtask against `setTimeout(0)`

Measured against `pnpm dev`, signed in as Hugo. Cold means `pragma.query-cache` removed and
the page reopened, counted 7 s later. The plan's snippet read 0 at first, because Vite's
module requests fill the default 250-entry resource timing buffer. The browser was relaunched
with `agent-browser --init-script` calling `performance.setResourceTimingBufferSize(100000)`.

| Route, cold | `queueMicrotask` | `setTimeout(0)` |
| --- | --- | --- |
| `/` | 5 requests, peak 1 | 5 requests, peak 2 |
| `/catalog` | 5 requests, peak 2 | 5 requests, peak 1 |
| `/setlists/:setlistId` | 5 requests, peak 2 | 5 requests, peak 2 |

The counts are equal, so `queueMicrotask` stays. The peaks vary with response timing, not
with the closer, and never pass 2.

## End to end, after the final code

| Open | Requests (measured) | Peak | Paths |
| --- | --- | --- | --- |
| `/` cold | 5 | 2 | probe GET `/api/instruments`, 3 batches, GET entries |
| `/catalog` cold | 5 | 2 | same |
| `/setlists/:setlistId` cold | 5 | 1 | probe GET, 4 batches |
| `/` warm | 2 | 1 | GET ticket, 1 batch |

The spec's bound for `/` cold is 3. Slice 5 reaches it by mounting the route under the
opening screen, so the probe joins the first batch. Today the probe leaves alone before the
screen mounts. The home screen rendered with its data (screenshot checked).

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| 4.1 | `pnpm --filter @borso-app/pragma lint` (oxlint `--type-aware`) | pass |
| 4.2 | `pnpm run format:check` (oxfmt `--check`) | pass, 2907 files |
| 4.3 | `pnpm --filter @borso-app/pragma typecheck` | pass |
| 4.4 | `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage` | pass, 399 files, 3896 tests, 100% per file |
| 4.5 | `pnpm --filter @borso-app/pragma build` | pass |
| 4.6 | `pnpm knip` | pass, exit 0 |
| 4.7 | `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/lib/read-batch.core.ts,site/src/lib/read-batch.adapter.ts,site/src/observability/error-reporting.adapter.ts` | 283 killed, 1 timeout, 0 survived, score 100 |
| 4.8 | D13 prototype | microtask kept, table above |
| 4.9 | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | pass |
| extra | `scripts/check-vocabulary-paths.sh` | pass |
| e2e | none touched. Slice 4 changes no `api/` file | not applicable |

One existing assertion changed outside slice 4's new files. `query-client.setup.test.ts` now
looks for `/api/sessions` in the request URL or the batch body, because the preload's two
list reads leave as one batch.

## Friction

Logged with `scripts/kaizen.sh --from impl-4`: the resource timing buffer under Vite, the
`har` and `addinitscript` commands that agent-browser 0.35.2 lists and refuses, and the
import cycle the plan's placement of the transport would have made.
