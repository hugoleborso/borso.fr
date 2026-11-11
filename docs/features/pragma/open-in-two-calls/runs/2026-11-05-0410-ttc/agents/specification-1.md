---
status: question
summary: |
  Spec drafted. pragma opens on one GET /api/opening that seeds every shell,
  home and offline query key and replaces both the session probe and
  /api/offline-manifest. A cold open of / then sends 2 API requests, 1 of
  them data, against 13 today (inferred from the code). An `all` stale
  message refetches the opening read once instead of every mounted query.
  Rule borso/no-request-fan-out-in-site refuses request-sending mappings
  in Promise.all and useQueries and allows literal arrays. Client, product
  and designer flags stay until the operator answers D6 and D7.
artifacts:
  - docs/features/pragma/open-in-two-calls/spec/spec.md
next:
  kind: answer-needed
  question: |
    D6. On a first open with nothing cached, should pragma wait for the
    opening read behind the checking screen, and show a new error screen
    with a retry when it fails? Recommended yes. A warm open still renders
    the cache at once.
  options:
    - "Wait only when nothing is cached (recommended)"
    - "Always wait, warm opens included"
    - "Never wait, accept the burst on a cold open"
---

## Detail

Open decisions for the operator, in order.

1. D6 above.
2. D7. The two-call target covers `/` and the shell tab routes. Push deep
   links (`/catalog/:id`, `/sessions/:id`, `/setlists/:id`) send the opening
   read plus 2 to 4 own reads (inferred). Recommended to accept this.

Decisions recommended and awaiting ratification: D1 one opening read, D2
shell data inside it, D3 it replaces the offline manifest and uses
`selectNextSession`, D4 seed per key and refetch the read on `all`, D5 no
refetch on mount for seeded roots, D8 no ticket inside, D9 all or nothing,
D10 to D12 the rule's scope, message and one inline disable.

One ADR to write after ratification, `pragma-opens-on-one-read`, amending
ADR-2026-11-01T1313.
