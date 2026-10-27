# Pragma task metrics: measured baseline

This is the baseline the build will be judged against. Every number below was measured on the current app on 2026-10-26, on site port 5182 with the audit seed, at 390x844 in emulated standalone display mode (top inset 47 px, bottom inset 34 px). Every tap, scroll and drag went through argent. The data is in [baseline.json](./baseline.json) and the build can rerun the whole thing with `run-baseline.sh` (in the audit scratchpad; see the spec, slice 1, for moving it into the repository).

## How it was measured

- **Taps** count every gesture-tap, plus one for each choice in a native picker (a select or a date field), plus one for each drag. Typing is counted apart as **text entries**, one per field filled.
- **Scroll gestures** count the argent wheel gestures the script needed to bring the next control into view. Each gesture moves at most 70% of the screen, which is about one firm swipe with a thumb.
- **Screens visited** count every distinct page and every overlay (dialog or sheet) the walk reached, including the start screen.
- **Visible on arrival** means the control's centre was on screen, not under the tab bar and not covered, at the moment the person reached that step, before any scroll made for it. For the first step on a screen this is the screen as it opens; for a later step it is the screen as the earlier steps left it.
- **Bottom third** means the control's centre sat at or below 2/3 of the screen height at that same moment. The position column gives that height as a fraction of the screen (0 is the top edge, 1 the bottom edge; a value below 0 or above 1 is off screen and gives the distance in screens).
- **Scroll areas** follow the brief: elements with `overflow` auto or scroll whose content is larger than their box, plus the page itself when it scrolls. They were taken on every screen and overlay the walks reached, and on first load for every route.
- **Icon-only buttons** have a visible icon (an `svg`, an image or a one-character glyph) and no visible text. **Text-only buttons** have visible text and no icon. Links are counted apart, because several actions in the app are links drawn as buttons (New song, Scene Mode).

Every task starts from a fresh seed and a fresh sign-in, on the start screen the brief gives. The walk takes the shortest path the app offers today; where the brief names a path that turned out longer, the shorter one was used and the step notes say so.

## What the baseline shows

- **Preparing a rehearsal costs 18 taps for 10 songs** and 7 screens and overlays, and the person picks songs with a "Done" button at 12% from the top of the screen. After the setlist is created the app stays on the session, so one more tap opens it.
- **Creating a full task (task 3) starts 2.2 screens below the top of `/tasks`.** The page is laid out 493 px wide on a 390 px phone, so it also scrolls sideways and the tab bar sits below the screen. The song field offers only the 6 compositions.
- **Notes do not show where they were written.** The transition note (task 5) and the entry note (task 6) were saved, and neither text appears on the setlist after saving.
- **Closing a vote (task 11) took 8 scroll gestures**: 4 to reach two songs further down the list and 4 to come back up to "Close the vote", which is at the top of the page. The closed vote replaced the 17-song rehearsal setlist with the 5 songs that got points.
- **The header sits under the status bar.** "My part" (task 12) and the concert link are at 25 px from the top, inside the 47 px top inset, and both "Open a vote" buttons are at 4 to 5% from the top.
- **Tab changes keep the old scroll position.** Coming back to Studies from a song page opened it 591 px down, so "Studied" (task 10) was above the screen.
- **Only 14 of the 32 primary actions sit in the bottom third** when the person reaches them; 9 sit in the top third and 4 are off screen until the person scrolls.
- **No screen or overlay had two vertical scroll areas at once** during the walks, and on first load only `/bars` (a notes text box) and `/catalog/:songId/edit` (the chart preview and the chart text box, 3 in all) have more than one.
- **133 of the 416 buttons on first load are icon-only.** The setlist editor alone has 26: its header (Energy, Audience vote, Open a vote, More actions), the floating Copy order and Add song, and 20 drag handles.

## What this run cannot prove

