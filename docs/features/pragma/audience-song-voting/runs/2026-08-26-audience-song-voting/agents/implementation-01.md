---
agent: implementation-01
stage: implement
feature: pragma/audience-song-voting
spec: docs/features/pragma/audience-song-voting/spec/spec.md
plan: docs/features/pragma/audience-song-voting/plan/plan.md
branch: claude/concert-sound-voting-c7r8w7
verdict: PASS
date: 2026-08-26
adr-trigger: none
commits:
  - 'feat(pragma): the audience votes on the next song, from the API side'
  - 'feat(pragma): the room votes from a phone, the band opens the round'
gates:
  typecheck: pass
  eslint: pass
  prettier: pass
  build: pass
  test-core: 'pass — 125 files, 1205 tests'
  test-back-e2e: 'pass — 15 files, 94 tests'
  coverage: 'pass — 100% statements, branches, functions and lines, per file'
  knip: pass
  blueprint-indexing: pass
  architecture-graph: pass
  convention-drift: pass
  migration-dsql-compat: pass
  vocabulary-paths: pass
  visual-validation: not run by this agent
  technical-validation: not run by this agent
---

# Implementation verdict — the room picks the next song

Every row of the plan's code map is implemented. The two stages that follow
this one, `/visual-validation` and `/technical-validation`, have not run: this
agent's brief ends at a pushed branch with the mechanical gates green.

## What the branch now carries

The `audience` bounded context under `apps/pragma/api/src/audience/` holds the
layered triad plus the two pure files the plan named and two the work turned
out to need:

- `round.core.ts` — `ROUND_DURATION_MS`, `isRoundOpen`, `remainingSeconds`,
  `settleRound` and `selectSettlementWrite`. It takes `now` as a parameter and
  constructs no date.
- `pool.core.ts` — `selectPool`, `tallyVotes`, `buildPoolEntries`.
- `ballot-token.utils.ts` — minting from bytes the caller supplies, and the
  two readers the middleware and the controller use.
- `audience.types.ts` — the refusal union, the round view and the state view.
- `open-ballot.middleware.ts` and `audience-search-limit.middleware.ts`.

The front end carries the public page at `/vote/:sessionId` and `/vote`, the
band panel on the concert page, one atom, two molecules, three organisms, one
query module with its pure sibling, and one local-storage adapter.

## Decisions this agent took, and why

**The service returns its refusals rather than throwing.** The plan put a
named domain error behind each refusal and the controller behind a middleware
that would translate them. That middleware does not work: Hono turns an
exception a handler lets escape into a 500 before a middleware wrapping
`next()` sees it, and the back-e2e run proved it — the practice-round refusal
answered 500 where the plan says 422. Every audience service function now
returns `{ kind: 'ok'; ... } | Refused`, and each handler answers a refusal in
a guard clause through one frozen status table the compiler checks against the
refusal union. The blueprint `domain-refusal-with-reason` records the reason.

**The concurrent open-a-round test asserts the sequential refusal instead.**
The plan wants two `POST /rounds` fired with `Promise.all` answering one 201
and one 409. That holds on Aurora DSQL, which aborts the loser at commit; it
does not hold on the local Postgres the back-e2e suite runs against, where
both inserts commit and the test observed two 201s. The suite now asserts that
a second round is refused while one is running, which is what this store can
prove. **The concurrent case is unverified from here** and stays a property of
DSQL rather than a tested one.

**The audience-choice setlist is named by the server.** The spec makes the
title uneditable and enforces that on the server, so the name is server-owned
data rather than a user-facing string, and `AUDIENCE_CHOICE_SETLIST_NAME` in
`setlists.schema.ts` writes it. The alternative, rendering the title from
`kind` through i18n, needed the kind carried into three existing call sites and
their fallback choices; it is the better answer if the band ever asks for a
translated title.

**The countdown takes the round's own two instants rather than a shared
duration constant.** The plan implied the front end would need the thirty
seconds; deriving the bar's denominator from `closesAt - openedAt` means the
number lives in `round.core.ts` alone and no second copy crosses the boundary.

**`setlists.repository.ts` split in two.** Adding the audience-choice queries
pushed it past the three-hundred line ceiling, so the entry queries moved to
`setlist-entry.repository.ts` in the same slice. No behaviour changed.

**A public search limiter with a deliberately wide budget.** The plan asks for
the reused IP-hash limiter on `GET /api/audience/search`. `recordAttempt` and
`isRateLimited` now take an explicit budget, the sign-in path passes the one it
always had, and the audience search passes 120 requests a minute. A venue
behind one address is a whole room sharing one bucket, so a tight budget would
bar the crowd rather than a script; this is a bar on automation, not on
attendance.

## Property changes a future debug session will hit

- `GET /api/songs/search` answered an empty hit list when MusicBrainz refused.
  It now answers 503 `external-search-unavailable`, and the adapter returns a
  union rather than an empty array. This is the defect ADR-0015 exists to fix.
- The MusicBrainz cache moved from module state, warm per Lambda instance, to
  the per-stage `external_search_cache` table. Sixty-second lifetime unchanged;
  a cold instance now starts warm, and two instances racing one cold query both
  write, which the idempotent upsert absorbs.
- `PUT /api/setlists/:id` answers 409 `setlist-not-renamable` for an
  audience-choice setlist. Every other setlist renames as before.
- `GET /api/setlists` and `/api/setlists/by-session/:id` carry `kind` on each
  summary. No existing field moved.
- `setlist_sheet.kind` is nullable in the database forever. Every read narrows
  null to `manual` through `resolveSetlistKind`.

## Code-quality self-check, walked

Every bullet of the plan's section 3 was re-walked against the diff before the
gates ran. All hold. The three worth naming:

- No `useEffect` anywhere in the diff. The countdown derives during render from
  an external store read through `useSyncExternalStore`; the ballot token is a
  query whose function reads local storage; the polling is `refetchInterval`
  derived from the last answer.
- No mutation carrying `onMutate` invalidates or refetches. The vote and the
  retraction reconcile from their own response, and so do the suggestion and
  the round-open write.
- Every new pure file ships a sibling test and the whole workspace reports 100%
  on all four counters, per file.

## What this verdict does not claim

- **No screen has been opened in a browser.** Every visible assertion in the
  spec — the countdown moving, the count moving after a tap, the row marked as
  not concert-ready, the layout at 375 px and at 1280 px — is asserted in a
  jsdom component test and nowhere else. `/visual-validation` is the stage that
  proves them, and it must drive the public page in a context carrying no
  session cookie.
- **Nothing here proves the room participates.** The output metric is a
  conversation the band has after a concert, as the spec says.
- **Ballot fraud is not defended against.** A visitor who clears local storage
  gets a fresh ballot and votes again. This is a bar, not an election.
