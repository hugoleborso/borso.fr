---
date: 2026-11-05
introduced-at: implementation
detected-at: production
severity: medium
related-pr: none (the per-song preload predates pull requests, from d7be0d9ac on 2026-05-25, and moved into the query cache in #247)
fix-pr: none (the pull request of branch claude/wizardly-mendel-0nq8qs, not opened when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/read-batch.adapter.ts, apps/pragma/site/src/lib/read-batch.core.ts, apps/pragma/api/src/read-batch/read-batch.controller.ts, eslint-rules/no-request-fan-out-in-site.js]
time-to-detect: 17 days
tags: [pragma, lambda, concurrency, api-gateway, offline, tanstack-query, monitoring]
zone: apps/pragma/site/src/lib/queries/offline-reading.queries.ts
recurs: none (rate-limits-keyed-on-a-header-the-client-writes shares lambda and api-gateway, but its class is a forgeable rate-limit key, not a client burst against a concurrency cap)
---

# Forty requests at a ten seat function

> Status: shipped on branch claude/wizardly-mendel-0nq8qs. The operator
> chose options A and B, and A grew into a generic read batch
> (ADR 202611050445). A scheduled check reads production on 2026-11-12.

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

What the member saw is unknown. The rejected calls were mostly the offline
preload, which settles every promise and shows nothing (inferred from the
code). Any screen query or tap landing in the same minute got the same 5xx
(inferred). Sentry recorded nothing in that minute (measured, `search_errors`
from 17:45 to 17:55), because a throttled Lambda never runs and the site does
not report a failed API call.

## Causal chain

- 193 requests got a 5xx on 2026-11-04 at 17:48 UTC.
  - Why? Lambda refused them. `pragma-prod-api` reached 10 concurrent executions,
    its ceiling, every day from 2026-10-19 to 2026-11-04 (measured,
    `ConcurrentExecutions` maximum).
    - Why 10? `LambdaApi` reserves 10 for every API, as a cost guard
      (`infra/cdk/src/constructs/lambda-api.ts:29`,
      `DEFAULT_RESERVED_CONCURRENCY = 10`). Reserved concurrency is also the
      maximum.
  - Why more than 10 at once? Opening the app fired more than 40 requests in
    the same second (measured, 45 served plus 193 rejected in one minute).
    - Ten were the screen itself (`/api/me`, `/tasks`, `/streaks`, `/sessions`,
      `/members`, `/instruments`, `/improvements`, `/songs`,
      `/offline-manifest`, `/setlists/by-session/:id`), measured in the logs.
      Each landed on a cold instance (10 `INIT_START` lines in that minute,
      measured), and a call took 667 ms on average and 3,084 ms at most
      (measured, `Duration`). The screen alone filled the ten seats.
    - The rest was the offline preload, one `GET /api/songs/:id` per song
      in the manifest, all in parallel. 28 were served (measured). With
      `retry: 1` in `query-client.setup.ts`, every rejected call was sent
      twice (measured in the code, the count is inferred).
      - The faulty line, before #261:

        ```ts
        await Promise.allSettled([
          queryClient.query({ ...songsListQueryOptions(), staleTime: NEVER_STALE }),
          ...targets.songIds.map((songId) =>
            queryClient.query({ ...songQueryOptions(songId), staleTime: NEVER_STALE }),
          ),
          ...targets.sessionIds.map((sessionId) => loadNextSession(queryClient, sessionId)),
        ]);
        ```

## Root cause of occurrence

*Thought that a Lambda API absorbs a burst of parallel requests, since Lambda
scales with demand. Actually, the reserved concurrency of 10 is a hard
ceiling, and each cold instance holds its seat for its whole start and
request, so one client sending more than ten requests at once is refused
above ten.*

[AWS Lambda, configuring reserved concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html):
"Reserved concurrency acts as both a lower and upper bound - it reserves the
specified capacity exclusively for your function while also preventing it from
scaling beyond that limit."

## Detection failure causes

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
- **Monitoring:** no alarm watches `Throttles`. Sentry runs inside the Lambda,
  which never starts for a throttled call, and the site's preload swallows
  every failure. The first reader of the number was the 3S board, shipped on
  2026-11-05, 17 days after the first throttled day (measured, 2026-10-19).

## Countermeasure

Shipped by #261, deployed on 2026-11-05 at 01:22 UTC (measured, function
`LastModified`). The preload now reads song details from the one
`GET /api/songs` list and sends a per-song GET only for a song missing from
the list. Queries also stay fresh five minutes. This removes the largest
part of the burst.