- **argent's tap is a mouse click on Chromium.** argent 0.22.1 sends a one-finger `gesture-tap` as a CDP mouse press and release, so the page sees `pointerType: mouse` and no `touchstart`. Every control here answers to a click, so the counts hold, but touch-only behaviour (the dnd-kit touch sensor's long press, for example) was not exercised. The reorder drag in task 2 went through the mouse sensor.
- **Recording and playback.** There is no microphone, so the record and stop buttons never appear (the sheet shows Upload and Close only); a real phone adds at least 2 taps to task 7. The seeded audio does not exist, so the "At <time>" box that pins a comment to a moment stays disabled.
- **Native pickers.** A select or a date field opens a native picker Chromium does not draw headless. The tap that opens it is real; the choice is set through the page and counted as one more tap.
- **Typing** goes through argent's keyboard, which cannot type accented characters, so typed text is plain ASCII. Chromium draws no software keyboard, so what it would cover is not measured.
- **Standalone mode is emulated**: `matchMedia('(display-mode: standalone)')` answers true and the safe-area insets are overridden through CDP, as in the runbook.

## How to rerun

```bash
/tmp/claude-0/-home-user-borso-fr/af56c1be-57ea-5b20-9cfd-fe2d2eef3c76/scratchpad/ux-audit/task-metrics/run-baseline.sh 5182 /path/to/after.json
```

It starts a pragma instance with the audit seed on that port, boots argent at 390x844 on the matching CDP and tool-server ports (9282 and 4382 for 5182), walks the 13 task paths, measures the 26 routes, and stops the instance and argent. The walk lives in `run-baseline.mjs` and the argent and CDP plumbing in `driver.mjs`. The selectors find controls by their accessible name or by a form field id, so a rebuilt screen with new labels needs the matching line in `run-baseline.mjs` changed; the counts it reports are the comparison.

## Top tasks

| # | Task | Taps | Text entries | Scroll gestures | Screens and overlays | Most vertical scroll areas at once | Done? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Prepare the next rehearsal | 18 | 0 | 3 | 7 | 1 | yes: practice created, setlist attached, 10 songs in order |
| 2 | Build the concert setlist | 10 | 0 | 2 | 6 | 1 | yes: order kept after reload |
| 3 | Agree who does what | 9 | 1 | 3 | 3 | 1 | yes: task saved with assignee, song and due date |
| 4 | Set the lineup for one song in a setlist | 4 | 0 | 0 | 3 | 1 | yes: override saved, song default unchanged |
| 5 | Note a transition | 3 | 1 | 0 | 2 | 1 | saved, but the note text is not shown on the list |
| 6 | Take a note on a song for tonight | 4 | 2 | 0 | 2 | 1 | saved, but the note is not shown on the row |
| 7 | Record a take and talk about it | 7 | 2 | 2 | 3 | 1 | comment posted; recording and pinning to a moment not provable here |
| 8 | Add a new song to the catalogue | 12 | 3 | 0 | 6 | 1 | yes: in catalogue and in rehearsal setlist |
| 8b | Add a song from the setlist picker (title only) | 6 | 1 | 0 | 4 | 1 | in the setlist, but with a title only |
| 9 | Add chords to a song | 6 | 2 | 1 | 3 | 1 | yes: chart shown on the song page |
| 10 | Learn a new song | 5 | 0 | 2 | 3 | 1 | yes: study logged |
| 11 | Discuss which songs to play | 9 | 0 | 8 | 2 | 1 | yes: setlist now 5 songs, locked |
| 12 | Check what is next | 1 | 0 | 0 | 2 | 1 | partly: concert date and place, no next practice |
| 3b | See my own tasks (Hugo) | 2 | 0 | 0 | 3 | 1 | yes, through More then Tasks; the "My part" link shows no task |

Task 8b is not in the brief. It is the shorter path the song picker offers (type a title, then "Create ... and add it"), measured so the build can compare both. It sets the title only.

## Primary actions

One row per action that moves the task forward and that a person has to find. Position is measured on arrival, before any scroll.

