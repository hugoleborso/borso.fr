# Pragma: design proposals after the UX audit

Author: solution-designer. Date: 2026-10-25.

## Summary

Pragma's screens follow its database: one tab per table, one page per record, and a centred dialog for every edit. The operator's two jobs cut across those tables. Preparing Wednesday's practice means visiting Sessions, Setlists, the More drawer (Tasks) and each song page in turn. That is why buttons feel hard to find. The double scroll comes from a few specific places (the chord editor, the More drawer, the bars message box), and the weak design system comes from 18 type sizes, 23 button looks and 14 hand-copied dialogs.

The proposals below do three things:

1. **Shape the app around the jobs.** Four tabs (Home, Sessions, Songs, Band). Home answers "what is next for me". The session page becomes the place where the band prepares a practice or a concert. The setlist shows what was decided for each song on the row itself.
2. **Give every screen one scroll and one primary action**, in the same place: a labelled button above the tab bar. Every edit opens in the same bottom sheet.
3. **Shrink the design system** to six text roles, four radii, one primary colour and about fifteen components, and delete the rest.

Seven before and after mockups are in `mockups/` (see the last section). They are static HTML built on the app's own colours and fonts, rendered at 390x844.

## Inputs and their limits

- Findings: `skeptic/verified.md`. Problem ids below (`T-…`, `S-…`, `D-…`, `skeptic-…`) are the skeptic's.
- Benchmarks: `bench-musician/benchmark.md` (cited as **BM** plus the pattern id, for example BM-C1) and `bench-productivity/benchmark.md` (cited as **BP** plus the pattern number).
- `audit-design-system/DESIGN.md` was **never written**. The design system proposals rest on the design auditor's raw inventory (`audit-design-system/static/agg375.txt`), the structure auditor's `system-inventory.json`, the skeptic's row D-system and my own reading of `apps/pragma/site/src`. I logged this with `scripts/kaizen.sh`.
- I did not run the app. Every "today" number comes from the other agents' measurements or from code I read this session. Every "after" number is a design target, not a measurement.

### Problem ids I added

The operator's four complaints, and what I found in the code while designing:

| Id | Problem | Evidence |
| --- | --- | --- |
| C-scroll | "A lot of double scrolling" | Operator. Located by S-chart (3 scroll areas), S-bars (2), S-more (2 at 375x667) |
| C-find | "Buttons that are hard to find" | Operator. See skeptic-10, T-tasks-form, skeptic-8 |
| C-system | "A weak design system" | Operator. See D-system |
| C-use | "Usability not quite right" | Operator |
| SD-1 | 13 dialogs are centred cards (`m-auto`) with the same class string copied by hand into each file, plus the More drawer. Three of them are named "Sheet" but none is docked to the bottom, none has a grabber. | Grep of `<dialog` in `components/` this session |
| SD-2 | The tab bar has six slots, one of them the overflow "More", which both Apple and Material advise against. Tasks, the tool for "who does what", sits inside More. Bars and Studies hold tab slots though neither serves priority 1. | `AppShell.tsx` lines 33 to 52 |
| SD-3 | Two button variants both look primary: `primary` is filled black ink, `accent` is filled blue. | `components/atoms/button.variants.ts` |
| SD-4 | The app opens on the catalogue: `start_url` is `/`, which redirects to `/catalog`. | `site/public/manifest.webmanifest`, brief |
| SD-5 | The note for tonight is shown in a monospace font in the entry sheet. | `audit-design-system/overlays/390x844-entry-sheet.png` |
| SD-6 | Catalogue cards are tall and repeat "no chart" on most cards: 44 songs make a 5803 px page at 390x844, almost 7 screens. | `audit-structure/log.jsonl` (`sweep_catalog`), baseline screenshot |

## A. Restructure

### A1. Four tabs shaped around the two jobs

