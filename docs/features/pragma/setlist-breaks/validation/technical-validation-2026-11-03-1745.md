# Technical validation — Setlist breaks

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (missing)
- Branch: claude/friendly-cray-ovcmqo
- Base: origin/main
- Run at: 2026-11-03T17:57:58Z
- Round: 1
- Reviewed: e6b644ddd5a55d41a1a31a2f350f07a3ae091956
- Touched workspaces: @borso-app/pragma (api, site, domain, test)

The spec has no *Q.O.D.*, *Changes / Files to change*, *Use cases / edge cases* or *Test strategy* section. Categories A and D are built from its *Behaviour* and *Data shape* bullets, walked in order, and the file list comes from the diff. 0 use cases routed to /visual-validation, because the spec routes none; every bullet below is in scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan, Changes | The plan exists and the spec lists the files to change | `docs/features/pragma/setlist-breaks/plan/plan.md` | File absent. The spec has no Files-to-change list either, so the files below come from the diff and nobody planned them | UNVERIFIABLE |
| A01 | Behaviour 1 | A member adds a break from a song's more menu, with **Add a break after** | apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:57-65, 123 | `label: t('setlist.break.addAfter'), icon: 'pause', … onSelect: () => onAddBreakAfter(props.entryId)` then `...addBreakItems,` in the `Menu` items | PASS |
| A02 | Behaviour 1 | The break appears right under that song | apps/pragma/api/src/setlists/setlist-break.core.ts:49-56; setlist-break.service.ts:57-66 | `const anchorIndex = itemIds.indexOf(anchorId); … return itemIds.toSpliced(anchorIndex + 1, 0, breakId);` | PASS |
| A03 | Behaviour 2 | Free label up to 80 characters | apps/pragma/domain/input-limits.core.ts:24; api/src/setlists/setlists.schema.ts:80 | `SETLIST_BREAK_LABEL_MAX_LENGTH = 80`; `z.string().trim().max(SETLIST_BREAK_LABEL_MAX_LENGTH)` | PASS |
| A04 | Behaviour 2 | An empty label reads as **Break** | site/src/components/organisms/SetlistBreakRow.tsx:36; setlist-breaks.utils.ts `selectBreakTitle`; en.json `"placeholder": "Break"`, `"orderTitle": "Break"` | `placeholder={t('setlist.break.placeholder')}`; `return label === '' ? unnamedTitle : label;` | PASS |
| A05 | Behaviour 2 | Edited in place, leaving the field saves it | SetlistBreakRow.tsx:40-43 | `onBlur={(event) => { const changedLabel = selectChangedLabel(event.currentTarget.value, label); if (changedLabel !== null) onRename(changedLabel);` | PASS |
| A06 | Behaviour 3 | A member removes a break from its own more menu | SetlistBreakRow.tsx:49-55 | `label: t('setlist.break.remove'), icon: 'trash', tone: 'danger', onSelect: onRemove` | PASS |
| A07 | Behaviour 4 | On the Order page a break is one more draggable row with no number, energy or length, and the curve and total ignore it | site/src/components/organisms/SetlistOrderList.tsx:85-89, 138; setlist-breaks.utils.ts `toOrderRows` | `const songRows = rows.filter((row) => !isBreakLine(row));` `buildEnergyBars(arrangeByIds(songRows, curveIds))` `sumKnownDurations(songRows.map(…))`; break branch renders the pause icon and title only | PASS |
| A08 | Behaviour 5 | Song numbers count songs only (site and `get_setlist`) | SetlistEntriesList.tsx:110; SetlistOrderList.tsx:138; api/src/setlists/setlist-tool.core.ts:73-77 | `position={… fullIndex + 1}` over `props.entries`; `position={songRows.indexOf(row) + 1}`; `.map((entry, songIndex) => … position: songIndex + FIRST_POSITION` | PASS |
| A09 | Behaviour 5 | A break never shifts a song number the assistant is shown | api/src/setlists/setlist-tool.core.ts:114 | `hint: \`#${String(entry.position + FIRST_POSITION)}\`` reads the raw shared position. Failing case: setlist `Creep, [break], Karma Police, Creep`; an assistant names the entry `"Creep"` in `save_setlist_break` or `remove_setlist_entries` → the ambiguity refusal lists `{"id":"e1","hint":"#1"},{"id":"e3","hint":"#4"}`, while `get_setlist` numbers the second Creep 3 (reproduced with `matchEntryReference` and `projectEntriesForTool` under tsx). Introduced: this branch, since breaks are what open the gap. Fix size: one line (number by index in the sorted entries) | FAIL (blocking) |
| A10 | Behaviour 6 | The transition note is not offered across a break | SetlistEntriesList.tsx:78 | `if (props.inFilteredMode \|\| breaksBySongsBefore.has(fullIndex)) return null;` | PASS |
| A11 | Behaviour 7 | **My part** and **Lineup** show songs only | SetlistEntriesList.tsx:63; SetlistViewContent.tsx (untouched) | `props.inFilteredMode ? NO_BREAK : (props.breaks ?? NO_BREAK)`; the lineup grid is built from entries only | PASS |
| A12 | Behaviour 7 | My part shows songs only, so it should offer nothing that adds a break | SetlistEntriesList.tsx:125 | `onAddBreakAfter={props.onAddBreakAfter}` is passed whatever `inFilteredMode` is. Failing case: in the **My part** view, a member opens a song's more menu, taps **Add a break after** → `POST /breaks` creates a break that this view never shows, so the tap looks like it did nothing. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| A13 | Behaviour 8 | `get_setlist` reads breaks, each placed after `afterSongCount` songs | api/src/setlists/setlists-tools.service.ts:117-120 | `breaks: breaks.map((setlistBreak) => ({ breakId: …, label: …, afterSongCount: setlistBreak.songsBefore,` | PASS |
| A14 | Behaviour 8 | `save_setlist_break` adds, renames or removes | setlists-tools.controller.ts (`save_setlist_break`); setlist-tool.core.ts `selectBreakToolAction`; setlists-tools.service.ts `saveBreakForTool` | `if (action.kind === 'remove') return await removeBreakForTool(…); if (action.kind === 'rename') return await renameBreakForTool(…); const afterEntryId = await resolveEntryId(setlistId, action.after);` | PASS |
| A15 | Data shape 1 | New table `setlist_break` (`id`, `setlist_id`, `position`, `label NOT NULL DEFAULT ''`) | api/src/database/migrations/0023_setlist_breaks.sql:8-13; setlists.schema.ts `setlistBreakTable` | `"label" text DEFAULT '' NOT NULL` | PASS |
| A16 | Data shape 2 | Every append takes the position after the last item | setlist-break.core.ts:72-76; used at setlist-entry.service.ts:43, 76, setlists-tools.service.ts:227, setlists.service.ts:171 | `const last = items.at(-1); return last === undefined ? FIRST_POSITION : last.position + 1;` | PASS |
| A17 | Data shape 2 | Every delete compacts songs and breaks into one gapless run | setlist-position.service.ts `compactItemsWithin`; called from both entry removals and `removeBreakAndCompact` | `const runningOrder = await listItemsWithin(executor, setlistId); await writeItemOrderWithin(executor, runningOrder, runningOrder.map((item) => item.id));` | PASS |
| A18 | Data shape 3 | `PUT /reorder` takes every id, or the song ids only, and then each break keeps its slot | setlist-break.core.ts:33-45 | `if (isReorderOfTheSameIds(itemIds, requestedIds)) return [...requestedIds]; … if (item.kind === 'break') arranged.splice(slot, 0, item.id);` | PASS |
| A19 | Data shape 3 | "so the undo of a removal … need[s] no change" | setlist-break.core.ts:41-43; site/src/lib/queries/setlist-entries.queries.ts:217-221 | The undo re-appends the song, then sends the song ids only, so each break keeps its *current* slot, and the removal already moved it one slot up. Failing case: setlist `A, B, [break], C`; remove B; tap **Undo** → `A, [break], B, C`, where the break followed B before the removal (reproduced: `arrangeReorder(mergeSetlistItems(A@0, C@2, B@3; break@1), [A, B, C])` → `['A','break','B','C']`). When B is the last song before a trailing break (`A, B, [break]`), `placeRestoredEntry` skips the reorder (`if (placedIds.at(-1) === restoredId) return …`) and the result is `A, [break], B`. The spec's premise is false; either the undo sends the full item order or the spec drops the claim. Introduced: this branch. Fix size: one file | FAIL (blocking) |
| A20 | Data shape 4 | `GET /breaks` answers each break with `songsBefore` | setlist-break.service.ts:34-38; setlist-break.core.ts `countSongsBeforeEachBreak` | `breaks.map((row) => ({ ...row, songsBefore: songsBefore.get(row.id) ?? 0 }))` | PASS |
| A21 | Data shape 5 | POST, PUT and DELETE answer the fresh break list, which the site writes into its cache | setlists.controller.ts:276, 288, 298; site/src/lib/queries/setlist-breaks.queries.ts:34 | `context.json({ setlistBreak: inserted.setlistBreak, breaks: inserted.breaks }, 201)`; `queryClient.setQueryData<BreaksCache>(setlistKeys.breaksOf(variables.setlistId), { breaks: data.breaks })` | PASS |
| A22 | Data shape 6 | Closing a vote drops the setlist's breaks | api/src/setlists/voting.repository.ts:97 | `await transaction.delete(setlistBreakTable).where(eq(setlistBreakTable.setlistId, setlistId));` | PASS |
| A23 | Out of scope | Practice view, session preview and the copied running order stay songs only | site/src/routes/setlists/SetlistOrderPage.tsx:53 | `useCopySetlistOrder(setlistEntries, songsById)` takes entries only; practice files are untouched by the diff | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <22 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B03 | knip (no unused exports) | `pnpm knip` | exit 1: `Unused exports (1) deleteBreaksOfSetlistWithin function apps/pragma/api/src/setlists/setlist-break.repository.ts:68:23`. The CI knip gate fails on this branch. Introduced: this branch. Fix size: one function (delete it) | FAIL (blocking) |
| B04 | No `any` | `grep -nP '\bany\b'` on changed sources | none found | PASS |
| B05 | Type assertions only `as const` / `as unknown` | grep ` as [A-Z{]` on changed sources | none found; `BREAK_PROJECTION = {…} as const` only | PASS |
| B06 | `noUncheckedIndexedAccess` | grep indexed access on changed sources | every `const [row] = …` is followed by `if (row === undefined)` or `row ?? null`; `POSITION_WRITERS[kind]` is a `Record<SetlistItemKind, …>` lookup | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed .ts/.tsx | none found | PASS |
| B08 | Magic numbers and strings named | read in full | `SETLIST_BREAK_LABEL_MAX_LENGTH`, `FIRST_POSITION`, `SONG_ID_FALLBACK_LENGTH`, `BREAK_WRITE_SCOPE` | PASS |
| B09 | Names carry intent, from the vocabulary | sampled `mergeSetlistItems`, `arrangeReorder`, `placeBreakAfter`, `countSongsBeforeEachBreak`, `withdrawSongFromBreaks` | `const pauses = breaks.map((row): SetlistItem => ({ ...row, kind: 'break' }));` at api/src/setlists/setlist-break.core.ts:27 names a **setlist break** "pause", a word the VOCABULARY entry does not define. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B10 | Standards checklist (02): "the choice between `.core.ts` and `.utils.ts`" | read in full | apps/pragma/site/src/components/organisms/setlist-breaks.utils.ts holds `groupBreaksBySongsBefore`, `interleaveBreaks`, `withdrawSongFromBreaks`, `toOrderRows`, names a product manager recognises, so 02 says `.core.ts` (its neighbours `setlist-filter.core.ts` and `lineup-grid.core.ts` do so). Introduced: this branch. Fix size: one file rename plus 5 import sites | FAIL (non-blocking) |
| B11 | Standards checklist (03): "a derived type is derived … a request body from `z.infer`" | read in full | `export interface BreakToolRequest { readonly break?: string \| undefined; readonly after?: …; readonly label?: …; readonly remove?: … }` at api/src/setlists/setlist-tool.core.ts:201 restates `setlistBreakSaveToolInputSchema` by hand. Core files already import schema types (`oauth.core.ts:6`). Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B12 | Standards checklist (04, 11): "a multi-table write is wrapped in one transaction owned by the service" | read in full | `insertBreak` and `removeBreakAndCompact` own their transaction in setlist-break.service.ts. The branch adds a third table to transactions owned by repositories: `await transaction.delete(setlistBreakTable)…` at voting.repository.ts:97 and setlists.repository.ts:152. Introduced: pre-existing shape, extended by this branch. Fix size: 2 call sites | FAIL (non-blocking) |
| B13 | Standards checklist (01): "an invariant promising behaviour carries a `Held by:` line" | read apps/pragma/VOCABULARY.md in full | `- Deleting the setlist or closing its vote deletes its breaks.` under **Setlist break**: the `Held by:` lines cover setlist deletion only, and no test holds the vote-close half (see D21). `- Inserted right after a named entry …, in the same claimed transaction as any other write to the setlist.` has no `Held by:` (see E07). Introduced: this branch. Fix size: two lines plus the tests | FAIL (non-blocking) |
| B14 | Standards checklist (01): VOCABULARY definitions still true; comments say what code cannot | read in full | The rewritten **Setlist entry** bullets (`selectNextItemPosition`, `arrangeReorder`) match the code. The migration comment explains the DSQL `NOT NULL` constraint, which the SQL cannot say | PASS |
| B15 | Standards checklist (06): a mutation reconciles from its response | read in full | all three break mutations `onSuccess: useSettleBreaksFromResponse()` write `data.breaks`; no refetch | PASS |
| B16 | Standards checklist (09): key path names screen and element | en.json / fr.json | `setlist.break.addAfter`, `setlist.break.label`, `setlist.break.placeholder`, `setlist.break.actions`, `setlist.break.remove`, `setlist.break.orderTitle`, `setlist.failure.break`, present in both catalogues | PASS |
| B17 | Standards checklist (11): a cascade DSQL will not enforce is written out | read in full | setlist deletion and vote close both delete `setlist_break` rows explicitly | PASS |
| B18 | Standards checklist (05, 10): no boolean prop family; test names state behaviour and condition; e2e asserts on the database | read in full | `SetlistEntriesList` gains four optional break props, none boolean; the e2e test at setlist-breaks.controller.test.ts:208 reads `setlistBreakTable` positions | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed origin/main --coverage --coverage.reportsDirectory=<scratchpad>/coverage` | 0: 90 files, 628 tests; coverage 100% statements (225/225), branches (70/70), functions (64/64), lines (190/190) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm run test:e2e --changed origin/main` (from apps/pragma) | 0: 44 files, 413 tests; verbose re-run confirmed the 8 tests in setlist-breaks.controller.test.ts and the break test in setlists-tools.controller.test.ts ran and passed | PASS |
| C03 | `*.utils.ts` / `*.core.ts` siblings | enumerate new pure files | `setlist-breaks.utils.ts` → `setlist-breaks.utils.test.ts`; `setlist-break.core.ts` → `setlist-break.core.test.ts`; `setlist-tool.core.ts` → `setlist-tool.core.test.ts`; all picked up by the core project at 100% | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Add a break from a song's more menu | `it('offers to add a break after the song only when the list can take one')` at site/src/components/organisms/SetlistEntryRow.test.tsx:116; `expect(onAddBreakAfter).toHaveBeenCalledExactlyOnceWith('entry-1')` | PASS |
| D02 | The break appears right under that song | `it('places a break after the song it names, …')` at api/src/setlists/setlist-breaks.controller.test.ts:105; `expect(await readOrder(…)).toEqual([entryIds[0], setlistBreak.id, entryIds[1], entryIds[2]])` | PASS |
| D03 | Label up to 80 characters | `it('renames a break, and refuses a label past the limit')` at setlist-breaks.controller.test.ts:239; `body: { label: 'x'.repeat(81) }` → `expect(tooLong.status).toBe(400)` | PASS |
| D04 | An empty label reads as Break | `it('reads Break until the band names it')` at SetlistBreakRow.test.tsx:28; `expect(input.placeholder).toBe('Break')`; `it('titles an unnamed break with the fallback')` at setlist-breaks.utils.test.ts:76 | PASS |
| D05 | Edited in place; leaving the field saves it | `it('saves the trimmed label when the field loses focus, and only when it changed')` at SetlistBreakRow.test.tsx:34; `expect(onRename).toHaveBeenCalledExactlyOnceWith('Tune the bass')` | PASS |
| D06 | Removed from its own more menu | `it('removes the break from its more menu')` at SetlistBreakRow.test.tsx:45; `expect(onRemove).toHaveBeenCalledOnce()` | PASS |
| D07 | Order page: a break is one more row to drag, with no number and no energy | `it('shows a break as a draggable row with no number, kept out of the curve and the total')` at SetlistOrderList.test.tsx:67; `getAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(4)`, `querySelectorAll('[data-energy-curve] > span')).toHaveLength(ROWS.length)` | PASS |
| D08 | Order page: a break has no length and the total time ignores it | **structural:** `sumKnownDurations(songRows.map((row) => row.durationSeconds))` at SetlistOrderList.tsx:89 sums song rows only; `toOrderRows` gives a break `durationSeconds: null` (setlist-breaks.utils.test.ts:98). The test at SetlistOrderList.test.tsx:67 names the total but asserts nothing about it | PASS |
| D09 | Song numbers count songs only | SetlistOrderList.test.tsx:67 `expect(screen.getByText('03')).toBeTruthy(); expect(screen.queryByText('04')).toBeNull();`; setlist-tool.core.test.ts:109 `expect(projected.map((entry) => entry.position)).toEqual([1, 2])`; setlists-tools.controller.test.ts:377. Editor list: **structural:** `fullIndex + 1` over `props.entries` at SetlistEntriesList.tsx:110. The ambiguity hint of A09 has no test | PASS |
| D10 | The transition note is not offered across a break | (none found). No test renders `SetlistEntriesList` with a break between two songs, and none asserts that `TransitionStrip` is missing there | FAIL (blocking) |
| D11 | The **My part** view shows songs only | (none found). No test renders `SetlistEntriesList` with `inFilteredMode` and breaks | FAIL (blocking) |
| D12 | The **Lineup** view shows songs only | **structural:** `SetlistViewContent` and `buildLineupGrid` read `input.entries` only and the diff does not touch them | PASS |
| D13 | `get_setlist` reads breaks with `afterSongCount` | `it('adds a break after a song by title, reads it back in place, renames it and removes it')` at setlists-tools.controller.test.ts:343; `expect(withBreak.breaks).toEqual([{ breakId, label: 'Intermission', afterSongCount: 2 }])` | PASS |
| D14 | `save_setlist_break` adds, renames, removes | same test; `expect(renamed.body).toEqual({ breakId, label: 'Beer' })`, `expect(removed.body).toEqual({ setlistId, removed: breakId })` | PASS |
| D15 | Every append takes the position after the last item | `it('appends a new song after the last item, past a trailing break')` at setlist-breaks.controller.test.ts:133; `toEqual([...entryIds, setlistBreak.id, appendedId])` | PASS |
| D16 | Every delete compacts songs and breaks into one gapless run | `it('compacts songs and breaks into one gapless run after either is deleted')` at setlist-breaks.controller.test.ts:208; `expect(rows).toEqual([{ position: 1 }])` | PASS |
| D17 | Reorder with every id moves breaks | `it('moves a break when a reorder names it beside the songs')` at setlist-breaks.controller.test.ts:188; `expect(await readOrder(…)).toEqual(moved)` | PASS |
| D18 | Reorder with song ids only keeps each break in its slot | `it('keeps every break in its slot when a reorder names the songs only')` at setlist-breaks.controller.test.ts:164; `toEqual([third, setlistBreak.id, first, second])` | PASS |
| D19 | So the undo of a removal needs no change | (none found). No test removes a song before a break and undoes it, and A19 shows the result is wrong | FAIL (blocking) |
| D20 | `GET /breaks` answers `songsBefore` | setlist-breaks.controller.test.ts:105; `expect(listed.breaks.map((row) => row.songsBefore)).toEqual([1])` | PASS |
| D21 | POST, PUT and DELETE answer the fresh break list | (none found). `singleBreakEnvelope` parses `setlistBreak` only, and the DELETE test reads the `/breaks` list separately. Nothing asserts the `breaks` field the site writes into its cache (setlist-breaks.queries.ts:34) | FAIL (blocking) |
| D22 | Closing a vote drops the setlist's breaks | (none found). `grep -l break apps/pragma/api/src/setlists/voting*.test.ts` returns nothing | FAIL (blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `insertBreak` → `insertBreakWithin` + `writeItemOrderWithin` (setlist-break.service.ts:47-73) | Check-then-write (reads the running order, writes every position) | Held by the setlist-row claim `didClaimSetlistWithin(executor, setlistId)` at setlist-break.service.ts:53, a single `UPDATE setlist … WHERE id … RETURNING` that makes Postgres queue the second writer and makes DSQL abort and retry it (`retryingConflictAborts`) | PASS |
| E02 | `removeBreakAndCompact` → `deleteBreakWithin` + `compactItemsWithin` (setlist-break.service.ts:91-106) | Check-then-write | Same claim at setlist-break.service.ts:97 | PASS |
| E03 | `renameBreak` → `updateBreakLabel` (setlist-break.repository.ts:43-54) | Check-then-write | No prior read. One `UPDATE … SET { label } WHERE id AND setlist_id … RETURNING`, whose empty result is the 404 | PASS |
| E04 | `appendEntry`, `appendSongsWithin`, `appendSongs`, `appendSongToClaimedSetlistWithin` → `nextItemPositionWithin` (setlist-entry.service.ts:43, 76; setlists-tools.service.ts:227; setlists.service.ts:171) | Check-then-write (max position plus one) | Held by the same claim. Concurrent proof: `it('gives each of two entries appended at the same moment a position of its own')` at setlists.controller.test.ts:189 (`Promise.all`), which now runs through `nextItemPositionWithin` and passed in C02 | PASS |
| E05 | `reorderEntries` → `arrangeReorder` + `writeItemOrderWithin` (setlist-entry.service.ts) | Check-then-write | Held by the claim. Concurrent proof at setlists.controller.test.ts:210 and :243 | PASS |
| E06 | Module-level state in changed api files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` over changed api files: none. `POSITION_WRITERS` is a constant table of functions | PASS |
| E07 | Break writes racing appends, reorders and other break writes | Concurrent proof | No back-e2e test fires `POST /setlists/:id/breaks` together with `POST /setlists/:id/entries`, a reorder or a second `POST /breaks`. Failing case for the proof: send `POST /breaks {afterEntryId: A}` and `POST /entries {songId}` on one setlist in one `Promise.all`; nothing asserts that the positions of `setlist_entry ∪ setlist_break` stay distinct and gapless. The claim is the same function E04 proves, but a different write path. Introduced: this branch. Fix size: one test | FAIL (blocking) |

## Blocking findings

- A09: the MCP ambiguity hint `#N` (setlist-tool.core.ts:114) counts breaks, so a song after a break gets a number `get_setlist` does not use.
- A19: undoing a song removal moves the following break one song earlier, because the undo's song-only reorder keeps the post-removal slot. The spec's "undo needs no change" is false.
- B03: `pnpm knip` fails on the unused export `deleteBreaksOfSetlistWithin` (setlist-break.repository.ts:68).
- D10: no test proves the transition note is hidden across a break.
- D11: no test proves the My part view hides breaks.
- D19: no test covers undoing a removal with a break in the setlist.
- D21: no test asserts the `breaks` list in the POST, PUT and DELETE responses.
- D22: no test proves closing a vote drops breaks.
- E07: no concurrent back-e2e test covers break writes against appends or reorders.

