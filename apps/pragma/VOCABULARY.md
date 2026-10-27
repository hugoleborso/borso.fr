# Vocabulary — pragma

`pragma` is a private progressive web app for one band. It holds the
band's song catalogue, the setlists they play, the practices and concerts
they play them at, and a small CRM of the bars they want to be booked in.
Each member signs in with their own **member credential**, and there are
no roles: every member can read and change everything.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

## Assistant client

An AI assistant that registered itself with pragma's authorization server:
Claude Code, Mistral Vibe, claude.ai or Le Chat.

Lives in: `api/src/oauth/` (`assistant_client`)

- Registers itself through `POST /oauth/register` (RFC 7591) and is always
  a public client: it holds no secret and proves itself with PKCE `S256`.
- Its redirect addresses are `https://`, or a loopback `http://` address
  (`localhost`, `127.0.0.1`, `[::1]`) that matches on any port, because
  each terminal client picks its own callback port (RFC 8252).
- One address may register ten clients an hour; the eleventh is refused.
- A client older than 30 days that holds no **assistant grant** is deleted
  the next time any client registers, so the open endpoint cannot fill the
  table and nothing runs on a schedule.
- Kept out of every preview's copy of production and out of the read-only
  reader's reach, like the two tables below.

Held by: `api/src/oauth/oauth.controller.test.ts` › registers the clients Claude Code and Vibe describe, and refuses any other redirect address
Held by: `api/src/oauth/oauth.controller.test.ts` › refuses the eleventh registration in an hour from one address and reports it
Held by: `api/src/oauth/oauth.controller.test.ts` › sweeps clients older than 30 days that hold no grant when another registers

Not to be confused with: an **assistant grant**, which is one member
allowing one client; a client with no grant can do nothing.

## Assistant grant

One member's permission for one **assistant client** to act on pragma as
that member.

Lives in: `api/src/oauth/` (`assistant_grant`, `assistant_authorization_code`)

- Created when the member allows the client on the consent page and the
  client exchanges the one-use authorization code, which lives 60 seconds
  and is bound to the client, its redirect address and its PKCE challenge.
- Holds an access token (one hour) and a refresh token (90 days), stored as
  SHA-256 hashes only. Every refresh rotates both; the refresh token rotated
  away last is kept, and presenting it again revokes the whole grant.
- Carries the member's session epoch from when it was issued, the same
  number a **sign-in session** carries, so a password change ends every
  grant the way it ends every cookie.
- Revoked from the Account page, by the client through `POST /oauth/revoke`,
  or by deleting the member, which deletes the member's grants and pending
  codes in the same transaction.

Held by: `api/src/oauth/oauth.controller.test.ts` › runs the whole flow: consent, code, tokens, and the code cannot be spent twice
Held by: `api/src/oauth/oauth.controller.test.ts` › rotates the refresh token, and a replay of the old one revokes the grant and is reported
Held by: `api/src/oauth/oauth.controller.test.ts` › ends every grant of a member who changes password
Held by: `api/src/oauth/oauth.controller.test.ts` › deletes the grants and pending codes of a deleted member

Not to be confused with: a **sign-in session**, which is a browser's
cookie; a grant is what a terminal or a chat assistant holds instead.

## Audience suggestion

The record that a song entered a concert's pool because someone in the
room asked for it.

Lives in: `api/src/audience/`

- `audience_suggestion` holds `session_id`, `song_id`, `ballot_token` and
  `suggested_at`. It anchors on the concert, never on a setlist.
- Only a picked search result is accepted: `suggestionCreateSchema` is
  `.strict()` and takes a Deezer `trackId` and nothing else, so no free
  text the band has not seen can ever be displayed.
- The track is read from Deezer first. One a catalogue song already links
  resolves to that song; any other creates a song with status `idea`
  (`acceptSuggestion` through `resolveCatalogueSongForTrack`).
- A song already in a manual setlist attached to tonight is refused: the
  band is playing it anyway.

Held by: `api/src/audience/audience.schema.test.ts` › carry no setlist identifier, because a round anchors on the concert
Held by: `api/src/audience/audience.controller.test.ts` › refuses a suggestion body carrying free text beside the picked result
Held by: `api/src/audience/audience.controller.test.ts` › resolves a suggestion naming a catalogue song onto that song, adding none
Held by: `api/src/audience/audience.controller.test.ts` › imports a suggestion naming an unknown track as one idea carrying the provider columns
Held by: `api/src/audience/audience.controller.test.ts` › refuses a suggestion naming a song the band already planned for tonight

Not to be confused with: a vote, which is a ballot's tap on a song already
in the pool.

## Bar

A venue the band wants to play in, and the record of where the
conversation with it has got to.

Lives in: `api/src/bars/`

- `name` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `lead`, `contacted`, `booked`, `played`, `cold`
  (`BAR_STATUSES` in `domain/bar-profile.core.ts`), and the bars page groups the rows
  into one kanban column per status.
- `ownerMemberId` names the one band member carrying the conversation
  with that venue, and may be null: a bar nobody has taken on is a normal
  bar. Deleting a member clears it on every bar they owned
  (`unassignBarsOwnedByMember` in `api/src/members/members.repository.ts`)
  and deletes no bar.
- `concertMood` is how big a night the bar is up for: `chill`, `gig` or
  `ticketed` (`CONCERT_MOODS` in `domain/bar-profile.core.ts`). It may be null,
  which means nobody has judged the venue yet and is not a fourth mood.
- `availableSupport` is what the bar lends the band, any number of
  `pa-system`, `lights` and `sound-engineer`, held as JSON in a TEXT
  column. An empty list and a null column both mean it lends nothing.
- `lastInteractionAt` may be null. A bar is stale when its last
  interaction is older than the threshold, and a bar with no recorded
  interaction is stale too (`isStale` in `domain/bar-staleness.core.ts`).
  The default threshold is 60 days.

A bar is added either by hand or from a **place**, the OpenStreetMap
record a member picked in the search (`mapNominatimToBarSearchHits` in
`api/src/bars/bar-search.core.ts`). A place fills the name, the city and
the phone number of a new bar's form (`buildBarFormFromPlace` in
`site/src/routes/bars/bar-form.core.ts`) and is never stored as such.

Held by: `api/src/bars/bars.controller.test.ts` › persists every spec status value
Held by: `api/src/bars/bars.controller.test.ts` › carries the owner through create and clears it when that member goes
Held by: `api/src/bars/bars.controller.test.ts` › defaults a bar nobody qualified to no mood and no support
Held by: `domain/bar-staleness.core.test.ts` › treats null lastInteractionAt as stale (no interaction ever logged)
Held by: `domain/bar-staleness.core.test.ts` › returns true past the default threshold (61 days)

Not to be confused with: the `venue` column on a concert, which is free
text typed for that one date.

## Ballot

One browser's participation in one concert, identified by an opaque token
the server mints.

Lives in: `api/src/audience/`

- A ballot is not a person and carries nothing about one. The token is
  random bytes the server encodes (`mintBallotToken`), never derived from
  an address, a header or a device.
- The browser keeps it in local storage under `pragma.ballot.<sessionId>`,
  so a visitor at a second concert is a second ballot
  (`site/src/lib/ballot-token.adapter.ts`).
- A ballot is the second column of `audience_vote`'s primary key, so one
  ballot holds at most one vote per song per round.
- Clearing local storage yields a fresh ballot with no votes. Nobody's
  identity is checked in a bar, and nothing here prevents it.

