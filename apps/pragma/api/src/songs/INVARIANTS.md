# Invariants of pragma, in `api/src/songs`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Chord chart

- Exactly one of three kinds: `chordpro` with inline text up to 64 000
  characters, `pdf` with an S3 object key, or `image` with an S3 object
  key (`chordChartSchema`).
- The column is nullable, and stored as JSON in a TEXT column.
- Its text comes from what a member pastes or from a PDF's text layer, read
  in the browser, in the "chords above lyrics" layout chord sites give; it
  is saved as ChordPro (`convertChordsAboveLyrics` in
  `site/src/routes/catalog/chords-above-lyrics.core.ts`), and text already
  in ChordPro is kept as is. A photo and a PDF with no text layer stay
  `image` and `pdf` files, which cannot be transposed.

Held by: `api/src/songs/songs.controller.test.ts` › persists each of the three chord-chart variants
Held by: `site/src/routes/catalog/chords-above-lyrics.core.test.ts` › places each chord on the syllable it stood above

## Energy

- Both columns are whole numbers from 1 to 10 and both may be null.
- `baseEnergy` is the song's usual level; the entry's `energy` is what
  that song is worth in this particular setlist. The sparkline draws the
  entry's `energy`, and the song's `baseEnergy` for an entry that has none
  (`SetlistEditor.tsx`).
- An entry with no energy anywhere draws its bar in the muted palette,
  filled to `ENERGY_DEFAULT`, which is 5
  (`site/src/components/molecules/setlist-entry-energy.core.ts`). The bar
  is ten segments, one per level, each carrying its own number, which a
  thumb taps or slides along; the value is the last number still filled,
  so the row shows it nowhere else
  (`site/src/components/atoms/EnergyBar.tsx`).

Held by: `site/src/components/molecules/setlist-entry-energy.core.test.ts` › falls back to the song energy when the entry stores none
Held by: `site/src/components/molecules/setlist-entry-energy.core.test.ts` › falls back to the midpoint when neither is set
Held by: `site/src/components/molecules/setlist-entry-energy.core.test.ts` › mutes the filled segments while nothing is stored

## Deezer track

- Nullable. A song typed in by hand names no track until someone links it,
  and the listen dialog then offers a Deezer *search* instead of the track
  page. Both are ordinary, not faults.
- Distinct from the **Deezer album**, which is what the cover is fetched
  by, and from the **Spotify track**, which the API resolves from this
  track's ISRC. Picking a search result sets the first two and clears the
  third, which is then resolved again on save.
- One track belongs to at most one song: `song_deezer_track_id_unique`
  refuses a second. A create or an update naming a track another song
  holds answers 409 `deezer-track-taken` with that song's id and title.

Held by: `api/src/songs/songs.controller.test.ts` › refuses a second song naming a Deezer track another song holds, and names the holder
Held by: `api/src/songs/songs.controller.test.ts` › refuses moving a song onto a Deezer track another song holds, and lets a song keep its own

## Spotify track

- Nullable, and ordinarily so. Spotify and Deezer do not carry identical
  catalogues, a song typed in by hand names no ISRC to resolve from, and a
  song predating the column has none until it is re-linked. Each of those
  falls back to a Spotify *search* address in the listen dialog.
- No form field writes it, unlike the **Deezer track**, which a member may
  type. The song form sends back the value it read, and the API fills it
  from the ISRC when a save carries none (`withResolvedSpotifyTrack`).
  Picking a new Deezer result clears it (`applyExternalIdentityToDraft`),
  so an id can never outlive the Deezer track it was found for.
- Distinct from the **Deezer track**: the two name the same recorded song on
  two services, and the ISRC is what joins them. See
  [ADR-2026-09-15T2023](../../../../../docs/adr/2026-09-15T2023-spotify-track-ids-resolved-by-isrc-at-link-time.md).

Held by: `site/src/routes/catalog/song-draft.core.test.ts` › overwrites the metadata fields and leaves the rest of the draft alone
Held by: `site/src/lib/listen-links.utils.test.ts` › falls back to a search when the song names no track

## Deezer album

- Distinct from the **Deezer track**, which is what `deezer_track_id`
  holds. One track belongs to one album; an album has one front cover.
- Nullable, because Aurora DSQL cannot add a `NOT NULL` column after the
  table exists, and because a song typed in by hand names no album.
- A song with no Deezer album renders a tile carrying the song's initials
  instead. That case is ordinary, not a fault.
- Most confused with **album**, which is the album's *title* as text and
  is what the interface prints; the Deezer album is the identifier the
  cover is fetched by.
- The columns `mbid` and `release_id` are the MusicBrainz identifiers this
  replaced. Aurora DSQL drops no column, so they stay in the table and
  nothing reads them; a MusicBrainz identifier names nothing on Deezer, so
  the old values were not carried over.

Held by: `site/src/lib/cover-art.utils.test.ts` › has no address for a song that names no album

## Song

- `title` is `NOT NULL`, trimmed, 1 to 256 characters. `artist` is
  `NOT NULL` and defaults to the empty string. `status` is `NOT NULL`.
- `status` is one of `idea`, `to_play`, `wip`, `rehearsed`, `concert_ready`
  (`SONG_STATUSES`). `to_play` is a song the band has chosen to play and
  has not started working on yet. The column is plain `text`, so a new
  status needs no migration.
- `links` holds up to 16 external links, each with a URL, a provider
  (`spotify`, `deezer`, `youtube`, `other`) and a comment.
- Deezer enrichment lands in `deezerTrackId`, `deezerAlbumId`, `album`,
  `durationSeconds` and `isrcs` (Deezer names one per track). `spotifyTrackId`
  follows, resolved from that ISRC when the song is saved. `tags` (up to
  16) is kept for the songs imported from MusicBrainz before the move and
  is no longer filled by a search.
- Three separate note fields, each up to 4 096 characters:
  `structureNotes`, `gimmickNotes` and `notes`, all read back as the empty
  string when the column is null.
- The catalogue is listed newest first by `createdAt`.
- Deleting a song removes its row, its mastery overrides, its score
  history, its studies, every setlist entry and vote naming it, and its
  takes with their comments, and clears it from the tasks naming it, all in
  one transaction (`deleteSongWithCascade`); the takes' audio objects are
  deleted once the transaction commits.

Held by: `api/src/songs/songs.controller.test.ts` › creates, reads, updates and deletes a song
Held by: `api/src/songs/songs.controller.test.ts` › cascades the mastery overrides on song delete
Held by: `api/src/setlists/voting.controller.test.ts` › deletes the votes of a song with the song
Held by: `api/src/takes/takes.controller.test.ts` › deleting the song deletes its takes, their comments and their audio
