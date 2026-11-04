---
date: 2026-11-04
introduced-at: conception
detected-at: production
severity: high
related-pr: '#247'
fix-pr: none (the pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 4
eradication-paths: [apps/pragma/site/src/lib/queries/offline-reading.queries.ts, apps/pragma/site/src/lib/queries/offline-reading.queries.test.ts, apps/pragma/site/src/lib/query-client.setup.ts]
time-to-detect: months
tags: [pragma, lambda, tanstack-query, performance, concurrency]
zone: apps/pragma/site/src/lib/queries/offline-reading.queries.ts
recurs: none (the-offline-cache-that-answered-first-online is about stale data the offline cache served; this is about the load its filling puts on the API)
---

# Five musicians filled ten Lambdas

## User impact

pragma has at most five users. They waited seconds, sometimes most of a minute, for a screen or a save.

| | Seen (p95, browser, Sentry, 7 days to 2026-11-04) | Expected |
| --- | --- | --- |
| Open a setlist, `GET /api/setlists/:id` | 45.8 s | Under a second. A warm Lambda answers in 83 ms at p50 (CloudWatch `REPORT`, measured) |
| Save a task, `PUT /api/tasks/:id` | 36.0 s | Under a second |
| Load a song, `GET /api/songs/:id` | About 14 s for each of more than 20 songs | No request at all, because the list already holds the song |

On 2026-10-29, Lambda refused 402 of 1,027 invocations of `pragma-prod-api` (CloudWatch `Throttles` and `Invocations`, measured).

## Causal chain

- A musician waits 14 to 45 seconds for a screen.
  - Why? Their request is throttled or queued behind others, and TanStack Query retries it.
    - Why? `pragma-prod-api` runs 10 requests at a time, its reserved concurrency, and it reached 10 on every day of use from 2026-10-29 (CloudWatch `ConcurrentExecutions`, measured).
      - Why ten at once for five people? Each request in flight holds its own execution environment. A new environment costs 1.27 s of init plus 1.11 s for its first request. 689 of the 3,964 invocations since 2026-10-28 were cold (CloudWatch `REPORT`, measured).
        - Branch 1. Why so many requests at once? Filling the offline cache sends the song list, then one `GET` per song of the next session, all in parallel.
        - Branch 2. Why so many requests overall? Data goes stale after 30 s, and going back to the app after that refetches every query on screen. `GET /api/instruments` ran 230 times, `/api/me` 207 and `/api/members` 199, against 33 reads of the offline manifest (CloudWatch Logs since 2026-10-28, measured).

```ts
// apps/pragma/site/src/lib/queries/offline-reading.queries.ts, before
await Promise.allSettled([
  queryClient.query({ ...songsListQueryOptions(), staleTime: NEVER_STALE }),
  ...targets.songIds.map((songId) =>              // one request per song, all at once,
    queryClient.query({ ...songQueryOptions(songId), staleTime: NEVER_STALE }), // for rows the list above already carries
  ),
  ...targets.sessionIds.map((sessionId) => loadNextSession(queryClient, sessionId)),
]);
```

The fan-out is older than this file. `public/sw.js` ran it with `Promise.all(listManifestUrls(manifest).map(...))` at every worker install, so on every deploy, from commit `d7be0d9a` (2026-05-20). PR #247 moved it into TanStack Query unchanged.

## Root cause of occurrence

*Thought a burst of small parallel reads is cheap, because each one takes a hundred milliseconds. Actually each request in flight occupies a whole Lambda execution environment. N parallel reads need N environments, each new one starts cold, and the reserved concurrency throttles the rest.*

[AWS, Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html), read this session:

> For each concurrent request, Lambda provisions a separate instance of your execution environment. [...] During this entire process, this execution environment is busy and cannot process other requests.

The `GET /api/songs/:id` and `GET /api/songs` handlers select the same `PROJECTION` (`songs.repository.ts`, read this session). Every per-song request fetched a row the client already held.

## Detection failure causes

- **Tests:** `offline-reading.queries.test.ts` asserted the exact list of requested paths, and that list contained one path per song. The test held the fan-out as the intended behaviour.
- **Local:** `pnpm dev` serves the API from one Node process, which takes parallel requests without a concurrency cap. Nothing throttles locally (inferred from the dev setup).
- **Monitoring:** the Lambda `Throttles` metric has no alarm. Sentry raised its N+1 detector only once, as BORSOFR-7 on 2026-11-03.
- **Review:** PR #247 changed where the offline cache lives. It carried the request pattern over without questioning it.

## Countermeasure

- The offline load fetches the song list once and puts each listed song into its detail cache. It still fetches a song the list lacks, or one it cannot reach.
- Queries stay fresh for 5 minutes instead of 30 s. Going back to the app within 5 minutes refetches nothing. A change another member made shows up at most 5 minutes later, or at once after a reload.

Verified by the new test `takes the songs the catalogue list already carries instead of fetching each one`, and by the existing offline tests, which still pass.

Memory was measured and ruled out. `pragma-prod-api` used at most 304 MB of its 512 MB (CloudWatch `REPORT`, `@maxMemoryUsed`).

## Eradication

**Type:** detection (level 4)

**Reference:** commit on branch `claude/fervent-galileo-sqcfvh`, pull request to follow

```diff
-    ...targets.songIds.map((songId) =>
-      queryClient.query({ ...songQueryOptions(songId), staleTime: NEVER_STALE }),
-    ),
+    loadSongDetails(queryClient, targets.songIds), // one list request seeds every listed song
```

**Proof it can fail:** planted on a scratch copy by making `loadSongDetails` skip the seeding, then running `vitest run --project core site/src/lib/queries/offline-reading.queries.test.ts`:

```text
 FAIL  |core| site/src/lib/queries/offline-reading.queries.test.ts > loading what a member reads offline > takes the songs the catalogue list already carries instead of fetching each one
AssertionError: expected [ '/api/offline-manifest', …(6) ] to not include '/api/songs/song-held'
      Tests  1 failed | 7 passed (8)
```

This guards this path only. It is not eradicated. Any new `Promise.all` over a list of ids can fan out the same way, and no rule refuses it.

**Similar instances:** found with `grep -rn -A2 "Promise.all\(Settled\)\?(" apps/pragma/site/src | grep "\.map("` and `grep -rn useQueries apps/pragma/site/src`.

- `loadNextSession` reads the entries of each setlist of the next session. A session has one to three setlists, so it is left as is.
- `useEntriesOfSetlists` has the same shape and the same bound, so it is left as is.
- `recovery.adapter.ts` maps over browser caches and service workers, never the API.
