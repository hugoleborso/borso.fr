# Invariants of skull-king, in `api/src/games`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/skull-king/`.

## Game

- `game` holds `join_code`, `phase`, `current_round`, `rematch_join_code`,
  `revision`, `created_at` and `updated_at`.
- `phase` is one of `ROUND_PHASES`. The Drizzle column is typed by that list,
  and `movePhaseSchema` is the only input that writes it.
- `PUT /:code/phase` sets the target round and phase rather than stepping
  them, so two phones pressing play at once land on the same state.
- `finished` is accepted only with round `ROUND_COUNT`, and only from the
  `scoring` phase of that round (see Phase).
- A game is never deleted.
- The score is never stored. Every view derives it from the entries.

Held by: `api/src/games/games.controller.test.ts` › moves the phase idempotently, so two phones pressing play land on the same state
Held by: `api/src/games/games.schema.test.ts` › finishes the game only after the last round
Held by: `api/src/games/game-write.core.test.ts` › refuses to finish from an earlier round, from the bids of the last one, or onto another round

## Revision

- Every write to a game runs in one transaction, opened by
  `runInOneTransaction` in the repository, that first bumps `game.revision`
  (`bumpGameRevision`), then reads what its rule checks, then writes. Entry,
  round, phase, player, claim and rematch writes all do it. So two writes to
  one game never both pass a check made over rows the other is changing.
- On Postgres the bump takes the row lock, so the second transaction waits and
  then reads what the first committed. On DSQL the second commit is aborted
  (`OC000`, `OC001` or `40001`), and `retryOnConflictAbort` runs the whole
  service operation again, up to `CONFLICT_RETRIES` more times, one fewer than `MAXIMUM_PLAYERS`:
  each wave of aborts lets one write commit, so eight phones writing at
  once all land. Two
  phones writing two different cells both land: one waits or is retried,
  neither is refused.
- The column is nullable, because DSQL adds no column with a constraint.
  Every insert writes 0, and `buildGameView` reads `null` as 0.
- The view carries the revision. A view of a higher revision holds every
  write a lower one holds.

Held by: `api/src/games/games.controller.test.ts` › keeps two writes to different cells sent at once, retrying the one the database aborts
Held by: `api/src/games/game-view.core.test.ts` › carries the revision of the game, and reads a game nobody wrote since its creation as 0
Held by: `api/src/helpers/persistence/conflict-abort.core.test.ts` › gives up with the conflict once the retries are spent

## Join code

- A code is unique from the first write because `join_code_claim` is keyed
  on it, written in the same transaction as the game by
  `insertGameUnlessCodeTaken`. A code is never released.
- A game is found through its claim, by primary key.
- A code is four letters drawn from `JOIN_CODE_ALPHABET`, which leaves out
  I and O and holds no digit. `normalizeJoinCode` reads the code from the
  address or the join field, keeping letters only, so any case works and
  every code ever made still reads back unchanged.

Held by: `api/src/games/games.schema.test.ts` › makes a join code unique by keying its claim on the code
Held by: `api/src/games/join-code.utils.test.ts` › draws letters only, leaving out the two a person reads back as digits
Held by: `api/src/games/join-code.utils.test.ts` › only ever builds a code that reads back unchanged
Held by: `domain/join-code.core.test.ts` › keeps letters only, since a code holds no digit
Held by: `api/src/games/games.controller.test.ts` › gives a join code to one of two games claiming it at once, and nothing to the other
Held by: `api/src/games/games.controller.test.ts` › reads the view by its code in any case, with defaults for every unwritten cell

## Player

- `player` holds `game_id`, `seat`, `name`, `icon`, `color` and `avatar`.
- A game seats `MINIMUM_PLAYERS` to `MAXIMUM_PLAYERS`, in the order the
  creation sent them, from seat 0. The server mints every player id: a
  creation that sends one is refused.
