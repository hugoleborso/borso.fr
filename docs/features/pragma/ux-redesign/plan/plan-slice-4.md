# Plan: pragma UX redesign, slice 4 (Add songs and Order)

> Pair with [`../spec/spec.md`](../spec/spec.md) and the earlier plans in this folder. Short on purpose: the spec carries the decisions, and this file says where each one lands.

Branch `claude/pragma-ux-redesign-slice-4`, stacked on slice 3. It delivers what the spec's *Slices* section gives slice 4: the **Add songs** sheet with multi-select, the music service's results and **New song as an idea**; the batch add route (Q5); the **Order** screen with the energy curve and **Copy order**; and the pill strip on the setlist (**Add songs** and **Order**).

No database change, no new dependency, so no ADR is triggered. The batch route is new on the API, which Q5 already decided. Paths are relative to `apps/pragma/site/src/` unless they start with `apps/` or `api/`.

## How each spec decision becomes code

| Spec decision | File | Change | Blueprint |
| --- | --- | --- | --- |
| Q5: one route adds a list of songs in one transaction, in pick order, all or nothing | `api/src/setlists/setlists.schema.ts`, `setlists.service.ts`, `setlists.controller.ts`, `setlist-entry.repository.ts` | `POST /api/setlists/:id/entries/batch` with `{ songIds }` (1 to `SETLIST_BATCH_ADD_MAX`, no duplicate). The service claims the setlist, then claims every song with `didClaimSongWithin`; when one is missing it writes nothing and answers `song-not-found`; otherwise it inserts the entries from the current count, in the order given, and notifies the band once. Energy stays empty, so each entry follows its song's energy | `schema-table-and-input`, `service-crud-update` shape, `controller-dispatch` |
| Batch add on the site, settled from its own response | `lib/queries/setlist-entries.queries.ts`, `lib/queries/setlists.utils.ts` | `useAddSetlistEntries`: optimistic rows under temporary ids, swapped for the response rows in `onSuccess`, rolled back in `onError`, no refetch | `query-optimistic-insert`, `utils-settle-temporary-entity` |
| Add songs sheet: search focused on opening, chips (Not in this setlist by default, Concert ready, Rehearsed, To learn, Ideas), cover, title, artist, check box, pick number, songs already in the setlist dimmed with "Already in this setlist · 05" | `organisms/SetlistSongPicker.tsx` (rewritten), new `organisms/add-songs.core.ts` replacing `song-picker.core.ts` | The core filters and orders the rows, numbers the picks, marks the songs already in the setlist and says when to offer the music service. The sheet holds the picks in one `useState` and writes nothing before **Add N songs** | `organism-query-owning`, `core-view-projection` |
| A typed title with no match lists the music service's results and always offers **New song as an idea**; picking either creates the song and checks it | `organisms/SetlistSongPicker.tsx` | `useSongSearch` on the debounced title; a result creates the song with its title, artist, album cover, duration and track id (status `idea`); a track already in the catalogue checks that song through `selectSongSaveRefusal`; **New song as an idea** creates it with the title only | `organism-query-owning` |
| Footer "Added at the end, in the order picked" and **Add 3 songs** (`plus`); a failure keeps the sheet open with the picks and an error line | `organisms/SetlistSongPicker.tsx`, `observability/error-reporting.adapter.ts` | `reportSetlistBatchAddFailed` (`SetlistBatchAddError`, tagged with the setlist id) beside `reportEntryNoteSaveFailed` | existing adapter shape |
| Pill strip: **Add songs** (primary, `plus`) and **Order** (secondary, `reorder`), the list ending on a blank numbered line "13 · Add songs", which is also the empty state | `organisms/SetlistEditor.tsx`, `organisms/SetlistEntriesList.tsx`, `organisms/SetlistViewContent.tsx` | The Songs view no longer drags: the drag handle and the dnd-kit context leave the rows, because the Order screen takes reordering over (D7) | `organism-query-owning`, `organism-presentational` |
| Order screen: energy curve on top with the average energy and the total time, hidden by the **Energy curve** chip; 44 px rows with a 44x44 handle, number, title, five-step meter, length; the lifted row's bar turns blue and the curve redraws at the drop position; saves on each drop; footer **Done** and **Copy order** | new `routes/setlists/SetlistOrderPage.tsx`, new `organisms/SetlistOrderList.tsx`, new `molecules/EnergyCurve.tsx`, new `molecules/energy-curve.utils.ts`, `App.tsx` | The route reads the setlist, its entries and the songs; the list owns the drag; the utils build the bars, the average, the five-step level and the order projected while a row is lifted | `route-detail-page`, `organism-presentational`, `molecule-presentational`, `utils-pure-module` |
| Copy order on the Order screen and in the setlist's `more` menu, one implementation | new `routes/setlists/copy-setlist-order.hook.ts` | The clipboard call and its two-second feedback move out of `SetlistEditorPage` so both screens share them | `hook-timer-owned-by-handlers` |
| Vocabulary: **Order screen** | `apps/pragma/VOCABULARY.md` | New section, not a new noun for the setlist | |

