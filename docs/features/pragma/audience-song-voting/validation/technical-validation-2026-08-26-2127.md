# Technical validation — The room picks the next song

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| Branch | `claude/concert-sound-voting-c7r8w7` |
| Head | `449dc419b90472cd2eb049d6db430a78e908937f` |
| Base | `origin/main` |
| Workspace | `@borso-app/pragma` (not `@borso/pragma`; that filter matches no project) |
| Date | 2026-08-26 |
| Round | second — follows [`technical-validation-2026-08-26-2024.md`](./technical-validation-2026-08-26-2024.md), which failed the branch on eight rows |

**Verdict: FAIL, 4 rows.** Two of them are the same hole seen from two sides: the
public suggestion route carries neither half of the gate the plan wrote for it,
so an unauthenticated caller can write rows into the band's catalogue on any
session id, at any time, without limit. The other two are a wrong clock label
the band reads at a concert and the one spec error case with no test.

Every gate is green, including the full suite at 1314 tests and 100% per-file
coverage. None of these four rows is a gate failure, which is the point: this is
the second round in a row where the suite went green over a hole.

The five passes the brief asked for specifically all hold. No mutation carrying
`onMutate` refetches. There is no `useEffect` anywhere in `apps/pragma/site/src`.
Settlement is idempotent and defended at the statement level. The tie rule is
pinned by a test that can tell it apart from the identifier fallback. The pool
test puts a manual setlist and an audience-choice setlist on the same concert and
asserts only the first one excludes.

---

## A. Correctness against the spec

### A1 — FAIL. A suggestion is accepted on any session id, with no round open, on a practice, and on a session that does not exist

The spec's file list names `open-ballot.middleware.ts` as *"gate on a concert
with an open round"*. The plan is more explicit still, at
[`plan.md` line 116](../plan/plan.md): *"Gate the public write routes on a
concert that has an open round and a well-formed ballot token"*, with the
detection *"a back-e2e test posts a vote on a concert with no open round and
asserts 409"*.

What shipped is `requireBallot`
(`apps/pragma/api/src/audience/open-ballot.middleware.ts:11`), which checks the
token shape and nothing else:

```ts
export const requireBallot: MiddlewareHandler<BallotEnvironment> = async (context, next) => {
  const ballotToken = readBallotToken(context.req.header(BALLOT_TOKEN_HEADER));
  if (ballotToken === null) {
    return context.json({ error: 'ballot-required' }, 401);
  }
```

The open-round half survives for votes and retractions, because the service does
it: `readOpenRound` (`apps/pragma/api/src/audience/audience.service.ts:203`)
refuses `round-closed` and `castVote`/`retractVote` return it. It does **not**
survive for suggestions. `acceptSuggestion`
(`apps/pragma/api/src/audience/audience.service.ts:311`) reads the manual setlist
song ids, resolves the `mbid`, and inserts — it never loads the session, never
checks `session.kind`, and never looks for a round.

Probed on this checkout, through `createApp()`, against the local Postgres:

| Request | Status |
|---|---|
| `POST /api/audience/concerts/<concertId>/suggestions`, no round open | **201** |
| `POST /api/audience/concerts/<practiceId>/suggestions` | **201** |
| `POST /api/audience/concerts/00000000-0000-0000-0000-000000000000/suggestions` | **201** |
| `POST /api/audience/rounds/<unknown>/votes` | 409 `round-closed` |

Each 201 wrote an `audience_suggestion` row. The spec puts *"Voting during a
practice"* out of scope and refuses a round on a practice with 422
(`audience.service.ts:98`, tested at `audience.controller.test.ts:244`); the
suggestion route walks straight past the same rule.

The consequence is not only a stray row. On an `mbid` the catalogue does not
hold, `resolveSuggestedSong` falls through to `importSuggestedSong`, which calls
MusicBrainz and `createSong(...)` with status `idea`. So the reachable effect of
an unauthenticated request to a made-up UUID is **a new row in the band's `song`
table**.

