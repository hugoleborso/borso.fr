# Technical validation — the room picks the next song, round four

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `4154470e8a8c62735429bd76c81eaed29e22f7d7` |
| Base | `origin/main` at `231bfc7b7600cbd8f0de18c93656249067a6803f` |
| Workspace | `@borso-app/pragma`, plus `@borso/infra` |
| Verdict | **PASS_EXCEPT_UNVERIFIABLE, two rows** |

## Preamble

Round three failed on one row, E1: the three public audience writes send the
custom request header `x-ballot-token`, and the HTTP API's CORS allow-list
carried `content-type` and `authorization` only. **That row is closed on this
sha** and is re-checked below against the code rather than against the fix
report.

Everything the browser has to show — the counter moving after a tap, the
countdown reaching zero, the winner appearing in the setlist, the two widths —
is routed to `/visual-validation` by the spec's *Test strategy*, which names five
flows to drive at 375 px and at 1280 px. Those are out of scope for this report
and carry no row here.

Every claim below names a file and a line I opened on this sha. Every gate below
was run in this session; none is quoted from a previous round.

## A — Correctness against the spec

| # | Spec assertion | Verdict | Evidence |
|---|---|---|---|
| A1 | The pool is the `concert_ready` catalogue songs absent from every **manual** setlist of this concert, plus every song suggested at this concert whatever its status, minus earlier winners | PASS | `pool.core.ts:43-55` takes the four sets and decides; a suggestion returns `true` before the status test, an earlier winner returns `false` before everything |
| A2 | The audience-choice setlist is deliberately not read by the pool rule | PASS | `setlists.repository.ts:90-95` builds the manual set with `or(isNull(kind), ne(kind, AUDIENCE_CHOICE_SETLIST_KIND))`, so a null `kind` on a pre-migration row reads as manual and the audience-choice sheet is excluded before `selectPool` sees anything |
| A3 | One vote per song, unlimited songs, per round | PASS | `0004_audience_voting.sql:36` declares `PRIMARY KEY("round_id","ballot_token","song_id")`; `audience.repository.ts:171-178` inserts `onConflictDoNothing` and the service maps `already-present` to `duplicate-vote` (`audience.service.ts:241`) |
| A4 | A round is thirty seconds, opened by a member, closing on at most one winner | PASS | `round.core.ts:1` `ROUND_DURATION_MS = 30_000`, used only by `selectRoundClosesAt` (`round.core.ts:34-36`), which `openRound` calls (`audience.service.ts:108`). `grep -rn "30_000\|30000" apps/pragma/api/src/audience/` returns the declaration and the test's arithmetic, no inlined call site |
| A5 | Votes anchor on the concert, never on a setlist | PASS | `audience.schema.ts:5-38`: `voting_round` and `audience_suggestion` carry `session_id`; `grep -n "setlist" apps/pragma/api/src/audience/audience.schema.ts` returns nothing |
| A6 | Tie: among the songs sharing the top count, the one whose latest **surviving** vote is earliest | PASS | `round.core.ts:85-92` `compareByWinningOrder` — count descending, then `latestVoteAt` ascending, then `songId`. `buildStandings` (`round.core.ts:52-63`) recomputes from the rows handed in, and `listVotesOfRound` reads the surviving rows on every call (`audience.repository.ts:162-168`). Test evidence in section C |
| A7 | No votes at the close is a blank round, nothing appended, and another round may open | PASS | `round.core.ts:101` returns `{ kind: 'blank' }` when no standing exists; `selectSettlementWrite` claims the round with `winningSongId: null` (`round.core.ts:74`); `settleIfDue` returns before `appendSongWithin` on a null winner (`audience.service.ts:142`) |
| A8 | A song that won an earlier round is out of the pool for the rest of the concert | PASS | `listWinningSongIdsOfConcert` (`audience.repository.ts:133-139`) feeds `previousWinnerSongIds`; the back-e2e settlement row asserts the pool is `['Ballad']` once Riff has won (`audience.controller.test.ts:624`) |
| A9 | A suggestion arriving mid-round joins the pool in progress and is votable immediately | PASS | `readConcertState` calls `readConcertPool` on every read (`audience.service.ts:175`), which re-reads suggestions each time (`audience.service.ts:78`). Pinned at `audience.controller.test.ts:585-591` |
| A10 | A suggestion naming a song already in the catalogue resolves onto it, matched on `mbid` | PASS | `resolveSuggestedSong` (`audience.service.ts:310-315`) finds on `song.mbid` before importing. `audience.controller.test.ts:539-560` asserts the catalogue count is unchanged |
| A11 | A song suggested while already in a manual setlist for tonight is refused | PASS | `audience.service.ts:326-327` refuses `song-already-planned`, mapped to 409 (`audience.controller.ts:42`). `audience.controller.test.ts:517-537` asserts 409 and the error name |
| A12 | A suggested song enters with its own status — `idea` for one the room invented | PASS | `importSuggestedSong` creates with `status: 'idea'` (`audience.service.ts:291`). `audience.controller.test.ts:576-586` asserts the status and the MusicBrainz columns survive |
| A13 | That status is what renders as "not necessarily concert-ready"; no separate flag | PASS | `PoolSongRow.tsx:11-21` indexes a frozen table by `status`; the chip renders only when `isNotConcertReady(status)`. `isSuggestion` reaches the row for nothing — the marker is derived from the status alone |
| A14 | Settlement is lazy on read, has no scheduler, and is idempotent | PASS | Section C1 |
| A15 | The short `/vote` resolves to the one concert with an open round, and to nothing otherwise; it never guesses from the calendar | PASS | `findConcertWithOpenRound` (`audience.repository.ts:122-130`) filters on `settled_at IS NULL AND closes_at > now` only — no session date, no `kind`. `live-concert.core.ts:16-21` returns `no-concert-live` on null. `audience.controller.test.ts:431-445` drives both arms |
| A16 | An unknown or expired ballot token gets a fresh one, and old votes are not recovered | PASS | `requireBallot` answers 401 on a malformed token (`open-ballot.middleware.ts:13-15`); `sendCarryingABallot` forgets, remints, republishes and sends **once** more (`audience.queries.ts:84-93`). Nothing restores earlier votes. Tests at `VotePage.test.tsx:183` and `:210` |
| A17 | A vote on a closed or already-settled round is refused with a conflict | PASS | `readOpenRound` refuses `round-closed` (`audience.service.ts:203-208`), mapped to 409. Two tests: a round nobody opened (`audience.controller.test.ts:251`) and one that genuinely settled (`:626-631`) |
| A18 | A vote on a song outside the current pool is refused | PASS | `audience.service.ts:232-234` refuses `song-not-in-pool`, mapped to 422 (`audience.controller.ts:41`); asserted at `audience.controller.test.ts:446` |
| A19 | A throttled upstream search is a stated failure, not an empty result list | PASS | `searchExternal` returns `{ kind: 'unavailable', status }` (`musicbrainz.adapter.ts:63`) instead of `[]`; the service passes the arm through (`songs.service.ts` `searchExternalSongs`), the controller maps it to 503 (`audience.controller.ts:44`), and `selectSuggestionOutcome` puts `audience.searchUnavailable` ahead of `audience.searchNoResults` (`suggest-song.core.ts:44,47`). Component test at `SuggestSongField.test.tsx:36` |
| A20 | A round on a `practice` session is refused | PASS | `audience.service.ts:101` refuses `not-a-concert`, mapped to 422; `audience.controller.test.ts:330-346` |
| A21 | A second round is refused while one is running on that concert | PASS (sequential) | `audience.service.ts:102-103`; `audience.controller.test.ts:348-360` asserts 201 then 409. The truly simultaneous case is U1 |
| A22 | Only a picked search result is stored, never free text | PASS | `suggestionCreateSchema` is `.strict()` and carries `mbid` alone (`audience.schema.ts:54-56`); `grep -n "title\|artist" apps/pragma/api/src/audience/audience.schema.ts` returns nothing. `audience.controller.test.ts:407` posts a body carrying a title and asserts the refusal |
| A23 | The MusicBrainz cache moves into a shared table; the adapter keeps its ranking and its rate slot | PASS | `grep -n "new Map" apps/pragma/api/src/songs/musicbrainz.adapter.ts` returns nothing; `search-cache.repository.ts` owns `external_search_cache`, `songs.service.ts` reads it, calls the adapter on a miss and upserts on success. `readCachedSearchHits` parses the stored JSON through a Zod schema (`musicbrainz.core.ts:168-173`) rather than through an assertion |
| A24 | The public search is a façade; the cache, the adapter and the ranking stay in the `songs` context | PASS | `grep -rn "musicbrainz\|search-cache" apps/pragma/api/src/audience/` returns only the `musicbrainz.core` **type** import and the `songs.service` calls (`audience.service.ts:9,13-14`). No repository and no adapter is reached across the slice boundary |
| A25 | The blueprint on `searchExternal` stops describing a module cache and a silent empty result | PASS | `musicbrainz.adapter.ts:45` now reads "Caching is deliberately not here" and "returns the `unavailable` arm of a union carrying the status". `expiredSearchCacheKeys` and `ExternalSearchCacheEntry` are deleted with their tests, and `check-pure-modules-have-callers.sh` is green |
| A26 | The audience-choice setlist is created at the opening of the first round, never at concert creation | PASS | `openRound` calls `findOrCreateAudienceChoiceSetlist` before inserting the round (`audience.service.ts:104`). `audience.controller.test.ts:363-372` asserts the concert has no setlist before the first round and one of kind `audience_choice` after |
| A27 | An audience-choice setlist refuses `renameSetlist`, on the server | PASS | `renameSetlist` returns `{ kind: 'not-renamable' }` (`setlists.service.ts:95`), mapped to 409; `audience.controller.test.ts:382-388` |
| A28 | `setlist_sheet.kind` stays nullable forever; the read side narrows to `manual` | PASS | `0004_audience_voting.sql:57` is `ADD COLUMN "kind" text` with no `NOT NULL` and no `DEFAULT`; the Drizzle column is `kind: text('kind')` with nothing chained (`setlists.schema.ts:17`); `resolveSetlistKind` lives in `setlists.core.ts:71-74` and defaults to `manual`. `check-migration-sql-dsql-compat.sh` is green |
| A29 | One vote is one row; no counter column anywhere | PASS | `grep -rn "vote_count" apps/pragma/api/src/` reaches only the read projection, computed by `tallyVotes` (`pool.core.ts:34-40`) and `buildPoolEntries` |
| A30 | The ballot token is opaque, server-minted, and never derived from anything about the person | PASS | `mintBallotToken` hex-encodes 24 random bytes handed in (`ballot-token.utils.ts:9-13`); the `randomBytes` call sits in the service (`audience.service.ts:1,49`). `grep -n "userAgent\|fingerprint\|ip" apps/pragma/site/src/lib/ballot-token.adapter.ts` returns nothing |
| A31 | The token is kept in local storage keyed by concert id | PASS | `ballot-token.adapter.ts` keys on `pragma.ballot.<sessionId>`; `ballot-token.adapter.test.ts:21` asserts two concerts read back two tokens |
| A32 | `/vote` and `/vote/:sessionId` sit outside `RequireSession` | PASS | `App.tsx:24-25` declares both as siblings of `/login`, above the `RequireSession` element. `App.test.tsx:28` renders `/vote` with no session and asserts the sign-in page does not appear |
| A33 | Polling is one second while a round is open, nothing at rest, plus a refresh control | PASS | `selectPollInterval` returns `false` for no round and for a closed one, `1_000` otherwise (`audience.utils.ts:47-51`), read from `query.state.data` rather than from a constant (`audience.queries.ts:116`). Both idle screens carry a refresh button (`VotePage.tsx:40,79`) |
| A34 | `qrcode.react` renders the QR code from exactly one file | PASS | `grep -rn "qrcode.react" apps/pragma/site/src` returns `VoteQrCode.tsx:4` only; `pnpm-workspace.yaml` carries the catalog entry and `apps/pragma/package.json` refers to it as `catalog:`. `pnpm exec knip` is silent |
| A35 | Ballot fraud is not defended against, and nothing describes it as prevented | PASS | The rate limiter's blueprint says "this bars a script, not a crowd" (`audience-rate-limit.middleware.ts:32`); `VOCABULARY.md` says "This is a bar, not an election, and nothing here prevents it" |
| A36 | Three new vocabulary entries land before the identifiers | PASS | `VOCABULARY.md` carries *Voting round*, *Ballot* and *Audience suggestion*, each naming `api/src/audience/`; `check-vocabulary-paths.sh` is green |

