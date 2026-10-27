---
status: done
summary: Plan written at docs/features/pragma/assistants-act-on-pragma/plan/plan.md, referencing ADR-0041 and ADR-0042, cut into seven ordered slices (CloudFront routing in infra/cdk, OAuth server, MCP transport with catalogue tools, session and setlist tools, take tools, band operation tools with the route and tool coverage gate, consent page and Account section). No new ADR trigger. Ten planning decisions are recorded; D2 (routes excluded from tools beyond the spec's list, all credentials or browser-bound) is the one the operator may want to overturn.
artifacts:
  - docs/features/pragma/assistants-act-on-pragma/plan/plan.md
next:
  kind: validate
---

Workspace findings that shaped the plan: production CloudFront only forwards `/api/*` to the API, so `/mcp`, `/oauth/*` and `/.well-known/oauth-*` need an `infra/cdk` change (slice 1, no `borso-shared` template drift); the migration audit refuses `DEFAULT now()`; pragma's layer-marker budget is zero, so tools live in `<domain>/<domain>-tools.controller.ts` instead of the spec's `mcp/tools/<area>.tools.ts`; `@hono/mcp` auto-installs `hono-rate-limiter` as a peer that is never imported because `@hono/mcp/auth` is not used.
