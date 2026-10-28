# Plan: pragma UX redesign, slice 6 (songs, song page for learning, chords)

> Pair with [`../spec/spec.md`](../spec/spec.md) and the earlier plans in this folder. Short on purpose: the spec carries the decisions, and this file says where each one lands.

Branch `claude/pragma-ux-redesign-slice-6`, stacked on slice 5. It delivers what the spec's *Slices* section gives slice 6: the compact catalogue with the **To learn** filter that replaces Studies, the **Add a song** sheet, the song page for learning (listen row with official marks, setlists line, labelled round actions, Your part, transpose, takes, **Full screen**), and chord entry by paste and by a PDF's text layer ([ADR-0051](../../../../adr/0051-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md)), a photo staying an `image` chart.

One new dependency, `pdfjs-dist` 6.4.299, which ADR-0051 accepted; it is loaded with a dynamic `import()` from the chord editor only. No schema change. One additive API change: each setlist summary of `GET /api/setlists` carries its `songIds`, so the song page can name the setlists a song is in without a new route. Paths are relative to `apps/pragma/site/src/` unless they start with `apps/` or `api/`.

## How each spec decision becomes code

| Spec decision | File | Change | Blueprint |
| --- | --- | --- | --- |
| Song page: one line naming the setlists the song is in | `api/src/setlists/setlists.core.ts`, `setlist-entry.repository.ts` | `listEntryOwners` also selects `songId`; `tallySongsPerSetlist` keeps each setlist's song ids; `SetlistSummary` gains `songIds` | `core-projection`, `repository-projection` |
| Chords above lyrics become ChordPro; ChordPro kept as is; no chord, kept as text with tonality left empty | new `routes/catalog/chords-above-lyrics.core.ts` | `convertChordsAboveLyrics(text)` answers the ChordPro text and whether it changed anything; a chord line is a line whose every word is a chord symbol; it is merged into the lyric line under it at each chord's column | `core-projection` |
| A PDF's text layer: lines by y, columns by x | new `routes/catalog/pdf-text-layout.core.ts`, new `lib/pdf-text.adapter.ts` | The core places text items into lines by their y position and into columns by their x position over the median character width; the adapter loads `pdfjs-dist` with `import()`, wires its worker through Vite's `?url`, and answers the items of every page | `core-projection`, `adapter-direct-upload` |
| Chord section: **Paste text** (`clipboard`), **Photo** (`camera`), **PDF** (`upload`); preview under the text box; tonality filled from the result; a scanned PDF stored as a `pdf` chart; upload errors shown under the button | `components/organisms/SongChartFields.tsx`, new `organisms/chart-upload.hook.ts`, `organisms/FileDrop.tsx`, `organisms/SongChordPreview.tsx`, `organisms/SongEditForm.tsx`, `routes/catalog/song-draft.core.ts` | The kind radios go. The text box holds what the person pasted (`chordSourceText` in the draft) and the ChordPro saved is its conversion; the preview moves under the text box and loses its inner scroll; the upload of `FileDrop` moves into `useChartUpload`, which the Photo and PDF buttons call on the chosen file | `organism-presentational`, `hook-timer-owned-by-handlers`, `route-form` |
| Edit route: one vertical scroll area; no ChordPro syntax typed; the raw "Deezer track ID" field leaves the form; no button inside a link | `components/organisms/SongEditForm.tsx` | `SongDeezerTrackIdField` is removed; the header's stage mode link goes | `route-form` |
| Compact catalogue rows: cover, title, artist, status badge, chord icon only when a chart exists | `components/organisms/SongCard.tsx`, `organisms/CatalogGrid.tsx` renamed `CatalogList.tsx`, `routes/catalog/CatalogPage.tsx` | One 56 px row per song in a list; `NextConcertStrip` leaves the catalogue (Home shows the next session) | `organism-presentational`, `route-list-page` |
| **To learn** filter replacing Studies; a study row opens its song | `routes/catalog/catalog-page.core.ts`, `routes/catalog/CatalogPage.tsx`, `App.tsx`, `routes/band/band-destinations.core.ts` | The filter lives in the address (`?filter=learning`), so coming back from a song keeps it. `selectSongsToLearn` joins the member's study queue with the songs: one row per song, its instruments, its lowest score, the ready ones left out. `/studies` redirects to it; Studies leaves Band | `core-view-projection`, `organism-presentational` |
| **Add a song** (`plus`) in the bottom strip opens a sheet: title focused, artist, status chips; the music service's results fill title, artist and cover | new `organisms/AddSongSheet.tsx`, new `routes/catalog/add-song.core.ts` | The core holds the draft and builds the create payload from the typed fields or from a picked result; the sheet creates the song and opens its page | `molecule-dialog-form`, `core-view-projection` |
| Song page header: cover, title, artist, status; **Edit** (`edit`) and `more` | `components/organisms/SongDetailHeader.tsx` | **Edit** is a `ButtonLink`; `more` holds Edit the lineup and Upload a take; the stage mode button goes | `organism-presentational` |
| Listen row with official marks (Deezer, Spotify, YouTube) built from `links`, `deezerTrackId`, `spotifyTrackId` | `atoms/BrandLogo.tsx`, `lib/listen-links.utils.ts`, new `molecules/ListenRow.tsx` | YouTube's mark is the path Simple Icons (CC0) takes from YouTube's brand resources; `selectSongListenTargets` gives one target per track id and per stored link, without duplicates | `atom-plain`, `utils-pure-module`, `molecule-presentational` |
| Labelled round actions **Practised**, **Notes**, **Full screen** | new `atoms/RoundAction.tsx`, new `organisms/SongRoundActions.tsx`, new `routes/catalog/song-page.core.ts` | **Practised** logs a study for each instrument the member holds on the song (undone by a second tap the same day); **Notes** jumps to the notes; **Full screen** is the only way into stage mode | `atom-plain`, `organism-query-owning`, `core-view-projection` |
| **Your part**: the member's instrument and mastery in the highlighter | new `organisms/SongYourPart.tsx`, `routes/catalog/song-page.core.ts` | The member's row of `buildSongLineupRows`, each instrument with its score in the highlighter | `organism-presentational` |
| Chord chart with a transpose stepper | new `molecules/TransposeStepper.tsx`, `organisms/SongChartPreviews.tsx` | The stepper reuses `clampSemitoneOffset` and `formatSemitoneOffset`; the chart header loses its stage mode link | `molecule-presentational` |
| Takes with play buttons; **Record a take** (`mic`) is the bottom strip's primary; the page's bottom padding equals the strip | `organisms/SongDetail.tsx`, `organisms/SongTakes.tsx` | `useRecordingSheet` and `RecordingSheetDialogs` on the page; `SongTakes` keeps its list and player, its record button goes and its upload moves to `more` | `organism-query-owning` |
| Default lineup and notes at the end of the page | `organisms/SongDetail.tsx`, `organisms/SongNotesCard.tsx` | One column; the notes carry the anchor **Notes** jumps to | `organism-query-owning` |
| Vocabulary: Chord chart's sources, the To learn filter | `apps/pragma/VOCABULARY.md` | Chord chart says where its text comes from; Study says where it is logged | |

