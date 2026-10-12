# Banana Rush: play a round of Guts with friends from a phone

## Perspectives confronted

- [x] **Client / business** — the operator asked for a new application at `banana-rush.borso.fr`, phone friendly before anything else, and chose a French and English interface so the game can be sent to friends who speak either one.
- [x] **Product** — the operator chose a nickname and a join code over accounts, a per round countdown that auto bids one banana for anyone who has not answered, no bots in this first version, and a host who picks the number of seats, the timer and the winning score.
- [x] **Tech-lead** — the operator chose an API Gateway WebSocket channel once we confirmed the billing is pay as you go with no fixed charge. That choice is recorded in [ADR-0021](../../../../adr/0021-api-gateway-websocket-pushes-banana-rush-round-state.md).
- [x] **Developer** — the operator confirmed a player who cannot pay the tariff stays in the game at zero bananas and can win a later crate, which keeps the resolution rule a pure function over the whole table rather than a lifecycle with removals.
- [x] **Designer** — the operator chose a bright flat look: large yellow shapes, thick rounded corners, one deep brown ink colour and monkey faces drawn as inline SVG.

## Why

Guts is a game the operator plays out loud with friends, and the whole tension of it lives in one secret number that everybody writes at the same time. Played on paper it needs somebody to collect the numbers, do the arithmetic and keep score, and that person cannot really play. Moving it to a phone removes the bookkeeper, which is the only thing standing between a group of people and a round of the game.

- **Output metric** (lagging): a group that starts a game finishes it. Measured as the share of games created that reach a winner rather than being abandoned in the lobby or mid round.
- **Input metrics** (leading, observable in the running application):
  - A person who opens the address can be bidding in a game within four taps: create or join, pick a name, enter the lobby, start.
  - Every round resolves for every player without a page reload, because the result arrives on the WebSocket channel rather than being polled.
  - Every screen is usable at 375 pixels wide with no horizontal scrolling.
- **Field observation**: the rules were explained to us out loud, and the explanation needed a worked example with three players before the bust cascade was clear. The same example is the first test case in the rules core, which is the evidence that the confusing part of the game is the part a machine should own.

## Result

Four screens, all of them phone first.

1. **Home** at `/`. The banana wordmark, a large *Créer une partie* button, a join code field, and a short *Comment on joue* panel that can be opened without leaving the page.
2. **Create** at `/nouvelle-partie`. Nickname, monkey avatar, number of seats from two to eight, round timer of thirty seconds, sixty seconds or none, and a winning score of one hundred, two hundred or five hundred bananas.
3. **Lobby** at `/partie/:code`. The join code in large type, the monkeys who have arrived, the number of free seats, the rules of this game written out, and a *Lancer la partie* button that only the host sees and that only lights up at two players or more.
4. **Game** at `/partie/:code`, once the game is running. The crate at the top with its banana count, every player's stash, a bid pad, and the countdown. After every player has bid, the reveal shows each number, who took the crate, who paid what tariff to whom and who busted, then the next round opens.

A finished game shows the winner, the final stashes and a button to play the same group again.

## Use cases / edge cases

### Domain model

```
Game 1 --- n Player
Game 1 --- n Round
Round 1 --- n Bid          (one per live player, secret until the round resolves)
Round 1 --- 1 RoundResult  (the resolved arithmetic, written once)
```

### Sequence of one round

```
Player A          Player B          API                       WebSocket
   |                 |               |                            |
   |-- POST bid ---->|               |                            |
   |                 |               |-- record bid ------------->|
   |                 |               |-- broadcast "A has bid" -->|--> A, B
   |                 |-- POST bid -->|                            |
   |                 |               |-- record bid               |
   |                 |               |-- all bids in: resolve     |
   |                 |               |-- write RoundResult        |
   |                 |               |-- broadcast result ------->|--> A, B
   |                 |               |-- open next round -------->|--> A, B
```

### Happy path

1. A person opens `banana-rush.borso.fr` and taps *Créer une partie*.
2. They pick a nickname and a monkey, choose six seats, a sixty second timer and two hundred bananas to win, and confirm.
3. They land in the lobby holding a four letter join code, and they are the host.
4. A friend opens the same address, types the code, picks their own nickname and monkey, and appears in the lobby on both phones.
5. The host taps *Lancer la partie*. Every player starts with ten bananas and the crate holds ten.
6. Each player types a secret number of at least one and taps *Miser*. The other phones show that a player has bid but never the number.
7. When the last bid arrives the round resolves, and every phone shows the same reveal at the same moment.
8. The crate is refilled to match the largest stash on the table, and the next round opens.
9. The first player to reach the winning score ends the game, and every phone shows the final table.

### The arithmetic, stated exactly

