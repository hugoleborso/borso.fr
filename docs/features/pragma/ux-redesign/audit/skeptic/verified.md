# Pragma UX audit: skeptic's verified findings

## Read this first

The three findings files I was asked to refute did not exist. I looked at 10:46 and again at 11:15 (UTC, 2026-10-25):

- `audit-structure/findings.md`
- `audit-pwa-touch/findings.md`
- `audit-design-system/findings.md`

No auditor process was running, `ListAgents` showed no other session, and nothing in their folders had changed since 10:42. Their raw output was still there: `audit-structure/log.jsonl` and `system-inventory.json`, `audit-pwa-touch/setlist-pass.json` and `forms-pass.json`, and the screenshots and `inventory.json` in `audit-design-system`. So I did two things:

1. I turned each claim I could read in that raw data into a candidate finding, gave it an id that names its source (`S-` for structure, `T-` for touch, `D-` for design system), and tried to refute it on my own instance (port 5184) and in the code.
2. I worked as the completeness critic: I covered the top tasks that no raw data touched (tasks 3, 6, 7, 8, 12) and added findings `skeptic-1` to `skeptic-11`.

When the auditors' findings files appear, map their ids to the `S-`, `T-` and `D-` rows below. Claims that only exist in their prose have not been checked.

All live measurements used the coordinator's runbook: an installed-app emulation (standalone forced, safe-area insets set) at 375x667 and 390x844, seeded data, Playwright through my copy of the structure auditor's helper (`skeptic/lib.mjs`). Scripts and screenshots are in `skeptic/`.

## Ranked table

Ranks follow the operator's priorities: setlist preparation first, catalogue growth and learning second, design system and polish after. "Confirmed" means I reproduced it live or the code shows it without doubt. "Refuted" means I could not reproduce it, or the cause given was wrong.