- **Solves:** SD-2, C-find, skeptic-9, S-more, task 3 depth.
- **Borrows:** Apple's tab bar guidance ("Avoid overflow tabs", one word per tab, badges only for critical information) and Material's three to five destinations (BP-1). Slack's move to a few tabs because things were hard to find (BP-1).
- **Change:**
  - **Home**: what is next for me (A2).
  - **Sessions**: the agenda of practices and concerts, with a "Setlists" segment at the top for the setlist library (setlists live on their own, so they keep a list, one tap away).
  - **Songs**: the catalogue, with a "To learn" filter that replaces the Studies tab.
  - **Band**: tasks first (A9), then rows for members and mastery, instruments, venues (Bars), compositions and improvements.
  - The account page stays behind the avatar, now shown on Home and Band.
  - Remove the numeric badges. Keep one dot on Home when something new arrived for me.
- **Cost:** `AppShell.tsx`, `BottomTabBar.tsx`, `navigation-active.core.ts` and its test, `navigation-badges.hook.ts`, `App.tsx` (new `/home` and `/band` routes, `/` redirects to `/home`), `SessionsPage` (setlists segment), `StudiesPage` (folded into a Songs filter), `en.json` and `fr.json`. The architecture maps regenerate.
- **Success check:** the tab bar has 4 items and no overflow. Every feature is at most 2 taps from a tab. Tasks are 1 tap from any screen (today 2, through More). No tab shows a number.

### A2. Home: "Next up"

- **Solves:** skeptic-4, SD-4, task 12, and part of task 3.
- **Borrows:** Things and Todoist open on Today; Reminders shows "Assigned to me" first; Linear pins "My issues" (BP-11, BP-10). The "my part" filter of Band Central and BandHelper's personal view (BM-A6).
- **Change:** a new first screen, built from data pragma already holds.
  - The next session, practice or concert, whichever comes first. It shows date, time, place, the setlist name, its song count and total time, and a short readiness list computed from existing rules: songs with no lineup, transitions marked risky, songs missing a key. One primary button: "Open the setlist".
  - "Your part": where I sing lead and where I switch instrument, computed with the existing `resolveLineup`.
  - "Your tasks": my open tasks, nearest due date first.
  - "New since …": the latest take comments and transition comments by others.
  - Delete `NextConcertStrip`; Home replaces it.
- **Cost:** new `routes/home/HomePage.tsx`; new organisms `NextSessionCard`, `MyPartList`, `MyTasksList`, `RecentActivityList`; a pure `home.core.ts` for the readiness checks and "next session" choice (100% coverage gate); delete `NextConcertStrip.tsx`; i18n. Reuses existing queries for sessions, setlists, tasks and takes, so no new endpoint is required for a first version.
- **Success check:** opening the app at 390x844 shows the date, place and setlist of the next session, including a practice, and the signed-in member's part, with 0 taps (today the practice 3 days away is shown nowhere at a glance, per skeptic-4).
- **Mockup:** `mockups/compare-home.png`.

### A3. The setlist shows the decisions on each row

- **Solves:** skeptic-3, skeptic-10, C-find, tasks 2, 4, 5 and 6.
- **Borrows:** Banderly and Planning Center show who sings and which key on the row (BM-A5). BandHelper shows links and pauses between songs and a running time (BM-A3, BM-A4). Apple's "one primary action" and Material's single floating button (BP-4).
- **Change:**
  - Header: back link, title, and one meta line ("Sun 1 Nov · 20 songs · 1 h 18"). Total time comes from `songs.durationSeconds`, which already exists. A small energy line sits next to the title; tapping it opens the full energy chart in a sheet.
  - The row of member pills becomes one segmented control: **Everyone / My part / Transitions**.
  - Each row shows the key (an override as "E → F#"), the capo, the lineup avatars, who sings lead, and the first line of the entry note. Artist and key are no longer hidden below the `sm` width.
  - Between two rows, the transition line is always there: its comment when there is one, a risk icon when the transition rule flags it, or a faint "+ Note on this transition".
  - The five icon-only header buttons and the two round floating buttons go. A bottom action bar holds **Add songs** (primary) and **More** (play in stage mode, energy chart, vote, copy the order, rename, share).