- A creation marks at most one seat `isMe`. With a session, `seatTable`
  links that seat to the account in the same insert; for a guest it links
  nothing. A second `isMe` is refused with `value-out-of-range`.
- A phone follows `rematchJoinCode` only when it changes from null to a code
  while the finished game is on its screen (`watchRematch`). Opening a
  finished game that already has a rematch shows that game.
- A rematch seats the same names, marks and pirates at the same seats in a new game,
  and records its code in `rematch_join_code` on the old game, so a second
  request answers the same rematch.
- The old game's view carries `rematchJoinCode`, and every rematch request
  broadcasts it to the old game's connections, so the other phones can
  follow.
- The new game and the code recorded on the old one are written in one
  transaction, after the old game's revision bump (see Revision). A second
  request waits for, or is retried after, the first, then reads the recorded
  code and answers that rematch. A losing request writes nothing, so no
  orphan game, claim or player is left behind.

Held by: `api/src/games/game-write.core.test.ts` › links the seat marked as the creator to the signed-in account, and no other
Held by: `api/src/games/game-write.core.test.ts` › links nothing for a guest, even on the seat marked as the creator
Held by: `api/src/games/games.schema.test.ts` › takes one seat marked as the creator, and refuses two
Held by: `api/src/accounts/accounts.controller.test.ts` › links the seat a signed-in creator marks as theirs to their account, and no other
Held by: `api/src/accounts/accounts.controller.test.ts` › creates a guest game with a seat marked as theirs and links nobody
Held by: `site/src/lib/game-address.core.test.ts` › opens a finished game that already has a rematch on that game, not the rematch
Held by: `site/src/lib/game-address.core.test.ts` › follows a rematch another phone starts while this game is on screen
Held by: `api/src/games/games.controller.test.ts` › starts a rematch with the same players, marks and pirates, once however many phones ask
Held by: `api/src/games/games.controller.test.ts` › records the rematch when the database aborts its first commit, rather than failing
Held by: `api/src/games/games.controller.test.ts` › starts one rematch however many phones ask at the same instant
Held by: `api/src/games/games.controller.test.ts` › tells the phones of a finished game where its rematch is

## Mark

- `player.icon` is one of `PLAYER_ICONS` and `player.color` one of
  `PLAYER_COLORS`. Both Drizzle columns are typed by those lists, and the
  creation and player-change schemas refuse any other value.
- A name, a mark and a pirate change through `PATCH /:code/players/:playerId`,
  which changes only the fields it is sent.
- `suggestMark` gives each seat a default mark, so the first seats of a
  table differ in icon and colour.

Held by: `api/src/games/games.schema.test.ts` › refuses one player, too many players, an empty name and an unknown mark
Held by: `api/src/games/games.controller.test.ts` › changes a player’s name and mark
Held by: `domain/player-mark.core.test.ts` › gives each of the first seats a different icon and colour

## Pirate

- `player.avatar` is the pirate as JSON text, or `null`. It is text because
  DSQL has no `jsonb` column, and nullable because DSQL adds no column with a
  constraint.
- A creation and a player change accept a pirate only when
  `pirateAvatarSchema` does: every part present, each one of its const list,
  no other key.
- The view always carries a pirate. A `null`, text that is not JSON, or a part
  no list holds reads as `suggestAvatar(seat)`.
- A pirate change is a player write: it bumps `game.revision` first and is
  broadcast like every other write (see Revision).
- `suggestAvatar` gives each seat of a full table a different pirate.
- The record stores the app's own words. `selectAvataaarsOptions` maps them
  onto avataaars with every probability at 0 or 100, so one record draws the
  same face on every phone. Under a hat, hair that would poke through is drawn
  as a short crop.
