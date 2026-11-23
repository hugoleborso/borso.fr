# Skull King score keeper

## Goal

A table playing Skull King spends as little time as possible entering scores.
skull-king.borso.fr keeps the score of one game, live on every phone at the
table. Anyone at the table can enter or correct anything.

The smallest change that meets it: one full-stack app copied from banana-rush's
shape (HTTP writes, a WebSocket that only pushes the whole game after each
write). The four letter code is the key to a game. A passkey account is
optional and only lets a player find their games again.

Mockups validated by the operator: https://claude.ai/artifact/FVqS42YbwSCAYT7HgKiHNb

## Principles the screens hold

- Almost no text. Numbers, the player marks and the official card images carry
  the meaning. Titles are "Manche N" and "Scores". Buttons are icons (play,
  check, share, edit) with an `aria-label`.
- A player is shown by their mark (an icon on a coloured disc) with their
  first name: beside the mark on rows and cards, under it on tiles and in the
  score grid header, cut with an ellipsis when it does not fit. The list of
  games is the one exception, because its tile holds up to eight marks in a
  phone's third of a width.
- Every icon, the player marks included, comes from the Lucide icon set
  (`lucide-react`). The app draws no icon of its own.
- A made bid is the default. Nobody types anything for a player who made it.
- Every tap writes at once. There is no save button and no draft.
- Every page works at 375 px wide. Touch targets are at least 44 px.
- A count (a bid, the tricks of a missed bid, a Harry or Rascal step) is
  entered with one stepper, `−` value `+`, the value large between the
  buttons. Every step writes at once.
- Made reads green and missed reads red, each at least 4.5:1 against the
  ground colour and both surface colours, where their points and notes sit. No player colour sits within 45 degrees of OKLCH hue of
  either, unless it is a grey (chroma under 0.06).
  `site/src/styles/palette.test.ts` reads `tokens.css` and holds both
  rules.
- The look is a ship's hold. The page is dark planks, cards and sheets are
  dark wood panels with a thin brass edge, and the main action is brass with
  dark ink on it. Titles are Pirata One filled with a gold gradient. The
  textures are photographs, not drawings, and there is no glow.
- A dark wash over each wood texture keeps every text colour at 4.5:1 or more
  on its lightest 5% of pixels. The ground and surface colours are each
  texture's mean colour under its wash, and the palette test holds that link.
- The textures are CC0: "Dark Wooden Planks" by Amal Kumar on Poly Haven
  (polyhaven.com/a/dark_wooden_planks), and Wood067 and Metal007 on ambientCG
  (ambientcg.com). They load as WebP with a JPEG fallback, 281 KB in all.

## Screens

Routes are query based (`/`, `/?game=BRIG`) so a deep link works on the
preview distribution without a host routing change. The phase of the game
decides which game screen shows.

1. **Home.** The title, the selected players as marks with their name under,
   a dashed `+` to add one (a name field appears), and the regulars kept on
   this phone shown faded, one tap to add. Tapping a selected mark opens the
   mark picker. A big `Jouer` button creates the game. Below, a four letter
   code field and an arrow join an existing game. Three to eight players: the
   two-player rules add a ghost hand whose tricks the app does not track.
2. **Invite.** The code in large type, a share
   button (Web Share API, falling back to copying the link) and the players'
   marks. A `Manche 1` button starts. The connected dot of the mockup is
   dropped: a phone is not a player, so the app cannot know whose phone is
   connected.
3. **Bids** (phase `bidding`). "Manche N", a ten segment progress bar, a
   scores button. One row per player: the mark and name, then a bid stepper.
   Every bid starts at 0 (operator call, 2026-11-23). Each tap moves the bid
   by one between 0 and the cards dealt, `−` disabled at 0 and `+` at the
   cards dealt. A bid is never cleared from the stepper.
   The footer shows the sum of bids over the cards dealt, and a play button
   moves to scoring. The play button stays disabled while a stored bid is
   cleared (`isEveryBidPlaced`), and those rows are highlighted.
