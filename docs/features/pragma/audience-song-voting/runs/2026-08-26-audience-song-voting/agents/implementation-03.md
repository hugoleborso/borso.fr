---
status: done
summary: >-
  Closed the four blockers from technical-validation-03 in three commits.
  acceptSuggestion now refuses on a session that is not a concert and on a
  concert running no round, so the route that inserted a catalogue row for any
  made-up UUID inserts nothing; the three public write routes share a rate
  limiter that only the search route carried; and the round history reads the
  clock the band is standing at rather than five characters of a UTC instant.
  Five back-e2e rows close the round-closed detection gap the spec's first
  error case had. One thing outside the blockers moved: two vote-page cases
  failed about one run in five before this round, and the wait they used is
  fixed rather than walked past. The pragma suite is 1322 tests green at 100%
  per-file coverage, with eslint, prettier, knip, typecheck and build clean.
artifacts:
  - apps/pragma/api/src/audience/audience.service.ts
  - apps/pragma/api/src/audience/audience.controller.ts
  - apps/pragma/api/src/audience/audience-rate-limit.middleware.ts
  - apps/pragma/api/src/audience/audience.controller.test.ts
  - apps/pragma/site/src/lib/formatters.utils.ts
  - apps/pragma/site/src/lib/formatters.utils.test.ts
  - apps/pragma/site/src/components/organisms/voting-round-panel.core.ts
  - apps/pragma/site/src/components/organisms/voting-round-panel.core.test.ts
  - apps/pragma/site/src/components/organisms/VotingRoundPanel.tsx
  - apps/pragma/site/src/lib/queries/queries.test-utils.tsx
  - apps/pragma/site/src/routes/vote/VotePage.test.tsx
next:
  kind: validate
---

# Implementation, fix round three

A fix round on `claude/concert-sound-voting-c7r8w7`, scoped to the four rows
`technical-validation-03` failed the branch on. Three commits, one per subject,
plus one for a flaky test the round could not push past.

## A1 — the suggestion route was an open write into the catalogue

`acceptSuggestion` opened on `getManualSetlistSongIdsOfSession` and went
straight to resolving the song. Nothing between the request and
`importSuggestedSong`, which calls MusicBrainz and then `createSong(... status
'idea')`, asked whether the session existed, whether it was a concert, or
whether a round was running on it.

`readConcertRunningARound` now runs first. It refuses `not-a-concert` when the
session is unknown and when its `kind` is not `concert`, and `round-closed`
when the concert has no round open at `now`. Both reasons already exist in
`AUDIENCE_REFUSALS` and already map to 422 and 409 in the controller's frozen
status table, so no new refusal and no new status were needed.

**Where the gate sits, and why it is not the middleware.** Plan row 116 names
`open-ballot.middleware.ts` as the place to "gate the public write routes on a
concert that has an open round and a well-formed ballot token". The middleware
keeps the token half only. The two write shapes key on different identifiers:
the vote and the retraction carry a `roundId`, the suggestion carries a
`sessionId`, and one middleware cannot read both without a second lookup that
duplicates what the service already does. `castVote` and `retractVote` have
refused a closed round through `readOpenRound` since the first round; the
suggestion is now symmetric with them, and every refusal in this slice reaches
the controller by the same path. The blocker itself names
`audience.service.ts` as the file, which is where the fix landed.

Three existing suggestion tests were passing because the gate was absent; each
now opens a round first, through a new `openRoundOn` helper.

## A2 — the write routes had no bucket

`buildAudienceSearchLimiter` was applied to `GET /search` alone. The file is
now `audience-rate-limit.middleware.ts` and the function is
`buildAudienceRateLimiter(budget, …)`, because the name it had described one
of the two budgets it now serves. The search keeps `AUDIENCE_SEARCH_BUDGET`,
120 a minute. The three write routes share one built instance carrying
`AUDIENCE_WRITE_BUDGET`, 600 a minute, so an address that hammers votes spends
the same bucket it would spend on suggestions.

