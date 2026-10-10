---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: high
related-pr: 110
fix-pr: 161
fix-commits: [243ee9e8, 161cc464, bb1d646d]
eradication-level: 1
time-to-detect: weeks
tags: [last-loop-lepin, banana-rush, dsql, concurrency, blueprints, review, testing]
blueprints: [service-orchestration, schema-dsql-constraints]
---

# Five monkeys at a three seat table

## Symptom

A host opens a `banana-rush` game for three players and reads the code out
loud. The other people in the room type it at the same moment. Four of them
join. The lobby now shows five monkeys at a three seat table, and two of them
share a seat number. Two friends who both tap the lemur both get the lemur.

On `last-loop-lepin`, a runner taps *Punch* and the network is slow, so they
tap again. Both requests are recorded, and the runner has two punches for the
same loop.

Both reproduce every time once the requests genuinely overlap:

```
FAIL  the refusals a player can hit > seats exactly as many players as the table holds when they all arrive at once
AssertionError: expected [ 201, 201, 201, 201 ] to deeply equal [ 201, 201, 409, 409 ]

FAIL  punch.service > keeps one punch when the same runner is punched twice at the same instant
FAIL  punch.service > keeps one punch when a catch-up and a live punch land on the same loop at once
AssertionError: expected [ { status: 'fulfilled', …(1) }, …(1) ] to have a length of 1 but got 2
```

Found by a read-only third-party review. No user reported it, which on a game
played by friends in one room says more about luck than about the code.

## Root-cause chain

1. **Why were four players seated at a table with two free seats?** Each
   `joinGame` read the players, counted two, asked `refuseJoin` whether there
   was room, was told yes, and inserted with `seatOrder: players.length`.
   All four reads happened before any insert.
2. **Why did nothing refuse the extra inserts?** The `player` table's only key
   is its surrogate `id`. No constraint knows about seats or monkeys.
3. **Why was the limit only checked in code?** Because that is the shape the
   repository teaches. The `service-orchestration` blueprint said *"Use for a
   workflow that reads, decides, then writes"*, and its description read
   *"Reads the edition and the runner's existing punches through the
   repository, hands them to a pure decision function"*. Its own subject,
   `registerPunch`, had the same race. `docs/standards/04-backend-architecture.md`
   showed the same thing as its example of a good service. `joinGame` carries
   no marker, but `createGame` and `startRematch` beside it follow that
   blueprint.
4. **Why did the blueprint teach it?** It was written about `registerPunch`
   after the database had stopped holding the punch rule. The
   `schema-dsql-constraints` blueprint said so outright: it *"leaves the rules
   they would have held to the slice's own code, where `validatePunchTiming`
   keeps one punch per runner and loop"*. The pattern that replaced a
   constraint became the pattern for every new rule.
5. **Why did review pass it?** `/technical-validation` asks whether the code
   matches the spec, follows the rules, passes its tests, and is covered. A
   check-then-write race does all four. Every test sends one request at a time.

**Root cause:** we thought a decision made by a pure function over the rows a
request had just read still held when that request wrote; actually two
requests read the same rows, both pass, and both write, because the read and
the write are separate moments and nothing between them belongs to one
request. Only a key the write itself claims can say no to the second one.

## Detection failure causes

- **Typing and linting:** a read followed by a write is ordinary code. The
  defect is in the time between two correct lines.
- **CI:** every back-e2e case sends one request and waits. A first attempt at
  a concurrent punch test passed on the old code too. It failed on every run
  once the test opened the pool's connections before firing, so the likely
  reading is that the first request committed on a warm connection while the
  second was still connecting. A concurrent test that does not open its
  connections first can pass for the wrong reason.
- **Code review:** `/technical-validation` had no question about two requests
  at once.
- **The blueprints:** the pattern a reviewer compares against was the defect.
  `banana-rush` even had the right pattern, `repository-write-refused-by-the-primary-key`,
  for bids, and nothing pointed `joinGame` at it.

## Countermeasure

