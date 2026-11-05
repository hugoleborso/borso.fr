---
status: done
summary: |
  Spec rewritten around a generic read batch. The Hono client's fetch
  option groups every read issued in one task into one POST
  /api/read-batch (a single read stays a plain GET), at most 10 reads per
  batch and at most 2 read requests in flight per tab. The API runs each
  read through app.fetch with the caller's headers and answers per-read
  status. Query modules do not change. /api/offline-manifest is deleted
  and the preload uses selectNextSession. A cold open with nothing cached
  shows the animated pragma mark until band data lands, with an error and
  retry on failure and a static mark under reduced motion. Acceptance is
  a per-route request bound, cold and warm, with a peak of 2, measured
  from resource timing against pnpm dev. Rule B keeps the literal
  allowance and adds an awaited-read-in-a-loop check. D2, D4, D5 and D8
  are moot. No operator decision remains open.
artifacts:
  - docs/features/pragma/open-in-two-calls/spec/spec.md
next:
  kind: validate
---

## Detail

Operator decisions applied: D1 generic batch, D6 opening screen, D7 every
route, the ADR (inputs for `/adr` are in the spec's Architectural choices),
and rule B.

Decisions this pass took that the operator may want to see.

- D13. The seam is the `fetch` option of `hc`. hono 4.13.7 calls it
  synchronously from `$get` (measured in its source). The group window
  (microtask or next macrotask) is settled by a prototype in the plan's
  first step.
- D15. 10 reads per batch, the `postgres` 3.4.9 default pool size, and 2
  read requests in flight per tab.
- D16. Writes stay unbatched and skip the in-flight cap.
- D17. A group of one read leaves as a plain GET.
- D18. The opening screen also shows right after sign-in, because the
  wait ends when band data first lands, not when the probe settles. A
  cold network failure now shows the error screen instead of `/login`.
- The animation choreography ("the downbeat") is this spec's design
  proposal. No SVG of the mark exists, so the plan traces one from
  `public/icons/pragma-logo.png`.
- pragma has no dark theme (measured, `tokens.css`), so the screenshots
  cover 375 px and 1280 px with and without reduced motion.

Risks named for the plan: group splits across tasks, the 40 site test
files that stub `fetch` (the helper unwraps batches), and an unknown
batch latency on a cold Lambda.
