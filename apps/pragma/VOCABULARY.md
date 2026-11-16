# Vocabulary — pragma

`pragma` is a private progressive web app for one band. It holds the
band's song catalogue, the setlists they play, the practices and concerts
they play them at, and a small CRM of the bars they want to be booked in.
Each member signs in with their own **member credential**, and there are
no roles: every member can read and change everything.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Assistant client

An AI assistant that registered itself with pragma's authorization server:
Claude Code, Mistral Vibe, claude.ai or Le Chat.

Lives in: `api/src/oauth/` (`assistant_client`)

Invariants: `api/src/oauth/INVARIANTS.md`

Not to be confused with: an **assistant grant**, which is one member
allowing one client; a client with no grant can do nothing.

## Assistant grant

One member's permission for one **assistant client** to act on pragma as
that member.

Lives in: `api/src/oauth/` (`assistant_grant`, `assistant_authorization_code`)

Invariants: `api/src/oauth/INVARIANTS.md`

Not to be confused with: a **sign-in session**, which is a browser's
cookie; a grant is what a terminal or a chat assistant holds instead.

## Audience suggestion

The record that a song entered a concert's pool because someone in the
room asked for it.

Lives in: `api/src/audience/`

Invariants: `api/src/audience/INVARIANTS.md`

Not to be confused with: a vote, which is a ballot's tap on a song already
in the pool.

## Band link

An address the whole band keeps on the band tab, under a name, such as
the shared folder of the band's photos. A member types it in the app.

Lives in: `api/src/band-links/` (`band_link`), with its rule in `domain/band-link.core.ts`

Invariants: `api/src/band-links/INVARIANTS.md`

Not to be confused with: a song's listening links, which belong to one
song, nor the links of the band tab's menu, which open pragma's own pages.

## Band tab

The screen that lists every page about the band itself: tasks first, then members, instruments, bars, compositions, inspirations, improvements, and the account page last. Under that menu it keeps the **band links**.

Lives in: `site/src/routes/band/`

- Not to be confused with the band as the set of people, which is
  **member**.

Invariants: `site/src/routes/band/INVARIANTS.md`

## Bar

A venue the band wants to play in, and the record of where the
conversation with it has got to.

Lives in: `api/src/bars/`

Invariants: `api/src/bars/INVARIANTS.md`

Not to be confused with: the `venue` column on a concert, which is free
text typed for that one date.

## Ballot

One browser's participation in one concert, identified by an opaque token
the server mints.

Lives in: `api/src/audience/`

Invariants: `api/src/audience/INVARIANTS.md`

Not to be confused with: a member credential, which signs a band member in
and reaches gated routes a ballot never does.

## Member credential

The username and password one member signs in with.

Lives in: `api/src/auth/`

Invariants: `api/src/auth/INVARIANTS.md`

Not to be confused with: the shared password in `app_config`, which now
opens the recovery route and nothing else.

## Outreach template

The pitch the band sends a bar to ask for a date, held once for the whole
application and edited from the bars page.

Lives in: `api/src/outreach/`

Invariants: `api/src/outreach/INVARIANTS.md`

Not to be confused with: a bar's `notes`, which are what happened with
that one venue.

## Calendar feed

One of a member's secret iCal addresses, which lets the API read one of
that member's calendars.

Lives in: `api/src/calendar-feeds/`

Invariants: `api/src/calendar-feeds/INVARIANTS.md`

Not to be confused with: a **busy interval**, which is what the API keeps
from the feed for one request and never stores.

## Busy interval

A span of time during which one member's calendar says they are taken.

Lives in: `api/src/calendar-feeds/`

Invariants: `api/src/calendar-feeds/INVARIANTS.md`

Not to be confused with: a **session**, which is the band's own
commitment, not one member's.

## Chord chart

The written music for a song, in one of three forms.

Lives in: `api/src/songs/` (the `chart` column), with the file itself
uploaded through `api/src/uploads/`

Invariants: `api/src/songs/INVARIANTS.md`

