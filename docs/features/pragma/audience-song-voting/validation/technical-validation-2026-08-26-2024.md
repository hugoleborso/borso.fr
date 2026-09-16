# Technical validation — The room picks the next song

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head sha | `c8d33127a5c56484f119199118d2cfb03bdbac25` |
| Base ref | `origin/main` |
| Workspace | `@borso-app/pragma` |
| Date | 2026-08-26 |
| **Verdict** | **FAIL — 8 rows** |

## Preamble

The diff is 83 files, 5601 insertions, 321 deletions. The plan is present and complete, so
no row is UNVERIFIABLE for want of one.

Five spec assertions are browser-runtime and belong to `/visual-validation`, not to this
report: the page rendering at 375 px and at 1280 px, the count moving after a tap, the
countdown reaching zero on a wall clock, the QR code being scannable, and the public page
being driven in a context with no session cookie. They are not tagged here.

Every gate the plan lists ran on this checkout and every one of them is green, including the
full suite at 100% per-file coverage. The eight failures below are not gate failures. They are
four spec assertions the code does not carry, one refusal that answers with the wrong reason,
and three tests that the spec named and that the branch either does not have or has in a form
that cannot fail for the reason it claims to test.

The linter here is ESLint plus Prettier per [ADR-0007](../../../../adr/0007-eslint-with-type-aware-rules-replaces-biome.md).
Biome is not in this repository and no command below names it.

### The two rules the spec asked for a specific pass on

Both hold.

**No refetch on a mutation carrying `onMutate`.** `git diff origin/main...HEAD | grep -n
"invalidateQueries\|refetchQueries"` returns nothing across the whole diff. `useCastVote`
(`apps/pragma/site/src/lib/queries/audience.queries.ts:113-140`) and `useRetractVote`
(`:143-170`) each carry `onMutate` plus an `onError` rollback and settle from nothing else;
neither has an `onSettled`. `useSuggestSong` (`:179-196`) is the insert case and reconciles
from its own response through `addSuggestedSongToPool` in `onSuccess`, which is
`query-optimistic-insert` rather than an exception. The two `refetch()` calls in the diff are
the spec's refresh control on a button's `onClick`
(`apps/pragma/site/src/routes/vote/VotePage.tsx:40` and `:79`), not a mutation settling.

**No `useEffect` where the countdown can be derived during render.** `git diff
origin/main...HEAD | grep -n "useEffect"` matches only prose inside the plan and the spec; no
source file in the diff contains the word. `VoteCountdown`
(`apps/pragma/site/src/components/molecules/VoteCountdown.tsx:24-33`) reads a one-second
external store through `useSyncExternalStore` and computes `secondsLeft` and `fillPercent`
during render. The store
(`apps/pragma/site/src/components/molecules/vote-countdown.store.ts:32-40`) starts its
interval on the first subscriber and clears it on the last, and
`VoteCountdown.test.tsx:39-46` pins the clear by spying on `clearInterval` across an unmount.

---

## A. Correctness against the spec

