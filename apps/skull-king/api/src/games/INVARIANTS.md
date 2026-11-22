# Invariants of skull-king, in `api/src/games`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/skull-king/`.

## Game

- `game` holds `join_code`, `phase`, `current_round`, `rematch_join_code`,
  `created_at` and `updated_at`.
- `phase` is one of `ROUND_PHASES`. The Drizzle column is typed by that list,
  and `movePhaseSchema` is the only input that writes it.
- `PUT /:code/phase` sets the target round and phase rather than stepping
  them, so two phones pressing play at once land on the same state.
- `finished` is accepted only with round `ROUND_COUNT`.
- A game is never deleted.
- The score is never stored. Every view derives it from the entries.

Held by: `api/src/games/games.controller.test.ts` › moves the phase idempotently, so two phones pressing play land on the same state
Held by: `api/src/games/games.schema.test.ts` › finishes the game only after the last round

## Join code

- A code is unique from the first write because `join_code_claim` is keyed
  on it, written in the same transaction as the game by
  `insertGameUnlessCodeTaken`. A code is never released.
- A game is found through its claim, by primary key.
- `normalizeJoinCode` reads the code from the address, so any case works.

Held by: `api/src/games/games.schema.test.ts` › makes a join code unique by keying its claim on the code
Held by: `api/src/games/games.controller.test.ts` › reads the view by its code in any case, with defaults for every unwritten cell

## Player

- `player` holds `game_id`, `seat`, `name`, `icon` and `color`.
- A game seats `MINIMUM_PLAYERS` to `MAXIMUM_PLAYERS`, in the order the
  creation sent them, from seat 0.
- A rematch seats the same names and marks at the same seats in a new game,
  and records its code in `rematch_join_code` on the old game, so a second
  request answers the same rematch.
- The old game's view carries `rematchJoinCode`, and every rematch request
  broadcasts it to the old game's connections, so the other phones can
  follow.
- The code is recorded by a conditional update. A loser on Postgres updates
  no row. A loser on DSQL is aborted at commit (`OC000`, `OC001` or `40001`),
  which `isConflictAbort` reads as a lost race rather than a failure. Either
  way the service re-reads the game and answers the winner's rematch. When no
  winner was recorded, because the abort came from another write to the same
  game, it tries to record once more.

Held by: `api/src/games/games.controller.test.ts` › starts a rematch with the same players and marks, once however many phones ask
Held by: `api/src/games/games.controller.test.ts` › records the rematch when the database aborts its first commit, rather than failing
Held by: `api/src/games/games.controller.test.ts` › tells the phones of a finished game where its rematch is

## Mark

- `player.icon` is one of `PLAYER_ICONS` and `player.color` one of
  `PLAYER_COLORS`. Both Drizzle columns are typed by those lists, and the
  creation and player-change schemas refuse any other value.
- A name and a mark change through `PATCH /:code/players/:playerId`, which
  changes only the fields it is sent.
- `suggestMark` gives each seat a default mark, so the first seats of a
  table differ in icon and colour.

Held by: `api/src/games/games.schema.test.ts` › refuses one player, too many players, an empty name and an unknown mark
Held by: `api/src/games/games.controller.test.ts` › changes a player’s name and mark
Held by: `domain/player-mark.core.test.ts` › gives each of the first seats a different icon and colour

## Round

- `round` is keyed on `(game_id, round_number)` and `round_entry` on
  `(game_id, round_number, player_id)`. Every write upserts one row and
  changes only the columns it names, so two phones writing two cells never
  overwrite each other.
- A missing row reads as its default: no kraken, no white whale discard, no
  bid, bid made, no ability, no bonus. `buildGameView` walks rounds 1 to
  `current_round` and every player in seat order, so the view is always
  complete.
- A round write or an entry write above `current_round` is refused with
  `round-not-played`. An earlier round can always be corrected.
- Round N deals `selectCardCount(N, players)` cards, `min(N, floor(70 /
  players))`.

Held by: `api/src/games/games.controller.test.ts` › keeps two writes to different cells of the same round
Held by: `api/src/games/game-view.core.test.ts` › fills a round nobody wrote with no kraken and one default entry per player
Held by: `api/src/games/games.controller.test.ts` › refuses an entry for a round the table has not reached
Held by: `domain/round.core.test.ts` › repeats the largest even deal when the deck runs short for eight players

## Bid

- `round_entry.bid` is nullable. `null` means nobody entered the bid yet,
  and a `null` in a write clears it.
- A bid above the cards dealt that round is refused with
  `value-out-of-range` by `refuseEntryWrite`, since the cards dealt depend on
  the round and the number of players. The schema bounds it from 0 to
  `ROUND_COUNT` first.
- A round with a missing bid cannot move to `scoring` (see Phase).

Held by: `api/src/games/games.controller.test.ts` › refuses a bid or tricks above the cards dealt
Held by: `api/src/games/games.controller.test.ts` › answers each entry write with the fresh view, and clears a value written as null

## Tricks

- `round_entry.tricks` is nullable. `null` reads as the final bid made,
  through `selectTricksTaken`.
- Tricks above the cards dealt that round are refused with
  `value-out-of-range` by `refuseEntryWrite`.

Held by: `domain/scoring.core.test.ts` › reads a missing tricks value as the bid made
Held by: `api/src/games/games.controller.test.ts` › refuses a bid or tricks above the cards dealt

## Bonus

- `round_entry` holds one non-null column per kind of `BONUS_KINDS`, and
  every insert writes 0 for each.
- A bonus count is bounded by `MAXIMUM_BONUS_COUNT`, read by the schema.
- A write changes only the kinds it names. A `null` for the bonuses resets
  every kind to 0.
