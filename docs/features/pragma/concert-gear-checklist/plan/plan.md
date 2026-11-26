# Plan — Concert gear checklist

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

Goal: members see, a week before a concert, which gear the band has, asked the venue for, or still has to find. Smallest change: one new table `gear_item` and one API module on the `api/src/tasks/` precedent, one new written root `gear-items`, one page under the concert, one summary card in place of the free-text gear card, and the MCP tools that read and write items. `session.gear` is removed everywhere, column included, and its text is not migrated (operator, 2026-11-25: "enlève le free text matériel, enlève tout").

## Data shape

```ts
// domain/gear-status.core.ts
export const GEAR_STATUSES = ['to_find', 'asked_of_venue', 'have'] as const;
export type GearStatus = (typeof GEAR_STATUSES)[number];
export const DEFAULT_GEAR_STATUS: GearStatus = 'to_find';
export interface GearHolding { readonly status: GearStatus; readonly memberId: string | null }
export function isGearHoldingValid(holding: GearHolding): boolean;          // memberId !== null iff status === 'have'
export function nextGearHoldingAfterTap(status: GearStatus, tappingMemberId: string): GearHolding;
export function countGearByStatus(items: readonly { status: GearStatus }[]): Readonly<Record<GearStatus, number>>;
export function selectGearCopySource<Concert extends { id: string; date: Date; gearItemCount: number }>(
  concerts: readonly Concert[], target: { id: string; date: Date },
): Concert | null;                                                          // latest concert dated before target with at least one item
```

```sql
-- api/src/database/migrations/0032_gear_item.sql
CREATE TABLE IF NOT EXISTS "gear_item" (
  "id" uuid PRIMARY KEY NOT NULL,          -- chosen by the device, as band_link: a retried create lands on the same row
  "session_id" uuid NOT NULL,
  "label" text NOT NULL,
  "status" text NOT NULL,
  "member_id" uuid,
  "position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gear_item_session_position_idx" ON "gear_item" ("session_id","position");
```

REST payloads, all under the new root `/api/gear-items/:sessionId`:

| Route | Body | Answer |
|---|---|---|
| `GET /api/gear-items/:sessionId` | | `200 { items: GearItem[], copySource: { sessionId, venue, date, itemCount } \| null }` · `404 not-a-concert` |
| `POST /api/gear-items/:sessionId` | `{ id, label, status, memberId }` | `201 { item }` · `400 holding-invalid \| member-not-found` · `404 not-a-concert` |
| `PUT /api/gear-items/:sessionId/:id` | `{ label?, status?, memberId? }`, `status` and `memberId` sent together | `200 { item }` · `400 empty-update \| holding-invalid \| member-not-found` · `404 not-found` (unknown id, or an item of another concert) |
| `DELETE /api/gear-items/:sessionId/:id` | | `200 { id, deleted: true }` · `404 not-found` |
| `POST /api/gear-items/:sessionId/copy` | `{ fromSessionId }` | `201 { items }` · `409 gear-not-empty` · `404 not-a-concert` |

MCP: `get_session` answers `gear: [{ label, holder }]` for a concert, `holder` being a member's first name, `venue` or `null` for "to find", in place of the free text. One new tool `save_gear_item` (`session`, optional `item`, `label`, `holder`: a name, `me`, `venue` or `null`). Deletion goes through the existing `delete` tool, kind `gear_item`.

## Slices

Each slice leaves the app green and is one implementation subagent.