4. **Results** (phase `scoring`). One card per player: mark and name, bid, live round
   points, and a big toggle, check (made, default) or cross (missed).
   - Made: a strip of the six bonus cards (standard 14, black 14, mermaid,
     pirate, Skull King, loot), wrapping onto a second line when the width
     runs out. A tap on a card adds one, up to `MAXIMUM_BONUS_COUNT` of its
     kind; at the maximum a tap does nothing. The card lights up with a badge,
     `+10` for one card and `2×10` for two. From one card on, a `−` button
     under the card removes one.
   - Missed: a tricks stepper for the tricks actually taken. From no tricks
     yet, `−` sets the final bid minus one and `+` the final bid plus one.
     Each step moves by one between 0 and the cards dealt and skips over the
     final bid, which a missed bid cannot take. A step with nowhere to land
     is disabled. Tapping the cross writes `isMissed: true` at once, so every
     phone shows the player missed and the round stays open until the tricks
     are stepped. Tapping the check writes `isMissed: false` and clears the
     tricks.
   - Footer: tricks counted over expected (green when it balances, amber
     otherwise), the Kraken card and the White Whale card as toggles that each
     remove one expected trick (the White Whale only when it discarded a trick
     of special cards), and a check button that closes the round. The check
     button stays disabled until the count balances (`canCloseRound`): every
     missed player has their tricks, and the total equals the expected tricks.
   - The pencil goes back to the bids of this round, and a scores button
     opens the scores.
5. **Scores.** Reachable from every game screen. The ranking as four (to eight)
   tiles, mark and name, total, last round delta, leader highlighted. Under it a grid,
   one row per played round, one column per player, each cell the points and
   `bid/tricks`. Tapping a cell opens a sheet to correct that player's bid,
   tricks and bonuses for that round, saved on every tap. Its rows say
   "Annonce" and "Plis" in words, each with a stepper. The bid stepper is the
   bids screen's. The tricks stepper shows the tricks taken, which is the
   final bid on a made bid, and moves by one between 0 and the cards dealt
   without skipping the bid: landing on the final bid marks the bid made,
   and any other value marks it missed with those tricks. A play button
   continues the game. After round 10 the phase is `finished`: the scores
   screen shows the winner and a `Rejouer` button that starts a new game with
   the same players and marks.
   The trick checker is part of the counter wherever a round is entered or
   corrected. A correction writes at once, because moving a trick from one
   player to another takes two taps. A round row whose tricks do not balance
   shows an amber mark in the grid, the correction sheet shows that round's
   tally with its Kraken and White Whale toggles, and the play button stays
   disabled while any played round is unbalanced.
6. **Mark picker.** Twelve icons, eight colours, the preview disc and the name.
   The colours are `PLAYER_COLORS` in `domain/player-mark.core.ts`, drawn from
   the `--color-mark-*` tokens of `site/src/styles/tokens.css`; none reads as
   made or missed.
   The icons are the Lucide `skull`, `anchor`, `crown`, `compass`, `swords`,
   `ship`, `ship-wheel`, `bird`, `telescope`, `map`, `coins` and `tree-palm`,
   and each id is the Lucide icon's own name.

## Install

The app installs as a PWA, as banana-rush does: `site/public/manifest.webmanifest`
(standalone, portrait, `#0F141B`), icons 192, 512 and a maskable 512 (a gold coin struck with an "SK" monogram, the operator's pick among four
concepts), an apple touch icon, and the service worker of
`site/src/sw/`, which caches the shell and never caches `/api/`. Opened from
the home screen it starts on `/`, where a regular finds their game.

## Accounts

A player can play as a guest, exactly as above, or sign in with a passkey to
find their games again. An account never gates a write: the join code stays
the key to a game, so a guest at the table can still enter and correct
anything.

- **Create an account.** A name and a mark (the mark picker), then the phone's
  passkey prompt. No password, no email. The passkey is discoverable, so
  signing in later asks for no name.
- **Sign in.** One button, the phone's passkey prompt.
- **Home, signed in.** The signed-in player's mark sits first among the
  selected players, already linked to the account. A "Mes parties" strip lists
  their games, newest first: the date, the players' marks, `Manche N` or the
  winner's mark when finished. A tap reopens the game it shows, even a
  finished one that has a rematch: a phone follows a rematch only when it
  starts while the finished game is on its screen.
- **Which games are "mine".** A game the account created, or opened while
  signed in. Opening a game while signed in adds it to the list. Inside a game,
  a signed-in player taps their own mark once to say "this seat is me"; the
  seat then carries the account and their rank shows in the list.
- **Sign out.** From the home screen.
- **Guest.** Nothing changes: no prompt, no banner, the home screen shows a
  small passkey button beside the join field.

The pattern is pragma's (`apps/pragma/api/src/auth/`): `@simplewebauthn`
server and browser from the workspace catalog, the challenge in a table for two
minutes because options and verify are two Lambda calls, a session cookie
`skull_king_session` signed with an HMAC key kept in the database,
`SameSite=None; Secure` because the preview API is cross-origin, and
`credentials: 'include'` on the client. Unlike pragma there is no password and
no recovery: losing every passkey loses the list of games, never a game.

