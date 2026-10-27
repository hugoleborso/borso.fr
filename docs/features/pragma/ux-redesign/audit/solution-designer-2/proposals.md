# Pragma: design proposals, second pass

Author: solution-designer-2. Date: 2026-10-26. This file replaces `solution-designer/proposals.md`.

## Summary

The first pass proposed three moves: shape the app around the band's two jobs, give every screen one scroll and one primary action, and shrink the design system. Those stay. This pass changes four things, mostly from the operator's comments on the deck:

1. **The setlist gets three views of one list**: Songs (what was decided for each song), Lineup (who plays what on every song, readable down a column), and My part. Ordering by energy moves to its own **Order** screen, where the energy curve follows the song you drag.
2. **Adding songs to a setlist happens from the setlist, several at once.** The song page no longer has "Add to a setlist"; its main action is "Record a take".
3. **The session page drops keys** and renames "Talk" to "Messages about this practice".
4. **Every button carries an icon**, everywhere, as `design-system/DESIGN.md` now requires. All mockups were redrawn with the DESIGN.md tokens.

Each proposal now has a target, written as "before -> target" against `task-metrics/baseline.md`. Before numbers are measured; targets are design goals to be measured again on the built screens with the task-metrics harness (`pnpm --filter @borso-app/pragma run task-metrics`).

## Inputs

