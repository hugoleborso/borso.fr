---
status: done
summary: Slice 5 (take tools) shipped in dc9d175f. takes/takes-tools.controller.ts serves list_takes, list_take_comments, request_take_upload, create_take, delete_take, comment_on_take, update_take_comment and delete_take_comment, one per /api/takes route. Each calls the service its route calls, with the route's schemas and refusal codes, and takes the member from the bearer grant as actor. Back-e2e asserts request_take_upload then create_take, attribution of the take and of a comment to the granting member, every refusal code, the audio deletion, and push to the other member only.
artifacts:
  - apps/pragma/api/src/takes/takes-tools.controller.ts
  - apps/pragma/api/src/takes/takes-tools.controller.test.ts
  - apps/pragma/api/src/takes/takes.schema.ts
  - apps/pragma/api/src/takes/takes.service.ts
  - apps/pragma/api/src/mcp/mcp.controller.ts
  - apps/pragma/api/src/mcp/mcp.controller.test.ts
  - apps/pragma/VOCABULARY.md
next:
  kind: validate
---

Changes from the plan, each decided here:

- The spec lists `get_take`, but no route answers one take. The spec's own rule says a tool without a route fails a test, so the tool for `GET /api/takes/:id/comments` is `list_take_comments`, and there is no `get_take`. `list_takes` answers every take of a song with its comment count, which covers reading a take. A reviewer who wants `get_take` back would need a new route, which is scope beyond the spec.
- `takeCommentUpdateSchema` carries a refinement (at least one field), so it cannot merge with the path parameters. Its fields are now `takeCommentChangesSchema`, which the route refines and the tool merges; the tool answers `empty-update` itself where the route's refinement refuses. VOCABULARY.md *Tool* says so.
- `request_take_upload` takes `actor.now` for the expiry, as the route takes the request time.

Gates run: ESLint and Prettier on every changed file; `pnpm --filter @borso-app/pragma typecheck`; core project on `api/src/takes` and `api/src/mcp` (4 files, 40 tests); back-e2e on `api/src/takes` and `api/src/mcp` (3 files, 46 tests); knip; blueprint-indexing, convention-drift and architecture-graph `--check`; check-vocabulary-paths; the full pre-commit hook. No `*.core.ts`, `*.utils.ts` or `*.adapter.ts` changed, so no Stryker run was needed.
