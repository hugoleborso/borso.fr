# Pragma redesign: prepare a setlist and learn a song in fewer taps, on one consistent design system

## Perspectives confronted

Written in non-interactive mode by the `spec-writer` agent. Each box is ticked from the operator's ratification in chat on 2026-10-27 ("Go avec Notebook + greffes, lance l'implémentation") of decisions D1 to D11 and of the comments on the audit deck. What the operator did not decide is written as an open question with a recommendation, never decided here.

- [x] **Client / business** — the operator named the two jobs in order (prepare and run setlists, then grow the catalogue and learn songs), the four complaints (double scrolling, hard-to-find buttons, a weak design system, usability not quite right), and that stage mode is low priority.
- [x] **Product** — D1 four tabs, D2 open on Home, D3 tasks linked to sessions, D6 total setlist time now and breaks later, D7 energy curve on a separate Order screen, D8 stage mode lower, D9 chords from paste, photo and PDF only; D4 attendance and D5 session messages are out of scope.
- [x] **Tech-lead** — D10 sheets on the native `<dialog>` with no library; the schema column for D3 and the new font are ADR triggers; the measuring harness and the slicing into six pull requests are below.
- [x] **Developer** — 37 confirmed findings with file and line (`baseline/verified-findings.md`) and a measured baseline per task and per route (`baseline/baseline.md`) give every target a before value and a rerunnable measure.
- [x] **Designer** — D11: the Notebook direction with the grafts listed in `design/comparison.md`; the operator's comments on lineup, key, the "Talk" label, the cover in the entry sheet, icons on every button, and adding songs from the setlist.

## Why

Pragma is the band's own app, installed on each member's phone. The audit found that the band's first job, preparing a setlist, is spread across two tabs, a drawer and overlays that close each other: preparing a practice costs 18 taps over 7 screens and overlays, a note written on a setlist entry or a transition does not show on the setlist after saving, the entry note can be cut off by racing saves, and a transition draft is thrown away by a tap on the backdrop. The second job, learning a song, starts on a page whose main button is stage mode and whose chords require ChordPro syntax. Around both, 181 of the 416 buttons on first load have no icon, 133 have no words, and only 14 of 32 primary actions sit in the bottom third of the screen.

- **Output metric** (lagging, out of CI): before a session, a member answers "what are we playing, what do I play, and what was decided for each song?" from the app alone, without a message in the band's chat. Measured by the operator asking at each practice.
- **Input metrics** (leading, measured by the task-metrics harness at 390x844, standalone, real argent taps):
  - taps, scroll gestures and screens for the 13 top tasks (table under *Acceptance criteria*);
  - primary actions in the bottom third on arrival: 14 of 32 -> at least 26 of 32;
  - text-only buttons over the 26 routes: 181 -> 0;
  - routes or sheets with two vertical scroll areas: 2 routes (`/catalog/:songId/edit`, `/bars`) and 2 sheets with an inner scroll -> 0.
- **Gemba**: `baseline/baseline.md` is the field observation: every number was measured on the current app with the audit seed on 2026-10-26 by walking each task with argent. `baseline/verified-findings.md` holds the 37 findings a second auditor reproduced or confirmed in code.

## Result

Mockups are in `mockups/` (390x844). They were drawn before D11, with the earlier `design-system/DESIGN.md` tokens: they show **structure and content**, and the look is the Notebook direction in `design/notebook/` plus the grafts in `design/grafts/`.

### Navigation

- Four tabs: **Home**, **Sessions**, **Songs**, **Band**. No count on any tab. The More drawer goes. (D1)
- The app opens on Home. (D2) The manifest shortcut points to Home instead of the catalogue.
- Sessions holds a **Sessions / Setlists** section switch; Setlists is today's setlist library.
- Band opens on tasks, then lists members, instruments, bars, compositions, improvements and the account page. The language switch moves from the More drawer to the account page.
- Songs carries a **To learn** filter that replaces the Studies tab; a study row opens its song.
- Each destination has its own icon: Studies and Improvements no longer share `bolt` (rank 35).

### Home (`/`, mockup `after-home.png`)

The next session, practice or concert, whichever comes first: kind, date, place, setlist name, song count and total time, and **Open the setlist**. Under it: **Your part** (the songs of that setlist where the signed-in member plays, with their instruments) and **Your tasks** (open tasks assigned to the member, the ones linked to that session first once slice 5 adds the link; until then, by urgency as on Band). No session ahead: an empty state with **New session**.

### Setlist (`/setlists/:id`, mockups `after-setlist.png`, `after-lineup.png`)