Held by: `api/src/audience/ballot-token.utils.test.ts` › reads two different byte sequences back as two different ballots
Held by: `site/src/lib/ballot-token.adapter.test.ts` › is keyed by concert, so a visitor at a second concert is a second ballot
Held by: `api/src/audience/audience.schema.test.ts` › identify a vote by the round, the ballot and the song, so one ballot votes once per song

Not to be confused with: a member credential, which signs a band member in
and reaches gated routes a ballot never does.

## Member credential

The username and password one member signs in with.

Lives in: `api/src/auth/`

- Keyed on `memberId`, so a member holds one credential or none.
  `username` is lowercase, unique through its own index
  (`member_credential_username_idx`), and 2 to 64 characters of letters,
  digits, dot, dash or underscore, starting with a letter or a digit.
- `passwordHash` is argon2id. `sessionEpoch` is a whole number that goes
  up by one on every password change and every recovery
  (`nextSessionEpoch`), and a cookie carrying an older epoch stops
  verifying, which signs that member out everywhere else.
- No route creates one. `createCredentialForMember` is reached only from
  the test-seed route and the test helpers, so a new member needs an
  operator. Deleted with the member, in the same transaction that scrubs
  them from the lineups (`deleteMemberWithLinks`).
- Recovered rather than recreated: a member who forgot their password
  proves the shared password on the recovery route, and the same row is
  updated in place, which is why their passkeys survive it.

Held by: `api/src/auth/credentials.schema.test.ts` › lowercases and trims a username
Held by: `api/src/auth/auth.controller.test.ts` › no longer serves the enrolment endpoints
Held by: `api/src/auth/auth.controller.test.ts` › changes a password, keeps that member signed in here and drops their other browsers
Held by: `api/src/auth/auth.controller.test.ts` › drops the sessions the member had open elsewhere when they recover
Held by: `api/src/auth/auth.controller.test.ts` › keeps the member passkeys alive through a recovery
Held by: `api/src/auth/credentials.repository.test.ts` › deletes a member credential with the member it belongs to

Not to be confused with: the shared password in `app_config`, which now
opens the recovery route and nothing else.

## Outreach template

The pitch the band sends a bar to ask for a date, held once for the whole
application and edited from the bars page.

Lives in: `api/src/outreach/`

- One row, keyed on `OUTREACH_TEMPLATE_ROW_ID`, the way `app_config` is.
  No row means nobody has edited the pitch and the front end renders the
  translated default.
- The body carries three placeholders, `{{bar}}`, `{{phone}}` and
  `{{email}}`, replaced by `renderOutreachMessage` in
  `site/src/routes/bars/outreach-message.core.ts` when a member copies the
  message for one bar. The phone number and the address come from the
  **member** copying it.

Held by: `api/src/outreach/outreach.controller.test.ts` › overwrites the single template row rather than adding a second one
Held by: `site/src/routes/bars/outreach-message.core.test.ts` › falls back when nothing was ever saved
Held by: `site/src/routes/bars/outreach-message.core.test.ts` › names the bar and signs with the member contact details

Not to be confused with: a bar's `notes`, which are what happened with
that one venue.

## Calendar feed

A member's secret iCal address, which lets the API read that member's
calendar.

Lives in: `api/src/calendar-feeds/`

- One per member at most, keyed on `memberId` in its own table,
  `member_calendar_feed`, so no read of `member` carries it (ADR-0037).
- Accepted only as `https`, or `webcal` rewritten to `https`, on port
  443, with a public host name and no user info (`judgeFeedAddress`).
  The same check runs again on every redirect when the feed is read.
- Written and removed through `/api/me/calendar-feed`. No route ever
  returns it: the API answers `connected` or `absent`, and a feed that
  failed is logged with the member id and the status, never the address.
- Left out of every preview clone through `tableBlocklist`, and deleted
  with its member.

Held by: `api/src/calendar-feeds/feed-address.core.test.ts` › turns a webcal address into https
Held by: `api/src/calendar-feeds/calendar-feed.adapter.test.ts` › refuses a redirect to the Lambda runtime API
Held by: `api/src/free-slots/free-slots.controller.test.ts` › saves an address, answers only "connected", and never sends the address back
Held by: `api/src/free-slots/free-slots.controller.test.ts` › deletes the address with its member

Not to be confused with: a **busy interval**, which is what the API keeps
from the feed for one request and never stores.

## Busy interval

A span of time during which one member's calendar says they are taken.

Lives in: `api/src/calendar-feeds/`

- Read from a calendar feed by `readBusyIntervals` in `ics.core.ts`,
  recurring events expanded, for the request that asked and never stored.
- An event marked free (`TRANSP:TRANSPARENT`) or cancelled is not busy.
  An all-day event is busy for the whole Paris day.
- A named IANA zone is read in that zone even without a `VTIMEZONE`
  block. A floating time, or a zone name that is not IANA, is read as
  Europe/Paris time.

Held by: `api/src/calendar-feeds/ics.core.test.ts` › leaves out an event marked free, and a cancelled one
Held by: `api/src/calendar-feeds/ics.core.test.ts` › makes an all-day event busy for the whole Paris day
Held by: `api/src/calendar-feeds/ics.core.test.ts` › reads a floating time, or a zone name that is not IANA, as Paris time

Not to be confused with: a **session**, which is the band's own
commitment, not one member's.

## Chord chart

The written music for a song, in one of three forms.

Lives in: `api/src/songs/` (the `chart` column), with the file itself
uploaded through `api/src/uploads/`

- Exactly one of three kinds: `chordpro` with inline text up to 64 000
  characters, `pdf` with an S3 object key, or `image` with an S3 object
  key (`chordChartSchema`).
- The column is nullable, and stored as JSON in a TEXT column.

Held by: `api/src/songs/songs.controller.test.ts` › persists each of the three chord-chart variants

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

Held by: `domain/song-origin.core.test.ts` › reads a row written before the column existed as a cover
Held by: `domain/song-origin.core.test.ts` › keeps only the songs the band wrote

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
  (`selectUpcomingConcerts` in `domain/upcoming-concerts.core.ts`).

Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a field it does not own, rather than dropping it silently
Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a capacity outside what a room can hold
Held by: `domain/upcoming-concerts.core.test.ts` › treats a concert starting exactly now as already started

Not to be confused with: a practice, which is the other `kind` of session.

## Energy

How much the room lifts during a song, on a scale of 1 to 10.

Lives in: `api/src/songs/` (`baseEnergy`) and `api/src/setlists/`
(`energy` on an entry)

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

## Free slot

A span of at least two hours, inside the search windows, when no member
with a readable calendar feed is busy.

Lives in: `api/src/free-slots/`

- Searched over 28 days, from 18:00 to midnight on weekdays and from
  10:00 to midnight at weekends, Europe/Paris (`buildSearchWindows`).
- Starts on the next quarter hour, and is shown whole, not cut to two
  hours (`selectFreeSlots`).
- A member without a feed, with a feed the provider no longer serves, or
  with a feed that could not be read is left out of the calculation and
  listed with the reason.
- Booking one creates a practice whose `origin` is `free_slot`.

Held by: `api/src/free-slots/free-slots.core.test.ts` › opens at 18:00 on weekdays and 10:00 at weekends, until midnight, Paris time
Held by: `api/src/free-slots/free-slots.core.test.ts` › keeps free time of at least two hours, starting on a quarter hour
Held by: `api/src/free-slots/free-slots.controller.test.ts` › excludes a member whose address is gone, and one whose provider is down
Held by: `api/src/sessions/sessions.core.test.ts` › keeps only the prepared concert and the origin for a practice

