# Plan: pragma UX redesign, slice 3 (setlist views, entry sheet, vote page)

> Pair with [`../spec/spec.md`](../spec/spec.md), the slice 1 plan [`plan.md`](./plan.md) and the slice 2 plan [`plan-slice-2.md`](./plan-slice-2.md). This plan is short on purpose: the spec carries the decisions, and this file says where each one lands.

Branch `claude/pragma-ux-redesign-slice-3`, stacked on slice 2. It delivers what the spec's *Slices* section gives slice 3: the setlist header with its `more` menu and total time, the **Songs / Lineup / My part** section tabs, rows with cover, note and highlighted lineup change, the 44 px transition line with "Note this transition", the Lineup grid in the members' stored colours, the entry sheet with the album cover, the inline lineup and the autosaved note, and the vote page's back link, explanation and bottom-strip action.

No database change, no new route on the API, no new dependency, so no ADR is triggered. Paths are relative to `apps/pragma/site/src/` unless they start with `apps/` or `scripts/`.

## What stays for slice 4

The spec gives slice 4 the Add songs sheet, the Order screen and "the pill strip on the setlist" (**Add songs** and **Order**). Until then:

- the bottom strip keeps today's **Add song** pill, which opens today's picker;
- reordering stays in the Songs view through the drag handle, and the energy level stays in the entry sheet, because the Order screen that takes both over does not exist yet;
- the energy chart leaves the setlist now (D7, and the slice 3 row "sticky elements other than the bottom strip: 1 -> 0"); it comes back on the Order screen.

## How each spec decision becomes code

| Spec decision | File | Change | Blueprint |
| --- | --- | --- | --- |
| Header: back link naming the parent session, one line "Concert · Sun 1 Nov · 20 songs · 1 h 18", one `more` menu | `routes/setlists/SetlistEditorPage.tsx`, new `routes/setlists/setlist-header.core.ts` | The page reads the setlist's sessions and picks the parent (the next coming session, else the latest past one); the core returns the back target and the parts of the line. The energy toggle, the audience and vote icon buttons and the play link leave the header; `SetlistHeaderActions.tsx` holds one `Menu`: Stage mode, Open a vote (or Vote for this setlist), Audience vote (concert only), Copy the order, Rename, Delete | `route-detail-page`, `core-view-intent` |
| Total time from the songs' durations (D6) | `setlist-header.core.ts` | Reads `sumKnownDurations` and `describeTotalDuration` from `molecules/song-duration.utils.ts`, the helper Home uses, so the two screens agree | as above |
| Section tabs **Songs**, **Lineup**, **My part** | new `routes/setlists/setlist-view.core.ts`, `organisms/SetlistEditor.tsx` | The view and the member live in the address (`?view=lineup`, `?view=my-part&member=<id>`); Home's Your part link, which sets `member`, lands on My part. `SectionTabs` draws the switch | `core-view-intent` |
| Songs rows: position in the margin, cover, title, artist, key and capo, lineup avatars, `more` (Remove from the setlist), note in the note style, tonight's change in the highlighter | `organisms/SetlistEntryRow.tsx`, new `organisms/entry-lineup-change.core.ts` | The row becomes presentational: it no longer owns the sheet, the lineup dialog, the song defaults dialog or the form. The core lists the members whose instruments tonight differ from the song's lineup | `organism-presentational`, `core-projection` |
| Transition line 44 px, comment in the pencil style, `warn` for a risky one, faint "Note this transition" with `plus` | `organisms/TransitionStrip.tsx`, `organisms/TransitionCommentModal.tsx` | The strip is rewritten; the comment sheet's text area grows (`AutoGrowTextarea`) instead of scrolling inside | `organism-presentational` |
| Lineup grid (graft 3, Q2b, Q3) | new `organisms/SetlistLineupGrid.tsx`, new `organisms/lineup-grid.core.ts` | Columns for the members who play in the setlist, header avatar in the stored colour with the first name in `ink`, a lane tint down each column (`MemberMark` `lane`), played cells filled (`MemberMark` `cell`) with the glyphs in the ink the colour calls for, sit-out cells as a dot, a changed cell keeps its fill and gains a `highlight` bar and an `ink` corner tick. Up to six columns through a fixed `grid-cols-*` table. A cell opens the entry sheet on its lineup; a header opens My part for that member | `organism-presentational`, `core-projection` |
| My part | `organisms/SetlistEditor.tsx` | Today's member filter, set to the signed-in member or the member in the address, with the member named above the list; empty: "Nothing to play in this setlist" | `organism-query-owning` |
| Entry sheet: cover at 72 px, title, artist, length, "Song 2 of 20 · tonight only", key and capo, inline lineup with "Use the song's lineup", autosaved note with "Saved" / "Not saved" and retry, footer **Open the song** and **Record a take**, focus in the note field, never another sheet | `organisms/SetlistEntrySheet.tsx` (rewritten, owns the form and the saves), new `molecules/InlineLineupEditor.tsx`, new `molecules/TextSaveStatus.tsx`, `atoms/album-cover.variants.ts` (72 px size), `lib/modal-dialog.adapter.ts` (`[data-sheet-focus]` first) | One sheet per editor, opened by entry id. The lineup dialog, the song defaults dialog and the remove confirmation are no longer opened from it: Remove is in the row's `more` menu, the song's defaults are on the song page | `organism-form`, `molecule-presentational`, `ref-callback-browser-api` |
| Record a take from the entry sheet without nesting sheets | `organisms/RecordingSheet.tsx`, new `organisms/recording-sheet.hook.ts` | The recording state moves into a hook so the setlist starts a recording after the entry sheet has closed; `RecordingSheet` keeps its props for the song page and the session page | `hook-timer-owned-by-handlers` shape; component unchanged for callers |
| Vote page: back link naming the setlist, two lines on how a vote runs, **Open a vote** / **Close the vote** as the primary pill in the bottom strip | `routes/setlists/SetlistVotePage.tsx` | The header buttons move to `BottomActions`; the closing panel keeps its own strip | `organism-query-owning` |
| Zero-defect `EntryNoteSaveError`, alert on any occurrence | `observability/error-reporting.adapter.ts` | `reportEntryNoteSaveFailed` beside `reportTakeUploadFailed`, called when a note save fails; the slice 1 plan gave it to this slice with the "Not saved" line. The named analytics events have no helper on this branch, so none is added here | `adapter-external-service` shape of the existing file |

