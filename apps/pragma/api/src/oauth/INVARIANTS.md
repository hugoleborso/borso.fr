# Invariants — pragma, `api/src/oauth`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Assistant client

- Registers itself through `POST /oauth/register` (RFC 7591) and is always
  a public client: it holds no secret and proves itself with PKCE `S256`.
- Its redirect addresses are `https://`, or a loopback `http://` address
  (`localhost`, `127.0.0.1`, `[::1]`) that matches on any port, because
  each terminal client picks its own callback port (RFC 8252).
- One address may register ten clients an hour; the eleventh is refused.
- A client older than 30 days that holds no **assistant grant** is deleted
  the next time any client registers, so the open endpoint cannot fill the
  table and nothing runs on a schedule.
- Kept out of every preview's copy of production and out of the read-only
  reader's reach, like the two tables below.

Held by: `api/src/oauth/oauth.controller.test.ts` › registers the clients Claude Code and Vibe describe, and refuses any other redirect address
Held by: `api/src/oauth/oauth.controller.test.ts` › refuses the eleventh registration in an hour from one address and reports it
Held by: `api/src/oauth/oauth.controller.test.ts` › sweeps clients older than 30 days that hold no grant when another registers

## Assistant grant

- Created when the member allows the client on the consent page and the
  client exchanges the one-use authorization code, which lives 60 seconds
  and is bound to the client, its redirect address and its PKCE challenge.
- Holds an access token (one hour) and a refresh token (90 days), stored as
  SHA-256 hashes only. Every refresh rotates both. Every refresh token of a
  grant starts with the same family secret, and presenting any token of the
  family other than the current one, however many rotations old, revokes the
  whole grant.
- Carries the member's session epoch from when it was issued, the same
  number a **sign-in session** carries, so a password change ends every
  grant the way it ends every cookie.
- Revoked from the Account page, by the client through `POST /oauth/revoke`,
  or by deleting the member, which deletes the member's grants and pending
  codes in the same transaction.

Held by: `api/src/oauth/oauth.controller.test.ts` › runs the whole flow: consent, code, tokens, and the code cannot be spent twice
Held by: `api/src/oauth/oauth.controller.test.ts` › rotates the refresh token, and a replay of the old one revokes the grant and is reported
Held by: `api/src/oauth/oauth.controller.test.ts` › revokes the grant when a token two rotations old is replayed after a thief refreshed twice
Held by: `api/src/oauth/oauth.controller.test.ts` › ends every grant of a member who changes password
Held by: `api/src/oauth/oauth.controller.test.ts` › deletes the grants and pending codes of a deleted member