| # | Action | Screen | Visible on arrival | Position (fraction of screen height) | In bottom third |
| --- | --- | --- | --- | --- | --- |
| 1 | New practice | `/sessions` | yes | 0.85 | yes |
| 1 | New setlist | `/sessions/:id` | yes | 0.32 | no |
| 1 | Add song | `/setlists/:id` | yes | 0.85 | yes |
| 1 | Done | `/setlists/:id + [Add song]` | yes | 0.12 | no |
| 2 | Add song | `/setlists/:id` | yes | 0.85 | yes |
| 2 | Done | `/setlists/:id + [Add song]` | yes | 0.12 | no |
| 2 | Remove | `/setlists/:id + [Midnight Drive]` | yes | 0.71 | yes |
| 3 | Task title field (full form) | `/tasks` | no | 2.18 | no |
| 3 | Save task | `/tasks` | yes | 0.73 | yes |
| 4 | Lineup (this set) | `/setlists/:id + [Midnight Drive]` | yes | 0.46 | no |
| 4 | Save lineup | `/setlists/:id + [Lineup for this entry]` | yes | 0.94 | yes |
| 5 | Transition band between 04 and 05 | `/setlists/:id` | yes | 0.75 | yes |
| 5 | Save | `/setlists/:id + [Transition comment]` | yes | 0.65 | no |
| 6 | Open entry 02 | `/setlists/:id` | yes | 0.45 | no |
| 6 | Notes field | `/setlists/:id + [Midnight Drive]` | yes | 0.63 | no |
| 7 | Record a take | `/catalog/:id` | yes | 0.85 | yes |
| 7 | Send | `/catalog/:id` | yes | 0.52 | no |
| 8 | New song | `/catalog` | yes | 0.85 | yes |
| 8 | Save | `/catalog/new` | yes | 0.86 | yes |
| 8 | Add song | `/setlists/:id` | yes | 0.85 | yes |
| 8 | Done | `/setlists/:id + [Add song]` | yes | 0.12 | no |
| 8b | Add song | `/setlists/:id` | yes | 0.85 | yes |
| 8b | Create from the picker | `/setlists/:id + [Add song]` | yes | 0.26 | no |
| 9 | Edit | `/catalog/:id` | yes | 0.28 | no |
| 9 | ChordPro text | `/catalog/:id/edit` | no | 1.10 | no |
| 9 | Save | `/catalog/:id/edit` | yes | 0.86 | yes |
| 10 | Studied | `/studies` | no | -0.41 | no |
| 11 | Open a vote (header icon) | `/setlists/:id` | yes | 0.04 | no |
| 11 | Open a vote (vote page) | `/setlists/:id/vote` | yes | 0.05 | no |
| 11 | Close the vote | `/setlists/:id/vote` | no | -2.73 | no |
| 11 | Make this the setlist | `/setlists/:id/vote` | yes | 0.86 | yes |
| 12 | My part | `/catalog` | yes | 0.06 | no |
| 3b | First own task in the list | `/tasks` | yes | 0.23 | no |

Totals: 32 primary actions, 28 visible on arrival, 14 in the bottom third, 9 in the top third, 4 off screen.

## Every step

Each tap with its target and where it was. "Scrolls" is the number of gestures needed before that tap.

### 1. Prepare the next rehearsal

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Sessions tab | `/catalog` | yes | 0.93 | 0 |
| 2 | tap | New practice | `/sessions` | yes | 0.85 | 0 |
| 3 | tap | Create session | `/sessions + [New practice]` | yes | 0.64 | 0 |
| 4 | tap | New setlist | `/sessions/:id` | yes | 0.32 | 0 |
| 5 | tap | Create setlist | `/sessions/:id + [New setlist]` | yes | 0.59 | 0 |
| 6 | tap | Open the new setlist | `/sessions/:id` | yes | 0.28 | 0 |
| 7 | tap | Add song | `/setlists/:id` | yes | 0.85 | 0 |
| 8 | tap | Pick Afterglow | `/setlists/:id + [Add song]` | yes | 0.27 | 0 |
| 9 | tap | Pick Billie Jean | `/setlists/:id + [Add song]` | yes | 0.47 | 0 |
| 10 | tap | Pick Come Together | `/setlists/:id + [Add song]` | yes | 0.54 | 0 |
| 11 | tap | Pick Dreams | `/setlists/:id + [Add song]` | yes | 0.68 | 0 |
| 12 | tap | Pick Get Lucky | `/setlists/:id + [Add song]` | yes | 0.89 | 0 |
| 13 | tap | Pick Hey Ya! | `/setlists/:id + [Add song]` | no | 0.96 | 1 |
| 14 | tap | Pick Jolene | `/setlists/:id + [Add song]` | yes | 0.79 | 0 |
| 15 | tap | Pick Last Call | `/setlists/:id + [Add song]` | no | 0.99 | 1 |
| 16 | tap | Pick Lightning | `/setlists/:id + [Add song]` | yes | 0.79 | 0 |
| 17 | tap | Pick Midnight Drive | `/setlists/:id + [Add song]` | no | 0.93 | 1 |
| 18 | tap | Done | `/setlists/:id + [Add song]` | yes | 0.12 | 0 |

