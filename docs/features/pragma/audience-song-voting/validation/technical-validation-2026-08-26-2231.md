# Technical validation — the room picks the next song, round three

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `8f8a148214b2e3371a1078d61b6c77c9cb7d498a` |
| Base | `origin/main` at `231bfc7b7600cbd8f0de18c93656249067a6803f` |
| Workspace | `@borso-app/pragma` |
| Date | 2026-08-26 |
| Verdict | **FAIL, one row** |

The diff is 96 files, 7416 insertions, 326 deletions. Every gate this repository
owns is green on this sha, the two rules the spec singled out both hold, and the
three properties the brief named specifically are each pinned by a test that
would fail if the rule were removed. One row fails, and it is a routing property
that holds in production and in local development and breaks in `preview`.

## A — Correctness against the spec

| # | Spec assertion | Verdict | Evidence |
|---|---|---|---|
| A1 | The pool is the `concert_ready` catalogue songs absent from every **manual** setlist of this concert, plus songs suggested at this concert whatever their status, minus earlier winners | PASS | `apps/pragma/api/src/audience/pool.core.ts:41-54`. The audience-choice setlist never reaches the pure function: `getManualSetlistSongIdsOfSession` supplies the manual set and `listWinningSongIdsOfConcert` the winners as separate inputs (`apps/pragma/api/src/audience/audience.service.ts:74-84`) |
| A2 | One vote per song, unlimited songs, per round; a second tap retracts | PASS | Primary key `("round_id","ballot_token","song_id")` in `apps/pragma/api/src/database/migrations/0004_audience_voting.sql`; `recordVote` uses `onConflictDoNothing` and the service maps `already-present` to `duplicate-vote` (`audience.service.ts:236`); `deleteVote` deletes the row rather than writing a counter (`audience.repository.ts:172-187`) |
| A3 | Tie broken on the earliest latest-surviving vote | PASS | `compareByWinningOrder`, `apps/pragma/api/src/audience/round.core.ts:83-90` — count descending, then `latestVoteAt` ascending, then `songId` |
| A4 | Blank round appends nothing and lets the band open another | PASS | `settleRound` returns `{ kind: 'blank' }` (`round.core.ts:99`); `selectSettlementWrite` claims the round with a null winner (`round.core.ts:68-79`); `settleIfDue` returns before the append when `winningSongId === null` (`audience.service.ts:142`) |
| A5 | A winning song leaves the pool for the rest of the concert | PASS | `listWinningSongIdsOfConcert` feeds `previousWinnerSongIds` and `selectPool` drops it first, before the suggestion arm (`pool.core.ts:46-48`) |
| A6 | Settlement is lazy on read, has no scheduler, and is idempotent | PASS | See section C1 |
| A7 | A suggestion resolves an existing `mbid` rather than creating a second song | PASS | `resolveSuggestedSong` searches the catalogue on `song.mbid` before importing (`audience.service.ts:299-304`) |
| A8 | A song already in a manual setlist for tonight is refused | PASS | `acceptSuggestion` reads the manual set and refuses `song-already-planned` → 409 (`audience.service.ts:311-317`, status table `audience.controller.ts:41`) |
| A9 | A suggested song enters with its own status, `idea` when invented | PASS | `importSuggestedSong` writes `status: 'idea'` (`audience.service.ts:275`) |
| A10 | The row's "not necessarily concert-ready" marker is the status, not a separate flag | PASS | `apps/pragma/site/src/components/molecules/PoolSongRow.tsx:19-20,44` derives the marker from `status`; `isSuggestion` is not read for it |
| A11 | The short `/vote` resolves to the one concert with an open round, and to nothing otherwise; it never guesses from the calendar | PASS | `findConcertWithOpenRound` filters on `settled_at IS NULL AND closes_at > now` only — no date column is read (`audience.repository.ts:120-131`) |
| A12 | Only a picked search result is stored, never free text | PASS | `suggestionCreateSchema` accepts `{ mbid }` and nothing else; a body carrying a title answers 400 |
| A13 | A vote on a closed or settled round is refused with a conflict, not dropped | PASS | `readOpenRound` refuses `round-closed` → 409 (`audience.service.ts:196-201`); asserted at `audience.controller.test.ts:250-259` and again on a genuinely settled round at `:631` |
| A14 | A vote on a song outside the pool is refused | PASS | `song-not-in-pool` → 422 (`audience.controller.ts:42`), asserted at `audience.controller.test.ts:474` |
| A15 | A throttled upstream search surfaces a stated failure, not an empty list | PASS | `musicbrainz.adapter.ts:63,82` return `{ kind: 'unavailable', status }`; the service maps it to `external-search-unavailable` → 503 |
| A16 | A round on a `practice` session is refused | PASS | `openRound` refuses `not-a-concert` → 422 (`audience.service.ts:97-98`), asserted at `audience.controller.test.ts:346-360` |
| A17 | A second round is refused while one is running | PASS | `audience.service.ts:99-100`, asserted at `audience.controller.test.ts:352-360` |
| A18 | The audience-choice setlist is created at the first round, never at concert creation, and refuses a rename | PASS | `audience.controller.test.ts:363-388` asserts the setlist list is empty before the round, holds one `audience_choice` after, and answers 409 on `PUT` |
| A19 | The vote page is public — outside `RequireSession` | PASS | `apps/pragma/site/src/App.tsx:22-23` declares both routes as siblings of `/login`, above the `RequireSession` element; `audience.controller.test.ts:204-230` drives every public route through `createApp()` with no cookie and both gated routes to 401 |
| A20 | The ballot token is opaque, server-minted, stored keyed by concert id, never derived from the person | PASS | 24 random bytes rendered hex (`ballot-token.utils.ts:1,9-13`), `randomBytes` called in the service not the utils; `ballot-token.adapter.ts:6-9` keys on `pragma.ballot.<sessionId>` |
| A21 | Polling is one second while a round is open, nothing at rest, plus a refresh control | PASS | `refetchInterval: (query) => selectPollInterval(query.state.data?.state.round)` (`audience.queries.ts:117`) — derived from the last response, not a constant; the refresh control is `voteState.refetch()` (`VotePage.tsx:79`) |
| **A22** | **The vote page reaches the API from the browser the visitor opened it in** | **FAIL** | **See section E** |

