# Vocabulary — pragma

`pragma` is a private progressive web app for one band. It holds the
band's song catalogue, the setlists they play, the practices and concerts
they play them at, and a small CRM of the bars they want to be booked in.
There are no user accounts: the five band members share one password, so
every reader is also every writer.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

## Bar

A venue the band wants to play in, and the record of where the
conversation with it has got to.

Lives in: `api/src/bars/`

- `name` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `lead`, `contacted`, `booked`, `played`, `cold`
  (`BAR_STATUSES` in `bars.schema.ts`), and the bars page groups the rows
  into one kanban column per status.
- `lastInteractionAt` may be null. A bar is stale when its last
  interaction is older than the threshold, and a bar with no recorded
  interaction is stale too (`isStale` in `domain/bar-staleness.core.ts`).
  The default threshold is 60 days.

Not to be confused with: the `venue` column on a concert, which is free
text typed for that one date.

## Chord chart

The written music for a song, in one of three forms.

Lives in: `api/src/songs/` (the `chart` column), with the file itself
uploaded through `api/src/uploads/`

- Exactly one of three kinds: `chordpro` with inline text up to 64 000
  characters, `pdf` with an S3 object key, or `image` with an S3 object
  key (`chordChartSchema`).
- The column is nullable, and stored as JSON in a TEXT column.

## Concert

A date the band plays in front of an audience.

Lives in: `api/src/sessions/`

- A row in `session` whose `kind` is `concert`.
- Carries `venue` (1 to 256 characters), `capacity` (0 to 100 000),
  `gear` (up to 2 048 characters, default empty) and
  `friendsCountPerMember`, a map from member id to a count between 0 and
  1 000.
- `concertCreateSchema` is `.strict()`, so a body carrying a practice-only
  key is rejected at the controller.
- A concert is upcoming when its date is strictly after now
  (`selectUpcomingConcerts` in `site/src/lib/upcoming-concerts.core.ts`).

Not to be confused with: a practice, which is the other `kind` of session.

## Energy

How much the room lifts during a song, on a scale of 1 to 10.

Lives in: `api/src/songs/` (`baseEnergy`) and `api/src/setlists/`
(`energy` on an entry)

- Both columns are whole numbers from 1 to 10 and both may be null.
- `baseEnergy` is the song's usual level; the entry's `energy` is what
  that song is worth in this particular setlist, and it is what the
  sparkline draws.
- An entry with no energy anywhere draws its slider and readout in the
  muted palette, and the slider rests at `ENERGY_DEFAULT`, which is 5
  (`site/src/components/organisms/setlist-entry-energy.core.ts`).

## Instrument

Something a member can hold on a song.

Lives in: `api/src/instruments/`

- `name` is `NOT NULL`, trimmed, 1 to 64 characters.
- `family` is nullable in the database. Every write sets both `family` and
  the older `is_harmonic` boolean from the same value (`encodeFamily`),
  and every read resolves the two through `resolveInstrumentFamily`, which
  falls back to the boolean for rows written before the column existed.
- The list is sorted by name.

## Instrument family

What kind of thing an instrument is, which is the only property the
transition rule reads.

Lives in: `domain/instrument.core.ts`

- Exactly four values: `harmonic`, `percussive`, `vocal`, `other`.
- `other` is the default (`DEFAULT_INSTRUMENT_FAMILY`).
- A harmonic instrument carries chords. A percussive or a vocal one covers
  a gap without holding harmony, which is why the transition rule ranks
  them behind.

## Lineup

Who plays what on a song: a map from member id to the list of instruments
that member holds.

Lives in: `domain/lineup.core.ts`

- The value is a list, because one person can hold two instruments at
  once. An empty list means that member sits the song out.
- Older rows carry a single instrument id, or `null` for a member sitting
  out. `normalizeLineup` accepts all three shapes and always returns lists.
- `resolveLineup` merges a song's `defaultLineup` with a setlist entry's
  `lineupOverride`: a member the override names takes the override's
  value, and a member it does not name keeps the default.
- `memberInstrumentPairs` yields one pair per instrument held. That is the
  grain mastery is scored at, so a member on drums and vocals is scored
  twice.
- When a member is deleted, their id is scrubbed out of every song's
  default lineup and every entry's override, inside one transaction
  (`deleteMemberWithLinks` with `scrubMemberFromLineup`).

## Mastery

How well a member plays a given instrument, as a whole number from 0 to 10.

