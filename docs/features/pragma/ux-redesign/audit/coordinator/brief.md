# Pragma UX audit: brief for the auditors

Pragma is the band's own app, installed on each member's phone as a home screen app. This audit looks at structure: navigation, layout, how easy things are to find, how the main jobs flow from screen to screen, and how consistent the design system is. It does not look at tap sizes, contrast or font sizes again. A previous audit already fixed those (see the last section).

How to run the app, the seed data and the measuring tools: [runbook.md](./runbook.md).

## What the operator wants, in order

1. Prepare and run setlists for concerts and rehearsals. That means: agree who does what, pick the songs, set who plays which instrument on each song (the lineup), work out how one song leads into the next (the transitions), take notes, record songs and talk about them.
2. Grow the catalogue and make new songs easy to learn and play. Chords help only if adding them is really easy. Nobody will add chords to every song.

Stage mode (the full-screen "scene" view used on stage) is not a priority. Look at it only where it gets in the way of the two jobs above.

The operator's own complaints: a lot of double scrolling, buttons that are hard to find, a weak design system, and usability that is not quite right.

## Words used in this brief

These come from `apps/pragma/VOCABULARY.md`. Use them the same way in your findings.

- **Song**: one entry in the catalogue. It has a status (idea, wip, rehearsed, concert_ready), an origin (cover or original), a default lineup, notes and an optional chord chart.
- **Session**: a date the band meets. It is either a **concert** or a **practice** (rehearsal).
- **Setlist**: a named, ordered list of songs. It lives on its own and can be attached to any number of sessions. A practice can prepare the setlist that the concert then plays.
- **Setlist entry**: one song inside one setlist, with the choices for that night: energy, lineup override, key override, capo and notes.
- **Lineup**: which member plays which instrument on a song. A song has a default lineup and an entry can override it.
- **Transition**: the passage from one song to the next in a setlist. A **transition comment** is a note written on that passage.
- **Take**: an audio recording of a song, optionally tied to a session. A **take comment** is a remark on a take, optionally pinned to a moment in it.
- **Task**: a to-do with an assignee, a due date and an optional song. This is how the band "agrees who does what".
- **Study**: a member logging that they practised a song on an instrument. **Mastery** is a score of how well a member plays an instrument, by default or per song.
- **Vote** and **voting round**: members, or the concert audience, vote on songs to build a setlist.
- **Bar**: a venue the band is pitching for a concert. **Composition**: an original song in progress.

## Top user tasks

Ranked by the operator's priorities. Tasks 1 to 7 serve priority 1, tasks 8 to 11 serve priority 2. "Expected path" is the shortest path the current app offers as far as the code shows; confirm it, count the taps, and note every place where a person would hesitate. The start screen is always the app as it opens from the home screen: `/catalog` (the root `/` redirects there), with the bottom tab bar visible.

| # | Task | Goal | Start screen | Expected path today | Success condition |
| --- | --- | --- | --- | --- | --- |
| 1 | Prepare the next rehearsal | Create a practice session and give it a setlist of 10 or more songs | `/catalog` | Sessions tab, new session (practice), open it, create or attach a setlist, open the setlist editor, add songs through the song picker | The practice shows on `/sessions` with a setlist holding the chosen songs in the chosen order |
| 2 | Build the concert setlist | Pick, order and trim the songs for a concert | `/catalog` | Setlists tab, open the concert's setlist (or the session first), add songs, drag to reorder, remove one | The setlist on the concert has the songs in the new order, and a reload keeps that order |
| 3 | Agree who does what | Assign a job to a member, with a due date and a linked song, and see your own jobs | `/catalog` | More drawer, Tasks, new task, choose assignee, song and due date | The task appears on `/tasks` under the right person, and that person can find it from their own starting point (the "My part" link in the header is a candidate) |
| 4 | Set the lineup for one song in a setlist | Change who plays what on one song for this night only | `/setlists/:id` | Tap the entry, open its sheet, edit the lineup override | The entry shows the new lineup and the song's default lineup is unchanged |
| 5 | Note a transition | Write how song A leads into song B | `/setlists/:id` | Tap the band between two entries, write the note in the transition modal | The note shows between the two songs on the setlist and on the setlist of every session that carries it |
| 6 | Take a note on a song for tonight | Add a note, key change or capo to one entry | `/setlists/:id` | Tap the entry, open its sheet, fill notes, key or capo | The note is visible on the entry without opening the sheet again |
| 7 | Record a take and talk about it | Record a song during the rehearsal, then comment on a moment in it | `/sessions/:id` or `/catalog/:songId` | Open the song, open the recording sheet, record, save; then open the take and add a comment at a time | The take is listed on the song with its comment, and other members see it. Recording and playback cannot be proven on the emulator; check every screen around them |
| 8 | Add a new song to the catalogue | Add a song with title, artist and status, and put it on the next rehearsal | `/catalog` | New song (the floating button was removed in the previous audit, so find where it went), search the music service or type it in, save, then add it to a setlist | The song is in the catalogue and in the rehearsal setlist, in as few taps as possible |
| 9 | Add chords to a song | Paste chords from a website, or attach a photo or PDF of a chart | `/catalog/:songId` | Edit, chart section, choose ChordPro, PDF or image, paste or upload, save | The chord chart shows on the song page and in the scene view. Judge how much ChordPro knowledge the form asks of the person |
| 10 | Learn a new song | Find what to practise, open the song, listen to the reference and the band's takes, read the chords, log a study | `/catalog` | Studies tab, or filter the catalogue, open the song, play the listen link or a take, read the chart, log a study | The member sees the song's material in one place and the study is logged on `/studies` |
| 11 | Discuss which songs to play | Run a vote on a setlist and close it | `/setlists/:id` | Open the vote screen, score songs, close the vote | The vote closes into an ordered setlist |
| 12 | Check what is next | See the next session, its setlist and your own part | `/catalog` | Header (next session and "My part"), or the Sessions tab | The person knows the date, the place, the songs and what they play, without hunting |

