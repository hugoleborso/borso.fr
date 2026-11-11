# ADR-2026-11-05T0445: pragma's reads go out as one batch per tick

- **Status:** accepted
- **Ratified:** by the operator on 2026-11-05, in the session that ran `/tech-lead-orchestrator` on `open-in-two-calls` (spec D1)
- **Date:** 2026-11-05
- **Deciders:** Hugo
- **Tags:** open-in-two-calls, pragma, data-fetching, lambda, offline

## Context

`pragma-prod-api` has a reserved concurrency of 10, and reserved concurrency is also its ceiling (`infra/cdk/src/constructs/lambda-api.ts:29`, `DEFAULT_RESERVED_CONCURRENCY = 10`). On 2026-11-04 at 17:48 UTC one member opened pragma. The API served 45 requests and refused 193 in one minute (measured, see [the dantotsu](../dantotsus/forty-requests-at-a-ten-seat-function.md)). PR #261 removed the per-song preload, which was most of that burst. A cold open of `/` still sends 13 requests with 9 at once (inferred from the code, spec Gemba table). A warm open with a cache older than 5 minutes sends a second burst of about the same width. Returning to a hidden tab invalidates every query and sends a third (inferred). So one more read on any screen fills the ten seats. The ceiling is a cost guard, and CLAUDE.md "Lower the water" excludes raising it. The operator asked that every route meet the target, deep links included (spec D7), and that one failed read fail only its own caller (spec D9). The question is where the reads get folded so that one client never sends more than the API can hold.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A member opening pragma gets every read served, with no 5xx and no extra round trips | `Throttles` = 0 for `pragma-prod-api` over seven days, against 738 a week (dantotsu). Per-route request count and peak in flight, cold and warm, from resource timing against `pnpm dev` (spec Test strategy) |
| Holds on every route, deep links and future screens included | operator | high | The operator ratified every route as the target (spec D7). A fix that covers `/` alone leaves a deep link at the ceiling | The per-route bounds table in the spec, each route at a peak of 2 |
| Keeps the reserved concurrency of 10 | operator | high | It is the cost guard, and the operator excluded raising it (spec Q.O.D. out of scope) | `DEFAULT_RESERVED_CONCURRENCY` unchanged in `lambda-api.ts` |
| One failed read fails only its caller | operator | medium | The operator asked for per-read status (spec D9). One bad read must not blank the whole screen | Back e2e: a read without a cookie answers `401` while a public read in the same batch answers `200` |
| What a new screen or read must add to stay under the ceiling | author | medium | Every endpoint or seed function kept in step with the query modules is a place the burst returns when someone forgets it | Endpoints and seed functions counted in the spec's Files to change |

## Decision

**A generic read batch in the Hono client's fetch layer, answered by one Lambda.** The `fetch` option of `hc`, under `fetchWatchingSessionEnd`, groups every read issued in the same task. A group of two or more reads leaves as one `POST /api/read-batch`, and a group of one leaves as its own `GET` (D17). The API runs each read through `app.fetch` in parallel, with the outer request's headers, so every middleware and gate runs unchanged (D14). It answers `200` with one status, content type and body per read, in order (D9). A batch holds at most 10 reads, the default pool size of `postgres` 3.4.9, and a tab keeps at most 2 read requests in flight (D15). Both constants live in `domain/read-batch.core.ts`. Writes are never batched and skip the in-flight cap (D16). `/api/offline-manifest` is deleted, and the offline preload reads the lists and picks the next session with `selectNextSession`, as home does (D3). It wins because it is the only option that sits under every read, so a route, a deep link or a future screen needs nothing to stay under the ceiling, and the query modules do not change.

## Consequences

- `+` A cold open of `/` drops from 13 requests with a peak of 9 to 3 requests with a peak of at most 2 (target, inferred). Every other route is bounded at 4 cold and 1 warm (target, inferred).
- `+` A new screen, a deep link, a refetch after a live invalidation and a return to a hidden tab all group with no code of their own. The query modules do not change.
- `+` The offline preload and home pick the next session with the same rule. Today the manifest uses "strictly after now" and home uses the Paris calendar day (measured in `offline-manifest.core.ts`).
- `-` API Gateway's access log shows `POST /api/read-batch` for grouped reads instead of each path. Hono's logger still prints each read's path in the Lambda log (inferred from it running per `app.fetch`).
- `-` One slow read holds its whole batch. A cold Lambda opens up to 10 database connections for one batch, each signing a DSQL token. The batch's latency is unknown and is reported in the PR.
- `-` Dependent waves still cost one request each. The next session's setlists wait for the session, and their entries wait for the setlists.
- `-` New constraints on the code. A read must go through `api`. A GET route must answer text or JSON, since an answer body travels as text. A per-call header must be listed in `PRAGMA_REQUEST_HEADERS` to ride a batch.
- `~` This amends ADR-2026-11-01T1313. Offline reading stays in the persisted query cache, and only its manifest endpoint goes.
- `~` The 40 site test files that stub `fetch` keep their assertions, because `stubFetch` unwraps a batch into item `Request`s (measured count, spec Risks).
- `~` `talos`, `last-loop-lepin` and `banana-rush` get no batch. Rule B (`borso/no-request-fan-out-in-site`) still guards them and pragma against a fan-out over an unbounded list.

## Alternatives considered

### Option A, a generic read batch per tick (chosen)

- **Raised by:** author (spec D1 option c), ratified by the operator
- **Summary:** The transport described in *Decision*. Reads issued in the same task leave as one request, one Lambda answers them with per-read status, at most 10 per batch and 2 in flight per tab.
- **Strengths:**
  - Holds on every route, because it sits under every `$get` (spec D13, hono 4.13.7 calls `fetch` synchronously from `$get`, measured).
  - A new screen adds nothing to stay under the ceiling.
  - Per-read status keeps one failure local.