- Header: back link naming the parent session, setlist name, one line "Concert · Sun 1 Nov · 20 songs · 1 h 18" (total time from the songs' durations, D6), and one `more` icon button holding stage mode, open a vote, audience vote, copy the order, rename. No energy chart on this screen. (D7, D8)
- Under the header, underlined section tabs with icons: **Songs**, **Lineup**, **My part**.
- **Songs** (default): each row has the position in the margin, the album cover (or the initials tile for an original), the title, the artist, the lineup avatars, a `more` icon button (Remove from the setlist), and below them the entry note in the note style, and tonight's lineup change in the highlighter. Key and capo are allowed on setlist rows (operator: key is not shown on the session page; setlist rows may show it). Between two rows, the transition line is 44 px tall and shows its comment in the pencil style, a `warn` icon for a risky transition, or the faint "Note this transition" with a `plus` icon when it has none.
- **Lineup**: the grid from the Studio graft. One row per song: the title on its own line, the instrument glyphs on the line below aligned under one column per member, each in that member's colour; a dot when a member sits out. A cell whose part differs from the previous song is highlighted. Six members fit at 375 px with no sideways scroll. Tapping a cell opens that entry's sheet on its lineup; tapping a member's header switches to My part for that member.
- **My part**: today's member filter, set to the signed-in member: only the songs they play, with their instrument on each.
- Bottom strip, 52 px, above the tab bar, no box: **Add songs** (52 px filled blue pill, `plus`) and **Order** (glass pill, `reorder`), over a 20 px paper fade. The strip stays in place at every scroll position (rank 13: today's Add song button hides on scroll). The list ends on a blank numbered line, "13 · Add songs", which is also the empty state, and the page's bottom padding equals the strip's height so the last row scrolls clear of the pills.

### Order screen (`/setlists/:id/order`, mockup `after-order.png`)

Reached from **Order**. On top, the energy curve, one bar per song, with the average energy and the total time; an **Energy curve** chip hides it. Below, one 44 px row per song: a 44x44 drag handle, the number, the title, a five-step energy meter and the length. While a row is lifted its bar turns blue and the curve redraws at the drop position. The order saves on each drop, as today. Footer: **Done** (`check`) and **Copy order** (`copy`). (D7)

### Add songs sheet (mockup `after-add-songs.png`, `design/notebook/add-songs-study.png`)

One full-height sheet titled "Add songs to <setlist name>": a search field that has the focus on opening, filter chips (Not in this setlist, the default; Concert ready; Rehearsed; To learn; Ideas), rows with cover, title, artist and a check box. Tapping checks the song and shows its pick number; tapping again unchecks it. Songs already in the setlist are dimmed with "Already in this setlist · 05" and cannot be picked. A typed title with no match in the catalogue lists the music service's results for it, with cover, title and artist, and always offers **New song as an idea**; picking either creates the song (with the service's title, artist and cover, or with the title only) and checks it. This is how task 8 stays on the setlist: the operator refused adding to a setlist from the song page, so a new song reaches a setlist from this sheet. The footer reads "Added at the end, in the order picked" and holds **Add 3 songs** (`plus`). Nothing is written before that tap. The song page has no "Add to setlist" action.

### Entry sheet (mockup `after-entry-sheet.png`)

Opened by tapping a setlist row. Header: the album cover at 72 px, title, artist, length, "Song 2 of 20 · tonight only", and a `close` icon button. Body: tonight's key and capo, the lineup edited inline (each member with their instrument glyphs, a change for tonight in the highlighter, **Use the song's lineup** with `swap` to reset), the note in the note style, saved after a short pause, with "Saved" and a `check` icon in `good`. Footer: **Open the song** (`song`) and **Record a take** (`mic`). Remove from the setlist is in the row's `more` menu. The focus goes to the note field, never to Close. The sheet never opens another sheet.

### Session page (`/sessions/:id`, mockup `after-session.png`)

In order: the setlist preview (count, total time, the first three songs with cover, title and lineup avatars, a `warn` badge on a song with no lineup, **no key**), then **Who does what** (the tasks linked to this session, and **Add a task** with `plus`), then the takes recorded at this session grouped by song. With no setlist yet, the preview holds **Add songs**, which creates a setlist named after the session and opens the Add songs sheet. A past practice does not show the empty "Prepared concert" picker. Primary action: **Open the setlist** (`arrowR`). Attendance (D4) and the message thread (D5) are not on this page in this iteration.

### Song page (`/catalog/:songId`, mockup `after-song.png`, `design/grafts/backstage-song-page.png`)

In order: cover, title, artist, status; a row of listening links (Deezer, Spotify, YouTube, each with its official mark) built from the song's `links`, `deezerTrackId` and `spotifyTrackId`; one line of text naming the setlists the song is in; labelled round actions (**Practised**, **Notes**, **Full screen**), each an icon with its word under it; **Your part** with the member's instrument and mastery in the highlighter; the chord chart with a transpose stepper; the band's takes with play buttons; the default lineup and notes. Header: **Edit** (`edit`) and `more`. Primary action in the bottom strip: **Record a take** (`mic`); the page's bottom padding equals the strip's height, so the last chord line scrolls clear of the pill (the critic found Backstage's pill covering the chords). **Full screen** is the only way into stage mode from the song. (D8) **Edit** and **Full screen** are links drawn as buttons, never a button inside a link (rank 29).

### Chords by paste, photo or PDF (mockup `after-chords.png`)

On the song's edit page, the chord chart section offers three buttons: **Paste text** (`clipboard`), **Photo** (`camera`), **PDF** (`upload`). Pasted text in the "chords above lyrics" layout that chord websites give is converted to ChordPro, with the preview under the text box, never above it, and the song's tonality filled from the result. The person never types ChordPro syntax. A photo is stored as today's `image` chart. A PDF follows Q6: with [ADR-0048](../../../../adr/0048-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) accepted, a PDF that carries a text layer goes through the same converter and preview, and a scanned PDF is stored as a `pdf` chart; without it, every PDF is stored as a `pdf` chart. No scraping and no audio detection. (D9)

### Songs tab (`/catalog`)

Compact rows (cover, title, artist, status badge; chord icon only when a chart exists), search, filter chips including **To learn**, and **Add a song** (`plus`) in the bottom strip. Add a song opens a sheet with the title field focused, an artist field and status chips; when the music service answers, its results fill title, artist and cover. The raw "Deezer track ID" field leaves the form.

### Band tab (`/band`, mockup `after-band.png`)