**The budget is wide on purpose and this is a trade-off, not an oversight.** A
venue sits behind one address, so the whole room shares one bucket: a room of
three hundred people casting two votes each in a thirty-second round is around
1 200 requests a minute from that one address, and a budget tight enough to
stop a script would refuse the crowd the feature exists for. 600 a minute bars
a script running orders of magnitude above a room and leaves a plausible room
alone. The spec is explicit that this is a bar and not a defence against
ballot fraud, which it puts out of scope; nothing here changes that.

## A3 — the panel showed a UTC hour as a local time

`selectRoundHistoryLines` built `openedAtLabel` as
`round.openedAt.slice(11, 16)`, and `round.openedAt` is
`round.openedAt.toISOString()` from the service. A round opened at 21:30 in
Paris in August rendered as 19:30 on the band's own panel.

`formatClockTime` joins `formatSessionDate` in `formatters.utils.ts`, taking
the locale as an argument the way the `utils-formatter` blueprint requires, and
returning the input untouched on a malformed ISO string as its sibling does.
`selectRoundHistoryLines` takes a locale and `VotingRoundPanel` passes
`i18n.language`, which is how `SetlistCatalogList` already feeds
`formatSessionDate`.

The core test pins the label under `TZ=Europe/Paris` through `vi.stubEnv`, so
`2026-08-26T21:04:00.000Z` must render `23:04`. Without the pinned zone the
case would pass on a UTC runner against the old slice, which is exactly how
the defect survived.

## D1 — the round-closed test the spec's first error case never had

Five rows, all through `createApp()`:

- a vote naming a round nobody opened answers 409 and `round-closed`;
- a vote on the settled round inside the settlement case answers the same,
  costing no extra wall time since that case already waits the thirty seconds;
- a suggestion on a concert running no round answers 409 `round-closed` and
  leaves the catalogue count unchanged;
- a suggestion on a practice and on an unknown session both answer 422, the
  second carrying `not-a-concert`, and neither writes a song;
- one address driven past `AUDIENCE_WRITE_BUDGET.maxAttempts` on the retraction
  route answers 429, and the next suggestion from that address answers 429 too,
  which is what pins the three routes to one bucket rather than three.

## One thing outside the blockers

`VotePage.test.tsx` failed about one run in five, on two different cases, both
reporting `expected [] to have a length of 2`. Measured before any change here:
twelve runs of the file gave two failures, and twelve on the parent commit gave
two more, so the flake predates this round. Under the repository's rule that a
failure is never walked past as preexisting, it is fixed here rather than left
for the next agent to rediscover.

Two causes, both in the waiting. `flushUntil` flushed microtasks only, so a
query resolving on a timer could still be pending after all eight attempts and
the row the case clicked was still disabled, meaning the click sent nothing.
And `flushUntil` returned silently when its condition never held, so the give-up
surfaced at the assertion as an empty array rather than as the wait that
failed. It now yields a task between attempts through a new `flushTasks` in
`queries.test-utils.tsx`, and throws when the page never reaches the state the
case waits for. The retry case waits on the enabled row and on the second write
instead of on `aria-pressed` alone, which was already `false` before the
optimistic update ran. Twenty consecutive runs of the file are green.

## Gates

| Gate | Result |
|---|---|
| `pnpm exec eslint` on the changed files | clean |
| `pnpm exec prettier --check` on the changed files | clean |
| `pnpm --filter @borso-app/pragma run typecheck` | clean |
| `pnpm --filter @borso-app/pragma run build` | clean |
| `pnpm --filter @borso-app/pragma run test:coverage` | 140 files, 1322 tests, 100% statements, branches, functions and lines per file |
| `pnpm exec knip` | clean |
| `blueprint-indexing.ts --check` | annotations complete, index up to date |
| `architecture-graph.ts --check` and `convention-drift.ts --check` | clean |
| pre-commit, all three commits | every check green, never bypassed |

No ADR trigger: no new dependency, no new secret, no schema column driven by an
external service, and nothing outside the ratified spec.
