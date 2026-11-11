---
date: 2026-11-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#278'
fix-pr: none (the kaizen pull request for #278, not opened when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/read-batch.adapter.ts, apps/pragma/site/src/lib/read-batch.core.ts, apps/pragma/site/src/lib/query-client.setup.ts]
time-to-detect: hours
tags: [pragma, tanstack-query, offline, testing]
zone: apps/pragma/site/src/lib/read-batch.adapter.ts
recurs: none (forty-requests-at-a-ten-seat-function shares pragma and tanstack-query, but its class is a client burst against a concurrency cap; this one is a retry owned by two layers)
---

# Three fixes reassembled what each query split

## User impact

No member saw it. PR #278 caught it in review three times before the merge.
Had it shipped, a batch refused under throttling would have come back as
one request per read, the burst the read batch exists to remove.

| | Seen | Expected |
| --- | --- | --- |
| Round 1, five reads in one refused batch, `retry: 1` | `POST /api/read-batch` then five `GET`s (measured by the validator, A22) | two `POST`s |
| Round 2, thirteen reads, the two batches refused 50 ms apart | three `POST`s then three `GET`s (measured, A01) | four `POST`s |
| Visual validation, cold open with `/api/**` aborted | the retry left as `GET /api/sessions`, a batch of 5 and `GET /api/streaks` within 3 ms (measured, row 38) | one batch |

## Causal chain

- A failed batch's reads came back as separate requests.
  - Each read's query retried on its own timer, so the retries reached the
    transport in separate tasks, and the transport closes a group at the end
    of a task.
    - The transport answered the failure to every caller, and TanStack's
      `retry: 1` in `query-client.setup.ts` scheduled one `sleep(delay)` per
      query.
      - Each fix taught the transport to recognise and regroup retries it
        had itself split: a remembered set of failed reads (47a357db1), then
        one per failed batch (9fd6c0d41), then a 100 ms wait for stragglers
        (7cde5696c). Each passed its own tests and 100% Stryker, and each
        failed the next gate.

The line that split the group, before this entry:

```ts
queries: { staleTime: DEFAULT_STALE_TIME_MS, gcTime: PERSISTED_CACHE_MAX_AGE_MS, retry: 1 },
```

## Root cause of occurrence

*Thought the retries of reads that failed together come back together,
actually each query owns its retryer and sleeps on its own timer, so the
retries arrive one task at a time and the transport cannot know how many
more are coming.*

`@tanstack/query-core` 5.102.8, `src/retryer.ts`, read this session:

```ts
const retryDelay = config.retryDelay ?? defaultRetryDelay
...
// Delay
sleep(delay)
```

## Detection failure causes

- **Plan:** the retry row (D13) rested on that belief, and the prototype the
  plan asked for was never run (`fix-3` in the friction log).
- **Unit tests:** the adapter tests close a group by hand through the
  injected `closeGroup`, so no test ran TanStack's retry until the validator
  wrote one.
- **The fix loop:** three fixes rested on one premise, that the transport can
  reassemble the retries. CLAUDE.md says to test the premise after two such
  failures. Nobody wrote it down, so the third fix added a timer.

## Countermeasure

The three fixes on the branch. The last held on the measured routes, at the
cost of a 100 ms wait and about sixty lines of bookkeeping.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit that adds this file.

The retry moved into the transport, the one place that knows which reads
failed together. A request refused with `429` or a `5xx`, or dropped by the
network, puts its reads back in the queue together after one second,
TanStack's own first delay. Each caller is retried once. Queries keep
`retry: 0`, so nothing else retries. The regrouping is gone. That was
`RetryGathering`, `waitForStragglers`, `rememberFailedCallers` and
`takeFailedCaller`, 59 lines net across twelve files.

```diff
-    queries: { staleTime: DEFAULT_STALE_TIME_MS, gcTime: PERSISTED_CACHE_MAX_AGE_MS, retry: 1 },
+    queries: { staleTime: DEFAULT_STALE_TIME_MS, gcTime: PERSISTED_CACHE_MAX_AGE_MS, retry: 0 },
```

```ts
function retryOnce(retries: readonly WaitingRead<Caller>[]): void {
  if (retries.length === 0) return;
  const startedIn = lane;
  waitBeforeRetry(() => {
    if (startedIn !== lane) return;
    waiting = mergeIdenticalReads(waiting, retries);
    drain();
  });
}
```

Three behaviours changed, and each is held by a test. A `4xx` is no longer
retried, since a second try cannot change it. A read that answered a `5xx`
inside an answered batch is retried alone, and the rest are answered at once.
A failed request is reported once per try, as before.

**Library considered:** none fits better. TanStack has no batch-level retry,
and DataLoader batches by tick but has no retry of its own (inferred, its README was not read this session).

**Proof it can fail:** `retry: 1` planted back in `query-client.setup.ts`,
then `vitest run --project core site/src`:

```
× reports a failed read once, after the app client has spent its retry
AssertionError: expected [ …(4) ] to have a length of 2 but got 4
Tests  1 failed | 2399 passed (2400)
```

Reverted after. Stryker on the two changed modules scores 100 (277 killed,
1 timed out, 0 survived).

**Similar instances:** `grep -rn "retry" apps/*/site/src --include=*.ts
--include=*.tsx` finds no other site whose requests are grouped below the
query layer. The other apps send one request per query, so a per-query retry
is the right owner there. The batch itself is
[ADR 2026-11-05T0445](../adr/2026-11-05T0445-pragma-reads-leave-in-one-batch-per-tick.md),
shipped against
[`forty-requests-at-a-ten-seat-function.md`](./forty-requests-at-a-ten-seat-function.md).