- **Cost:** `SetlistEditor.tsx`, `SetlistToolbar.tsx`, `SetlistHeaderActions.tsx` (its actions move into `OverflowMenu`), `SetlistEntryRow.tsx` and its test, `SetlistEntriesList.tsx`, `TransitionStrip.tsx`, `MemberFilterPills.tsx` (replaced by the segmented control), `BottomActionBar.tsx`, `setlist-editor.utils.ts` (total duration), i18n.
- **Success check:** at 390x844 the first song row starts at or above 215 px (today about 265, read from the baseline screenshot); at 375x667 at or above 190 px (today 269, skeptic-10). The note, key change and capo of an entry are readable on the row without opening it (task 6 success condition). The header has no icon-only button. The screen has exactly one filled blue button.
- **Mockup:** `mockups/compare-setlist.png`.

### A4. The session page is where the band prepares

- **Solves:** skeptic-2, skeptic-5, tasks 1, 3 and 7.
- **Borrows:** a Planning Center plan holds the people, the songs and the notes in one place (BM-A5, BM-A9). Discussion attached to the item, not in a separate chat (BP-9). BandHelper records from the song being played (BM-B1).
- **Change:** the session page lists, in this order:
  1. Who is coming (only if decision D4 is yes).
  2. The setlist: its first three songs, flags such as "no lineup", the total time and an "Open" link.
  3. Who does what: tasks linked to this session, with "+ Add a task for this practice" (needs decision D3).
  4. Talk: a short message thread (needs decision D5).
  5. Takes recorded at this session, grouped by song with their comment counts. The data already exists (`takes.sessionId`).
  - Primary action: **Start the practice** before or on the day, which opens the setlist in practice mode with a record button on each row, already tied to that song and this session. After the date, the primary action becomes **Listen back**.
  - The long "Record takes" list of song names goes away; recording moves to the setlist rows.
- **Cost:** `SessionDetail.tsx`, `SessionSetlists.tsx`, `PracticeRecordingList.tsx` (replaced), `TakeList.tsx` reused with a session filter, a takes query by session (check the existing API first), a new `SessionTasks` organism, and, if D3 is yes, a `session_id` column on tasks with its migration, repository, controller, schema and tests.
- **Success check:** the past practice with 7 takes lists all 7 on its page (today 0, skeptic-2). From the session page, creating a task for that session takes 3 taps plus typing.
- **Mockup:** `mockups/compare-session.png` (the "before" is the coming practice, `skeptic/shots/390x844_session-next-practice.png`).

### A5. One bottom sheet for every edit

- **Solves:** SD-1, SD-5, T-notes, T-transition, C-use, tasks 4, 5 and 6.
- **Borrows:** Apple's sheet rules: a grabber, half and full height, swipe down to close, ask before discarding a draft, and "Display only one sheet at a time" (BP-3). Material's modal bottom sheet (BP-3).
- **Change:**
  - A new `Sheet` molecule on the native `<dialog>`: docked to the bottom, rounded top corners, a grabber, a header with the title and "Done", one scrolling body, a sticky footer for actions, and a maximum height of 92% of the screen. It replaces the 13 copied class strings and the More drawer.
  - A sheet never opens another sheet. The lineup is edited inside the entry sheet, not in a second dialog.
  - Closing with the backdrop keeps the draft (the parent holds it) or asks first.
  - The entry sheet shows the song's key next to tonight's key and the capo, the lineup with any change highlighted, and the note in the body font. The note saves after a short pause, and older saves can never overwrite newer ones. "Record a take" and "Open the song" sit in the footer. "Remove from setlist" moves to the row's menu, away from the main actions.
  - Swipe down to close is part of the target, but see decision D10.
- **Cost:** new `components/molecules/Sheet.tsx` and `sheet.variants.ts`; migrate the 13 dialogs (`InstallWalkthroughSheet`, `TransitionCommentModal`, `CreateSetlistDialog`, `SetlistEntrySheet`, `SetlistSongPicker`, `RecordingSheet`, `CreateSessionDialog`, `TakeUploadForm`, `AttachSetlistDialog`, `LineupEditor`, `ConfirmDialog`, `SongDefaultsDialog`, `ListenLinksDialog`); `SetlistEntryNotesField.tsx` with a pure `latest-write.utils.ts` (100% coverage); `SetlistEntryKeyCapoFields.tsx`; `LineupEditor` gains an inline mode.
- **Success check:** no `<dialog>` outside `Sheet` uses `m-auto`. With any sheet open, `count-scroll.js` reports exactly 1 vertical scroll area at both sizes. Rerunning `skeptic/notes-race.mjs` (23 characters, 0 to 700 ms random delay, 8 runs) stores the full text every time and sends at most 3 requests per run (today 23 requests, 1 lost text in 4 runs). Tapping the backdrop of the transition sheet and reopening it shows the draft.
- **Mockup:** `mockups/compare-entry-sheet.png`.