- The name field comes filled with "Set 1", so the shortest path keeps it.
- After creating the setlist the screen stays on /sessions/:id.

### 2. Build the concert setlist

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Setlists tab | `/catalog` | yes | 0.93 | 0 |
| 2 | tap | Open Set principal | `/setlists` | yes | 0.20 | 0 |
| 3 | tap | Add song | `/setlists/:id` | yes | 0.85 | 0 |
| 4 | tap | Pick Dreams | `/setlists/:id + [Add song]` | yes | 0.68 | 0 |
| 5 | tap | Pick Psycho Killer | `/setlists/:id + [Add song]` | no | 2.06 | 2 |
| 6 | tap | Done | `/setlists/:id + [Add song]` | yes | 0.12 | 0 |
| 7 | drag | Drag entry 05 to position 02 | | | | |
| 8 | tap | Open entry 03 (to remove) | `/setlists/:id` | yes | 0.56 | 0 |
| 9 | tap | Remove | `/setlists/:id + [Midnight Drive]` | yes | 0.71 | 0 |
| 10 | tap | Confirm remove | `/setlists/:id + [dialog]` | yes | 0.52 | 0 |

### 3. Agree who does what

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | More | `/catalog` | yes | 0.93 | 0 |
| 2 | tap | Tasks | `/catalog + [More]` | yes | 0.46 | 0 |
| 3 | tap | Task title field (full form) | `/tasks` | no | 2.18 | 2 |
| | type | Task title (21 characters) | | | | |
| 4 | tap | Assignee Léa | `/tasks` | yes | 0.50 | 0 |
| 5 | tap | Linked song (open picker) | `/tasks` | yes | 0.75 | 0 |
| 6 | pick | Linked song = ~Nuit blanche | | | | |
| 7 | tap | Due date (open picker) | `/tasks` | no | 0.84 | 1 |
| 8 | pick | Due date = 2026-11-01 | | | | |
| 9 | tap | Save task | `/tasks` | yes | 0.73 | 0 |

- The song list of a task offers only the 6 compositions (originals), not the 44 catalogue songs.

### 4. Set the lineup for one song in a setlist

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Open entry 02 | `/setlists/:id` | yes | 0.45 | 0 |
| 2 | tap | Lineup (this set) | `/setlists/:id + [Midnight Drive]` | yes | 0.46 | 0 |
| 3 | tap | Tom plays Guitare | `/setlists/:id + [Lineup for this entry]` | yes | 0.81 | 0 |
| 4 | tap | Save lineup | `/setlists/:id + [Lineup for this entry]` | yes | 0.94 | 0 |

- After Save the screen is /setlists/:id (the entry sheet is closed).

### 5. Note a transition

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Transition band between 04 and 05 | `/setlists/:id` | yes | 0.75 | 0 |
| 2 | tap | Note field | `/setlists/:id + [Transition comment]` | yes | 0.50 | 0 |
| | type | Transition note (41 characters) | | | | |
| 3 | tap | Save | `/setlists/:id + [Transition comment]` | yes | 0.65 | 0 |

- The note text is not shown on the setlist after saving (only an icon or nothing).

### 6. Take a note on a song for tonight

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Open entry 02 | `/setlists/:id` | yes | 0.45 | 0 |
| 2 | tap | Notes field | `/setlists/:id + [Midnight Drive]` | yes | 0.63 | 0 |
| | type | Entry note (20 characters) | | | | |
| 3 | tap | Key field | `/setlists/:id + [Midnight Drive]` | yes | 0.39 | 0 |
| | type | Key (2 characters) | | | | |
| 4 | tap | Close the sheet | `/setlists/:id + [Midnight Drive]` | yes | 0.28 | 0 |

- The note is not shown on the entry row; it is only visible by opening the sheet again.