Not to be confused with: a **practice**, which only exists once someone
books the slot.

## Improvement

Something the band wants changed in this application, written down by the
member it annoys.

Lives in: `api/src/improvements/`

- `title` is `NOT NULL`, trimmed, 1 to 200 characters. `details` is
  `NOT NULL` and defaults to the empty string.
- `status` is one of `idea`, `planned`, `building`, `shipped`, `declined`
  (`IMPROVEMENT_STATUSES`, declared in `domain/improvement.core.ts` and
  again in `improvements.schema.ts`), and the backlog is ranked in that
  order, then by vote count, then oldest first (`rankImprovements` in
  `domain/improvement.core.ts`).
- `authorMemberId` is the member who filed it, taken from the session
  rather than from the request body, and `createdAt` is written by the
  application.
- Deleting one deletes its improvement votes in the same call.

Held by: `api/src/improvements/improvements.controller.test.ts` › files a new improvement as an idea authored by the signed-in member
Held by: `api/src/improvements/improvements.controller.test.ts` › ranks the open statuses first and the most voted first inside a status
Held by: `api/src/improvements/improvements.controller.test.ts` › deletes an improvement with its votes and answers 404 the second time

Not to be confused with: a song's notes (`structureNotes`, `gimmickNotes`,
`notes`), which are about the music rather than about the tool that tracks it.

## Improvement vote

One member saying they want one improvement.

Lives in: `api/src/improvements/` (`improvement_vote`)

- Keyed on `(improvementId, memberId)`, so a member either wants an
  improvement or does not. There are no points and no budget: casting the
  same vote twice changes nothing but the `castAt` stamp.
- The list endpoint reads every vote once and folds it into a count plus a
  flag for the reader (`summariseVotes` in `improvements.core.ts`).

Held by: `api/src/improvements/improvements.controller.test.ts` › counts one vote per member, however many times it is cast

Not to be confused with: a **vote**, which is the scored, budgeted thing a
member spends on songs inside a setlist.

## Instrument

Something a member can hold on a song.

Lives in: `api/src/instruments/`

- `name` is `NOT NULL`, trimmed, 1 to 64 characters.
- `family` is nullable in the database. Every write sets both `family` and
  the older `is_harmonic` boolean from the same value (`encodeFamily`),
  and every read resolves the two through `resolveInstrumentFamily`, which
  falls back to the boolean for rows written before the column existed.
- `icon` names one of the eighteen glyphs the application ships and is nullable
  in the database, like `family`. Reads resolve it through
  `resolveInstrumentIcon`, which falls back to `music`. It is a stored
  value such as `mic-vocal`, never the camelCase key of the icon registry.
- `position` is where the instrument sits in the fixed column order, also
  nullable, resolved through `resolveInstrumentPosition`. A new instrument
  takes the rank of its family (`defaultPositionForFamily`) rather than the
  head of the order.
- The list is sorted by `position`, then by `name` to break a tie. It is
  never sorted by name alone, because an alphabetical column hides an
  instrument changing hands, which is the whole point of the column.
- Deleting an instrument removes its row and then every `member_instrument`
  link naming it, in one retried transaction (`deleteInstrumentWithLinks`).
- A reorder names every instrument, each once, or is refused as `stale`
  (`isReorderOfTheSameIds`). It claims every named instrument row, reads
  the ids again and writes every position in one transaction, which runs
  again when Aurora DSQL aborts it at commit
  (`runInOneInstrumentTransaction`). An instrument deleted before the claim
  reaches it makes the reorder stale and moves nothing; one created at the
  same moment keeps the position it was created with.

Held by: `api/src/instruments/instruments.controller.test.ts` › orders the list by family rather than by name, which is what the column reads
Held by: `api/src/instruments/instrument-players.core.test.ts` › breaks a tie on the name, so two instruments at one position still settle
Held by: `domain/instrument.core.test.ts` › falls back to the boolean when the column was never written
Held by: `domain/instrument.core.test.ts` › falls back to the generic glyph when the column was never written
Held by: `api/src/members/members.controller.test.ts` › removes the links of a deleted instrument from every member who played it
Held by: `api/src/instruments/instruments.controller.test.ts` › refuses a reorder that does not name every instrument, with 409
Held by: `api/src/instruments/instruments.controller.test.ts` › refuses a reorder naming an instrument deleted while it was being written, and moves nothing
Held by: `api/src/instruments/instruments.controller.test.ts` › reorders once when the first commit loses a conflict on the claimed instruments

## Instrument family

What kind of thing an instrument is, which is the only property the
transition rule reads.

Lives in: `domain/instrument.core.ts`

- Exactly four values: `harmonic`, `percussive`, `vocal`, `other`.
- `other` is the default (`DEFAULT_INSTRUMENT_FAMILY`).
- A harmonic instrument carries chords. A percussive or a vocal one covers
  a gap without holding harmony, which is why the transition rule ranks
  them behind.

Held by: `domain/transition.core.test.ts` › names the percussive and vocal keepers as support, behind the harmonic ones
Held by: `domain/transition.core.test.ts` › leaves an instrument of the other family out of both lists

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
- A lineup says who holds what on one song. Which instruments a member
  plays at all is the `member_instrument` link, and that link carries
  `is_primary`: whether this is one of that member's main instruments.
  A member form that saves without naming primacy keeps what was there
  (`decidePrimaryInstrumentIds`).

Held by: `domain/lineup.core.test.ts` › lifts a single instrument id written before one member could hold two
Held by: `domain/lineup.core.test.ts` › keeps default members not mentioned in the override
Held by: `domain/lineup.core.test.ts` › answers one pair per instrument held
Held by: `api/src/members/members.controller.test.ts` › scrubs the member from every song default lineup and setlist entry override on delete
Held by: `api/src/members/members.controller.test.ts` › keeps a primacy the member form never sends, so saving a member does not empty the column

## Lineup slot

One icon in the lineup a setlist card draws: one instrument held by one
member on that song, tinted with that member's colour.

Lives in: `site/src/components/molecules/`

- A song draws one slot per instrument held, so two singers draw two
  microphones. An instrument nobody holds on that song draws nothing;
  there is no empty slot.
- Slots are ordered by the instrument's `position`, then by its name, then
  by member order for a shared instrument (`buildLineupColumn`).
- The whole lineup is drawn when the row has room. What the width drops
  is counted as `+N`, whose title names the instruments that fell off.
  The column yields; the song title never truncates to make room for it.

Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › draws one slot per instrument held, ordered by the stored position, never by name
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › leaves out every instrument nobody holds on this song
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › draws a slot per holder when two members share one instrument, in member order
Held by: `site/src/components/molecules/lineup-slots.core.test.ts` › counts the slots the width dropped and names them for the tooltip

Not to be confused with: **Lineup**, which is the record a slot is drawn
from.

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

Held by: `api/src/mastery/mastery.controller.test.ts` › respects override score=0 as a legitimate "ne joue pas" — does not duplicate
Held by: `api/src/songs/songs.controller.test.ts` › cascades the mastery overrides on song delete

## Mastery score change

One row of mastery history: the score a member gave themselves on one
instrument for one song, and when.

Lives in: `api/src/mastery/` (the `mastery_score_change` table)