1. **API and MCP.** Domain rule, input limit, migration, `api/src/gear-items/` module, written root, member and session deletion hooks, the MCP read and write, the test seed. Concert REST payloads keep `gear` in this slice, so the site still compiles.
2. **Site.** The gear page, its queries, the summary card, the route, i18n, and the removal of `session.gear` from the concert forms, the REST schemas, the session projection and the optimistic session builder.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q Statuses | `to_find`, `asked_of_venue`, `have` | `domain/gear-status.core.ts` (`GEAR_STATUSES`, `@FollowsBlueprint core-decision`), sibling `.core.test.ts` at 100% | `pnpm --filter @borso-app/pragma exec vitest run --project core domain/gear-status.core.test.ts --coverage --coverage.include=domain/gear-status.core.ts` |
| Q Holder | one of member, venue, nobody; `memberId` set iff `have` | `isGearHoldingValid` in the domain file, used by a `.refine` in `api/src/gear-items/gear-items.schema.ts` on create and on update; update takes `status` and `memberId` together (`.refine` refuses one without the other) | controller tests "refuses have without a member", "refuses a member on to_find", "refuses status without memberId" answer `400 holding-invalid` |
| Q Holder, edge "member deleted" | item back to `to_find` | `releaseGearOfDeletedMember(transaction, memberId)` in `gear-items.repository.ts`, called from `members.repository.ts` next to `unassignTasksOfMemberBeingDeleted` (line 130 today) | controller test "puts an item back to find when its member is deleted" |
| Q Holder, DSQL race | no item names a member deleted mid-write | create and update claim the member with `didClaimMemberWithin` in the same transaction as the write, as tasks do | controller test "never leaves an item held by a member deleted while it was written" on the tasks pattern |
| Q Reprendre | copies labels, statuses and holders of the latest earlier concert that holds items | `selectGearCopySource` (domain); `copyGearItems` in `gear-items.service.ts` reads the source inside one transaction, refuses `gear-not-empty` when the target already holds items, re-claims each `memberId` and writes a holder whose member is gone as `to_find`; new ids are minted server side | controller tests "copies labels, statuses and holders", "refuses a copy into a concert that holds items", "answers no copy source when no earlier concert holds items" |
| Q Reprendre, edge "no previous concert holds items" | button absent | `copySource: null` in the GET answer; `SessionGearPage` renders the button only when `items.length === 0 && copySource !== null` | visual-validation row; `copySource` null case in the controller test |
| Q Who brings it, Q Where the list lives | dedicated page per concert | route `/sessions/:sessionId/gear` in `site/src/App.tsx` → `site/src/routes/sessions/SessionGearPage.tsx` (`@FollowsBlueprint route-detail-page`, as `SessionAudiencePage`) | `grep -n "sessions/:sessionId/gear" apps/pragma/site/src/App.tsx` prints one line |
| Spec edge "a practice has no gear page" | only concerts | every route answers `404 not-a-concert` when `:sessionId` is not a concert: `didClaimConcertWithin` (new, in `sessions.repository.ts`, an `UPDATE … WHERE id = $1 AND kind = 'concert'` as `didClaimSessionWithin` does) for writes, a kind check for the read; the page shows the missing-session state on that 404 | controller test "answers not-a-concert for a practice" |
| Spec error "item of another concert or unknown id" | 404 | repository update and delete filter on `id AND session_id` | controller test "answers not-found for an item of another concert" |
| Spec error "empty or too long label" | refused, sheet keeps the text | `label: z.string().trim().min(1).max(GEAR_ITEM_LABEL_MAX_LENGTH)` with `GEAR_ITEM_LABEL_MAX_LENGTH = 128` in `domain/input-limits.core.ts`; the sheet keeps its form state on a failed mutation | controller test for both bounds; visual-validation row |
| Spec edge "two members at once" | last write wins, screens converge | `gear-items` added to `WRITTEN_API_ROOTS` and to `DERIVED_READ_ROOTS` (`['members', 'sessions']`) in `domain/stale-scope.core.ts`; `'gear-items': ['gear-items']` in `site/src/lib/queries/query-read-roots.core.ts` | `stale-scope-coverage.test.ts`, `derived-read-roots.test.ts`, `query-key-roots.test.ts` pass; `tool-stale-scope.test.ts` asserts `save_gear_item` writes `['gear-items']` |
| Q Who creates items | page and MCP tools | `api/src/gear-items/gear-items-tools.controller.ts` exports `GEAR_ITEM_TOOLS` (`save_gear_item`) and `GEAR_ITEM_DELETION`, registered in `api/src/mcp/mcp.controller.ts`; `get_session` in `setlists-tools.controller.ts` gains `GET /api/gear-items/:sessionId` in its `routes`; `POST /api/gear-items/:sessionId/copy` goes to `TOOL_EXCLUSIONS` with the reason "Reprendre is the gear page's one-tap shortcut; an assistant adds items with save_gear_item" | `tool-coverage.test.ts` with `TOOL_COUNT` 37; `mcp.controller.test.ts` `SERVED_TOOLS` lists `save_gear_item` |
| Q Who creates items, model cost | tool list and answers stay in budget | `save_gear_item` description one sentence; `get_session` projects `{ label, holder }` only, no ids, no positions | `tool-budget.test.ts` passes with `TOOL_LIST_CHARACTERS_MAX` unchanged at 19,000, and a new task budget "say who brings what to the next concert" (1 call, `get_session`) |
| Q Page layout A + C | sections À trouver, Demandé à la salle, J'ai; chips Tout / À trouver / Salle / J'ai with counts; "Moi" chip | pure view in `site/src/routes/sessions/gear-page.core.ts` (`selectGearSections(items, { filter, isMineOnly, memberId })`, `@FollowsBlueprint core-view-projection`): counts follow the "Moi" scope, an empty section is hidden, as on artboard `VariantAC`; `SessionGearPage` draws it with `Chip`, `MemberMark` and the canvas icons | `gear-page.core.test.ts` at 100%; visual-validation rows per chip |
| Result "tap on the mark" | À trouver → salle → J'ai (tapper) → À trouver | `nextGearHoldingAfterTap` called by the row's 44 px button; `useUpdateGearItem` writes optimistically | domain test for the three transitions; visual-validation row |
| Result D, add sheet | label and one "who has it" radio group: À trouver, the venue, one member's mark | `site/src/components/organisms/GearItemSheet.tsx` (`@FollowsBlueprint organism-form-sharing-the-domain-rule`, as `BandLinkFormSheet`) | `GearItemSheet.test.tsx` renders the radio group with one radio per member |
| Q Free-text field replaced in the UI | Details tab card becomes a summary | `ConcertReadView.tsx` drops the `gear` prop and takes a `gearSummary` (`countGearByStatus`) and a link to `/sessions/:id/gear`: "N à trouver ›", the two-tone bar, "N on a · N salle · N à trouver", as artboard `Main`. With no item the card reads the `sessions.gearEmpty` string and still opens the page | visual-validation row at 375 px |
| Q `session.gear` removed | drop the column and every use, no data migration | slice 1: `projectSessionForTool` stops reading `gear`; `sessionSaveToolInputSchema` loses it. Slice 2: `concertFieldShape`, `concertCreateSchema`, `sessionPersistedUpdateSchema`, `sessions.core.ts`, `sessions.service.ts` and the repository `PROJECTION` lose `gear`; `ConcertEditForm`, `CreateSessionDialog`, `SessionDetail`, `optimistic-session.core.ts` lose it; `gear: text('gear')` leaves `sessions.schema.ts`; DSQL refuses `DROP COLUMN`, so migration `0033_erase_session_gear.sql` empties the column instead (operator, 2026-11-26); `CONCERT_GEAR_MAX_LENGTH` is deleted. Risk: if migrations run before the new Lambda serves, an old Lambda still selecting `gear` fails for that window. Read how pragma applies migrations at deploy (cdk/ and the migrate step) and, if old code can run after the drop, check the repository's projection does not name the column before the drop ships | after slice 2, `grep -rnw gear apps/pragma/api/src apps/pragma/site/src apps/pragma/domain --include=*.ts --include=*.tsx \| grep -v "\.test\."` prints only the `GEAR_ITEM_*` / `gear-items` names this feature adds; `0033_erase_session_gear.sql` holds `UPDATE "session" SET "gear" = NULL` |
| Changes → Records | `gear_item` belongs to one concert | session deletion deletes its items in `deleteSessionWithCascade` (`sessions.repository.ts`, next to `detachTasksOfSessionBeingDeleted`) | controller test "deletes a concert's gear with the concert" |
| Changes → Test strategy | domain at 100%, controller tests, visual validation | see the rows above and the gates | gates 2 to 6 |
| Production strategy, zero defect | failed status change rolls back and shows the error toast | `useUpdateGearItem` restores the previous list in `onError`, as `useUpdateTask` does; the page shows the app's error toast | `gear-items.queries.test.tsx` "restores the list when the write fails" |
| Test seed | previews show a filled page | `api/src/__test/test-seed.service.ts` stops writing `CONCERT_GEAR` and seeds four gear items on the seeded concert, one per status plus one held by the seeded member; the earlier seeded concert stays empty, so "Reprendre" is visible on a new concert | seeded preview shows the four items |
| Vocabulary and invariants | new term | `VOCABULARY.md` gains **Gear item**; `api/src/gear-items/INVARIANTS.md` holds the holder rule, the copy rule and the member release, each with its `Held by` test; `domain/INVARIANTS.md` gains the status order | `grep -n "Gear item" apps/pragma/VOCABULARY.md` |
| Out of scope | day-of tracking, band inventory, gear on practices, reminders, quantities | (out of scope) | none of them has a route, column or string |