### A2 — FAIL. The one public write that creates catalogue rows carries no rate limit

`buildAudienceSearchLimiter` exists, reuses the sign-in slice's bucket
arithmetic, and is wired to exactly one route —
`audience.controller.ts:71`, the `GET /search` handler. The three public write
routes (`/rounds/:roundId/votes`, its `DELETE`, and
`/concerts/:sessionId/suggestions` at `audience.controller.ts:121`) carry no
limiter at all.

The spec's *Zero-defect strategy* names two mitigations for the public surface:
*"the existing IP-hash rate limiter reused from `apps/pragma/api/src/auth/`, and
the fact that the ballot only counts inside a thirty-second window the band
controls"*. Neither reaches the suggestion route: the limiter is not on it (this
row) and the thirty-second window is not on it either (A1). The blueprint on the
limiter says *"this bars a script, not a crowd"*, which is the right budget — it
is simply not applied where a script would do damage.

Two separate rows because two separate fixes: A1 is a gate the middleware should
carry, A2 is a middleware that should be on more than one route.

### A3 — FAIL. The round history shows the wrong time in any timezone that is not UTC

`voting-round-panel.core.ts:38`:

```ts
openedAtLabel: round.openedAt.slice(TIME_LABEL_SLICE_START, TIME_LABEL_SLICE_END),
```

with `TIME_LABEL_SLICE_START = 11` and `TIME_LABEL_SLICE_END = 16`. The value
sliced is what `projectRound` put on the wire at
`audience.service.ts:55`, `round.openedAt.toISOString()` — a UTC instant. Slicing
characters 11 to 16 out of an ISO string reads the UTC hour and minute and
labels it as a time. A round opened at 21:30 in Paris in August renders as
`19:30` on the band's own panel, next to the winner it produced.

The spec asks for *"the round history with each winner"* and says nothing about a
clock, so this is an addition — but an addition that displays a wrong number is a
defect, not extra credit. Either drop the label or format it in the viewer's
locale the way `formatSessionDate` already does elsewhere in this application.

### A4 — PASS. The pool rule, stated once and precisely

The spec restates the pool because two earlier readings contradicted each other,
so this got a line-by-line read. It holds, split across two layers.

`selectPool` (`pool.core.ts:43`) drops a previous winner first, then admits a
suggested song whatever its status, then admits a `concert_ready` song not
already planned. The manual-versus-audience-choice distinction is not in the pure
function at all — it cannot be, since `selectPool` takes a flat
`manualSetlistSongIds` list. It lives one layer down, in
`setlists.repository.ts:93`:

```ts
or(isNull(setlistTable.kind), ne(setlistTable.kind, AUDIENCE_CHOICE_SETLIST_KIND)),
```

which is the spec's *"the audience-choice setlist is deliberately not read by
this rule"*, with the `isNull` arm covering the rows that predate the column.
Covered below, D3.

### A5 — PASS. Settlement is idempotent, at the statement level and not by luck

`settleRound` (`round.core.ts:94`) returns `already-settled` whenever
`settledAt !== null`, ahead of every other branch, and `selectSettlementWrite`
maps that to `{ shouldClaimTheRound: false }`. `settleIfDue`
(`audience.service.ts:128`) returns before touching the database on that answer.

The concurrent case is defended properly rather than by that read. The claim is
one conditional statement, `hasClaimedRoundForSettlement`
(`audience.repository.ts:147`):

```ts
.update(votingRoundTable)
.set({ settledAt, winningSongId })
.where(and(eq(votingRoundTable.id, roundId), isNull(votingRoundTable.settledAt)))
.returning({ id: votingRoundTable.id });
```

and it shares one transaction with the append, so a caller that does not get a
row back returns without appending. Two readers arriving together produce one
settlement and one setlist entry. Pinned purely at `round.core.test.ts:69` and
against the real database at `audience.controller.test.ts:506`, which waits the
real thirty seconds, fires two `GET /state` calls through `Promise.all`, and
asserts the setlist holds exactly one entry.

