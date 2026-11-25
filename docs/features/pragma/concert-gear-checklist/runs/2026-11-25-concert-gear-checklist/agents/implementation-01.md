---
status: done
summary: |
  Slice 1 of 2 (API and MCP for gear items) is implemented and green. Members and assistants can now create, change, delete and copy the gear items of a concert through /api/gear-items/:sessionId, and get_session lists a concert's gear as { label, holder } instead of the free text. save_session no longer takes gear. Concert REST payloads still carry gear so the site compiles until slice 2. One blocker for slice 2 is flagged below: Aurora DSQL refuses DROP COLUMN, so the column drop directive 8 asks for cannot ship as a Drizzle migration.
artifacts:
  - apps/pragma/domain/gear-status.core.ts
  - apps/pragma/domain/gear-status.core.test.ts
  - apps/pragma/domain/input-limits.core.ts
  - apps/pragma/domain/stale-scope.core.ts
  - apps/pragma/domain/INVARIANTS.md
  - apps/pragma/api/src/database/migrations/0032_gear_item.sql
  - apps/pragma/api/src/database/schema.ts
  - apps/pragma/api/src/gear-items/
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/sessions/sessions.repository.ts
  - apps/pragma/api/src/sessions/sessions.service.ts
  - apps/pragma/api/src/sessions/sessions.schema.ts
  - apps/pragma/api/src/sessions/session-tool.core.ts
  - apps/pragma/api/src/members/members.repository.ts
  - apps/pragma/api/src/setlists/setlists-tools.service.ts
  - apps/pragma/api/src/setlists/setlists-tools.controller.ts
  - apps/pragma/api/src/mcp/mcp.controller.ts
  - apps/pragma/api/src/mcp/tool-coverage.core.ts
  - apps/pragma/api/src/helpers/reference/reference.core.ts
  - apps/pragma/api/src/__test/test-seed.service.ts
  - apps/pragma/api/src/__test/test-seed-gear.core.ts
  - apps/pragma/api/src/__test/test-seed-gear.service.ts
  - apps/pragma/VOCABULARY.md
  - .oxlintrc.json
next:
  kind: validate
---

## Goal, smallest change, data shape

- Goal: a week before a concert, members and assistants see which gear the band has, asked the venue for, or still has to find. This slice gives them the API and the MCP tools.
- Smallest change: one table `gear_item` and one module `api/src/gear-items/` on the tasks precedent, one written root `gear-items`, the hooks in member and concert deletion, and the MCP read and write.
- Data shape: `gear_item (id uuid chosen by the device, session_id, label, status, member_id, position)`. `status` is `to_find | asked_of_venue | have`, and `member_id` is set if and only if `status` is `have` (`isGearHoldingValid`). REST answers follow the plan's table, under `/api/gear-items/:sessionId`.

## Gates run in this worktree

- `oxlint --type-aware apps/pragma .oxlintrc.json` exits 0. `oxfmt --check apps/pragma .oxlintrc.json` passes.
- `tsc --noEmit -p apps/pragma/tsconfig.json` passes.
- `vitest run --project core --changed origin/main`: 146 files, 1,048 tests passed.
- Coverage at 100% on `domain/gear-status.core.ts`, `api/src/gear-items/gear-item-tool.core.ts`, `api/src/sessions/session-tool.core.ts`, `api/src/__test/test-seed-gear.core.ts` and `api/src/helpers/reference/reference.core.ts`.
- Back-e2e against a local Postgres: `api/src/gear-items`, `api/src/sessions`, `api/src/members`, `api/src/mcp`, `api/src/setlists/setlists-tools.controller.test.ts`, `api/src/tasks`, `api/src/__test` and `api/src/database` pass.
- Measured with the seeded band: the tool list is 18,687 characters under the 19,000 budget (313 to spare). `get_session` on the seeded next concert, now with four gear items, answers 1,912 characters.

## Where the code differs from the plan, and why

- The holder rule is checked in the service, not in a schema `.refine`. A refine failure answers zod's generic 400 body, and the plan asks for the named `400 holding-invalid`. `isGearHoldingUpdateValid` (domain) also refuses an update that sends `status` without `memberId` or the reverse.
- `gear-items` derives its reads from `instruments`, `members` and `sessions`. The service reads member names through `readLineupNames` in the instruments slice, and `derived-read-roots.test.ts` requires the row to name it, as the tasks row does.
- `isSelfReference` moved from `tasks/task-tool.core.ts` to `helpers/reference/reference.core.ts`, so the gear tool reads `me` with the same rule instead of a copy.
- `gear-items.service.ts` joins the `.oxlintrc.json` list of services exempt from `import/no-cycle`. The sessions and members deletion transactions call it, and it claims sessions and members, which is the same cycle `tasks.service.ts` is exempt for.
- `site/src/lib/queries/query-key-roots.test.ts` names `gear-items` as a written root no site query reads yet. Slice 2 adds the query and must empty that list again.
- The `delete` tool resolves a gear item by label among the items of upcoming concerts, or by id anywhere, because `get_session` lists no item ids.
- The seed writes its four items through `test-seed-gear.service.ts`, because `test-seed.service.ts` sat at the 300-line limit.

## Blocker for slice 2, needs the operator

Directive 8 asks the generated Drizzle migration to drop `session.gear`. Aurora DSQL refuses `DROP COLUMN`: `domain/INVARIANTS.md` says so for `member_instrument.is_primary`, and migrations 0006, 0027 and 0031 each work around it. A migration with `ALTER TABLE "session" DROP COLUMN "gear"` would pass the local Postgres tests and fail at deploy. The likely option is to stop declaring and reading the column everywhere and leave it in the table, as `is_primary` is left. That keeps Akanaboum's text in the database, unread. This is a product call because the operator said "enlève tout". The orchestrator should put it to him before slice 2.

## Friction logged

- `scripts/kaizen.sh` lines for the DSQL drop, and for the lint hook reporting `import/no-cycle` on a file the override exempts when run from a worktree path.