### Files to change

Slice 1, API and MCP:

| File | Change |
|---|---|
| `domain/gear-status.core.ts` + `.core.test.ts` | new, the data shape above |
| `domain/input-limits.core.ts` | `GEAR_ITEM_LABEL_MAX_LENGTH = 128` |
| `domain/stale-scope.core.ts` | `gear-items` written root and derived reads |
| `api/src/database/migrations/0032_gear_item.sql` | new |
| `api/src/database/schema.ts` | export `gearItemTable` |
| `api/src/gear-items/gear-items.schema.ts` + `.schema.test.ts` | table, create, update, copy and tool inputs |
| `api/src/gear-items/gear-items.repository.ts` | projection, list by session, insert, update and delete scoped by session, max position, release member, delete by session |
| `api/src/gear-items/gear-items.service.ts` | create, patch, remove, copy, copy source, tool projection, reference resolution |
| `api/src/gear-items/gear-item-tool.core.ts` + `.core.test.ts` | `{ label, holder }` projection and the `holder` reference to `{ status, memberId }` |
| `api/src/gear-items/gear-items.controller.ts` + `.controller.test.ts` | REST routes |
| `api/src/gear-items/gear-items-tools.controller.ts` + `.controller.test.ts` | `save_gear_item`, deletion |
| `api/src/gear-items/INVARIANTS.md` | new |
| `api/src/app.ts` | `.route('/api/gear-items', buildGearItemsRouter())` |
| `api/src/sessions/sessions.repository.ts` | `didClaimConcertWithin`; gear delete in the session cascade |
| `api/src/members/members.repository.ts` | gear release in the member deletion |
| `api/src/sessions/session-tool.core.ts`, `api/src/setlists/setlists-tools.service.ts`, `setlists-tools.controller.ts` | `gear` becomes the item list |
| `api/src/sessions/sessions.schema.ts` | `sessionSaveToolInputSchema` loses `gear` |
| `api/src/mcp/mcp.controller.ts`, `tool-coverage.core.ts`, `tool-coverage.test.ts`, `mcp.controller.test.ts`, `tool-budget.test.ts`, `tool-stale-scope.test.ts` | registration, exclusion, counts and budgets |
| `api/src/__test/test-seed.service.ts` | seeded items |
| `VOCABULARY.md`, `domain/INVARIANTS.md` | new term and rule |

