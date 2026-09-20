# Vocabulary — banana-rush

`banana-rush` is a party game of secret bids, played from a phone by a
group of friends who are usually in the same room. There are no accounts:
a player is a nickname, a monkey and a token held in their own browser.
One game lives behind a four letter code, and nothing about it outlives
the game.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

## Game

One table of players playing to a score, from the moment somebody creates
it until somebody wins. It is the only aggregate here: players, bids and
resolved rounds all belong to exactly one game and are meaningless without
it.

Lives in: `api/src/games/`

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

One person seated at one game. A player exists only inside a game: the
same human joining two games is two players, with two tokens and two
stashes.

Lives in: `api/src/games/`

- `player` holds `game_id`, `token_hash`, `nickname`, `avatar`,
  `stash_bananas`, `seat_order` and `is_host`.
- The raw token is generated once at join time and never stored. Only its
  sha-256 digest is, through `hashPlayerToken` in `player-token.utils.ts`.
- `is_host` marks the player who created the game. It grants exactly one
  power: starting it.

Often confused with **viewer**. A viewer is whoever is reading a game
right now, which may be a player or may be somebody who only has the code.

## Bid

The secret number one player writes in one round. A bid is not backed by
anything: a player may bid more bananas than they own, and that is the
whole tension of the game.

Lives in: `api/src/games/`

- `bid` is keyed on `(game_id, player_id, round_number)`, which is what
  refuses a second bid in the same round rather than an application check.
- `refuseBid` in `domain/bid.core.ts` holds the bounds, and both the form
  and the API schema read them from there.
- A bid is never shown to another player before the round resolves.
  `buildGameView` reports only that somebody has answered.

Often confused with **stash**. A bid is what you write; a stash is what
you own.

## Stash

The bananas one player currently holds. It starts at ten, changes only
when a round resolves, and is the number the winning score is compared
against.

Lives in: `api/src/games/`

- `player.stash_bananas`, written only by `didCommitRound`.
- A stash never goes below zero. A player who cannot pay a tariff busts to
  exactly zero and stays in the game.

## Crate

The pot every player is bidding for. It is not a pool people pay into: it
is refilled at the end of each round to match the largest stash on the
table, which is what makes the game inflationary.

Lives in: `api/src/games/`

- `game.crate_bananas`, recomputed by `resolveRound` in `round.core.ts` as
  the largest stash after the round, and never below one banana so a game
  cannot reach a state where nothing can be won.

## Tariff

What the highest bidder owes the second highest bidder: their bid minus
the bid below theirs. It is paid out of the winner's stash plus the crate
they have just taken.

Lives in: `api/src/games/`

- Computed in `settleFrom` inside `round.core.ts`.
- Tied leaders split the crate and pay no tariff at all.
- Several players tied for second place split one tariff, and the
  remainder is discarded rather than rounded up.

## Bust

What happens to a bidder who cannot cover their tariff out of their stash
plus the crate. Their stash drops to zero, they take nothing, and the
bidder below them becomes the highest and faces the same question.

Lives in: `api/src/games/`

- The recursion in `settleFrom` is the cascade. It is the one rule that
  needed a worked example to explain out loud, which is why the example is
  the first test in `round.core.test.ts`.
- Busting is not elimination. A player at zero keeps bidding and can win a
  later crate.

## Round

One turn: every live player writes a bid, and the game resolves them all
at once. A round resolves when the last bid arrives, or when the timer
runs out and the missing bids are entered at one banana.

Lives in: `api/src/games/`

- `round_result` is keyed on `(game_id, round_number)`, which is what
  makes a round resolve exactly once when two last bids arrive together.
- `outcomes` is a `text` column holding JSON, not `jsonb`, because Aurora
  DSQL has no `jsonb`. It is read back through `outcomesSchema`.

Often confused with **game**. First to the winning score ends the game;
nothing ends a round but every player having answered.

## Join code

The four letters a player types to reach a game. It is how a game is
found, and it is not a secret: knowing it lets somebody watch and, while
the game is in its lobby, take a seat.

Lives in: `api/src/games/`

- Built by `buildJoinCode` in `join-code.utils.ts` from an alphabet that
  leaves out the characters people read back wrongly.
- `normalizeJoinCode` accepts what a person actually types, in any case
  and with any spacing.

## Connection

One open WebSocket from one phone, recorded against one game so the API
knows where to deliver. It carries no commands in either direction that
change the game.

Lives in: `api/src/realtime/`

- `socket_connection` holds `connection_id`, `game_id` and `player_id`.
- A connection that has gone away answers a gone status, which
  `postToConnection` reports as an outcome rather than an error, and the
  row is forgotten.

Often confused with **player**. A player may have no connection, or two.

## Words this application does not use

- **Pot, pool, kitty** — the thing being won is the **crate**.
- **Tax, fee, penalty** — what the winner owes is the **tariff**.
- **Eliminated, out, dead** — nobody leaves a game. A player **busts**,
  which is a stash of zero and nothing else.
- **Room, table, lobby** as a stored noun — the record is a **game**, and
  `lobby` is one of its statuses rather than a thing of its own.
- **Score** for a player's bananas — that is their **stash**. `winning_score`
  is the target the game ends at, and is the only score here.
- **User, account, session** — there are none. There is a **player** and
  the token that identifies them.