Opens on **My tasks / Everyone**. **New task** (`plus`) opens a sheet with title (focused), assignee avatars, due date, an optional song chosen among all songs, and an optional session. Tapping a task opens the same sheet filled with its values, in place of today's form 1840 px down the page (rank 2). A long song title in a task wraps or ends in an ellipsis, so the page stays 390 px wide (rank 21). Below the tasks: links to members, instruments, bars, compositions, improvements.

### Vote page (`/setlists/:setlistId/vote`)

Reached from the setlist's `more` menu. A back link names the setlist. Two lines say how a vote runs. **Open a vote** (`vote`) and, once a vote is open, **Close the vote** (`check`) sit as the primary pill in the bottom strip, visible on arrival at any scroll position. The selected view toggle is ink on the chosen fill, never text on blue, and uses only defined tokens (rank 25).

## Use cases / edge cases

```mermaid
flowchart LR
  Home -->|Open the setlist| Setlist
  Sessions --> Session -->|Open the setlist| Setlist
  Session -->|Add songs, no setlist yet| AddSongs[Add songs sheet]
  Setlist -->|Add songs| AddSongs
  Setlist -->|Order| Order[Order screen]
  Setlist -->|tap row or lineup cell| Entry[Entry sheet]
  Entry -->|Open the song| Song[Song page]
  Song -->|Full screen| Scene[Stage mode]
  Song -->|Edit| Chords[Chords: paste, photo, PDF]
  Band -->|New task| TaskSheet[Task sheet]
  Session -->|Add a task| TaskSheet
```

**Happy path, prepare the next practice (task 1):**
1. Home, Sessions tab, **New session**, choose practice, create.
2. On the new session, **Add songs**: a setlist named after the session is created and the sheet opens.
3. Check ten songs, using search or a chip instead of scrolling, then **Add 10 songs**.
4. The sheet closes on the setlist, with the ten songs in the order picked.

**Happy path, prepare tonight's details (tasks 4, 5, 6):**
1. On the setlist, tap a row: the entry sheet opens with the focus in the note field.
2. Type the note; "Saved" appears after the pause. Change one member's instrument inline. Close.
3. The row shows the note and the highlighted lineup change. Tap "Note this transition" under it, write, save: the comment shows on the transition line.

**Happy path, see who plays what:** Setlist, **Lineup**: every member's instruments down the setlist, changes highlighted; tap a member's header for My part.

**Happy path, add a new song to the next practice (task 8):** Home, **Open the setlist**, **Add songs**, type the title, pick the music service's result (the song is created with its artist and cover, and checked), **Add 1 song**.

**Happy path, close a vote (task 11):** Setlist, `more`, **Open a vote**; members score songs; **Close the vote** from the bottom strip with no scroll back to the top.

**Happy path, order by energy:** Setlist, **Order**, drag a song and watch the curve redraw, **Done**.

**Happy path, learn a song (task 10):** Songs, **To learn**, the song, listen through a link or a take, read the chords, **Practised** logs a study.

**Happy path, add chords (task 9):** Song, **Edit**, **Paste text**, paste a chords-above-lyrics sheet, check the preview under it, save.

**Happy path, agree who does what (task 3):** session page, **Add a task**: title, assignee, due date, optional song; the task is linked to the session and shows on the session page, on Band, and on the assignee's Home.

**Edge cases:**
- Entry note typed fast on a slow network: the server keeps the last text typed; a reply to an older save never overwrites a newer one.
- Transition sheet closed by the backdrop or Escape with a typed draft: the draft is kept and shown on reopening.
- A song with no cover: the initials tile in the setlist, the sheet and the picker.
- Seven or more members in one setlist's lineup: see open question Q3.
- A member who holds two instruments on one song: both glyphs sit in that member's cell, side by side at a size still readable at 375 px (the critic found Backstage's grid squeezing them), and the cell's tap area stays 44x44 px or more.
- A member in no song of the setlist: no column in the Lineup grid; My part for them shows the empty state "Nothing to play in this setlist".
- Every song already in the setlist: the default chip shows an empty state and **Add songs** stays disabled with its icon.
- A setlist with no songs: the blank numbered line "1 · Add songs" is the empty state.
- Entries with no energy: the Order curve draws them at the default level in the muted colour, as `setlist-entry-energy.core.ts` does today.
- A pasted chart already in ChordPro: kept as is. A pasted text with no recognisable chord: kept as text, tonality left empty for the person to fill.
- A task linked to a session that is then deleted: the task stays and loses its session, the way tasks lose a deleted song today.
- No session ahead: Home shows the empty state with **New session**.
- Dark mode: every screen, sheet and token in both schemes.

