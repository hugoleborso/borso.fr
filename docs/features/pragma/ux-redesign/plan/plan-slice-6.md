# Plan: pragma UX redesign, slice 6 (songs, song page for learning, chords)

> Pair with [`../spec/spec.md`](../spec/spec.md) and the earlier plans in this folder. Short on purpose: the spec carries the decisions, and this file says where each one lands.

Branch `claude/pragma-ux-redesign-slice-6`, stacked on slice 5. It delivers what the spec's *Slices* section gives slice 6: the compact catalogue with the **To learn** filter that replaces Studies, the **Add a song** sheet, the song page for learning (listen row with official marks, setlists line, labelled round actions, Your part, transpose, takes, **Full screen**), and chord entry by paste and by a PDF's text layer ([ADR-0050](../../../../adr/0050-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md)), a photo staying an `image` chart.

One new dependency, `pdfjs-dist` 6.4.299, which ADR-0050 accepted; it is loaded with a dynamic `import()` from the chord editor only. No schema change. One additive API change: each setlist summary of `GET /api/setlists` carries its `songIds`, so the song page can name the setlists a song is in without a new route. Paths are relative to `apps/pragma/site/src/` unless they start with `apps/` or `api/`.

## How each spec decision becomes code

| Spec decision | File | Change | Blueprint |
| --- | --- | --- | --- |
| Song page: one line naming the setlists the song is in | `api/src/setlists/setlists.core.ts`, `setlist-entry.repository.ts` | `listEntryOwners` also selects `songId`; `tallySongsPerSetlist` keeps each setlist's song ids; `SetlistSummary` gains `songIds` | `core-projection`, `repository-projection` |
| Chords above lyrics become ChordPro; ChordPro kept as is; no chord, kept as text with tonality left empty | new `routes/catalog/chords-above-lyrics.core.ts` | `convertChordsAboveLyrics(text)` answers the ChordPro text and whether it changed anything; a chord line is a line whose every word is a chord symbol; it is merged into the lyric line under it at each chord's column | `core-projection` |
| A PDF's text layer: lines by y, columns by x | new `routes/catalog/pdf-text-layout.core.ts`, new `lib/pdf-text.adapter.ts` | The core places text items into lines by their y position and into columns by their x position over the median character width; the adapter loads `pdfjs-dist` with `import()`, wires its worker through Vite's `?url`, and answers the items of every page | `core-projection`, `adapter-direct-upload` |
| Chord section: **Paste text** (`clipboard`), **Photo** (`camera`), **PDF** (`upload`); preview under the text box; tonality filled from the result; a scanned PDF stored as a `pdf` chart; upload errors shown under the button | `components/organisms/SongChartFields.tsx`, new `organisms/chart-upload.hook.ts`, `organisms/FileDrop.tsx`, `organisms/SongChordPreview.tsx`, `organisms/SongEditForm.tsx`, `routes/catalog/song-draft.core.ts` | The kind radios go. The text box holds what the person pasted (`chordSourceText` in the draft) and the ChordPro saved is its conversion; the preview moves under the text box and loses its inner scroll; the upload of `FileDrop` moves into `useChartUpload`, which the Photo and PDF buttons call on the chosen file | `organism-presentational`, `hook-timer-owned-by-handlers`, `route-form` |
| Edit route: one vertical scroll area; no ChordPro syntax typed; the raw "Deezer track ID" field leaves the form; no button inside a link | `components/organisms/SongEditForm.tsx` | `SongDeezerTrackIdField` is removed; the header's stage mode link goes | `route-form` |
| Compact catalogue rows: cover, title, artist, status badge, chord icon only when a chart exists | `components/organisms/SongCard.tsx`, `organisms/CatalogGrid.tsx` renamed `CatalogList.tsx`, `routes/catalog/CatalogPage.tsx` | One 56 px row per song in a list; `NextConcertStrip` leaves the catalogue (Home shows the next session) | `organism-presentational`, `route-list-page` |
| **To learn** filter replacing Studies; a study row opens its song | `routes/catalog/catalog-page.core.ts`, `routes/catalog/CatalogPage.tsx`, new `organisms/ToLearnList.tsx`, `App.tsx`, `routes/band/band-destinations.core.ts` | The filter lives in the address (`?filter=to-learn`), so coming back from a song keeps it. `selectSongsToLearn` joins the member's study queue with the songs: one row per song, its instruments, its lowest score, the ready ones left out. `/studies` redirects to it; Studies leaves Band | `core-view-projection`, `organism-presentational` |
| **Add a song** (`plus`) in the bottom strip opens a sheet: title focused, artist, status chips; the music service's results fill title, artist and cover | new `organisms/AddSongSheet.tsx`, new `routes/catalog/add-song.core.ts` | The core holds the draft and builds the create payload from the typed fields or from a picked result; the sheet creates the song and opens its page | `molecule-dialog-form`, `core-view-projection` |
| Song page header: cover, title, artist, status; **Edit** (`edit`) and `more` | `components/organisms/SongDetailHeader.tsx` | **Edit** is a `ButtonLink`; `more` holds Edit the lineup and Upload a take; the stage mode button goes | `organism-presentational` |
| Listen row with official marks (Deezer, Spotify, YouTube) built from `links`, `deezerTrackId`, `spotifyTrackId` | `atoms/BrandLogo.tsx`, `lib/listen-links.utils.ts`, new `molecules/ListenRow.tsx` | YouTube's mark is the path Simple Icons (CC0) takes from YouTube's brand resources; `selectSongListenTargets` gives one target per track id and per stored link, without duplicates | `atom-plain`, `utils-pure-module`, `molecule-presentational` |
| Labelled round actions **Practised**, **Notes**, **Full screen** | new `molecules/RoundAction.tsx`, new `organisms/SongRoundActions.tsx`, new `routes/catalog/song-page.core.ts` | **Practised** logs a study for each instrument the member holds on the song (undone by a second tap the same day); **Notes** jumps to the notes; **Full screen** is the only way into stage mode | `molecule-presentational`, `organism-query-owning`, `core-decision` |
| **Your part**: the member's instrument and mastery in the highlighter | new `organisms/SongYourPart.tsx`, `routes/catalog/song-page.core.ts` | The member's rows of `buildSongLineupRows`; after Practised, the score steps up or down as the Studies row did | `organism-presentational` |
| Chord chart with a transpose stepper | new `molecules/TransposeStepper.tsx`, `organisms/SongChartPreviews.tsx` | The stepper reuses `clampSemitoneOffset` and `formatSemitoneOffset`; the chart header loses its stage mode link | `molecule-presentational` |
| Takes with play buttons; **Record a take** (`mic`) is the bottom strip's primary; the page's bottom padding equals the strip | `organisms/SongDetail.tsx`, `organisms/SongTakes.tsx` | `useRecordingSheet` and `RecordingSheetDialogs` on the page; `SongTakes` keeps its list and player, its record button goes and its upload moves to `more` | `organism-query-owning` |
| Default lineup and notes at the end of the page | `organisms/SongDetail.tsx`, `organisms/SongNotesCard.tsx` | One column; the notes carry the anchor **Notes** jumps to | `organism-query-owning` |
| Vocabulary: Chord chart's sources, the To learn filter | `apps/pragma/VOCABULARY.md` | Chord chart says where its text comes from; Study says where it is logged | |