## B — The two rules the spec singled out

The spec's *Test strategy* asks for "a specific pass on the two rules this feature
is most likely to break". Both hold.

### B1 — No refetch on a mutation carrying `onMutate`

`useCastVote` (`audience.queries.ts:142`) and `useRetractVote` (`:178`) each carry
`onMutate`, and neither calls `invalidateQueries`, `refetchQueries`, nor a helper
that would. Each cancels in-flight queries, snapshots the previous cache, writes
the optimistic state through `applyVoteToState`, and restores the snapshot in
`onError`. There is no `onSettled` on either.

The grep is repository-wide rather than diff-wide, so nothing reaches an
invalidation through a helper:

```
$ grep -rn "invalidateQueries\|refetchQueries\|\.refetch()" apps/pragma/site/src --include=*.ts --include=*.tsx | grep -v "\.test\."
apps/pragma/site/src/routes/vote/VotePage.tsx:40:  onClick={() => void live.refetch()}
apps/pragma/site/src/routes/vote/VotePage.tsx:79:  onClick={() => void voteState.refetch()}
```

Both hits are the refresh control the spec requires on the at-rest page — a
person pressing a button on a query, not a mutation settling itself. `useSuggestSong`
(`:220`) is the insert the rule exempts and it settles from its own response
through `setQueryData`, per `query-optimistic-insert`; `useOpenRound` (`:255`)
carries no `onMutate` and likewise reconciles from its response.

### B2 — No `useEffect` where the countdown can be derived during render

```
$ grep -rn "useEffect\|useLayoutEffect" apps/pragma/site/src --include=*.ts --include=*.tsx
NONE FOUND
```

Not merely none in the diff — none in the application. `VoteCountdown`
(`VoteCountdown.tsx:24-31`) reads a one-second clock through
`useSyncExternalStore` and computes `secondsLeft` during render from
`closesAtEpochMs`. The interval belongs to the store, which starts it on the
first subscriber and clears it on the last
(`vote-countdown.store.ts:32-42`), so no component owns a timer lifecycle. The
existing `clock.store.ts` was left at its one-minute tick rather than widened,
which is the decision the plan's pattern-coherence pass took.

## C — The three properties the brief named

### C1 — Round settlement is idempotent

Idempotent at three levels, and each is pinned.