The screen's own ten cold calls remain at the ceiling (inferred from the
17:48 logs). The scheduled check below tells whether that is enough.

Raising the reserved concurrency is not an option here. It is a cost guard,
and CLAUDE.md says to lower the water, not raise the boat.

## Eradication

**Type:** structural impossibility (level 1), with a DevX check (level 2)

**Shipped.** The operator chose A and B on 2026-11-05, and every route had to
meet the target. A became a generic read batch,
[ADR 202611050445](../adr/202611050445-pragma-reads-leave-in-one-batch-per-tick.md).
The site's Hono client sends every GET issued in one task as one
`POST /api/read-batch`, at most 10 reads, at most 2 requests in flight.
One client therefore holds at most 2 of the 10 seats, whatever a screen
asks for. B is `eslint-rules/no-request-fan-out-in-site.js`, which refuses
a request per item in `.map`, `.forEach` and the like, and a read inside a
loop, in every site. It protects the apps that have no batch.

**Measured after,** in `pnpm dev`: at most 2 requests in flight on all 29
routes, cold and warm, and 3 requests for a cold `/`
(docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-08.md).

**Proof it can fail:** a planted `Promise.allSettled(ids.map((id) =>
queryClient.query(...)))` in a pragma site file was refused by the pragma
lint, recorded in
docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-02.md
and implementation-06.md.

The options as they were proposed:

Options, each removing the class "one client sends more than the API's
ceiling at once":

| Option | Level | What the member sees | Cost |
| --- | --- | --- | --- |
| A. One `GET /api/offline-bundle` returning everything the preload needs, and a home endpoint returning the first screen's data in one call | 1 | the app opens with one or two calls, no 5xx | a new endpoint per bundle, and the query cache seeded from it, as #261 did for songs |
| B. An oxlint rule in `eslint-rules/` refusing `Promise.all` or `Promise.allSettled` over a `.map` that calls `queryClient.query` or the Hono client in `apps/*/site` | 2 | nothing changes until a fan-out is written, then the lint refuses it | one rule, its tests, and the bounded helper it points to |
| C. A CloudWatch alarm on `Throttles > 0` for every `LambdaApi`, in `infra/cdk` | 4 | nothing, the operator gets an email | one alarm per API, at 100% construct coverage |

My recommendation is B plus C. B stops the next fan-out at lint time. C
catches what B cannot see, such as the cold screen.

**Result check:** a scheduled task fires once on 2026-11-12 at 19:17 Paris
time, in a fresh session (`trig_01QYrGgWCXFZPYZy47qkL89S`). It reads
`Throttles`, `5xx` and `ConcurrentExecutions` for `pragma-prod-api` since
the #261 deploy, against the baseline of 738 throttles a week. It names the
paths of any remaining burst from the logs, and asks which option to ship.

**Similar instances:**
`grep -rn -E "Promise\.(all|allSettled)\(" apps/*/site/src --include=*.ts --include=*.tsx | grep -v "\.test\."`
found 9 lines. Five reach the API:

- `apps/pragma/site/src/lib/queries/offline-reading.queries.ts:33` and `:37`,
  one call per setlist of the next session, so unbounded.
- `apps/pragma/site/src/lib/queries/offline-reading.queries.ts:49`, the
  preload itself, now bounded for songs by #261.
- `apps/pragma/site/src/lib/queries/voting.queries.ts:114` and `:134`, two
  invalidations, each refetching every active query under its key (bounded
  by what the screen shows, inferred).

The other four delete caches or load a PDF worker, with no request.