**Error cases:**
- Adding songs fails: the sheet stays open with the checked songs still checked and an error line; nothing is half added (see Q5).
- An entry note save fails: the field keeps the text and shows "Not saved" with a retry button (`refresh`).
- A photo or PDF upload fails or exceeds the existing upload limits: the error the uploads route returns today, shown under the button.

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| D11 Design system direction | Studio, Backstage, Notebook, or a mix | Notebook as the base with the grafts of `design/comparison.md` (2026-10-27). See *Design system* below. |
| D1 Tab bar | Today's five tabs plus More; four tabs | Home, Sessions, Songs, Band (2026-10-27). Bars and Studies cost one more tap. |
| D2 Start screen | Catalogue; Home | Home (2026-10-27). Browsing songs costs one more tap. |
| D3 Where "who does what" lives | Tasks on songs only; a session link on tasks | A nullable session on each task (2026-10-27). Schema change, ADR below. |
| D6 Breaks in a setlist | Breaks now; total time now, breaks later | Total time now (2026-10-27). |
| D7 Energy curve | Pinned on the list; a toggle on the list; a separate screen | Order screen, curve on by default there, hidden by a chip (2026-10-27). |
| D8 Stage mode | Main button of the song page; behind Full screen and the setlist menu | Behind **Full screen** and the setlist's `more` menu (2026-10-27). |
| D9 Chord input | Paste, photo, PDF; plus scraping or audio detection | Paste, photo and PDF only (2026-10-27). |
| D10 Bottom sheets | A sheet library; the native `<dialog>` | Native `<dialog>`, one `Sheet` molecule, no library. Swipe to close comes later (2026-10-27). |
| Operator comments | | Lineup view across the setlist; no key on the session page; "Talk" gets a clear label; cover in the entry sheet; every button has an icon; songs are added from the setlist, several at once (2026-10-27). |
| Name of the renamed "Talk" | "Messages about this practice / concert" | Label recorded for D5. "Talk" exists only in the audit mockups, not in the app, so nothing is renamed in this iteration. |
| Q1 Does "Start the practice" exist as the session's primary action? | (a) **Open the setlist** before the date and **Listen back** after it; (b) a new "practice in progress" mode | **Open question.** Recommend (a): (b) has no behaviour defined anywhere in the audit. |
| Q2 A member colour equals the action blue | Notebook's `member-6` is `#2d5fa0`, the same as `accent`, so a sixth member's glyphs read as tappable | `member-6` is replaced by a hue that is not blue and passes 4.5:1 with `on-member` in both schemes (2026-10-27, spec review: a contrast defect the operator asked to fix). |
| Q2b Members' stored colours | (a) keep each member's free hex colour (rank 36); (b) map each member onto one of the six `member-*` tokens, which changes some members' colours | **Open question.** Recommend (b): a free hex colour cannot be held to the contrast gate in dark mode. |
| Q3 Seven or more members in the Lineup grid | (a) pin the title line and scroll the member columns sideways; (b) show the members who play in this setlist only, and fall back to (a) | **Open question.** Recommend (b): the seed has five members and the grid already drops members who play nothing. |
| Q4 Monospace face | Keep JetBrains Mono; switch to Geist Mono | Keep JetBrains Mono (2026-10-27, spec review): no new dependency, and the mono face is only for chord symbols. |
| Q5 Adding several songs at once | (a) one request per song; (b) one new route adding a list in one transaction | (b) (2026-10-27, spec review; an implementation choice): today's `setlistEntryCreateSchema` takes one song, and one transaction keeps positions in pick order and makes a failure all or nothing. |
| Q6 Text from PDFs | (a) store every PDF as a file; (b) read a PDF's text layer in the browser with `pdfjs-dist`, a new dependency | **Open question.** [ADR-0048](../../../../adr/0048-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) recommends (b). Photos are stored as today either way. |
| Q7 YouTube mark | `BrandLogo.tsx` holds Deezer and Spotify only | Use YouTube's official mark from its brand resources, never a redrawn one, under the same `BrandLogo` atom. |
| Q8 "My part" | The vocabulary refuses **part** for what a member holds | The screen label stays "My part" (the existing i18n key `myPart`); identifiers say member and lineup, following `filterEntriesForMember`. |
| Q9 Measuring harness | Keep it in the session scratchpad; move it into the repository | It must move in slice 1: today it hard-codes a scratchpad path, and every acceptance number below depends on rerunning it. The copy to start from is `../audit/task-metrics/` in this feature folder. |
| Q10 "Stage mode" | The vocabulary's word is **scene view** | "Stage mode" and **Full screen** are screen words only; identifiers keep `scene`, as `scene-view.core.ts` does. |

**Inconsistencies found while writing this spec, and how they are resolved:**
- The Add-a-song proposal (A10) had a switch "Also add to Wednesday's practice". That is adding to a setlist from outside the setlist, which the operator refused. Dropped; the Add songs sheet creates new songs instead, from the music service's results or as an idea, which is how task 8 now runs.
- Notebook's direction says screen actions are quiet blue words with no fill; the graft makes them filled pills. The graft wins and the specimen's "action placement" rule is rewritten to match.
- Notebook's direction says key is not shown on the setlist; the operator allows it on setlist rows. The operator wins: key and capo may show on rows, never on the session page.
- The critic proposed Record as one of the round actions; it is the song page's primary action, so it appears once, in the bottom strip.

**Out of scope:** attendance (D4); session messages (D5); breaks inside a setlist (D6); swipe to close a sheet (D10); stage mode and audience screens beyond reaching them; the offline and stale-order findings (ranks 9, 10, 11), which need their own spec on the service worker; scraping chord sites; audio chord detection; recent activity on Home; a desktop-specific layout beyond keeping today's breakpoints working.

## Architectural choices