Removed when nothing imports them any more: `SetlistToolbar.tsx`, `MemberFilterPills.tsx` and its test, `SetlistEntryActions.tsx`, `SongDefaultsDialog.tsx` and its test, `lib/energy-curve-preference.utils.ts` and its test. `EnergySparkline.tsx` stays if `MasteryProgressChart` still reads it.

## Tests

- `lineup-grid.core.test.ts`, `entry-lineup-change.core.test.ts`, `setlist-header.core.test.ts`, `setlist-view.core.test.ts` at 100% coverage and killed mutants.
- Component tests: `SetlistLineupGrid` (colours as style values, the change mark, a cell tap and a header tap), `SetlistEntrySheet` (focus on the note, "Saved" then "Not saved" with retry, no second dialog opened by Record a take), the rewritten `SetlistEntryRow` test.
- `modal-dialog.adapter` test for `[data-sheet-focus]`.
- Harness: walks 4, 5, 6 and 11 follow the new screens, and `--slice-3` measures the rows below.

## Acceptance rows (before -> target), from the spec

| Row | Before | Target |
| --- | --- | --- |
| 4 Lineup for one song tonight | 4 / 0 / 3, lineup sheet inner scroll 1 | 3 / 0 / 2, inner scroll 0 |
| 5 Note a transition | 3 / 0 / 2, note not shown | ≤ 3 / 0 / 2, comment shown on the list, draft kept after a backdrop close |
| 6 Note on a song for tonight | 4 / 0 / 2, note not shown | 3 / 0 / 2, note shown on the row, 8 of 8 note race runs |
| 11 Close a vote | 9 / 8 / 2 | ≤ 9 / ≤ 4 / 2, "Close the vote" visible on arrival at the bottom, back link on the vote page |
| `/setlists/:id` first song row top, 375x667 / 390x844 | 269 px / about 265 px | ≤ 190 px / ≤ 215 px |
| `/setlists/:id` sticky elements other than the bottom strip | 1 (71 px chart) | 0 |
| Lineup grid: songs with the full lineup on the first screen, 390x844 | about 5 | ≥ 8 |
| Lineup grid: changes from the previous song marked | 0 | all |
| Lineup grid: columns tinted and played cells filled in the member's stored colour, both schemes | glyphs tinted | every column and every played cell |
| A sheet never opens another (gated from slice 3) | lineup dialog from the entry sheet | no second open `<dialog>` from the entry sheet |

## Self-check before the gates

- No `useEffect` added; the view lives in the address, the open sheet in one `useState` of the editor.
- Every new button has an icon; the row's `more` is an `IconButton` with a label; the Lineup cells and headers are buttons with an accessible name.
- A member's name is in `ink`, never in the member's colour; the colour reaches the screen only through `Avatar` and `MemberMark`.
- No `text-[`, `bg-[`, hex or `rgba()` in the new components.
- One scroll container: the grid never scrolls sideways at 375 px with six members.