Slice 2, site:

| File | Change |
|---|---|
| `site/src/lib/queries/gear-items.queries.ts` + `.queries.test.tsx` | `gearItemKeys`, list, create (optimistic insert with the device id), update, delete, copy |
| `site/src/lib/queries/query-read-roots.core.ts` | `gear-items` |
| `site/src/routes/sessions/gear-page.core.ts` + `.core.test.ts` | sections, chips, counts, "Moi" |
| `site/src/routes/sessions/SessionGearPage.tsx` + `.test.tsx` | the page |
| `site/src/components/organisms/GearItemSheet.tsx` + `.test.tsx` | add and edit sheet |
| `site/src/App.tsx` | route |
| `site/src/components/organisms/ConcertReadView.tsx`, `SessionDetail.tsx` | summary card |
| `site/src/components/organisms/ConcertEditForm.tsx`, `CreateSessionDialog.tsx`, `site/src/lib/queries/optimistic-session.core.ts` | stop writing `gear` |
| `api/src/sessions/sessions.schema.ts`, `sessions.core.ts`, `sessions.service.ts`, `sessions.repository.ts` and their tests | stop reading and writing `gear` |
| `domain/input-limits.core.ts` | delete `CONCERT_GEAR_MAX_LENGTH` |
| `site/src/i18n/en.json`, `fr.json` | `gear.*` keys: title, the three statuses, chips, "Moi", "Reprendre {{venue}} · {{count}}", add, save, delete, empty, labels of the summary card |