- `skeptic-2/verified.md`: 37 confirmed findings, cited below as **rank N** (its ranking by the operator's priorities). First-pass ids such as `skeptic-3` still appear where the skeptic merged them.
- `task-metrics/baseline.md`: taps, scroll gestures, screens, positions and button counts measured with argent at 390x844. Cited as **task N** and by route.
- `design-system/DESIGN.md`: the target tokens, type roles, the icon rule and the verb-to-icon table. Every mockup uses its light tokens.
- The operator's comments on slides 16, 17, 18 and 20. One answer per comment is in `comment-responses.md`.
- Code read this session in `apps/pragma` at `d117a320`: `LineupSlots.tsx`, `lineup-slots.core.ts`, `MemberPartGlyphs.tsx`, `MemberFilterPills.tsx`, `SetlistEntryRow.tsx`, `SetlistToolbar.tsx`, `EnergySparkline.tsx`, `SetlistSongPicker.tsx`, `InstrumentGlyphs.tsx`, `Icon.tsx`, `domain/lineup.core.ts` (`resolveLineup`), `domain/input-limits.core.ts` (energy is an integer from 1 to 10) and `api/src/setlists/setlists.schema.ts` (`energy` per entry).

I did not start a pragma instance. Every "before" comes from the baseline or the skeptic; every "after" is a mockup rendered at 390x844 with `scripts/browser.sh`.

## What changed since the first pass

| Proposal | Change | Why |
| --- | --- | --- |
| A3 Setlist | The member pills become a segmented control **Songs / Lineup / My part**. The energy line next to the title is gone. The action bar holds **Add songs** and **Order**. | Slide 16 comment |
| A11 Lineup view | New | Slide 16: "I want my lineup view" |
| A12 Order screen | New. Holds the energy curve | Slide 16: "toggle an energy curve somehow, to choose the order" |
| A13 Add several songs | New. Replaces "Add to a setlist" on the song page | Slide 20 comment |
| A4 Session | No key on the setlist preview. "Talk" becomes "Messages about this practice". Add songs from the session creates its setlist | Slide 17 comments; rank 5 |
| A5 Entry sheet | Shows the album cover and the artist; every button has an icon; "Open the song" kept | Slide 18 comments; rank 6 |
| A7 Primary actions | Song page primary is now **Record a take**. Every button has an icon | Slides 18 and 20 |
| A8 Song page | "Add to a setlist" removed; the page lists the setlists the song is in, as text | Slide 20 comment |
| B1 to B4 | Values replaced by DESIGN.md: type 28/20/16/16/14/12, `surface`, `raised`, `sunk`, `ink-soft`, eight member colours, button sizes 44 and 52 | `design-system/DESIGN.md` |
| C13 to C19 | New polish rows for findings the second skeptic confirmed: offline, stale order, vote page, study rows, session sort, shortcuts | `skeptic-2/verified.md` ranks 9, 10, 11, 22, 25, 30, 37 |
| D7 | Revised: the energy chart stays, on the Order screen, not on the default list | Slide 16 comment |

## A. Restructure

### A1. Four tabs shaped around the two jobs

- **Solves:** rank 19 (Tasks behind More, Bars with its own tab), rank 20 (More drawer longer than the screen), rank 34 (badges that look like alerts), rank 35.
- **Change:** unchanged from the first pass. Tabs: **Home, Sessions, Songs, Band**. Sessions carries a Setlists segment for the setlist library. Songs gets a "To learn" filter that replaces the Studies tab. Band opens on tasks, then members, venues, compositions and improvements. No number on any tab; one dot on Home when something new arrived for me.
- **Cost:** `AppShell.tsx`, `BottomTabBar.tsx`, `navigation-active.core.ts` and its test, `navigation-badges.hook.ts`, `App.tsx`, `SessionsPage`, `StudiesPage`, `en.json`, `fr.json`.
- **Target metric:**
  - Tab bar items: 6 with an overflow -> 4, no overflow.
  - Task 3b, see my own tasks: 2 taps, 3 screens -> 1 tap (Band tab), 2 screens.
  - Numbers on tabs: 3 ("Catalog16", "Sessions1", "Setlists1") -> 0.

### A2. Home: "Next up"

- **Solves:** rank 18 (only the next concert is shown, only on the catalogue), task 12.
- **Change:** unchanged from the first pass: the next session, practice or concert, with its readiness list, "Your part", "Your tasks" and recent comments. "Open the setlist" carries the `arrowR` icon. "Your part" links to the setlist's Lineup view (A11) instead of "See all".
- **Cost:** new `routes/home/HomePage.tsx`, organisms `NextSessionCard`, `MyPartList`, `MyTasksList`, `RecentActivityList`, pure `home.core.ts` (100% coverage); delete `NextConcertStrip.tsx`.
- **Target metric:**
  - Task 12, check what is next: 1 tap, "partly" (concert only) -> 0 taps, done (the practice in 3 days shown with date, place and setlist).
  - "My part" position: 0.06 of the screen, inside the top inset -> inside the Home card, below the inset.
- **Mockup:** `mockups/compare-home.png`.

### A3. The setlist: three views of one list

- **Solves:** rank 1 (notes, key change and capo hidden on the row), rank 12 (first song at 40% of the screen, sticky energy chart), rank 13 (icon-only header, Add song hidden on scroll), rank 15 (transition notes buried), rank 24 (24 px transition line), task 5 and task 6 ("saved, but not shown").
- **Change:**
  - Header: back link naming the parent ("Le Petit Bain"), title, one line "Concert · Sun 1 Nov · 20 songs · 1 h 18", and one `more` icon button (stage mode, open a vote, audience vote, copy the order, rename, share). No energy line here any more.
  - Under the title, a segmented control: **Songs / Lineup / My part**. It replaces `MemberFilterPills`. "My part" is today's member filter, set to the signed-in member; the other members are reached from the Lineup view's column headers.
  - **Songs** view, the default: each row shows the real album cover, the title, the key (an override as "E -> F#"), the capo, the lineup avatars, who sings lead, a badge when someone switches instrument, and the first lines of the entry note. Between two rows the transition line is always 44 px tall and shows its comment, a `warn` icon for a risky one, or a quiet "Note on this transition" with the `plus` icon.
  - Drag handles stay on the rows for a quick move. Ordering the whole set happens on the Order screen (A12).
  - Action bar: **Add songs** (`primary`, `plus`) opens the sheet of A13; **Order** (`secondary`, `reorder`) opens A12.
- **Cost:** `SetlistEditor.tsx`, `SetlistToolbar.tsx` (the sparkline and pills leave), `SetlistHeaderActions.tsx` (into a `Menu`), `SetlistEntryRow.tsx` and its test, `SetlistEntriesList.tsx`, `TransitionStrip.tsx`, `BottomActionBar.tsx`, `setlist-editor.utils.ts` (total time), i18n.
- **Target metric:**
  - First song row, 390x844: about 265 px (read from the baseline screenshot) -> at most 215 px (mockup: 212). At 375x667: 269 px (rank 12) -> at most 190 px.
  - Task 5 and task 6, note visible on the list after saving: no -> yes, without opening anything.
  - Icon-only buttons on `/setlists/:id`: 26 -> 21 (20 drag handles and one `more`, each with a label). Text-only buttons: 20 -> 0.
  - Sticky elements while scrolling: 1 (energy chart, 71 px) -> 0.
  - Page height of `/setlists/:id`: 2.64 screens -> no target; it grows with the notes, which is the point of the view.
- **Mockup:** `mockups/compare-setlist.png`.

### A11. Lineup view: who plays what, across the setlist

- **Solves:** the operator's comment on slide 16. In pragma the lineup changes a lot between songs: in the seed, Lightning has no bass and no guitar while the song before and after have both.
- **What works today and stays:**
  - The instrument glyphs from `InstrumentGlyphs.tsx`, drawn in the colour of the member who plays them (`LineupSlots` and `buildLineupColumn` in `lineup-slots.core.ts`). Once you know the colours, one glance tells you who does what.
  - The member filter that turns the list into one person's part (`filterEntriesForMember`, `MemberPartGlyphs`).
  - The lineup comes from `resolveLineup` in `domain/lineup.core.ts`: the song's default, or the entry's override for tonight.
- **What does not work today:** the glyphs sit in a strip whose order follows the instruments, so the same member is in a different place on each row, and a strip wider than the row is cut to "+N". You cannot read one person down the list, and nothing says that something changed from the song before.
- **Change:** the **Lineup** segment shows the setlist as a grid.
  - One row per song, 44 px tall: number, title in the `title` role.
  - One fixed column per member, 40 px wide, headed by the avatar and the first name. A cell holds that member's instrument glyphs in their colour (two glyphs at 16 px when they sing and play), or a small dot when they sit out.
  - A cell is shaded `warn-soft` when that member's part differs from the song before: they come in, they leave, or they change instrument. A one-line legend above the grid says so. In the mockup, Lightning shows 4 shaded cells: Léa drops the guitar, Marc and Tom sit out, Sarah moves from keys to vocals.
  - Tapping a cell opens that entry's sheet with the lineup section in view (A5). Tapping a member's header switches to My part for that member.
  - With 5 members the grid fits 390 px with no sideways scroll. With 6 or more, the title column stays pinned and the member columns scroll sideways, which DESIGN.md allows for horizontal strips.
  - Members who play on no song of this setlist get no column.
- **Cost:** new organism `SetlistLineupGrid.tsx`; new pure `lineup-grid.core.ts` that builds the cells and the change flags from `resolveLineup` and `INSTRUMENT_ICON_GLYPH` (100% coverage gate, with its test); `SetlistEditor.tsx` switches on the segment; i18n. No API or schema change: the default lineup and the override are already loaded by the editor.
- **Target metric:** the baseline has no lineup task, so these are new measures to add to the task-metrics harness (`apps/pragma/scripts/task-metrics/task-walks.setup.ts`).
  - Songs whose full lineup is readable on the first screen at 390x844: about 5 today (rows with glyph strips, from the baseline screenshot) -> 8 (mockup).
  - Lineup changes between consecutive songs marked on screen: 0 -> all of them.
  - Taps to see one member's part for the whole set: 1 (member pill, which scrolls sideways at 390 px) -> 1 (column header), with every member visible at once.
- **Mockup:** `mockups/compare-lineup.png`.

### A12. Order screen with the energy curve

- **Solves:** the operator's comment on slide 16 ("toggle an energy curve somehow, to choose the order of the songs; maybe it is another screen"), rank 12 (the curve pins 71 px at the top of the list), rank 24 (handles under 44 px).
- **Choice: a separate screen, not a toggle on the list.** Three reasons:
  1. On the Songs view a row grows with its note and its transition, so 20 songs span about 3 screens. A curve on top cannot line up with rows you cannot see. On the Order screen each row is 44 px, so the curve and 8 rows share one screen.
  2. Ordering is its own moment, with its own question: "does the set build and breathe?" The Songs view answers "what did we decide for each song?". Mixing drag handles, a sticky chart and notes on one list made both worse, which is what the audit found.
  3. A toggle on the list would bring back the sticky chart that pushed the first song to 40% of the screen. Here it costs nothing on the default view.
  The toggle still exists, on this screen: the **Energy curve** chip in the header hides the curve for people who order by key or by length.
- **Change:**
  - Reached from **Order** in the setlist's action bar.
  - Top: a card with the curve as one bar per song plus a line, labelled Opening, Middle, Ending, with the average energy and the total time. Energy is the entry's value, or the song's base energy, from 1 to 10 (`ENERGY_MIN`, `ENERGY_MAX`).
  - Below: one 44 px row per song with a 44 px drag handle, the number, the title, a five-step energy meter (two points per step), the key and the length.
  - While a row is lifted, its bar turns solid `accent` and the curve redraws at the drop position, so you see the effect before letting go.
  - Footer: **Done** (`primary`, `check`) and **Copy order** (`secondary`, `copy`), which leaves the main list's action bar (rank 13 asked for exactly this).
  - Order saves as you drop, as today. Done only closes.
- **Cost:** new route `routes/setlists/SetlistOrderPage.tsx`; new organism `SetlistOrderList.tsx` reusing the editor's existing dnd-kit setup and reorder mutation; `EnergySparkline.tsx` gains a highlighted index; new pure `energy-curve.utils.ts` (bar heights, average) with a 100% coverage test; the `reorder` glyph added to `Icon` and to DESIGN.md's verb table.
- **Target metric:**
  - Rows visible together with the curve at 390x844: about 5 below a 71 px chart today -> 8 (mockup).
  - Taps to reach the curve: 0 (always on, pinned) -> 1 (Order). This is the price of D7, accepted by the operator's comment.
  - Drag handle size: 20x44 (rank 24) -> 44x44.
- **Mockup:** `mockups/compare-order.png`.

### A13. Add several songs at once, from the setlist

- **Solves:** the operator's comment on slide 20; rank 16 (the picker offers songs already in the set, the backdrop does not close it); baseline tasks 1, 2, 8 and 8b (Done at 12% from the top, scrolls in the picker).
- **What exists today:** `SetlistSongPicker` already adds a song on every tap and turns Cancel into "Done" with a count, so one opening can add many songs. What is missing is a way to see what you picked, to undo a wrong tap without opening the entry, to find songs without scrolling a 44-song list, and a button you can reach.
- **Change:** **Add songs** opens a full-height sheet titled "Add songs to *Set principal*".
  - A search field, then filter chips: Concert ready, Rehearsed, To learn, Ideas.
  - Each song row shows its album cover, title, artist, key and length, and a round selector. Tapping selects it and shows its picking number (1, 2, 3); tapping again removes it.
  - Songs already in the setlist are dimmed and say "Already in the set · 05". They cannot be picked twice.
  - "New song as an idea" takes the typed title, creates the song in the catalogue and selects it, as today's "Create ... and add it" does.
  - Footer: one line "Added at the end, in the order picked · 23 songs · 1 h 28", then **Add 3 songs** (`primary`, `plus`). Nothing is written until that tap, so a wrong tap costs one tap to undo instead of three (open the entry, Remove, confirm).
  - The same sheet opens from the session page (A4). When the session has no setlist yet, the tap creates one named after the session, then opens the sheet.
- **Cost:** `SetlistSongPicker.tsx` becomes this sheet on `Sheet`; `setlist-song-picker.core.ts` (`filterPickableSongs` receives the setlist's song ids and the chip filter; selection order); a batch add on the existing add-entry mutation, or one call per song if the API has no batch route (to check in `api/src/setlists` before building); i18n.
- **Target metric:**
  - Task 1, prepare the next rehearsal: 18 taps, 3 scroll gestures, 7 screens -> 15 taps, at most 1 scroll gesture, 4 screens (Sessions, New practice, session, add sheet). The saving comes from not creating and opening the setlist by hand.
  - Task 2, build the concert setlist: 10 taps, 2 scroll gestures -> 10 taps, 0 scroll gestures (filters and search instead of scrolling to Psycho Killer at 2.06 screens).
  - Task 8b, add a new song from the setlist: 6 taps -> 4 taps.
  - Position of the confirm button in the picker: 0.12 of the screen height -> at least 0.85.
  - Songs already in the set offered again: yes (rank 16) -> no.
- **Mockup:** `mockups/compare-add-songs.png`.

### A4. The session page is where the band prepares

- **Solves:** rank 4 (no takes on the session page), rank 5 (creating a setlist leaves you on the session), rank 3 (tasks cannot point at a session), task 7.
- **Change:** in this order:
  1. Who is coming, with "I'm in" (only if D4 is yes).
  2. The setlist: total songs and time, then the first three songs with their cover, lineup avatars and a `warn` badge when a song has no lineup. **No key**: the operator does not need it here, and it stays on the setlist itself. "Open" is a quiet button with the `chevR` icon. When there is no setlist yet, this section holds **Add songs** (A13).
  3. Who does what: tasks for this session, with "Add a task for this practice" (`plus`). Needs D3.
  4. **Messages about this practice**: what used to be called "Talk". It holds the band's written messages about this session: who is late, what to rehearse first, a question about a song. It is a thread on the session, not a general chat. Needs D5. A `message` icon button next to the primary action writes one.
  5. Takes recorded at this session, grouped by song, after the date.
  - Primary action: **Start the practice** (`play`) before or on the day; **Listen back** (`play`) after.
- **Cost:** as in the first pass (`SessionDetail.tsx`, `SessionSetlists.tsx`, `PracticeRecordingList.tsx` replaced, `TakeList.tsx` reused, new `SessionTasks`, new `SessionMessages` if D5), plus `SessionSetlists.tsx:89` opening the new setlist instead of only closing the dialog.
- **Target metric:**
  - Takes listed on the past practice page: 0 of 7 (rank 4) -> 7 of 7.
  - Icon-only buttons on the past practice page: 17 (one record button per song) -> 1 (the message button, labelled).
  - Creating a task for this session: 9 taps and 3 scroll gestures from `/tasks` (task 3) -> 3 taps plus typing, 0 scroll gestures.
  - Key shown on the session page: yes -> no.
- **Mockups:** `mockups/compare-session.png` and `mockups/after-session-messages.png` (the same page scrolled to the messages).

### A5. One bottom sheet for every edit

- **Solves:** rank 14 (the lineup tap closes the entry sheet), rank 8 (transition draft lost on backdrop tap), rank 7 (note saves race), rank 17 (two save models), rank 23 (focus on Cancel), rank 33 (note in monospace), rank 6 (no way from the setlist to the song page).
- **Change:** as in the first pass, one `Sheet` molecule on the native `<dialog>`, following DESIGN.md. The entry sheet now shows:
  - **The album cover** (72 px, real artwork from the music service, or the neutral tile), the title, the artist and the length, under the label "Song 2 of 20 · tonight only". The close button is an icon button with the `close` icon.
  - The song's key, tonight's key and the capo.
  - The lineup inline, each member with their instrument glyphs in their colour; a change for tonight in `accent-strong` ("Sax, only tonight"). "Use the song's" (`swap`) resets it.
  - The note in the body font, saved after a short pause, with "Saved" and the `check` icon in `good`.
  - Footer: **Record a take** (`mic`) and **Open the song** (`song`). "Remove from setlist" is in the row's menu.
  - Focus goes to the first field a person types into, never to Close.
- **Cost:** as in the first pass, plus `AlbumCover` at a new 72 px size in the sheet header.
- **Target metric:**
  - Task 4, lineup for one song: 4 taps, 3 screens -> 3 taps, 2 screens (open entry, tap the instrument, close).
  - Task 6, note on a song: 4 taps -> 3 taps (focus lands in the note field).
  - Vertical scroll areas with the lineup editor open: 1 inner area of 706 px in 628 px (baseline overlay table) -> 0 inner areas.
  - `notes-race.mjs`, full text stored: 3 of 4 runs -> 8 of 8.
  - Buttons without an icon in the sheet: Close, Lineup, Song defaults, Remove are text-only today -> 0.
- **Mockup:** `mockups/compare-entry-sheet.png`.

### A6. One scroll per screen

- **Solves:** rank 27 (three scroll areas when editing a chart), row 38 (`/bars`).
- **Change:** unchanged. Text areas grow; the chord preview sits under its text; sheets own the only scroll while open; a Playwright test built on `count-scroll.js` fails on two vertical scroll areas.
- **Target metric:** vertical scroll areas on first load: `/catalog/:songId/edit` 3 -> 1; `/bars` 2 -> 1; lineup editor overlay 1 inner -> 0; picker overlay 1 inner -> 0 (the sheet body is the scroll). Routes with more than one: 2 -> 0.

### A7. One labelled primary action with an icon, in the same place

- **Solves:** rank 13, rank 26 (create placed five ways), and the baseline's placement count.
- **Change:** each main screen has at most one `primary` button, with an icon and words, in the action bar above the tab bar.

  | Screen | Primary action | Icon |
  | --- | --- | --- |
  | Home | Open the setlist (inside the next-session card) | `arrowR` |
  | Sessions | New session | `plus` |
  | Session | Start the practice, or Listen back after the date | `play` |
  | Setlist | Add songs (with Order beside it) | `plus` |
  | Order | Done | `check` |
  | Songs | Add a song | `plus` |
  | Song | Record a take | `mic` |
  | Band | New task | `plus` |

- **Cost:** `BottomActionBar.tsx` into `ActionBar`, the pages above, `button.variants.ts`.
- **Target metric:**
  - Primary actions in the bottom third on arrival: 14 of 32 -> at least 26 of 32. The six that stay higher are fields or rows a person taps inside a list (a task field, a song in the picker), not buttons.
  - Primary actions off screen on arrival: 4 -> 0.
  - Round icon-only floating buttons: 2 per list screen -> 0.

### A8. The song page serves learning, and chords are easy to add

- **Solves:** rank 29 (Scene mode is the main button, twice; listen links need a long press), rank 28 (ChordPro only), rank 27, rank 31 (raw Deezer track id), task 9, task 10.
- **Change, song page:** in this order:
  1. Cover, title, artist, key, length, status.
  2. Listen: **Deezer**, **Spotify**, **YouTube**, each a small button with the `external` icon.
  3. One line of text: the setlists this song is in ("In Set principal (05) and Wednesday practice (09)"). It informs; it is not an action. Songs are added to setlists from the setlist (A13).
  4. Your part: instrument, mastery, and **I practised** (`check`), which logs a study in one tap.
  5. Chords above the words, with transpose buttons (`chevD` up and down) and a **Full screen** icon button (`expand`), the only way into stage mode from the song.
  6. Takes, then notes and the default lineup.
  - Header: **Edit** (`edit`) and **More** (`more`) as labelled icon buttons.
  - Primary action: **Record a take** (`mic`). The first pass had "Add to a setlist" here; the operator adds songs from the setlist, all at once, so it goes.
- **Change, adding chords:** unchanged from the first pass: Paste text, Photo, PDF; the converter turns "chords above lyrics" into ChordPro; the preview sits under the text; a key guess; "Find chords for <title>" opens a web search.
- **Cost:** as in the first pass, minus the `AddToSetlistSheet` organism, plus a small "in setlists" line built from data the setlists query already returns.
- **Target metric:**
  - Task 9, add chords: 6 taps, 1 scroll gesture, ChordPro syntax required -> 3 taps, 0 scroll gestures, no syntax.
  - Ways into stage mode from the song page: 3 (rank 29) -> 1.
  - Listen links visible on the song page: 0 (long press only) -> 3.
  - Task 7, record a take from the song: "Record a take" at 0.85 of the screen -> unchanged position, now with words and an icon; opening the first take and commenting: 2 scroll gestures -> 0 (takes listed under the chords on a shorter page; to measure).
- **Mockups:** `mockups/compare-song.png` and `mockups/compare-chords.png`.

### A9. "Who does what" on the Band tab and on each session

- **Solves:** rank 2 (task form 1840 px down), rank 3 (tasks only link original songs), rank 21 (`/tasks` 493 px wide).
- **Change:** unchanged from the first pass: Band opens on My tasks / Everyone, grouped by session when D3 is yes; **New task** (`plus`) opens a sheet with title, assignee avatars, quick due dates, optional song (any of the 44, not only the 6 compositions) and session.
- **Target metric:**
  - Task 3, agree who does what: 9 taps, 3 scroll gestures, title field at 2.18 screens -> 8 taps, 0 scroll gestures, title field focused on opening.
  - Songs offered in the task's song field: 6 -> 44.
  - `/tasks` layout width at 390: 493 px -> 390 px; tab bar visible.
- **Mockup:** `mockups/compare-band.png`.

### A10. Grow the catalogue in a few taps

- **Solves:** rank 31, rank 30 (study rows do not open the song), task 8, task 10.
- **Change:** as in the first pass: **Add a song** opens a one-field sheet that searches the music service and always offers "Add as an idea"; a switch "Also add to Wednesday's practice"; compact catalogue rows with the real cover; a "To learn" filter that replaces Studies, whose rows open the song.
- **Target metric:**
  - Task 8, add a new song and put it on the rehearsal: 12 taps, 3 text entries, 6 screens -> 4 taps, 1 text entry, 2 screens.
  - Task 10, learn a new song: 5 taps, 2 scroll gestures -> 4 taps (Songs, To learn, the song, I practised), 0 scroll gestures.
  - `/catalog` height: 6.88 screens -> at most 4.2 screens (64 px rows instead of about 110).

## B. Design system

The first pass's B1 to B4 are replaced by `design-system/DESIGN.md`, which turned them into tokens and rules. What follows is the part that belongs to these proposals: what to measure.

| Id | Change | Target metric (before -> target) |
| --- | --- | --- |
| B1 Type | Six sizes: display 28, title 20, heading 16, body 16, meta 14, label 12. Notes in the body font | Distinct font sizes outside the scene views: 18 -> 6. `text-[` in `site/src`: 21 -> 0 |
| B2 Space and shape | 4, 8, 12, 16, 24, 32 px; radii 4, 8, 14, full | Radii on screen: 5 -> 4 |
| B3 Colour | Blue only for the primary action and links; filled ink means "selected"; eight member colour tokens; real covers or one neutral tile | Background colours: 61 -> at most 15. Button looks: 23 -> 6 variants |
| B4 Components | `Button` requires `icon`; `IconButton` requires `label`; `Sheet`, `ActionBar`, `SegmentedControl`, `ListRow`, `Section`, `PageHeader`, `Field`, `Menu`, `EmptyState` | Text-only buttons over the 26 routes: 181 of 416 -> 0. Icon-only buttons all have an accessible name: to check, 133 today. Raw `<button>` outside atoms: 57 -> 0. Raw `<dialog>` outside `Sheet`: 14 -> 0 |

**The icon rule in the mockups.** Every button in every mockup carries an icon from DESIGN.md's verb table. This pass needed four glyphs the table does not list yet: `reorder` (Order), `swap` (an instrument change, "Use the song's"), `message` (Messages about this practice) and `song` used as a button icon for "Open the song". Add them to the table before building. Segmented choices show `check` on the selected option only, and list rows end with `chevR`, as DESIGN.md's "What counts as a button" table says.

- **Mockup:** `mockups/after-system.png`.

## C. Polish

Each item is small and independent. Most can ship before the restructure.

| Id | Solves | Change | Cost | Target metric (before -> target) |
| --- | --- | --- | --- | --- |
| C1 | rank 21 | Cut long song names in task chips with an ellipsis | `badge.variants.ts`, `TaskRow.tsx` | `/tasks` width at 390: 493 -> 390 |
| C2 | rank 7 | Save the entry note after a pause; drop answers to older saves | `SetlistEntryNotesField.tsx`, new `latest-write.utils.ts` | `notes-race.mjs`: 3 of 4 runs correct -> 8 of 8 |
| C3 | rank 8 | Keep the transition draft when the dialog closes by the backdrop | `TransitionCommentModal.tsx` | Draft kept on reopen: no -> yes |
| C4 | rank 34 | Remove the numbers from the tab bar | `navigation-badges.hook.ts`, `BottomTabBar.tsx` | Numbers on tabs: 3 -> 0 |
| C5 | first pass SD-6 | Chord icon only when a song has a chart | `SongCard.tsx` | "no chart" texts on `/catalog`: many -> 0 |
| C6 | rank 29 | Show Edit once on the song page; never a button inside a link | `SongDetailHeader.tsx`, `SongChartPreviews.tsx` | Edit controls: 2 -> 1; button inside link: 5 places -> 0 |
| C7 | first pass | Back links name the parent | `BackLink.tsx` callers | Back links reading "Back": some -> 0 |
| C8 | first pass | Setlist subtitle "Concert · Sun 1 Nov" instead of "Played in Le Petit Bain" | `SetlistEditor.tsx` | Date under the title: no -> yes |
| C9 | first pass | Hide the empty "Prepared concert" picker on a past practice | `PracticeReadView.tsx` | Shown: yes -> no |
| C10 | task 11 | Two lines explaining how a vote runs; "Close the vote" in the action bar | vote route, i18n | Task 11 scroll gestures: 8 -> at most 4; "Close the vote" visible on arrival: no (-2.73) -> yes |
| C11 | rank 23 | Focus the first field in every sheet where a person types | each sheet | Focus on Cancel or Close: 3 sheets -> 0 |
| C12 | refuted header overlap | Pad the shell top with `env(safe-area-inset-top)` | `AppShell.tsx` | No visual change today |
| C13 | rank 9 | Cache `/api/setlists` and `/api/setlists/:id` in the service worker; when a request fails, say "You are offline" instead of "This setlist no longer exists" or an empty list | `public/sw.js`, `SetlistEditorPage.tsx`, `SetlistsPage.tsx` | Setlist opens offline after one online visit: no -> yes |
| C14 | rank 10 | When the background refresh brings a newer order, show "Updated by Léa" and apply it | `setlist-entries.queries.ts`, `sw.js` | Stale order shown with no notice: yes -> no |
| C15 | rank 11 | Make the offline banner true: say edits will be sent when the network returns, and show a "waiting" mark on the edited row | `en.json:194`, `fr.json`, `query-client.setup.ts`, `AppShell` | Banner text matches behaviour: no -> yes |
| C16 | rank 25 | "Open a vote" becomes a `primary` button with the `vote` icon; define the missing `surface` colour; back link on the vote page | vote route, `tokens.css` | Selected toggle contrast: 2.80:1 -> at least 4.5:1 |
| C17 | rank 30 | A study row opens its song and labels its count ("studied 2 times") | `StudyRow.tsx` | Links in a study row: 0 -> 1 |
| C18 | rank 22 | Sessions list: coming sessions first, nearest at the top, with a "Next" marker; past ones below | `sessions.repository.ts:66` | Next session first: no -> yes |
| C19 | rank 37 | Manifest shortcut to Home instead of Catalogue; theme colours per scheme | `manifest.webmanifest`, `index.html` | Shortcut to the next session: no -> yes |

## Decisions only the operator can take

D1 to D10 keep the first pass's recommendation as the working default, except D7, which the operator's comment revised.

| Id | Decision | Recommendation | Trade-off |
| --- | --- | --- | --- |
| D1 | Four tabs (Home, Sessions, Songs, Band); Bars and Studies leave the tab bar | Yes | Bars and Studies cost one more tap |
| D2 | Open the app on Home | Yes | Browsing songs costs one tap more |
| D3 | Link a task to a session (a `session_id` column, needs an ADR) | Yes, session only | A schema column; without it "who does what for Saturday" has no home |
| D4 | "I'm in / I'm out" per member on each session | Yes, after A4 | A new table |
| D5 | Messages on a session ("Messages about this practice") | Yes, text first | A new table; without it the discussion stays in the chat app |
| D6 | Breaks inside a setlist | Total time now, breaks later | Breaks need a new entry kind |
| D7 (revised) | Where the energy chart lives | **On the Order screen (A12), shown by default there and hidden by a chip; not on the default list** | Ordering by energy costs one tap (Order); the list starts about 50 px higher and nothing is pinned |
| D8 | Stage mode behind "Full screen" and the setlist's menu | Yes | One tap deeper |
| D9 | Chords: paste converter, photo, PDF; no scraping, no audio detection | Yes | Some songs will have no chords |
| D10 | Swipe down to close a sheet: own code on the native dialog, later | Yes | No new dependency; Close and the backdrop work meanwhile |

No new decision is needed for A11, A12 or A13: they use data pragma already stores. A13's batch add may need a new API route; that is an implementation choice, not a product one.

## Order of work

This is an order of dependencies, not a schedule.

1. **Foundation**: DESIGN.md tokens, then `Button` with a required icon, `IconButton`, `Sheet`, `ActionBar`, `SegmentedControl`, `ListRow`, `PageHeader`. Polish C1 to C19 in parallel.
2. **Navigation and Home**: A1, A2.
3. **Setlist**: A3, A5, A6, then A11 and A12 (they share `SetlistEditor` and the dnd-kit setup), then A13.
4. **Session hub**: A4, after D3 to D5.
5. **Songs and chords**: A8, A10.
6. **Band tab**: A9.

`en.json` and `fr.json` will collide across agents: give one agent each merge. Run the blueprint index and architecture generators once, after every agent finishes.

## Mockups

All in `docs/features/pragma/ux-redesign/audit/solution-designer-2/mockups/`. Each `after-*.png` is 390x844. Each `compare-*.png` puts the "before" screenshot next to the mockup. HTML sources are in `mockups/src/`, styled by `system.css` (DESIGN.md's light tokens and type roles) and `shell.js` (status bar, tab bar, and the icon registry copied from `Icon.tsx` and `InstrumentGlyphs.tsx`). `render.sh <name>...` re-renders them with `scripts/browser.sh`; `make-compare.py` writes the comparison pages.

| Proposal | Mockup | Comparison | Status |
| --- | --- | --- | --- |
| A3 Setlist, Songs view | `after-setlist.png` | `compare-setlist.png` | Revised |
| A11 Lineup view | `after-lineup.png` | `compare-lineup.png` | New |
| A12 Order screen | `after-order.png` | `compare-order.png` | New |
| A13 Add several songs | `after-add-songs.png` | `compare-add-songs.png` (before: `audit-structure/shots/390x844_song-picker.png`) | New |
| A4 Session | `after-session.png`, `after-session-messages.png` | `compare-session.png` | Revised |
| A5 Entry sheet | `after-entry-sheet.png` | `compare-entry-sheet.png` | Revised |
| A8 Song page | `after-song.png` | `compare-song.png` | Revised |
| A8 Add chords | `after-chords.png` | `compare-chords.png` | Redrawn with icons and tokens |
| A2 Home | `after-home.png` | `compare-home.png` | Redrawn with icons and tokens |
| A9 Band | `after-band.png` | `compare-band.png` | Redrawn with icons and tokens |
| B Design system | `after-system.png` | none | Redrawn |

Album covers in the mockups are drawn gradients standing in for real artwork. The lineup and energy values in A11 and A12 follow the seed's members and instruments and the first five songs of *Set principal* as the baseline screenshot shows them; the rest are illustrative.

## What this pass could not prove

- **The mockups are pictures.** Every target above has to be measured on the built screens with the task-metrics harness (`pnpm --filter @borso-app/pragma run task-metrics`). A11 and A12 need new steps in `task-walks.setup.ts`, since the baseline has no lineup or ordering task.
- **Dragging with a finger.** argent's tap is a mouse click on Chromium, so the touch sensor's long press on the Order screen, and whether the curve redraws smoothly during a real drag, need a real phone.
- **A grid of 40 px cells.** Each cell is 40x36 px visible. A tap target of 44 px needs the hit area to extend into the row's padding; check it with argent's `describe` once built.
- **Six or more members.** The mockup has five. The sideways scroll of the member columns is a design claim, not a tested one.
- **The keyboard** over the add sheet's search and the entry sheet's note, and iOS sheet behaviour: as in the first pass, only a real iPhone shows them.
