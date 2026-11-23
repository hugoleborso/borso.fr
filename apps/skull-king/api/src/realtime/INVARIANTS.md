# Invariants of skull-king, in `api/src/realtime`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/skull-king/`.

## Connection

- `socket_connection` holds `connection_id` and `game_id`. It names no
  player, because a phone is not a player.
- `$connect` with `?code=XXXX` opens only when that game exists. No token is
  read.
- The socket carries no command. Any route other than `$connect` and
  `$disconnect` is answered without touching the database.
- `broadcastGame` in `broadcast.service.ts` sends `{ kind: 'game', game }`
  to every connection of the game after each write.
- A connection that has gone away answers a gone status, which
  `postToConnection` reports as an outcome rather than an error, and the
  row is forgotten.

Held by: `api/src/games/games.controller.test.ts` › opens a connection for a game that exists and refuses an unknown code
Held by: `api/src/games/games.controller.test.ts` › pushes the view a write answers to every connection of that game
Held by: `api/src/realtime/broadcast.adapter.test.ts` › reports a connection that has gone away rather than throwing

Often confused with **player**. A player may be entered from any phone.
