---
status: done
summary: |
  Fix round 2 is done. A01/D03 is fixed and proven by tests that fail on the old code
  (measured). Each failed batch's reads now retry as one batch however batches fail
  apart. Under a real QueryClient with retry 1 and a fetch answering 503 with each
  request 50 ms after the last, 13 reads sent 4 POSTs and 1 lone GET before the fix
  and 4 POSTs after. 23 reads, three overlapping failed batches, sent 6 POSTs and 1
  lone GET before and 6 POSTs after. The transport now counts failed callers per read
  and takes one count each time a retry joins a group. It no longer clears every
  failed read when a retry group closes. Gates pass on the touched files. oxlint
  type-aware, oxfmt, typecheck, 89 core tests at 100% coverage, and Stryker at 100%
  on read-batch.adapter.ts and read-batch.core.ts (266 killed, 1 timeout, 0 survived).
artifacts:
  - apps/pragma/site/src/lib/read-batch.core.ts
  - apps/pragma/site/src/lib/read-batch.core.test.ts
  - apps/pragma/site/src/lib/read-batch.adapter.ts
  - apps/pragma/site/src/lib/read-batch.adapter.test.ts
  - apps/pragma/site/src/lib/api.client.test.ts
next:
  kind: validate
---

# Fix round 2, A01 / D03

## Goal

Each failed batch's reads retry as one group however batches interleave (spec D16, spec.md:101). The smallest change is to stop the closing retry group from forgetting the failed reads of batches whose retries are not yet due.

Data shape: `FailedCallers = ReadonlyMap<readIdentity, number>`, the count of callers whose batch failed and whose retry has not yet joined a group.

## Cause

`closeOpenRetryGroup` set `failedReads = new Set()`. When batch A failed at t and batch B at t + 50 ms, A's retries closed their group at about t + 1000 ms and cleared B's identities. B's retries then joined ordinary groups one task apart (measured).

## Fix

- `read-batch.core.ts` gains `rememberFailedCallers` (adds each entry's caller count per identity) and `takeFailedCaller` (takes one count and says whether the read is a retry, deleting the identity at zero). Both are pure.
- `read-batch.adapter.ts` holds `failedCallers`, counts a failed batch through `rememberFailedCallers`, and routes a read through `takeFailedCaller` in `joinGroup`. `closeOpenRetryGroup` no longer touches it. `reset` still clears it.

The validator's suggested one-line fix (delete only the identities that joined the closing group) still fails when two failed batches share a read. A's retry group would delete the shared identity and B's retry of it would leave alone. Counting callers covers that case. The adapter test `gather the retries of a second failed batch on their own, though it shared a read with the first` pins it.

A caller that never retries (aborted, or `retry: false`) leaves its count behind. The next fresh read of that identity then waits for one timer turn in a retry group and consumes the count. That read still leaves batched (inferred from the code path, covered by `forget a failed read once its retry joined a group`).

## Probe, before and after (measured)

Real `QueryClient`, `retry: 1`, fake `setTimeout`, fetch answers 503 and request n answers n × 50 ms after it leaves.

| Reads | Batches failing apart | Before | After |
|---|---|---|---|
| 13 | 2 (10, 3) | 4 POST + `GET /api/songs/song-10` | 4 POST |
| 23 | 3 (10, 10, 3) | 6 POST + `GET /api/songs/song-10` | 6 POST |

The validator's probe used other answer timings and saw 3 lone GETs for 13 reads. Both probes show the same defect.

## Tests

- `api.client.test.ts`, `batches the API refused at different times, under retry: 1`, the two rows above. Both fail on the old adapter.
- `read-batch.adapter.test.ts`, the shared-read case above. It fails on the old adapter. The test `forget the failed reads once the retry group left` is renamed `forget a failed read once its retry joined a group`, because the old name pinned the over-wide clear.
- `read-batch.core.test.ts`, `the callers of failed batches`, counting across batches and taking one retry per caller.

## Gates (measured)

- `oxlint --type-aware` on the five files, exit 0.
- `oxfmt --check`, all files formatted.
- `pnpm --filter @borso-app/pragma run typecheck`, exit 0.
- Core tests for the three test files, 89 passed, 100% statements, branches, functions and lines on `read-batch.adapter.ts` and `read-batch.core.ts`.
- Stryker on `read-batch.adapter.ts` and `read-batch.core.ts`, 100% score, 266 killed, 1 timeout, 0 survived, 0 no coverage.
