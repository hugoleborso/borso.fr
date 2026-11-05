---
status: failed
summary: |
  Round 2, reviewed 47a357db1c83652f237c485867df09e42ece106b, diff since 60345e484. Verdict FAIL
  with 1 blocking finding, a local code defect, measured. A05/D19 is fixed: a non-JSON body now
  answers 400 read-batch-invalid and reports once, under both content types. A22/D16 is fixed for
  one failed batch, but closeOpenRetryGroup (read-batch.adapter.ts:162) resets the whole
  failedReads set, so a second batch whose retries come due later retries as one GET per read.
  Thirteen reads in two batches failing 50 ms apart sent 3 lone GETs under a real QueryClient with
  retry 1. The cap of 2 in flight still holds. Fix is one line plus a test. B10, B11 and the abort
  listener are fixed; the B12 and bypass dismissals hold. Gates: oxlint type-aware and the whole
  repository, typecheck, 424 core tests at 100% coverage, 443 back-e2e tests, 35 rule tests and
  Stryker at 100.00 all pass.
artifacts:
  - docs/features/pragma/open-in-two-calls/validation/technical-validation-2026-11-05-0805.md
---

## Detail

See the report. This was the last round. The open blocking finding goes to the operator with the report, or the orchestrator fixes it without a third validation round.
