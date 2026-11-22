# Vocabulary — skull-king

`skull-king` keeps the score of one game of Skull King, the trick taking
card game, live on every phone at the table. Anyone holding the four letter
code can enter or correct anything. An optional passkey account only lets a
player find their games again.
The score is never stored. Every screen derives it from what the table
entered.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is
taken from the schema, core rule or repository named beside it.

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Game

One table playing the ten rounds of Skull King, from the moment somebody
creates it. It is the only aggregate here: players, rounds and entries all
belong to exactly one game and are meaningless without it. A rematch is a
new game with the same players.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Player

One person seated at one game, at a fixed seat. A player is a name and a
mark, nothing more. A player is not a phone: the same phone may enter the
score of every player at the table.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Mark

How a player is shown on every screen: one icon on a coloured disc, picked
from `PLAYER_ICONS` and `PLAYER_COLORS` in `domain/player-mark.core.ts`.

Lives in: `domain/player-mark.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Round

One deal of the game, numbered 1 to 10. Round N deals
`min(N, floor(70 / players))` cards, which `selectCardCount` in
`domain/round.core.ts` holds.

Lives in: `api/src/games/`, `domain/round.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

Often confused with **phase**. A round is a number; a phase is the step of
that round the table is on.

## Bid

The number of tricks one player announces in one round, from 0 to the cards
dealt. A missing bid means nobody entered it yet.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Missed bid

A bid the table marked as not made, with the cross on the results screen.
The mark is stored on the entry as `isMissed` the moment it is tapped, before
anyone picks the tricks. An entry nobody marked reads as made, which is what
a table enters nothing for.

Lives in: `api/src/games/`, `domain/scoring.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Tricks

The tricks one player actually took in one round, entered only for a missed
bid. A missed bid with no tricks yet keeps its round open. On a made bid the
tricks are the final bid, and any stored value is ignored.

Lives in: `api/src/games/`, `domain/scoring.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Bonus

Points a player earns with a made bid for a capture or a loot alliance,
counted per kind. The kinds, their points and their maximum counts are
`BONUS_KINDS`, `BONUS_POINTS` and `MAXIMUM_BONUS_COUNT` in
`domain/scoring.core.ts`.

Lives in: `domain/scoring.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Bid adjustment

Harry the Giant's ability: after the last trick, one player per round moves
their bid by -1 or +1. The score reads the final bid, `selectFinalBid`,
never below 0.

Lives in: `api/src/games/`, `domain/scoring.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Rascal bet

Rascal of Roatan's ability: one player per round bets 0, 10 or 20 points on
their bid, won when the final bid is made and lost otherwise.

Lives in: `api/src/games/`, `domain/scoring.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Kraken

The card that destroys a trick. When it was played in a round, the table
expects one trick fewer, which `selectExpectedTricks` holds.

Lives in: `api/src/games/`, `domain/round.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## White Whale discard

When the White Whale is played, special cards lose their power, and a trick
made only of special cards is discarded. The table then expects one trick
fewer, like the Kraken. Recorded per round.

Lives in: `api/src/games/`, `domain/round.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Phase

The step the game is on: `bidding`, `scoring` or `finished`, from
`ROUND_PHASES` in `domain/round.core.ts`. It decides which screen shows. A
phase moves forward one round at a time, only when every bid is placed and
every played round balances.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Join code

The four letters that name a game, never I or O. It is the only key:
whoever holds it reads and writes the game.

Lives in: `api/src/games/`, `domain/join-code.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Account

A player who chose to sign in with a passkey, so they can find their games
again. An account is a name and a mark. It never gates a write: a guest at
the table can still enter and correct anything.

Lives in: `api/src/accounts/`

Invariants: `api/src/accounts/INVARIANTS.md`

Often confused with **player**. A player is a seat in one game; an account
may hold one seat in many games, through a claim.

## Passkey

The credential a phone keeps for an account. It is discoverable, so signing
in asks for no name.

Lives in: `api/src/accounts/`

Invariants: `api/src/accounts/INVARIANTS.md`

## Session

The signed cookie that tells the API which account is at this phone. Every
route reads it, and a missing or bad one reads as a guest.

Lives in: `api/src/accounts/`

Invariants: `api/src/accounts/INVARIANTS.md`

Often confused with **connection**. A session names an account; a
connection names a game and nobody in it.

## Claim

Saying "this seat is me": linking one player of one game to the signed-in
account, so the account's rank shows in its list of games. A signed-in
player who creates a game claims their seat in the same request, by marking
it `isMe`.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Account game

One game an account created or opened while signed in. It is what the
account's list of games shows, newest opened first.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

Often confused with **claim**. An account game records a visit; a claim
records which seat is the account's.

## View

The whole game as one phone shows it, `GameView`: players, every played
round with its entries, the phase, the revision and the time the server
read it. Every write answers it, and every connection receives it.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

## Revision

A counter on the game that every write bumps first, inside the write's own
transaction, so two writes to one game happen one after the other. The view
carries it, and the higher revision is the newer view.

Lives in: `api/src/games/`

Invariants: `api/src/games/INVARIANTS.md`

Often confused with **readAt**. The revision counts committed writes; `readAt`
is only when a request was served, and a request that started first can
commit last.

## Pending edit

A tap this phone sent and has not heard back about. The site keeps it beside
the server's view and lays it over that view to draw the screen, until the
write answers or fails.

Lives in: `site/src/lib/game-cache.core.ts`

Invariants: `api/src/games/INVARIANTS.md`

## Connection

One open WebSocket from one phone watching one game. It carries no command,
only the game view pushed after each write.

Lives in: `api/src/realtime/`

Invariants: `api/src/realtime/INVARIANTS.md`

Often confused with **player**. A phone is not a player, so a connection
names a game and nobody in it.