### A6. One scroll per screen

- **Solves:** C-scroll, S-chart, S-bars, S-more.
- **Borrows:** Apple: "Avoid putting a scroll view inside another scroll view with the same orientation" (BP-2). Horizontal strips inside a vertical page stay allowed.
- **Change:** the rule is "the page scrolls, nothing inside it scrolls in the same direction".
  - Text areas grow with their content and never scroll themselves: remove the 55% cap in `auto-grow-textarea.utils.ts` and use the auto-grow text area for the bars message.
  - The chord preview loses its `max-h-[55vh]` and sits below the text it previews (see A8).
  - The More drawer disappears with A1.
  - Sheets own the only scroll while open; the page behind is already locked by `html:has(dialog[open])`.
  - Turn the coordinator's `count-scroll.js` into a test: a Playwright check that opens every route and every sheet at 375x667 and 390x844 and fails on 2 or more vertical scroll areas.
- **Cost:** `auto-grow-textarea.utils.ts` and its test, `SongChordPreview.tsx`, `SongEditForm.tsx`, `BarsPage.tsx`, one new end-to-end test in `apps/pragma`.
- **Success check:** every screen and every open sheet has at most 1 vertical scroll area at both sizes (today: song edit with a chart 3, `/bars` 2, More drawer 2 at 375x667). The new test fails if one comes back.

### A7. One labelled primary action, always in the same place

- **Solves:** C-find, skeptic-8, skeptic-10 (round buttons covering a row), T-tasks-form.
- **Borrows:** Material: one floating action button per screen for the most common action; Apple: one primary action, style rather than size; Reminders keeps "New reminder" at the bottom (BP-4).
- **Change:** each main screen gets at most one blue button with words, in an action bar just above the tab bar. Secondary actions go in a "More" button next to it or in a text link in the header.

  | Screen | Primary action |
  | --- | --- |
  | Home | Open the setlist (inside the next-session card) |
  | Sessions | New session |
  | Session | Start the practice, or Listen back after the date |
  | Setlist | Add songs |
  | Songs | Add a song |
  | Song | Add to a setlist |
  | Band | New task |

- **Cost:** `BottomActionBar.tsx` and `bottom-action-bar.core.ts`, the seven pages above, `button.variants.ts` (see B3).
- **Success check:** on each of the seven screens there is exactly one filled blue button, labelled with words, visible on arrival at both sizes, with its centre in the bottom 25% of the screen. No round icon-only floating button remains.

### A8. The song page serves learning, and chords are easy to add

- **Solves:** skeptic-6, skeptic-7, S-chart, skeptic-8, tasks 9 and 10.
- **Borrows:** OnSong's "Detect chords in lyrics", BandHelper's "ChordPro tools" and SongbookPro's paste import, which all accept chords written above the lyrics (BM-C1). Photo and PDF as equal first choices (BM-C4). A "find chords" link that opens a web search instead of scraping (BM-C2). Key detection from the chords (BM-C5).
- **Change, song page:** in this order:
  1. Title, artist, key, length, status.
  2. Listen: Deezer, Spotify, YouTube and the latest take, as one row of buttons.
  3. Your part: the instrument I play on this song, my mastery, and an "I practised" button that logs a study in one tap.
  4. Chords: chords shown **above** the words, not in brackets, with transpose buttons and one "Full screen" link, which becomes the only way into stage mode from the song.
  5. Takes, then notes and the default lineup.
  - Primary action: **Add to a setlist**, which opens a sheet listing the setlists of coming sessions; one tap adds the song.