Removed when nothing imports them any more: `song-picker.core.ts` and its test, `molecules/SetlistEntryDragPreview.tsx`, `useAppendSetlistEntry` and `appendOptimisticEntry` if nothing else reads them.

## Decided while building

- **To learn** filters on the status `wip` ("In progress"), the one status that says the band is learning a song; slice 6's To learn filter on Songs can read the same rule.
- The Order row's meter is five steps over the ten energy levels (two levels per step) and is read-only; energy is still set in the entry sheet, so no level becomes unreachable.
- **New song as an idea** sits above the music service's results, so it is reached with no scroll whatever the service answers.
- A pick keeps the focus in the search field, so the next title is typed with no tap on the field. Task 2 types "Psycho" for its second song instead of scrolling to it.
- The picks are a sheet draft per setlist (`lib/add-songs-draft.store.ts`, on the generic sheet draft store), so they survive a close by the backdrop or Escape, as the spec's sheet rule asks.
- A field marked `data-sheet-focus` now takes the focus wherever it sits in the sheet, so the search can live in the sheet's fixed subheader above the one scroll body.

## Tests

- `add-songs.core.test.ts`, `energy-curve.utils.test.ts`, the new `setlists.utils` helpers: 100% coverage, mutants killed.
- Back-e2e in `setlists.controller.test.ts`: the batch appends in pick order after the existing entries; adds nothing when one song does not exist; 404 on an unknown setlist; 400 on duplicates and on an empty list.
- Component tests: `SetlistSongPicker` (focus in the search, a pick shows its number, already-in songs cannot be picked, nothing is written before **Add N songs**, a failure keeps the picks), `SetlistOrderList` (handle is 44x44, the curve hides behind the chip).
- Harness: walks 1, 2, 8 and 8b follow the new sheet and the Order screen; `--slice-4` measures the rows below.

## Acceptance rows (before -> target), from the spec

Measured column: `../validation/slice-4-after.json`, from `--tasks 1,2,8,8b --slice-4` on the slice 4 head (task 2 and `--slice-4` rerun after the last fix).

| Row | Before | Target | Measured |
| --- | --- | --- | --- |
| 2 Build the concert setlist | 10 / 2 / 6 (11 / 3 / 6 after slice 3) | ≤ 11 / 0 / ≤ 6, order kept after reload | 12 / 0 / 7, 1 text entry, order kept after reload |
| 8 Add a new song and put it on the next practice | 12 / 0 / 6, 3 text entries | ≤ 5 / 0 / ≤ 3, 1 text entry, never leaves the setlist, artist and cover from the music service when it answers | 4 / 0 / 3, 1 text entry, from Deezer with its artist |
| 8b New song from the setlist | 6 / 0 / 4 | 4 / 0 / ≤ 3 | 4 / 0 / 3 |
| Order screen: rows visible with the curve, 390x844 | about 5 | ≥ 8 | 10 |
| Drag handle | 20x44 | 44x44 | 44x44 |
| Add songs confirm button position | 0.12 of the screen | ≥ 0.85 | 0.929 |
| Songs already in the setlist offered again | yes | no | 0 under every chip |

**Task 2 misses by one tap and one screen**, both from the confirmation before removing an entry (`more`, Remove, Confirm). The library route costs the tap D1 accepted, and the Order pill is a tap the old drag in the list did not need, so the walk reaches 11 only if removing an entry takes two taps. Dropping the confirmation, or replacing it with an undo line, is a product decision this slice does not take.

Task 1 is slice 5's row; its walk now runs through the sheet and measures 18 / 3 / 7, the scrolls bringing the last picks of the alphabetical list into view.

## Self-check before the gates

- No `useEffect` added; the picks live in one `useState`, the lifted row in the drag handlers.
- Every new button has an icon; the check rows are `checkbox` choices with an accessible name.
- No `text-[`, `bg-[`, hex or `rgba()` in the new components; bar heights are the one dynamic style value.
- One scroll container: the sheet body scrolls, nothing inside it does; the Order screen has no inner scroll.
- At most one primary action per screen: **Add songs** on the setlist, **Done** on the Order screen.