Removed when nothing imports them any more: `routes/studies/` (`StudiesPage`, `studies-page.core.ts`), `StudyQueue`, `StudyRow`, `BandStreaks`, `ConcertReadinessBar`, `SongDeezerTrackIdField`, `NextConcertStrip`, `EnergyBadge`, `MasteryBadge`, `mastery-aggregate.core.ts` and `useStepSongScore` with its helpers.

## Tests

- `chords-above-lyrics.core.test.ts` (chord lines, lyric lines, a chord line with no lyric under it, already-ChordPro input, no chords, slash chords and extensions), `pdf-text-layout.core.test.ts` (items into lines, columns kept, an empty page), `catalog-page.core`, `song-page.core`, `add-song.core`, `listen-links.utils`: 100% coverage, mutants killed.
- API: `setlists.core.test.ts` for the song ids; the back-e2e list test reads `songIds`.
- Component tests: `SongChartFields` (Paste text converts and the preview sits under the box), `SongDetail` (one way into stage mode, no button inside a link), `AddSongSheet` (title focused, a picked result fills title and artist).
- Harness: walks 9 and 10 follow the new screens; `--slice-6` adds the catalogue page height, the ways into stage mode, buttons inside a link, listen links on the song page and scroll areas on the edit route.

## Decided while building