For each task, record: the number of taps, the number of screens, the number of scrolls, whether the primary action is visible without scrolling, whether it sits in the bottom thumb zone, every dead end, and every place the flow leaves the job (for example to go and find a song in another tab).

## Every screen

Paths come from `apps/pragma/site/src/App.tsx`. `:setlistId`, `:songId` and `:sessionId` come from the seed; `measure.mjs` fills them in for you. The bottom tab bar holds Catalog, Sessions, Setlists, Bars and Studies, plus More, which opens a drawer holding Tasks and Compositions (Workshop) and Improvements, Members and Instruments (Administration). The account page sits behind the header avatar.

| Screen | URL | Inside the app shell (tab bar) |
| --- | --- | --- |
| Sign in | `/login` | No |
| Recover password | `/recover` | No |
| Audience vote (public) | `/vote`, `/vote/:sessionId` | No |
| Catalogue | `/catalog` (and `/`, which redirects here) | Yes |
| New song | `/catalog/new` | Yes |
| Song detail | `/catalog/:songId` | Yes |
| Edit song | `/catalog/:songId/edit` | Yes |
| Song scene view | `/catalog/:songId/scene` | No, full screen |
| Sessions | `/sessions` | Yes |
| Session detail | `/sessions/:sessionId` | Yes |
| Session setlist (redirect) | `/sessions/:sessionId/setlist` | Yes, redirects to the setlist |
| Setlists | `/setlists` | Yes |
| Setlist editor | `/setlists/:setlistId` | Yes |
| Setlist vote | `/setlists/:setlistId/vote` | Yes |
| Setlist audience view | `/setlists/:setlistId/audience` | Yes |
| Setlist scene view | `/setlists/:setlistId/scene` | No, full screen |
| Bars | `/bars` | Yes |
| Improvements | `/improvements` | Yes |
| Studies | `/studies` | Yes |
| Tasks | `/tasks` | Yes |
| Compositions | `/compos` | Yes |
| Members (and the mastery matrix) | `/members` | Yes |
| Instruments | `/instruments` | Yes |
| Account | `/account` | Yes |

Overlays are part of the structure too, and the double scroll the operator complains about most likely lives in them. Each one is a `<dialog>` in the code: More drawer (`AppShell`), song picker (`SetlistSongPicker`), setlist entry sheet (`SetlistEntrySheet`), transition comment (`TransitionCommentModal`), lineup editor (`LineupEditor`), song defaults (`SongDefaultsDialog`), recording sheet (`RecordingSheet`), take upload (`TakeUploadForm`), create session (`CreateSessionDialog`), create setlist (`CreateSetlistDialog`), attach setlist (`AttachSetlistDialog`), listen links (`ListenLinksDialog`), install walkthrough (`InstallWalkthroughSheet`) and the confirm dialog. Components with their own scroll area: `SongSearch`, `SetlistSongPicker`, `SuggestSongField`, `SongChordPreview`, `LineupEditor`, `SongDefaultsDialog`, and both scene pages.

## How we measure

All measurements are taken with the app emulated as an installed home screen app (standalone display mode, see the runbook), at two phone sizes: **375x667** (small phone, no notch: top inset 20, bottom inset 0) and **390x844** (notched phone: top inset 47, bottom inset 34). Use the seeded data, not an empty app.

### Double scroll

