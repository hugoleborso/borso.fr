---
status: done
summary: Slice 4 (session and setlist tools) shipped in 3bcafc7c. sessions/sessions-tools.controller.ts serves list_sessions, get_session, create_session, update_session and delete_session; setlists/setlists-tools.controller.ts serves 19 tools covering every /api/setlists route (setlists, session links, entries, reorder, audience vote). Each calls the service its route calls, with the route's Zod schemas and refusal bodies, and takes the member from the bearer grant as actor. Per-area back-e2e asserts the database change, every refusal code, vote attribution to the granting member, and push to the other member only.
artifacts:
  - apps/pragma/api/src/sessions/sessions-tools.controller.ts
  - apps/pragma/api/src/sessions/sessions-tools.controller.test.ts
  - apps/pragma/api/src/sessions/sessions.schema.ts
  - apps/pragma/api/src/sessions/sessions.service.ts
  - apps/pragma/api/src/setlists/setlists-tools.controller.ts
  - apps/pragma/api/src/setlists/setlists-tools.controller.test.ts
  - apps/pragma/api/src/setlists/setlists.schema.ts
  - apps/pragma/api/src/setlists/setlists.service.ts
  - apps/pragma/api/src/mcp/mcp.controller.ts
  - apps/pragma/api/src/mcp/mcp.controller.test.ts
  - apps/pragma/api/src/songs/songs-tools.controller.test.ts
  - apps/pragma/test/mcp-utils.ts
  - apps/pragma/VOCABULARY.md
next:
  kind: validate
---

Changes from the plan, each decided here:

- The session create and update bodies are a `kind` union, which cannot be merged with the id parameter into one `ZodObject`. `create_session` takes the route's schema whole under `session`, `update_session` under `changes`. VOCABULARY.md *Tool* says so.
- Spec names are kept. `move_setlist_entry` maps to `PUT /api/setlists/:id/reorder` and takes the whole new order (`entryIds`), as that route does. `set_entry_lineup` and `update_setlist_entry` share `PUT /api/setlists/:id/entries/:entryId`. `cast_vote` is the vote score route. The remaining routes follow `verb_noun`: `list_session_setlists`, `link_setlist_to_session`, `unlink_setlist_from_session`, `list_setlist_entries`, `delete_setlist`, `get_vote_board`, `set_vote_status`, `get_closing_proposal`, `close_vote`.
- `GET /api/offline-manifest` (the service worker's cache list) gets no tool here. Slice 6 decides whether it goes in `TOOL_EXCLUSIONS`.
- `prepareAssistantBand` and `passNotificationGroupWindow` (via a new `advanceClock` on the harness) join `test/mcp-utils.ts`; the songs tools test now uses the first. The second moves the harness clock past the 10-minute push grouping window, so each write's push can be asserted one at a time.
- The mcp.controller test now asserts the full served tool list, and its title changed to "lists every served tool…". The Held by line in VOCABULARY.md was updated to match.

Gates run: ESLint and Prettier on every changed file; `pnpm --filter @borso-app/pragma typecheck`; `test:core` (264 files, 2705 tests, per-file coverage green); back-e2e full suite (35 files, 342 tests); knip; blueprint-indexing, convention-drift, architecture-graph and enforcement-ledger `--check`; check-vocabulary-paths; the full pre-commit hook. No `*.core.ts`, `*.utils.ts` or `*.adapter.ts` changed, so no Stryker run was needed.