Data: `account` (`id`, `name`, `icon`, `color`, `created_at`), `passkey`
(`credential_id` pk, `account_id`, `public_key` bytea, `counter`,
`created_at`), `webauthn_challenge`, `app_secret` (the HMAC key),
`account_game` (pk `account_id`, `game_id`, `opened_at`), and a nullable
`player.account_id`.

API, under `/api/accounts`: `POST /registration/options`,
`POST /registration` (creates the account and signs in), `POST
/sign-in/options`, `POST /sign-in`, `POST /sign-out`, `GET /me` (`{ account }`
or `{ account: null }`), `GET /me/games`. Under `/api/games`: `POST
/:code/players/:playerId/claim` links the seat to the signed-in account. Every
game route reads the optional session and records `account_game` when present.

## Rules

- Ten rounds. Cards dealt in round N is `min(N, floor(70 / players))`, so eight
  players are dealt 8 in rounds 9 and 10 (the rulebook: "repeat the number of
  cards dealt"). Held by `domain/round.core.ts`.
- Scores follow the Skull King's scoring of the official rulebook, held by
  `domain/scoring.core.ts`: bid made, 20 a trick plus bonuses; missed, minus 10
  per trick off; zero bid, plus or minus 10 per card dealt. Bonuses count only
  on a made bid. The score is derived, never stored.
- The Tigress played as a pirate counts for the pirate-by-Skull-King bonus, so
  that counter goes from 0 to 6.
- Harry the Giant (advanced pirate ability) moves a bid by -1 or +1 after the
  last trick. The results screen has a Harry card per player: tapping it opens
  the -1 / +1 stepper; the score uses `bid + adjustment` (never below 0). At most one
  player per round uses it (one Harry card).
- Rascal of Roatan (advanced pirate ability) bets 0, 10 or 20 points: won if
  the bid is made, lost otherwise, on top of the round score. The results
  screen has a Rascal card per player: tapping it opens a -10 / +10 stepper
  that moves the bet between 0 and 20, each end disabling its button. At most
  one player per round bets (one Rascal card).
- The other three abilities (Rosie D'Laney, Bendt the Bandit, Juanita Jade)
  change who leads or which cards a player holds, never a score, so the app
  records nothing for them.
- Rascal's scoring (the alternative scoring system, not Rascal of Roatan's
  bet), Cannonball / Grapeshot and variable card counts are not
  built in this version (operator's call). The two-player ghost rules are excluded by the minimum of
  three players.

## Data shape

Names come from `apps/skull-king/VOCABULARY.md`.

```ts
// domain/scoring.core.ts
type BonusKind = 'standardFourteen' | 'blackFourteen' | 'mermaidByPirate'
  | 'pirateBySkullKing' | 'skullKingByMermaid' | 'loot';
type BonusCounts = Record<BonusKind, number>;

// the view every read and every broadcast carries
interface GameView {
  joinCode: string;               // four letters, never I or O
  phase: 'bidding' | 'scoring' | 'finished';
  currentRound: number;           // 1..10
  players: { id: string; seat: number; name: string; icon: PlayerIcon; color: PlayerColor }[];
  rounds: {                       // 1..currentRound, oldest first
    number: number;
    cardCount: number;
    isKrakenPlayed: boolean;
    isWhiteWhaleDiscard: boolean;
    entries: { playerId: string; bid: number | null; bidAdjustment: -1 | 0 | 1; rascalBet: 0 | 10 | 20; isMissed: boolean; tricks: number | null; bonuses: BonusCounts }[];
  }[];                            // one entry per player in seat order, defaults filled in
  revision: number;               // bumped by every write to the game
  readAt: string;                 // ISO time the server served this view
}
```

Tables (Aurora DSQL: no foreign keys, no unique index relied on, natural keys
as primary keys):

- `game`: `id` uuid pk, `join_code` text, `phase` text, `current_round` int,
  `rematch_join_code` text null, `revision` int, `created_at`, `updated_at`.
  `revision` is nullable in the database because DSQL adds no column with a
  constraint; every insert writes 0 and a `null` reads as 0. A `join_code_claim` table keyed on `join_code`
  makes a code unique from the first write, the way banana-rush does it.
- `player`: `id` uuid pk, `game_id`, `seat` int, `name`, `icon`, `color`.
- `round`: pk (`game_id`, `round_number`), `is_kraken_played` bool,
  `is_white_whale_discard` bool.
- `round_entry`: pk (`game_id`, `round_number`, `player_id`), `bid` int null,
  `bid_adjustment` int (default 0, -1..1), `rascal_bet` int (default 0: 0, 10
  or 20),
  `is_missed` bool null (null reads as false, so a missing value means the bid
  was made; nullable because DSQL adds no column with a constraint, and every
  insert writes `false`), `tricks` int null (read only when `is_missed`; a
  missed bid with no tricks yet keeps the round open), one int column per
  bonus kind, `updated_at`.

A missing `round` or `round_entry` row reads as the default (no kraken, bid 0,
made, no bonus). Writes upsert.

## API

All under `/api/games`, JSON, refusals as codes from `domain/game-error.core.ts`.
Every write answers `{ game: GameView }` and then broadcasts the same view.

| Method and path | Body | Does |
| --- | --- | --- |
| `POST /` | `{ players: { name, icon, color, isMe? }[] }` (3 to 8, at most one `isMe`) | creates a game in round 1, `bidding`; with a session, links the `isMe` seat to the account (ignored for a guest) |
| `GET /:code` | | reads the view |
| `PUT /:code/rounds/:round/entries/:playerId` | `{ bid?, bidAdjustment?, rascalBet?, isMissed?, tricks?, bonuses? }`, each optional, `null` clears | upserts one entry |
| `PUT /:code/rounds/:round` | `{ isKrakenPlayed?, isWhiteWhaleDiscard? }` | upserts the round |
| `PUT /:code/phase` | `{ round, phase }` | moves the game to that round and phase, within the rules below |
| `PATCH /:code/players/:playerId` | `{ name?, icon?, color? }` | changes a player |
| `POST /:code/rematch` | | creates a new game with the same players, answers it |

Validation: a round is between 1 and `currentRound` for entries and rounds;
a second player with a non-zero `bidAdjustment`, or a second player with a
non-zero `rascalBet`, in the same round answers
`value-out-of-range`;
`bid` and `tricks` are between 0 and the cards dealt; a bonus count is between
0 and `MAXIMUM_BONUS_COUNT`. `PUT /phase` is idempotent: it sets the target, so
two phones pressing play together land on the same state. It accepts three
moves: any phase but `finished` within the current round, the `bidding` phase
of the next round, and `finished` from the `scoring` phase of round 10. Any
other target answers `value-out-of-range`, so the game never moves back across
rounds and never skips one. The server holds the checker too, so no phone can
skip it: moving a round to `scoring` answers `bids-missing` 409 while a stored bid
is cleared, and opening the next round or finishing answers `tricks-unbalanced`
409 while any played round does not balance.

Every write to a game runs in one transaction that first bumps
`game.revision`, then reads what it checks, then writes. Two writes to one game
therefore happen one after the other: on Postgres the second waits for the
first's row lock, and on DSQL the second commit is aborted and the whole write
is retried, up to one fewer time than the maximum of eight players, because
each wave of aborts lets one write commit. So the one-Harry and one-Rascal rules, the
phase checks, the seat claim and the rematch hold under concurrent requests,
and two phones writing different cells both land.

## Sync

The pattern of banana-rush, kept whole: `api/src/realtime/`. A phone opens
`WEBSOCKET_CLIENT_URL?code=BRIG`; the socket carries no command. After every
write the service broadcasts `{ kind: 'game', game }` to every connection of
that game. The site writes each broadcast into the TanStack Query cache for
`['game', code]` unless the cached view is newer: a higher `revision`, or the
same revision with a later `readAt`. That keeps an older broadcast arriving
late from undoing a newer one. A write's own answer and a read go through the
same comparison, always, even while this phone has a write in flight. The
taps this phone has not heard back about are kept apart and laid over the
newest server view, so a broadcast from another phone shows at once and the
tap still shows. `readAt` alone could not order two views: it is when a
request was served, and a request that started first can commit last.

Two phones writing different cells touch different rows and never conflict.
Two phones writing the same cell: the last write wins, and both phones end on
the view the last broadcast carries.

## Out of scope

Email or password sign-in, account recovery, Rascal's scoring system, a per-round card count
override, offline entry.

## Decisions taken without the operator

- The QR code of the mockup is not built. No package in the repository draws
  one, and a new dependency is an ADR decision. The code in large type and the
  share button are how banana-rush invites, and they ship.
- The card images are photographs of the Grandpa Beck's 2021 English edition
  posted on BoardGameGeek (images 9348385, 9348380 and 9348383), straightened
  and cropped to 430x600. They are the publisher's art, used on a private site
  for friends. No flat scan is published by the publisher.
