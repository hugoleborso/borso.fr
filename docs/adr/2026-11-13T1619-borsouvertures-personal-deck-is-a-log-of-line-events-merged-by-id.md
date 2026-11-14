# ADR-2026-11-13T1619: The personal deck is a log of immutable line events, merged by id like the reviews

- **Status:** proposed
- **Date:** 2026-11-13
- **Deciders:** the agent, on the operator's product call of 2026-11-13
- **Tags:** opening-trainer, borsouvertures, data

## Context

The operator asked to replace the Explore tab with an open explorer and to add a line he finds there to a personal deck of his, "My lines" by default (operator decision, 2026-11-13). Its cards are reviewed from the next day on every device, synced like the rest of his progress. A reader without an account keeps the deck in the browser.

Every deck so far is a content file built at deploy ([ADR-2026-11-13T0004](./2026-11-13T0004-decks-and-ideas-are-content-files-and-lichess-data-is-pinned.md)). Progress is a log of immutable review events merged by id ([ADR-2026-11-13T0000](./2026-11-13T0000-progress-is-a-log-of-immutable-review-events-merged-by-id.md)). The personal deck is the first content the reader writes, so it is neither. It needs a stored shape on the device and on the server, and a rule for two devices that change it offline. A stored shape is hard to change once rows exist.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A line added on the phone has to be in "My lines" on the laptop. | The two-session browser check: a line added and pushed in one session shows on Decks in a second signed-in session |
| Every device computes the same deck | author | high | Card ids hang off the deck's positions. Two devices with different decks would schedule different cards. | Unit case: the same events in any arrival order replay to the same lines |
| Works offline and with no account | operator | high | Every screen works without the API ([ADR-2026-11-12T2359](./2026-11-12T2359-borsouvertures-becomes-a-full-stack-app-for-one-account.md)). | Adding a line with the API down stores it and the deck shows |
| Reuses the sync the app already has | author | medium | A second mechanism doubles the code that can drop data. | The new slice reuses the cursor, the push receipts and the merge of review events |

## Decision

**Immutable deck line events, local first, union by id.** Adding a line writes one `DeckLineEvent` of kind `line-added`, and removing one writes `line-removed`. Each event holds its id, the side, the moves in UCI, the opening name, the device instant, the device's calendar day, the device id and `receivedAt`. Events live in the IndexedDB database `borsouvertures-personal-deck` and sync through `POST` and `GET /api/deck-line-events` into the table `deck_line_event`, with the same idempotent push and cursor pull as review events. The personal decks are replayed from the log in time order and stored nowhere. A line that would give the reader a second move at a position of the deck is skipped on replay, with the same check the explorer runs before it writes the event.

It would be worth reversing if the operator wants to edit a line's moves in place, or to share a deck with another account.

## Consequences

- `+` Two offline devices that each add a line both keep it. A conflict is resolved the same way on every device, by replay order.
- `+` The sync loop, the cursor rules and the IndexedDB adapter are shared with review events (`helpers/pull-cursor/`, `lib/event-store.adapter.ts`, `lib/event-log.store.ts`).
- `-` A second table and a second pull on every sync round. The log only grows, as the review log does.
- `-` A line added on two offline devices with conflicting moves keeps the earlier one only. The later device sees its line vanish after sync, with no message.
- `-` A card of "My lines" is a separate card from the same position in a file deck, so the same question can be asked twice, once per deck.
- `~` The table holds no account column, as `review_event` does not, because there is one account.

## Alternatives considered

### Option A — Immutable line events, union by id (chosen)

- **Raised by:** author, following the operator's request that the deck syncs like his progress
- **Summary:** as in the Decision.
- **Strengths:**
  - same merge as review events, so no conflict to resolve at the storage level.
  - the replay is a pure function in `personal-deck.core.ts`, fully tested.
- **Costs:** one table, one migration, one more object store, one more pull per round.
- **Rationale:** it is the only option that meets the three high criteria.

### Option B — One mutable row per line, last write wins (rejected)

- **Raised by:** author
- **Summary:** The server keeps one row per line, keyed by side and moves, with a deleted flag. A sync sends changed rows.
- **Strengths:** a bounded table.
- **Costs:** an add and a remove made offline on two devices are ordered by device clocks, and a new merge rule beside the one the app has.
- **Rejection rationale:** loses on "every device computes the same deck" when clocks disagree, and on reuse.

### Option C — Lines kept in localStorage, no sync (rejected)

- **Raised by:** author
- **Summary:** Not syncing. The lines live in the persisted record.
- **Strengths:** no table, no API change.
- **Costs:** a line added on the phone never reaches the laptop.
- **Rejection rationale:** fails the operator's criterion outright.

### Option D — The personal deck as a content file built at deploy (rejected)

- **Raised by:** author
- **Summary:** "Add" proposes a change to a deck folder, and the deck ships with the next deploy.
- **Strengths:** the existing build rules and the Stockfish gate apply.
- **Costs:** an add needs a commit and a deploy, and a reader without an account cannot add at all.
- **Rejection rationale:** fails the offline and the user criteria.

## Scores

|  | A, line events | B, mutable rows | C, localStorage | D, content file |
|---|---|---|---|---|
| Changes the app for its users | ✓ synced on every device | ✓ synced | ✗ one device | ✗ waits for a deploy |
| Same deck on every device | ✓ fixed replay order | ✗ clocks decide | ✓ one device only | ✓ one file |
| Offline and no account | ✓ | ✓ | ✓ | ✗ |
| Reuses the existing sync | ✓ same merge and cursor | ✗ new rule | ✓ nothing to sync | ✗ |

## Implementation pointers

- Spec: [`docs/features/borsouvertures/opening-trainer/spec/spec.md`](../features/borsouvertures/opening-trainer/spec/spec.md), decision row of 2026-11-13 on the open explorer and the personal deck
- Plan: none, the change was briefed directly
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/borsouvertures/domain/deck-line-event.core.ts`, `apps/borsouvertures/api/src/deck-line-events/`, `apps/borsouvertures/api/src/database/migrations/0001_deck_line_event.sql`, `apps/borsouvertures/site/src/personal-deck/`, `apps/borsouvertures/site/src/review/sync.setup.ts`
- Related ADRs: [ADR-2026-11-13T0000](./2026-11-13T0000-progress-is-a-log-of-immutable-review-events-merged-by-id.md), [ADR-2026-11-13T0004](./2026-11-13T0004-decks-and-ideas-are-content-files-and-lichess-data-is-pinned.md)
