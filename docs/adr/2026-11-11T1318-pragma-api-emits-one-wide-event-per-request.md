# ADR-2026-11-11T1318: the pragma API emits one wide event per request, to stdout and onto its Sentry span

- **Status:** proposed
- **Date:** 2026-11-11
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, observability

## Context

The pragma API logs the way loggingsucks.com describes as the failure mode. Each request writes one free-text line from `hono/logger`. A dozen `console.warn` and `console.error` calls sit in services and adapters, in three formats. Some are plain strings, some are `JSON.stringify` objects, and some pass an error object as a second argument. Examples are `notifications.service.ts`, `spotify.adapter.ts`, `takes.service.ts`, `calendar-feeds.service.ts`, `token.service.ts`, `realtime.service.ts`, `parameter-store.client.ts` and `mcp-server.adapter.ts`, all read on 2026-11-11. None of these lines carries the route, the member or the outcome of the request it belongs to. Answering "why did this member's request fail" means a string search across lines that share no key.

Sentry (ADR-0031) already wraps each request in one `http.server` span. That span carries only the route, the method and the status.

Since ADR-2026-11-05T0445, most reads reach the Lambda inside one `POST /api/read-batch`. That ADR records that "grouped reads lose their path in the API Gateway log". Today nothing logs which reads a batch held.

Four constraints close doors before the trade-off:

- Volume is small. Measured over 2026-10-11 to 2026-11-11, CloudWatch received 5,355,309 bytes into `/aws/lambda/pragma-prod-api`. Sentry counted 1,459 prod `http.server` spans over the 7 days before 2026-11-11. ADR-0031 counted fewer than 9,000 API requests a month.
- A dependency is an ADR decision (CLAUDE.md), so a logging library has to earn its place.
- ADR-0031 switched off every Sentry personal data category. A member identifier is a choice this record has to make on purpose.
- The scheduled streak reminder and the WebSocket Lambda run outside any HTTP request.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| One event answers "what happened to this request" | operator | high | The point of the change, per loggingsucks.com. | One query by `member.id` or `http.route` returns the full story of a request without a join. |
| Queryable with high cardinality | author | high | Debugging filters by member, route, song or session. | Sentry Explore and CloudWatch Logs Insights both filter on the field. |
| Survives a missing or saturated Sentry | author | medium | Sentry starts only with a DSN on `preview`, `integ` and `prod`. The free plan has a quota. Local dev has neither. | The event still appears in `pnpm dev` output and in CloudWatch. |
| Cost at this volume | operator | medium | One-person project, free plans. | Price list lookups and the measured volume above. |
| No new dependency | author | low | A dependency is an ADR on its own. | `package.json` diff. |

## Decision

**One wide event per request, built by a Hono middleware and emitted once, to both stdout and the Sentry request span.** A middleware opens the event at the start of each request and stores it in `AsyncLocalStorage` (`node:async_hooks`). Any service or adapter on the request's async path adds fields with `addWideEventFields`, with no Hono context threaded through. When the request ends, the middleware adds the route, the status, the duration and the failure, if any. It then emits the event once. The event is written as one JSON line to stdout, which CloudWatch keeps, and set as attributes on the active Sentry `http.server` span. `hono/logger` and every `console.*` call in `apps/pragma/api/src` go, except the two lines `main.dev.ts` prints when the local server starts. Lint enforces that with `no-console` set to `error`, with no allowed methods, on that tree, and the existing override keeps `main.dev.ts` free. The operator picked this option, C, on 2026-11-11. Every event is kept. There is no sampling.

The event is a flat record of dotted keys. Its values are strings, numbers, booleans or string arrays, because Sentry span attributes accept only those.

| Field | Source |
|---|---|
| `service.name`, `service.stage`, `service.version` | `pragma-api`, `STAGE`, `SENTRY_RELEASE` |
| `request.id`, `request.parent_id` | A UUID per request. For a read inside `/api/read-batch`, the parent is the batch's id. |
| `lambda.request_id`, `lambda.cold_start` | The Lambda context, and a module-level flag |
| `trace.id` | The Sentry trace id, when Sentry runs |
| `http.request.method`, `http.route`, `http.response.status_code`, `duration_ms` | The middleware |
| `outcome` | `success` below 400, `refused` from 400 to 499, `failed` from 500 |
| `member.id` | The session gate and the MCP bearer check |
| `error.type`, `error.message`, `error.stack` | The error that became a 500 |
| `product.events` | The names passed to `recordProductEvent` during the request |
| `<slice>.<fact>` | Business context each slice adds, for example `spotify.failure`, `push.failed_hosts`, `calendar_feed.failures`, `free_slots.duration_ms`, `mcp.tools` |

The scheduled streak reminder and the WebSocket handler run inside the same scope, with `event.kind` set to `scheduled` or `socket` instead of `http`. Every request writes exactly one line. Work that outlives its budget is recorded as the state known at the cutoff, for example `realtime.broadcast_outcome: late` or the push timeout fields, and what it does afterwards is not recorded. A field added after the event was emitted, or outside any scope, is dropped. The operator chose this on 2026-11-11 over waiting for every piece of work before emitting, because behind API Gateway the response leaves only when the handler ends, so waiting would hold the response until the slowest piece of work finished, up to the 30 s gateway timeout.

`member.id` is the `member` table's UUID. A read of the production schema on 2026-11-11 confirmed that every one of its 5 rows resolves to a first name. The event carries the identifier only. Names, emails and phone numbers stay out of it.