Held by: `api/src/games/games.schema.test.ts` › takes a pirate on any seat, and refuses one with a part it does not know
Held by: `api/src/games/games.schema.test.ts` › refuses a pirate missing a part
Held by: `domain/pirate-avatar.core.test.ts` › suggests the pirate of the seat for a row written before avatars existed
Held by: `domain/pirate-avatar.core.test.ts` › suggests the pirate of the seat for a stored part a later version no longer offers
Held by: `domain/pirate-avatar.core.test.ts` › gives every seat of a full table a different pirate
Held by: `api/src/games/games.controller.test.ts` › changes a player’s pirate as a write that bumps the revision
Held by: `api/src/games/games.controller.test.ts` › dresses a seat created without a pirate as the pirate its seat suggests
Held by: `site/src/lib/pirate-portrait.core.test.ts` › draws a bare pirate with one fixed choice per part and nothing left to chance
Held by: `site/src/lib/pirate-portrait.core.test.ts` › cuts hair that would poke through a hat down to a short crop

## Last pirate

- The phone keeps the last pirate it built in local storage, under
  `skull-king.last-pirate`, and reads it back through `pirateAvatarSchema`.
  Anything else reads as no pirate.
- A name typed on the home screen starts as the last pirate, unless a seated
  player already wears it; then it starts as `suggestAvatar(seat)`.

Held by: `site/src/lib/roster.core.test.ts` › answers no pirate for nothing stored, another shape, or text that is not JSON
Held by: `site/src/lib/roster.core.test.ts` › dresses a new seat as the last pirate this phone built
Held by: `site/src/lib/roster.core.test.ts` › suggests the pirate of the seat once somebody at the table already wears the last one

## Round

- `round` is keyed on `(game_id, round_number)` and `round_entry` on
  `(game_id, round_number, player_id)`. Every write upserts one row and
  changes only the columns it names, so two phones writing two cells never
  overwrite each other.
- A missing row reads as its default: no kraken, no white whale discard, no
  bid, bid made (`isMissed` false), no ability, no bonus. `buildGameView` walks rounds 1 to
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

## Missed bid

- `round_entry.is_missed` says the table marked the bid missed. The column
  is nullable because DSQL adds no column with a constraint. `isStoredMissed`
  reads `null` as false, the bid made, and every insert writes `false`
  explicitly.
- The mark is stored the moment it is tapped, before any trick is chosen, so
  every phone shows it and no phone can close the round meanwhile. The site
  writes `{ isMissed: true }` for the cross and
  `{ isMissed: false, tricks: null }` for the check.

Held by: `api/src/games/games.controller.test.ts` › stores a bid marked missed at once, and keeps the round open until its tricks are in
Held by: `api/src/games/game-view.core.test.ts` › reads a stored mark, and a row written before the column existed as made
Held by: `site/src/lib/round-results.core.test.ts` › marks a made bid missed at once, before any trick is picked

## Tricks

- `round_entry.tricks` is nullable and read only when the bid is marked
  missed. `selectTricksTaken` answers the final bid for a made bid, whatever
  `tricks` holds, and `tricks` for a missed one.
- A missed bid with `null` tricks has no tricks taken yet. `tallyTricks` reads
  the round as incomplete, so it cannot close, and `scoreEntry` answers no
  score.
- Tricks above the cards dealt that round are refused with
  `value-out-of-range` by `refuseEntryWrite`.

Held by: `domain/scoring.core.test.ts` › ignores tricks left on a bid marked made
Held by: `domain/scoring.core.test.ts` › knows no tricks for a missed bid nobody counted yet
Held by: `domain/round.core.test.ts` › waits while a bid marked missed has no tricks yet, so the round cannot close
Held by: `api/src/games/game-write.core.test.ts` › refuses the next round while a bid marked missed has no tricks yet
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
- At most one player of a round moves a bid. `refuseEntryWrite` applies the
  write to the round's entries and answers `value-out-of-range` when the
  result fails the domain's `isBidAdjustedOnce`. Taking the ability back is
  always allowed. The check runs after the revision bump (see Revision), so
  two phones giving it to two players at the same instant cannot both pass.
- The score reads the final bid, `selectFinalBid`, never below 0.

