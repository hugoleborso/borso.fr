# Spec: band data refreshes itself when another member changes it

## Goal

When a member changes band data, every other member with pragma open sees the change within a couple of seconds. They do not have to wait for a freshness window or pull to refresh. The case the operator named is several members ordering one setlist together.

The smallest change that meets it: after a successful write, the API tells the other open clients which part of the cache went stale, over the WebSocket channel ADR-2026-09-19T2140 built for banana-rush. Each client invalidates that part and refetches what is on screen. No data travels on the socket.

## Constraints

- **Cost.** The operator wants no fixed monthly charge. API Gateway WebSocket bills per message and per connection minute (ADR-2026-09-19T2140). A client closes its socket while the page is hidden, so an idle phone costs nothing.
- **Delivery only.** The socket is a delivery channel, never a command channel, as in banana-rush. A frame from a client changes nothing.
- **Mobile first.** It works on a phone that locks, sleeps and comes back.

## Data shapes

- Table `realtime_connection`: `connection_id text primary key`, `member_id uuid not null`, `client_id text not null`, `connected_at timestamptz not null default now()`. The preview clone and reader blocklists list it.
- `GET /api/realtime/ticket`, behind the member session. It answers `{ url: string, ticket: string }`. The ticket is signed with the app's HMAC key, carries the member id and an expiry 60 s ahead, and has a purpose distinct from the session cookie, so neither verifies as the other.
- The client connects to `url?ticket=…&client=…`. `client` is a random id the tab draws once.
- Every API write sends the header `X-Pragma-Client` with that id.
- Socket message: `{ kind: 'stale', written: string[] }`. Each entry is an API root a write touched, the first path segment after `/api/`, such as `setlists`, `mastery` or `me`, or `all`. The site maps it to the query key roots that read it.

## Behaviour

1. A tab that is visible and signed in fetches a ticket and opens the socket. It closes the socket when the page is hidden and reopens it when the page is visible again.
2. On reopening, the tab invalidates every query, because it may have missed messages while closed. Only the queries on screen refetch.
3. After a write answers 2xx, the API posts `{ kind: 'stale', written }` to every connection except the writer's own tab. `written` holds the path root of the write. A write through `POST /mcp` sends the roots of the write routes its tools declare.
4. On a message, the tab invalidates every query key root that reads a written root, directly or through a derived read, or every query for `all`. If a mutation is pending in that tab, the invalidation waits until no mutation is pending, so it never undoes an optimistic write.
5. A connection API Gateway reports gone (410) is deleted. A send that fails or takes longer than its budget never fails the write. It is reported to Sentry.
6. `$connect` refuses a missing, expired or forged ticket. `$disconnect` deletes the row. `$default` answers 200 and touches nothing.
7. `pnpm dev` keeps working. Where no socket URL is configured, the ticket endpoint answers no URL and the client does not connect.

## Freshness after this

The default query freshness stays at 5 minutes. The 30 s override on setlists is removed, because invalidation now carries changes.

## Out of scope

- Pushing the changed data itself on the socket.
- Presence, such as who else is viewing the setlist.

## Acceptance, checked on the PR preview

- Two browser sessions signed in as two members on the same setlist. A reorder in one appears in the other without a reload, measured in seconds.
- The writer's own tab gets no message for its own write.
- A hidden tab holds no connection, and showing it again refetches.
- A forged ticket is refused at `$connect`.
- 375 px wide.

> Changed on 2026-11-04 after technical validation (A13, D30). The message carries the API roots that were written, not a query key root, and the site invalidates every query key root that reads them directly or through a derived read (`QUERY_READ_ROOTS`, `DERIVED_READ_ROOTS`). An assistant write sends the roots of its tool's write routes instead of `all`.