- Appended in the same transaction as every write of a per-song score, and
  never updated. Removing a per-song score appends the default it falls
  back to, when there is one.
- A change to a default score appends nothing, because a default is not
  about any one song.
- Deleted with its song and with its member.

Held by: `api/src/mastery/mastery.controller.test.ts` › appends one history row per override write and none for a default write
Held by: `api/src/mastery/mastery.controller.test.ts` › writes no history row when deleting an override with no default behind it
Held by: `api/src/studies/studies.controller.test.ts` › removes studies and score history with the song
Held by: `api/src/studies/studies.controller.test.ts` › removes studies and score history with the member

Not to be confused with: the per-song score itself, which holds only the
latest value.

## Member

One person in the band.

Lives in: `api/src/members/`

- `firstName` is `NOT NULL`, trimmed, 1 to 64 characters. `color` is
  `NOT NULL` and must match a hex pattern. `avatarS3Key` may be null.
- `phone` and `email` are the member's own contact details, both nullable,
  filled in on the account page and used to sign the outreach message.
- A member created without a colour is given palette slot N of five
  (coral, teal, mustard, plum, sage), wrapping round
  (`pickNextPaletteHex`).
- `member_instrument` links a member to the instruments they can play. Its
  primary key is `(memberId, instrumentId)`, so the pair cannot repeat.
- Assigning instruments replaces the whole set, and is refused when any of
  the ids is unknown (`assignInstrumentsToMember`). The replacement claims
  every named instrument row and then the member row in one retried
  transaction, and writes nothing when a claim finds no row. Deleting a
  member or an instrument removes its row before its `member_instrument`
  links, so no link outlives either end.

Held by: `api/src/members/member-palette.utils.test.ts` › wraps via modulo (5 -> 0)
Held by: `api/src/members/members.controller.test.ts` › rejects hex colors that do not match the pattern
Held by: `api/src/members/members.controller.test.ts` › rejects an assignment that references an unknown instrument
Held by: `api/src/members/members.controller.test.ts` › writes no instrument rows for a member deleted while the assignment was being checked
Held by: `api/src/members/members.controller.test.ts` › leaves no link to an instrument deleted while it was being assigned
Held by: `api/src/members/members.controller.test.ts` › assigns the instruments once when the first commit loses a conflict on the claimed member

Not to be confused with: the member ids inside a lineup, which say who
plays on one song rather than who is in the band.

## Notification preference

One member's toggle for one category of notification.

Lives in: `api/src/notifications/` (`notification_preference`)

- Keyed on `(member_id, category)`. A missing row reads as enabled, so a
  member who turns push on gets every category without a write per
  category.
- Deleted with the member.

Held by: `api/src/notifications/notifications.controller.test.ts` › reads every category as on before the member touches one
Held by: `api/src/notifications/notifications.controller.test.ts` › takes their devices and toggles with them

## Push subscription

One device of one member that accepted notifications.

Lives in: `api/src/notifications/` (`push_subscription`)

- One row per push `endpoint`, unique, so a device that subscribes again
  replaces its row rather than adding one. A member with two devices has
  two rows and is notified on both.
- Kept out of every preview's copy of the production schema, so a preview
  never pushes to the band's phones (ADR-0040).
- Deleted with the member, and when the push service answers that the
  endpoint is gone.

Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one subscription per device, owned by the member who last subscribed it
Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one subscription when a device subscribes twice at the same moment
Held by: `api/src/notifications/notifications.controller.test.ts` › deletes a subscription its push service says is gone, and the write still succeeds
Held by: `api/src/notifications/notifications.controller.test.ts` › takes their devices and toggles with them

## VAPID key pair

The key pair a stage signs every push with, and whose public half a device
subscribes with.

Lives in: `api/src/notifications/` (`vapid_key_pair`)

- One row, always under id 1. The API generates the pair with `web-push`
  the first time push needs it, inserts it with `ON CONFLICT DO NOTHING`
  and reads back what was stored, so two first uses at the same moment
  keep one pair (ADR-0040, revision 2026-10-24).
- Kept out of every preview's copy of the production schema, so a preview
  generates its own pair and never signs as production.
- Replacing the pair would orphan every subscription made with the old
  public key, so nothing in the application rewrites the row.

Held by: `api/src/notifications/notifications.controller.test.ts` › is generated on first use, stored, and given unchanged afterwards
Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one pair when two members ask for the first key at the same moment
Held by: `api/src/notifications/notifications.controller.test.ts` › stores the pair once when its first insert loses a conflict

Not to be confused with: a **push subscription**, which is the device's own
key and address rather than the stage's.

## Offline manifest

The list of URLs the service worker pre-caches so the band can read the
catalogue and the next setlist with no signal.

Lives in: `api/src/sessions/`

- Carries the catalogue list URL, one detail URL per song, and the next
  session's URL with its setlist URL.
- The next session is the earliest one strictly after now, with ties
  broken on the identifier (`buildNextSessionOfflineManifest`).

Held by: `api/src/sessions/offline-manifest.core.test.ts` › treats a session starting exactly now as past, not upcoming
Held by: `api/src/sessions/offline-manifest.core.test.ts` › breaks a date tie on the identifier so the choice is stable

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
  `webauthn_challenge` for two minutes (`CHALLENGE_TTL_MS`), because the
  options call and the verify call are two Lambda invocations sharing no
  memory.

Held by: `api/src/auth/auth.controller.test.ts` › keeps the member passkeys alive through a recovery

## Deezer track

The entry in Deezer's catalogue that a song is linked to. It is what the
search fills in, what the listen dialog opens, and the one identifier a
member can also type by hand on the song form
(`SongDeezerTrackIdField.tsx`).

Lives in: `api/src/songs/` (the `deezer_track_id` column), read by
`site/src/lib/listen-links.utils.ts`

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

The entry in Spotify's catalogue that a song is linked to, resolved from
the ISRC Deezer returned rather than from the song's title.

Lives in: `api/src/songs/` (the `spotify_track_id` column), read by
`site/src/lib/listen-links.utils.ts`

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
  [ADR-0017](../../docs/adr/0017-spotify-track-ids-resolved-by-isrc-at-link-time.md).

Held by: `site/src/routes/catalog/song-draft.core.test.ts` › overwrites the metadata fields and leaves the rest of the draft alone
Held by: `site/src/lib/listen-links.utils.test.ts` › falls back to a search when the song names no track

## Deezer album

The Deezer album a song's track belongs to, which is what Deezer serves
the cover by.

Lives in: `api/src/songs/` (the `deezer_album_id` column), read by
`site/src/lib/cover-art.utils.ts`

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

## Practice

The band playing together with no audience, optionally aimed at a
concert.

Lives in: `api/src/sessions/`

- A row in `session` whose `kind` is `practice`.
- Carries `preparedConcertId`, which may be null, and `origin`, which is
  `free_slot` for a practice booked from a free slot and null otherwise
  (`SESSION_ORIGINS`). Nothing else beyond the shared columns.
- `practiceCreateSchema` is `.strict()`, so a body carrying a concert-only
  key is rejected at the controller.

Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a venue, which belongs to the other kind
Held by: `api/src/sessions/sessions.controller.test.ts` › moves a practice onto another concert it prepares

## Scene view

The full-screen reading of a song's chart, for use on stage.

Lives in: `site/src/routes/catalog/`

