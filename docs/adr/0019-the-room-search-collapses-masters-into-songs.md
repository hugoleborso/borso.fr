# 19. The room's search collapses masters into songs, and reads a refusal stated inside a 200

- Status: proposed
- Date: 2026-09-16
- Deciders: Hugo

## Context

The audience votes for an encore from a phone, and can ask for a song the
band does not have by typing it and picking a search result. That search is
the one path in this application a whole room hits at once.

[ADR-0017](./0017-spotify-track-ids-resolved-by-isrc-at-link-time.md) and the
work that landed with it already settled which provider answers: Deezer does,
it needs no key, and a song now carries `deezer_track_id` rather than the
MusicBrainz identifier it once did. This record does not reopen that. It
settles two properties the room's use of that search needs and the
catalogue's use did not.

An earlier draft of this record, numbered 0015 on a branch that predates
those merges, argued for MusicBrainz and was superseded before it ever
landed. Nothing of that argument survives here.

## Decision

**The room's search collapses every row that reads the same down to one, and
both providers' refusals reach the caller as a refusal rather than as an
empty list.**

Two mechanisms, each answering something measured against the live API.

**Collapse on what the reader can tell apart.** Deezer indexes masters, not
songs. Typing what a room types, `nirvana smells like teen spirit`, returned
six rows all reading *Smells Like Teen Spirit — Nirvana*, carrying five
different ISRCs: a remaster, three live takes and a compilation cut. Nothing
upstream marks them as one song, because upstream they are not one song. To a
room they are, and six rows take six shares of one vote. `collapseTracksOfOneSong`
merges on the folded title and artist, after the ranking has chosen an order,
so the first row survives. Measured on that query: 25 rows to 13.

**Read the refusal the transport hid.** Deezer answers `200` to requests it
refused, stating the refusal only in the body: code 800 for an unknown track,
code 4 for an exhausted quota. The adapter checked `response.ok` alone, so a
room that exhausted the quota saw *no results* — the answer a search gives
when the song does not exist. `searchExternal` now returns an outcome union
and reads both the status and the payload through one private helper its two
calls share.

**A pick is re-read from the provider, never trusted from the browser.**
`readDeezerTrack` fetches the chosen track by its id before anything is
written, because the suggestion path is the one unauthenticated write in this
application and a catalogue row must not be shaped by a request body.

## Consequences

- `+` One row per song in the dropdown, so the room's vote cannot split
  across masters nobody can tell apart.
- `+` A throttled search says so. The visitor sees a stated failure and can
  try again, instead of concluding the band's catalogue is empty.
- `+` The band's own search gets both properties for free: it is the same
  adapter, and the collapse is applied only on the audience path where losing
  a named version is acceptable.
- `-` A spectator who genuinely wants the Reading live take can no longer ask
  for it. The band plays its own arrangement regardless, which is what makes
  the trade acceptable here and would not make it acceptable in the
  catalogue's own search.
- `-` The collapse is text matching. Two genuinely different songs sharing a
  title and an artist would merge. No example was found, and the alternative
  — trusting the provider's identifiers — is the defect this replaces.
- `~` `searchExternal`'s return type changed from an array to a union, so
  every caller had to be updated. That is the point of a union: the compiler
  found them.

## Alternatives considered

**Collapse on the ISRC alone.** This is what the first implementation did, and
it is not wrong — a first release and its reissue do share an ISRC, and that
pass still runs first because it is exact. It is simply not enough: the five
Nirvana masters carry five ISRCs. Keeping only this pass leaves the defect.

**Rank harder instead of collapsing.** Push the best master to the top and
leave the rest. The room still sees five identical rows and still splits its
vote between them; ranking decides which one wins, not how many there are.

**Show the album beside the title, so the rows read differently.** Honest, and
it makes the list longer and asks a person in a bar to choose between
*Nevermind* and *Live At The Paramount* when they wanted neither. The
question the room is answering is which song, not which recording.

## Implementation pointers

- `apps/pragma/api/src/songs/deezer.core.ts` — `collapseTracksOfOneSong`,
  `readDeezerErrorCode`, `mapDeezerTrack`.
- `apps/pragma/api/src/songs/deezer.adapter.ts` — the outcome union, the
  shared `readDeezer` helper, `readDeezerTrack`.
- `apps/pragma/api/src/songs/song-identity.core.ts` — the fold both the
  collapse and the catalogue dedupe use, and the match that prefers the track
  id over it.
- Related: [ADR-0012](./0012-outbound-calls-live-in-adapter-files.md),
  [ADR-0017](./0017-spotify-track-ids-resolved-by-isrc-at-link-time.md).
