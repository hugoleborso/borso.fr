---
status: done
summary: |
  ADR-202611050445 written at
  docs/adr/202611050445-pragma-reads-leave-in-one-batch-per-tick.md,
  status proposed. It records the generic read batch in the Hono client's
  fetch layer, one POST /api/read-batch answered by one Lambda with
  per-read status, at most 10 reads per batch and 2 in flight per tab,
  writes never batched, and /api/offline-manifest deleted. Six options
  scored against five criteria, four of them the operator's. It amends
  ADR-202611011313 and supersedes none. Both ADR gates pass.
artifacts:
  - docs/adr/202611050445-pragma-reads-leave-in-one-batch-per-tick.md
  - docs/adr/README.md
---

# Detail

The orchestrator should fix the spec's ADR slug before the plan cites it. The spec's Architectural choices and Files to change name `pragma-reads-leave-in-one-batch-per-tick`, and this ADR uses the brief's `pragma-reads-leave-in-one-batch-per-tick`. Changing `spec.md` needs the operator's consent.

- **Conflict check.** No ADR in `docs/adr/` has this slug. `supersedes` is empty.
- **Options.** The brief's three rejected options are B (opening read), C (one endpoint per screen) and E (raise the ceiling). Two more come from the sources. D is a client concurrency limit alone, rejected in the spec's Architectural choices. F is changing nothing beyond #261, the "not doing the thing" option that `standard.md` requires. Every rejected option was raised by the author, so no Operator's answer field is needed.
- **Criteria.** Four criteria are the operator's and come from ratified spec decisions. They are users served (output metric), every route (D7), the reserved concurrency of 10 kept (D6 and out of scope) and per-read failure (D9). One criterion is the author's, what a new screen must add.
- **Index.** One row is in the main table and one entry is under App architecture. The entry joins id and summary with a period instead of the long dash its neighbours use, per CLAUDE.md Writing.
- **Gates.** `scripts/check-adr-criteria.sh` passed. So did `scripts/check-adr-numbers-resolve.sh`.
- **Not done.** Nothing is staged or committed. The plan path in Implementation pointers is a placeholder until `/technical-conception` writes it.
