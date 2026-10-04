# ADR-0021: API Gateway WebSocket pushes Banana Rush round state

- **Status:** accepted
- **Date:** 2026-09-19
- **Deciders:** Hugo Borsoni
- **Tags:** banana-rush, cdk, realtime

## Context

Banana Rush is a game where everybody writes a secret number at the same time and the round only resolves once the last number arrives. Every phone in the game has to learn three things quickly: that a player has joined the lobby, that a player has bid, and what the round resolved to. The reveal is the moment the game exists for, and a phone that learns it two seconds after the others has been told the ending twice.

The repository had nothing to build this on. Every application here is a static site on CloudFront in front of a Lambda behind an HTTP API, composed by the `PreviewableApp` construct. Nothing in `infra/cdk/src/constructs/` opens a persistent connection, and no application had ever needed one. Aurora DSQL holds the state, and each application owns its own cluster.

The operator set one condition on the choice: a persistent connection service is acceptable only if it bills per use, because this is a lab account running four small applications and a fixed monthly charge for a game that is idle most of the time is not worth paying. Amazon's API Gateway pricing page, read on the day of this decision, lists WebSocket APIs at one dollar per million messages and twenty five cents per million connection minutes, with a free tier of one million messages and seven hundred and fifty thousand connection minutes per month for the first twelve months, and no fixed monthly or hourly charge. Those figures are the ones the page states for US East, and it lists no separate line for Europe Paris.

## Decision

**An API Gateway WebSocket API, wrapped in a new `WebSocketChannel` construct, carries state to the phones, and every write still goes through the existing HTTP API.** The socket is a one way channel in practice: the browser opens it with a join code and a player token, and after that it only listens. Nothing the browser sends over the socket can change the game. That keeps the whole game in the controller, service and repository shape the repository already gates, and leaves the socket with two Lambda routes that do nothing but write and delete a row.

## Consequences

- `+` The reveal lands on every phone in the same moment, which is the one thing the game needs and the thing a poll on a timer cannot give.
- `+` Billing is per message and per connection minute with no fixed charge, so an idle game costs nothing and the first year is very likely free at this scale.
- `+` No game logic moves onto the socket. The bounded contexts stay exactly the shape `docs/standards/` describes, and the WebSocket handler has no branch worth mutating.
- `+` The construct is reusable. Any later application in this repository that needs a push channel gets it from `infra/cdk` rather than inventing one.
- `-` A second API to deploy, a second set of permissions, and a connections table that has to be swept when a phone disappears without closing the socket.
- `-` The browser cannot learn the socket address at build time, because the address does not exist until the stack deploys. A `GET /api/config` call at boot now stands between opening the page and joining a game.
- `-` Local development needs a second path, because there is no API Gateway on a laptop. The development server runs a plain `ws` server and the same client code points at it.
- `~` `infra/cdk` is gated at one hundred percent line coverage, so the construct arrives with a synthesis test rather than gaining one later.

## Alternatives considered

### Option A — API Gateway WebSocket API (chosen)

- **Summary:** A managed WebSocket API with `$connect`, `$disconnect` and `$default` routes backed by a small Lambda. Connections are recorded in the application's own DSQL schema. The HTTP Lambda posts to connections through the management API after it has written the round result.
- **Strengths:**
  - Real push, so the reveal is simultaneous.
  - Billing is per use with no fixed charge, which is the condition the operator set.
  - The connection lifecycle is the vendor's problem, not ours.
- **Costs:**
  - One dollar per million messages and twenty five cents per million connection minutes, as listed above. A six player game bidding for twenty rounds sends a few hundred messages.
  - A new construct, a connections table, and a sweep for connections that die without a `$disconnect`.
- **Rationale:** It is the only option that delivers a simultaneous reveal without a fixed monthly charge, and the cost of the extra construct is paid once and reused.

### Option B — Polling on a timer (rejected)

- **Summary:** The front end asks for the game state every second or two through TanStack Query's `refetchInterval`, and nothing about the infrastructure changes.
- **Strengths:**
  - No new construct, no new permissions, no connections table. It could have shipped in a day.
  - Works identically on a laptop and in production.
  - The repository already has the pattern in its query layer.
- **Costs:**
  - The reveal arrives at a different moment on every phone, up to the poll interval apart.
  - A Lambda invocation per player per interval for the whole life of a game, including while everybody is thinking.
- **Rejection rationale:** It loses on the simultaneous reveal, which is the feature. Shortening the interval to hide that raises the invocation count until the cost argument that favoured it disappears. If the operator had not been willing to add a construct, this was the fallback.

### Option C — Streamed responses from a Lambda function URL (rejected)

- **Summary:** Lambda function URLs can stream a response, so a long lived request could carry server sent events to the browser.
- **Strengths:**
  - No second API, and the events ride the HTTP path that already exists.
  - Server sent events reconnect on their own in the browser.
- **Costs:**
  - The stream is held open by a Lambda invocation, so the connection is billed as running compute rather than as a connection minute.
  - CloudFront sits in front of the API here and the `StaticSite` construct does not configure it for streaming, so the existing path would have to change.
  - Lambda's maximum invocation time cuts the stream, so the client has to reconnect on a schedule anyway.
- **Rejection rationale:** It loses on cost, because paying for compute to hold an idle connection is worse than paying for a connection minute. It was the operator's stated fallback had the WebSocket billing turned out to carry a fixed charge, and it did not.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Simultaneous reveal | high | The reveal is the game. A phone that learns the result late has had the ending spoiled by the person sitting next to it. |
| No fixed charge | high | The operator set this as the condition of the decision. This is a lab account and an idle game must cost nothing. |
| Fits the existing shape | medium | `docs/standards/` gates the controller, service and repository split. An option that moved game logic onto a socket would fight every gate in the repository. |
| Works on a laptop | medium | `pnpm dev` has to run the whole game without an AWS account, which is what every other application here does. |
| Cost of the first build | low | A construct written once and gated at full coverage is a one time cost that the next application inherits. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Simultaneous reveal | ✓ true push, one broadcast per round | ✗ up to one interval of skew per phone | ✓ true push while the stream is open |
| No fixed charge | ✓ per message and per connection minute only | ✓ per invocation only | ✗ compute billed for the whole idle connection |
| Fits the existing shape | ✓ socket carries no commands, writes stay on the HTTP API | ✓ nothing changes | ✗ CloudFront and the site construct would need streaming |
| Works on a laptop | ✓ a plain `ws` server stands in | ✓ nothing to stand in for | ✗ needs a function URL to reproduce |
| Cost of the first build | ✗ a construct, a table and a sweep | ✓ nothing | ✗ construct changes plus reconnect handling |

## Implementation pointers

- Spec: [`docs/features/banana-rush/lobby-and-game/spec/spec.md`](../features/banana-rush/lobby-and-game/spec/spec.md)
- Files: `infra/cdk/src/constructs/web-socket-channel.ts`, `apps/banana-rush/api/src/realtime/`, `apps/banana-rush/cdk/lib/stack.ts`
- Related ADRs: builds on ADR-0012, because the post to a connection is an outbound call and lives in an adapter file.
