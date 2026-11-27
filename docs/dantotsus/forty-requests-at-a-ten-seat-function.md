---
date: 2026-11-05
introduced-at: implementation
detected-at: production
severity: high
related-pr: none (the per-song preload predates pull requests, from d7be0d9ac on 2026-05-20, and moved into the query cache in #247)
fix-commits: [06abedfd9, self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/queries/offline-reading.queries.test.ts, apps/pragma/site/src/lib/read-batch.adapter.ts, apps/pragma/site/src/lib/read-batch.core.ts, apps/pragma/api/src/read-batch/read-batch.controller.ts, eslint-rules/no-request-fan-out-in-site.js]
time-to-detect: 17 days
tags: [pragma, lambda, concurrency, api-gateway, offline, tanstack-query, monitoring]
zone: apps/pragma/site/src/lib/queries/offline-reading.queries.ts
recurs: none (rate-limits-keyed-on-a-header-the-client-writes shares lambda and api-gateway, but its class is a forgeable rate-limit key, not a client burst against a concurrency cap)
---

# Forty requests at a ten seat function

## User impact

The 3S board showed 767 API 5xx for pragma in production over the seven days
before 2026-11-05, and 738 Lambda throttles over the same days (measured on the
board, 2026-11-05). pragma serves about 300 to 1,500 invocations a day
(measured, CloudWatch `Invocations`), so this was not load.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-04 at 17:48 UTC, one member opens pragma and files two improvements | 193 requests rejected in one minute, 45 served (measured, `Throttles` per minute and Lambda logs) | every request served |
| 2026-10-29, four app opens | 96, 100, 96 and 105 rejected in four separate minutes (measured) | 0 |
| A whole day, 2026-11-04 | 193 of 507 calls rejected, 38% (measured, `Throttles` / (`Invocations` + `Throttles`)) | 0 |
| A whole day, 2026-10-29 | 402 of 1,027 invocations refused (measured, CloudWatch `Throttles` and `Invocations`) | 0 |
| Open a setlist, `GET /api/setlists/:id`, p95 over the 7 days to 2026-11-04 | 45.8 s (measured, Sentry browser spans) | Under a second. A warm Lambda answers in 83 ms at p50 (measured, CloudWatch `REPORT`) |
| Save a task, `PUT /api/tasks/:id`, same window | 36.0 s (measured, Sentry) | Under a second |
| Load a song, `GET /api/songs/:id`, same window | About 14 s for each of more than 20 songs (measured, Sentry) | No request at all, because the list already holds the song |

pragma has at most five users. A rejected call was mostly the offline
preload, which settles every promise and shows nothing (inferred from the
code). Any screen query or tap landing in the same minute got the same 5xx
(inferred). Sentry recorded nothing in that minute (measured, `search_errors`
from 17:45 to 17:55), because a throttled Lambda never runs and the site does
not report a failed API call.

## Causal chain

- 193 requests got a 5xx on 2026-11-04 at 17:48 UTC.
  - Lambda refused them. `pragma-prod-api` reached 10 concurrent executions, its ceiling, every day from 2026-10-19 to 2026-11-04 (measured, `ConcurrentExecutions` maximum).
    - `LambdaApi` reserves 10 for every API, as a cost guard (`infra/cdk/src/constructs/lambda-api.ts`, `DEFAULT_RESERVED_CONCURRENCY = 10`). Reserved concurrency is also the maximum.
    - Each request in flight holds a whole execution environment, and a new one costs 1.27 s of init plus 1.11 s for its first request. 689 of the 3,964 invocations from 2026-10-28 to 2026-11-04 were cold (measured, CloudWatch `REPORT`).
  - Opening the app fired more than 40 requests in the same second (measured, 45 served plus 193 rejected in one minute).
    - Ten were the screen itself (`/api/me`, `/tasks`, `/streaks`, `/sessions`, `/members`, `/instruments`, `/improvements`, `/songs`, `/offline-manifest`, `/setlists/by-session/:id`), measured in the logs. Each landed on a cold instance (10 `INIT_START` lines in that minute, measured), and a call took 667 ms on average and 3,084 ms at most (measured, `Duration`). The screen alone filled the ten seats.
    - The rest was the offline preload, one `GET /api/songs/:id` per song in the manifest, all in parallel. 28 were served (measured). With `retry: 1` in `query-client.setup.ts` then, every rejected call was sent twice (measured in the code, the count is inferred).
      - The faulty line, from commit `e4c428591` (PR #247, 2026-11-03), which fetched each song again although the list request beside it returns the same `PROJECTION`:

        ```ts
        await Promise.allSettled([
          queryClient.query({ ...songsListQueryOptions(), staleTime: NEVER_STALE }),
          ...targets.songIds.map((songId) =>
            queryClient.query({ ...songQueryOptions(songId), staleTime: NEVER_STALE }),
          ),
          ...targets.sessionIds.map((sessionId) => loadNextSession(queryClient, sessionId)),
        ]);
        ```

        - PR #247 moved offline reading from the service worker into the TanStack query cache, and ported the worker's load unchanged. Commit `d7be0d9ac` (2026-05-20) had built that load in `public/sw.js` as `Promise.all(urls.map(...))`, one `fetch` per manifest URL, then `dataCache.put(url, …)`. The Cache API stores a response by URL, so one request per song was the only way to make each song's screen readable offline there.
  - Branch for the volume. Data went stale after 30 s, and going back to the app after that refetched every query on screen. `GET /api/instruments` ran 230 times, `/api/me` 207 and `/api/members` 199, against 33 reads of the offline manifest (measured, CloudWatch Logs from 2026-10-28 to 2026-11-04).
    - `query-client.setup.ts` set a 30 s `staleTime` for every query, a value set while staleness was the only way a member saw another's change. The WebSocket refresh arrived only in PR #261.

## Root cause of occurrence

*Thought each song's detail entry in the query cache needs its own request, as the worker's URL-keyed cache did, actually the query cache is keyed by query and can be seeded from the song list fetched in the same call.* (Machine)

The `GET /api/songs/:id` and `GET /api/songs` handlers select the same `PROJECTION` (`songs.repository.ts`), so every per-song request fetched a row the client already held. The agent of PR #247 ported code whose shape the Cache API had forced (`d7be0d9ac`, read this session). Its goal was stale data, not load. The redundant requests then met a hard ceiling. [AWS Lambda, configuring reserved concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html): "Reserved concurrency acts as both a lower and upper bound - it reserves the specified capacity exclusively for your function while also preventing it from scaling beyond that limit."

## Detection failure causes

- **Tests:** `offline-reading.queries.test.ts` asserted the exact list of requested paths, and that list held one path per song. The test held the fan-out as the intended behaviour.
- **Typing and linter:** nothing describes the server's capacity, so a
  `Promise.allSettled` over one request per item is valid code with no rule
  against it.
- **Local:** `pnpm dev` runs the API as one Node process with no concurrency
  ceiling, so the burst cannot fail there.
- **CI and e2e:** the e2e suite runs against a preview whose API has the same
  ceiling, but a preview database holds a few seeded songs, so the burst stays
  under ten.
- **Review:** the preload was reviewed as a cache-warming loop. Nothing on the
  page showed the server's limit to the reviewer.
- **Monitoring:** no alarm watches `Throttles`. Sentry's N+1 detector fired once, as BORSOFR-7 on 2026-11-03. Sentry runs inside the Lambda,
  which never starts for a throttled call, and the site's preload swallows
  every failure. The first reader of the number was the 3S board, shipped on
  2026-11-05, 17 days after the first throttled day (measured, 2026-10-19).

## Countermeasure

Shipped by commit `06abedfd9` (#261), deployed on 2026-11-05 at 01:22 UTC (measured, function
`LastModified`). The preload now reads song details from the one
`GET /api/songs` list and sends a per-song GET only for a song missing from
the list. Queries stay fresh five minutes instead of 30 s. A change another
member made reaches open tabs over the WebSocket channel of ADR-2026-11-04T0227,
which invalidates exactly the queries reading it.

Verified by the test `takes the songs the catalogue list already carries instead of fetching each one`. Planted on a scratch copy by making `loadSongDetails` skip the seeding, it failed:

```text
 FAIL  |core| site/src/lib/queries/offline-reading.queries.test.ts > loading what a member reads offline > takes the songs the catalogue list already carries instead of fetching each one
AssertionError: expected [ '/api/offline-manifest', …(6) ] to not include '/api/songs/song-held'
```

The screen's own ten cold calls stayed at the ceiling (inferred from the
17:48 logs), which is why the read batch below followed.

Memory was measured and ruled out. `pragma-prod-api` used at most 304 MB of its 512 MB (measured, CloudWatch `REPORT`, `@maxMemoryUsed`).

Raising the reserved concurrency is not an option here. It is a cost guard,
and CLAUDE.md says to lower the water, not raise the boat.

## Eradication

**Type:** structural impossibility (level 1) for pragma, with a DevX check (level 2) for every site

**Reference:** the commit adding this file, `e55214d69` (PR #278), which shipped the read batch.

The operator chose options A and B on 2026-11-05. A became a generic read batch, [ADR 2026-11-05T0445](../adr/2026-11-05T0445-pragma-reads-leave-in-one-batch-per-tick.md). pragma's Hono client sends every GET issued in one task as one `POST /api/read-batch` (`apps/pragma/site/src/lib/read-batch.adapter.ts`, `apps/pragma/api/src/read-batch/read-batch.controller.ts`), at most 10 reads and at most 2 requests in flight. One client therefore holds at most 2 of the 10 seats, whatever a screen asks for. B is `eslint-rules/no-request-fan-out-in-site.js`, which refuses a request per item in `.map`, `.forEach` and the like, and a read inside a loop, in every site.

**Measured after:** in `pnpm dev`, at most 2 requests in flight on all 29 routes, cold and warm, and 3 requests for a cold `/` (docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-08.md). In production, `pragma-prod-api` recorded 0 throttles in the three weeks from 2026-11-06 to 2026-11-27, while `ConcurrentExecutions` still reached 10 at its maximum (measured, CloudWatch, 2026-11-27).

**Proof it can fail:** a planted `Promise.allSettled(ids.map((id) => queryClient.query(...)))` in a pragma site file was refused by the pragma lint, recorded in docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-02.md and implementation-06.md.

The other apps have the lint rule but no batch, so a screen with more than ten parallel reads can still fill their ten seats. Option C, an alarm on throttles, was proposed and not shipped. `lambda-api.ts` alarms on `metricErrors()` only, and a throttled invocation is not an error.

**Proposed:** add a `Throttles > 0` alarm beside the `Errors` alarm in `infra/cdk/src/constructs/lambda-api.ts`. Every API would then tell the operator the first minute a client burst meets the ceiling, instead of leaving it to the 3S board 17 days later.

**Similar instances:** `grep -rn -E "Promise\.(all|allSettled)\(" apps/*/site/src --include=*.ts --include=*.tsx | grep -v "\.test\."` finds 14 lines on 2026-11-27. The ones that reach an API are in pragma (`offline-reading.queries.ts`, `voting.queries.ts`), which the read batch carries, and two fixed reads in `apps/borsouvertures/site/src/review/sync.setup.ts`. The rest delete caches, unregister workers or load a PDF worker.