Lives in: `api/src/mastery/`

- A default row is keyed on `(memberId, instrumentId)`, which is its
  primary key. An override row is keyed on
  `(memberId, instrumentId, songId)`.
- `score` is `NOT NULL` on both tables and validated to 0 to 10.
- The effective score is the override when one exists, and the default
  otherwise (`effective`). A score of 0 is a real answer and wins over the
  default, so the resolution tests for `undefined` explicitly.
- `meanForSong` averages the effective scores over the member-instrument
  pairs of the lineup, skipping pairs with nothing recorded, and answers
  null when nothing is known.
- Deleting a song deletes its override rows
  (`deleteSongWithCascade`).

## Member

One person in the band.

Lives in: `api/src/members/`

- `firstName` is `NOT NULL`, trimmed, 1 to 64 characters. `color` is
  `NOT NULL` and must match a hex pattern. `avatarS3Key` may be null.
- A member created without a colour is given palette slot N of five
  (coral, teal, mustard, plum, sage), wrapping round
  (`pickNextPaletteHex`).
- `member_instrument` links a member to the instruments they can play. Its
  primary key is `(memberId, instrumentId)`, so the pair cannot repeat.
- Assigning instruments replaces the whole set, and is refused when any of
  the ids is unknown (`assignInstrumentsToMember`).

Not to be confused with: the member ids inside a lineup, which say who
plays on one song rather than who is in the band.

## Offline manifest

The list of URLs the service worker pre-caches so the band can read the
catalogue and the next setlist with no signal.

Lives in: `api/src/sessions/`

- Carries the catalogue list URL, one detail URL per song, and the next
  session's URL with its setlist URL.
- The next session is the earliest one strictly after now, with ties
  broken on the identifier (`buildNextSessionOfflineManifest`).

## Practice

A rehearsal, optionally aimed at a concert.

Lives in: `api/src/sessions/`

- A row in `session` whose `kind` is `practice`.
- Carries `preparedConcertId`, which may be null, and nothing else beyond
  the shared columns.
- `practiceCreateSchema` is `.strict()`, so a body carrying a concert-only
  key is rejected at the controller.

## Scene view

The full-screen reading of a song's chart, for use on stage.

Lives in: `site/src/routes/catalog/`

- The transpose offset is clamped to -11 to +11 semitones, which is the
  whole range with distinct output, and the font size runs from 16 px to
  48 px in steps of 2 px, starting at 24 px.

## Session

One dated thing the band does together, either a practice or a concert.

Lives in: `api/src/sessions/`

- One table for both kinds, keyed on the `kind` column. `kind` and `date`
  are `NOT NULL`.
- The API validates the body as a discriminated union on `kind`, so a
  concert and a practice cannot borrow each other's columns.
- Sessions are listed newest first by date.
- Deleting a session deletes its setlist and that setlist's entries first
  (`deleteSessionWithCascade`).

Not to be confused with: a sign-in session, which is a browser cookie and
has nothing to do with a date in the calendar.

## Setlist

The ordered run of songs for one session.

Lives in: `api/src/setlists/`

- `sessionId` is `NOT NULL` and carries a unique constraint, so a session
  has at most one setlist.
- Asking for a second one answers `already-exists` rather than creating it
  (`createSetlistForSession`).

## Setlist entry

One song in one setlist, with the decisions that apply to it that night.

Lives in: `api/src/setlists/`

- `setlistId`, `songId` and `position` are `NOT NULL`; `notes` is
  `NOT NULL` and defaults to the empty string.
- Optional per-entry values: `energy` (1 to 10), `lineupOverride`,
  `keyOverride` (up to 16 characters) and `capo` (0 to 11).
- An appended entry takes the position equal to the current entry count.
- Deleting an entry compacts the remaining positions back to a gapless
  run (`removeEntryAndCompact`).
- A reorder is refused as `stale` unless the submitted ids are exactly the
  ids already stored for that setlist (`reorderEntries`).

## Sign-in session

Proof that this browser knows the band's shared password.

Lives in: `api/src/auth/`

- One `app_config` row, keyed `id = 1`, holds the argon2id password hash
  and the HMAC key that signs cookies.
- The cookie is named `pragma_session` and is `payload.signature`, where
  the payload carries the issue and expiry times. It lasts 30 days.
- Rotating the password mints a fresh HMAC key, so every cookie issued
  under the old key stops verifying.
- Login attempts are counted per hashed client IP and rate limited.
- Every domain router opens its chain with `requireSharedPasswordSession`.