Each rule now lives in a primary key the write claims inside its own
transaction, with `onConflictDoNothing`, and losing the claim is the refusal.

- `last-loop-lepin`: `loop_punch_claims` keyed on
  `(edition_slug, runner_slug, loop_index)`, claimed by every path that writes
  a punch and released by the void.
- `banana-rush`: `seat_claim` keyed on `(game_id, seat_order)` and
  `avatar_claim` keyed on `(game_id, avatar)`. `seatPlayer` claims the monkey,
  then the first open seat from `listOpenSeats`, then inserts the player, all
  in one transaction. A loser is told which claim it lost, and `refuseLostSeating`
  turns that into `avatar-taken` or `game-full`.

The pure checks stay, so the ordinary case still gets its named reason
without touching a key.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commits listed in the front matter.

**The actual fix:**

```diff
+export const seatClaimTable = pgTable(
+  'seat_claim',
+  { gameId: uuid('game_id').notNull(), seatOrder: integer('seat_order').notNull() },
+  (table) => [primaryKey({ columns: [table.gameId, table.seatOrder] })],
+);
```

```diff
-  const player = await insertPlayer({ …, seatOrder: players.length, … });
+  const seating = await seatPlayer({ … }, listOpenSeats(takenSeatOrders, game.maxPlayers));
+  if (seating.kind === 'lost') throw new GameError(refuseLostSeating(seating.loss));
```

A sixth seat cannot be written for a game of five, because `listOpenSeats`
never offers it and the key refuses a second claim on any seat that exists.

**Type:** detection (level 4)

Back-e2e cases that fire the competing requests at once, after opening enough
pool connections that they really overlap
(`openConnectionsForConcurrentRequests` in each application's
`test/database-utils.ts`), and assert both the refusal and what was written.
Each one failed on the code before the fix.

**Type:** the blueprints and the standard that taught it

- `service-orchestration` now says that a rule depending on rows other
  requests can write is never decided from a read, and shows the claim.
- `schema-dsql-constraints` now describes the claim table instead of
  *"leaves the rules … to the slice's own code"*.
- `core-decision` now says what it deliberately does not decide.
- `04-backend-architecture.md` replaces the racing example with the claim and
  adds *A rule about rows another request can write is held by a key*, which
  also covers state kept in a module variable on Lambda.
- `11-database.md` says a uniqueness rule is held by a primary key, never by a
  unique index or a check.

**Type:** review (the gate the defect walked through)

`/technical-validation` gains a required fifth category, **E. Scale**, in the
skill, its standard, its template and the `technical-validator` agent's brief.
It lists every write path in the diff, asks what two concurrent requests do to
it, asks the same of any module-level state, and fails a rule held by a key
that no concurrent test exercises. Every finding in every category must now
also state a concrete failing case, an input and the wrong result it
produces, or it goes in Notes as a question. Both rules came from the review
that found this defect, and the operator approved them.

**Sibling defects swept:**

- `catchupPunch` read `findActivePunchForLoop` and then inserted, the same
  race against a live punch. Fixed through the same claim.
- `startRematch` checks `game.rematchJoinCode !== null` and then creates a
  game, so a host's double tap can create two rematch games, the second one
  orphaned. Only the host can call it. Not fixed in this change.
- `joinGame` checks the status before seating, so a player whose join
  overlaps the host's start can be seated in a game that has just started, and
  the first round then waits for their bid or for the timer. Not fixed in this
  change.
- `reserveJoinCode` checks that a code is free and then inserts the game.
  Two games created at the same instant can draw the same four letters; the
  alphabet makes this rare, and the newer game wins the lookup. Not fixed in
  this change.

## See also

- [`a-voided-punch-still-held-its-loop`](./a-voided-punch-still-held-its-loop.md),
  the other property the dropped partial index used to carry.
- [`optimistic-reorder-reverted-by-stale-dsql-read`](./optimistic-reorder-reverted-by-stale-dsql-read.md),
  another place where a read and a write were assumed to be one moment.
- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §6 and §11.