## Composition

A piece the band is writing. It becomes a catalogue song only when a member
adds it.

Lives in: `api/src/compositions/` (`composition`)

Invariants: `api/src/compositions/INVARIANTS.md`

Not to be confused with: the **song**, which is the catalogue record a
composition may become. A song with `origin = original` is not a
composition.

## Brush-up

A **task** one member takes on a song before the next **session**: its
`songId` is the song, its `sessionId` the next practice or concert, its
assignee the member. A member asks for one from a song's menu in a
setlist, and ticks it with the other tasks. The screen calls it *To revise*.

Lives in: `site/src/components/organisms/` (`brush-up.core.ts`), stored as a `task` row

Invariants: `site/src/components/organisms/INVARIANTS.md`

Not to be confused with: the **study queue**, which pragma computes from
**mastery**; a brush-up is one a member asks for by hand.

## Concert

A date the band plays in front of an audience.

Lives in: `api/src/sessions/`

Invariants: `api/src/sessions/INVARIANTS.md`

Not to be confused with: a practice, which is the other `kind` of session.

## Energy

How much the room lifts during a song, on a scale of 1 to 10.

Lives in: `api/src/songs/` (`baseEnergy`) and `api/src/setlists/`
(`energy` on an entry)

Invariants: `api/src/songs/INVARIANTS.md`

## Free slot

A span of at least two hours, inside the search windows, when no member
with a readable calendar feed is busy.

Lives in: `api/src/free-slots/`

Invariants: `api/src/free-slots/INVARIANTS.md`

Not to be confused with: a **practice**, which only exists once someone
books the slot.

## Home

The start screen, at `/`: the next session, then the signed-in member's part in its setlist or their open tasks, one at a time, chosen from two tabs.

Lives in: `site/src/routes/home/`

- Not to be confused with the **catalogue**, which was the start screen
  before.

Invariants: `site/src/routes/home/INVARIANTS.md`

## Improvement

Something the band wants changed in this application, written down by the
member it annoys.

Lives in: `api/src/improvements/`

Invariants: `api/src/improvements/INVARIANTS.md`

Not to be confused with: a song's notes (`structureNotes`, `gimmickNotes`,
`notes`), which are about the music rather than about the tool that tracks it.

Nor is the kind `idea` the status `idea`: the kind says what the improvement
is and never changes on its own, the status says how far the band has got
with it. A bug report starts in the status `idea` too.

## Improvement vote

One member saying they want one improvement.

Lives in: `api/src/improvements/` (`improvement_vote`)

Invariants: `api/src/improvements/INVARIANTS.md`

Not to be confused with: a **vote**, which is the scored, budgeted thing a
member spends on songs inside a setlist.

## Inspiration

A passage of a published song a member wants the band to take an idea
from: a YouTube video, a start second, an end second and a note.

Lives in: `api/src/inspirations/`, with its rules in `domain/inspiration.core.ts`

Invariants: `api/src/inspirations/INVARIANTS.md`

Not to be confused with: an **improvement**, which is a change the band
wants in this application, and a **take**, which is the band's own
recording.

## Instrument

Something a member can hold on a song.

Lives in: `api/src/instruments/`

Invariants: `api/src/instruments/INVARIANTS.md`

## Instrument family

What kind of thing an instrument is, which is the only property the
transition rule reads.

Lives in: `domain/instrument.core.ts`

Invariants: `domain/INVARIANTS.md`

## Lineup

Who plays what on a song: a map from member id to the list of instruments
that member holds.

Lives in: `domain/lineup.core.ts`

Invariants: `domain/INVARIANTS.md`

## Lineup slot

One mark in the lineup a setlist card draws: one instrument held by one
member on that song, its glyph drawn on a cell filled with that member's
stored colour, in whichever of the two inks reads better on it
(`selectInkOnMemberColor`).

Lives in: `site/src/components/molecules/`

Invariants: `site/src/components/molecules/INVARIANTS.md`

Not to be confused with: **Lineup**, which is the record a slot is drawn
from.