| Rank | Id | Verdict | Impact | Finding | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | T-notes | Confirmed in a different form | Major, task 6 | Typing a note in the setlist entry sheet sends one save request per keystroke (23 characters gave 23 requests), with no delay and nothing to keep them in order. On a slow network the server can keep an older version. The auditor's "garbled text" did not happen in my 4 runs on a fast local network. I then added a random delay of 0 to 700 ms to each save, and in 1 run out of 4 the server stored `… riff se` while the field still showed the full `… riff seul`. The person sees nothing wrong until they reload. | `SetlistEntryNotesField.tsx`: `onChange` calls `onPatch({ notes: next })` on every keystroke. Script: `skeptic/notes-race.mjs`. |
| 2 | skeptic-2 | New | Major, task 7 | A session never shows the takes recorded at it. The past practice holds 7 takes, each with 2 comments, and its page says only "No setlist on this session" and "Attach a setlist to record its songs." Takes appear only on each song's page, so "listen back to Thursday and discuss it" means opening the songs one at a time and guessing which ones were recorded. | `SessionDetail.tsx` renders `PracticeRecordingList`, which has record buttons and no take list. `SongTakes` is used only in `SongDetail.tsx`. Screenshot `390x844_session-past.png`. |
| 3 | skeptic-3 | New | Major, task 6 | On a phone the setlist entry row shows no note, no key change and no capo. Artist and key are hidden below the `sm` width too. The success condition of task 6 ("the note is visible on the entry without opening the sheet again") fails: the band has to open each entry's sheet to find what was decided for tonight. Transition notes, by contrast, show in the list. | `SetlistEntryRow.tsx` receives `notes`, `keyOverride` and `capo`, uses them only to fill the sheet's form, and puts artist and key in a `hidden … sm:flex` span. |
| 4 | skeptic-5 | New | Major, task 3 | A task can be linked to a song only, never to a session or a setlist, and tasks show up only on `/tasks` and `/compos`. They are not on the song page, the session page or the setlist. "Agree who does what for Saturday's concert" has no place on the concert itself. | `api/src/tasks/tasks.schema.ts` has `songId` and no session or setlist id. `useTasksList` is called only in `TasksPage.tsx` and `ComposPage.tsx`. |
| 5 | T-tasks-form | Confirmed | Major, task 3 | The full new-task form (assignee, song, due date) sits at the end of `/tasks`, 1831 px down at 375x667 (about 3 screens). The top of the page has a title-only quick add, so assigning a job with a date means scrolling past every existing task or editing the task after it is created. | `forms-pass.json` gives `titleOnArrival` y=1831. My text dump of `/tasks` ends with "New task, TITLE, ASSIGNEE" after all 12 tasks. |
| 6 | skeptic-1 | New | Major on every phone, all tasks on `/tasks` | `/tasks` is wider than the phone. A task linked to a long song title shows that title in a chip that never wraps (397 px wide), so the page becomes 493 px wide at 375 and at 390. On load the page can be panned sideways and the chip is cut off. In Chromium the fixed tab bar is placed at the bottom of the widened page (877 px tall at 375x667) and is not on screen at all. Every other screen has a width of 375. | `skeptic/probe3.mjs`: `/tasks` `innerWidth` 493, `scrollWidth` 493; widest element `span.… whitespace-nowrap …` holding "Quand la ville dort encore…". Screenshot `375x667_tasks-zoomed.png` has no tab bar. The previous audit fixed long titles on other screens, not here. Safari may pan instead of moving the tab bar; the overflow itself is certain. |
| 7 | skeptic-4 | New | Major, task 12 | The "what is next" strip exists only at the top of Catalog and only for concerts. The practice 3 days away, which comes before the concert, is shown nowhere at a glance. "My part" opens the concert setlist filtered on you and does not list your tasks. | `NextConcertStrip` is used only in `CatalogPage.tsx`. `selectNextConcert` filters with `selectUpcomingConcerts`. |
| 8 | S-chart | Confirmed | Major, task 9 | Editing a song that has a ChordPro chart gives three vertical scroll areas at once: the page, the chart text box (it grows to 55% of the screen, then scrolls) and the preview (`max-h-[55vh]`, then scrolls). This is the clearest double scroll in the app. The preview also sits above the text box, about 885 px above it at 375x667, so you cannot see the result while you type. | `auto-grow-textarea.utils.ts` (`VIEWPORT_SHARE = 0.55`), `SongChordPreview.tsx` (`max-h-[55vh] overflow-y-auto`), `SongEditForm.tsx` renders the preview at line 125 and the chart fields after it. Structure log `chart-chordpro-filled` gives v=3. `forms-pass.json` gives `previewVisibleWhileEditing.onScreen` false. |
| 9 | skeptic-7 | New | Major, task 9 | Adding chords requires ChordPro. The option is labelled "ChordPro text", has no help line and no example. The app cannot convert the "chords above the lyrics" format that chord websites give you. The viewer then shows chords in brackets inside the line (`[Ebm7]Very superstitious`) in a monospace font, which is harder to read than chords above the words. The operator said chords help only if they are really easy to add, and this is not easy. | `SongChartFields.tsx` (plain `AutoGrowTextarea`). No converter anywhere in `site/src` or `domain/`. Screenshot `375x667_song-superstition.png`. |
| 10 | skeptic-6 | New | Major, tasks 10 and 2 | The song page puts stage mode first. "Scene mode" is the single accent-coloured button, and it appears twice ("Edit" and "Scene mode" in the header, "Scene mode" again in the chart card). The things a person needs to learn a song (listen links, takes, notes, lineup) come after the whole chart: the page is 2101 px tall at 375x667 and the takes start below the chart. The operator said stage mode is not a priority. | `probe2.mjs` text and boxes: buttons Edit, Edit, Scene mode, Scene mode at y=213 and Scene mode at y=288. Screenshot `375x667_song-superstition.png`. |
| 11 | D-system | Confirmed | Major, design system | The design system leaks. The code has 8 different `h1` styles; a `PageHeader` molecule exists but several screens draw their own heading. There are 21 hand-picked text sizes (for example `text-[13px]` 23 times, `text-[13.5px]` and `text-[12.5px]` 11 times each, plus 9.5, 10.5 and 15 px). There are 57 raw `<button>` elements next to 121 uses of the `Button` atom. Corners use 4 radius steps plus 3 one-off values. The structure auditor's live inventory agrees: 18 font sizes on screen and 23 different button looks. | Greps over `apps/pragma/site/src`. `audit-structure/system-inventory.json`. |
| 12 | skeptic-10 | New | Minor, task 2 | In the setlist editor at 375x667 the first song starts at y=269, so 40% of the screen goes to the header, the member strip and the energy chart. The five header actions (play, energy, members, vote, more) are icons only. The two round floating buttons cover the right end of the fourth row. | `probe2.mjs` boxes. Screenshot `375x667_setlist.png`. |
| 13 | T-transition | Confirmed from the code, not live | Minor, task 5 | Tapping outside the transition note dialog closes it and loses what you typed. The draft lives in the dialog's own state, and the dialog is unmounted when it closes. A tap meant to close the keyboard can land on the dark backdrop. | `TransitionCommentModal.tsx`: `openDismissibleDialogOnAttach`, `useState` draft. Raw data: `draftAfterReopen` "". |
| 14 | skeptic-8 | New | Minor, task 8 | The song page has no "add to a setlist" action. A new song reaches the rehearsal only from the setlist side. The song picker there can create a song from its title, which is the shorter path, but nothing on the catalogue side points to it. | `SongDetail.tsx` and `SongDetailHeader.tsx` have no setlist action. `SetlistSongPicker.tsx` lines 59 to 64 create and add. |
| 15 | skeptic-9 | New | Minor, findability | The tab bar shows numbers that look like unread alerts but are not: 16 on Catalog (concert-ready songs), 1 on Sessions and 1 on Setlists (both "upcoming concerts"). The badges sit on top of the icons. | `navigation-badges.hook.ts`. Screenshot `375x667_setlist.png`. |
| 16 | S-lineup, S-picker | Refuted as double scroll | none | The structure log counts 2 vertical scroll areas in the lineup editor and the song picker. One of the two is the page behind the dialog, and the page is locked: `html:has(dialog[open]) { overflow: hidden }`. The touch auditor's own count with a dialog open agrees (1 area, page not scrolling). Each overlay has one real scroll area. The emulator cannot show whether iOS Safari honours that lock. | `styles/tokens.css` line 83. `setlist-pass.json` `lineupEditor` and `picker`. |
| 17 | Top safe area (brief and runbook lead) | Refuted as a real-phone issue | none today | The header sits under the 47 px inset only because the emulator forces a top inset. `index.html` sets `apple-mobile-web-app-status-bar-style` to `default`, so an installed iOS app starts below the status bar and gets a top inset of 0. Android installed apps also start below the status bar. The header would only collide if someone switched to `black-translucent`. If that happens, the missing `safe-area-inset-top` padding becomes a real bug. | `apps/pragma/site/index.html`. This is how the platforms behave, not something measured: the emulator cannot show it. |
| 18 | T-notes "garbled text" | Refuted | none | The touch auditor recorded the note becoming `Tom  Tom lance le riff seullance le riff seul`. I could not reproduce that in 8 runs (4 without delay, 4 with random delay). The field always held the right text. The likely cause is the probe pressing `End` in a wrapped textarea, which moves the cursor to the end of the visible line, not the end of the text. My first run did exactly that. The real defect is the one in row 1. | `skeptic/notes-race.mjs`. |

