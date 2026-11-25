---
status: done
summary: >-
  Slice 2 is done. A concert's gear has its own page at /sessions/:id/gear, laid out as A + C.
  It has status sections, counted chips, a Moi chip, tap-to-cycle on the mark, an add and edit sheet
  with delete, and Reprendre on an empty list. The Details tab's gear card is now a summary card
  that opens the page. The free-text gear field is gone from the forms, the REST schemas, the
  projection, the optimistic builder and the Drizzle schema, and CONCERT_GEAR_MAX_LENGTH is
  deleted. No migration drops session.gear, because DSQL refuses DROP COLUMN, so the column
  stays in the table and nothing reads it. Dropping it would mean rebuilding the session table
  in production, which is an irreversible operator call. Gates passed: the typecheck, oxlint
  --type-aware, oxfmt --check, 183 core files changed since main, 16 back-e2e files, the build,
  and the gear grep. Screenshots at 375 px were checked by eye.
artifacts:
  - apps/pragma/site/src/routes/sessions/SessionGearPage.tsx
  - apps/pragma/site/src/routes/sessions/SessionGearPage.test.tsx
  - apps/pragma/site/src/routes/sessions/gear-page.core.ts
  - apps/pragma/site/src/routes/sessions/gear-page.core.test.ts
  - apps/pragma/site/src/components/organisms/GearItemSheet.tsx
  - apps/pragma/site/src/components/organisms/GearItemSheet.test.tsx
  - apps/pragma/site/src/components/organisms/ConcertGearCard.tsx
  - apps/pragma/site/src/components/organisms/ConcertReadView.tsx
  - apps/pragma/site/src/components/organisms/SessionDetail.tsx
  - apps/pragma/site/src/components/organisms/ConcertEditForm.tsx
  - apps/pragma/site/src/components/organisms/CreateSessionDialog.tsx
  - apps/pragma/site/src/components/atoms/InterfaceGlyphs.tsx
  - apps/pragma/site/src/lib/queries/gear-items.queries.ts
  - apps/pragma/site/src/lib/queries/gear-items.queries.test.tsx
  - apps/pragma/site/src/lib/queries/query-read-roots.core.ts
  - apps/pragma/site/src/lib/queries/optimistic-session.core.ts
  - apps/pragma/site/src/App.tsx
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/api/src/sessions/sessions.schema.ts
  - apps/pragma/api/src/sessions/sessions.core.ts
  - apps/pragma/api/src/sessions/sessions.service.ts
  - apps/pragma/api/src/sessions/sessions.repository.ts
  - apps/pragma/domain/input-limits.core.ts
  - apps/pragma/VOCABULARY.md
  - apps/pragma/api/src/sessions/INVARIANTS.md
  - apps/pragma/site/src/routes/sessions/INVARIANTS.md
next:
  kind: validate
---

# Implementation, slice 2: site gear page, summary card, i18n and session.gear removal

## Goal and data shape

Goal: a week before a concert, members see which gear the band has, has asked the venue for, or
still has to find, on one page per concert. The page replaces the free-text gear field.

Smallest change: one query module over the slice 1 routes, one pure view projection, one page,
one sheet, a summary card, and the removal of `gear` from every concert path.

Data shape:

- `gearItemKeys.checklist(sessionId)` caches `{ items: GearItem[], copySource }` from
  `GET /api/gear-items/:sessionId`.
- `selectGearPageView(items, { filter, isMineOnly, memberId })` returns
  `{ counts: Record<'all' | GearStatus, number>, sections: { status, items }[] }`. Sections follow
  `GEAR_STATUSES`, empty ones are dropped, and counts follow the Moi scope.
- `selectGearFilterChips`, `GEAR_STATUS_LABEL_KEY` and `GEAR_STATUS_ICON` give literal i18n keys
  and icon names. `selectGearSummary` returns null for an empty or unloaded list.
  `selectOfferedCopySource` returns the copy source on an empty list only.
- The sheet's holder radio is keyed by `gearHoldingChoiceKey`, the member id or the status.
  `readGearHoldingChoice` turns it back into a valid `GearHolding`.

## Decisions taken here

- **The column is not dropped.** Directive 8 and the plan ask for a generated migration that
  drops `session.gear`. DSQL refuses `DROP COLUMN`. This is recorded in
  `docs/knowledge/dsql-postgres-compat-gaps.md` §10, and migrations 0006, 0027 and 0031 work
  around it. The Drizzle schema no longer declares `gear`, every read and write is gone, and no
  migration was added. The only way to remove the column is to rebuild `session` in production:
  copy the rows, drop the table and rename the copy. That is irreversible and not reversible
  work, so it is left as a question for the operator. Members see no difference either way.
- **The card owns its query.** `ConcertGearCard` (organism-query-owning) is passed to
  `ConcertReadView` as a node. This keeps `SessionDetail` under the 300-line gate. The gear read
  fires only when a concert's Details tab renders, and a practice never requests it. A test holds
  that rule.
- **Add is a bottom action, not a floating button.** It uses `BottomActions` with a primary
  "Add an item", the repository's version of the canvas's floating button.
- **Status icons.** Two glyphs join the icon registry: `pending`, an empty circle for to find,
  and `venue`, a building for asked of the venue.
- **English copy.** "I have it" for J'ai, "Reuse {{source}} · {{count}}" for Reprendre, and "Me"
  for Moi. `gear.item` reads "Item" in both languages and is listed as identical by design.

## Gates

- `pnpm run typecheck`: passed.
- `oxlint --type-aware` on every changed file: exit 0.
- `oxfmt --check site/src api/src domain test`: passed.
- `vitest --project core --changed origin/main`: 183 files, 1325 tests passed.
- `gear-page.core.ts` at 100% statements, branches, functions and lines.
- back-e2e and back-e2e-assistants over `api/src/sessions`, `api/src/audience`,
  `api/src/gear-items`, `api/src/__test`, `api/src/members`, `api/src/setlists` and the three MCP
  files: 16 files, 160 tests passed.
- `pnpm run build`: passed.
- The gear grep prints only the gear item names this feature adds.
- At 375 px against the seeded local server, the Details summary card, the gear page and a tap
  that moved Multiprise to the venue were screenshotted and checked by eye. The add sheet was
  checked the same way. `broken-images.sh` exited 0.