### A6 — PASS. Every other spec use case and edge case

Blank round appends nothing and another round may open
(`round.core.ts` `blank` arm; `audience.controller.test.ts:506` reopens and gets
201). A winner leaves the pool for the rest of the concert
(`listWinningSongIdsOfConcert`). A suggestion mid-round is votable on the next
poll, because the pool is recomputed on every state read. An `mbid` already in
the catalogue resolves onto that song rather than duplicating it, and a song in
tonight's manual setlist is refused 409 `song-already-planned`. A round on a
practice is refused 422. A second round while one runs is refused 409. The
audience-choice setlist is created at the first round and refuses `renameSetlist`
with 409. Two members opening at once: the read-then-insert plus DSQL's
commit-time abort, as planned. The short `/vote` address resolves through
`GET /api/audience/live` to the concert with an open round and to `null`
otherwise, never guessing from the calendar. A throttled upstream surfaces
`external-search-unavailable` as 503 and the field renders a stated failure
rather than an empty list.

The migration matches the spec's SQL block statement for statement, including
`setlist_sheet.kind` arriving with neither `NOT NULL` nor `DEFAULT`, and the
Drizzle column carries no modifier that would make `drizzle-kit generate` emit
something DSQL refuses.

---

## B. Cleanliness against the repo's rules

### B1 — PASS. No refetch on a mutation carrying `onMutate`

The rule this feature was most likely to break. It is not broken.

`useCastVote` (`audience.queries.ts:142`) and `useRetractVote`
(`audience.queries.ts:178`) each carry `onMutate` — `cancelQueries`, snapshot,
`setQueryData` through `applyVoteToState` — and an `onError` that restores the
snapshot. Neither contains `invalidateQueries`, `refetchQueries`, or a helper in
the file that reaches one. Grepped the whole diff: the only `invalidateQueries`
calls in `apps/pragma/site/src` are in query modules this feature does not
touch.

The two writes that do reconcile do it from their own response, not from a fresh
`GET`: `useSuggestSong` carries no `onMutate` and its `onSuccess` calls
`setQueryData(..., addSuggestedSongToPool(old, data.song))`; `useOpenRound`
likewise writes `withOpenedRound(old, data.round)` and appends to the history
cache. That is the `query-optimistic-insert` shape the standard names, and it
avoids the stale-DSQL-read trap the dantotsu is about.

`borso/no-refetch-of-optimistically-written-query` ran over all 72 changed source
files with `--max-warnings 0` and reported nothing.

### B2 — PASS. No `useEffect`, and the countdown derives during render

The second rule the brief singled out. `grep -rn "useEffect" apps/pragma/site/src`
returns **zero** matches across the whole application, not just the diff.

`VoteCountdown` (`VoteCountdown.tsx:19`) reads a one-second clock through
`useSyncExternalStore(subscribeVoteCountdown, getVoteCountdownTime,
readVoteCountdownServerTime)` and computes `secondsLeft` and `fillPercent` during
render from `closesAtEpochMs` and that clock. The store
(`vote-countdown.store.ts`) starts its interval on the first subscriber and
clears it when the last one unsubscribes, so the lifecycle belongs to the store
rather than to a component. This is exactly the alternative CLAUDE.md nominates
for a browser API that exposes subscribe and unsubscribe.

### B3 — PASS. Everything else the standards can check

`eslint --max-warnings 0` over the 72 changed `.ts`/`.tsx` files: clean, which
covers the comment ban, the type-assertion ban, the pure-file placement rule, the
controller-dispatcher rule and the query-hook placement rule. No `as` of any
kind appears in the diff. Atoms, molecules and organisms are each in the right
bucket, and `VoteQrCode.tsx` is the only file importing `qrcode.react`, as
ADR-0016 requires. Styling is inline Tailwind with `sm:`/`lg:` prefixes on the
layout-bearing classes. Every new pure file carries a layer suffix, so
`convention-drift --check` reports no question gaining a new answer.