- **Costs:**
  - One new route, one transport adapter and its core, and one test helper change (spec Files to change).
  - Grouped reads lose their path in the API Gateway access log.
  - Batch latency on a cold Lambda, unknown.
- **Rationale:** It is the only option that meets all four operator criteria at once, and it adds the fewest pieces a future screen must keep in step.

### Option B, one opening read `GET /api/opening` (rejected)

- **Raised by:** author (spec D1 option a, and dantotsu option A)
- **Summary:** One endpoint returns the shell, home and offline copy, and seeds the query cache from it. Routes outside it keep their own calls.
- **Strengths:** `/` and the tabs open in one or two calls.
- **Costs:** Deep links stay at 2 to 4 calls on top of it. Every shell-wide read must be added to it, and live invalidation needs a seeding path.
- **Rejection rationale:** It loses on "Holds on every route". Deep links and every future screen burst again. No reweighting flips it while the operator holds D7.

### Option C, one read endpoint per screen (rejected)

- **Raised by:** author (spec D1 option b)
- **Summary:** Each screen gets one endpoint that returns all its data, with a seed function to fill the query cache.
- **Strengths:** Each screen opens in one call (inferred).
- **Costs:** About ten endpoints and seed functions to keep in step with the query modules. Every new screen must add one.
- **Rejection rationale:** It loses on "What a new screen or read must add". A screen that forgets its endpoint brings the burst back. It also fails a whole screen when one of its parts fails, unless each endpoint repeats per-part status.

### Option D, a client concurrency limit alone (rejected)

- **Raised by:** author (spec Architectural choices)
- **Summary:** The transport keeps at most 2 requests in flight, but every read still leaves as its own request.
- **Strengths:** One adapter, no new route. Each request keeps its own status and its path in the log.
- **Costs:** 13 requests and 13 Lambda invocations through 2 lanes on a cold open.
- **Rejection rationale:** It loses on "Does it change the app for its users". The open takes several round trips more (inferred). It meets the ceiling by making the member wait.

### Option E, raising the reserved concurrency (rejected)

- **Raised by:** author (dantotsu, Countermeasure)
- **Summary:** Set `reservedConcurrency` above 10 for `pragma-prod-api`.
- **Strengths:** One number. No client change.
- **Costs:** Removes the cost guard. Hides the burst until a wider one sinks the next change.
- **Rejection rationale:** It loses on "Keeps the reserved concurrency of 10". CLAUDE.md "Lower the water" excludes it, and the operator kept it out of scope.

### Option F, change nothing beyond PR #261 (rejected)

- **Raised by:** author (standard, the option of not doing the thing)
- **Summary:** Keep the code as #261 left it and read the scheduled check on 2026-11-12.
- **Strengths:** No code, no new route. The largest part of the burst is already gone.
- **Costs:** A cold open still sends 13 requests with a peak of 9 (inferred). A warm open past 5 minutes and a hidden-tab return each send a burst of about the same width. One more read on any screen fills the ten seats.
- **Rejection rationale:** It loses on "Does it change the app for its users" and "Holds on every route". The members keep living one read away from a 5xx.

## Scores

| | A. Read batch | B. Opening read | C. Per screen | D. Limit alone | E. Raise ceiling | F. Nothing |
|---|---|---|---|---|---|---|
| Does it change the app for its users | ✓ `/` in 3 requests, peak 2 (inferred) | ✓ `/` in 1 or 2 calls | ✓ one call per screen (inferred) | ✗ 13 requests through 2 lanes | ✓ the burst is served (inferred) | ✗ 13 requests, peak 9 |
| Holds on every route | ✓ under every `$get` | ✗ deep links add 2 to 4 | ✗ only screens that have one | ✓ under every request | ✓ until a wider burst | ✗ one more read fills the seats |
| Keeps the reserved concurrency of 10 | ✓ unchanged | ✓ unchanged | ✓ unchanged | ✓ unchanged | ✗ raised | ✓ unchanged |
| One failed read fails only its caller | ✓ per-read status | ✗ one read for the shell | ✗ one read per screen | ✓ one request per read | ✓ one request per read | ✓ one request per read |
| What a new screen must add | ✓ nothing | ✗ its reads into the opening read | ✗ an endpoint and a seed | ✓ nothing | ✓ nothing | ✓ nothing |

## Implementation pointers

- Spec: docs/features/pragma/open-in-two-calls/spec/spec.md, Questions, Options and Decisions D1, D3, D9, D13 to D17, and Architectural choices
- Plan: docs/features/pragma/open-in-two-calls/plan/plan.md, not yet written
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/domain/read-batch.core.ts`, `apps/pragma/site/src/lib/read-batch.adapter.ts`, `apps/pragma/site/src/lib/api.client.ts:52` (`fetchWatchingSessionEnd`), `apps/pragma/api/src/read-batch/read-batch.controller.ts`, `apps/pragma/api/src/app.ts` (`createApp`), `infra/cdk/src/constructs/lambda-api.ts:29`
- Root cause: docs/dantotsus/forty-requests-at-a-ten-seat-function.md
- Related ADRs: amends [ADR-2026-11-01T1313](./2026-11-01T1313-pragma-offline-reads-through-the-query-cache.md) (its offline manifest is deleted), builds on [ADR-2026-11-04T0227](./2026-11-04T0227-pragma-pushes-stale-scopes-over-the-websocket-channel.md) (its `all` invalidation now refetches as one batch)