## Lineup grid

The setlist's **Lineup** view: one row per entry and one column per member
who plays in the setlist, so a member's instruments read down the setlist as
one lane in their stored colour, and the transitions between songs show where
the lane changes.

Lives in: `site/src/components/organisms/`

Invariants: `site/src/components/organisms/INVARIANTS.md`

Not to be confused with: **Lineup slot**, the single mark a Songs row
draws for one instrument held.

## Mastery

How well a member plays a given instrument, as a whole number from 0 to 10.

Lives in: `api/src/mastery/`

Invariants: `api/src/mastery/INVARIANTS.md`

## Mastery score change

One row of mastery history: the score a member gave themselves on one
instrument for one song, and when.

Lives in: `api/src/mastery/` (the `mastery_score_change` table)

Invariants: `api/src/mastery/INVARIANTS.md`

Not to be confused with: the per-song score itself, which holds only the
latest value.

## Member

One person in the band.

Lives in: `api/src/members/`

Invariants: `api/src/members/INVARIANTS.md`

Not to be confused with: the member ids inside a lineup, which say who
plays on one song rather than who is in the band.

## Notification preference

One member's toggle for one category of notification.

Lives in: `api/src/notifications/` (`notification_preference`)

Invariants: `api/src/notifications/INVARIANTS.md`

## Push subscription

One device of one member that accepted notifications.

Lives in: `api/src/notifications/` (`push_subscription`)

Invariants: `api/src/notifications/INVARIANTS.md`

## Realtime connection