- **Change, adding chords:** "Add chords" opens a full-screen step with three equal choices: **Paste text**, **Take a photo**, **Add a PDF**.
  - Paste accepts the text exactly as chord websites give it. A pure function finds the chord lines and merges each one into the lyric line below it, producing ChordPro. ChordPro pasted as is still works.
  - The converted preview sits right under the text, so a wrong line is easy to spot and fix above it.
  - A key guess from the first and last chords fills the song's key when it is empty.
  - "Find chords for <title>" opens a web search for "<title> <artist> chords" in a new tab.
  - The result is stored as ChordPro, so there is no schema change and the scene view keeps working.
- **Cost:** `SongDetail.tsx`, `SongDetailHeader.tsx`, `SongChartPreviews.tsx`, `ChordChartViewer.tsx` (chords above words), `SongChartFields.tsx`, `SongChordPreview.tsx`, `SongEditForm.tsx` (the chart leaves the long edit form for its own step), a new `site/src/lib/chord-sheet.utils.ts` with its test at 100% coverage, the existing `chordpro.utils.ts`, the existing study mutation, a new `AddToSetlistSheet` organism.
- **Success check:** a chord sheet copied from a chord website is saved in 3 taps from the song page (Add chords, paste, Save) without typing any ChordPro syntax. The converter's tests cover at least ten real-world layouts (chords only lines, section headings, tabs, repeated chords, lines with no chords). The song page has 1 way into stage mode (today 3, skeptic-6). A song reaches a coming setlist in 2 taps from its page (today there is no way, skeptic-8).
- **Mockups:** `mockups/compare-song.png` and `mockups/compare-chords.png`.

### A9. "Who does what" on the Band tab and on each session

- **Solves:** T-tasks-form, skeptic-1, skeptic-5, task 3.
- **Borrows:** Reminders' "Assigned to me" and @-assignment, Linear's "My issues", Todoist's quick add with an assignee (BP-5, BP-10).
- **Change:** the Band tab opens on tasks, with a segmented control **My tasks / Everyone**, grouped by session when D3 is yes (by due date otherwise). **New task** opens a sheet: title; assignee as a row of avatars, one tap; due date as quick choices ("Before the next practice", "Before the concert", or a date); optional song and session. The one-line quick add stays at the top. Linked song names are cut with an ellipsis instead of widening the page.
- **Cost:** `TasksPage.tsx` (becomes the top of a new `BandPage`), `TaskForm.tsx` (into a sheet), `TaskRow.tsx`, `MemberTaskColumn.tsx`, `QuickAddForm.tsx`, and the tasks API if D3 is yes.
- **Success check:** a task with assignee, due date and song is created in at most 6 taps plus typing, with no scrolling (today the full form starts 1831 px down at 375x667). `/tasks` is exactly as wide as the screen at 375 and 390 (today 493 px, skeptic-1), and the tab bar stays visible.
- **Mockup:** `mockups/compare-band.png`.

### A10. Grow the catalogue in a few taps

- **Solves:** task 8, SD-6, skeptic-8.
- **Borrows:** Todoist quick add, title first and details later (BP-5); forScore's placeholder songs in a setlist (BM-A7); Things turning a pasted list into several items (BP-5); BandHelper's practice list driven by a tag (BM-B4).
- **Change:**
  - **Add a song** opens a sheet with one field. It searches the music service (the existing `SongSearch`) and always offers "Add '<typed title>' as an idea". A switch "Also add to Wednesday's practice" puts the song straight on the next practice setlist. Pasting several lines offers to add each line as an idea.
  - Catalogue rows become compact list rows (cover or initial, title, artist and key, status, a chord icon only when a chart exists), about 64 px high instead of about 110.
  - A "To learn" filter (songs on a coming setlist where my mastery is low) replaces the Studies tab.
- **Cost:** `CatalogPage.tsx`, `CatalogGrid.tsx`, `SongCard.tsx` (becomes a row), `SongSearch.tsx` reused, `catalog-page.core.ts` (the to-learn filter), `StudyQueue.tsx` merged, `SetlistSongPicker.tsx` (shares the "add as idea" path it already has).
- **Success check:** a new song is in the catalogue and on the next practice setlist in at most 4 taps from the Songs tab, with no full form. The catalogue page with 44 songs is at most about 3500 px tall at 390x844 (today 5803).

## B. Design system

### B1. Six text roles

