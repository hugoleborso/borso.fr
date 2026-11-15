# Invariants — borsouvertures, `domain`

The rules the terms of [the vocabulary](../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Deck line event

- It holds an `id` made on the device, a `kind` (`line-added` or
  `line-removed`), the `side`, the moves in UCI, the `openingName` reached or
  `null`, the device instant `occurredAt`, the device's `calendarDay`, the
  `deviceId`, and `receivedAt`, `null` until a server stamps it.
- A line is named by its side and its moves (`buildDeckLineKey`), so a removal
  names the line it removes.
- Events live in the IndexedDB database `borsouvertures-personal-deck`, in the
  store `deck-line-event`, and on the server in `deck_line_event`. Push, pull,
  cursor and merge work as for review events, under the cursor key
  `borsouvertures.deck-line-sync-cursor`.

Held by: `api/src/deck-line-events/deck-line-events.controller.test.ts` › stores a batch pushed twice at once from two sessions once, and answers both with the same receipts

## Outcome

- A card is recalled when the reader plays its book move. A move outside the
  deck, or a tap on *Show the move*, misses it.
- Recalled maps to the scheduler's Good and missed to Again. No other grade is
  used.
- A missed card comes back later in the same session, and that second answer
  stores no review event.

Held by: `site/src/review/review-machine.utils.test.ts` › brings a missed card back at the end, and its second answer stores no event

## Position key

- The four fields are the board, the side to move, the castling rights and the
  en passant square. The two move counters are dropped, so two move orders that
  reach one position share a key.
- `chess.js` writes the en passant square only when a capture is possible, so
  the key changes only when the position really does.

Held by: `domain/position-key.core.test.ts` › carries an en passant square that changes a position key

## Review event

- It holds an `id` made on the device, the `cardId`, the `outcome`, the device
  instant `reviewedAt`, the device's `calendarDay` at that instant, the
  `deviceId`, and `receivedAt`, which is `null` until a server stamps it.
- Card state, the daily plan and every count are replayed from the events and
  never stored. `listReviewEventsInReplayOrder` orders them by replay instant,
  then by id.
- `selectReplayInstant` is the earliest of `reviewedAt`, `receivedAt` and now,
  so an event from a clock running ahead is clamped.
- Events live in the IndexedDB database `borsouvertures-review`, in the object
  store `review-event`, keyed by `id`. When the store cannot open or write, the
  log stays in memory and a banner says progress will not be kept.

Held by: `domain/review-event.core.test.ts` › clamps a reviewedAt in the future to now
Held by: `site/src/routes/OpeningTrainerPage.reload.test.tsx` › finds the same progress after a reload