| ADR | Decision | What it constrains downstream |
|---|---|---|
| [ADR-0045](../../../../adr/0045-pragma-design-system-is-notebook-with-grafts.md) (proposed): pragma design system is Notebook with grafts | Tokens from `design/notebook/tokens.css` with the grafts below; `light-dark()` values in one `@theme static` block; the rules of the *Design system* section | Every atom, molecule and screen in all six slices; the lint rules and tests that gate the rules |
| [ADR-0046](../../../../adr/0046-newsreader-replaces-instrument-serif.md) (proposed): Newsreader replaces Instrument Serif | Add `@fontsource-variable/newsreader` 5.3.0 (new dependency), self-hosted from its `opsz` stylesheets, latin subset; remove `@fontsource/instrument-serif`. Measured: 278,872 B of latin WOFF2 for upright and italic, against 43,160 B today; Geist Mono is not taken (Q4) | Slice 1; `tokens.css` changes the `font-display` family, and the 46 other files under `site/src` that use the class are checked once each (titles become upright) |
| [ADR-0047](../../../../adr/0047-a-task-names-an-optional-session.md) (proposed): a task can name a session | New nullable `session_id` uuid column on `task`, no foreign key (DSQL), claimed in the task's transaction like `assigneeId` and `songId`; deleting a session nulls it; the task's song may be any song, not only an original | Slice 5; `api/src/tasks/`, `api/src/sessions/` delete cascade, the migration, `VOCABULARY.md` › Task |
| [ADR-0048](../../../../adr/0048-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) (proposed): text from a chord photo or PDF | Recommended: pasted text and a PDF's text layer (`pdfjs-dist`, Apache-2.0, loaded on the chord editor only) go through `chords-above-lyrics.core.ts`; a photo stays an `image` chart. Measured on one synthetic chord chart: PDF text layer 27 of 27 chords in their columns, `tesseract.js` on a fake photo 17 of 27 with columns lost; Textract priced at 1.50 USD per 1,000 pages in eu-west-3, not measured. Answers Q6 if ratified | Slice 6. Transpose works on pasted charts and text PDFs; photos and scanned PDFs stay files |
| None: icons | Copy the needed Lucide path data into `atoms/Icon.tsx` (ISC licence) instead of adding `lucide-react` | Slice 1. Taking `lucide-react` instead would be an ADR |

## Design system

**Base: Notebook** (`design/notebook/direction.md`, `tokens.css`, `specimen.png`): warm paper, one blue ink for everything you can tap, a pencil colour for transitions and a highlighter for what changed tonight; Newsreader for the band's words (song, setlist and session names), Geist for tools, the note style (Newsreader italic) for anything a member wrote, the mono face for chord symbols only.

**Tokens**: colours `paper`, `leaf`, `raised`, `sunk`, `rule`, `rule-strong`, `margin`; `ink`, `ink-soft`, `ink-faint`; `accent` (light `#2d5fa0`, so the manifest colour does not change), `accent-strong`, `accent-soft`, `on-accent`; `pencil`, `highlight`, `on-highlight`; `good`, `warn`, `danger` with soft tints; `member-1` to `member-6` with `on-member`; `stage-*` for the scene views. Type roles, six sizes: `display` 30, `heading` 22, `title` 19, `body` 16, `meta` 14, `label` 12. Radii: 3 (covers), 6, 10, 16, 20 (sheets), full. Spacing on a 4 px grid, 16 px gutter.

**Grafts** (`design/comparison.md`, *The recommendation*):
1. Buttons from Backstage in Notebook's blue: full pill radius, filled, no border at rest. Primary: `accent` fill, `on-accent` label. Secondary: a translucent fill with ink text and a blue icon, no hairline. Sizes 36, 44, 52; press scale 97%; disabled drops to the plain fill.
2. Add songs and Order as two floating pills in Notebook's 52 px strip above the tab bar, no bar and no box; the blank numbered last line stays.
3. The Lineup grid layout from Studio, six members at 375 px.
4. The song page for learning from Backstage: listening row, takes with play buttons, transpose stepper; Notebook's Your part with its highlighter.
5. "A chosen option turns ink, never blue": a selected chip or section tab is ink, blue is only for actions.
6. Backstage's empty "Note this transition" line in Notebook's pencil style.
7. Studio's labelled round actions for the song page's secondary actions.
8. Dropped from Notebook: the ruled note field; the specimen's action placement rule is fixed to match the screens.

Not taken: Backstage's cover mosaic in the setlist header, which the critic praised but did not recommend; it would push the first row down, against the first-row target below.

**Contrast fixes** (from the critic and the audit): the secondary pill's label (ink on the translucent fill over `paper` and over `raised`) is not in Notebook's `contrast.txt` and must be computed; the highlighter in dark mode reads as olive, not highlighted, and is retuned while keeping `on-highlight` at 4.5:1 or more; icon-button captions use one face (the specimen mixes mono and sans); the vote page's selected toggle (2.80:1, rank 25, a `surface` colour `tokens.css` never defines) goes away with the token sweep; `member-6` per Q2. The secondary pill has no border, so its fill against `paper` and `raised` is computed too and the pill keeps its label and icon as its identification. A test fails the build when a class names a colour token `tokens.css` does not define, which is how `surface` went unnoticed.

**Rules:**
- **Every button has an icon**, never text only: `Button` and `ButtonLink` require `icon` by type; `IconButton` requires `label`, which becomes its accessible name. Section tabs and chips are choices, not buttons; list rows end in `chevR` or start with a cover. One icon per verb and one per destination, from DESIGN.md's verb table plus `reorder`, `swap`, `song`, `clipboard`, `camera`, `refresh`. A control that navigates is a link drawn as a button (`ButtonLink`), never a button inside a link.
- **One scroll container per screen**: the document scrolls; nothing inside it scrolls vertically; text areas grow; while a sheet is open its body is the only scroll. Horizontal chip strips are allowed.
- **Primary action placement**: at most one primary per screen, as a pill in the bottom strip above the tab bar, with a second pill allowed beside it; the strip never hides on scroll, and the page's bottom padding equals its height; rare actions go in the header `more` menu; no round floating button; a sheet's actions sit in its footer.
- **Sheets**: one `Sheet` molecule on `<dialog>` with `showModal()`; grabber, title, `close` icon button, one scroll body, footer; on opening, the focus goes to the first field a person types in, and to Close only when the sheet has no field (rank 23); closes by `close`, Escape or backdrop; one save model per sheet (explicit or automatic with "Saved"); drafts survive a close; a sheet never opens another; confirm is a `Sheet` with a `danger` button.
- **Safe areas**: the shell pads `env(safe-area-inset-top)`; the tab bar pads the bottom inset; sheet footers pad `max(16px, env(safe-area-inset-bottom))`; side gutters pad the left and right insets in landscape.
- **No value outside the tokens**: no `text-[`, `bg-[`, `rounded-[`, `shadow-[`, hex or `rgba()` in components, except the brand marks in `BrandLogo`.
- **Tap targets** stay at 44x44 px or more, including the 44x44 drag handle and the Lineup grid cells (hit area extends into the row padding).

