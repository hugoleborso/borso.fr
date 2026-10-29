---
status: done
summary: Slice 3 (MCP transport and catalogue tools) shipped. @modelcontextprotocol/sdk 1.32.2 and @hono/mcp 0.3.2 join the catalog with exact pins. oauth/bearer-session.middleware.ts resolves the member from an access token (401 with WWW-Authenticate resource_metadata built from OAUTH_ISSUER, judgeAccessGrant expiry and session-epoch check, last_used_at written at most every 5 minutes, a DSQL conflict swallowed and logged). mcp/ serves stateless POST /mcp (fresh server and StreamableHTTPTransport per request, enableJsonResponse, GET and DELETE answer 405), with the SDK wrapped in mcp-server.adapter.ts (registerTool, McpToolFailed and mcp_tool_called), tool-result.core.ts shaping answers, mcp.types.ts and mcp.service.ts. songs-tools.controller.ts (search_songs, search_deezer, get_song, create_song, update_song, set_default_lineup, delete_song) and transitions-tools.controller.ts (list, get, set, delete transition comment) call the same services as the routes, with the routes' Zod schemas and error bodies.
artifacts:
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - apps/pragma/package.json
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/auth/member-session.middleware.ts
  - apps/pragma/api/src/oauth/bearer-session.middleware.ts
  - apps/pragma/api/src/oauth/oauth.core.ts
  - apps/pragma/api/src/oauth/token.core.ts
  - apps/pragma/api/src/oauth/token.service.ts
  - apps/pragma/api/src/oauth/oauth.repository.ts
  - apps/pragma/api/src/oauth/oauth.service.ts
  - apps/pragma/api/src/mcp/
  - apps/pragma/api/src/songs/songs-tools.controller.ts
  - apps/pragma/api/src/songs/songs.schema.ts
  - apps/pragma/api/src/songs/songs.service.ts
  - apps/pragma/api/src/transitions/transitions-tools.controller.ts
  - apps/pragma/api/src/transitions/transitions.schema.ts
  - apps/pragma/api/src/transitions/transitions.service.ts
  - apps/pragma/test/mcp-utils.ts
  - apps/pragma/VOCABULARY.md
next:
  kind: validate
---

Changes from the plan, each decided here:

- A tool's `run` returns `{ kind: 'answered' | 'refused', body }` rather than calling `answerSuccess`/`answerRefusal` itself: `borso/no-controller-imports-outside-service` forbids a controller importing a `.core.ts`, so the adapter shapes the MCP result through `tool-result.core.ts`. `defineTool` (a typed identity in `mcp.service.ts`) is re-exported by each slice's service, which is how a controller reaches it.
- The registry is `ASSISTANT_TOOLS` in `mcp.controller.ts`; slice 6's coverage test can read it there.
- `judgeAccessGrant(grant, credential, now)` is new in `token.core.ts` (expiry, then the existing `judgeGrant`); `readBearerToken`, `buildBearerChallenge`, `isLastUseStale` and `selectProtectedResourceMetadataUrl` join it.
- The SDK (1.32.2) answers a schema error as a tool result with `isError: true` whose text names the field, not as a JSON-RPC `-32602` error; the e2e asserts that shape, still a 200.
- `rememberMemberId` is exported from `member-session.middleware.ts` so both gates write the same context key.
- `set_default_lineup` and `update_song` both map to `PUT /api/songs/:id`.
- Registration still uses pragma's own zod 3 schema (slice 2); switching to the SDK's `OAuthClientMetadataSchema` was not needed.

Gates run: ESLint and Prettier on every changed file; `pnpm --filter @borso-app/pragma typecheck`; `test:core` (264 files, 2704 tests, per-file coverage green); back-e2e full suite (33 files, 333 tests); Stryker on token.core.ts, oauth.core.ts, tool-result.core.ts and mcp-server.adapter.ts (100%); knip; blueprint-indexing, convention-drift, architecture-graph and enforcement-ledger `--check`; check-vocabulary-paths.