One open WebSocket from one browser tab of a signed-in member, used only to
hear that band data went stale (live invalidation, ADR-2026-09-19T2140's channel).

Lives in: `api/src/realtime/` (`realtime_connection`)

Invariants: `api/src/realtime/INVARIANTS.md`

Not to be confused with: a **sign-in session**, which proves who the member
is; the connection only listens.

## Realtime ticket

A signed, sixty-second pass that lets a tab open a **realtime connection**.

Lives in: `api/src/realtime/realtime-ticket.utils.ts`

Invariants: `api/src/realtime/INVARIANTS.md`

## Derived read root

An API root whose read aggregates other slices, and the API roots it reads
through them (`studies` reads `setlists`, `sessions`, `songs`, `mastery`…).

Lives in: `domain/stale-scope.core.ts` (`DERIVED_READ_ROOTS`)

Invariants: `domain/INVARIANTS.md`

## Query read roots

For each query key root the site caches under, the API roots its query
functions read (`studies` reads `studies` and `mastery`, `voting` reads
`setlists`).

Lives in: `site/src/lib/queries/query-read-roots.core.ts` (`QUERY_READ_ROOTS`)

Invariants: `site/src/lib/queries/INVARIANTS.md`

## Stale message

The frame the API posts on a **realtime connection** after a write:
`{ kind: 'stale', written }`, where `written` lists **written roots**.

Lives in: `domain/stale-scope.core.ts`

Invariants: `domain/INVARIANTS.md`

## Written root

The API root a write touched: the first path segment after `/api/`
(`setlists`, `mastery`, `me`…), or `all`.

Lives in: `domain/stale-scope.core.ts`, `api/src/realtime/stale-scope.core.ts`

Invariants: `domain/INVARIANTS.md`

## VAPID key pair

The key pair a stage signs every push with, and whose public half a device
subscribes with.

Lives in: `api/src/notifications/` (`vapid_key_pair`)

Invariants: `api/src/notifications/INVARIANTS.md`

Not to be confused with: a **push subscription**, which is the device's own
key and address rather than the stage's.

## Offline reading

What the app loads into its saved query cache once signed in, so the band can
read the catalogue and the next setlist with no signal
(`loadOfflineReadingWhenSignedIn`). The service worker caches no API read.

Lives in: `site/src/lib/queries/offline-reading.queries.ts`

Invariants: `site/src/lib/queries/INVARIANTS.md`

## Read batch

Up to ten API reads sent as one `POST /api/read-batch`, so one tab never
needs more of the API's ten seats than it has batches in flight
(ADR-2026-11-05T0445).

Lives in: `domain/read-batch.core.ts`, `api/src/read-batch/`, `site/src/lib/read-batch.adapter.ts`

Invariants: `domain/INVARIANTS.md`

Not to be confused with: a **written root**, which a write announces; the
batch writes nothing and announces nothing.

## Opening screen

The pragma mark and its "Tuning up…" caption, shown over a gated route
while the cache holds no band data, until the first band data lands.

Lives in: `site/src/components/organisms/session-gate.core.ts`, `site/src/components/organisms/OpeningScreen.tsx`, `site/src/components/atoms/PragmaMark.tsx`

Invariants: `site/src/components/organisms/INVARIANTS.md`

Not to be confused with: the offline banner, which a signed in
member sees over cached screens while the browser is offline.

## Order screen

The setlist's screen for putting its entries in order with the energy curve
in view, reached from **Order** on the setlist. It is a screen of the
setlist, not a second noun for it: the setlist is never called a running
order.

Lives in: `site/src/routes/setlists/`

Invariants: `site/src/routes/setlists/INVARIANTS.md`

Not to be confused with: **Energy**, the level each entry or song holds,
which the Order screen only draws.

## Passkey

A credential held by a member's own device, which signs them in without
a password.

Lives in: `api/src/auth/` (`member_passkey`), verified through
`passkey.adapter.ts`

Invariants: `api/src/auth/INVARIANTS.md`

## Deezer track

The entry in Deezer's catalogue that a song is linked to. It is what the
search fills in, what the listen dialog opens, and the one identifier a
member can also type by hand on the song form
(`SongDeezerTrackIdField.tsx`).

Lives in: `api/src/songs/` (the `deezer_track_id` column), read by
`site/src/lib/listen-links.utils.ts`

Invariants: `api/src/songs/INVARIANTS.md`

## Spotify track

The entry in Spotify's catalogue that a song is linked to, resolved from
the ISRC Deezer returned rather than from the song's title.

Lives in: `api/src/songs/` (the `spotify_track_id` column), read by
`site/src/lib/listen-links.utils.ts`

Invariants: `api/src/songs/INVARIANTS.md`

## Deezer album

The Deezer album a song's track belongs to, which is what Deezer serves
the cover by.

Lives in: `api/src/songs/` (the `deezer_album_id` column), read by
`site/src/lib/cover-art.utils.ts`

Invariants: `api/src/songs/INVARIANTS.md`

## Practice

The band playing together with no audience, optionally aimed at a
concert.

Lives in: `api/src/sessions/`

Invariants: `api/src/sessions/INVARIANTS.md`

## Practice mode

The screen that follows a practice's setlists song by song while the band
plays, at `/sessions/:id/practice`, so recording a take of the song being
played is one tap.

Lives in: `site/src/routes/sessions/`

Invariants: `site/src/routes/sessions/INVARIANTS.md`

Not to be confused with: the **scene view**, which reads one song's chart
on stage and records nothing.

## Scene view

The full-screen reading of a song's chart, for use on stage.

Lives in: `site/src/routes/catalog/`

Invariants: `site/src/routes/catalog/INVARIANTS.md`

## Session

One dated thing the band does together, either a practice or a concert.

Lives in: `api/src/sessions/`

Invariants: `api/src/sessions/INVARIANTS.md`

Not to be confused with: a sign-in session, which is a browser cookie and
has nothing to do with a date in the calendar.

## Setlist

A named, ordered run of songs. It exists on its own, and any number of
sessions can carry it: a practice works through several, and the setlist
prepared in a practice is the same one played at the concert.

Lives in: `api/src/setlists/`

Invariants: `api/src/setlists/INVARIANTS.md`

## Session setlist link

Which sessions carry which setlist, and in what order within a session.

Lives in: `api/src/setlists/`

Invariants: `api/src/setlists/INVARIANTS.md`

## Setlist row

One **setlist entry** drawn in the setlist's **Songs** view: position, album
cover, title, its **lineup slots** or the member's part, artist and key, and
the entry's note and tonight's lineup change when set.

Lives in: `site/src/components/organisms/` (`SetlistEntryRow.tsx`)

Invariants: `site/src/components/organisms/INVARIANTS.md`

Not to be confused with: a row of the **lineup grid**, the Lineup view.

## Setlist status

Whether a setlist is being voted on or is settled into the order the band
plays.

Lives in: `api/src/setlists/` (the `status` column), resolved by
`resolveSetlistStatus` in `domain/setlist-vote.core.ts`

Invariants: `api/src/setlists/INVARIANTS.md`

## Setlist entry

One song in one setlist, with the decisions that apply to it that night.

Lives in: `api/src/setlists/`

Invariants: `api/src/setlists/INVARIANTS.md`

## Setlist break

A pause between two songs of a setlist: a short break, or the intermission
between two sets.

Lives in: `api/src/setlists/` (`setlist_break`)

Invariants: `api/src/setlists/INVARIANTS.md`

Not to be confused with: a song **note**, which is text on one entry; a
break is its own row in the running order.

## Sign-in session

Proof that this browser is a named member.

Lives in: `api/src/auth/`

Invariants: `api/src/auth/INVARIANTS.md`

Not to be confused with: a session, which is a practice or a concert.

## Sketch

The timeline of one composition, where members lay out inspirations on
lanes, measured in seconds.

Lives in: `api/src/sketches/`, with its rules in `domain/sketch.core.ts`

Invariants: `api/src/sketches/INVARIANTS.md`

Not to be confused with: a **chord chart**, which is the written song.

## Sketch lane

One named row of a sketch, such as "drums" or "brass".

Lives in: `api/src/sketches/` (`sketch_lane`)

Invariants: `api/src/sketches/INVARIANTS.md`

Not to be confused with: a row of the **lineup grid**, and a **Deezer
track**. The operator's French word is *piste*; it is never written
*track* in code.

## Sketch clip

One inspiration placed on a sketch lane at a whole second.

Lives in: `api/src/sketches/` (`sketch_clip`)

Invariants: `api/src/sketches/INVARIANTS.md`

Not to be confused with: a **take**, which is audio the band recorded.

## Song

One piece of music the band has in its catalogue.

Lives in: `api/src/songs/`

Invariants: `api/src/songs/INVARIANTS.md`

## Study queue

For one member, each song and instrument they hold in a lineup, ordered so
the songs least ready to play come first. The Songs tab shows it as the
**To learn** filter.

Lives in: `api/src/studies/` (`study-queue.core.ts`)

Invariants: `api/src/studies/INVARIANTS.md`

Not to be confused with: a **practice**, which is the band playing
together and is a kind of session.

## Presence

One member opening the app on one calendar day in `Europe/Paris`.

Lives in: `api/src/streaks/` (`presence`, `presences.service.ts`)

Invariants: `api/src/streaks/INVARIANTS.md`

Not to be confused with: a **session**, which the band plays together.

## Flame

How many days a member, or the band, has kept practising, counted back from
today.

Lives in: `domain/` (`practice-flame.core.ts`), served by `api/src/streaks/`

Invariants: `domain/INVARIANTS.md`

## Streak

The feature that shows **flames**. The word names its surface, never the
count: `GET /api/streaks`, the `streaks/` slice, the streak sheet, the
`streak` push category and the `streak-reminder` job.

Lives in: `api/src/streaks/`

Invariants: `api/src/streaks/INVARIANTS.md`

## Concert readiness

Whether the band can play the next concert's songs.

Lives in: `api/src/studies/` (`concert-readiness.core.ts`)

Invariants: `api/src/studies/INVARIANTS.md`

## Take

One recorded performance of one song, optionally from one session.

Lives in: `api/src/takes/`, with its limits in `domain/take-upload.core.ts`

Invariants: `api/src/takes/INVARIANTS.md`

## Take comment

A note on a take, with an optional moment in seconds.

Lives in: `api/src/takes/` (`take_comment`)

Invariants: `api/src/takes/INVARIANTS.md`

Not to be confused with: a **transition comment**, which is about the gap
between two songs and belongs to no take.

## Task

Something one member owes the band, with an optional date and an optional
composition it is about.

Lives in: `api/src/tasks/`

Invariants: `api/src/tasks/INVARIANTS.md`

Not to be confused with: a **setlist entry**, which is a decision about
one song for one night rather than work owed by a person.

## Tonality

The key a song starts in and the key it ends in.

Lives in: `domain/tonality.core.ts`, stored in `api/src/songs/`

Invariants: `domain/INVARIANTS.md`

## Vote

What one member gives one song inside one setlist being voted on.

Lives in: `api/src/setlists/` (`setlist_vote`)

Invariants: `api/src/setlists/INVARIANTS.md`

Not to be confused with: an **improvement vote**, which carries no points
and no budget.

## Vote budget

How many points one member still has to spend in one vote.

Lives in: `api/src/setlists/voting.core.ts`

Invariants: `api/src/setlists/INVARIANTS.md`

## Tool

One operation an **assistant client** can call on pragma through MCP,
covering one or more HTTP routes and the service functions those routes
call.

Lives in: `api/src/mcp/` (the transport and the registry); each tool sits in
its own slice as `<domain>-tools.controller.ts`

Invariants: `api/src/mcp/INVARIANTS.md`

Not to be confused with: a route, which a browser calls with a cookie; a
tool calls the same service with a bearer token.

## Transition

The gap between two consecutive setlist entries, and who can hold the room
across it.

Lives in: `domain/transition.core.ts`

Invariants: `domain/INVARIANTS.md`

Not to be confused with: a transition comment, which is what the band
wrote about that gap.

## Transition comment

A note the band leaves about going from one specific song into another.

Lives in: `api/src/transitions/`

Invariants: `api/src/transitions/INVARIANTS.md`

## Upload

A presigned URL that lets the browser put a file straight into S3, or read
a chart back.

Lives in: `api/src/uploads/`

Invariants: `api/src/uploads/INVARIANTS.md`

## Voting round

One thirty-second window, opened by a member on one concert, closing on at
most one winner.

Lives in: `api/src/audience/`

Invariants: `api/src/audience/INVARIANTS.md`

Not to be confused with: a session, which is the concert the round belongs
to.

## Words we do not use

- **app**, **integration**, **connector** for an assistant: the registered
  program is an **assistant client** and the permission a member gives it
  is an **assistant grant**. *connector* is only what claude.ai and Le Chat
  call the setting a member fills in.
- **token** for the permission itself: a grant holds tokens, and revoking
  ends the grant, not one token.
- **track**, **piste** for a row of a sketch: it is a **sketch lane**.
  *track* names only a Deezer or Spotify track. **reference**, **sample**
  and **extract** for a passage in the library: it is an **inspiration**,
  and once placed on a lane it is a **sketch clip**.
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
- **revision**, **review**, **practice session**, **homework**: the songs a
  member has to work on are their **study queue**. **revision** reads as a
  version in code, and **practice** is already the band playing together.
- **recording**, **version**, **track** for audio: one recorded
  performance of a song is a **take**. *recording* is the act of making
  one, which the screen may say, and *version* is refused for the same
  reason as *revision*.
- **part**, **station**: what a member holds on a song is an
  **instrument**, and the whole map is a **lineup**.
- **main instrument**, **primary instrument**: a member plays a set of
  **instruments**, none ranked above the others.
- **ticket**, **issue**, **feature request**: what the band wants
  changed in this application is an **improvement**, and its votes are
  **improvement votes**. **ticket** names only the **realtime ticket**.
  **bug** on its own is only the value of `kind`;
  the thing is a **bug report**, and never a **defect** or an
  **incident**, which are words of the quality dashboard and the
  dantotsus.
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
