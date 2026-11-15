# Invariants of banana-rush, in `api/src/realtime`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/banana-rush/`.

## Connection

- `socket_connection` holds `connection_id`, `game_id` and `player_id`.
- A connection that has gone away answers a gone status, which
  `postToConnection` reports as an outcome rather than an error, and the
  row is forgotten.

Often confused with **player**. A player may have no connection, or two.