- **Scroll areas per screen**: the number of elements whose content is taller than their box (`scrollHeight > clientHeight`) and whose `overflow-y` is `auto` or `scroll`, plus one if the page itself scrolls. Count horizontal scroll areas separately, the same way with widths and `overflow-x`.
- Take the count on first load **and again with each overlay open**, because a scrolling dialog over a scrolling page is the classic double scroll. `measure.mjs` takes the first-load count for every screen; `count-scroll.js` takes it on whatever is on screen at that moment.
- A screen passes when it has at most one vertical scroll area at a time. Report every screen or overlay with two or more, with the element and its size.
- Also record **scroll traps**: a scroll area that stops scrolling the page when the finger lands inside it, or the reverse. Prove these with a real drag in argent (`gesture-scroll` or `gesture-drag`), not with a measurement.
- Baseline already taken on first load (no overlay open): every screen has at most one vertical scroll area, except `/bars` (2 at both sizes) and `/setlists/:id/scene` (1 vertical, 2 horizontal). `/catalog`, `/setlists/:id`, `/improvements` and `/members` each have one horizontal scroll area; on the catalogue and the setlist it is the filter strip, and on `/members` it is the mastery matrix. So the double scroll the operator feels is not on first load: look for it in the overlays, in the long lists, and in the feel of scrolling with the fixed tab bar and floating buttons. Full numbers: `coordinator/measure-baseline/scroll-report.json`.

### Hard to find

- **Taps to complete** each top task, counted from the start screen, and **screens visited**.
- **Primary action visible on arrival**: is the main button of the screen inside the first screenful, without scrolling? Yes or no, at both sizes.
- **Primary action in the thumb zone**: is its centre in the bottom 40% of the screen and not hidden behind the tab bar? Give its position as a fraction of the screen height.
- **Discoverability**: is the action labelled with words, or only an icon? Icon-only actions in the header of the setlist editor (play, energy chart, members, vote, the three-dot menu) are a known candidate.
- **Depth**: how many levels down is each feature from the tab bar. Anything in the More drawer is one level deeper than a tab.

### Other measures

- **First-screen budget**: the share of the first screenful taken by headers, filters, charts, the tab bar and floating buttons before the first real content (the first song row, the first session). The setlist editor spends a large share on its energy chart and member filter before the first song.
- **Scroll length**: page height divided by screen height for the long lists (`/catalog` with 44 songs, setlists with 17 to 22 entries).
- **Consistency of the design system**: for the same kind of thing (primary button, secondary button, chip, list row, sheet, page header, empty state), note every different look you meet, with screen and screenshot. Count the distinct variants. Note any spacing, radius or type size that does not repeat.
- **Flow breaks**: each time a task forces the person to leave the screen they are on to find something elsewhere, and whether they come back to the same place and scroll position.
- **Top safe area**: in standalone mode on a notched phone, the app draws under the status bar unless it pads for `env(safe-area-inset-top)`. The code has no `safe-area-inset-top` anywhere, and in the 390x844 baseline screenshot the setlist header's back link sits about 38 px from the top, inside the 47 px inset. Confirm this on each screen: it would put the header's buttons under the clock and battery icons.

## What the previous audit already covered

`docs/features/pragma/mobile-ux-audit/report.md`: three rounds at 375x667 and 375x780, 63 findings, 60 fixed, all with synthetic clicks rather than real taps. Do not report these kinds of finding again unless a fix has come undone:

- Tap target sizes (the 44 px floor) on chips, buttons, drawer rows, the drag handle, the energy slider, the mastery boxes and checkboxes.
- Text below 12 px, inputs below 16 px (the iOS zoom rule), and the contrast of lyrics on the scene view.
- Overlaps: the floating New song button (it was removed), radio hit boxes, a delete button too close to save.
- Missing confirmations on delete (members, bars) and duplicate saves on bars.
- Not-found states for deleted songs, sessions and edit links.
- Long titles and pasted links running off the edge, the member filter strip running off the right edge, the mastery matrix scrolling the member name away.
- The pinned setlist toolbar taking too much height (fixed in round two), sheets that let the page scroll behind them, Escape and backdrop closing.
- The bottom inset of the tab bar and the shell (`safe-area-inset-bottom`).

What it did not cover, and this audit should: navigation and information architecture, whether the tab bar holds the right five places, how a person moves through a whole task, how many steps each job takes, nested scrolling in overlays, the top safe area, the design system as a whole, and real touch (it sent no taps).

## What the emulator cannot prove

Say so in your findings whenever one of these matters.

- **No real phone, no iOS engine.** Safari's behaviour as a home screen app (the status bar, the rubber-band overscroll, the address bar, the software keyboard pushing the page) cannot be reproduced. Chromium's software keyboard is not shown either, so "what the keyboard covers" is an estimate from the layout.
- **Standalone mode is emulated, not real.** The runbook makes `matchMedia('(display-mode: standalone)')` answer true and overrides the safe-area insets. The app's CSS has no `display-mode` rule, so this is enough for its layout and its install banner, but nothing proves the real installed app looks the same.
- **Recording and playback.** There is no microphone, and the seeded takes point at audio files that do not exist locally (no S3). The take list and comments render; the audio does not play.
- **Push notifications, passkeys and the music search services** (Deezer, Spotify) are not reachable or not meaningful locally.
- **Momentum scrolling and swipe gestures.** argent's `gesture-swipe` does nothing on Chromium; use `gesture-scroll` and `gesture-drag`. Drag and drop to reorder may need its own handling.
- **One person at a time.** Several members editing the same setlist cannot be simulated with realistic timing.