Not to be confused with: a session, which is a practice or a concert.

## Song

One piece of music the band has in its catalogue.

Lives in: `api/src/songs/`

- `title` is `NOT NULL`, trimmed, 1 to 256 characters. `artist` is
  `NOT NULL` and defaults to the empty string. `status` is `NOT NULL`.
- `status` is one of `idea`, `wip`, `rehearsed`, `concert_ready`
  (`SONG_STATUSES`).
- `links` holds up to 16 external links, each with a URL, a provider
  (`spotify`, `deezer`, `youtube`, `other`) and a comment.
- MusicBrainz enrichment lands in `mbid`, `album`, `durationSeconds`,
  `isrcs` (up to 8) and `tags` (up to 16).
- Three separate note fields, each up to 4 096 characters:
  `structureNotes`, `gimmickNotes` and `notes`, all read back as the empty
  string when the column is null.
- The catalogue is listed newest first by `createdAt`.
- Deleting a song first deletes its mastery overrides and every setlist
  entry that points at it (`deleteSongWithCascade`).

## Tonality

The key a song starts in and the key it ends in.

Lives in: `domain/tonality.core.ts`, stored in `api/src/songs/`

- Derived from a ChordPro source by reading the first and the last
  recognisable chord, and reported as root plus quality, for example `C`,
  `F#m`, `Dmaj7`. A slash chord reports only its root.
- Ambiguous or missing input gives null, which the form shows as an empty
  field the reader can fill in by hand.
- Stored as `tonalityStart` and `tonalityEnd`, both nullable, up to 16
  characters.

## Transition

The gap between two consecutive setlist entries, and who can hold the room
across it.

Lives in: `domain/transition.core.ts`

- The verdict is `covered` when at least one member keeps a harmonic
  instrument across both songs, and `risky` otherwise.
- Members keeping a percussive or vocal instrument, and no harmonic one,
  are the support carriers, and the view lists them after the harmonic
  carriers.
- The comparison is instrument by instrument, so a drummer who also sings
  and moves to guitar keeps nothing, while a guitarist picking up a second
  guitar keeps one.

Not to be confused with: a transition comment, which is what the band
wrote about that gap, and with a bar moving from one status to the next,
which the routes comment also calls a transition.

## Transition comment

A note the band leaves about going from one specific song into another.

Lives in: `api/src/transitions/`

- Keyed on the ordered pair `(songAId, songBId)` with a unique index, so
  A into B and B into A are two separate rows.
- `comment` is `NOT NULL`, trimmed, 1 to 4 096 characters. `updatedAt` is
  `NOT NULL` and defaults to the write time.

## Upload

A presigned URL that lets the browser put a chart file straight into S3,
or read one back.

Lives in: `api/src/uploads/`

- The content type must be one of `application/pdf`, `image/png`,
  `image/jpeg`, `image/webp`, `image/heic`.
- The declared length is capped at 10 MiB, and a signed URL is valid for
  5 minutes.
- The object key is `chart/<songId>/<randomId>.<extension>`
  (`buildChartObjectKey`). The key is what a song's chart stores, so the
  slice persists everything through `song.chart`.

## Words we do not use

- **musician**, **player**, **bandmate**: the person is a **member**.
- **user**, **account**: nobody has one. There is a shared password and a
  sign-in session.
- **venue** as an entity: the CRM record is a **bar**. `venue` is only the
  free-text column on a concert.
- **gig**, **show**, **date**: the event is a **concert**. **rehearsal**
  is a **practice**. Both are kinds of **session**.
- **track**, **tune**, **number**: the catalogue holds **songs**.
  `recording` appears only inside `musicbrainz.core.ts`, where it is the
  upstream API's word.
- **set**, **programme**, **running order**: the ordered run is a
  **setlist**, and each row in it is a **setlist entry**.
- **skill**, **level**, **rating**, **proficiency**: the measure is
  **mastery** and the number is a **score**.
- **role**, **part**, **station**: what a member holds on a song is an
  **instrument**, and the whole map is a **lineup**. The word *station*
  survives in one comment in `members.schema.ts` and should not spread.
- **prospect**, **contact** as an entity: a **bar** with status `lead`.
- **chord sheet**, **tab**, **score**: the attached music is a **chord
  chart**, and its inline form is **ChordPro**.
- **colour** in identifiers: the column and every field are spelled
  `color`. Prose may spell it either way; code may not.
