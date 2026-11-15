# Invariants of pragma, in `domain`

The rules the terms of [the vocabulary](../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Instrument family

- Exactly four values: `harmonic`, `percussive`, `vocal`, `other`.
- `other` is the default (`DEFAULT_INSTRUMENT_FAMILY`).
- A harmonic instrument carries chords. A percussive or a vocal one covers
  a gap without holding harmony, which is why the transition rule ranks
  them behind.

Held by: `domain/transition.core.test.ts` › names the percussive and vocal keepers as support, behind the harmonic ones
Held by: `domain/transition.core.test.ts` › leaves an instrument of the other family out of both lists

## Lineup

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
- A lineup says who holds what on one song. Which instruments a member
  plays at all is the `member_instrument` link. A member has no main
  instrument: the link's `is_primary` column stays in the database,
  because Aurora DSQL refuses `DROP COLUMN`, and nothing reads or writes
  it.

Held by: `domain/lineup.core.test.ts` › lifts a single instrument id written before one member could hold two
Held by: `domain/lineup.core.test.ts` › keeps default members not mentioned in the override
Held by: `domain/lineup.core.test.ts` › answers one pair per instrument held
Held by: `api/src/members/members.controller.test.ts` › scrubs the member from every song default lineup and setlist entry override on delete

## Derived read root

- A slice's row lists every slice its services and repositories import,
  except an import used only by an assistant **tool**. A write that cascades
  into another slice, such as deleting a song, puts the writer in the row of
  the slice it cascades into.
- Expanded transitively, so a read hears what its own sources aggregate.

Held by: `api/src/realtime/derived-read-roots.test.ts` › lists in a slice’s row every slice its services and repositories read
Held by: `api/src/realtime/derived-read-roots.test.ts` › lists the writer in the row of every slice a write cascades into

## Stale message

- Carries what was written, never which queries to refresh; the site decides
  that from its **query read roots**.
- A written root the tab does not know is read as `all`.

Held by: `site/src/lib/live-invalidation.core.test.ts` › reads a root this tab does not know as everything, so a newer API is never missed

## Written root

- Read off the path of a 2xx write. A write that changes no band data another
  member reads (sign-in, passkeys, password, push, uploads) announces
  nothing; every other write route must name a written root.
- A write through an assistant **tool** announces the roots of the write
  routes that tool declares.

Held by: `api/src/realtime/stale-scope-coverage.test.ts` › decides every write route, so a new slice cannot ship without saying what it writes
Held by: `api/src/mcp/mcp-stale-scope.test.ts` › sends the roots a writing tool’s routes touch, not everything

## Read batch

- Holds 1 to 10 reads (`MOST_READS_PER_BATCH`, the database pool's default
  size). Each read is a path under `/api/` and the headers of
  `PRAGMA_REQUEST_HEADERS` it needs. A batch never holds itself, a path that
  climbs out of `/api/`, or a write.
- Each read runs through the whole app as a `GET` with the batch's cookie,
  so the session gate, validation and controllers answer it as they answer
  a lone read.
- Answers `200` with one status, content type and body per read, in order.
  One read that fails or throws fails only its own answer.
- A malformed batch answers `400` `read-batch-invalid` and runs nothing.
- In the tab, the reads of one task form one group. A group of one leaves
  as a plain `GET`, and at most two read requests are in flight
  (`MOST_READS_IN_FLIGHT`). Writes never join a group.
- The tab retries a read once, never a query. When a request is refused
  with `429` or a `5xx`, or the network drops, its reads leave again
  together one second later. A read that answered `429` or a `5xx` inside an
  answered batch is retried the same way. Queries keep `retry: 0`.

Held by: `api/src/read-batch/read-batch.controller.test.ts` › fails only the gated read when the batch carries no cookie
Held by: `api/src/read-batch/read-batch.controller.test.ts` › answers 500 for a read that throws while the others answer 200
Held by: `site/src/lib/read-batch.adapter.test.ts` › hold a third group until one of the two answers
Held by: `site/src/lib/queries/streaks.queries.test.tsx` › reports a failed read once, after the app client has spent its retry

## Flame

- A day is the `Europe/Paris` calendar day. It is active for a member when
  that member has a **presence** that day (opened the app), or when a
  **session** of either kind, a practice or a concert, is dated that day.
  Takes and mastery scores do not count.
- The personal flame walks back from today. Today never breaks it: while
  today is not active, the walk starts from yesterday. An active day adds 1.
- A missed day spends one joker of its Monday-to-Sunday week, and each week
  has 3. A gap is bridged whole or not at all, so jokers are spent only on a
  gap with an active day on its older side; while today is open, today
  stands as the newer side. A day bridged by a joker adds nothing.
- Jokers left this week is 3 minus the jokers the walk spent since Monday.
- The band flame counts a day when any current member is active, and has no
  joker: its first missed day ends it. A deleted member's presences drop
  out.
- Not stored: it is computed on every read from the last 400 days of
  presences and sessions (`STREAK_LOOKBACK_DAYS`).
- Shown on Home as two chips that open the streak sheet: the member's own
  flame and the band's. Both are drawn marks, not `Icon` glyphs. The
  personal flame is the `BlazeMark`, one flame in three layers with sparks.
  The band flame is the `BonfireMark`, three tilted flames. Each reads a
  tone. `counted` (today counts) layers `flame-deep`, `flame-mid` and
  `flame-core` under a `flame-glow` drop shadow, and the bonfire flickers
  unless motion is reduced. `open` (today not yet) is `accent-soft` with an
  `accent` outline and a faint core. `out` (0 days) is an `ink-faint`
  outline with no spark.

Held by: `site/src/routes/home/HomePage.test.tsx` › puts both flames on the title line, and a tap on either opens the streak sheet
Held by: `domain/practice-flame.core.test.ts` › keeps a run ending yesterday alive while today is still open
Held by: `domain/practice-flame.core.test.ts` › bridges a gap that ends yesterday while today is open (Q-A)
Held by: `domain/practice-flame.core.test.ts` › bridges a gap that crosses a Monday with each week’s own jokers
Held by: `domain/practice-flame.core.test.ts` › ends the flame on a fourth missed day in one week
Held by: `domain/practice-flame.core.test.ts` › spends no joker on a gap it cannot bridge whole
Held by: `domain/practice-flame.core.test.ts` › counts jokers left this week from the jokers spent since Monday
Held by: `domain/practice-flame.core.test.ts` › ends the band flame on its first missed day, with no joker
Held by: `api/src/streaks/streaks.core.test.ts` › lights a member’s day and the band’s from the member opening the app
Held by: `api/src/streaks/streaks.core.test.ts` › ignores the presence of a member who was deleted
Held by: `api/src/streaks/streaks.controller.test.ts` › counts every member’s day when a session is dated today

## Tonality

- Derived from a ChordPro source by reading the first and the last
  recognisable chord, and reported as root plus quality, for example `C`,
  `F#m`, `Dmaj7`. A slash chord reports only its root.
- Ambiguous or missing input gives null, which the form shows as an empty
  field the reader can fill in by hand.
- Stored as `tonalityStart` and `tonalityEnd`, both nullable, up to 16
  characters.

Held by: `domain/tonality.core.test.ts` › reports the root only for slash chords
Held by: `domain/tonality.core.test.ts` › returns null for both ends when nothing parses as a chord

## Transition

- The verdict is `covered` when at least one member keeps a harmonic
  instrument across both songs, and `risky` otherwise.
- Members keeping a percussive or vocal instrument, and no harmonic one,
  are the support carriers, and the view lists them after the harmonic
  carriers.
- The comparison is instrument by instrument, so a drummer who also sings
  and moves to guitar keeps nothing, while a guitarist picking up a second
  guitar keeps one.

Held by: `domain/transition.core.test.ts` › covers the gap when somebody keeps a harmonic instrument across both songs
Held by: `domain/transition.core.test.ts` › calls the transition risky when nobody keeps a harmonic instrument
Held by: `domain/transition.core.test.ts` › treats a member sitting the second song out as keeping nothing