## B — The two rules the spec singled out

The spec's *Test strategy* asks for a specific pass on these two. Both hold, and
both are checked over the whole front end rather than over the diff, because a
rule that holds only in new files is a rule waiting to be broken next door.

### B1 — No refetch on a mutation carrying `onMutate`

`grep -rn "invalidateQueries\|refetchQueries" apps/pragma/site/src/lib/queries/audience.queries.ts
apps/pragma/site/src/lib/queries/audience.utils.ts` returns **nothing** — not a
direct call and not a helper in the same file.

The two mutations that carry `onMutate` are `useCastVote`
(`audience.queries.ts:160-174`) and `useRetractVote` (`:196-210`). Each cancels
the in-flight state query, snapshots it, writes the optimistic state through
`applyVoteToState`, and restores the snapshot in `onError`. Neither has an
`onSuccess` and neither has an `onSettled`, so nothing re-reads the row the
optimistic write just placed. The server truth arrives through the round's own
one-second poll, which is the cadence the spec ratified — not through a refetch
the mutation triggered.

The two writes that do reconcile carry no `onMutate` and settle from their own
response: `useSuggestSong` writes the returned song into the pool
(`:237-241`, `query-optimistic-insert`) and `useOpenRound` writes the returned
round into both caches (`:270-277`).

