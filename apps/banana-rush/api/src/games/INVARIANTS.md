# Invariants — banana-rush, `api/src/games`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/banana-rush/`.

## Game

- `game` holds `join_code`, `status`, `max_players`, `winning_score`,
  `round_timer_seconds`, `crate_bananas`, `current_round` and
  `round_opened_at`.
- `status` is `lobby`, `playing` or `finished`, and `narrowGameStatus` in
  `game.core.ts` is the only place a stored string becomes one of them.
- A game is never deleted. A finished game keeps its rows and releases its
  join code, which `reserveJoinCode` relies on.

Often confused with **round**. A game spans many rounds; a round is one
turn inside it.

## Player

- `player` holds `game_id`, `token_hash`, `nickname`, `avatar`,
  `stash_bananas`, `seat_order` and `is_host`.
- The raw token is generated once at join time and never stored. Only its
  sha-256 digest is, through `hashPlayerToken` in `player-token.utils.ts`.
- `is_host` marks the player who created the game. It grants exactly one
  power: starting it.
- A game never seats more players than `max_players`, and no two players of
  one game share a seat or a monkey. Those are held by the primary keys of
  `seat_claim`, on `(game_id, seat_order)`, and `avatar_claim`, on
  `(game_id, avatar)`, written in the same transaction as the player by
  `seatPlayer`. `refuseJoin` answers the common case with a named reason, but
  it reads players counted before the write, so it cannot hold the limit when
  players arrive together.

Held by: `api/src/games/games.controller.test.ts` › seats exactly as many players as the table holds when they all arrive at once
Held by: `api/src/games/games.controller.test.ts` › seats one of two players who pick the same monkey at the same moment

Often confused with **viewer**. A viewer is whoever is reading a game
right now, which may be a player or may be somebody who only has the code.

## Bid

- `bid` is keyed on `(game_id, player_id, round_number)`, which is what
  refuses a second bid in the same round rather than an application check.

Held by: `api/src/games/games.controller.test.ts` › refuses a second bid in the same round
- `refuseBid` in `domain/bid.core.ts` holds the bounds, and both the form
  and the API schema read them from there.
- A bid is never shown to another player before the round resolves.
  `buildGameView` reports only that somebody has answered.

Often confused with **stash**. A bid is what you write; a stash is what
you own.

## Stash

- `player.stash_bananas`, written only by `didCommitRound`.
- A stash never goes below zero. A player who cannot pay a tariff busts to
  exactly zero and stays in the game.

## Crate

- `game.crate_bananas`, recomputed by `resolveRound` in `round.core.ts` as
  the largest stash after the round, and never below one banana so a game
  cannot reach a state where nothing can be won.

## Tariff

- Computed in `settleFrom` inside `round.core.ts`.
- Tied leaders split the crate and pay no tariff at all.
- Several players tied for second place split one tariff, and the
  remainder is discarded rather than rounded up.

## Bust

- The recursion in `settleFrom` is the cascade. It is the one rule that
  needed a worked example to explain out loud, which is why the example is
  the first test in `round.core.test.ts`.
- Busting is not elimination. A player at zero keeps bidding and can win a
  later crate.

## Round

- `round_result` is keyed on `(game_id, round_number)`, which is what
  makes a round resolve exactly once when two last bids arrive together.
- `outcomes` is a `text` column holding JSON, not `jsonb`, because Aurora
  DSQL has no `jsonb`. It is read back through `outcomesSchema`.

Often confused with **game**. First to the winning score ends the game;
nothing ends a round but every player having answered.

## Join code

- Built by `buildJoinCode` in `join-code.utils.ts` from an alphabet that
  leaves out the characters people read back wrongly.
- `normalizeJoinCode` in `domain/join-code.core.ts` accepts what a person
  actually types, in any case and with any spacing. The screen and the API
  both read it, with `JOIN_CODE_LENGTH`, from there.