## Acceptance criteria

Measured with the task-metrics harness at 390x844 in emulated standalone mode, on the audit seed, with argent taps, and compared with `baseline/baseline.json`. Start screen is Home after D2 (was `/catalog`). These rows become `/visual-validation` assertions. Each row names the slice that must meet it; a later slice must not undo it. A before value read from a baseline screenshot rather than measured is marked as such: slice 1 adds that measure to the harness and records the real before value on today's app first.

| Task | Before (taps / scrolls / screens) | Target | Also |
| --- | --- | --- | --- |
| 1 Prepare the next practice (slice 5) | 18 / 3 / 7 | ≤ 15 / ≤ 1 / ≤ 4 | setlist created from the session in the same flow |
| 2 Build the concert setlist (slice 4) | 10 / 2 / 6 | ≤ 11 / 0 / ≤ 6 | one tap more reaches the Setlists section (D1); order kept after reload |
| 3 Agree who does what (slice 5) | 9 / 3 / 3, title field at 2.18 screens | ≤ 8 / 0 / ≤ 3 | title focused on opening; song options 6 -> all songs (44 in the seed); task linked to a session |
| 3b See my own tasks (slice 2) | 2 / 0 / 3 | 1 / 0 / 2 | |
| 4 Lineup for one song tonight (slice 3) | 4 / 0 / 3 | 3 / 0 / 2 | lineup sheet inner scroll 1 -> 0 |
| 5 Note a transition (slices 1 and 3) | 3 / 0 / 2, note not shown | ≤ 3 / 0 / 2 | comment shown on the list; draft kept after a backdrop close |
| 6 Note on a song for tonight (slices 1 and 3) | 4 / 0 / 2, note not shown | 3 / 0 / 2 | note shown on the row; full text stored in 8 of 8 runs of the note race (was 3 of 4) |
| 7 Record a take and comment (slice 5) | 7 / 2 / 3 | ≤ 7 / ≤ 1 / 3 | past practice lists its takes: 0 of 7 -> 7 of 7 |
| 8 Add a new song and put it on the next practice (slice 4) | 12 / 0 / 6, 3 text entries | ≤ 5 / 0 / ≤ 3, 1 text entry | the flow never leaves the setlist; artist and cover come from the music service when it answers |
| 8b New song from the setlist (slice 4) | 6 / 0 / 4 | 4 / 0 / ≤ 3 | |
| 9 Add chords (slice 6) | 6 / 1 / 3, ChordPro required | ≤ 3 taps plus the paste / 0 / ≤ 3 | no ChordPro syntax typed; edit route vertical scroll areas 3 -> 1 |
| 10 Learn a new song (slice 6) | 5 / 2 / 3 | 4 / 0 / 3 | Practised visible on arrival |
| 11 Close a vote (slice 3) | 9 / 8 / 2 | ≤ 9 / ≤ 4 / 2 | "Close the vote" visible on arrival, at the bottom of the screen; back link on the vote page |
| 12 Check what is next (slice 2) | 1 tap, concert only | 0 taps | next practice or concert with date, place and setlist on Home |

| Route or screen measure | Before | Target |
| --- | --- | --- |
| Primary actions in the bottom third on arrival (after slice 6; each slice holds its own routes to it) | 14 of 32 | ≥ 26 of 32 |
| Primary actions off screen on arrival (after slice 6) | 4 | 0 |
| Text-only buttons, 26 routes (slice 1, because `icon` becomes required by type) | 181 of 416 | 0 |
| Icon-only buttons without an accessible name (slice 1) | not measured; slice 1 records it first | 0 |
| Routes with two or more vertical scroll areas | 2 | 1 after slice 1 (`/bars` fixed by growing text areas), 0 after slice 6 (`/catalog/:songId/edit`) |
| Sheets with an inner vertical scroll (slice 1, through `Sheet`) | 2 (Add songs, lineup) | 0 |
| Tabs (slice 2) | 5 plus More | 4, no numbers (was 3 numbers) |
| `/setlists/:id` first song row top, 375x667 / 390x844 (slice 3) | 269 px / about 265 px, read from a screenshot | ≤ 190 px / ≤ 215 px |
| `/setlists/:id` sticky elements while scrolling, other than the bottom strip (slice 3) | 1 (71 px chart) | 0 |
| Lineup grid: songs with the full lineup on the first screen, 390x844 (slice 3) | about 5, read from a screenshot | ≥ 8 |
| Lineup grid: changes from the previous song marked (slice 3) | 0 | all |
| Order screen: rows visible with the curve, 390x844 (slice 4) | about 5 below today's chart, read from a screenshot | ≥ 8 |
| Drag handle (slice 4) | 20x44 | 44x44 |
| Add songs confirm button position (slice 4) | 0.12 of the screen | ≥ 0.85 |
| Songs already in the setlist offered again (slice 4) | yes | no |
| Band tasks layout width at 390 (slice 2) | 493 px | 390 px |
| `/catalog` page height (slice 6) | 6.88 screens | ≤ 4.2 screens |
| Ways into stage mode from the song page (slice 6) | 3 | 1 |
| Buttons inside a link (slice 6) | 5 places | 0 |
| Listen links visible on the song page (slice 6) | 0 | one per link the song has |
| Distinct font sizes outside the scene views (slice 1) | 18 | 6 |
| `text-[` in `site/src` (slice 1) | 21 | 0 |
| Raw `<dialog>` outside `Sheet` (slice 1) | 14 | 0 |
| Sheets whose focus lands on Cancel or Close while they hold a field (slice 1) | 3 | 0 |
| Text pairs under 4.5:1, both schemes (slice 1) | 1 known (2.80:1) | 0 |