Held by: `api/src/games/games.controller.test.ts` › moves a bid with Harry the Giant, for one player of the round only
Held by: `api/src/games/games.controller.test.ts` › gives Harry the Giant to the first of two players asking for it at once
Held by: `api/src/games/game-view.core.test.ts` › reads a stored adjustment, and anything else as none
Held by: `domain/scoring.core.test.ts` › scores against the bid after the adjustment, never below zero

## Rascal bet

- `round_entry.rascal_bet` holds 0, 10 or 20 (`RASCAL_BETS`). The column is
  nullable because DSQL adds no column with a constraint. `readRascalBet`
  reads `null`, or any value outside the list, as 0, and every insert writes
  0 explicitly. A `null` in a write resets to 0.
- At most one player of a round bets. `refuseEntryWrite` applies the write
  to the round's entries and answers `value-out-of-range` when the result
  fails the domain's `isRascalBetOnce`. Taking the bet back is always
  allowed. The check runs after the revision bump (see Revision), so two
  phones cannot both pass it.
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

- `refusePhaseMove` accepts three moves and answers `value-out-of-range` to
  any other: any phase but `finished` within the current round, the
  `bidding` phase of the next round, and `finished` from the `scoring` phase
  of round `ROUND_COUNT`. Staying put is always accepted. So the game never
  moves back across rounds and never skips one.
- The trick checker blocks on the server too. Moving a round to `scoring`
  while any of its bids is missing answers `bids-missing`. Opening the next
  round or finishing while any played round does not balance answers
  `tricks-unbalanced`. Going back to the bids of the current round is always
  allowed, so the table can correct anything; an earlier round is corrected
  from the scores grid.
- The check runs after the revision bump (see Revision), so a correction
  that unbalances a round and a move past it, sent at the same instant,
  cannot both succeed.

Held by: `api/src/games/games.controller.test.ts` › refuses to score a round while a bid was cleared
Held by: `api/src/games/games.controller.test.ts` › refuses the next round while the tricks do not balance, and lets the table go back
Held by: `api/src/games/games.controller.test.ts` › refuses to finish while a corrected earlier round no longer balances
Held by: `api/src/games/game-write.core.test.ts` › refuses any other round than the one played and the next one
Held by: `api/src/games/games.controller.test.ts` › refuses to leave a round that a correction sent at the same instant unbalances

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
  already held by the same account, as `decideSeatClaim` reads it after the
  revision bump (see Revision). A seat held by another account answers
  `seat-taken`, even to a claim sent at the same instant as the winning one.
  A guest answers `session-required`.
- A rematch carries the links over.

Held by: `api/src/accounts/accounts.controller.test.ts` › links a seat to the account, and refuses a seat another account holds
Held by: `api/src/accounts/accounts.controller.test.ts` › gives a seat to the first of two accounts claiming it at the same instant

## View

- Every write answers `{ game }` with the view built inside its own
  transaction, after the write, then broadcasts the same view.
- The view carries the game's `revision` and `readAt`, the time the request
  was served. The site keeps the view of the highest revision, and of two
  views of one revision the one read later, so a late broadcast cannot undo
  a newer view. A request's start time alone cannot order two views, because
  a request that started first can commit last.

Held by: `api/src/games/games.controller.test.ts` › pushes the view a write answers to every connection of that game

## Pending edit

- The site's cache for one game holds the newest server view and, apart from
  it, the edits this phone sent and has not heard back about
  (`site/src/lib/game-cache.core.ts`). The screen shows the edits laid over
  the server view, in the order they were tapped.
- Every broadcast, every write answer and every read goes through
  `receiveGame`, whatever this phone has pending, so no path is ever dropped.
- An edit leaves the list when its write settles, success or failure, so a
  refused tap disappears and the screen shows what the server holds.

Held by: `site/src/lib/game-cache.core.test.ts` › writes each broadcast unless the cached view is newer, even while this phone has a write pending
Held by: `site/src/lib/game-cache.core.test.ts` › drops a refused edit, so the screen goes back to what the server holds