`applyVoteToState` is also correct in the two directions the rule exposes: it
returns the cache untouched when the tap would not change anything
(`audience.utils.ts:87`), so a double tap cannot drive the count off, and both
arms are pinned (`audience.utils.test.ts:104,109`).

### B2 — No `useEffect` where the countdown can be derived during render

`grep -rn "useEffect" apps/pragma/site/src` returns **nothing**. Not "none in the
diff" — none in the application.

`VoteCountdown` reads a one-second clock through `useSyncExternalStore`
(`VoteCountdown.tsx:24-28`) and computes `secondsLeft` and the bar fill during
render from `closesAtEpochMs` and that clock (`:29-33`). The store owns the
interval: it starts on the first subscriber and is cleared when the last leaves
(`vote-countdown.store.ts:17-39`), which `VoteCountdown.test.tsx:41` asserts so a
leaked interval cannot keep the jsdom suite alive. The store is a second one
rather than a faster `clock.store.ts`, because that store ticks once a minute for
several screens.

The short-address redirect is the other place an effect would have been reached
for. It is `<Navigate to={...} replace />` rendered from a decision the pure
`resolveShortAddress` returns (`VotePage.tsx:24-28`, `live-concert.core.ts:16-21`),
not a `navigate()` inside an effect.

## C — The three properties the brief named