**In the pure function.** `settleRound` returns `already-settled` whenever
`round.settledAt !== null`, before it looks at the clock or the votes
(`round.core.ts:93-94`). `round.core.test.ts:70` calls it twice over the same
votes and asserts the second answers `already-settled`.

**In the statement.** `hasClaimedRoundForSettlement` is a single
`UPDATE … SET settled_at = …, winning_song_id = … WHERE id = … AND settled_at IS NULL
RETURNING id` and answers on whether a row came back
(`audience.repository.ts:150-160`). The claim and the test are one statement, so
two callers cannot interleave a read and a write.

**In the transaction.** `settleIfDue` opens one transaction, claims inside it,
returns without appending when it did not claim, and appends only as the claimer
(`audience.service.ts:134-144`). The claim and the append therefore commit
together or not at all, which is the risk the plan filed as *"settled with a
winner that is in no setlist"*.

`audience.controller.test.ts:593-647` waits the real `ROUND_DURATION_MS`, fires
two concurrent `GET /state` with `Promise.all`, and asserts `songCount` is
exactly `[1]` — one entry for one winner — that both reads answer 200, that a
late vote answers 409 `round-closed`, that the winner has left the pool, and that
a second round opens 201.

### C2 — The tie rule is pinned by a test, including the retraction case

`round.core.test.ts:101` gives RIFF votes at `:01` and `:09` and BALLAD votes at
`:02` and `:04` — both on two votes — and asserts BALLAD wins. This is the test
that earns its keep: the identifier fallback would pick RIFF, whose id sorts
first (`aaaaaaaa-…` against `bbbbbbbb-…`), so the assertion distinguishes the tie
rule from the fallback beneath it rather than passing under either.

`round.core.test.ts:115` is the retraction case. It removes BALLAD's `:04` vote
from the same fixture and asserts the winner flips to RIFF, which pins that the
standing is recomputed from surviving rows and that a deleted row leaves no trace
in a count. `:135` pins determinism when count and latest vote are both equal.