- The transpose offset is clamped to -11 to +11 semitones, which is the
  whole range with distinct output, and the font size runs from 16 px to
  48 px in steps of 2 px, starting at 24 px (`scene-view.core.ts`).

Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps below the floor
Held by: `site/src/routes/catalog/scene-view.core.test.ts` › clamps above the ceiling

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
  one, and the setlists index holds it either way. It also keeps the takes
  recorded in it and clears their `session_id`.

Held by: `api/src/sessions/sessions.controller.test.ts` › creates a concert + a practice + lists both newest-first
Held by: `api/src/sessions/sessions.controller.test.ts` › rejects a payload that mixes concert-only with practice-only fields
Held by: `api/src/sessions/sessions.controller.test.ts` › detaches the setlists on session delete, and keeps them
Held by: `api/src/takes/takes.controller.test.ts` › deleting the session keeps its takes and clears their session

Not to be confused with: a sign-in session, which is a browser cookie and
has nothing to do with a date in the calendar.

## Setlist

A named, ordered run of songs. It exists on its own, and any number of
sessions can carry it: a practice works through several, and the setlist
prepared in a practice is the same one played at the concert.

Lives in: `api/src/setlists/`

- The row holds `id`, `name`, `kind`, `status` and `targetSongCount`.
  `name` is `NOT NULL` and defaults
  to the empty string, because a setlist is often written in a hurry and
  named afterwards.
- The physical table is `setlist_sheet`. The original `setlist` table
  declared `session_id` `NOT NULL UNIQUE`, and Aurora DSQL accepts
  neither `DROP COLUMN` nor `DROP CONSTRAINT`, so one setlist per
  session could not be relaxed in place; `0003_setlists_across_sessions.sql`
  moved the rows and left the old table unread.
- `createSetlist` writes the setlist, and the link when the caller names
  a session, in one transaction. Its only refusal is `session-not-found`.
- `kind` is `manual` or `audience_choice` (`resolveSetlistKind` in
  `setlists.core.ts`). The column is nullable in the database because
  Aurora DSQL accepts no `ADD COLUMN ... NOT NULL`, so every read narrows
  a null to `manual`.
- An `audience_choice` setlist is created at the first voting round of a
  concert and refuses `renameSetlist`: its title is the band's promise to
  the room, not an editable field.
- A concert has one `audience_choice` setlist. The setlist is created with
  the concert's id as its own (`selectAudienceChoiceSetlistId`), so the
  primary key refuses a second one when two first rounds open together.
  One created before that rule keeps its random id and is found by its
  link to the concert.

Held by: `api/src/setlists/setlists.controller.test.ts` › refuses to create a setlist on a session that does not exist
Held by: `api/src/setlists/setlists.controller.test.ts` › plays one setlist in two sessions, and lists it under both
Held by: `api/src/setlists/setlists.core.test.ts` › reads a row written before the column existed as manual
Held by: `api/src/audience/audience.controller.test.ts` › creates the audience-choice setlist at the first round and refuses to rename it
Held by: `api/src/audience/audience.controller.test.ts` › creates one audience-choice setlist when two first rounds are opened at the same moment

## Session setlist link

Which sessions carry which setlist, and in what order within a session.

Lives in: `api/src/setlists/`

- `session_setlist` holds `session_id`, `setlist_id` and `position`, keyed
  on the first two, so one pair is stored once however many times it is
  attached.
- A setlist joining a session lands one past the highest position already
  taken, so the order the band wrote survives. Every attach first claims
  the session row in the same retried transaction, so two setlists joining
  one session at the same moment read the highest position one after the
  other and never share it.
- A link joins a setlist and a session that both still exist. Attaching an
  existing setlist claims the setlist row and then the session row, each
  claim reporting whether it found its row, and when either did not the
  attach is refused before anything is written, with the same 404 as for
  an unknown id. Deleting a session or a setlist removes its row before
  its links, so an attach that claimed the row first has its link removed
  with it.

Held by: `api/src/setlists/setlists.controller.test.ts` › carries several setlists on one session, in the order they were attached
Held by: `api/src/setlists/setlists.controller.test.ts` › gives two setlists joining one session at the same moment a position each
Held by: `api/src/setlists/setlists.controller.test.ts` › leaves no link behind when the session is deleted while a setlist joins it
Held by: `api/src/setlists/setlists.controller.test.ts` › leaves no link to a setlist deleted while it was joining a session

## Setlist status

Whether a setlist is being voted on or is settled into the order the band
plays.

Lives in: `api/src/setlists/` (the `status` column), resolved by
`resolveSetlistStatus` in `domain/setlist-vote.core.ts`

- Exactly two values: `voting` and `locked`. The column is nullable with
  no default, because Aurora DSQL cannot add a `NOT NULL` column after
  the table exists, so a row written before the column reads as `locked`.
- `targetSongCount` is how many songs the band wants out of the vote. It
  may be null, and then it reads as 15.
- Closing a vote writes the entries and moves the status to `locked`.
  Reopening moves it back and keeps every vote.

Held by: `api/src/setlists/voting.controller.test.ts` › reads a setlist that was never voted on as locked
Held by: `api/src/setlists/voting.core.test.ts` › falls back to the default target when the setlist names none
Held by: `api/src/setlists/voting.controller.test.ts` › closes a vote into an ordinary setlist, in the order it was handed
Held by: `api/src/setlists/voting.controller.test.ts` › reopens a closed vote with every point still posted

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
  ids already stored for that setlist, each once
  (`isReorderOfTheSameIds`).
- An append, a delete and a reorder each run in one transaction that first
  writes the setlist's own row (`didClaimSetlistWithin`), so two of them on
  one setlist cannot interleave: Postgres makes the second wait, and
  Aurora DSQL aborts it at commit and `runInOneSetlistTransaction` runs it
  again. When the claim finds no row the write is refused with a 404, and
  deleting a setlist removes its row before its entries, so no entry
  outlives its setlist.

Held by: `api/src/setlists/setlists.controller.test.ts` › appends entries with increasing positions
Held by: `api/src/setlists/setlists.controller.test.ts` › compacts positions after a delete
Held by: `api/src/setlists/setlists.controller.test.ts` › refuses a reorder payload whose ids do not match the current set
Held by: `api/src/setlists/setlists.controller.test.ts` › answers 404 when writing the entries of a setlist that does not exist
Held by: `api/src/setlists/setlists.controller.test.ts` › refuses an entry for a setlist deleted while the entry was being written
Held by: `api/src/setlists/setlists.controller.test.ts` › gives each of two entries appended at the same moment a position of its own
Held by: `api/src/setlists/setlists.controller.test.ts` › applies one of two reorders sent at the same moment whole, never a mix of both
Held by: `api/src/setlists/setlists.controller.test.ts` › keeps positions distinct when an append and a reorder land at the same moment

## Sign-in session

Proof that this browser is a named member.

Lives in: `api/src/auth/`

- One `app_config` row, keyed `id = 1`, still holds the HMAC key that
  signs cookies, and a password hash the recovery route alone reads.
- The cookie is named `pragma_session` and is `payload.signature`, where
  the payload carries the member id, that member's session epoch, and the
  issue and expiry times. It lasts 30 days.
- The gate reads the cookie and the credential behind it: only the second
  read can see a password change.
- `requireBearerSession` is the second door: it resolves the member from an
  **assistant grant**'s access token, applies the same session epoch rule,
  and writes the same member id, so a service never knows which door was
  used.
- Rotating the shared password mints a fresh HMAC key, so every member's
  cookie stops verifying.
