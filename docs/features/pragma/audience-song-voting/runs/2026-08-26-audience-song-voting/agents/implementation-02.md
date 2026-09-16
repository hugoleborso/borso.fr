---
status: done
summary: >-
  Closed the eight blockers from technical-validation-01 in two commits and
  changed nothing else. A duplicate vote now refuses as duplicate-vote rather
  than round-closed, so the RoundClosedError alert the spec hangs its countdown
  check on stays clean. Three tests that named a behaviour they did not exercise
  now exercise it, and acceptSuggestion, which had no test at all, gained three
  back-e2e rows. On the front end the band's panel reaches the setlist editor,
  a refused ballot is reminted and the write is sent once more, and the ballots
  against capacity the API already returned now reach the band. The pragma suite
  is 1314 tests green at 100% per-file coverage, with eslint, prettier, knip,
  typecheck and build clean.
artifacts:
  - apps/pragma/api/src/audience/audience.types.ts
  - apps/pragma/api/src/audience/audience.controller.ts
  - apps/pragma/api/src/audience/audience.service.ts
  - apps/pragma/api/src/audience/audience.controller.test.ts
  - apps/pragma/api/src/audience/round.core.test.ts
  - apps/pragma/api/src/audience/pool.core.test.ts
  - apps/pragma/site/src/lib/queries/audience.queries.ts
  - apps/pragma/site/src/lib/setlist-index.core.ts
  - apps/pragma/site/src/lib/setlist-index.core.test.ts
  - apps/pragma/site/src/components/organisms/SetlistEditor.tsx
  - apps/pragma/site/src/components/organisms/VotingRoundPanel.tsx
  - apps/pragma/site/src/components/organisms/voting-round-panel.core.ts
  - apps/pragma/site/src/components/organisms/voting-round-panel.core.test.ts
  - apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx
  - apps/pragma/site/src/routes/vote/VotePage.test.tsx
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
next:
  kind: validate
---

# Implementation, fix round two

A fix round on `claude/concert-sound-voting-c7r8w7`, scoped to the eight rows
`technical-validation-01` failed the branch on. Nothing outside those rows moved.

## What each row became

**A23, the duplicate vote that lied about why it was refused.** `castVote`
answered `refuse('round-closed')` when the primary key on `audience_vote`
rejected a second identical row. The status was right and the reason was not,
and the spec's zero-defect strategy alerts when `RoundClosedError` passes a
third of a round's votes, treating that as the countdown shown to the room being
wrong. A second tap is the ordinary thing a person does at a concert, so that
branch was going to keep the alert permanently lit. `duplicate-vote` is now a
member of `AUDIENCE_REFUSALS` mapped to the same 409, so no client sees a
different status and the two causes are separable in the logs. The back-e2e row
that already asserted the 409 now reads the body and asserts the reason.

**D2, the retraction test that retracted nothing.** It passed four votes where
the test above it passed four, with one timestamp moved. A retraction deletes a
row, so the input after one is strictly smaller. The test now builds one list,
settles it, removes exactly one vote from it, asserts the list shrank by one,
and asserts the winner moved from Riff to Ballad.

**D7, the pool rule nothing detected.** The pure case claiming to pin that the
audience-choice setlist does not exclude its own songs was byte-for-byte the
case above it, and it could not have been anything else: `selectPool` has no
input that could carry a setlist kind. The rule lives in the repository
predicate `or(isNull(kind), ne(kind, AUDIENCE_CHOICE_SETLIST_KIND))`. The pure
case now pins what that layer does decide, that the manual-setlist exclusion and
the previous-winner exclusion are separate rules, and the real detection is a
back-e2e row that puts a song in the audience-choice setlist and a different one
in a manual setlist on the same concert and asserts only the second leaves the
pool. Deleting the `kind` filter from the predicate fails that row; it was
checked by deleting it.

**D8 and D9, the suggestion path with no test.** `acceptSuggestion`,
`resolveSuggestedSong` and `importSuggestedSong` were reached only by the
ungated-access sweep, which asserts "not 401" and passes on a 500. Three rows
now cover them: a known `mbid` resolving onto the catalogue song with the
catalogue count unchanged, an unknown one importing exactly one song with status
`idea` carrying its MusicBrainz title, artist, album, duration, ISRCs and tags,
and a song already in tonight's manual setlist refused 409 with reason
`song-already-planned`. The import row stubs the global fetch with a MusicBrainz
recording payload, which is the only outbound call in the path.

**A16, the panel that existed in one place.** The spec puts the band's panel
inside the setlist editor and the concert page; only `SessionDetailPage`
rendered it. `SetlistEditor` now takes `concertSessionId` and renders
`VotingRoundPanel` below the list. `selectConcertSessionId` picks the concert
from the sessions the setlist is attached to, skipping practices and taking the
latest when there are two, and is covered at 100% as a `.core.ts`.

**A18, the ballot that could not be replaced.** The middleware answers 401 on a
token it does not recognise and nothing reacted: `useBallot` served the
remembered value with `staleTime: Infinity`, and `forgetBallotToken` had one
caller, its own test. Every write carrying a ballot now goes through
`sendCarryingABallot`, which sends once, and on that one status forgets the
token, mints a fresh one, publishes it to the ballot query so the next write
does not hand back the dead one, and sends again exactly once. The retry is a
second call rather than a loop or a `retry` option, so two requests is the
ceiling the code shape enforces. Two component tests pin it: one asserts the
first write carried the stale token and the second the fresh one, the other
asserts a server refusing both stops at two writes and one mint. Both fail if
the retry branch is removed; that was checked.

**A25, the input metric that never arrived.** `countBallots` and `capacity`
were computed, returned in `ConcertVoteState` and asserted in a controller test,
and no component read either. The spec names ballots per round against the
concert's capacity as an input metric reported per concert on the band's panel.
`selectParticipation` divides the two, returns a null share rather than dividing
by a null or zero capacity, and the panel renders one line, falling back to a
plain ballot count when the concert carries no capacity. Both strings are in
`en.json` and `fr.json`.

## What was deliberately not done

The spec's `VoteCountdown` on the setlist-editor copy of the panel polls the
same one-second state query as the concert-page copy when a round is open. Both
mount the same organism, so a band member with both screens open runs two polls.
That is the shape the plan asked for and no row failed it, so it stays.

## Gates

`pnpm exec eslint` clean with `--max-warnings 0` on every changed file,
`pnpm exec prettier --check` clean, `pnpm run typecheck` clean,
`pnpm run build` clean, `pnpm exec knip` clean, and the full pragma suite at
140 files / 1314 tests green with per-file coverage at 100% statements,
branches, functions and lines. The push gate ran the scoped mutation suite on
the changed pure files.