## Slices

Each slice is one pull request, in dependency order. Every slice keeps the app working at 375 and 390 px in both schemes, and adds its rows to the harness.

1. **Foundation.** Tokens, fonts (Newsreader ADR), Lucide paths in `Icon.tsx`, `Button` and `ButtonLink` with required icon, `IconButton`, `Sheet` on `<dialog>`, `BottomActions` (the pill strip), `SectionTabs`, `ListRow`, `PageHeader`, `EmptyState`, `Menu`; the lint gates (no arbitrary values, no raw `<button>` or `<dialog>` outside their components) and the one-scroll test; the two note-loss fixes (entry note last-write-wins, transition draft kept); the task-metrics harness moved into the repository, first, so every later number in this slice is measured with it. Screens: every screen changes look through the tokens, every button gains its icon, and today's 14 dialogs move onto `Sheet` with their content unchanged; no navigation or layout change. Today's lineup dialog still opens from the entry sheet until slice 3 removes it, so the rule "a sheet never opens another" is gated from slice 3. Acceptance: harness reruns from the repository on today's app and reproduces every task's counts in `baseline.json` exactly (taps, text entries, scroll gestures, screens), before any other change lands; then the rows marked slice 1 under *Acceptance criteria*; note race 8 of 8; transition draft kept after a backdrop close.
2. **Shell, navigation and Home.** Four tabs, no counts, top safe area, Home with next session, Your part and Your tasks, Band hub, Sessions with the Setlists section, sessions listed next first, manifest shortcut to Home, theme colour per scheme in `index.html`, the account page and language switch reached from Band, task chips that wrap. Screens: shell, Home, Sessions, Band, account, Studies reached through Band until slice 6. Acceptance: the rows marked slice 2.
3. **Setlist views and entry sheet.** Header with `more` menu and total time, Songs / Lineup / My part, rows with note and highlighted changes, transition line with "Note this transition", Lineup grid, entry sheet with cover, inline lineup and autosaved note, Open the song; the vote page's back link, explanation and bottom-strip action. Screens: setlist, entry sheet, transition sheet, vote page. Acceptance: the rows marked slice 3.
4. **Add songs and Order.** The Add songs sheet with multi-select, the music service's results and New song as an idea, the batch add route (Q5), the Order screen with the energy curve and Copy order, the pill strip on the setlist. Screens: setlist, Add songs sheet, Order. Acceptance: the rows marked slice 4.
5. **Session page and tasks.** Task session link (schema ADR, migration, API), task sheet on Band and on the session, song choice over all songs, session page with setlist preview without key, Who does what, takes, Add songs creating the session's setlist. Screens: session, Band, Home's Your tasks. Acceptance: the rows marked slice 5.
6. **Songs, song page and chords.** Compact catalogue, To learn filter replacing Studies, study rows opening their song, Add a song sheet, song page for learning (listen row with official marks, setlists line, round actions, Your part, transpose, takes, Full screen), chord input by paste with the converter, photo and PDF (Q6). Screens: Songs, song page, song edit, Studies removed. Acceptance: the rows marked slice 6, and the two rows measured after slice 6.

Slice 6 depends on slices 1 and 2 only and may run beside 3 to 5. Slice 5 needs slice 4, because the session's Add songs opens the Add songs sheet.

## Changes

### Types / domain model