- Login attempts are counted per hashed client IP and rate limited.
- Every route passes `requireMemberSession` except sign-in, recovery,
  bootstrap and the passkey challenge (`auth.controller.ts`), the
  audience's public routes, which a ballot reaches
  (`audience.controller.ts`, which gates its two band routes one by one),
  the OAuth discovery, registration, authorization, token and revocation
  routes an **assistant client** calls (`oauth.controller.ts`), and the
  test-seed route.

Held by: `api/src/auth/auth.controller.test.ts` › gates a protected route on the member session cookie
Held by: `api/src/auth/auth.controller.test.ts` › refuses rotate-password without a session and rotates it with one
Held by: `api/src/auth/auth.controller.test.ts` › rate-limits after 5 attempts in 15 min on the same ip
Held by: `api/src/audience/audience.controller.test.ts` › answers every public route without a session cookie and gates the two band routes

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

## Study

One member saying they worked one song on one instrument on one day.

Lives in: `api/src/studies/`

- Keyed on member, song, instrument and `studied_on`, so a second tap on the
  same day changes nothing.
- `studied_on` is the calendar day in `Europe/Paris` of the server clock
  (`parisCalendarDay`). The request carries no date, so a study cannot be
  back-dated, and only a study of today can be undone.
- Accepted only for an instrument the member holds in the song's default
  lineup or in a lineup override of one of its setlist entries.
- A study never changes a score; the two are separate writes.
- A study names only a song and an instrument that still exist: the write
  claims both rows, reads the lineups and inserts in one retried
  transaction, and is refused with `song-not-found` or
  `instrument-not-found` when a claim finds no row.

Held by: `api/src/studies/studies.controller.test.ts` › logs a study once per day and counts it in the streak
Held by: `api/src/studies/studies.controller.test.ts` › refuses a body carrying a date, so a study cannot be back-dated
Held by: `api/src/studies/studies.controller.test.ts` › refuses to undo a study of yesterday
Held by: `api/src/studies/studies.controller.test.ts` › accepts an instrument held only through a setlist lineup override
Held by: `api/src/studies/studies.controller.test.ts` › refuses an instrument the member does not hold in the song lineup
Held by: `api/src/studies/studies.controller.test.ts` › refuses a study of a song deleted while the study was being written
Held by: `api/src/studies/studies.controller.test.ts` › refuses a study on an instrument deleted while the study was being written
Held by: `api/src/studies/studies.controller.test.ts` › logs the study once when its first commit loses a conflict on the claimed song

Not to be confused with: a **practice**, which is the band playing
together and is a kind of session.

## Streak

How many days a member has kept studying, read from their studies.

Lives in: `api/src/studies/` (`computeStreak` in `streak.core.ts`)

- A day counts when it holds at least one study. Today never ends a streak
  before it is over.
- One missed day in any seven is forgiven, which the screen calls the
  joker; a second missed day inside that window ends the streak.
- Not stored: it is computed on every read from the last 400 days of
  studies (`STREAK_LOOKBACK_DAYS`).

Held by: `api/src/studies/streak.core.test.ts` › keeps a run ending yesterday alive while today is still open
Held by: `api/src/studies/streak.core.test.ts` › bridges one missed day and spends the joker
Held by: `api/src/studies/streak.core.test.ts` › ends the streak on a second missed day within seven days

## Concert readiness

Whether the band can play the next concert's songs.

Lives in: `api/src/studies/` (`concert-readiness.core.ts`)

- The next concert is the earliest concert strictly after now; its songs
  are those of every setlist linked to it, counted once.
- A song is ready when, for every lineup it is played with in those
  setlists, each member and instrument has a score and the mean is 7 or
  more. One member with nothing recorded keeps the song not ready, unlike
  `meanForSong`, which skips them.

Held by: `api/src/studies/concert-readiness.core.test.ts` › is ready when the lineup mean is exactly the threshold
Held by: `api/src/studies/concert-readiness.core.test.ts` › is not ready with one silent player even when the others would carry the mean
Held by: `api/src/studies/studies.controller.test.ts` › counts the songs of every setlist linked to the next concert, once each

## Take

One recorded performance of one song, optionally from one session.

Lives in: `api/src/takes/`, with its limits in `domain/take-upload.core.ts`

- The id is chosen by the device that recorded it, so a create retried
  after a lost answer lands on the same row (`hasInsertedTakeWithin`).
- `song_id` is required and `session_id` is optional. Deleting the session
  keeps the take and clears `session_id`; deleting the song deletes the
  take, its comments and its audio object.
- A take names only a song and a session that still exist: the create
  claims both rows in the same retried transaction as the insert, and is
  refused with `song-not-found` or `session-not-found` when a claim finds
  no row.
- The audio is one of the types in `TAKE_CONTENT_TYPES`, at most 50 MiB,
  and S3 enforces that length because the signed upload carries it. The
  object key is `take/<songId>/<takeId>.<extension>` (`buildTakeObjectKey`),
  and a create naming any other key is refused.
- Listed by `recorded_at` descending, not by upload time, so a take
  uploaded a week late sits where it happened.
- Deleting its author keeps the take; `authorName` reads null and the
  screen says *former member*. Any member can delete any take.
- The answer to a create is the take read back inside the transaction that
  stored it (`getWrittenTakeWithin`), never a second read on another
  connection, so a stored take is never answered 404 and the device's
  queue never gives it up.

Held by: `api/src/takes/takes.controller.test.ts` › answers the same take when a create is retried with the same id
Held by: `api/src/takes/takes.controller.test.ts` › keeps one take when two tabs send the same create at the same moment
Held by: `api/src/takes/takes.controller.test.ts` › refuses an object key other than the one the take was signed for
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take one byte over 50 MiB
Held by: `api/src/takes/takes.controller.test.ts` › lists takes by recording time, newest first, whatever order they were uploaded in
Held by: `api/src/takes/takes.controller.test.ts` › lets any member delete another member’s take, its comments and its audio
Held by: `api/src/takes/takes.controller.test.ts` › deleting the song deletes its takes, their comments and their audio
Held by: `api/src/takes/takes.controller.test.ts` › deleting the session keeps its takes and clears their session
Held by: `api/src/takes/takes.controller.test.ts` › deleting the author keeps their takes and comments, with no name to show
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take for a song deleted while the take was being written
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take for a session deleted while the take was being written
Held by: `api/src/takes/takes.controller.test.ts` › writes the take once when its first commit loses a conflict on the claimed song
Held by: `api/src/takes/takes.controller.test.ts` › answers the take it stored even when another connection deletes it before the answer is read

Not to be confused with: a **study**, which records that a member worked a
song and holds no audio.

## Take comment

A note on a take, with an optional moment in seconds.

Lives in: `api/src/takes/` (`take_comment`)

- `at_seconds` is null for a comment in the thread only, and otherwise a
  whole number from 0 to the take's duration (`isMomentWithinTake`).
- `body` is trimmed, 1 to 4 096 characters. Comments are listed oldest
  first, a tie broken on id (`orderCommentsByTime`).
- Deleted with its take; kept, with no author name, when its author is
  deleted.
- A comment names only a take that still exists: the create claims the take
  row, checks the moment against it and inserts in one retried transaction
  (`findClaimedTakeWithin`), and is refused with `take-not-found` when the
  claim finds no row. Deleting a take, alone or with its song, removes the
  take row before its comments, so a comment that claimed the row first is
  removed with the rest.