### 7. Record a take and talk about it

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Search field | `/catalog` | yes | 0.13 | 0 |
| | type | Search (12 characters) | | | | |
| 2 | tap | Open Superstition | `/catalog` | yes | 0.31 | 0 |
| 3 | tap | Record a take | `/catalog/:id` | yes | 0.85 | 0 |
| 4 | tap | Close the recording sheet | `/catalog/:id + [Recording Superstition]` | yes | 0.55 | 0 |
| 5 | tap | Open the first take | `/catalog/:id` | no | 0.93 | 1 |
| 6 | tap | Comment field | `/catalog/:id` | no | 1.00 | 1 |
| | type | Comment (21 characters) | | | | |
| 7 | tap | Send | `/catalog/:id` | yes | 0.52 | 0 |

- The recording sheet shows only Upload and Close here: Chromium has no microphone, so the record and stop buttons cannot be reached or counted. A real phone adds at least 2 taps (record, stop).
- The "At <time>" checkbox that pins the comment to a moment is present but disabled until the audio plays; the seeded audio does not exist, so pinning cannot be done here.
- The past practice page lists none of the takes recorded during it.

### 8. Add a new song to the catalogue

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | New song | `/catalog` | yes | 0.85 | 0 |
| 2 | tap | Title field | `/catalog/new` | yes | 0.41 | 0 |
| | type | Title (14 characters) | | | | |
| 3 | tap | Artist field | `/catalog/new` | yes | 0.50 | 0 |
| | type | Artist (9 characters) | | | | |
| 4 | tap | Status (open picker) | `/catalog/new` | yes | 0.60 | 0 |
| 5 | pick | Status = ~In progress | | | | |
| 6 | tap | Save | `/catalog/new` | yes | 0.86 | 0 |
| 7 | tap | Setlists tab | `/catalog/:id` | yes | 0.93 | 0 |
| 8 | tap | Open the rehearsal setlist | `/setlists` | yes | 0.29 | 0 |
| 9 | tap | Add song | `/setlists/:id` | yes | 0.85 | 0 |
| 10 | tap | Picker search | `/setlists/:id + [Add song]` | yes | 0.20 | 0 |
| | type | Search (9 characters) | | | | |
| 11 | tap | Pick Psycho Chicken | `/setlists/:id + [Add song]` | yes | 0.33 | 0 |
| 12 | tap | Done | `/setlists/:id + [Add song]` | yes | 0.12 | 0 |

- After Save: /catalog/:id. The song page has no "add to setlist" action, so the flow leaves to the Setlists tab.

### 8b. Add a song from the setlist picker (title only)

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Setlists tab | `/catalog` | yes | 0.93 | 0 |
| 2 | tap | Open the rehearsal setlist | `/setlists` | yes | 0.29 | 0 |
| 3 | tap | Add song | `/setlists/:id` | yes | 0.85 | 0 |
| 4 | tap | Picker search | `/setlists/:id + [Add song]` | yes | 0.20 | 0 |
| | type | Title (14 characters) | | | | |
| 5 | tap | Create from the picker | `/setlists/:id + [Add song]` | yes | 0.26 | 0 |
| 6 | tap | Done | `/setlists/:id + [Add song]` | yes | 0.12 | 0 |

- This path sets only the title. Artist and status need the song edit page afterwards (Catalog, search, song, Edit, two fields, Save).

### 9. Add chords to a song

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Search field | `/catalog` | yes | 0.13 | 0 |
| | type | Search (8 characters) | | | | |
| 2 | tap | Open Ain't No Sunshine | `/catalog` | yes | 0.31 | 0 |
| 3 | tap | Edit | `/catalog/:id` | yes | 0.28 | 0 |
| 4 | tap | ChordPro text | `/catalog/:id/edit` | no | 1.10 | 1 |
| 5 | tap | Chart text box | `/catalog/:id/edit` | yes | 0.70 | 0 |
| | type | Paste chart (114 characters) | | | | |
| 6 | tap | Save | `/catalog/:id/edit` | yes | 0.86 | 0 |

### 10. Learn a new song

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Studies tab | `/catalog` | yes | 0.93 | 0 |
| 2 | tap | Catalog tab | `/studies` | yes | 0.93 | 0 |
| 3 | tap | Open Afterglow | `/catalog` | yes | 0.31 | 0 |
| 4 | tap | Studies tab | `/catalog/:id` | yes | 0.93 | 0 |
| 5 | tap | Studied | `/studies` | no | -0.41 | 1 |