- Bonuses count only when the final bid is made. A missed bid scores no
  bonus.

Held by: `api/src/games/games.schema.test.ts` › bounds every bonus kind by its own maximum
Held by: `api/src/games/game-write.core.test.ts` › resets every bonus kind when the bonuses are cleared
Held by: `domain/scoring.core.test.ts` › takes 10 points per trick of difference and no bonus when the bid is missed

## Bid adjustment

- `round_entry.bid_adjustment` holds -1, 0 or 1 (`BID_ADJUSTMENTS`). The
  column is nullable because DSQL adds no column with a constraint.
  `readBidAdjustment` reads `null`, or any value outside the list, as 0,
  and every insert writes 0 explicitly. A `null` in a write resets to 0.
- At most one player of a round moves a bid. `refuseEntryWrite` answers
  `value-out-of-range` for a second one, from the holders
  `selectAbilityHolders` reads. Taking the ability back is always allowed.
  Two phones giving it to two players at the same instant can both pass
  this check, because no key holds it.
- The score reads the final bid, `selectFinalBid`, never below 0.

Held by: `api/src/games/games.controller.test.ts` › moves a bid with Harry the Giant, for one player of the round only
Held by: `api/src/games/game-view.core.test.ts` › reads a stored adjustment, and anything else as none
Held by: `domain/scoring.core.test.ts` › scores against the bid after the adjustment, never below zero

## Rascal bet

- `round_entry.rascal_bet` holds 0, 10 or 20 (`RASCAL_BETS`). The column is
  nullable because DSQL adds no column with a constraint. `readRascalBet`
  reads `null`, or any value outside the list, as 0, and every insert writes
  0 explicitly. A `null` in a write resets to 0.
- At most one player of a round bets. `refuseEntryWrite` answers
  `value-out-of-range` for a second one, from the holders
  `selectAbilityHolders` reads. Taking the bet back is always allowed. Two
  phones giving it to two players at the same instant can both pass this
  check, because no key holds it.
- The bet is added to a made final bid and taken from a missed one.

Held by: `api/src/games/games.controller.test.ts` › records one Rascal of Roatan bet per round, and refuses a second
Held by: `api/src/games/game-view.core.test.ts` › reads a stored bet, and anything else as none
Held by: `domain/scoring.core.test.ts` › adds the bet to a made bid and takes it from a missed one

## Kraken

- `round.is_kraken_played` is not null, and a missing round row reads as
  `false`.
- It is written by `PUT /:code/rounds/:round`, refused with
  `round-not-played` above `current_round`.
- It removes one expected trick (`selectExpectedTricks`).

Held by: `api/src/games/games.controller.test.ts` › records the kraken for a played round, and refuses it for a later one
Held by: `api/src/games/games.controller.test.ts` › expects one trick fewer for the kraken and for a white whale discard

## White Whale discard

- `round.is_white_whale_discard` is nullable because DSQL adds no column
  with a constraint, and `null` reads as `false`. Every insert writes
  `false` explicitly.
- It is written on its own, like the kraken, and removes one expected trick
  (`selectExpectedTricks`). A round with both expects two tricks fewer.

Held by: `api/src/games/games.schema.test.ts` › takes the kraken and the white whale discard, each on its own
Held by: `api/src/games/games.controller.test.ts` › expects one trick fewer for the kraken and for a white whale discard

## Phase

- The trick checker blocks on the server too, in `refusePhaseMove`. Moving a
  round to `scoring` while any of its bids is missing answers
  `bids-missing`. Moving to a later round or to `finished` while any played
  round does not balance answers `tricks-unbalanced`. Staying put and moving
  back are always allowed, so the table can correct anything.

Held by: `api/src/games/games.controller.test.ts` › refuses to score a round while a bid is missing
Held by: `api/src/games/games.controller.test.ts` › refuses the next round while the tricks do not balance, and lets the table go back
Held by: `api/src/games/games.controller.test.ts` › refuses to finish while a corrected earlier round no longer balances

## Account game

- `account_game` is keyed on `(account_id, game_id)` and holds `opened_at`.
  Every game route upserts it when the request carries a session: creating,
  reading, writing, claiming and starting a rematch. Reopening a game moves
  it to the top of the list.
- `GET /api/accounts/me/games` lists those games, newest `opened_at` first,
  with the rank of the account's seat derived by `scoreEntry`, or no rank
  when the account holds no seat there.
- Each listed game carries `winnerSeats`: empty until the game is `finished`,
  then every seat whose total, derived by `scoreEntry`, equals the best total,
  in seat order, so a tie names several seats. `selectWinnerSeats` in
  `my-games.core.ts` holds it.

Held by: `api/src/accounts/accounts.controller.test.ts` › lists the games created or opened while signed in, newest first, with my rank
Held by: `api/src/games/my-games.core.test.ts` › names every seat tied for the best total, in seat order
Held by: `api/src/accounts/accounts.controller.test.ts` › names the winning seat of a finished game in the list

## Claim

- `player.account_id` links a seat to an account. `POST
  /:code/players/:playerId/claim` writes it only while the seat is free or
  already held by the same account, in one conditional update. A seat held by
  another account answers `seat-taken`. A guest answers `session-required`.
- A rematch carries the links over.

Held by: `api/src/accounts/accounts.controller.test.ts` › links a seat to the account, and refuses a seat another account holds

## View

- Every write answers `{ game }` with the view built after the write, then
  broadcasts the same view.
- `readAt` is the time the server built the view. The site keeps the latest
  one, so a late broadcast cannot undo a newer view.

Held by: `api/src/games/games.controller.test.ts` › pushes the view a write answers to every connection of that game