- **Task** gains `sessionId: string | null`. Its song may be any song (`VOCABULARY.md` › Task says "composition" today and is updated).
- **Session** lists change order: coming sessions first, nearest at the top, then past ones, newest first (rank 22). `VOCABULARY.md` › Session says "listed newest first" today and is updated with `sessions.repository.ts`.
- No new entity for the Order screen, the Lineup grid or My part: they read `setlist_entry.position`, `energy`, `lineupOverride`, the song's `defaultLineup` and `baseEnergy` through `resolveLineup`.
- New vocabulary to add to `apps/pragma/VOCABULARY.md` when built: **Order screen** (the setlist's screen for reordering by energy; not a new noun for the setlist itself, which the vocabulary forbids calling a running order), **Home** (the start screen showing the next session), **Band tab**. The D5 thread, when built, is a **session message**, labelled "Messages about this practice / concert".

### Database changes

```sql
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "session_id" uuid;
```

Nullable, no default and no foreign key, as Aurora DSQL requires; written through the existing DSQL migration path.

### Files to change

Paths are indicative; `/technical-conception` maps each to its blueprint.

```
apps/pragma/site/src/styles/tokens.css                          // UPDATE: Notebook tokens + grafts, light-dark()
apps/pragma/package.json                                        // UPDATE: + Newsreader, - Instrument Serif
apps/pragma/site/src/components/atoms/Icon.tsx                  // UPDATE: Lucide paths, new verbs
apps/pragma/site/src/components/atoms/button.variants.ts       // UPDATE: pill variants, sizes 36/44/52
apps/pragma/site/src/components/atoms/IconButton.tsx           // NEW
apps/pragma/site/src/components/atoms/BrandLogo.tsx            // UPDATE: YouTube official mark
apps/pragma/site/src/components/molecules/Sheet.tsx            // NEW: replaces 14 dialogs
apps/pragma/site/src/components/molecules/BottomActions.tsx    // NEW: replaces BottomActionBar, StickyFormActions
apps/pragma/site/src/components/molecules/SectionTabs.tsx      // NEW
apps/pragma/site/src/components/organisms/AppShell.tsx         // UPDATE: four tabs, safe areas, no More
apps/pragma/site/src/routes/home/HomePage.tsx                   // NEW, with home.core.ts
apps/pragma/site/src/components/organisms/SetlistEditor.tsx     // UPDATE: section tabs, no chart
apps/pragma/site/src/components/organisms/SetlistLineupGrid.tsx // NEW, with lineup-grid.core.ts
apps/pragma/site/src/routes/setlists/SetlistOrderPage.tsx       // NEW, with energy-curve.utils.ts
apps/pragma/site/src/components/organisms/SetlistSongPicker.tsx // UPDATE: Add songs sheet
apps/pragma/site/src/components/organisms/SetlistEntrySheet.tsx // UPDATE: cover, inline lineup
apps/pragma/site/src/components/molecules/SetlistEntryNotesField.tsx  // UPDATE: last write wins
apps/pragma/site/src/components/organisms/TransitionCommentModal.tsx  // UPDATE: draft survives
apps/pragma/site/src/components/organisms/SessionDetail.tsx     // UPDATE: preview, tasks, takes
apps/pragma/site/src/routes/catalog/*                            // UPDATE: catalogue, song page, chords
apps/pragma/domain/chords-above-lyrics.core.ts              // NEW: chords above lyrics -> ChordPro
apps/pragma/api/src/tasks/tasks.schema.ts                       // UPDATE: sessionId
apps/pragma/api/src/setlists/                                    // UPDATE: batch add entries (Q5)
apps/pragma/api/src/sessions/sessions.repository.ts             // UPDATE: null task sessions on delete
apps/pragma/site/public/manifest.webmanifest                    // UPDATE: shortcut to Home
apps/pragma/site/index.html                                     // UPDATE: theme-color per scheme
apps/pragma/site/src/routes/setlists/SetlistVotePage.tsx       // UPDATE: back link, bottom-strip action
apps/pragma/site/src/components/organisms/AccountSettings.tsx   // UPDATE: holds the language switch
apps/pragma/site/src/i18n/en.json, fr.json                      // UPDATE
eslint-rules/                                                    // NEW: arbitrary values, raw button and dialog
apps/pragma/VOCABULARY.md                                        // UPDATE: Task, new nouns
```

### Test strategy

- **Unit, 100% coverage gate**: `home.core.ts` (next session, my part, my tasks), `lineup-grid.core.ts` (cells and change flags), `energy-curve.utils.ts`, the Add songs selection and filter core, `chords-above-lyrics.core.ts` (chord lines, lyric lines, already-ChordPro input, no chords), the last-write-wins helper for the note field, the task session claim in `tasks.core.ts`.
- **Back-e2e**: a task saved with a session and a song that is not an original; deleting a session nulls its tasks' session; the batch add appends in pick order and adds nothing when one song does not exist.
- **Visual validation**: every happy path and edge case above, and every row of *Acceptance criteria*, driven with argent taps at 375x667 and 390x844 in both schemes. Touch behaviour (the drag on the Order screen, a tap on a Lineup cell, the sheet backdrop) goes through `scripts/argent.sh`, not synthetic clicks. These are input metrics only: a green run does not prove the output metric.
- **Gates**: the button type, the new lint rules with their `RuleTester` suites, the one-scroll test over every route and sheet (with `/catalog/:songId/edit` as its one listed exception until slice 6), a contrast test over the token values, a test that fails on a class naming a colour token `tokens.css` does not define; each cited in its document under `docs/standards/`.
- **Technical validation**: lint, knip, typecheck, build, unit and back-e2e suites, Stryker on the changed cores, and a per-decision pass on the diff.
- **Not provable here**: the software keyboard over sheet footers, iOS standalone behaviour, the touch sensor's long press on a real phone, recording and playback.

## Production strategy

### Analytics

**Input metrics** (named events, through the app's existing Sentry setup, ADR-0031):
- `setlist_songs_added` with the count per tap of **Add N songs**; success: median count above 1 over 30 days.
- `setlist_view_changed` (`songs`, `lineup`, `my_part`) and `setlist_order_opened`.
- `entry_note_saved` and `transition_comment_saved`, with `entry_note_save_superseded` when a reply to an older save is dropped.
- `chord_chart_added` with the source (`paste`, `photo`, `pdf`) and whether the converter changed the text.
- `task_created` with whether a session is linked.

**Output metric** (out of CI): at each practice, the operator asks one member what they play tonight and what was decided for one song, and notes whether the app answered without the chat. Reviewed monthly against the events above.

### Zero-defect strategy

- `SetlistBatchAddError` when the batch route refuses or fails; tagged with the setlist id; alert on 3 in 1 hour.
- `EntryNoteSaveError` when a note save fails after its retry; alert on any occurrence, since it is the data-loss path this spec closes.
- `ChordConversionError` when the converter throws on pasted text (the text is still saved as typed); alert on 5 in a day.
- `TaskSessionNotFound` when a task names a session deleted meanwhile; logged, no alert, as for `song-not-found` today.