## Decisions the plan took

- **Routes nest under the concert, under their own root.** `/api/gear-items/:sessionId/...` makes "an item of another concert" a plain 404, and the root `gear-items` invalidates only gear queries. Nesting under `/api/sessions` would make every gear tap invalidate every session read.
- **The device chooses the item id**, as `band_link` does. The optimistic row and the stored row share one id, so a retried create does not duplicate.
- **Copy refuses a concert that already holds items** (`409 gear-not-empty`). A double tap on "Reprendre" cannot copy twice.
- **"Reprendre" has no MCP tool.** It is one tap on the page. An assistant adds items with `save_gear_item`. This keeps the tool list at one new tool.
- **Editing and deleting an item.** The canvas draws neither. Use case 2 says copied items are "to be adjusted", and a typo or an item the band no longer brings needs a way out. A tap on an item's label opens the add sheet filled in, with a delete button. This is the default the plan took, to be checked on the preview, like the spec's "Reprendre" default. It is the one visible addition beyond the artboards.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| An item stored as `have` without a member, or a member on `to_find` | high | `isGearHoldingValid` refines every write; update takes `status` and `memberId` together; copy and member release write valid pairs | controller tests named above; `APP=pragma scripts/db-read.sh "SELECT count(*) FROM gear_item WHERE (status = 'have') <> (member_id IS NOT NULL)"` returns 0 |
| DSQL optimistic concurrency aborts a write that claims a member or the concert | medium | claims run inside `runInOneGearItemTransaction`, which the database client retries as for tasks | the tasks-style "loses a conflict" controller tests; Sentry on the route |
| Two creates at once get the same `position` | low | order by `position`, then `label`, then `id`, so the order is stable | `gear-page.core.test.ts` pins the tie break |
| A stale installed PWA still sends `gear` on a concert save after slice 2, and the strict schema answers 400 | low | none beyond the service worker's update; `gear` leaves the strict schema on purpose, since keeping it would keep writing it | wide events show `PUT /api/sessions/:id` 400s with a `gear` key; the member reloads |
| The tool list grows past `TOOL_LIST_CHARACTERS_MAX` (19,000) | medium | one tool, a one-sentence description, `save_session` loses its `gear` field | `tool-budget.test.ts` fails; the fix is shorter text, never a higher budget (operator decides a budget) |
| A gear write does not refresh another member's open page | medium | `gear-items` written root and derived reads in `stale-scope.core.ts`; the site query key root `gear-items` | `stale-scope-coverage.test.ts` and `query-key-roots.test.ts` fail when a root is missing; visual-validation row with two tabs |
| Deleting a member or a concert leaves orphan or invalid items | medium | release and delete run inside the existing deletion transactions | controller tests named above |
| "Reprendre" copies from the wrong concert | medium | `selectGearCopySource` picks the latest concert dated strictly before the target that holds items; the button names it ("Reprendre Akanaboum · 11") | domain tests for ties, later concerts and empty ones |
| Akanaboum's free text gets lost or migrated by accident | low | no migration touches `session.gear`; the Drizzle column stays declared | `git diff main -- apps/pragma/api/src/database/migrations` shows only `0032_gear_item.sql`, with no `session` statement |
| The summary card makes the Details tab fetch gear on every session | low | the card's query runs only when `session.kind === 'concert'` | `SessionDetailPage.test.tsx` asserts no gear request for a practice |

## Code-quality self-check