| # | Spec assertion | Verdict | Evidence |
|---|---|---|---|
| A1 | Q1 — the pool is the `concert_ready` catalogue songs absent from every **manual** setlist of this concert, plus every song suggested at this concert whatever its status, minus earlier winners | PASS | `apps/pragma/api/src/audience/pool.core.ts:43-56`: a previous winner returns `false` first, a suggested song returns `true` next, and a catalogue song needs `isConcertReady && !isAlreadyPlannedTonight`. The manual set comes from `listManualSetlistSongIdsOfSession` (`apps/pragma/api/src/setlists/setlists.repository.ts:83-97`), whose `where` carries `or(isNull(setlistTable.kind), ne(setlistTable.kind, AUDIENCE_CHOICE_SETLIST_KIND))`. |
| A2 | Q2 — one vote per song, unlimited songs, per round | PASS | The primary key `("round_id","ballot_token","song_id")` in `apps/pragma/api/src/database/migrations/0004_audience_voting.sql:36`, restated in `audience.schema.ts:23-28`. No application check duplicates it. `audience.controller.test.ts:281-284` casts three votes from one ballot and a fourth from another. |
| A3 | Q3 — live ranking with visible counts | PASS | `apps/pragma/api/src/audience/pool.core.ts:34-40` tallies from rows; `PoolSongRow.tsx:70-76` renders the number in a `Badge`. No counter column exists: `grep -rn "vote_count" apps/pragma/api/src/database/migrations/` returns nothing. |
| A4 | Q4 — a thirty-second round opened by the band, closing on one winner appended as one entry | PASS | `ROUND_DURATION_MS = 30_000` declared once at `apps/pragma/api/src/audience/round.core.ts:1` and consumed only through `selectRoundClosesAt` (`:34-36`). `audience.controller.test.ts:304-349` waits the real thirty seconds and asserts `songCount` is `[1]`. |
| A5 | Q5 — votes anchor on the concert, never on a setlist | PASS | `voting_round.session_id` and `audience_suggestion.session_id` in the migration; `grep -n "setlist" apps/pragma/api/src/audience/audience.schema.ts` returns nothing. |
| A6 | Q6 — among songs sharing the top count, the winner is the one whose latest surviving vote is earliest | PASS (code) | `apps/pragma/api/src/audience/round.core.ts:85-91`: count descending, then `latestVoteAt` ascending, then `songId` ascending so the function is total. `buildStandings` (`:52-64`) recomputes from the votes passed in, so a deleted row simply is not there. The test that must pin the retraction half of this rule is D2 below. |
| A7 | Q7 — no votes at the close is a blank round, nothing appended, and another round may open | PASS | `round.core.ts:101` returns `blank`; `selectSettlementWrite` (`:71-83`) claims the round with `winningSongId: null`; `audience.service.ts:142` returns before the append when the winner is null. |
| A8 | Q8 — only a picked search result is stored, never free text | PASS | `audience.schema.ts:54-56` is `z.object({ mbid: … }).strict()`. `audience.controller.test.ts:222-231` posts a body carrying `title` and asserts 400. |
| A9 | Q9 / ADR-0015 — MusicBrainz stays the source, its cache moves to a shared table, a throttled response surfaces as a typed error | PASS | `grep -n "new Map" apps/pragma/api/src/songs/musicbrainz.adapter.ts` returns nothing. `searchExternal` returns `{ kind: 'unavailable', status }` on a non-ok response (`musicbrainz.adapter.ts:63`). `songs.service.ts` reads `findFreshCachedSearch` first and upserts on success. The `adapter-rate-limited-fetch` blueprint description was rewritten in the same file (`musicbrainz.adapter.ts:41-47`) and now states both new facts. |
| A10 | Q10 — a winning suggestion lives as a catalogue song with status `idea`, resolved on `mbid` when already known | PASS (code) | `audience.service.ts:301-306` looks the `mbid` up in the catalogue first; `:279-297` creates with `status: 'idea'` carrying `mbid`, `album`, `durationSeconds`, `isrcs` and `tags`. Untested — see D8. |
| A11 | Q11 — one second while a round is open, nothing at rest, plus a refresh control | PASS | `audience.queries.ts:87` passes `refetchInterval: (query) => selectPollInterval(query.state.data?.state.round)`, derived from the last response, and `audience.utils.ts:47-51` returns `false` when the round is absent or shut. `audience.utils.test.ts` covers all three arms. |
| A12 | Q12 — the audience-choice setlist is created at the opening of the first round | PASS | `audience.service.ts:104` calls `findOrCreateAudienceChoiceSetlist` inside `openRound`. `audience.controller.test.ts:178-195` asserts the concert has no setlist before and exactly one of kind `audience_choice` after. |
| A13 | Q13 — the validator waits the real thirty seconds; no duration parameter, no server-side clock switch | PASS | No duration parameter appears in the diff: `ROUND_DURATION_MS` is a module constant with no override path, and `openRound` takes only `sessionId` and `now`. `audience.controller.test.ts:324` is a real `setTimeout` of 30 000 ms with a 90 000 ms test timeout. |
| A14 | Q14 / ADR-0016 — `qrcode.react` renders the QR code from exactly one file | PASS | `grep -rn "qrcode.react" apps/pragma/site/src` matches only `components/atoms/VoteQrCode.tsx:4`. `pnpm exec knip` exits 0, so the dependency is seen as used. |
| A15 | Result — the vote page at `/vote` and `/vote/:sessionId`, public, outside `RequireSession` | PASS | `apps/pragma/site/src/App.tsx` declares both routes as siblings of `/login`, before the `<Route element={<RequireSession />}>` element. `App.test.tsx:28-40` renders the application at `/vote` with no session and asserts the sign-in field is absent. **Stage:** this is a client-router property and holds in every stage; it says nothing about how the browser reaches `/api` — see U2. |
| A16 | Result — "The band's panel, **inside the setlist editor and the concert page**" | **FAIL** | `grep -rn "VotingRoundPanel" apps/pragma/site/src` returns one render site, `routes/sessions/SessionDetailPage.tsx:201`. `SetlistEditor.tsx` exists at `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` and does not import it. The plan named both placements too (`plan.md:101`, "rendered from `SetlistEditor.tsx` and from the concert view"). One of the two entry points the spec promised the band is not there, and nothing in the branch records the placement being dropped. |
| A17 | Result — audience suggestions read as not necessarily concert-ready, from the song's own status and no separate flag | PASS | `PoolSongRow.tsx:9-21` indexes a frozen key table by `status`; `AudienceVoteList.tsx:69-77` passes `status` and never passes `isSuggestion`. `SONG_STATUSES` is `['idea','wip','rehearsed','concert_ready']` (`songs.schema.ts:5`), so the three non-ready statuses are all covered. |
| A18 | Edge case — "The visitor arrives with an expired or unknown ballot token. **A fresh one is minted** and the old votes are not recovered" | **FAIL** | `requireBallot` answers 401 on a token that is not well formed (`open-ballot.middleware.ts:13-15`). Nothing on the front end reacts to that 401. `useBallot` (`audience.queries.ts:46-64`) returns the remembered value with `staleTime: Number.POSITIVE_INFINITY` and never re-mints. `forgetBallotToken` (`site/src/lib/ballot-token.adapter.ts:26-28`) is the function that would clear the stale value, and `grep -rn "forgetBallotToken" apps/pragma/site/src` finds one definition and one call, in its own test (`ballot-token.adapter.test.ts:30`). It has no production caller. The plan's row for this edge case (`plan.md:125`) reads "the front end mints a new one and retries once — component test asserts one retry and no loop"; neither the retry nor the test exists. |
| A19 | Edge case — the short `/vote` address resolves to the one concert with an open round, and to nothing otherwise, never guessing from the calendar | PASS | `findConcertWithOpenRound` (`audience.repository.ts:122-130`) filters on `settled_at IS NULL AND closes_at > now` with no date predicate. `resolveShortAddress` (`site/src/routes/vote/live-concert.core.ts:16-21`) returns `no-concert-live` on null or undefined. `audience.controller.test.ts:246-259` asserts null at rest and the concert id during a round. |
| A20 | Edge case — the round stays unsettled until the next read settles it, there is no scheduler, and settlement is idempotent | PASS | No scheduler exists: `grep -rn "setInterval\|cron\|schedule" apps/pragma/api/src/audience/` returns nothing. `readConcertState` settles first (`audience.service.ts:173`) and then re-reads. Idempotency is a conditional claim, not a read-then-write: `hasClaimedRoundForSettlement` (`audience.repository.ts:147-159`) is one `UPDATE … WHERE id = … AND settled_at IS NULL … RETURNING id` and only the caller that got a row appends, inside the same transaction as the append (`audience.service.ts:134-144`). Pinned twice: `round.core.test.ts:70-80` at the pure level, and `audience.controller.test.ts:326-340`, which fires two `GET /state` with `Promise.all` past the close and asserts `songCount` is `[1]`. |
| A21 | Edge case — a suggestion arriving mid-round joins the pool of the round in progress and is votable immediately | PASS | `readConcertState` calls `readConcertPool` on every request (`audience.service.ts:175`), which re-reads `listSuggestedSongIdsOfConcert` each time. No caching sits in front of it. |
| A22 | Edge case — a song suggested while already in a manual setlist for tonight is refused | PASS (code) | `acceptSuggestion` (`audience.service.ts:312-316`) reads the same manual set the pool uses and returns `refuse('song-already-planned')`, mapped to 409 at `audience.controller.ts:37`. Untested — see D7. |
| A23 | Error cases — each refused with its own status, never silently dropped | **FAIL** | Six of the seven refusals are right: `not-a-concert` 422, `round-already-open` 409, `song-not-in-pool` 422, `song-already-planned` 409, `unknown-suggestion` 422, `external-search-unavailable` 503 (`audience.controller.ts:32-40`). The defect is the seventh. A duplicate vote — the same ballot casting the same song twice — is answered as `round-closed`: `audience.service.ts:232` reads `if (write === 'already-present') return refuse('round-closed');`. The status 409 is right and `audience.controller.test.ts:282` asserts it, but the reason in the body is a statement that is not true, and the spec's *Zero-defect strategy* defines an alert on exactly this reason — "`RoundClosedError` … alert only if it exceeds a third of the votes in a round, which would mean the countdown shown to the room is wrong". Duplicate taps are the ordinary case at a concert, so this branch poisons the one signal the spec built to tell the band their countdown is wrong. A `duplicate-vote` member of `AUDIENCE_REFUSALS` mapped to the same 409 is the fix. |
| A24 | Production strategy — the seven named events (`audience_ballot_minted`, `audience_vote_cast`, `audience_vote_retracted`, `audience_suggestion_accepted`, `audience_round_opened`, `audience_round_settled`, `audience_round_blank`) | UNVERIFIABLE | `grep -rn "audience_ballot_minted\|audience_vote_cast\|audience_round_settled" apps/pragma/` outside `docs/` returns nothing, and `grep -rln "analytics\|track(" apps/pragma/api/src` returns nothing at all, so the application has no event substrate to emit them into. The plan never projected these events onto a file either — no row in *Files to change* mentions them. This is a spec-to-plan gap rather than an implementation defect, and the operator decides whether the events ship in this pull request or the spec's Analytics section is amended. |
| A25 | Production strategy — "Ballots per round against the concert's `capacity`, **reported per concert on the band's panel**" | **FAIL** | The API computes both: `countBallots` (`audience.service.ts:155-157`) and `capacity` are returned in `ConcertVoteState` (`audience.types.ts:40-46`), and `audience.controller.test.ts:243` asserts `capacity` comes back as 120. The panel renders neither: `grep -n "ballotCount\|capacity" apps/pragma/site/src/components/organisms/VotingRoundPanel.tsx` returns nothing, and no other component reads them. The single input metric the spec attaches to the output metric is computed, shipped over the wire, and then dropped on the floor. |
| A26 | Zero-defect strategy — the existing IP-hash rate limiter is reused, not re-implemented | PASS | `audience-search-limit.middleware.ts:2-9` imports `hashIp`, `readClientIp`, `createBucketStore`, `recordAttempt` and `isRateLimited` from `../auth/`. `audience.controller.test.ts:205-220` drives one address past the budget and asserts 429. |