- The To learn view is not an organism of its own: the catalogue's core projects the study queue into the same compact rows, with the member's instruments and lowest score as the line under the title, so one list draws both views. Its filter id is `learning`, because the design-token test reads `to-learn` as a Tailwind gradient class.
- The member's streak shows above the To learn rows. The band streaks and the concert readiness bar of the Studies page are not carried over: the spec removes the page and names no new home for them.
- **Your part** shows each instrument's score; the score stepper of the Studies row is not carried over, since the spec's song page names the mastery and no way to change it there.
- **Practised** stays offered for a song outside the study queue, from the instruments the member holds in its default lineup, and remembers on the page that it was pressed, because the queue only covers the next concert's songs when one is set.
- The listen row shows one link per track id and per stored link and nothing more; a song with none shows no row, and the long press on the header still offers the Deezer and Spotify searches.
- **Notes** jumps to the notes on the same page; **Edit the lineup** is the header `more` menu's one item, and the lineup card loses its own Edit button.
- `RoundAction` is an atom, added to the components the raw-button rule allows, and `ButtonAnchor` draws an outside link as a pill, because `buttonVariants` may not be imported outside the atoms.
- The Add a song sheet opens the new song's page when it is created. The `/catalog/new` route stays for direct links.
- A PDF whose reading throws is stored as a file, as a scanned one is.

## Acceptance rows (before -> target -> measured)

Measured column: `../validation/slice-6-after.json`, from `--tasks 9,10 --slice-6` on the slice 6 head at 390x844.

| Row | Before | Target | Measured |
| --- | --- | --- | --- |
| 9 Add chords | 6 / 1 / 3, ChordPro required | ≤ 3 taps plus the paste / 0 / ≤ 3; no ChordPro typed; edit route vertical scroll areas 3 -> 1 | 6 / 0 / 4 from Home (1 text entry, the search), of which 3 taps from the song page (Edit, Paste text, Save) plus the paste; no ChordPro typed, saved as ChordPro; edit route scroll areas 1 |
| 10 Learn a new song | 5 / 2 / 3 | 4 / 0 / 3; Practised visible on arrival | 4 / 0 / 3; Practised tapped on arrival with no scroll, the study counted today |
| `/catalog` page height | 6.88 screens | ≤ 4.2 screens | 3.4 screens |
| Ways into stage mode from the song page | 3 | 1 | 1 |
| Buttons inside a link | 5 places | 0 | 0 on the 25 signed-in routes |
| Listen links visible on the song page | 0 | one per link the song has | the audit seed holds no song with a track id or a link, so the harness measured none; `SongDetailPage.test.tsx` shows Deezer and YouTube for a song with a Deezer track and a YouTube link |
| Primary actions in the bottom third on arrival, off screen on arrival | 14 of 32, 4 | ≥ 26 of 32, 0 | left to the visual validator over every route; on the slice's own screens, Add a song, Record a take and Save sit in the bottom strip |

**Task 9 counts four screens and six taps from Home**: Home, Songs, the song and its edit page. The target's three taps and three screens hold from the song page, which is where the spec's happy path starts.

## Self-check before the gates

- No `useEffect` added: the clipboard read, the file choice and the PDF read run in handlers; the catalogue filter is read from the address.
- Every new button has an icon; one primary pill per screen (**Add a song**, **Record a take**, **Save**).
- No `text-[`, `bg-[`, hex or `rgba()` outside `BrandLogo`; member colours reach the screen through `MemberChip` and `MemberMark`.
- One scroll container: the preview grows with its text; the Add a song sheet's body is its only scroll.
- `pdfjs-dist` is reached only through `pdf-text.adapter.ts`, loaded by `import()`.
