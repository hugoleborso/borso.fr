# Vocabulary — banana-rush

`banana-rush` is a party game of secret bids, played from a phone by a
group of friends who are usually in the same room. There are no accounts:
a player is a nickname, a monkey and a token held in their own browser.
One game lives behind a four letter code, and nothing about it outlives
the game.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Game

One table of players playing to a score, from the moment somebody creates
it until somebody wins. It is the only aggregate here: players, bids and
resolved rounds all belong to exactly one game and are meaningless without
it.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Player

One person seated at one game. A player exists only inside a game: the
same human joining two games is two players, with two tokens and two
stashes.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Bid

The secret number one player writes in one round. A bid is not backed by
anything: a player may bid more bananas than they own, and that is the
whole tension of the game.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Stash

The bananas one player currently holds. It starts at ten, changes only
when a round resolves, and is the number the winning score is compared
against.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Crate

The pot every player is bidding for. It is not a pool people pay into: it
is refilled at the end of each round to match the largest stash on the
table, which is what makes the game inflationary.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Tariff

What the highest bidder owes the second highest bidder: their bid minus
the bid below theirs. It is paid out of the winner's stash plus the crate
they have just taken.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Bust

What happens to a bidder who cannot cover their tariff out of their stash
plus the crate. Their stash drops to zero, they take nothing, and the
bidder below them becomes the highest and faces the same question.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Round

One turn: every live player writes a bid, and the game resolves them all
at once. A round resolves when the last bid arrives, or when the timer
runs out and the missing bids are entered at one banana.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Join code

The four letters a player types to reach a game. It is how a game is
found, and it is not a secret: knowing it lets somebody watch and, while
the game is in its lobby, take a seat.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Connection

One open WebSocket from one phone, recorded against one game so the API
knows where to deliver. It carries no commands in either direction that
change the game.

Lives in: `api/src/realtime/`

Invariants: `api/src/realtime/INVARIANTS.md`

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