A round is resolved from the bids and the crate alone.

1. Sort the bids into groups of equal value, highest first.
2. If the highest group holds two players or more, they split the crate equally, any remainder is discarded, and no tariff is paid. The round is over.
3. If the highest group holds one player and there is no group below it, that player takes the whole crate and pays no tariff. The round is over.
4. Otherwise the tariff is the highest bid minus the next highest bid. If that player's stash plus the crate covers the tariff, they take the crate, pay the tariff, and the players in the next group split it equally with any remainder discarded. The round is over.
5. If the tariff is not covered, that player busts. Their stash drops to zero, they take nothing, and the round is resolved again from step one with their group removed.
6. Once the round is over, the crate is refilled to the largest stash on the table.

The worked example the rules were explained with: three players holding ten bananas each, a crate of ten, bids of ninety, ten and eight. The first player owes eighty and holds twenty, so they bust to zero. The second player is now highest, takes the crate to reach twenty, and pays a tariff of two to the third player. The table ends at zero, eighteen and twelve, and the crate is refilled to eighteen.

### Edge cases

- **Every player bids the same number.** They all split the crate, nobody pays a tariff.
- **Several players tie for second place.** The single tariff is split equally between them and any remainder is discarded.
- **A player at zero bananas bids and wins.** They keep the crate and can pay a tariff out of it, so a busted player can come back.
- **Every group above the last one busts.** The last group standing takes the crate without paying a tariff, because there is nothing below it.
- **The largest stash on the table is zero.** The crate is refilled to one banana rather than zero, so a game can never reach a state where nothing can be won.
- **Two players cross the winning score in the same round.** The one with the larger stash wins. If those are equal too, they win together.
- **The timer runs out.** Every player who has not bid is entered at one banana and the round resolves normally.
- **A player closes their phone mid game.** Their seat stays, their stash stays, and their bids keep being filled by the timer. Reopening the address restores them from the token held in local storage.
- **A player opens the game in two tabs.** Both tabs are the same player, both see the same state, and a second bid in the same round is refused.

### Error cases

- Joining with a code that matches no game answers *cette partie n'existe pas*.
- Joining a game that is already full answers *la partie est complète*.
- Joining a game that has already started answers *la partie a déjà commencé*, unless the token matches a player who is already seated.
- Bidding below one, above the maximum, or on anything that is not a whole number is refused before it reaches the server and again on the server.
- Bidding twice in the same round is refused.
- Starting a game with fewer than two players is refused.
- Anyone who is not the host trying to start the game is refused.

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| How do phones learn about each other's moves? | Polling on a timer, API Gateway WebSocket, streamed responses from Lambda | API Gateway WebSocket, because its billing is per message and per connection minute with no fixed charge. Recorded in ADR-0021 (2026-09-19) |
| Who is a player? | Nickname and join code, passkey accounts | Nickname, a monkey avatar and a token in local storage. A party game cannot ask for a sign up (2026-09-19) |
| What stops a round from hanging? | Wait for everybody, a countdown, a host button | A countdown the host picks, which enters one banana for anyone who has not answered (2026-09-19) |
| What happens after a bust? | Out of the game, stays at zero, skips a round | Stays at zero and can win a later crate, because bids are not backed by the stash (2026-09-19) |
| How high can a bid go? | Unbounded, capped at the stash, capped at a fixed number | Capped at nine hundred and ninety nine, which the interface calls one bananillion. A cap at the stash would make the bust rule unreachable (2026-09-19) |
| What can the host configure? | Seats and timer, plus the winning score, everything | Seats, timer and winning score. Starting stash and starting crate stay fixed at ten (2026-09-19) |
| Can one person play alone? | Bots filling the seats, multiplayer only | Multiplayer only in this version (2026-09-19) |
| What language? | French, English, both | Both, through the i18next layer, French first (2026-09-19) |

**Out of scope:** bots, accounts, a history of past games, statistics across games, spectators, chat, sound, and any ranking that survives a game.

## Architectural choices

| ADR | Decision | What it constrains downstream |
|---|---|---|
| [ADR-0021](../../../../adr/0021-api-gateway-websocket-pushes-banana-rush-round-state.md) | An API Gateway WebSocket API carries state to the phones, and a new `WebSocketChannel` construct owns it | Every write goes through the HTTP API and the WebSocket carries no commands. The front end learns the socket address from `GET /api/config` rather than from a build time variable |

## Changes

### Types / domain model

