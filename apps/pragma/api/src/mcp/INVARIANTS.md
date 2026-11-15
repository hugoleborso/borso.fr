# Invariants of pragma, in `api/src/mcp`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Tool

- Served at `POST /mcp`, stateless: every request builds a fresh server,
  answers one JSON body and keeps no session, so `GET` and `DELETE` answer
  405.
- Reached only with an **assistant grant**'s access token, through
  `requireBearerSession`; the member it resolves is the actor of every
  write, so push skips that member exactly as for a change made in the app.
- Takes the route's own Zod limits, but names things the way a person
  does: a song, member, instrument, setlist, bar, task or improvement is a
  *reference*, its id or its name in any case and with or without accents,
  and a session is its id, `next`, `next-concert`, `next-practice`, `last`
  or a day. A reference that matches several answers `<noun>-ambiguous`
  with the candidates; one that matches nothing answers `<noun>-not-found`.
- Answers a compact projection rather than the route's body: ids plus what
  the next step needs, names where a person would say a name, no field that
  is null or empty, and a short confirmation for a write. A refusal is a
  tool error carrying the route's `{ error }` code; an unexpected throw is
  reported as `McpToolFailed` and answers `internal-error`.
- A `save_<noun>` tool both creates and changes: without a reference it
  creates, and a creation missing a required field answers `invalid-input`
  with the fields; with a reference it changes only the fields given. One
  `delete` tool takes `{ kind, id }` for a bar, improvement, session,
  setlist, song, take or task, and its description tells the assistant to
  confirm with the user first.
- Every mounted route has a tool, unless `TOOL_EXCLUSIONS` in
  `mcp/tool-coverage.core.ts` names it with a reason: credentials,
  state bound to one browser, the audience ballot, the test seed, the
  OAuth and MCP endpoints themselves, and what the operator kept away from
  assistants on 2026-10-29 (every vote, notification preferences, take and
  transition comments, the instrument list, mastery defaults, the outreach
  template, and adding, renaming or removing members). A route with neither,
  a tool naming a route that is gone, and an exclusion matching no route each
  fail `mcp/tool-coverage.test.ts`. One tool may cover several routes, as
  `get_setlist` reads a setlist and its entries and `set_song_mastery`
  both writes and removes a score.
- The size of the tool list and of the answers to ten typical band tasks
  are budgets held by `mcp/tool-budget.test.ts`.

Held by: `api/src/mcp/mcp.controller.test.ts` › answers 401 with the protected resource metadata address to a call without a valid token
Held by: `api/src/mcp/mcp.controller.test.ts` › lists every served tool, advertises tools only, and serves two clients at once with no session
Held by: `api/src/songs/songs-tools.controller.test.ts` › answers the refusal codes the routes answer
Held by: `api/src/sessions/sessions-tools.controller.test.ts` › creates a concert with the fields the route requires
Held by: `api/src/setlists/setlists-tools.controller.test.ts` › pushes each setlist change to the other members only
Held by: `api/src/setlists/setlists-tools.controller.test.ts` › reads what the band wrote about each transition into the next song, which the tools never write
Held by: `api/src/takes/takes-tools.controller.test.ts` › signs an upload, then records the take as the granting member
Held by: `api/src/mcp/tool-coverage.test.ts` › serves a tool for every mounted route that is not excluded with a reason
Held by: `api/src/mcp/tool-coverage.test.ts` › maps every tool to a route that is mounted
Held by: `api/src/mcp/tool-coverage.test.ts` › keeps no exclusion for a route that is no longer mounted
Held by: `api/src/mcp/tool-coverage.core.test.ts` › reports an exclusion that matches no mounted endpoint as stale
Held by: `api/src/mcp/tool-budget.test.ts` › answers each typical band task within its budget of calls and characters
Held by: `api/src/improvements/improvements-tools.controller.test.ts` › proposes an improvement as the granting member, and lists whether that member voted for it
Held by: `api/src/me/me-tools.controller.test.ts` › logs a study of today as the granting member, shows it in get_me, then undoes it
Held by: `api/src/me/me-tools.controller.test.ts` › reads the granting member, and changes only their own contact details
