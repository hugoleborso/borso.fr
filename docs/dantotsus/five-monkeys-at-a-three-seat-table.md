---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: high
related-pr: '#110'
fix-commits: [self]
eradication-level: 1
time-to-detect: weeks
tags: [last-loop-lepin, banana-rush, dsql, concurrency, blueprints, review, testing]
blueprints: [service-orchestration, schema-dsql-constraints]
eradication-paths: [apps/banana-rush/api/src/games/games.repository.ts, apps/banana-rush/api/src/games/games.schema.ts]
zone: apps/banana-rush/api/src/games
recurs: none (no key held the seat count, so concurrent joins overfilled it; the voided punch was a key that refused too much)
---

# Five monkeys at a three seat table

## User impact

A host opens a `banana-rush` game for three players and reads the code out loud. The others type it at the same moment.

| | Seen | Expected |
| --- | --- | --- |
| Four players join a three-seat table with two seats free | The lobby shows five monkeys, and two share a seat number. Two friends who both tap the lemur both get it. | Two join, the other two are told the game is full |
| A `last-loop-lepin` runner taps *Punch* twice on a slow network | Two punches recorded for the same loop | One punch |

Both reproduce every time once the requests overlap (measured by the back-e2e cases written for the fix):

```
FAIL  the refusals a player can hit > seats exactly as many players as the table holds when they all arrive at once
AssertionError: expected [ 201, 201, 201, 201 ] to deeply equal [ 201, 201, 409, 409 ]

FAIL  punch.service > keeps one punch when the same runner is punched twice at the same instant
AssertionError: expected [ { status: 'fulfilled', …(1) }, …(1) ] to have a length of 1 but got 2
```

Found by a read-only third-party review. No user reported it.

## Causal chain

- Four players were seated at a table with two free seats.
  - Each `joinGame` read the players, counted two, asked `refuseJoin` whether there was room, was told yes, and inserted. All four reads happened before any insert.
    - The faulty line, from commit `9190e4e6c` (2026-09-19, the agent that wrote banana-rush):

      ```ts
      const player = await insertPlayer({ …, seatOrder: players.length, … });
      ```

    - The `player` table's only key was its surrogate `id`, so the database accepted every insert.
      - The agent copied the shape the repository taught for a rule checked before a write. The `service-orchestration` blueprint, on `registerPunch` at the parent commit, said "Use for a workflow that reads, decides, then writes". `docs/standards/04-backend-architecture.md` showed the same shape as its good service. `createGame` and `startRematch` beside `joinGame` carry that marker.
        - That blueprint was written about `registerPunch` after the database had stopped holding the punch rule. The `schema-dsql-constraints` blueprint said it "leaves the rules they would have held to the slice's own code, where `validatePunchTiming` keeps one punch per runner and loop". `registerPunch` had the same race.
      - The same commit `9190e4e6c` added `repository-write-refused-by-the-primary-key` for bids, where a natural key `(game, round, player)` existed. A seat limit is a count, and no column held it, so the agent did not see it as a key.

## Root cause of occurrence

*Thought a capacity limit is a decision a pure function makes over the rows just read, unlike a uniqueness that a key holds, actually a limit of N seats is a uniqueness over seat numbers 0 to N-1, and only a key the write claims can refuse the second request.* (Machine)

The blueprint the agent copied showed the racing shape as the canonical one, and it was in the agent's reach as the marked example. The agent knew key-refused writes, since it wrote one for bids in the same commit. What the codebase never showed was turning a count into a set of keys, as `seat_claim` now does.

## Detection failure causes

- **Typing and linting:** a read followed by a write is ordinary code. The defect is in the time between two correct lines.
- **CI:** every back-e2e case sent one request and waited. A first concurrent punch test passed on the old code too. It failed on every run once the test opened the pool's connections before firing (inferred reading: the first request committed on a warm connection while the second was still connecting).
- **Code review:** `/technical-validation` asked whether the code matches the spec, follows the rules, passes its tests and is covered. A check-then-write race does all four.
- **Blueprints:** the pattern a reviewer compares against was the defect.

## Countermeasure

Each rule now lives in a primary key the write claims inside its own transaction, with `onConflictDoNothing`, and losing the claim is the refusal.

- `last-loop-lepin`: `loop_punch_claims` keyed on `(edition_slug, runner_slug, loop_index)`, claimed by every path that writes a punch and released by the void.
- `banana-rush`: `seat_claim` keyed on `(game_id, seat_order)` and `avatar_claim` keyed on `(game_id, avatar)`. `seatPlayer` claims the monkey, then the first open seat from `listOpenSeats`, then inserts the player, in one transaction. `refuseLostSeating` turns a lost claim into `avatar-taken` or `game-full`.

The pure checks stay, so the ordinary case still gets its named reason without touching a key. Each new concurrent back-e2e case failed on the code before the fix.

## Eradication

**Type:** structural impossibility (level 1), for seats, monkeys and punches

**Reference:** the commit adding this file, `5ea2a2dbc` (PR #161).

```diff
+export const seatClaimTable = pgTable(
+  'seat_claim',
+  { gameId: uuid('game_id').notNull(), seatOrder: integer('seat_order').notNull() },
+  (table) => [primaryKey({ columns: [table.gameId, table.seatOrder] })],
+);
```

A sixth seat cannot be written for a game of five, because `listOpenSeats` never offers it and the key refuses a second claim on any seat that exists.

The same commit repaired what taught the race. `service-orchestration` says a rule depending on rows other requests can write is never decided from a read, and shows the claim. `schema-dsql-constraints` describes the claim table. `04-backend-architecture.md` adds *A rule about rows another request can write is held by a key*. `/technical-validation` gained a required **E. Scale** category (`.claude/agents/technical-validator.md`), which asks what two concurrent requests do to every write path in the diff. The concurrent back-e2e cases open their connections first, through `openConnectionsForConcurrentRequests` in `apps/banana-rush/test/database-utils.ts` and `apps/last-loop-lepin/test/database-utils.ts`.

The class is not eradicated. Three siblings still race today (read on 2026-11-27):

- `startRematch` (`apps/banana-rush/api/src/games/rematch.service.ts`) checks `game.rematchJoinCode !== null` and then inserts a game, so a host's double tap can create two rematch games.
- `reserveJoinCode` (`games.service.ts`) reads `findGameByJoinCode` and returns a code no key protects. `join_code` is a plain `text` column, so two games created at once can draw the same code.
- `joinGame` checks the status before seating, so a join that overlaps the host's start can seat a player in a started game.

**Proposed:** hold each sibling in a key or a conditional write. Set `rematch_join_code` with an `UPDATE … WHERE id = $1 AND rematch_join_code IS NULL` that only one request can win, and create the rematch game only when that update changed a row. Claim each join code in a table keyed on the code, released when the game finishes, so `reserveJoinCode` loses the claim instead of reading. Then add a rule under `eslint-rules/` that flags a `.service.ts` function calling a repository `find*` or `list*` and then an `insert*` with no claim between them, so the next read-decide-write is refused at lint instead of at the E. Scale review.

**Similar instances:** `grep -rn 'FollowsBlueprint service-orchestration' apps/*/api/src` lists the 64 services marked with the shape (counted 2026-11-27). The three above are the ones found racing.

Related entries: [`a-voided-punch-still-held-its-loop`](./a-voided-punch-still-held-its-loop.md), the other property the dropped partial index carried, and [`optimistic-reorder-reverted-by-stale-dsql-read`](./optimistic-reorder-reverted-by-stale-dsql-read.md), another read and write assumed to be one moment. DSQL's limits are in [`dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §6 and §11.