### C1 — Round settlement is idempotent

Three layers, and each is pinned.

*The decision.* `settleRound` returns `already-settled` the moment
`round.settledAt !== null`, before it looks at a vote or at the clock
(`round.core.ts:95-96`). `selectSettlementWrite` maps both `already-settled` and
`still-open` to `{ shouldClaimTheRound: false, winningSongId: null }`
(`round.core.ts:71-75`), and `settleIfDue` returns on that
(`audience.service.ts:131`) — before it touches the setlist and before it opens a
transaction.

*The write.* The claim is one statement whose predicate is the unclaimed state:

```ts
// apps/pragma/api/src/audience/audience.repository.ts:153-158
const claimed = await executor
  .update(votingRoundTable)
  .set({ settledAt, winningSongId })
  .where(and(eq(votingRoundTable.id, roundId), isNull(votingRoundTable.settledAt)))
  .returning({ id: votingRoundTable.id });
return claimed.length > 0;
```

Only the caller that claimed appends (`audience.service.ts:141-143`), and the
claim and the append share one transaction the setlists slice lends out
(`setlists.repository.ts:203-207`, a real `getDatabase().transaction`), so a
failed append rolls the claim back and the next read retries rather than leaving
a round marked settled with a winner in no setlist.

*The tests.* `round.core.test.ts:70-81` settles the same inputs twice and asserts
the second answers `already-settled`. The back-e2e row waits the real thirty
seconds, fires two `GET /state` with `Promise.all`, and asserts the setlist holds
exactly one entry, that a late vote answers 409, and that a second round then
opens (`audience.controller.test.ts:594-645`).

