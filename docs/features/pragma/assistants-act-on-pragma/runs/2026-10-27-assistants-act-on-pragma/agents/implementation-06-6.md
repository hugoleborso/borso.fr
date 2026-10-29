---
status: done
summary: Slice 6 (band operation tools and the route/tool coverage gate) shipped in 5cc1350c. Forty-four tools across tasks, improvements and votes, bars, outreach, free slots, studies, mastery, members, instruments, me (read and contact) and notification preferences, each in its slice's <domain>-tools.controller.ts calling the service its route calls. mcp/tool-coverage.core.ts (compareRoutesWithTools, TOOL_EXCLUSIONS with a reason per route) at 100% coverage and 100% mutation score; mcp/tool-coverage.test.ts compares createApp().routes with every tool in both directions plus stale exclusions, and all three lists are empty.
artifacts:
  - apps/pragma/api/src/mcp/tool-coverage.core.ts
  - apps/pragma/api/src/mcp/tool-coverage.core.test.ts
  - apps/pragma/api/src/mcp/tool-coverage.test.ts
  - apps/pragma/api/src/mcp/mcp.controller.ts
  - apps/pragma/api/src/mcp/mcp.controller.test.ts
  - apps/pragma/api/src/tasks/tasks-tools.controller.ts
  - apps/pragma/api/src/improvements/improvements-tools.controller.ts
  - apps/pragma/api/src/bars/bars-tools.controller.ts
  - apps/pragma/api/src/outreach/outreach-tools.controller.ts
  - apps/pragma/api/src/free-slots/free-slots-tools.controller.ts
  - apps/pragma/api/src/studies/studies-tools.controller.ts
  - apps/pragma/api/src/mastery/mastery-tools.controller.ts
  - apps/pragma/api/src/members/members-tools.controller.ts
  - apps/pragma/api/src/instruments/instruments-tools.controller.ts
  - apps/pragma/api/src/me/me-tools.controller.ts
  - apps/pragma/api/src/notifications/notifications-tools.controller.ts
  - apps/pragma/api/src/me/me.service.ts
  - apps/pragma/api/src/me/me.controller.ts
  - apps/pragma/test/mcp-utils.ts
  - apps/pragma/VOCABULARY.md
  - scripts/check-pure-modules-have-callers.sh
next:
  kind: validate
---

Changes from the plan, each decided here:

- Exclusion keys are `<METHOD|*> <path>`, where a path ending in `/*` covers that path and everything below it. Beyond D2's list, `/mcp`, `/oauth/*` and `/.well-known/*` are excluded, since they are the transport and the authorization server themselves. The test sets `ALLOW_TEST_SEED=1` so the `/api/__test/*` exclusion is never stale.
- A route may carry two tools (`update_song` and `set_default_lineup` on `PUT /api/songs/:id`, `move_setlist_entry` and `set_entry_lineup` on the entry route), as slices 3 and 4 shipped them; the coverage test checks tool names are unique and `verb_noun`, not that routes are.
- `PUT /api/me/contact` held logic in its controller (a second service call to read the member back). That read moved into `saveOwnContactDetails`, so the route and `update_my_contact` each make one call.
- The `set_default_lineup` (slice 3) and `set_entry_lineup` (slice 4) descriptions said a lineup maps an instrument to members; `Lineup` maps a member to instrument ids. Both descriptions are corrected.
- `tool-coverage.core.ts` has no runtime caller by design, which `scripts/check-pure-modules-have-callers.sh` refuses; it is listed there as test-only by design with its reason.
- Bars search is Nominatim (OpenStreetMap); the tool is `search_bar_places` and its test stubs `fetch`.
- The plan's risk row "coverage test also asserts every tool's inputSchema has its route schema's properties" is not implemented: tools take the route's own exported schemas (merged with the path schema), so `tsc` and the per-area e2e calls carry it.

Gates run: ESLint (`--no-warn-ignored --max-warnings 0`) and Prettier `--check` on every changed file; `pnpm --filter @borso-app/pragma typecheck`; core project on the touched slices with coverage (42 files, 525 tests, 100%); Stryker `--mutate api/src/mcp/tool-coverage.core.ts` (60 killed, 0 survived); the whole back-e2e suite on the local Postgres (48 files, 372 tests); knip; blueprint-indexing, convention-drift and architecture-graph `--check`; check-vocabulary-paths; the full pre-commit hook.
