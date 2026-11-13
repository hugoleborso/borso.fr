# ADR-2026-11-13T0000: Progress is a log of immutable review events, local first, merged by id

- **Status:** proposed. Decided by the agent on 2026-11-12, delegated by the operator, to ratify at pull-request review.
- **Date:** 2026-11-13
- **Deciders:** the agent, delegated by Hugo Borsoni
- **Tags:** opening-trainer, borsouvertures, data

## Context

The trainer has to remember what the reader recalled and when, so a scheduler can ask again. The operator reviews on a phone and a laptop, and either can be offline. The same card can therefore be reviewed on two devices before they meet. A reader without an account has only the browser. The app stores one localStorage record and no progress today (read in the spec, "Why").

The question is what shape progress takes in the browser and on the server, and how two copies become one. The shape is hard to change later, because every stored row and every device carries it.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A review made offline on one device must appear on the other, and none may be lost. | Input metric (b) of the spec, and its visual-validation row with two browser profiles |
| Every device computes the same state | operator | high | The spec keeps the operator's design, events merged by id. Two devices that disagree on what is due break the daily plan. | Unit case "two devices replayed in either arrival order give the same state" |
| Reviews work offline and with no account | author | high | The API is never on the review path (ADR-2026-11-12T2359). | A session run with the network off |
| Every rule is checked with no browser and no person | operator | high | The operator required a fully autonomous test strategy. | The rules sit in `*.core.ts` files that take `now` as an argument, at 100% coverage |
| Runtime dependencies added | author | low | A new dependency is a decision of its own. | Count in `package.json` |

## Decision

**A review is one immutable `ReviewEvent`, written first to IndexedDB, and two logs merge by the union of their ids.** Card state, the daily plan, the streak and retention are replayed from the log and stored nowhere, in the browser or in the database. The server keeps the same events in `review_event`, keyed by the id the device made, and stamps its own `receivedAt`. A push is idempotent by id. A pull reads after a cursor on `(received_at, id)` and re-reads a one-minute overlap. The replay orders events by the earlier of the device time and the server time. Two events at the same instant are ordered by id, so the order never depends on arrival (added by the author, the spec says only "time order").

The browser store is IndexedDB behind one hand-written `review-event-store.adapter`, with no library. `fake-indexeddb` 6.2.8, Apache-2.0 (measured on npm on 2026-11-12), is a dev dependency for that adapter's tests.

It would be worth reversing the "never stored" half if replaying the log at start becomes visible to the reader. The replay time is unknown, it was not measured. The repair is a disposable cache of derived state, which changes no stored shape. It would be worth reversing the hand-written adapter if it needs a second object store or a schema upgrade path, which is what `idb` exists for.

## Consequences

- `+` No review is lost when two offline devices meet. Both events are kept.
- `+` A scheduler change or a bug fix recomputes every card from the same history, with no migration.
- `+` Retention is one query over one table.
- `-` The log only grows. Nothing compacts it and nothing deletes an event. Its size after a year is unknown.
- `-` A wrong event cannot be corrected in place. There is no undo.
- `-` Every start replays the whole log before Today can show a due count.
- `-` A device clock that runs behind is accepted, because it cannot be detected (read in the spec's decisions table).
- `~` The scheduler must be deterministic, so its fuzz stays off (ADR-2026-11-13T0001).
- `~` A reader without an account loses the log when the browser clears site data. Nothing warns of it.

## Alternatives considered

### Option A — Immutable events, local first, union by id (chosen)

- **Raised by:** operator (the design), author (IndexedDB and the tie-break)
- **Summary:** as in the Decision.
- **Strengths:**
  - merging is a set union, which has no conflict to resolve.
  - the replay is a pure function of the log and `now`, so every named case is a unit test.
- **Costs:**
  - an append-only table and an append-only browser store, both unbounded.
  - one replay per start.
- **Rationale:** it is the only shape where arrival order cannot change the result.

### Option B — One mutable row per card, last write wins (rejected)

- **Raised by:** author
- **Summary:** Each card keeps its due date, stability and difficulty. A sync sends changed rows and the later write replaces the earlier.
- **Strengths:** small and bounded storage. No replay at start.
- **Costs:** two offline reviews of one card collapse into one, so a review is lost. The winner is chosen by device clocks. A scheduler change needs a data migration on every device.
- **Rejection rationale:** it loses on the two high criteria the operator raised. It would win only if storage size became the binding constraint.

### Option C — The server holds the state and reviews need the network (rejected)

- **Raised by:** author
- **Summary:** Each review is a request. The browser stores nothing.
- **Strengths:** one copy, no merge.
- **Costs:** no review offline, and no review at all for a reader without an account.
- **Rejection rationale:** it fails the offline criterion and the audience decision.

### Option D — Events in the existing localStorage record (rejected)

- **Raised by:** author
- **Summary:** Not adding a browser store. The log is appended to the `borsouvertures.v1` record.
- **Strengths:** no new adapter and no dev dependency.
- **Costs:** every append rewrites the whole serialised log, on the main thread, and the record has a fixed quota the app does not control (web platform behaviour, not measured here).
- **Rejection rationale:** it loses as the log grows, and the log only grows.

### Option E — Store no progress, as today (rejected)

- **Raised by:** author
- **Summary:** Not doing it. The drills stay as they are.
- **Strengths:** nothing to build.
- **Costs:** nothing asks the reader again, which is the problem the spec opens with.
- **Rejection rationale:** it fails the first criterion.

## Scores

|  | A, events by id | B, mutable rows | C, server only | D, localStorage | E, nothing |
|---|---|---|---|---|---|
| Changes the app for its users | ✓ no review lost | ✗ a review can be lost | ✗ nothing offline | ✓ on one device | ✗ no progress |
| Same state on every device | ✓ union, fixed order | ✗ clocks decide | ✓ one copy | ✓ same as A if synced | ✗ |
| Offline and no account | ✓ | ✓ | ✗ | ✓ | ✓ |
| Checked with no browser | ✓ pure replay | ✓ | ✗ needs the API | ✓ | ✓ |
| Runtime dependencies | ✓ none | ✓ none | ✓ none | ✓ none | ✓ none |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), "Types / domain model" and "Database changes"
- Plan: not written yet
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/domain/review-event.core.ts`, `apps/borsouvertures/site/src/review/review-event-store.adapter.ts`, `sync.core.ts`, `sync.adapter.ts`, `apps/borsouvertures/api/src/review-events/` (all new)
- Related ADRs: [ADR-2026-11-12T2359](./2026-11-12T2359-borsouvertures-becomes-a-full-stack-app-for-one-account.md) (the API this log syncs through)