## Non-blocking findings

- A12: **Add a break after** is offered in the My part view, where the new break stays invisible.
- B09: `pauses` at setlist-break.core.ts:27 uses a word the vocabulary does not define.
- B10: `setlist-breaks.utils.ts` holds domain rules and should be `setlist-breaks.core.ts`.
- B11: `BreakToolRequest` (setlist-tool.core.ts:201) restates the Zod schema by hand.
- B12: vote close and setlist deletion write `setlist_break` inside repository-owned transactions.
- B13: two **Setlist break** invariants in VOCABULARY.md have no `Held by:` line.

## Notes

- A00 UNVERIFIABLE: `plan/plan.md` is absent, and the spec has no Q.O.D., Files-to-change, Use-cases or Test-strategy section. Rows were built from the Behaviour and Data shape bullets. Run `/technical-conception` for the plan, and `/specification` to add a Test strategy that routes the DOM assertions (D07, D10, D11) between this validator and `/visual-validation`.
- Should closing a vote race a concurrent `POST /breaks` safely? `replaceEntriesWithProposal` (voting.repository.ts:95-107) deletes breaks before it writes the setlist row and never claims it first. On local Postgres (read committed), a break inserted between that delete and the commit survives the close. On DSQL, both transactions write the setlist row, so one aborts, and this transaction is not wrapped in `retryingConflictAborts`, so the vote close would answer 500. Can a voting setlist take breaks at all? If not, the race cannot happen.
- Should `get_setlist` keep attaching a transition comment between two songs a break separates? `attachTransitionComments` ignores breaks, while the site hides that transition (A10). The spec's bullet speaks of the site only.
- `insertBreak` is marked `// @FollowsBlueprint service-crud-update` though it inserts; `setlist-position.service.ts`, `setlist-break-tools.service.ts` and `setlist-breaks.hook.ts` carry no blueprint marker. Neighbouring files (`setlists-tools.service.ts`) carry none either, so this is not a row.
- `GET /setlists/:id/breaks` for an unknown setlist answers `200 { breaks: [] }` rather than 404. Does the site rely on this?
- C01 needed `--coverage.reportsDirectory` pointed at the scratchpad; the default `coverage/.tmp` raised ENOENT, likely because another run shared it (logged to kaizen).

## Verdict: FAIL