`grep -n "new Date()" apps/pragma/api/src/audience/round.core.ts` returns nothing;
`now` is a parameter on every entry point.

### C2 — The tie rule is pinned by a test, including the retraction case

Two tests, and the second is the one that earns its keep.

`round.core.test.ts:101-113` gives Riff votes at `:01` and `:09` and Ballad votes
at `:02` and `:04`. Both stand at two. Ballad wins because its latest surviving
vote is the earlier one. The identifiers are chosen so the `songId` fallback
would pick Riff (`aaaa…` sorts before `bbbb…`), so the test discriminates the
rule from the tiebreak beneath it rather than passing on either.

`round.core.test.ts:115-134` then removes Ballad's `:04` vote — the very vote that
had decided the tie — and asserts the winner flips to Riff. It also asserts the
surviving list is one shorter, so the test cannot pass on an unchanged input.
That is the spec's "surviving matters" clause: a retraction deletes its row, the
standing is recomputed from what remains, and a song that briefly led does not
keep the lead. The production path matches, because `listVotesOfRound` reads rows
and `deleteVote` deletes one (`audience.repository.ts:181-197`) — there is no
counter to leave stale.

A third row pins that the function is total when count and latest vote are both
tied, by calling it with the inputs in both orders (`round.core.test.ts:136-150`).

### C3 — The pool test pins manual excludes, audience-choice does not

This one cannot be pinned in `pool.core.test.ts` alone, and that is the honest
reading of it: `selectPool` receives `manualSetlistSongIds` already filtered, so a
core test can only pin the half it can see. It does pin that half, and it pins the
previous-winner rule apart from it:

- `pool.core.test.ts:53-55` — a concert-ready song in a manual setlist is out.
- `pool.core.test.ts:57-69` — a previous winner is out even when no manual setlist
  names it, and the same inputs without the winner leave the song in. Without this
  the two exclusions would be indistinguishable, which the spec says has already
  happened twice in reading.

The other half is pinned at the only level that can see it, the composition root:

```
// apps/pragma/api/src/audience/audience.controller.test.ts:493-514
it('keeps a song sitting in the audience-choice setlist in the pool, and drops a planned one', …)
```

It puts Ballad in a manual setlist and Riff in the concert's audience-choice
setlist, reads `GET /state`, and asserts the pool is exactly `[riffSongId]` and
carries no `'Ballad'`. A song in the audience-choice sheet stays votable; a song in
a manual sheet does not. The mechanism it exercises is
`setlists.repository.ts:90-95`, whose `or(isNull(kind), ne(kind, 'audience_choice'))`
also makes every pre-migration row with a null `kind` read as manual.

## D — Cleanliness against the repository rules

