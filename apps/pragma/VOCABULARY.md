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

## Member credential

The username and password one member signs in with.

Lives in: `api/src/auth/`

- Keyed on `memberId`, so a member holds one credential or none.
  `username` is lowercase, unique through its own index, and 2 to 64
  characters of letters, digits, dot, dash or underscore.
- `passwordHash` is argon2id. `sessionEpoch` is a whole number that goes
  up by one on every password change, and a cookie carrying an older
  epoch stops verifying, which signs that member out everywhere else.
- Created either through the enrolment window or by another member.
  Deleted with the member, in the same transaction that scrubs them from
  the lineups.

Not to be confused with: the shared password in `app_config`, which now
opens the enrolment route and nothing else.

## Chord chart

The written music for a song, in one of three forms.

Lives in: `api/src/songs/` (the `chart` column), with the file itself
uploaded through `api/src/uploads/`

- Exactly one of three kinds: `chordpro` with inline text up to 64 000
  characters, `pdf` with an S3 object key, or `image` with an S3 object
  key (`chordChartSchema`).
- The column is nullable, and stored as JSON in a TEXT column.

## Composition

A song the band wrote itself, as opposed to one it covers.

Lives in: `api/src/songs/` (the `origin` column), read through
`domain/song-origin.core.ts`

- `origin` is one of `cover`, `original`. The column is nullable with no
  default, because Aurora DSQL cannot add a `NOT NULL` column after the
  table exists, so a row written before the column reads as `cover`
  through `resolveSongOrigin`.
- A composition is not a separate record: it is a song, so it carries the
  same chord chart, the same default lineup, the same three note fields
  and the same mastery scores, and it enters a setlist the same way.
  `selectCompositions` is the only thing that separates the two.
- The compositions screen reads those fields and adds the tasks pointing
  at that song; the catalogue screen is where a composition is edited.

Not to be confused with: the **song**, which is the record itself. Every
composition is a song; the word names which kind.

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
- An entry with no energy anywhere draws its bar in the muted palette,
  filled to `ENERGY_DEFAULT`, which is 5
  (`site/src/components/organisms/setlist-entry-energy.core.ts`). The bar
  is ten segments, one per level, each carrying its own number, which a
  thumb taps or slides along; the value is the last number still filled,
  so the row shows it nowhere else
  (`site/src/components/atoms/EnergyBar.tsx`).

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

## Passkey

A credential held by a member's own device, which signs them in without
a password.

Lives in: `api/src/auth/` (`member_passkey`), verified through
`passkey.adapter.ts`

- Stores the credential id, the public key as `bytea`, the signature
  counter and a label the member typed. The credential id is unique.
- It is an alternative to the password, not a second factor: a member
  signs in with either. The password stays as the way back when a device
  is lost.
- The challenge of a registration or an assertion lives one row in
  `webauthn_challenge` for two minutes, because the options call and the
  verify call are two Lambda invocations sharing no memory.

## Release

The MusicBrainz release a song's recording was imported from, which is
what Cover Art Archive serves artwork by.

Lives in: `api/src/songs/` (the `release_id` column), read by
`site/src/lib/cover-art.utils.ts`

- Distinct from the **recording**, which is what `mbid` holds. One
  recording appears on many releases; one release has one front cover.
- Nullable, because Aurora DSQL cannot add a `NOT NULL` column after the
  table exists, and because a song typed in by hand names no release.
- A song with no release, or one whose artwork Cover Art Archive does not
  have, renders a tile carrying the song's initials instead. Both cases
  are ordinary, not faults.
- Most confused with **album**, which is the release's *title* as text
  and is what the interface prints; the release is the identifier the
  cover is fetched by.

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
- Deleting a session detaches the setlists it carried and keeps them
  (`deleteSessionWithCascade`). Another session may be playing the same
  one, and the setlists index holds it either way.

Not to be confused with: a sign-in session, which is a browser cookie and
has nothing to do with a date in the calendar.

## Setlist

A named, ordered run of songs. It exists on its own, and any number of
sessions can carry it: a rehearsal works through several, and the set
prepared in a rehearsal is the same one played at the concert.

Lives in: `api/src/setlists/`

- The row holds `id` and `name` only. `name` is `NOT NULL` and defaults
  to the empty string, because a set is often written in a hurry and
  named afterwards.