- **Solves:** D-system, C-system.
- **Borrows:** Material's named type roles (BP-12); Apple's "minimize the number of typefaces" (BP-12).
- **Change:** declare six roles in the `@theme` block of `styles/tokens.css` so Tailwind generates `text-display`, `text-title` and so on:

  | Role | Font | Size / line height | Use |
  | --- | --- | --- | --- |
  | display | Instrument Serif | 30 / 34 | Page title, one per screen |
  | title | Instrument Serif | 22 / 26 | Song title on its page, card titles |
  | heading | Geist 600 | 15 / 20 | Section headings |
  | body | Geist | 15 / 22 | Running text, list row titles, inputs (16 on inputs for iOS) |
  | meta | Geist | 13 / 18 | Secondary lines |
  | label | Geist 500, capitals | 12 / 16 | Field labels, small overlines |

  JetBrains Mono stays for keys, capo, durations and chords only. Notes and other prose move to the body font (SD-5).
- **Cost:** `styles/tokens.css`; a sweep of every `text-[…]` and `text-xs` / `text-sm` use in `site/src`; a new ESLint rule in `eslint-rules/` (with its `RuleTester` suite) that refuses arbitrary font sizes in `className`, cited in the styling standard under `docs/standards/` so the enforcement ledger stays honest.
- **Success check:** outside the scene views, the live inventory finds at most 7 distinct font sizes (today 18) and 0 `text-[` in `site/src` (today 21 hand-picked sizes, per the skeptic).

### B2. Space and shape

- **Change:** spacing on a 4 px grid using only the steps 4, 8, 12, 16, 24 and 32. Page gutter 16, gap between sections 24, row padding 12. Radii: `sm` 4 for badges, `md` 8 for buttons and inputs, `lg` 14 for cards and sheets, `full` for chips and avatars. Move the 5 uses of `rounded-xl` (22 px) to `lg`, then remove `radius-xl` and the 1 px one-offs.
- **Cost:** `styles/tokens.css`, and the components touched by B4.
- **Success check:** the live inventory finds at most 4 distinct radii (today 5, including one-offs) and no spacing value outside the six steps.

### B3. Colour roles

- **Solves:** SD-3, C-find.
- **Change:**
  - Blue accent means "the primary action" and links, nothing else.
  - Filled ink (black) means "selected": the active chip, the active segment, the concert-ready badge.
  - Red is for destructive actions only.
  - Rename the button variants to `primary` (blue), `secondary` (outlined), `ghost` and `danger`, and drop today's black `primary`.
  - One member palette from the `--color-member-*` tokens for avatars everywhere (the inventory shows a second set of avatar colours).
  - Song covers: the real cover when the music service gave one, otherwise one neutral tile with the initial, instead of a different generated colour per song (the inventory counts 61 background colours).
- **Cost:** `button.variants.ts`, `avatar.variants.ts`, `album-cover.variants.ts`, `member-palette.utils.ts` and its test, `AlbumCover.tsx`, every caller of `variant="primary"` or `variant="accent"`.
- **Success check:** the live inventory finds at most 15 background colours (today 61) and at most 6 button looks (today 23).

### B4. The target component set

- **Solves:** D-system, SD-1.
- **Keep or create (about fifteen):** `Button`, `IconButton` (an accessible label is required, and a visible one inside action bars), `Chip` (something you choose), `Badge` (something you read), `Avatar` and `AvatarStack`, `Input`, `AutoGrowTextarea`, `Field` (label, control, hint), `SegmentedControl`, `ListRow`, `Section` (heading plus an optional link), `PageHeader` (back link naming the parent, title, meta line, one trailing text action), `Sheet`, `ActionBar`, `EmptyState`.
- **Merge:**
  - `SegmentButton`, `FilterPillGroup`, `MemberFilterPills` and `VoteModeToggle` into `SegmentedControl`, or a chip group for multi-select.
  - `BottomActionBar` and `StickyFormActions` into `ActionBar`.
  - `StatusChip` into a `Badge` tone.
  - `Crumb` and `BackLink` into `PageHeader`.
  - The bespoke section cards into `Section`.
