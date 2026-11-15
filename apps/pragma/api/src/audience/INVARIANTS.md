# Invariants of pragma, in `api/src/audience`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Audience suggestion

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

## Ballot

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

## Voting round

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