- The physical table is `setlist_sheet`. The original `setlist` table
  declared `session_id` `NOT NULL UNIQUE`, and Aurora DSQL accepts
  neither `DROP COLUMN` nor `DROP CONSTRAINT`, so one setlist per
  session could not be relaxed in place; `0003_setlists_across_sessions.sql`
  moved the rows and left the old table unread.
- `createSetlist` writes the setlist, and the link when the caller names
  a session, in one transaction. Its only refusal is `session-not-found`.

## Session setlist link

Which sessions carry which setlist, and in what order within a session.

Lives in: `api/src/setlists/`

- `session_setlist` holds `session_id`, `setlist_id` and `position`, keyed
  on the first two, so one pair is stored once however many times it is
  attached.
- A setlist joining a session lands one past the highest position already
  taken, so the order the band wrote survives.

## Setlist status

Whether a setlist is being voted on or is a running order.

Lives in: `api/src/setlists/` (the `status` column), resolved by
`resolveSetlistStatus`

- Exactly two values: `voting` and `locked`. The column is nullable with
  no default, because Aurora DSQL cannot add a `NOT NULL` column after
  the table exists, so a row written before the column reads as `locked`.
- `targetSongCount` is how many songs the band wants out of the vote. It
  may be null, and then it reads as 15.
- Closing a vote writes the entries and moves the status to `locked`.
  Reopening moves it back and keeps every vote.

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

Proof that this browser is a named member.

Lives in: `api/src/auth/`

- One `app_config` row, keyed `id = 1`, still holds the HMAC key that
  signs cookies, and a password hash the enrolment route alone reads.
- The cookie is named `pragma_session` and is `payload.signature`, where
  the payload carries the member id, that member's session epoch, and the
  issue and expiry times. It lasts 30 days.
- The gate reads the cookie and the credential behind it: only the second
  read can see a password change.
- Rotating the shared password mints a fresh HMAC key, so every member's
  cookie stops verifying.
- Login attempts are counted per hashed client IP and rate limited.
- Every domain router opens its chain with `requireMemberSession`.

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

## Task

Something one member owes the band, with an optional date and an optional
composition it is about.

Lives in: `api/src/tasks/`

- `title` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `todo`, `doing`, `done` (`TASK_STATUSES` in
  `domain/task-status.core.ts`). Every status but `done` counts as open.
- `assigneeId` and `songId` are both nullable, and neither carries a
  foreign key, because DSQL has none. The service checks the member and
  the song exist before the write; deleting a member nulls the assignee
  out and deleting a song nulls the link out, in the same transaction
  that deletes the row.
- The list comes back ordered by what is most urgent: in progress first,
  then waiting, then done; within a status, by the nearest due date, with
  a task carrying no date behind every dated one; then by title
  (`compareTasksByUrgency`).
- The tasks screen draws one column per member, in the order the members
  come back, and adds an unclaimed column only when something is
  unassigned.

Not to be confused with: a **setlist entry**, which is a decision about
one song for one night rather than work owed by a person.

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

## Vote

What one member gives one song inside one setlist being voted on.

Lives in: `api/src/setlists/` (`setlist_vote`)

- Keyed on `(setlistId, memberId, songId)`, so a member holds one score
  per song per setlist. `points` is a whole number from 0 to 3, and a
  score of 0 deletes the row rather than storing it.
- A member's budget is three points per targeted song. Unspent points are
  simply not counted; nothing forces a member to spend them.
- Deleted with the member who cast it and with the song it names.

## Vote budget

How many points one member still has to spend in one vote.

Lives in: `api/src/setlists/voting.core.ts`

- `total` is `targetSongCount × 3`, `spent` is the sum of that member's
  votes, and `remaining` is the difference.
- A score is refused as `budget-exhausted` when it would exceed what is
  left, counting the points the same song already holds as free again.

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
- **user**: the person is a **member**. **account** is allowed as everyday
  prose for a **member credential**, which is the word identifiers use.
- **admin**, **role**, **permission**: every member can do everything.
- **venue** as an entity: the CRM record is a **bar**. `venue` is only the
  free-text column on a concert.
- **gig**, **show**, **date**: the event is a **concert**. **rehearsal**
  is a **practice**. Both are kinds of **session**.
- **track**, **tune**, **number**: the catalogue holds **songs**.
  `recording` appears only inside `musicbrainz.core.ts`, where it is the
  upstream API's word.
- **set**, **programme**, **running order**: the ordered run is a
  **setlist**, and each row in it is a **setlist entry**.
- **ballot**, **poll**, **election**, **scrutin**: a setlist in its
  `voting` status carries **votes**, each worth **points**.
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