- The answer to a create or an edit is the comment read back inside the
  transaction that wrote it, so a stored comment is never answered 404.

Held by: `api/src/takes/takes.controller.test.ts` › accepts a moment at the very end and refuses one a second past it
Held by: `api/src/takes/takes.controller.test.ts` › keeps a comment with a moment and one without, oldest first, and counts them
Held by: `api/src/takes/takes.controller.test.ts` › lets another member delete a comment, once
Held by: `api/src/takes/takes.controller.test.ts` › edits a comment’s body and moment, and refuses a moment past the end
Held by: `api/src/takes/takes.controller.test.ts` › leaves no comment on a take deleted while the comment was being written
Held by: `api/src/takes/takes.controller.test.ts` › leaves no comment on a take whose song is deleted while the comment was being written
Held by: `api/src/takes/takes.controller.test.ts` › writes one comment when its first commit loses a conflict
Held by: `api/src/takes/takes.controller.test.ts` › deletes the take once when its first commit loses a conflict
Held by: `api/src/takes/takes.controller.test.ts` › answers the comment it stored even when another connection deletes it before the answer is read

Not to be confused with: a **transition comment**, which is about the gap
between two songs and belongs to no take.

## Task

Something one member owes the band, with an optional date and an optional
composition it is about.

Lives in: `api/src/tasks/`

- `title` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `todo`, `doing`, `done` (`TASK_STATUSES` in
  `domain/task-status.core.ts`). Every status but `done` counts as open.
- `assigneeId` and `songId` are both nullable, and neither carries a
  foreign key, because DSQL has none. A task names only a member and a
  song that still exist: the write claims both rows in the same
  transaction as the task, which runs again when Aurora DSQL aborts it at
  commit, and is refused with `assignee-not-found` or
  `song-not-found` when a claim finds no row. Deleting a member or a song
  removes its row first and then nulls the tasks naming it, in one
  transaction, so a task write that claimed the row first is nulled with
  the rest.
- The list comes back ordered by what is most urgent: in progress first,
  then waiting, then done; within a status, by the nearest due date, with
  a task carrying no date behind every dated one; then by title
  (`compareTasksByUrgency`).
- The tasks screen draws one column per member, in the order the members
  come back, and adds an unclaimed column only when something is
  unassigned.

Held by: `api/src/tasks/tasks.controller.test.ts` › orders the list by what is most urgent
Held by: `site/src/routes/tasks/tasks-page.core.test.ts` › adds the unassigned column only when something is unassigned
Held by: `api/src/tasks/tasks.controller.test.ts` › keeps a task when the member it was assigned to is deleted
Held by: `api/src/tasks/tasks.controller.test.ts` › never leaves a task assigned to a member deleted while the assignment was written
Held by: `api/src/tasks/tasks.controller.test.ts` › writes the task once when its first two commits lose a conflict on the claimed member
Held by: `api/src/tasks/tasks.controller.test.ts` › gives up and writes nothing once every commit has lost a conflict

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

Held by: `domain/tonality.core.test.ts` › reports the root only for slash chords
Held by: `domain/tonality.core.test.ts` › returns null for both ends when nothing parses as a chord

## Vote

What one member gives one song inside one setlist being voted on.

Lives in: `api/src/setlists/` (`setlist_vote`)

- Keyed on `(setlistId, memberId, songId)`, so a member holds one score
  per song per setlist. `points` is a whole number from 0 to 3, and a
  score of 0 deletes the row rather than storing it.
- A member's budget is three points per targeted song. Unspent points are
  simply not counted; nothing forces a member to spend them.
- Deleted with the member who cast it and with the song it names.

Held by: `api/src/setlists/voting.core.test.ts` › removes a vote scored zero and stores every other score
Held by: `api/src/setlists/voting.controller.test.ts` › deletes the votes of a member with the member
Held by: `api/src/setlists/voting.controller.test.ts` › deletes the votes of a song with the song

Not to be confused with: an **improvement vote**, which carries no points
and no budget.

## Vote budget

How many points one member still has to spend in one vote.

Lives in: `api/src/setlists/voting.core.ts`

- `total` is `targetSongCount × 3`, `spent` is the sum of that member's
  votes, and `remaining` is the difference.
- A score is refused as `budget-exhausted` when it would exceed what is
  left, counting the points the same song already holds as free again.

Held by: `api/src/setlists/voting.core.test.ts` › gives three points per targeted song
Held by: `api/src/setlists/voting.core.test.ts` › frees the points a song already held when it is rescored
Held by: `api/src/setlists/voting.controller.test.ts` › refuses a score beyond the budget and says what is left

## Tool

One operation an **assistant client** can call on pragma through MCP,
mapped to exactly one HTTP route and the service function that route calls.

Lives in: `api/src/mcp/` (the transport and the registry); each tool sits in
its own slice as `<domain>-tools.controller.ts`

- Served at `POST /mcp`, stateless: every request builds a fresh server,
  answers one JSON body and keeps no session, so `GET` and `DELETE` answer
  405.
- Reached only with an **assistant grant**'s access token, through
  `requireBearerSession`; the member it resolves is the actor of every
  write, so push skips that member exactly as for a change made in the app.
- Takes the route's own Zod schemas, path parameters and body merged into
  one object, and answers the body the route would answer. A body that is
  a union, such as a session's concert-or-practice body, cannot be merged,
  so it sits whole under one field (`session`, `changes`). A body schema
  with a refinement cannot be merged either: the tool takes its fields and
  answers `empty-update` itself where the route's refinement would refuse
  the request, as `update_take_comment` does. A refusal is a
  tool error carrying the route's `{ error }` body; an unexpected throw is
  reported as `McpToolFailed` and answers `internal-error`.

Held by: `api/src/mcp/mcp.controller.test.ts` › answers 401 with the protected resource metadata address to a call without a valid token
Held by: `api/src/mcp/mcp.controller.test.ts` › lists every served tool, advertises tools only, and serves two clients at once with no session
Held by: `api/src/songs/songs-tools.controller.test.ts` › answers the refusal codes the routes answer
Held by: `api/src/transitions/transitions-tools.controller.test.ts` › writes, reads, lists and deletes a transition comment, pushing the change to the other members only
Held by: `api/src/sessions/sessions-tools.controller.test.ts` › creates a concert with the fields the route requires
Held by: `api/src/setlists/setlists-tools.controller.test.ts` › runs an audience vote as the member, from opening to closing
Held by: `api/src/setlists/setlists-tools.controller.test.ts` › pushes each setlist change to the other members only
Held by: `api/src/takes/takes-tools.controller.test.ts` › signs an upload, then records the take as the granting member
Held by: `api/src/takes/takes-tools.controller.test.ts` › comments on a take as the granting member, edits the comment, then deletes it

Not to be confused with: a route, which a browser calls with a cookie; a
tool calls the same service with a bearer token.

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

Held by: `domain/transition.core.test.ts` › covers the gap when somebody keeps a harmonic instrument across both songs
Held by: `domain/transition.core.test.ts` › calls the transition risky when nobody keeps a harmonic instrument
Held by: `domain/transition.core.test.ts` › treats a member sitting the second song out as keeping nothing

Not to be confused with: a transition comment, which is what the band
wrote about that gap.

## Transition comment

A note the band leaves about going from one specific song into another.

Lives in: `api/src/transitions/`

- One row per ordered pair `(songAId, songBId)`, held by the unique index
  `transition_comment_ordered_pair`, so A into B and B into A are two
  separate rows.