- [x] Type assertions are only `as const` and `as unknown`. Rows are parsed with `z.enum(GEAR_STATUSES)` as `tasks.repository.ts` does.
- [x] No `any`.
- [x] No abbreviations or one-letter locals outside trivial loop indices.
- [x] Magic numbers and strings extracted to named constants (`GEAR_ITEM_LABEL_MAX_LENGTH`, the page size of the tool, the error codes).
- [x] No prose comments, except the SQL header of the migration, which every migration carries.
- [x] Function names describe the result (`nextGearHoldingAfterTap`, `selectGearCopySource`, `releaseGearOfDeletedMember`).
- [x] Conventional-commit scope `pragma`.
- [x] Every pure helper is a `.core.ts` with a sibling test at 100%: `domain/gear-status.core.ts`, `api/src/gear-items/gear-item-tool.core.ts`, `site/src/routes/sessions/gear-page.core.ts`.
- [x] Every new file carries `// @FollowsBlueprint <id>` from `.claude/skills/blueprint/blueprint-index.md` (ids named in the rows above, plus `schema-table-and-input`, `repository-projection`, `repository-owned-transaction`, `service-crud-update`, `controller-dispatch`, `query-module`, `query-optimistic-insert`, `query-optimistic-mutation`).
- [x] Visible text goes through `en.json` and `fr.json`; the page works at 375 px, mobile first.
- [x] No `useEffect`; the filter and "Moi" state live in the page component.

## Pre-flight gates

Run from `apps/pragma`, in order, before push. Each was run on the base tree on 2026-11-25 and passed (build in 7.2 s; the four core files 20 tests; the four back-e2e files 30 tests). `tool-coverage.test.ts`, `stale-scope-coverage.test.ts` and `derived-read-roots.test.ts` sit in the `core` project, not `back-e2e`.

1. `pnpm --filter @borso-app/pragma build`.
2. `npx vitest run --project core domain/gear-status.core.test.ts api/src/gear-items/gear-item-tool.core.test.ts api/src/gear-items/gear-items.schema.test.ts site/src/routes/sessions/gear-page.core.test.ts --coverage --coverage.include=domain/gear-status.core.ts --coverage.include=api/src/gear-items/gear-item-tool.core.ts --coverage.include=site/src/routes/sessions/gear-page.core.ts` at 100%.
3. `npx vitest run --project core api/src/mcp/tool-coverage.test.ts api/src/realtime/stale-scope-coverage.test.ts api/src/realtime/derived-read-roots.test.ts site/src/lib/queries/query-key-roots.test.ts`.
4. `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) npx vitest run --project back-e2e --project back-e2e-assistants api/src/gear-items api/src/sessions/sessions.controller.test.ts api/src/members api/src/mcp/mcp.controller.test.ts api/src/mcp/tool-stale-scope.test.ts api/src/mcp/tool-budget.test.ts`.
5. Slice 2 only: `npx vitest run --project core site/src/routes/sessions site/src/components/organisms/GearItemSheet.test.tsx site/src/lib/queries/gear-items.queries.test.tsx site/src/i18n`.
6. Slice 2 only: the `grep -rnw gear` self-check of the `session.gear` row prints only the lines it names.
7. `/visual-validation docs/features/pragma/concert-gear-checklist/spec/spec.md` at 375 px, after slice 2.
8. `/technical-validation docs/features/pragma/concert-gear-checklist/spec/spec.md`.
9. `human:` the operator checks on the preview the copy default and the edit and delete sheet.

## Open questions / unknowns

- None block implementation. The edit and delete sheet is a default the plan took (see *Decisions the plan took*); the pull request asks the operator to confirm it on the preview.
- The tool list's headroom under 19,000 characters is unknown. A scratch measure of `{ name, description, inputSchema }` gave 22,044 characters (measured), which is not the shape `listTools` returns. Gate 4 settles it.

## Missing technical skills

- No `/database` or `/dsql` skill: the claim-in-transaction pattern and the plain `CREATE INDEX` the runner rewrites to `ASYNC` were read off `tasks.repository.ts` and migration `0017`.
- No `/mcp-tools` skill: the tool budget, coverage exclusions and stale-scope tests were found by reading `api/src/mcp/`.