## B. Code cleanliness against the repo rules

| # | Rule | Verdict | Evidence |
|---|---|---|---|
| B1 | `pnpm exec eslint --max-warnings 0` on every changed source file | PASS | Ran on the 68 changed `.ts`/`.tsx`/`.js` files. No error, no warning. |
| B2 | `pnpm exec prettier --check` on every changed file, markdown excluded | PASS | "All matched files use Prettier code style!" over the changed set minus `*.md` and the `.sql` migration, which Prettier has no parser for. |
| B3 | `pnpm --filter @borso-app/pragma run typecheck` | PASS | `tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`, no output. |
| B4 | `pnpm --filter @borso-app/pragma run build` | PASS | `✓ built in 4.18s`. |
| B5 | `pnpm exec knip` | PASS | Exit 0. |
| B6 | No `useEffect` in the diff | PASS | See the specific pass above. |
| B7 | No mutation carrying `onMutate` invalidates or refetches | PASS | See the specific pass above. |
| B8 | No type assertion beyond `as const`, no `any` | PASS | `git diff origin/main...HEAD \| grep -nE "^\+.* as [A-Z]"` matches only prose in the plan and a mermaid `participant` line. `satisfies` is used instead at `audience.controller.ts:40`. |
| B9 | No `.core.ts` calls `new Date()`; `now` is always a parameter | PASS | `grep -rn "new Date()" apps/pragma/api/src/audience/*.core.ts apps/pragma/site/src/**/*.core.ts` returns nothing. `round.core.ts:35` constructs a date from an argument, which is deterministic. Every `new Date()` in the slice sits in `audience.controller.ts`, the composition point. |
| B10 | Back-end domain is a vertical slice with the layered triad, no horizontal aggregator | PASS | `apps/pragma/api/src/audience/` holds `audience.controller.ts`, `audience.service.ts`, `audience.repository.ts`, `audience.schema.ts`, `audience.types.ts`, two `.core.ts`, one `.utils.ts` and two `.middleware.ts`. No `domain/`, `controllers/`, `services/` or `routes/` folder is added. `borso/no-database-client-outside-repository` and `borso/no-cross-slice-repository-imports` both pass, and `grep -rn "musicbrainz\|search-cache" apps/pragma/api/src/audience/` returns nothing, so the search façade really is a façade. |
| B11 | Controllers are dispatchers | PASS | Every handler in `audience.controller.ts` validates, calls one service function, and maps the outcome through one frozen table. No `.filter()`/`.map()`/`.reduce()` over domain data. |
| B12 | Magic numbers and strings are named | PASS | `ROUND_DURATION_MS`, `MILLISECONDS_PER_SECOND`, `BALLOT_TOKEN_BYTES`, `HEXADECIMAL_RADIX`, `AUDIENCE_SEARCH_BUDGET`, `EXTERNAL_SEARCH_CACHE_TTL_MS`, `OPEN_ROUND_POLL_INTERVAL_MS`, `TICK_INTERVAL_MS`, `BALLOT_KEY_PREFIX`, `QR_CODE_SIZE_PX`. |
| B13 | No comments in source; the machine-read annotations stay | PASS | `borso/no-comments` is clean on the diff. The SQL header in `0004_audience_voting.sql:1-21` is not linted here and follows the precedent set by `0001`, `0002` and `0003`, each of which opens with the same kind of header. |
| B14 | Styling is inline Tailwind, no `.css` file added | PASS | No `.css` file in the diff; every new component carries classes inline and `sm:`/`lg:` prefixes on the layout-bearing ones (`VotingRoundPanel.tsx:38` is `grid-cols-1 lg:grid-cols-[1fr_auto]`). |
| B15 | Every visible string goes through i18n, both catalogues in parity | PASS | 25 keys added to each of `en.json` and `fr.json`; the parity test is part of the green core suite, and `borso/no-literal-jsx-text` is clean. |
| B16 | Atomic design buckets, and query hooks no lower than an organism | PASS | New atom `VoteQrCode`, molecules `PoolSongRow` and `VoteCountdown`, organisms `AudienceVoteList`, `SuggestSongField`, `VotingRoundPanel`. `borso/no-query-hooks-outside-organisms` passes. **Divergence from the plan, resolved in favour of the repo rule:** `plan.md:98` says `VotePage.tsx` "calls no query hook itself"; it calls three (`VotePage.tsx:23,50,52`). The lint rule only bars atoms and molecules (`eslint-rules/no-query-hooks-outside-organisms.js:10`), and CLAUDE.md puts data-fetching on routes explicitly. The code is right and the plan's reason for the constraint was wrong. |
| B17 | Every new file under `apps/` carries a blueprint marker naming a blueprint that exists | PASS | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` — "Annotations are complete and the index is up to date", 163 blueprints, 1016 followers over 1082 files. |
| B18 | Every new file ends in a suffix that names its layer; the `layer-marker:pragma` budget does not increase | PASS | `pnpm exec tsx scripts/standards/convention-drift.ts --check` — "No question gained a new answer." |
| B19 | `@DependsOnExternal` resolves against the manifest, both directions | PASS | `pnpm exec tsx scripts/architecture/architecture-graph.ts --check` — pragma 296 files across 4 levels and 15 slices, no refusal. |
| B20 | Vocabulary entries land with the folders they name | PASS | `./scripts/check-vocabulary-paths.sh` — "every term names a folder that exists and cites no comment". Three sections added: *Voting round*, *Ballot*, *Audience suggestion*, plus a `kind` paragraph under the setlist entry. |
| B21 | Migration is DSQL-compatible | PASS | `./scripts/check-migration-sql-dsql-compat.sh` exits 0. `ALTER TABLE "setlist_sheet" ADD COLUMN "kind" text;` carries no `NOT NULL` and no `DEFAULT`, the Drizzle column is bare `text('kind')` (`setlists.schema.ts`), the indexes are emitted plain, and no business column carries `DEFAULT now()`. |

## C. Tests pass

`pnpm --filter @borso-app/pragma run test:coverage` — both projects, `core` and `back-e2e`,
against the Postgres `scripts/local-postgres.sh` boots.

```
Test Files  140 passed (140)
     Tests  1299 passed (1299)
  Duration  182.81s