One naming note that is not a violation: the spec put `resolveSetlistKind` in
`setlists.schema.ts` and the plan moved it to `setlists.core.ts` because a
branching pure function in a `.schema.ts` is a lint error. The plan is right and
the code follows the plan.

---

## C. Do the tests pass

All green, on this checkout, at this sha.

| Gate | Command | Result |
|---|---|---|
| Lint | `pnpm exec eslint --max-warnings 0 <72 changed files>` | pass, 0 problems |
| Format | `pnpm exec prettier --check <77 changed files>` | pass, markdown and the `.sql` excluded |
| Types | `pnpm --filter @borso-app/pragma run typecheck` | pass |
| Build | `pnpm --filter @borso-app/pragma run build` | pass |
| Suite | `pnpm --filter @borso-app/pragma run test:coverage` | **140 files, 1314 tests, all passed**, 182.6 s |
| Coverage | same run, `perFile` 100 | **100%** statements 1789/1789, branches 895/895, functions 445/445, lines 1522/1522 |
| Dead code | `pnpm exec knip` | pass, no unused export, file or dependency |
| Migrations | `./scripts/check-migration-sql-dsql-compat.sh` | pass |
| Vocabulary | `./scripts/check-vocabulary-paths.sh` | pass |
| Styles/markup | `./scripts/check-no-comments-in-styles-and-markup.sh` | pass |
| Pure modules | `./scripts/check-pure-modules-have-callers.sh` | pass |
| Blueprints | `blueprint-indexing.ts --check` | pass, 1082 files, 164 blueprints, 1018 followers |
| Conventions | `convention-drift.ts --check` | pass |
| Enforcement | `enforcement-ledger.ts --check` | pass |
| Architecture | `architecture-graph.ts --check` | pass, pragma 296 files across 15 slices |

Biome does not exist in this repository; ADR-0007 replaced it with ESLint plus
Prettier, and the composite gate above is the whole of it. No gate was bypassed
and `--no-verify` was not used.

---

## D. Do the tests cover what the spec asks

### D1 — FAIL. The spec's first error case has no test

> *"A vote on a closed or already-settled round is refused with a conflict, not
> silently dropped."*

Nothing asserts it. Every 409 in the audience suite belongs to something else:
`round-already-open` (line 274), the rename refusal (301), `duplicate-vote` (382)
and `song-already-planned` (447). Grepping the file for `round-closed` returns
nothing.

The behaviour is correct — probed above, a vote on an unknown round answers 409
with `{"error":"round-closed"}` — so this is a detection gap rather than a bug,
and it is the gap that let A1 through. The plan named this exact test as the
detection for the open-round gate; had it been written for the suggestion route
too, A1 would have failed at the keyboard.

It is also cheap. The thirty-second settlement test at
`audience.controller.test.ts:506` already has a settled round in hand; one more
`POST .../votes` after it, asserting 409 and the reason, costs no extra wall
time. A second row posting to an unknown round id costs milliseconds.

### D2 — PASS, with a note. The tie rule and the retraction

`round.core.test.ts:101` gives Riff votes at :01 and :09 and Ballad votes at :02
and :04. Both hold two; Ballad's latest is earlier, so Ballad wins. This is the
test the previous round asked for, and it earns its keep: Riff's id is
`aaaaaaaa-…` and Ballad's is `bbbbbbbb-…`, so the identifier fallback in
`compareByWinningOrder` would have picked Riff. The test can tell the rule from
the fallback. A separate case at line 136 pins that a full tie — same count, same
latest instant — is a function of its inputs and not of argument order.

The retraction case at line 115 does remove a vote now, asserts the list shrank
by one, and asserts the winner moves from Ballad to Riff. That is real, and it is
the spec's *"a song that briefly led and lost its supporters does not keep that
lead"*.

