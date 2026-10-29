# ADR-0041: pragma serves MCP from its API Lambda, stateless, with the official SDK behind @hono/mcp

- **Status:** proposed
- **Date:** 2026-10-23
- **Deciders:** Hugo Borsoni
- **Tags:** assistants-act-on-pragma, app-architecture

## Context

The [assistants spec](../features/pragma/assistants-act-on-pragma/spec/spec.md) exposes everything a member can do in pragma as MCP tools, for Claude Code, Mistral Vibe, claude.ai and Le Chat. All four speak Streamable HTTP to a remote server. pragma's API is one Hono application on one Lambda, and every rule already lives in a service with a Zod input schema. A Lambda keeps no memory between invocations it can rely on, so a server that holds MCP sessions in memory would lose them.

## Decision

**The official `@modelcontextprotocol/sdk` (1.32.2) behind `@hono/mcp` (0.3.2), mounted at `/mcp` on the existing API Lambda, stateless.** Each request builds a fresh `McpServer` and transport with no session id, registers the tools, answers, and is discarded. A tool is a Zod schema plus one call into the existing service, run as the member the Bearer token resolves to. Tools never call the HTTP API.

## Consequences

- `+` One deployable, one database role, one set of services. A rule fixed in a service is fixed for the app and for assistants at once.
- `+` Stateless requests survive cold starts and concurrent Lambdas, which session-holding servers do not.
- `-` Two new dependencies, and the SDK releases often. Both are pinned in the catalog, and the tool coverage test catches a broken registration.
- `-` Building the server per request costs work on every call. This has not been measured. If it shows in latency, cache the tool registry at module level.
- `-` No server-initiated messages or resumable streams, because there is no session. The tools in scope do not need them.

## Alternatives considered

### Option A — SDK + `@hono/mcp`, stateless on the API Lambda (chosen)

- **Summary:** as in *Decision*.
- **Strengths:** reuses the services and the deployment; the SDK is the reference implementation the clients are tested against.
- **Costs:** two dependencies.
- **Rationale:** it wins on reuse and on infrastructure, the two high-weight criteria.

### Option B — Separate MCP Lambda calling the HTTP API (rejected)

- **Summary:** a second function that turns tool calls into `hc` client calls on the public API.
- **Strengths:** isolates the MCP code from the API.
- **Costs:** a second function and its CDK tests, a second authentication hop, and two copies of the input validation.
- **Rejection rationale:** it loses on infrastructure and on drift. It would only win if the MCP server had to scale apart from the app.

### Option C — Hand-written JSON-RPC handler, no SDK (rejected)

- **Summary:** implement `initialize`, `tools/list` and `tools/call` ourselves.
- **Strengths:** no dependency.
- **Costs:** we would own protocol negotiation and track every spec revision.
- **Rejection rationale:** it loses on reuse ("reuse before you build"), and each client upgrade would risk an incompatibility we wrote ourselves.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Reuse of services and deployment | high | The spec's promise is "everything the app can do", which drifts if the logic is copied. |
| Infrastructure added | high | One-person lab; every resource is a coverage-gated CDK change. |
| Protocol conformance | medium | Four different clients must connect. |
| Dependencies added | low | Pinned, behind one controller. |

|   | A: SDK stateless | B: separate Lambda | C: hand-written |
|---|---|---|---|
| Reuse | ✓ calls services | ✗ second copy of validation | ✓ calls services |
| Infrastructure | ✓ none | ✗ new function | ✓ none |
| Conformance | ✓ reference SDK | ✓ reference SDK | ✗ ours to keep current |
| Dependencies | ✗ two | ✗ two | ✓ none |

## Implementation pointers

- Spec: [`docs/features/pragma/assistants-act-on-pragma/spec/spec.md`](../features/pragma/assistants-act-on-pragma/spec/spec.md)
- Plan: to be written by `/technical-conception`
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/api/src/mcp/`, `apps/pragma/api/src/app.ts`
- Related ADRs: ADR-0042 (who the token belongs to), ADR-0040 (the push fan-out the tools trigger)