Removed when nothing imports them any more: `routes/studies/` (`StudiesPage`, `studies-page.core.ts`, its `stepScore` moving into `song-page.core.ts`), `StudyQueue`, `StudyRow`, `BandStreaks`, `ConcertReadinessBar`, `SongDeezerTrackIdField`, and `NextConcertStrip` if the catalogue was its last caller.

## Tests

- `chords-above-lyrics.core.test.ts` (chord lines, lyric lines, a chord line with no lyric under it, already-ChordPro input, no chords, slash chords and extensions), `pdf-text-layout.core.test.ts` (items into lines, columns kept, an empty page), `catalog-page.core`, `song-page.core`, `add-song.core`, `listen-links.utils`: 100% coverage, mutants killed.
- API: `setlists.core.test.ts` for the song ids; the back-e2e list test reads `songIds`.
- Component tests: `SongChartFields` (Paste text converts and the preview sits under the box), `SongDetail` (one way into stage mode, no button inside a link), `AddSongSheet` (title focused, a picked result fills title and artist).
- Harness: walks 9 and 10 follow the new screens; `--slice-6` adds the catalogue page height, the ways into stage mode, buttons inside a link, listen links on the song page and scroll areas on the edit route.

## Acceptance rows (before -> target)

| Row | Before | Target |
| --- | --- | --- |
| 9 Add chords | 6 / 1 / 3, ChordPro required | ≤ 3 taps plus the paste / 0 / ≤ 3; no ChordPro typed; edit route vertical scroll areas 3 -> 1 |
| 10 Learn a new song | 5 / 2 / 3 | 4 / 0 / 3; Practised visible on arrival |
| `/catalog` page height | 6.88 screens | ≤ 4.2 screens |
| Ways into stage mode from the song page | 3 | 1 |
| Buttons inside a link | 5 places | 0 |
| Listen links visible on the song page | 0 | one per link the song has |
| Primary actions in the bottom third on arrival, off screen on arrival | 14 of 32, 4 | ≥ 26 of 32, 0 |

## Self-check before the gates

- No `useEffect` added: the clipboard read, the file choice and the PDF read run in handlers; the catalogue filter is read from the address.
- Every new button has an icon; one primary pill per screen (**Add a song**, **Record a take**, **Save**).
- No `text-[`, `bg-[`, hex or `rgba()` outside `BrandLogo`; member colours reach the screen through `MemberChip` and `MemberMark`.
- One scroll container: the preview grows with its text; the Add a song sheet's body is its only scroll.
- `pdfjs-dist` is reached only through `pdf-text.adapter.ts`, loaded by `import()`.