**The note:** after the retraction the tie no longer exists — Riff wins two to
one, on count, which the test twenty lines above already pins. The spec asked for
*"the same tie **after a retraction reshuffles it**"*, meaning a retraction that
leaves a tie standing and moves which side of it wins. A case that does that
would be, say, Riff at :01 and :03 against Ballad at :02, :09 and :10: Ballad
leads three to two, retract Ballad's :10 and it is two-all with Riff's latest at
:03 against Ballad's at :09, so Riff takes it on the tie rule rather than on the
count. Not a failing row, because the retraction path is exercised and the winner
does move. Worth one more case.

### D3 — PASS. The pool test pins the kind distinction

`audience.controller.test.ts:407` is exactly what the brief asked for. One
concert, Ballad in a manual setlist, Riff appended to the audience-choice setlist
the first round created, then a public state read:

```ts
expect(state.state.pool.map((entry) => entry.songId)).toEqual([riffSongId]);
expect(state.state.pool.map((entry) => entry.title)).not.toContain('Ballad');
```

Both setlists are attached to the same concert, so the only thing separating them
is `kind`, and deleting the predicate at `setlists.repository.ts:93` drops Riff
out of the pool and fails the row. The pure companion at `pool.core.test.ts:57`
no longer pretends to test this — it pins that the manual-setlist exclusion and
the previous-winner exclusion are two rules rather than one, which is what that
layer can decide.

### D4 — PASS. The rest of the spec's test strategy

`round.core.ts`, `pool.core.ts`, `ballot-token.utils.ts` and
`live-concert.core.ts` all ship at 100% on all four counters, and `round.core.ts`
never calls `new Date()` — `now` is a parameter everywhere. The blank round, the
double settlement, and the vote one millisecond past the close are each pinned.
The public routes are driven with no session cookie through the composition root
(`audience.controller.test.ts:193`), which no existing controller test did. The
ballot remint is pinned twice on the front end: once asserting the first write
carried the stale token and the second the fresh one, once asserting a server
refusing both stops at two writes and one mint.

---

## Unverifiable

### U1 — Whether the vote page can reach the API in **preview**. Prod is fine; preview is not verified

This is the row the brief's stage rule is about, so it is stated per stage.

**Ungated access is stage-independent.** `buildAppRouter` (`app.ts:27`) has no
stage-conditional branch, and `audience.controller.test.ts:193` drives all six
public routes and both gated routes through `createApp()` with no cookie. That
property holds in dev, preview, integ and prod alike.

**How a browser reaches the API is not.** `api.client.ts:4` reads
`VITE_API_BASE` and falls back to `'/'`:

- In **prod** the variable is unset, so the client is same-origin. The vote
  page's calls are simple same-origin requests, no preflight is issued, and
  `credentials: 'include'` costs nothing. Nothing here is at risk.
- In **preview** `.github/workflows/preview.yml:103` bakes
  `VITE_API_BASE: https://<app>-pr-<n>-api.preview.borso.fr`, so every audience
  call is cross-origin. `app.ts:32` applies a bare `cors()`. Reading hono
  4.12.18's implementation
  (`node_modules/.pnpm/hono@4.12.18/node_modules/hono/dist/middleware/cors/index.js`):
  with no options it sets `Access-Control-Allow-Origin: *` and, because
  `opts.credentials` is undefined, it never sets
  `Access-Control-Allow-Credentials`. A request whose credentials mode is
  `include` — which every `hc` call here is — fails the CORS check against `*`
  with no `Allow-Credentials`.

  The new `x-ballot-token` header is *not* the problem: the same source shows
  that when `allowHeaders` is empty hono echoes `Access-Control-Request-Headers`
  back, so the preflight would allow it.