- First song to study: Afterglow. The study row does not link to the song, so the person goes to the Catalog tab.
- Reading the whole chart down to the Takes heading took 1 scroll gestures.
- No listen link on the song page (it only shows in the setlist entry sheet).
- Coming back to the Studies tab, the page opened scrolled 591 px down (the scroll of the song page is kept), so the first Studied button was above the screen.

### 11. Discuss which songs to play

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | Open a vote (header icon) | `/setlists/:id` | yes | 0.04 | 0 |
| 2 | tap | Open a vote (vote page) | `/setlists/:id/vote` | yes | 0.05 | 0 |
| 3 | tap | Score Kiss | `/setlists/:id/vote` | yes | 0.43 | 0 |
| 4 | tap | Score Billie Jean | `/setlists/:id/vote` | yes | 0.82 | 0 |
| 5 | tap | Score Respect | `/setlists/:id/vote` | no | 2.77 | 3 |
| 6 | tap | Score Valerie | `/setlists/:id/vote` | no | 1.14 | 1 |
| 7 | tap | Score Superstition | `/setlists/:id/vote` | yes | 0.52 | 0 |
| 8 | tap | Close the vote | `/setlists/:id/vote` | no | -2.73 | 4 |
| 9 | tap | Make this the setlist | `/setlists/:id/vote` | yes | 0.86 | 0 |

- After "Close the vote": /setlists/:id/vote; buttons: Back to the vote | Reorder | Move up | Move down | Remove | Reorder | Move up | Move down | Remove | Reorder | Move up | Move down

### 12. Check what is next

| Step | Kind | Action | Screen | Visible on arrival | Position | Scrolls before |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tap | My part | `/catalog` | yes | 0.06 | 0 |

- Header on arrival: {"text":"Le Petit Bain Mon, Nov 2, 2026","y":25,"aboveSafeArea":true}. Date and place of the concert are readable without a tap; the next practice is not shown.
- "My part" opens /setlists/:id: 20 entries listed, 8 fully on the first screen.

## Scroll areas on the screens and overlays the walks reached

No screen or overlay reached during the walks had two vertical scroll areas at once: while a dialog is open the page behind it does not scroll. The overlays that scroll on their own are these.

| Overlay | Vertical | Horizontal | Inner scroll area (x, y, width, height; content height / box height) |
| --- | --- | --- | --- |
| `/sessions + [New practice]` | 0 | 0 | none |
| `/sessions/:id + [New setlist]` | 0 | 0 | none |
| `/setlists/:id + [Add song]` | 1 | 1 | y ul 9,197,372,582 (2569/582) |
| `/setlists/:id + [Midnight Drive]` | 0 | 1 | none |
| `/setlists/:id + [dialog]` | 0 | 1 | none |
| `/catalog + [More]` | 0 | 1 | none |
| `/setlists/:id + [Lineup for this entry]` | 1 | 1 | y div 13,82,364,628 (706/628) |
| `/setlists/:id + [Transition comment]` | 0 | 1 | none |
| `/catalog/:id + [Recording Superstition]` | 0 | 0 | none |

The horizontal count on setlist overlays is the member filter strip of the page behind the dialog.

## Every route on first load