- **Delete:** the 57 raw `<button>` elements (they become `Button` or `IconButton`), the 8 `h1` styles (only `PageHeader` draws a page title), `NextConcertStrip` (replaced by Home).
- **Cost:** new `ListRow`, `Section`, `Sheet`, `SegmentedControl`, `ActionBar`, `EmptyState`; merges as listed; a blueprint for each new atom or molecule, following `atom-variant`.
- **Success check:** 0 raw `<button>` outside `components/atoms/`; 1 page title style; the blueprint index lists each new component.
- **Mockup:** `mockups/after-system.png` shows the roles, buttons, chips and badges, one list row and one sheet.

## C. Polish

Each item is small and independent. Most can ship before the restructure.

| Id | Solves | Change | Cost | Success check |
| --- | --- | --- | --- | --- |
| C1 | skeptic-1 | Cut long song names in task chips with an ellipsis | `TaskRow.tsx` | `/tasks` width is 375 at 375 and 390 at 390; tab bar visible |
| C2 | T-notes | Save the entry note after a short pause and drop answers to older saves | `SetlistEntryNotesField.tsx`, new pure `latest-write.utils.ts` | `notes-race.mjs`: 8 of 8 runs store the full text |
| C3 | T-transition | Keep the transition draft when the dialog closes by the backdrop | `TransitionCommentModal.tsx` | Reopen shows the draft |
| C4 | skeptic-9 | Remove the numbers from the tab bar | `navigation-badges.hook.ts`, `BottomTabBar.tsx` | No number on any tab |
| C5 | SD-6 | Show a chord icon only when a song has a chart; drop the "no chart" text | `SongCard.tsx` | No "no chart" text on `/catalog` |
| C6 | skeptic-6 | Show "Edit" once on the song page | `SongDetailHeader.tsx`, `SongChartPreviews.tsx` | One "Edit" button on `/catalog/:id` (today 2) |
| C7 | C-use | Back links name the parent ("Sessions", "Le Petit Bain") instead of "Back" | `BackLink.tsx` callers | No back link reads "Back" |
| C8 | C-use | The setlist subtitle reads "Concert · Sun 1 Nov" instead of "Played in Le Petit Bain" (French: "Jouée dans") | `SetlistEditor.tsx` header | Date visible under the title |
| C9 | C-use | Hide the empty "Prepared concert" picker on a past practice | `PracticeReadView.tsx` | Not shown on the past practice |
| C10 | task 11 | Add a two-line explanation of how a vote runs on the vote screen | vote route, i18n | Text visible on arrival |
| C11 | T-createSession (unverified) | Put focus on the first field, not on Cancel, in the new session dialog | `CreateSessionDialog.tsx` | Focus lands on the type or date field |
| C12 | Safe area (skeptic row 17) | Pad the shell top with `env(safe-area-inset-top)`. It is 0 today with the `default` status bar style, so it changes nothing now and protects a future switch to `black-translucent` | `AppShell.tsx` | No visual change today |

## Decisions only the operator can take

| Id | Decision | My recommendation | Trade-off |
| --- | --- | --- | --- |
| D1 | Move to four tabs (Home, Sessions, Songs, Band); Bars and Studies leave the tab bar | Yes | Bars and Studies cost one more tap; the two jobs get the bar |
| D2 | Open the app on Home instead of the catalogue | Yes | Browsing songs costs one tap more |
| D3 | Link a task to a session (a new `session_id` column) | Yes, session only, not setlist | A schema column and an ADR; without it "who does what for Saturday" has no home |
| D4 | Add "I'm in / I'm out" per member on each session | Yes, as a later step after A4 | A new table and a push reminder; it closes the "who comes" question that today lives in a chat |
| D5 | Add a short message thread on a session | Yes, on sessions only, with text messages first | A new table; voice messages could reuse the recorder later. Without it, discussion stays in the chat app |
| D6 | Add breaks inside a setlist | Total time now; breaks later | Total time needs no schema change; breaks need a new entry kind |
| D7 | Hide the energy chart by default on the phone | Yes, a small line next to the title that opens the full chart | People who plan by energy need one more tap |
| D8 | Demote stage mode to "Full screen" on the chord card and to the setlist's More menu | Yes | Stage mode is one tap deeper; the operator said it is not a priority |
| D9 | Chords: paste converter, photo and PDF only; no web scraping, no chord detection from audio | Yes | Some songs will have no chords; scraping raises licensing questions and audio detection needs an outside service |
| D10 | Swipe down to close a sheet: write it with pointer events, or add a library | Write it ourselves on the native dialog, first without swipe, then add the swipe | A library is a new dependency and an ADR; without swipe, "Done" and the backdrop still close the sheet |