This is pre-existing configuration that the diff does not touch, and it would
affect the band's gated screens in preview exactly as much as the vote page, so
it is not a defect this feature introduced. I could not drive a preview host from
this session, so I am not asserting that preview is broken — only that the code
says it should be and that nothing here proves otherwise.

**What this means for the next gate:** `/visual-validation` must drive the public
page on the preview URL in a browser context with no session cookie, not on
`pnpm dev`, where the API is same-origin and the question never arises. A green
`pnpm dev` run is not evidence about preview.

### U2 — The seven named analytics events still have no substrate

`audience_ballot_minted`, `audience_vote_cast`, `audience_vote_retracted`,
`audience_suggestion_accepted`, `audience_round_opened`,
`audience_round_settled`, `audience_round_blank`. The spec names all seven as
input metrics from named events on the API. Nothing in `apps/pragma/api` emits a
named event, this feature adds no emitter, and the plan has no row for one. This
was U1 in the previous round and is unchanged. The one input metric that *did*
land is ballots against capacity, now rendered on the band's panel.

---

## Observations, none of them failing rows

- **The vote page ships the whole band ERP.** `pnpm build` produces one
  795.75 kB chunk (236.10 kB gzipped) and the public `/vote` route pulls it. The
  spec's first input metric is *"a visitor who opens the vote page during an open
  round casts a ballot within thirty seconds"*, on a phone, on venue wifi. No
  route-level code splitting exists in this application today, so this is a
  standing property rather than a regression — but this is the first route where
  a stranger pays for it.
- **`readBallotToken` calls `localStorage.getItem` unguarded**
  (`ballot-token.adapter.ts:18`). A browser with site data blocked throws rather
  than returning null, the ballot query errors, and the page offers no ballot.
  Every other consumer of local storage in this application is behind the band's
  sign-in, where the browser is known; this one is not.
- **The server keeps no record of the tokens it mints.** `requireBallot` accepts
  any 48-character lowercase hex string, so a client can hold a thousand ballots
  without a single round trip. The spec is explicit that ballot fraud is out of
  scope, and `VOCABULARY.md` correctly refuses to call this tamper-proof — but
  its Ballot section says *"identified by an opaque token the server mints"*
  without saying the server then forgets it, and `ballotCount` is the numerator
  of the spec's output metric. One sentence in the vocabulary would close the
  gap between what the entry implies and what the code does.
- **A suggestion naming a previous winner is accepted and then ignored.**
  `acceptSuggestion` writes the row and answers 201; `selectPool` drops previous
  winners ahead of the suggestion arm, so the song never appears. Harmless, and
  the spec does not cover it, but the visitor gets a success for nothing.
- **`selectCountdownFillPercent` (`vote-countdown.utils.ts:13`) divides by
  `roundSeconds`.** A zero-length round
  yields `NaN` and a `width: NaN%`. Unreachable while `ROUND_DURATION_MS` is a
  constant 30 000.
- **Two panels, two polls.** Both the concert page and the setlist editor mount
  `VotingRoundPanel`, which owns its own `useConcertVoteState`. A member with
  both screens open runs two one-second polls. The fix round called this out and
  left it deliberately; recording it here so it is not rediscovered.

---

## What has to change before this merges

1. **A1** — gate `POST /concerts/:sessionId/suggestions` on a session that exists,
   whose `kind` is `concert`, and that has an open round. Either finish
   `open-ballot.middleware.ts` into the gate its name and the plan describe, or
   put the three checks at the top of `acceptSuggestion` and return the refusals
   the table already carries.
2. **A2** — put `limitAudienceSearch` (or a sibling budget) on the public write
   routes, not on `/search` alone.
3. **A3** — drop the UTC-sliced time label in `selectRoundHistoryLines`, or format
   it in the viewer's locale.
4. **D1** — pin `round-closed`: one row asserting 409 and the reason for a vote on
   a settled round, and one for a vote on an unknown round. Then pin A1's fix the
   same way, for the suggestion route.

D2's second tie case is worth adding in the same pass and is not a blocker.