### Candidates I did not verify

Following the brief's rule, these are not confirmed. They come from raw data only and I had no time to reproduce them.

- **S-more**: at 375x667 the More drawer is 779 px tall on a 667 px screen, so the drawer scrolls and its last rows start off screen. This was measured once and not by me.
- **S-bars**: `/bars` has a second scroll area, the outreach message text box (304 of 208 px). Bars are low priority.
- **T-createSession**: the create-session dialog puts focus on Cancel first. I did not read the code.

## What no auditor's raw data covered

- **Task 3 (who does what)**: only the tasks form position (T-tasks-form). Added skeptic-1, skeptic-4 and skeptic-5.
- **Task 6 (note on an entry)**: only the typing race. Added skeptic-3.
- **Task 7 (takes and discussion)**: nothing. Added skeptic-2.
- **Task 8 (new song onto the rehearsal)**: nothing. Added skeptic-8.
- **Task 12 (what is next)**: a "My part" screenshot only. Added skeptic-4.
- **Task 10 (learn a song)**: a song page sweep only. Added skeptic-6.
- **Task 11 (vote)**: still not covered. `/setlists/:id/vote` at 375x667 shows "Open a vote", "How many songs?" and "Nobody has scored a song yet." with no explanation of how a vote runs. I did not walk the flow to the end.
- **Real touch through argent**: none of my findings used argent, and the raw data shows no drag of the reorder handle and no scroll-trap gesture inside an overlay. Reordering by drag (task 2) is still unproven with real touch.

## What the emulator could not prove

- Whether iOS Safari keeps the page still behind an open dialog (row 16), and what it does with the wide `/tasks` page (row 6). Chromium hides the tab bar; Safari may only allow sideways panning.
- The status bar overlap (row 17): this is about platform behaviour, and the emulator's forced inset is exactly what produced the false alarm.
- Network timing on a real phone (row 1). I simulated 0 to 700 ms of random delay. A real mobile connection may be better or worse.
- Recording and playing takes (row 2): no microphone, and the seeded audio files do not exist.
- The software keyboard: nothing here measured what it covers.

## Housekeeping

- My instance on 5184 is stopped. No other instance was running, so I also stopped the shared Postgres cluster. `pgrep` finds no `vite-site`, `main.dev` or `postgres` process.
- Nothing under `apps/` was changed. Nothing was committed or staged.
- Friction logged with `scripts/kaizen.sh --from skeptic`.
