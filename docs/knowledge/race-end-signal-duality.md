# Two end-of-race signals on `last-loop-lepin` — what to consume when

The race-engine carries two distinct "is this race over?" signals.
They have different semantics, and confusing them was the origin
of the dantotsu on the spectator-page banner (PR #23 post-merge).

## `edition.status === 'finished'` — admin intent

A field on the edition. Mutates only via
`apiClient.adminTransitionEditionStatus(slug, 'finished')` — the
operator-facing back-office button. Cannot transition automatically.
Holds operator intent: *"I've decided to close this edition; show the
final classement, enable CSV export, etc."*

Read this signal when the action implies operator-side closure:
- CSV download of the final classement (only meaningful once the
  operator has signed off).
- Hiding admin actions that only make sense pre-close.
- Filtering "archives" lists.

## `standings.raceEnded` — computed engine truth

A field on the standings DTO. Recomputed on every poll by
`ranking.core.ts:165-168` as

```
raceEnded = isRaceEndReached(edition, now) || inRaceCount <= 1
```

- `isRaceEndReached(edition, now)` — true when wall-clock crosses
  `edition.endsAt`.
- `inRaceCount <= 1` — true when at most one runner is still
  `in-race` (backyard rule: the last runner standing wins).

This signal carries engine truth. Read it for any *behaviour-side*
gate:
- The "Course terminée — classement final" banner on the spectator
  page (so the natural end of the race surfaces immediately without
  waiting for admin intervention).
- Disabling self-punch attempts past the engine-declared end.
- Stopping the loop-boundary countdown.

## Why two signals exist

Historical. The `edition.status` field predates the dynamic
`raceEnded` calculation; the engine field was added during the
backyard-rule refactor without retiring the admin signal because the
admin intent is genuinely separate (the operator should always be
able to close the books deliberately, regardless of engine truth —
e.g. to publish the final classement before the wall-clock end).

The two will almost always agree once the wall-clock crosses
`endsAt`; the gap is the window between *"engine says it's over"*
(automatic) and *"operator pushed the button"* (manual). Behaviour
gates should not depend on that gap.

## Worked example: the SpectatorPage banner

The banner *« Course terminée — classement final affiché. »* now
fires on the disjunction (`raceEnded || edition.status === 'finished'`).
The CSV download link, sitting in the same banner, stays on
`edition.status === 'finished'` because the archive CSV is an
admin artefact, not an engine artefact. Both reads coexist in the
same component (`SpectatorPage.tsx`) — the comment block at the
read site documents the split.

## See also

- [`docs/dantotsus/race-end-banner-decoupled-from-computed-raceended.md`](../dantotsus/race-end-banner-decoupled-from-computed-raceended.md) — the dantotsu that drove this entry.