## Order of work for the implementation team

This is an order of dependencies, not a schedule.

1. **Foundation**: B1, B2, B3, then the new components of B4 (`Sheet`, `ActionBar`, `ListRow`, `Section`, `SegmentedControl`, `PageHeader`). Every later step uses them. The polish items C1 to C12 can go in parallel with this step.
2. **Navigation and Home**: A1 and A2 (after D1 and D2).
3. **Setlist and sheets**: A3, A5, A6 together, because they touch the same files (`SetlistEditor`, `SetlistEntryRow`, `SetlistEntrySheet`).
4. **Session hub**: A4 (after D3 to D5).
5. **Songs and chords**: A8, A10.
6. **Band tab**: A9.

Two shared files will collide across agents: `en.json` and `fr.json`. Give one agent ownership of each merge, or have each agent add its keys in one block at the end. The whole-repository generators (blueprint index, architecture maps) should run once, after all agents finish.

## Mockups

All mockups are in `docs/features/pragma/ux-redesign/audit/solution-designer/mockups/` in the session that ran the audit (not archived; the second round in `../solution-designer-2/mockups/` is). Each `compare-*.png` shows the "before" screenshot taken by another agent next to the "after" mockup. The `after-*.png` files are the mockups alone at 390x844. The HTML sources are in `mockups/src/`; they use the app's colours, fonts (copied from the repository's `@fontsource` packages) and the proposed text roles, defined in `mockups/src/system.css`. `render.sh` re-renders them with `scripts/browser.sh`.

| Proposal | Comparison | Before taken from |
| --- | --- | --- |
| A1, A2 Home and tabs | `compare-home.png` | `coordinator/measure-baseline/390x844_catalog.png` |
| A3 Setlist | `compare-setlist.png` | `coordinator/measure-baseline/390x844_setlists_….png` |
| A4 Session | `compare-session.png` | `skeptic/shots/390x844_session-next-practice.png` |
| A5 Entry sheet | `compare-entry-sheet.png` | `audit-design-system/overlays/390x844-entry-sheet.png` |
| A8 Song page | `compare-song.png` | `coordinator/measure-baseline/390x844_catalog_….png` (Wonderwall) |
| A8 Add chords | `compare-chords.png` | `audit-structure/shots/375x667_chart-chordpro-filled.png` (the only capture of the three scroll areas; it is 375x667) |
| A9 Band | `compare-band.png` | `audit-design-system/live390/390x844_tasks.png` |
| B Design system | `after-system.png` | none |

The "before" screenshots come from different agents and runs, so some are in French and some in English, and the data differs slightly between them (for example the seeded session dates).

## What the emulator and the mockups could not prove

- **The mockups are pictures.** Tap counts and positions in the success checks are design targets. They have to be measured again on the built screens with `measure.mjs`, `count-scroll.js` and argent.
- **Touch.** Swipe to close a sheet, dragging a row to reorder it, and long press were not tried. argent's `gesture-swipe` does nothing on Chromium, and no agent dragged the reorder handle with real touch.
- **The keyboard.** Chromium shows no software keyboard, so whether the keyboard covers the sheet footer or the note field in the entry sheet is unknown. iOS Safari does not resize the layout for the keyboard, which matters for every sheet with a text field. This needs a real iPhone.
- **iOS sheets.** Whether iOS Safari keeps the page still behind an open `<dialog>`, and whether a swipe that starts near the bottom edge reaches the sheet or triggers the home gesture, can only be checked on a device.
- **Recording.** "Start the practice" with a record button per row depends on recording from a home screen app on iOS, which public reports describe as unreliable after the app is reopened (BM-B1). Test it on the band's phones before relying on it.
- **Real network timing** for the note save fix, and several members editing one setlist at once.
- **The top safe area.** It is not a problem today (skeptic row 17); C12 only protects against a future change.