| Rule | Verdict | Evidence |
|---|---|---|
| ESLint clean, `--max-warnings 0` | PASS | 81 changed source files, zero problems |
| Prettier clean | PASS | Same list minus the `.sql` migration, which has no parser, and markdown, which `.prettierignore` excludes |
| No type assertion beyond `as const` | PASS | `grep -nE '\bas [A-Z]\|as unknown\|: any\b' <changed>` returns nothing outside `as const`. The two JSON-parsing sites annotate `const parsed: unknown` and then Zod-parse (`musicbrainz.core.ts:168-173`) |
| No `eslint-disable` anywhere in the diff | PASS | `grep -rn "eslint-disable" <changed>` returns nothing |
| No comments; the machine-read annotations stay | PASS | `borso/no-comments` is on and clean; the only prose in source is `@Blueprint`, `@FollowsBlueprint`, `@Feature` and `@DependsOnExternal`. The migration's SQL header follows `0002` and `0003`, which carry the same shape |
| Magic numbers named | PASS | `ROUND_DURATION_MS`, `OPEN_ROUND_POLL_INTERVAL_MS`, `TICK_INTERVAL_MS`, `BALLOT_TOKEN_BYTES`, `AUDIENCE_SEARCH_BUDGET`, `AUDIENCE_WRITE_BUDGET`, `EXTERNAL_SEARCH_CACHE_TTL_MS`, `QR_CODE_SIZE_PX`, `DEBOUNCE_MS` |
| Names carry intent; function names describe the result | PASS | `selectPool`, `settleRound`, `selectSettlementWrite`, `hasClaimedRoundForSettlement`, `resolveSetlistKind`, `mintBallotToken`, `findConcertWithOpenRound`, `selectSuggestionOutcome`. No one-letter local outside a loop index |
| Back-end slice is a bounded context with the layered triad | PASS | `api/src/audience/` holds `.controller.ts`, `.service.ts`, `.repository.ts`, `.schema.ts`, `.types.ts`, two `.core.ts`, one `.utils.ts` and two middlewares. No horizontal aggregator folder. The database client is imported only by the repository |
| Controllers dispatch, never work | PASS | Every handler in `audience.controller.ts` validates, calls one service function, and maps the outcome through one frozen `STATUS_BY_REFUSAL` table (`:36-45`). No `.filter`/`.map`/`.reduce` over domain data |
| `.core.ts` never calls `new Date()` | PASS | `grep -rn "new Date()" apps/pragma/api/src/audience/*.core.ts` returns nothing; the clock enters at the controller and travels as `now` |
| BE↔FE types travel through `hc` | PASS | Every call in `audience.queries.ts` is `api.api.audience…`; no hand-written fetcher |
| Server state in TanStack Query | PASS | Five queries and four mutations; no `useState` holding server data |
| Styling is inline Tailwind; no new `.css` | PASS | `grep -rln "\.css'" apps/pragma/site/src` returns `main.tsx` alone, the pre-existing token entry point |
| Responsive prefixes on layout-bearing classes | PASS | `VotePage.tsx:15` `px-4 py-8 sm:px-8 sm:py-12`, `VotingRoundPanel.tsx:50` `grid-cols-1 lg:grid-cols-[1fr_auto]`, `PoolSongRow.tsx:52` `px-3 py-3 sm:px-4 sm:py-3.5`. The rendered check at 375 px and 1280 px is `/visual-validation`'s |
| No hard-coded user-facing string; both catalogues carry every key | PASS | 27 `audience.*` keys in `en.json` and 27 in `fr.json`, each genuinely translated; `i18n-parity.core.test.ts` is in the green run |
| Every new file ends in a layer-naming suffix | PASS | `convention-drift.ts --check`: "No question gained a new answer" — the `layer-marker:pragma` budget did not move |
| Every new file under `apps/` carries a blueprint marker naming one that exists | PASS | `blueprint-indexing.ts --check`: 1082 files, 164 blueprints, 1018 followers, complete and up to date |
| `@DependsOnExternal` declared in the manifest | PASS | `architecture-graph.ts --check` green; pragma at 296 files across 15 slices |
| The shared rate limiter's behaviour is unchanged for sign-in | PASS | `SHARED_PASSWORD_BUDGET` carries the same `RATE_LIMIT_MAX_ATTEMPTS` and `RATE_LIMIT_WINDOW_MS` the two functions read before (`rate-limit.utils.ts:9-18`), and `auth.service.ts:57,59` passes it. The budget became a parameter; no number moved |

Two observations, neither a row:

- `AUDIENCE_CHOICE_SETLIST_NAME = 'Audience choice'` (`setlists.schema.ts:11`) is an
  English string the band reads in the setlist list. It is persisted data rather
  than a label, so the i18n layer cannot reach it, and the spec makes it
  deliberately non-editable. Worth knowing before someone files it as a missing
  translation key.
- `upsertCachedSearch(...).catch(() => undefined)` (`songs.service.ts`) swallows a
  failed cache write on purpose, which the plan's risk register names as the
  mitigation for a cold-query race. It is the one silent catch in the diff.

## The stage each routing and auth property holds in

Same-origin `/api` is **production-only** in this repository, so a claim about
what a browser can reach has to name its stage.

