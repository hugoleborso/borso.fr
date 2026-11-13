# ADR-2026-11-13T0001: `ts-fsrs` schedules the cards, with fuzz off and a pinned configuration

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-13
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, dependency

## Context

The trainer asks each card again when it is about to be forgotten. Something has to turn a card's history of `recalled` and `missed` into its next due date. Card state is never stored. It is replayed from the event log on every device (ADR-2026-11-13T0000). The scheduler is therefore called for every event at every start, in the browser, and two devices must get the same answer from the same log.

A new dependency is an ADR decision in this repository. The grading is binary (read in the spec's decisions table), so the scheduler receives two of the four FSRS grades, Good and Again.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The operator's objective is deck retention. The scheduler decides what he sees each day. | Deck retention per week on the Stats screen. It moves over months and no gate asserts it. |
| Same log, same state on every device | operator | high | It is the property the event log was chosen for. | The same reviews replayed twice give equal cards |
| Runs in a browser bundle | author | high | The replay runs on the device, offline. | A bundle built for the browser platform, and its size |
| Coverage, the pieces it provides against the pieces we would write | author | medium | The standard asks it of a library that replaces hand-written code. | Its exports against what the replay needs |
| Licence and upkeep | author | medium | The app ships its dependencies to the public. | npm metadata |

## Decision

**`ts-fsrs` 6.0.0, pinned exactly, with `enableFuzz: false` and every option named in one constant.** Recalled maps to `Rating.Good` and missed to `Rating.Again`. The model version, the desired retention and the learning steps are written out, never left to the library's defaults, because the default model changes with the library (its README says `DefaultScheduler()` uses FSRS-7 when `version` is omitted). The plan sets the values. A golden test replays a fixed log and compares the resulting cards, so an upgrade that moves a due date fails a test before it reaches a device.

Measured on npm and in a scratch folder on 2026-11-12:

- `ts-fsrs` 6.0.0 is MIT and declares `engines.node >=24.0.0`. It was published on 2026-10-28. The repository runs Node 24 (`.nvmrc` holds 24.22.3).
- It has one dependency, `@open-spaced-repetition/srs-kit` 1.0.0, BSD-3-Clause, `engines.node >=20.0.0`. The spec did not name it.
- It ships ESM, CommonJS and UMD builds and declares `sideEffects: false`.
- A script importing `DefaultScheduler` and `Rating`, bundled by esbuild with `--platform=browser --target=es2022 --minify`, is 61,982 bytes and 16,910 bytes gzipped. The output holds no `require(` and no `node:` import.
- That bundle ran under Node 22.23.4, the only Node in the session, and four reviews replayed twice gave equal cards with fuzz off. The one field that differed is `cardId`, a random UUID that `newCard` makes.
- It was not run in a real browser. The Node 24 engine requirement was not exercised, because the session has no Node 24.

It would be worth reversing if a patch release changes scheduling output, if `srs-kit` changes licence, or if retention falls while the daily plan is completed and the cause is the model and not the content.

## Consequences

- `+` The scheduling model is the published FSRS one, maintained outside this repository.
- `+` The replay stays a pure function. The library takes `now` as an argument and returns a new card (measured in the scratch run, and stated in its README).
- `-` Two runtime packages enter the site bundle, about 62 kB minified before the app's own tree shaking (measured above).
- `-` `DefaultScheduler()` returns a promise (read in its README). The replay core cannot build its scheduler synchronously, so the scheduler is built once and passed in.
- `-` The major version is 15 days old on the day of this record. A scheduling fix upstream changes every card's due date on the next replay.
- `-` Two devices on two app versions can disagree on what is due until both update, because the state is computed and not synced.
- `~` The app never uses the library's own `cardId`. A card's identity is the spec's `CardId`.
- `~` `Rating.Hard` and `Rating.Easy` are never sent. Four-grade review would need no new library.

## Alternatives considered

### Option A — `ts-fsrs` 6.0.0, fuzz off, configuration pinned (chosen)

- **Raised by:** author (the spec names it)
- **Summary:** as in the Decision.
- **Strengths:**
  - it provides the card, the review step and the model, which is all the replay needs. The app writes only the mapping from outcome to grade and the loop over events.
  - deterministic with fuzz off (measured).
- **Costs:** two packages and about 17 kB gzipped. A young major version.
- **Rationale:** it meets the three high criteria, and the cost is bounded by a golden test.

### Option B — A hand-written fixed ladder of intervals (rejected)

- **Raised by:** author
- **Summary:** Not adopting a library. A `scheduler.core.ts` moves a recalled card one step up a list of intervals and a missed card back to the first.
- **Strengths:** no dependency. Trivially deterministic. Small enough to read in one screen.
- **Costs:** the intervals are guesses, and they ignore how hard a card has been. The repository would own the model.
- **Rejection rationale:** it loses on the first criterion (inferred, no retention was measured for either). It would win if the bundle or the upstream churn became a problem, and it stays the fallback.

### Option C — `ts-fsrs` 5.4.2 (rejected)

- **Raised by:** author
- **Summary:** The previous major, which declares `engines.node >=20.0.0` (measured on npm).
- **Strengths:** older and settled. No Node 24 requirement.
- **Costs:** a migration to 6 later would change computed state. Its API and bundle were not measured this session.
- **Rejection rationale:** the repository already runs Node 24, so its one advantage does not apply.

### Option D — No scheduler, review every card every day (rejected)

- **Raised by:** author
- **Summary:** Not doing it. Today shows every card of every deck.
- **Strengths:** nothing to compute.
- **Costs:** the daily session grows with every deck, so the operator stops finishing it (inferred).
- **Rejection rationale:** it fails the first criterion.

## Scores

|  | A, ts-fsrs 6.0.0 | B, fixed ladder | C, ts-fsrs 5.4.2 | D, no scheduler |
|---|---|---|---|---|
| Changes the app for its users | ✓ asks at the modelled time | ✗ guessed intervals | ✓ | ✗ everything, daily |
| Same log, same state | ✓ measured with fuzz off | ✓ by construction | ✓ not measured | ✓ |
| Runs in a browser bundle | ✓ 16,910 bytes gzipped | ✓ no dependency | ✗ not measured | ✓ |
| Coverage | ✓ card, review, model | ✗ all hand-written | ✓ | ✗ |
| Licence and upkeep | ✓ MIT and BSD-3-Clause, 15 days old | ✓ ours | ✓ MIT | ✓ |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), decision rows "How is a review graded?" and "What is the event and sync shape?"
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/site/src/review/scheduler.core.ts` (new), `apps/borsouvertures/package.json`
- Related ADRs: [ADR-2026-11-13T0000](./2026-11-13T0000-progress-is-a-log-of-immutable-review-events-merged-by-id.md) (the log this replays)
