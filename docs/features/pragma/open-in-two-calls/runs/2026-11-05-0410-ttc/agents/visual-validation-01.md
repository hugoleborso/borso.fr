---
status: failed
summary: |
  Visual validation FAIL at 9fd6c0d41, 40 rows, 28 PASS, 7 FAIL, 5 UNVERIFIABLE.
  The concurrency goal holds. The peak of read requests in flight never passed 2 on any of 29 routes, cold or warm (measured).
  The loader, its animation, reduced motion, the failure screen, the offline note and the tapped retry all pass at 375 px and 1280 px.
  The request counts miss the spec's bounds. Cold `/` sends 4 against 3, because the ticket leaves apart from the next-session wave.
  Cold `/catalog/:songId`, `/sessions/:sessionId/audience`, `/sessions/:sessionId/setlist` and `/setlists/:setlistId/audience` send 5 against 4.
  A warm `/setlists/:setlistId/order` sends 2 against 1.
  "Try again" and `retry: 1` each resend the failed reads as 2 or 3 requests, not one group.
  Offline, the next setlist's page reads "This setlist no longer exists." because `GET /api/setlists/:id` is not preloaded. The same gap is likely on main (inferred).
artifacts:
  - docs/features/pragma/open-in-two-calls/validation/visual-validation-2026-11-05-0816.md
  - docs/features/pragma/open-in-two-calls/validation/visual-validation-2026-11-05-0816/07-retry-loop-restarted-375.png
  - docs/features/pragma/open-in-two-calls/validation/visual-validation-2026-11-05-0816/14-offline-setlist-375.png
  - docs/features/pragma/open-in-two-calls/validation/visual-validation-2026-11-05-0816/request-counts.jsonl
  - docs/features/pragma/open-in-two-calls/validation/visual-validation-2026-11-05-0816/request-log.init.js
next:
  kind: escalate
  reason: visual-validation-fail-request-counts-over-bound-retry-split-offline-setlist
---

## Failing rows

- 03. Cold open of `/` sends 4 requests against a bound of 3, with a peak of 2. The ticket `GET` and the next-session batch leave 11 ms apart.
- 07. Four routes send 5 requests cold against a bound of 4: `/catalog/:songId`, `/sessions/:sessionId/audience`, `/sessions/:sessionId/setlist` and `/setlists/:setlistId/audience`.
- 08. A warm `/setlists/:setlistId/order` sends 2 requests against a bound of 1. The entries read refetches each time.
- 25. "Try again" sends 7 reads as two batches, `[2]` and `[5]`, not one group.
- 27. A dependent wave costs one request more than the spec counts, because the ticket travels alone. This is the cause of row 03.
- 30. Offline, `/setlists/:setlistId` shows "This setlist no longer exists." under the banner that promises the next-concert setlist.
- 38. After a failed batch, `retry: 1` resends the 7 reads as 3 requests, not one group.

The full table and the notes are in the report. Passing screenshots wait in `validation/.pending-upload/2026-11-05-0816/` (gitignored) for `/open-pr` to publish.

## Two choices the orchestrator should know

- The skill dispatches a `visual-validator` agent. This run had no Agent tool, so the brief was followed directly in the dispatched session. The agent definition's procedure and report format were applied unchanged.
- The spec's resource-timing count could not run as written, because Vite dev modules fill the 250-entry buffer first. An init script that wraps `fetch` counted instead, and it matched resource timing on every route.