```ts
// infra/cdk/src/internal/stage-wiring.utils.ts:19-23
export function selectSameOriginApiDomainName(stage: Stage, apiDomainName: string) {
  if (!isProductionStage(stage)) return undefined;
```

`PreviewableApp` hands that result to `StaticSite` as the `api` behaviour
(`previewable-app.ts:101-115`), so CloudFront routes `/api` to the Lambda in
`prod` alone. `deploy.yml` sets no `VITE_API_BASE`, so the prod bundle calls a
relative `/` (`api.client.ts:5-8,26`). `preview.yml:103` bakes
`VITE_API_BASE=https://<app>-pr-<n>-api.preview.borso.fr`, so **preview and integ
are cross-origin**. Local `dev` is same-origin through the Vite proxy
(`vite.config.ts:26-29`).

| Property | Stage it holds in | Evidence |
|---|---|---|
| The six public audience routes answer without a session cookie, and the two band routes answer 401 without one | Every stage, and local dev — it is a property of the Hono chain, not of the edge | `audience.controller.ts:53-172` applies `requireSharedPasswordSession` on each gated route rather than through `.use('*')`, so the two `.route('/api/audience', …)` calls in `app.ts:47-48` are order-independent. `audience.controller.test.ts:200-233` drives all eight through `createApp()` |
| The three public writes reach the API from a browser | **All four stages, on this sha.** It held in `prod` and `dev` before and now holds in `preview` and `integ` too | The writes send `x-ballot-token` (`audience.queries.ts:16`), which forces a CORS preflight the HTTP API answers from its own configuration. `lambda-api.ts:31,133` now allows `['content-type', 'authorization', 'x-ballot-token']`, and `lambda-api.test.ts:76-85` pins the three-entry list against a preview origin with `AllowCredentials: true`. This is round three's E1, closed |
| The rate limiter counts one visitor rather than one edge | `prod` — CloudFront puts the viewer address first in `X-Forwarded-For`, and `readClientIp` takes the first entry (`ip-hash.utils.ts:6-11`). In `preview` and `integ` the request reaches API Gateway directly, so the same first entry is the viewer's | Pre-existing helper, reused unchanged as the spec asked |
| `/vote` and `/vote/:sessionId` resolve on a deep link rather than 404 | Every deployed stage — `StaticSite` is built with `spaFallback: true` (`previewable-app.ts:112`) | Rendering it is `/visual-validation`'s row |

## Gates

Every one was run in this session, on `4154470`.

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | pass — already up to date |
| `pnpm exec eslint --max-warnings 0` on the 81 changed source files | pass — zero problems |
| `pnpm exec prettier --check` on the changed files | pass — all matched files use Prettier style |
| `pnpm --filter @borso-app/pragma run typecheck` | pass |
| `pnpm --filter @borso-app/pragma run build` | pass — built in 3.90 s |
| `pnpm --filter @borso-app/pragma run test:core` | pass — 125 files, 1221 tests |
| `pnpm --filter @borso-app/pragma run test` | pass — 15 files, 102 tests, back-e2e on the script's local Postgres, 107 s |
| `pnpm --filter @borso-app/pragma run test:coverage` | pass — 140 files, **1323 tests**, perFile 100%: statements 1792/1792, branches 897/897, functions 446/446, lines 1524/1524 |
| `pnpm --filter @borso/infra run test:coverage` | pass — 21 files, 337 tests, 100% on all four counters |
| `pnpm --filter @borso/shared-infra run test` | pass — 35 tests; the committed `borso-shared` template snapshot did not move, so **no `shared-deploy` dispatch is owed by this branch** |
| `pnpm exec knip` | pass — silent |
| `blueprint-indexing.ts --check` | pass — 1082 files, 164 blueprints, 1018 followers |
| `architecture-graph.ts --check` | pass — pragma 296 files, 15 slices |
| `convention-drift.ts --check` | pass — no question gained a new answer |
| `enforcement-ledger.ts --check` | pass — every standard names a mechanism that exists and runs |
| `check-vocabulary-paths.sh` | pass |
| `check-migration-sql-dsql-compat.sh` | pass |
| `check-no-comments-in-styles-and-markup.sh` | pass |
| `check-pure-modules-have-callers.sh` | pass |
| `check-non-module-scripts.sh` | pass |