- `comment` is `NOT NULL`, trimmed, 1 to 4 096 characters. `updatedAt` is
  `NOT NULL` and defaults to the write time.

Held by: `api/src/transitions/transitions.controller.test.ts` › treats A→B and B→A as distinct rows
Held by: `api/src/transitions/transitions.schema.test.ts` › refuses whitespace alone, which would read as a comment and say nothing

## Upload

A presigned URL that lets the browser put a file straight into S3, or read
a chart back.

Lives in: `api/src/uploads/`

- The content type must be one of `application/pdf`, `image/png`,
  `image/jpeg`, `image/webp`, `image/heic`.
- The declared length is capped at 10 MiB, and a signed URL is valid for
  5 minutes.
- The object key is `chart/<songId>/<randomId>.<extension>`
  (`buildChartObjectKey`). The slice stores no row of its own: a chart's
  key is kept in `song.chart`.
- The same slice signs a take's audio upload (`mintObjectUpload`, called
  by the takes slice with the take's own limits) and deletes stored
  objects (`deleteStoredObjects`); a take's key is kept in
  `take.object_key`.

Held by: `api/src/uploads/uploads.controller.test.ts` › rejects an unsupported content type
Held by: `api/src/uploads/uploads.controller.test.ts` › rejects content-length over the 10 MiB ceiling
Held by: `api/src/uploads/uploads.adapter.test.ts` › signs the declared length, so S3 refuses a body of any other size

## Voting round

One thirty-second window, opened by a member on one concert, closing on at
most one winner.

Lives in: `api/src/audience/`

- `voting_round` holds `session_id`, `opened_at`, `closes_at`,
  `settled_at` and `winning_song_id`. `ROUND_DURATION_MS` in
  `round.core.ts` is the window.
- A second round is refused while one is open on that concert, and a round
  is refused on a session whose `kind` is `practice`. The check and the
  insert run in one transaction that first writes the concert's
  audience-choice setlist row (`didClaimSetlistWithin`), so two rounds
  asked for at the same moment cannot both pass it. When that setlist was
  deleted in the meantime the round is refused as `not-a-concert`, and a
  settlement whose setlist is gone writes nothing, so the next read
  creates a new audience-choice setlist and settles the round into it
  (`settleIfDue`).
- Settlement is lazy: the first read after `closes_at` settles the round,
  and settling twice changes nothing (`settleRound`).
- The winner is the song with the most surviving votes; a tie goes to the
  song whose latest surviving vote is the earliest, and a tie that
  survives that is broken on `songId` ascending.
- A round that closes with no vote is blank: `settled_at` is written,
  `winning_song_id` stays null, and nothing is appended.
- **The person voting is deliberately not modelled.** There is no row for
  a voter and no field that identifies one; only the ballot exists.

Held by: `api/src/audience/round.core.test.ts` › closes thirty seconds after it opened
Held by: `api/src/audience/audience.controller.test.ts` › refuses a round on a practice, because rounds belong to concerts
Held by: `api/src/audience/audience.controller.test.ts` › refuses a second round while one is running on that concert
Held by: `api/src/audience/audience.controller.test.ts` › opens one round when two are asked for on the same concert at the same moment
Held by: `api/src/audience/round.core.test.ts` › answers already-settled the second time, so a settlement that runs twice changes nothing
Held by: `api/src/audience/round.core.test.ts` › breaks a tie on the song whose latest surviving vote is the earliest
Held by: `api/src/audience/round.core.test.ts` › is blank when the room cast nothing
Held by: `api/src/audience/audience.schema.test.ts` › identify a vote by the round, the ballot and the song, so one ballot votes once per song

Not to be confused with: a session, which is the concert the round belongs
to.

## Words we do not use

- **app**, **integration**, **connector** for an assistant: the registered
  program is an **assistant client** and the permission a member gives it
  is an **assistant grant**. *connector* is only what claude.ai and Le Chat
  call the setting a member fills in.
- **token** for the permission itself: a grant holds tokens, and revoking
  ends the grant, not one token.
- **musician**, **bandmate**: the person is a **member**. **player**
  names a member only in relation to one instrument (an instrument's
  `players`, `InstrumentPlayerLink`), and `TakePlayer` is the audio
  player; it never names the person in the band.
- **user**: the person is a **member**. **account** is allowed as everyday
  prose for a **member credential**, which is the word identifiers use.
- **admin**, **role**, **permission**: every member can do everything,
  and what a member holds on a song is an **instrument**, never a role.
  `role` appears only as the ARIA attribute and as the database role the
  API connects as (`DSQL_ROLE`).
- **venue** as an entity: the CRM record is a **bar**. `venue` is only the
  free-text column on a concert.
- **gig**, **show**, **date** for the event: the event is a **concert**.
  `gig` is one of the three concert moods of a **bar**
  (`CONCERT_MOODS`), and `date` is the session's timestamp column; neither
  names the event. **rehearsal** is a **practice**. Both are kinds of
  **session**.
- **tune**, **number**, **track** for a catalogue entry: the catalogue
  holds **songs**. **track** names an entry in a streaming service's
  catalogue: `deezerTrackId`, `spotifyTrackId` and the audience
  suggestion's `trackId`, plus the Deezer and Spotify adapters that read
  them. It never names a catalogue song or a **take**.
- **set**, **programme**, **running order**: the ordered run is a
  **setlist**, and each row in it is a **setlist entry**.
- **poll**, **election**, **scrutin**, **survey**: a setlist in its
  `voting` status carries **votes**, each worth **points**, and the
  audience's thirty-second window is a **voting round**, where one tap is
  a **vote**. **ballot** is reserved for the audience's browser token and
  never names a member's setlist votes. `poll` appears only for how often
  the front end asks again (`selectPollInterval`).
- **skill**, **level**, **rating**, **proficiency** for how well a member
  plays: the measure is **mastery** and the number is a **score**.
  In the domain, **level** names only an **energy** value
  (`resolveEnergyLevel`).
- **revision**, **review**, **practice session**, **homework**: a member's
  own work on a song is a **study**. **revision** reads as a version in
  code, and **practice** is already the band playing together.
- **recording**, **version**, **track** for audio: one recorded
  performance of a song is a **take**. *recording* is the act of making
  one, which the screen may say, and *version* is refused for the same
  reason as *revision*.
- **part**, **station**: what a member holds on a song is an
  **instrument**, and the whole map is a **lineup**.
- **ticket**, **issue**, **feature request**, **bug**: what the band wants
  changed in this application is an **improvement**, and its votes are
  **improvement votes**.
- **prospect**, **contact** as an entity: a **bar** with status `lead`.
- **chord sheet**, **tab**, and **score** in its sheet-music sense: the
  attached music is a **chord chart**, and its inline form is
  **ChordPro**. **score** names only a **mastery** number.
- **colour** in identifiers: the column and every field are spelled
  `color`. Prose may spell it either way; code may not.
- **availability**, **dispo**, **free time** as an entity: what the
  band books from is a **free slot**, and what a calendar contributes is
  a **busy interval**.
- **agenda**, **iCal link**, **calendar URL**: the member's address is a
  **calendar feed**.
- **voter**, **audience member**, **fan** for the person in the room: that
  person is not modelled at all. What exists is a **ballot**, and it
  identifies a browser rather than anyone holding it. `voterCount` counts
  the members who scored a song in a setlist vote, never people in the
  room.
