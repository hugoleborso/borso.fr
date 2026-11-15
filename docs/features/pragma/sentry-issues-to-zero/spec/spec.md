# Pragma's open Sentry issues go to zero

The operator set the ceiling of `sentry-issues-open` to 0 on 2026-11-14. Pragma had two open issues on the 3S board that day. This spec covers both and the ceiling.

## Who it is for

The band using pragma, and the operator reading the 3S board. A member sees no change on screen. The operator sees an open issue only when something is broken.

## Behaviours

1. **A schema change on the cluster does not fail a read (BORSOFR-N).** On 2026-11-14 at 21:21:23 UTC, `GET /api/realtime/ticket` and `GET /api/sessions` answered 500. Their `app_config` read lost three immediate attempts to DSQL `OC001` within 61 ms. The same container answered both reads 1.24 s later (measured in `pragma-prod-api` logs). A statement or transaction that loses to a conflict abort (`OC000`, `OC001`, `40001`) is now tried up to 5 times. It waits 100, 200, 400 then 800 ms between attempts, 1.5 s in all, which covers the measured 1.24 s. Any other failure is not retried. The pure core takes the wait as an argument, and the DB client passes a `setTimeout` wait.
2. **A dropped read batch that its retry recovers reports nothing (BORSOFR-Q).** On 2026-11-14 at 11:20:13 UTC a batch of 10 reads failed with no HTTP status. It never reached the API, and its retry 3 s later answered every read with 200 (measured). The site sends `read-batch-failed` to Sentry for a network drop only when a read in the batch is already on its retry, so the reads are about to be rejected to their callers. A batch the API refuses (any status) and an answer that is not valid JSON or has the wrong count still report on the first failure, as before.
3. **Open Sentry issues count against a ceiling of 0.** `docs/quality/targets.md` has one `sentry-issues-open` row at 0 for each app that reports to Sentry: pragma, last-loop-lepin, banana-rush, talos, borso-fr and borsouvertures. The quality-dashboard skill no longer calls the indicator unscored.

## Out of scope

- talos's 13 open issues, which are in another app.
- Moving previews off the shared DSQL cluster. That is an architecture decision for the operator.
- Resolving the two issues in Sentry. The commits carry `Fixes BORSOFR-N` and `Fixes BORSOFR-Q`, so the merge resolves them.