## Unverifiable

| # | Assertion | Why, and what would settle it |
|---|---|---|
| **U1** | What happens when two `POST /api/audience/concerts/:id/rounds` genuinely arrive at once, and what DSQL does to the settlement claim's loser | The sequential case is implemented and tested (A21). The plan promised more: risk-register row four says the service "catches the serialization failure on both the round-open path and the settlement path", and the plan's Q-row self-check asks for a back-e2e firing two opens with `Promise.all` and asserting one 201 and one 409. **Neither exists** — `grep -rn "serializ\|40001\|catch" apps/pragma/api/src/audience/` returns only the blueprint prose asking for it, and `audience.controller.test.ts:348` is sequential. What the missing catch would have to handle is itself undecidable from here: `voting_round` has no unique constraint on an open round (`0004_audience_voting.sql:22-29`), so under snapshot isolation two inserts of distinct rows may not conflict at all, in which case a catch changes nothing and the fix is a constraint. The back-e2e suite runs on local Postgres, which blocks where DSQL aborts at commit, and no DSQL cluster is reachable from this session — AWS access here is read-only. **Blast radius if it fires:** two open rounds on one concert, each settling into its own setlist entry. It needs two band members tapping the same button within milliseconds, and the panel disables the button while a round is open |
| **U2** | The seven analytics events the spec names — `audience_ballot_minted`, `audience_vote_cast`, `audience_vote_retracted`, `audience_suggestion_accepted`, `audience_round_opened`, `audience_round_settled`, `audience_round_blank` | `grep -rn "audience_ballot_minted\|audience_vote_cast\|audience_round_settled" apps/pragma` returns nothing. The spec's *Production strategy* names them as "named events on the API"; the plan gives them no row and no sink, and `pragma` has no telemetry surface for them to reach. This is a spec-versus-plan gap rather than a code defect — the implementation cannot emit to somewhere the spec never named. Carried forward from rounds two and three. Settling it means either a plan row that names the sink, or a spec edit that moves the events out of this iteration |

Both rows go in the pull request's `## Validation gaps` section per the
disclosure rule, with this report's path.

## Verdict

**PASS_EXCEPT_UNVERIFIABLE, two rows.**

Round three's single failure is genuinely closed, and I checked it against
`lambda-api.ts` rather than against the fix report: the CORS allow-list now
carries `x-ballot-token`, a test pins the three-entry list against a preview
origin with credentials on, and the `infra/cdk` suite still sits at 100% on all
four counters. The property that failed was stage-scoped, so its fix is named the
same way above — it held in `prod` and `dev` before, and now holds in `preview`
and `integ` too.

Thirty-six spec rows pass. Twenty gates are green on this sha, including 1323
tests across both projects and 100% per-file coverage on statements, branches,
functions and lines.

The two rules the spec singled out both hold, and hold across the whole front end
rather than across the diff: no mutation carrying `onMutate` invalidates or
refetches — directly or through a helper — and there is no `useEffect` anywhere in
`apps/pragma/site/src`, with the countdown derived during render from `closesAt`
and a one-second store read through `useSyncExternalStore`.

The three properties the brief named are each pinned by a test that
discriminates rather than merely passes. Settlement is idempotent in the pure
function, in one conditional `UPDATE … WHERE settled_at IS NULL RETURNING id`,
and in one transaction the claim shares with the append, with a back-e2e row that
waits the real thirty seconds and fires two concurrent reads. The tie test picks
identifiers that make the `songId` fallback choose the other song, so it tells the
rule from the tiebreak beneath it, and its retraction sibling flips the winner
after removing the vote that had decided it. The audience-choice case is pinned at
the composition root, which is the only level that can see it, because
`selectPool` receives an already-filtered manual set.

What is left is disclosed rather than failed. U1 is a plan promise the code does
not carry, on a path whose consequence depends on vendor behaviour no test in this
repository can exercise. U2 is a spec section with no home in the plan. Neither is
a defect I observed; both are things a reader of this branch should know.
