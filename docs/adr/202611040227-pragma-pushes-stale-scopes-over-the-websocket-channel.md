# ADR-202611040227: pragma pushes stale scopes over the WebSocket channel

- **Status:** proposed
- **Date:** 2026-11-04
- **Deciders:** Hugo
- **Tags:** pragma, realtime, cdk, dependencies, cost

## Context

Members of the band edit one setlist together, its order above all (operator, 2026-11-04). A member saw another's change only when their query went stale. That took 30 s, and PR #261 raised it to 5 minutes to cut the API's load. That PR measured 402 throttled invocations on 2026-10-29 with five users. The operator said 30 s was already too slow and asked whether the cache could be invalidated instead. They set two conditions: low cost, and testing on the preview.

Three channels were open:

- **Web push.** pragma subscribes with `userVisibleOnly: true` (`push-subscription.adapter.ts`), so every push shows a notification and none can be silent. Pushes are also grouped and can be muted per member.
- **A CDN or Redis cache.** Either one caches on the server side, while the delay lives in each phone's query cache. ElastiCache also bills a fixed monthly charge.
- **The API Gateway WebSocket channel** that [ADR-0021](./0021-api-gateway-websocket-pushes-banana-rush-round-state.md) built for banana-rush. It bills per message and per connection minute, with no fixed charge, according to the pricing that ADR quotes.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Another member's change shows without waiting | operator | high | Members order one setlist together, and 30 s was already too slow | Two tabs on the preview: a reorder in one shows in the other |
| No fixed monthly charge | operator | high | borso.fr aims at low costs, and the band is idle most of the week | The pricing model of each channel |
| Silent in the phone | author | high | An invalidation the member sees as a notification is noise | Whether the channel can deliver without showing anything |

## Decision

**pragma reuses the `WebSocketChannel` construct and sends only what was written, never data.** After a 2xx write, the API posts `{ kind: 'stale', written }` to every open tab except the writer's own. `written` lists the API roots the write touched. Each tab invalidates every query root that reads one of them, directly or through a read the API derives from other slices. A tab connects only while it is visible and signed in, using a 60 s ticket signed with the app's HMAC key under its own purpose. The spec is at `docs/features/pragma/live-invalidation/spec/spec.md`.

The design does not wait for, or carry, the changed rows. That rests on DSQL reads seeing a committed write from another connection. That was measured on the PR #261 preview: 0 stale reads out of 180 parallel reads on fresh connections, each started right after a reorder answered.

## Consequences

- `+` A change reaches the other open tabs within a socket round trip plus one refetch. Queries can stay fresh for 5 minutes, which keeps the load cut of PR #261.
- `+` Nothing runs while no tab is open, so idle costs nothing.
- `-` pragma gains `@aws-sdk/client-apigatewaymanagementapi`, plus `ws` and `@types/ws` for the local socket in `pnpm dev`. These are the versions banana-rush already uses.
- `-` Every write waits for its broadcast, up to a 1500 ms budget. That budget is a choice, not a measurement. A failed or late send is reported, and it never fails the write.
- `-` A second API and a `realtime_connection` table to keep clean. A 410 deletes a connection.

> Changed on 2026-11-04 after technical validation (A13, D30). The message first carried one query key root chosen by the API, which missed queries reading the same data under another root. It now carries the written API roots, and the site holds the map from query roots to the API roots they read. Two tests hold both tables against the code.