Statements   : 100% ( 1777/1777 )
Branches     : 100% ( 889/889 )
Functions    : 100% ( 441/441 )
Lines        : 100% ( 1513/1513 )
```

The per-file 100% threshold applies to `api/src/**/*.{core,utils,adapter,schema}.ts` and
`site/src/**/*.{core,utils,adapter}.ts` (`apps/pragma/vitest.config.ts`), so every new pure
file in this diff is covered on all four counters. Each of the five new files carrying a gated
suffix has a sibling test that the runner picks up: `round.core.test.ts`, `pool.core.test.ts`,
`ballot-token.utils.test.ts`, `audience.schema.test.ts`, `live-concert.core.test.ts`,
`vote-countdown.utils.test.ts`, `suggest-song.core.test.ts`,
`voting-round-panel.core.test.ts`, `audience.utils.test.ts` and `ballot-token.adapter.test.ts`.

Nothing in `infra/cdk/**` or `infra/shared/**` changed, so those coverage gates are untouched.

**Category C is PASS.** It is separate from category D, and a green suite at 100% coverage is
not evidence that the spec's cases are the ones being exercised — three of them are not.

## D. Test coverage of what the spec asks

The spec's *Test strategy* names the cases that must be pinned. Each row below is one of them.

| # | Case the spec names | Verdict | Evidence |
|---|---|---|---|
| D1 | "the tie broken on the earliest latest-surviving vote" | PASS | `round.core.test.ts:101-113`, *"breaks a tie on the song whose latest surviving vote is the earliest"*. Riff at :01 and :04, Ballad at :02 and :09, two votes each, Riff wins. |
| D2 | "**the same tie after a retraction reshuffles it**" | **FAIL** | `round.core.test.ts:115-127` is named *"reshuffles the same tie once a retraction removes the vote that had decided it"* and removes no vote. It passes four votes where the previous test passed four votes, with Riff's second timestamp moved from `20:00:04` to `20:00:12`. A retraction deletes a row, so the input to `settleRound` after one is a **strictly smaller** vote list, and no test in the branch ever calls `settleRound` with a subset of a list it called it with before. The property the spec states — "a song that briefly led and lost its supporters does not keep that lead" — is a count changing, and this test holds the count fixed at two apiece, so what it actually re-pins is D1's rule under a second set of timestamps. The fix is one test: settle `[Riff@:01, Riff@:04, Ballad@:02, Ballad@:09]`, then settle the same list minus `Riff@:01`, and assert the winner moved from Riff to Ballad. |
| D3 | "the blank round" | PASS | `round.core.test.ts:82-86`, plus `selectSettlementWrite({ kind: 'blank' })` at `:158-163`, plus `audience.controller.test.ts:342-346` reopening a round after a settled one. |
| D4 | "a settlement that runs twice and changes nothing" | PASS | `round.core.test.ts:70-80` at the pure level and `audience.controller.test.ts:326-340` at the integration level, the latter firing two concurrent `GET /state` past the close and asserting one setlist entry. This is the strongest row in the branch. |
| D5 | "a vote arriving one millisecond after `closesAt`" | PASS | `round.core.test.ts:61-68`, and the boundary itself at `:35-38` — open at `closesAt - 1ms`, shut at `closesAt`. |
| D6 | "`pool.core.ts` must pin that a manual setlist excludes a song…" | PASS | `pool.core.test.ts:53-55`, *"leaves out a concert-ready song already in a manual setlist attached to this concert"*. |
| D7 | "…**and the audience-choice setlist does not**" | **FAIL** | `pool.core.test.ts:57-59` is named *"keeps that same song when the setlist holding it is the audience-choice one"* and its body is `poolOf({ catalogSongs: [RIFF], manualSetlistSongIds: EMPTY })` — byte for byte the same assertion as `:45-47`, which already pins that a song with an empty manual list is in the pool. No audience-choice setlist appears in it, because `selectPool` has no input that could carry one. The rule under test lives in the repository, in the `or(isNull(kind), ne(kind, AUDIENCE_CHOICE_SETLIST_KIND))` predicate of `listManualSetlistSongIdsOfSession` (`setlists.repository.ts:93`), and nothing exercises that predicate: `grep -rn "listManualSetlistSongIdsOfSession\|getManualSetlistSongIdsOfSession" apps/pragma --include=*.test.ts` returns nothing. The settlement test cannot stand in for it either — there the winner leaves the pool through the `previousWinnerSongIds` rule, which is the exact confusion the spec wrote its pool paragraph to correct. No test in the branch puts a manual setlist and an audience-choice setlist on the same concert, which is the only arrangement in which that predicate does any work. The plan's own risk register (`plan.md:170`) names this test as the sole detection for that risk. The fix is a back-e2e test: open a round, settle it so a song lands in the audience-choice setlist, and assert a **second** concert-ready song that sits only in that setlist is still in the pool — or, more directly, seed one setlist of each kind on a concert and assert the manual one's song is out and the audience-choice one's song is in. |
| D8 | Edge case — "a suggestion naming a song already in the catalogue resolves to that song rather than creating a second one, matched on `mbid`" | **FAIL** | No test exists. `grep -rn "acceptSuggestion" apps/pragma --include=*.test.ts` returns nothing, and the only request that reaches the route is `audience.controller.test.ts:111-115`, which posts `{ mbid: 'mb-unknown' }` inside the ungated-access sweep and asserts only `not 401`. That assertion passes on a 500. `resolveSuggestedSong` and `importSuggestedSong` (`audience.service.ts:274-306`) are therefore entirely unexercised, including the `status: 'idea'` write and the fifteen-field song creation, which is the mechanism [ADR-0015](../../../../adr/0015-musicbrainz-stays-the-song-search-source.md) exists to protect. The plan asked for two tests here (`plan.md:61`): one asserting the catalogue count is unchanged for a known `mbid`, one asserting a new song with status `idea` for an unknown one. |
| D9 | Edge case — "a song suggested while already in a manual setlist for tonight is refused" | **FAIL** | No test asserts the 409. `grep -rn "song-already-planned" apps/pragma --include=*.test.ts --include=*.test.tsx` returns nothing. The plan named it a back-e2e self-check (`plan.md:123`). |
| D10 | Error case — a vote on a closed or already-settled round is refused with a conflict | PASS | `audience.controller.test.ts:282` asserts 409, though for the duplicate-vote path rather than the closed-round path — see A23 for why that overlap is itself the defect. `readOpenRound` (`audience.service.ts:203-208`) refuses both a missing round and a shut one. |
| D11 | Error case — a vote on a song outside the current pool is refused | PASS | `audience.controller.test.ts:285` asserts 422. |
| D12 | Error case — the upstream search is throttled and the visitor sees a stated failure, not an empty list | PASS | Both ends are pinned. `musicbrainz.adapter.test.ts` asserts a non-ok upstream yields the `unavailable` arm rather than an empty array, and `SuggestSongField.test.tsx:36-47` asserts that on a 503 the field renders the "song search is unavailable" alert **and** that the "Nothing found" line is absent — the precedence the `core-message-selection` blueprint exists for. |
| D13 | Error case — a round opened on a `practice` session is refused | PASS | `audience.controller.test.ts:145-161` asserts 422. |
| D14 | Error case — two members opening a round at the same instant, the second refused | PASS (sequential only) | `audience.controller.test.ts:163-176` asserts 201 then 409 in sequence. The plan asked for two `POST /rounds` fired with `Promise.all` (`plan.md:121`); the sequential form does not exercise the DSQL serialization-failure branch the plan reasons about. Not a FAIL — the spec's assertion is "the second is refused while one is open", which is what this pins — but the concurrent case remains unproven. |
| D15 | "The public routes are tested without a session cookie, which no existing controller test does" | PASS | `audience.controller.test.ts:94-128` drives all six public routes and both gated routes through `createApp()` with no cookie and asserts `not 401` on the six and `401` on the two. This is the strongest defence in the branch against the mount-order hazard, and it is built at the composition root rather than on the routers in isolation, which is what the plan required. |
| D16 | Ballot token is opaque, server-minted, and keyed by concert | PASS | `ballot-token.utils.test.ts` at 100%; `ballot-token.adapter.test.ts:21-26` asserts two concerts read back two tokens; `grep -n "userAgent\|fingerprint\|ip" apps/pragma/site/src/lib/ballot-token.adapter.ts` returns nothing. |

## UNVERIFIABLE rows

| # | Row | Why it is out of reach here |
|---|---|---|
| U1 | A24 — the seven named analytics events | The application has no event substrate at all and the plan never projected the events onto a file. This is a spec-to-plan gap, not something the diff can be measured against. Recommend the operator either adds them to the plan or amends the spec's Analytics section. |
| U2 | Whether a browser on the public vote page can actually reach `/api/audience` **in the preview stage** | Not verified from here, and the answer differs by stage. In **prod**, `VITE_API_BASE` is unset, so `api.client.ts:5-8` resolves the base to `/` and every audience call is same-origin — no preflight, no CORS. In **preview**, `.github/workflows/preview.yml:103` bakes `VITE_API_BASE: https://pragma-pr-<n>-api.preview.borso.fr` while the site serves from `pragma-pr-<n>.preview.borso.fr`, so every call is cross-origin against `app.ts:32`'s bare `cors()`. Two things follow that only a browser can settle. The new `x-ballot-token` header makes every vote, retraction and suggestion a preflighted request; hono 4.12.18 reflects `Access-Control-Request-Headers` back when `allowHeaders` is empty (`hono/dist/middleware/cors/index.js:60-67`), so the header itself should be allowed. But `cors()` is called with no `credentials`, so it answers `Access-Control-Allow-Origin: *` with no `Access-Control-Allow-Credentials`, while `api.client.ts:26` sets `credentials: 'include'` on every request. That combination is one browsers refuse. This is pre-existing configuration that the diff does not touch, and it may already be handled by the preview CDN. `/visual-validation` must drive the public page on the **preview** URL, not on `pnpm dev`, or this stays unknown. |

## Verdict

**FAIL — 8 rows: A16, A18, A23, A25, D2, D7, D8, D9.**

Not mergeable. Four are code (a missing entry point, a ballot that can never recover, a
refusal that names the wrong reason, an input metric computed and then dropped) and four are
tests the spec named explicitly, two of which exist under the right name with a body that
cannot fail for the stated reason.

The two rules the spec singled out for a specific pass — no refetch beside `onMutate`, and no
`useEffect` where the countdown can derive during render — both hold cleanly, and settlement
idempotency is the best-defended property in the branch, pinned at both the pure and the
integration level. The shape of what is wrong here is narrower than the shape of what is
right: a green suite at 100% coverage is exactly the condition under which D2 and D7 are
invisible, because both tests pass, both are named for the case the spec asked for, and
neither test's body sets up the situation its name describes.

Two UNVERIFIABLE rows (U1, U2) go in the pull request's *Validation gaps* section when the
eight failures are fixed and this validator is re-run.