One honest limit on C2, recorded rather than failed: the retraction row flips the
winner through the **count** rule, not through the tie-break comparator, because
removing a vote leaves the counts at 2 against 1. A mutant that broke only
`latestVoteAt` ordering would survive that row — it is caught by `:101` instead.
The property the spec asks for ("a retraction deletes its row, so the standing is
always recomputed") is genuinely pinned; the tie-break comparator is pinned once
rather than twice.

### C3 — The pool test pins that a manual setlist excludes and the audience-choice one does not

The discriminating case is `audience.controller.test.ts:493`, *"keeps a song
sitting in the audience-choice setlist in the pool, and drops a planned one"*. It
puts Ballad in a manual setlist and Riff in the audience-choice setlist on the
**same** concert, then asserts `pool` is exactly `[riffSongId]` and that the
titles do not contain Ballad.

This is the right level for the assertion. `selectPool` cannot decide it: the
pure function is handed `manualSetlistSongIds` already filtered, so a unit test
of it would pin nothing about which setlists were read. The filter lives in the
repository query behind `getManualSetlistSongIdsOfSession`, and only a test that
drives both setlists through the composition root can tell the two rules apart —
which is the confusion the spec says two earlier readings fell into.
`pool.core.test.ts:57-70` complements it by pinning that the previous-winner rule
and the manual-setlist rule are separately observable.

## D — Cleanliness against the repository rules

| Rule | Verdict | Evidence |
|---|---|---|
| No type assertions beyond `as const` | PASS | `grep -nE " as [A-Z][A-Za-z]*\|as unknown as"` over the 75 changed source files returns nothing outside `as const` |
| No `any` | PASS | grep returns nothing |
| No comments; annotations only | PASS | every `//` line in the changed files is a `@FollowsBlueprint` marker |
| No `new Date()` in a `.core.ts` | PASS | grep over the five new core files returns nothing; `now` is a parameter on `settleRound`, `isRoundOpen`, `remainingSeconds` |
| Magic numbers named | PASS | `ROUND_DURATION_MS`, `TICK_INTERVAL_MS`, `BALLOT_TOKEN_BYTES`, `AUDIENCE_WINDOW_MINUTES`, `PERCENT_SCALE`, `BALLOT_KEY_PREFIX` |
| Vertical slice, layered triad | PASS | `audience/` carries controller, service, repository, schema, types, two `.core.ts`, one `.utils.ts`, two middlewares; no `domain/`, `routes/` or `services/` folder |
| Controllers dispatch, never work | PASS | every handler in `audience.controller.ts` validates, calls one service function, and maps the outcome through the frozen `STATUS_BY_REFUSAL` table |
| Repository is the only file touching the client | PASS | `getDatabase()` appears in `audience.repository.ts` alone within the slice |
| The audience slice re-implements no search | PASS | `grep -rn "musicbrainz\|search-cache" apps/pragma/api/src/audience/` returns nothing; the façade calls `songs.service` |
| Atomic design | PASS | `VoteQrCode` atom, `PoolSongRow` and `VoteCountdown` molecules, `AudienceVoteList`, `SuggestSongField`, `VotingRoundPanel` organisms |
| No raw `.css` added | PASS | no `.css` path in the changed-file list |
| 375 px and 1280 px | PASS | `VotePage.tsx:15-16` (`px-4 py-8 sm:px-8 sm:py-12`, `max-w-2xl`), `PoolSongRow` (`sm:px-4 sm:py-3.5`), `VotingRoundPanel` (`lg:grid-cols-[1fr_auto]`). `AudienceVoteList` and `SuggestSongField` carry no prefix and need none — both are `flex flex-col` stacks inside the capped column |
| No hard-coded user-facing string | PASS | every visible string goes through `t(...)`; `en.json` and `fr.json` each gained 27 lines and the parity test passes |
| `qrcode.react` reachable from one file | PASS | `VoteQrCode.tsx` only; catalog entry in `pnpm-workspace.yaml`, `catalog:` reference in `apps/pragma/package.json`, lockfile committed |
| A public write path carries a budget | PASS | `limitAudienceWrites` is one shared instance ahead of the ballot gate on all three public writes (`audience.controller.ts:89,110,129`); `limitAudienceSearch` is its own instance on the search |

## Gates

Every command below was run on `8f8a148` in this session.

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | pass |
| `pnpm exec eslint --max-warnings 0` on 75 changed source files | pass, 0 problems |
| `pnpm exec prettier --check` on the changed files (markdown and `.sql` excluded) | pass, "All matched files use Prettier code style" |
| `pnpm --filter @borso-app/pragma run typecheck` | pass |
| `pnpm --filter @borso-app/pragma run build` | pass, built in 4.02 s |
| `pnpm --filter @borso-app/pragma run test:coverage` | pass — 140 files, **1323 tests**, 185 s, both projects |
| Coverage, `perFile` at 100% | pass — statements 1792/1792, branches 897/897, functions 446/446, lines 1524/1524 |
| `pnpm exec knip` | pass |
| `blueprint-indexing.ts --check` | pass — 1082 files, 164 blueprints, 1018 followers |
| `architecture-graph.ts --check` | pass — pragma 296 files across 15 slices |
| `convention-drift.ts --check` | pass |
| `enforcement-ledger.ts --check` | pass |
| `check-vocabulary-paths.sh` | pass |
| `check-migration-sql-dsql-compat.sh` | pass |
| `check-no-comments-in-styles-and-markup.sh` | pass |
| `check-pure-modules-have-callers.sh` | pass |

No gate was skipped and nothing was run with `--no-verify`.

## E — The failing row

### E1 — The vote page's writes carry a header the edge does not allow, in `preview`

**This row names the stage it holds in, because the stages differ.** Same-origin
`/api` is production-only here:

```ts
// infra/cdk/src/internal/stage-wiring.utils.ts:19-25
export function selectSameOriginApiDomainName(stage: Stage, apiDomainName: string): string | undefined {
  if (!isProductionStage(stage)) return undefined;
  return apiDomainName;
}
```

`PreviewableApp` passes that result to `StaticSite` as the `api` behaviour
(`infra/cdk/src/constructs/previewable-app.ts:102-115`), so the CloudFront
distribution routes `/api` to the Lambda **in `prod` only**. In `dev` the Vite
proxy makes it same-origin too (`apps/pragma/vite.config.ts:27-29`). In
`preview`, `.github/workflows/preview.yml:103` bakes
`VITE_API_BASE=https://pragma-pr-<n>-api.preview.borso.fr`, so the vote page and
the API sit on different origins and every audience call is cross-origin.

The three public writes send a custom request header:

```ts
// apps/pragma/site/src/lib/queries/audience.queries.ts:16
const BALLOT_TOKEN_HEADER = 'x-ballot-token';
```

A custom header makes the browser send a CORS preflight, which the HTTP API
answers from its own configuration rather than from Hono. That allow-list does
not carry the header:

```ts
// infra/cdk/src/constructs/lambda-api.ts:129-135
allowOrigins: [...props.allowedOrigins],
allowCredentials: true,
allowHeaders: ['content-type', 'authorization'],
allowMethods: corsMethods,
```

So in `preview` the preflight for `POST /rounds/:roundId/votes`,
`DELETE /rounds/:roundId/votes/:songId` and `POST /concerts/:sessionId/suggestions`
returns an `Access-Control-Allow-Headers` list without `x-ballot-token`, and the
browser blocks the request before it leaves. **In `prod` and in local `dev`
nothing is cross-origin, no preflight happens, and the feature works** — which is
why every test in this suite passes: they all drive the Hono app in-process,
where no browser enforces CORS.

`x-ballot-token` is the first custom request header this front end sends to its
own API. The only other `headers:` in `site/src` is a direct S3 `PUT`
(`object-upload.adapter.ts:16`), which does not go through `api.client`. Nothing
pins the allow-list either: `grep -rn "allowHeaders" infra/cdk/test/` returns
nothing, so the literal has no test and no gate noticed the new header.

**Why this blocks rather than being disclosed.** `preview` is the stage the pull
request deploys and the stage a reviewer opens; the plan's pre-flight gate 17
sends the visual validator at the public page to cast and retract a vote. Against
a preview stack those two actions cannot complete. The remedy is one line —
adding `'x-ballot-token'` to `allowHeaders` in `infra/cdk/src/constructs/lambda-api.ts`
— plus the `infra/cdk` coverage suite and the template snapshot that go with it.

Two related observations, neither of them this row and neither introduced here:

- `app.ts:33` mounts a bare `cors()`, whose defaults are `origin: '*'` and no
  `credentials` (read in the installed source at
  `node_modules/.pnpm/hono@4.12.18/node_modules/hono/dist/middleware/cors/index.js:3-7,41-43`),
  while `api.client.ts:26` sets `credentials: 'include'`. Whether the HTTP API's
  own `Access-Control-Allow-Origin` or Hono's `*` reaches the browser on the
  actual response is not decidable from source, so I do not claim it. It is
  pre-existing, untouched by this diff, and equally confined to `preview`.
- The plan's risk register promises the service "catches the serialization
  failure on both the round-open path and the settlement path". No such catch
  exists — `grep -rn "serializ\|40001\|catch" apps/pragma/api/src/audience/`
  returns only the blueprint prose that asks for it. On local Postgres the loser
  blocks and then finds `settled_at` set, which is why the concurrent test
  passes; on DSQL it would abort at commit and surface as a 500 on one visitor's
  poll, recovered by the next one second later. I cannot exercise DSQL from this
  session, so this stays an observation rather than a row.

## Unverifiable

| # | Assertion | Why |
|---|---|---|
| U1 | DSQL's behaviour under the two concurrent paths — the settlement claim and the second `POST /rounds` | The back-e2e suite runs on local Postgres, which blocks where DSQL aborts at commit. There is no DSQL cluster reachable from this session, and AWS access here is read-only |
| U2 | The seven named analytics events (`audience_ballot_minted`, `audience_vote_cast`, …) have no emitter anywhere in `apps/pragma` | Carried forward from round two. The spec's *Production strategy* names them; neither the plan nor the diff gives them a home. This is a spec-versus-plan gap, not a code defect, and it is disclosed rather than failed |
| U3 | Everything the browser must show — the counter moving, the countdown reaching zero, the winner appearing | `/visual-validation`'s scope, at 375 px and 1280 px, in a context with no session cookie |

## Verdict

**FAIL, one row: E1.** Everything else on this branch is in good order — 1323
tests green, 100% per-file coverage on all four counters, sixteen gates clean,
both singled-out rules holding, and the three properties the brief named each
pinned by a test that discriminates rather than merely passes. The one failure is
a stage-scoped routing property: the feature's public writes send
`x-ballot-token`, and the HTTP API's CORS allow-list carries `content-type` and
`authorization` only. It holds in `prod` and in local `dev`, both same-origin,
and breaks in `preview`.