| Route | Vertical scroll areas | Horizontal scroll areas | Page height (screens) | Buttons | Icon-only buttons | Text-only buttons | Icon and text buttons | Icon-only links |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | 0 | 0 | 1 | 3 | 1 | 2 | 0 | 0 |
| `/recover` | 0 | 0 | 1 | 3 | 2 | 1 | 0 | 0 |
| `/vote` | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 0 |
| `/vote/:sessionId` | 0 | 0 | 1 | 1 | 0 | 1 | 0 | 0 |
| `/catalog` | 1 | 1 | 6.88 | 6 | 0 | 5 | 1 | 2 |
| `/catalog/new` | 1 | 0 | 2.02 | 3 | 0 | 1 | 2 | 0 |
| `/catalog/:songId` | 1 | 0 | 2.4 | 6 | 2 | 0 | 4 | 0 |
| `/catalog/:songId/edit` | 3 | 0 | 3.35 | 5 | 0 | 1 | 4 | 0 |
| `/catalog/:songId/scene` | 1 | 1 | 1 | 8 | 2 | 4 | 2 | 0 |
| `/sessions` | 0 | 0 | 1 | 6 | 3 | 0 | 3 | 0 |
| `/sessions/:sessionId (concert)` | 1 | 0 | 1.59 | 6 | 0 | 1 | 5 | 0 |
| `/sessions/:sessionId (practice)` | 1 | 0 | 1.84 | 21 | 17 | 1 | 3 | 0 |
| `/sessions/:sessionId/setlist` (lands on `/setlists/:id`) | 1 | 1 | 2.64 | 74 | 26 | 20 | 28 | 1 |
| `/setlists` | 0 | 0 | 1 | 2 | 1 | 0 | 1 | 0 |
| `/setlists/:setlistId` | 1 | 1 | 2.64 | 74 | 26 | 20 | 28 | 1 |
| `/setlists/:setlistId/vote` | 0 | 0 | 1 | 2 | 0 | 1 | 1 | 0 |
| `/setlists/:setlistId/audience` | 0 | 0 | 1 | 2 | 0 | 0 | 2 | 0 |
| `/setlists/:setlistId/scene` | 1 | 2 | 1 | 30 | 4 | 24 | 2 | 0 |
| `/bars` | 2 | 0 | 2.23 | 9 | 0 | 5 | 4 | 0 |
| `/improvements` | 1 | 1 | 1.14 | 17 | 0 | 16 | 1 | 0 |
| `/studies` | 1 | 0 | 4.04 | 24 | 0 | 23 | 1 | 0 |
| `/tasks` (layout 493 px wide) | 1 | 1 | 3.1 | 36 | 12 | 22 | 2 | 0 |
| `/compos` | 1 | 0 | 1.25 | 7 | 0 | 3 | 4 | 0 |
| `/members` | 1 | 1 | 1.74 | 12 | 5 | 6 | 1 | 0 |
| `/instruments` | 1 | 0 | 1.33 | 50 | 30 | 19 | 1 | 0 |
| `/account` | 1 | 0 | 2.06 | 8 | 2 | 4 | 2 | 0 |

Totals over 26 routes: 416 buttons, 133 icon-only, 181 text-only, 102 with both; 4 icon-only links.

### Which controls are icon-only

- `/login`: Show password
- `/recover`: Show password x2
- `/catalog`: Stage (link), New song (link)
- `/catalog/:songId`: Record a take of Afterglow, Upload
- `/catalog/:songId/scene`: Scroll slower, Scroll faster
- `/sessions`: Delete session x3
- `/sessions/:sessionId (practice)`: Record a take x17 (one per song)
- `/sessions/:sessionId/setlist`: Energy, Audience vote, Open a vote, More actions, Drag to reorder x20, Copy order, Add song, Scene Mode (link)
- `/setlists`: New setlist
- `/setlists/:setlistId`: Energy, Audience vote, Open a vote, More actions, Drag to reorder x20, Copy order, Add song, Scene Mode (link)
- `/setlists/:setlistId/scene`: Scroll slower, Scroll faster, Previous song, Next song
- `/tasks`: Delete x12
- `/members`: Delete x5
- `/instruments`: Reorder instrument x6, Delete x6, 18 icon choices in the icon picker
- `/account`: Show password x2

### Which elements scroll on first load

- `/catalog`: x div [16,146,358,50] 50/50; plus the page
- `/catalog/:songId/edit`: y div [17,194,356,464] 660/464; y textarea [46,1546,298,464] 904/462; plus the page
- `/catalog/:songId/scene`: y div [0,61,390,624] 1400/624; x div [16,750,358,48] 48/48
- `/sessions/:sessionId/setlist`: x div [0,117,390,44] 44/44; plus the page
- `/setlists/:setlistId`: x div [0,117,390,44] 44/44; plus the page
- `/setlists/:setlistId/scene`: x div [16,100,358,48] 48/48; y div [0,163,390,547] 1871/547; x nav [62,723,266,75] 75/75
- `/bars`: y textarea [33,400,324,210] 304/208; plus the page
- `/improvements`: x div [16,53,358,50] 50/50; plus the page
- `/members`: x div [33,916,324,354] 348/348; plus the page

The song used for the song routes is Afterglow, which has a ChordPro chart. The vote route was measured on the rehearsal setlist before any vote is open, and the practice session route on the past practice.