## Consequences

- `+` One query answers a request's story. In Sentry Explore, filter `http.server` spans by `member.id` or `outcome:failed`. In CloudWatch Logs Insights, run `filter member.id = "…"`, which parses the JSON line.
- `+` Each read inside a batch becomes its own event, with `request.parent_id` pointing at the batch. That restores the path ADR-2026-11-05T0445 recorded as lost.
- `+` No new dependency. `AsyncLocalStorage` ships with Node 22, and Sentry already uses it for its own scopes.
- `+` Cost is unchanged in practice. The API stays at one span per request on Sentry. Attributes are not billed separately, per the [Developer plan](https://sentry.io/pricing/) (5M spans, 30-day lookback). CloudWatch Logs in eu-west-3 costs $0.5985 per GB ingested and $0.0059 per GB scanned by Logs Insights, per the AWS price list API on 2026-11-11. At 5.4 MB a month today, even several times more bytes stays under one cent. The new size per event was not measured.
- `-` Sentry now holds a member identifier on every API span, where ADR-0031 had sent none. It is pseudonymous, and only someone who can read the database can resolve it.
- `-` Each event is written twice. A schema change to the event shows up in two places, and Logs Insights and Sentry keep different retentions, one week and 30 days.
- `-` The final result of work that outlives its budget is lost. A realtime broadcast that fails after its 1.5 s budget reads `late`, never `failed`, and push sends still running at their deadline report nothing more.
- `~` `recordProductEvent` keeps writing its own line, because the specs that define those events read them by name. Inside a request, it also appends the name to `product.events`.
- `~` `free_slots_computed` stops being its own `console.info` line. It becomes `free_slots.*` fields on the `GET /api/free-slots` event. The practice-free-slots spec's p90 watch now reads `free_slots.duration_ms`.
- `~` last-loop-lepin, banana-rush and talos follow the same shape, each with its own copy, because apps do not import each other. They write to stdout only, because none of them records a Sentry request span (last-loop-lepin sets `tracesSampleRate: 0`, banana-rush and talos set none). They carry no identity field, because the lepin admin session id is a bearer credential, talos has one owner and banana-rush players are anonymous. The `no-console` ban covers every `apps/*/api/src` tree.

## Alternatives considered

### Option C: one event, stdout and Sentry span (chosen)

- **Raised by:** author, picked by the operator
- **Summary:** As in *Decision*.
- **Strengths:**
  - Queryable in Sentry with a 30-day lookback.
  - Still present in local dev, before a DSN exists, and if Sentry drops data.
- **Costs:** The event is written twice, and the member id reaches Sentry.
- **Rationale:** The only option that meets every high and medium criterion.

### Option A: attributes on the Sentry span only (rejected)

- **Raised by:** author
- **Summary:** Set the event as span attributes and write nothing to stdout.
- **Strengths:** One sink, and the 30-day lookback.
- **Costs:** Nothing is visible in `pnpm dev` or on a stage without a DSN. What happens to spans beyond the free plan's quota was not verified (ADR-0031).
- **Rejection rationale:** It fails the criterion about surviving a missing or saturated Sentry. It would flip if Sentry ran in every environment, local dev included.

### Option B: one JSON line on stdout only (rejected)

- **Raised by:** author
- **Summary:** Write the event to CloudWatch and leave the Sentry span as it is.
- **Strengths:** One sink, no personal identifier reaches a third party, and the data stays in eu-west-3.
- **Costs:** One week of retention. No link from a Sentry error or trace to the request's context.
- **Rejection rationale:** It loses on queryability next to the trace that the operator already reads in Sentry.

### Option D: a logging library such as pino (rejected)

- **Raised by:** author
- **Summary:** Replace `console.*` with a structured logger and child loggers per request.
- **Strengths:** Levels, serializers and redaction come for free.
- **Costs:** A new dependency, and still one line per log call instead of one event per request.
- **Rejection rationale:** It structures the diary loggingsucks.com argues against rather than replacing it, and it adds a dependency for what `JSON.stringify` and `AsyncLocalStorage` already do.

## Scores

|  | C: stdout and span | A: span only | B: stdout only | D: pino |
|---|---|---|---|---|
| One event per request | ✓ | ✓ | ✓ | ✗ a line per call |
| High-cardinality queries | ✓ Sentry Explore and Insights | ✓ Sentry Explore | ~ Insights only, one week | ~ Insights only |
| Survives a missing Sentry | ✓ stdout | ✗ | ✓ | ✓ |
| Cost | ✓ under one cent a month | ✓ | ✓ | ✓ |
| No new dependency | ✓ | ✓ | ✓ | ✗ pino |

## Implementation pointers

- Spec: none. The operator asked for it directly, citing loggingsucks.com.
- Plan: none.
- Commit: {{SHA, stamped on merge}}
- Files: `apps/pragma/api/src/helpers/observability/wide-event.{core,adapter,middleware}.ts`, `apps/pragma/api/src/app.ts`, `apps/pragma/api/src/main.ts`, `apps/pragma/api/src/main.websocket.ts`, `.oxlintrc.json`
- Related ADRs: ADR-0031 (Sentry, which this extends with a member identifier), ADR-2026-11-05T0445 (read batches, whose reads this logs again one by one), ADR-0012 (outbound calls in `*.adapter.ts`).