```ts
export interface PlayerBid {
  readonly playerId: string;
  readonly stashBefore: number;
  readonly bid: number;
}

export interface PlayerOutcome {
  readonly playerId: string;
  readonly bid: number;
  readonly stashBefore: number;
  readonly stashAfter: number;
  readonly crateWon: number;
  readonly tariffPaid: number;
  readonly tariffReceived: number;
  readonly busted: boolean;
}

export interface RoundResolution {
  readonly outcomes: readonly PlayerOutcome[];
  readonly crateAfter: number;
  readonly winnerIds: readonly string[];
  readonly bustedIds: readonly string[];
}
```

### Database changes

```sql
CREATE TABLE game (
  id uuid PRIMARY KEY,
  join_code text NOT NULL UNIQUE,
  status text NOT NULL,
  max_players integer NOT NULL,
  round_timer_seconds integer,
  winning_score integer NOT NULL,
  crate_bananas integer NOT NULL,
  current_round integer NOT NULL,
  round_opened_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE TABLE player (
  id uuid PRIMARY KEY,
  game_id uuid NOT NULL,
  token_hash text NOT NULL,
  nickname text NOT NULL,
  avatar text NOT NULL,
  stash_bananas integer NOT NULL,
  seat_order integer NOT NULL,
  is_host boolean NOT NULL,
  joined_at timestamptz NOT NULL
);

CREATE TABLE bid (
  id uuid PRIMARY KEY,
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  round_number integer NOT NULL,
  amount integer NOT NULL,
  placed_at timestamptz NOT NULL,
  UNIQUE (game_id, player_id, round_number)
);

CREATE TABLE round_result (
  id uuid PRIMARY KEY,
  game_id uuid NOT NULL,
  round_number integer NOT NULL,
  crate_before integer NOT NULL,
  crate_after integer NOT NULL,
  outcomes jsonb NOT NULL,
  resolved_at timestamptz NOT NULL,
  UNIQUE (game_id, round_number)
);

CREATE TABLE socket_connection (
  connection_id text PRIMARY KEY,
  game_id uuid NOT NULL,
  player_id uuid,
  connected_at timestamptz NOT NULL
);
```

The unique constraint on `round_result (game_id, round_number)` is what makes a round resolve exactly once when two players submit the last bid at the same moment. Aurora DSQL aborts the losing transaction, and the service reads the row the winner wrote.

### Files to change

```
infra/cdk/src/constructs/web-socket-channel.ts        // NEW
infra/cdk/test/unit/web-socket-channel.test.ts        // NEW
apps/banana-rush/**                                   // NEW, the whole workspace
.github/path-filters.yml                              // UPDATE: banana-rush filter
commitlint.config.js                                  // UPDATE: banana-rush scope
docs/adr/0021-...md                                   // NEW
docs/adr/README.md                                    // UPDATE: index line
```

### Test strategy

- **Unit tests on pure files.** `round.core.ts` carries the whole arithmetic and ships at one hundred percent statement, branch, function and line coverage, driven from the worked example above and from every edge case listed. `join-code.utils.ts` and `game-config.core.ts` ship at the same bar. The repository gates this already for every `*.core.ts` and `*.utils.ts` file.
- **Construct coverage.** `infra/cdk` is gated at one hundred percent line coverage, so `web-socket-channel.ts` arrives with a test that synthesises it and asserts the routes, the stage and the permission grant.
- **Back end end to end.** The controller tests run against the local Postgres the repository boots without Docker, covering a full game from creation to a winner, the bust cascade across three players, and every error case listed above.
- **Visual validation.** Every numbered happy path step and every edge case is asserted by `/visual-validation` driving the running application at 375 pixels and at 1280 pixels.
- **Technical validation.** `/technical-validation` runs lint, knip, typecheck, build and the test runner over the diff.
- **Manual sweeps are not the test strategy.** Two phones on the same game are a check after deploy, not evidence the feature works.

## Production strategy

### Analytics

**Input metrics**, readable from the API logs without any new service:

- `game_created`, `player_joined`, `game_started`, `round_resolved`, `game_finished`. The share of `game_created` that reach `game_finished` is the output metric's proxy.
- Round resolution latency measured from the last bid to the broadcast, with a target of under four hundred milliseconds at p75.
- WebSocket delivery failures per round, which should be zero outside of a phone going to sleep.

**Output metric**, reviewed by hand rather than alerted on: the share of created games that reach a winner, read monthly from the same logs. If people keep abandoning games in the lobby, the join flow is the problem and not the rules.

### Zero-defect strategy

- `GameNotFoundError`, `GameFullError`, `GameAlreadyStartedError`, `AlreadyBidError`, `NotHostError` and `NotEnoughPlayersError` each map to one HTTP status and one translation key, so no raw message reaches a screen.
- A broadcast to a connection that has gone away deletes that connection row and does not fail the request, because a phone that went to sleep must not break the round for everybody else.
- A round that cannot resolve because of a lost race is retried once against the row the winning transaction wrote, and the second read is the answer.
