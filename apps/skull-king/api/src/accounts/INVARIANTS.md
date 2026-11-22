# Invariants of skull-king, in `api/src/accounts`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/skull-king/`.

## Account

- `account` holds `id`, `name`, `icon`, `color` and `created_at`. It is
  created only by a verified passkey registration, in the same transaction as
  its first passkey, by `insertAccountWithPasskey`.
- An account never gates a write to a game. The join code stays the only key.
- There is no password and no recovery. Losing every passkey loses the list
  of games, never a game.

Held by: `api/src/accounts/accounts.controller.test.ts` › creates an account with a passkey and signs it in with a lasting, cross-site cookie

## Passkey

- `passkey` is keyed on `credential_id`. Registration asks for a discoverable
  credential (`residentKey: 'required'`), so signing in names no account and
  sends no `allowCredentials`.
- Options and verification are two Lambda calls, so the challenge waits in
  `webauthn_challenge` for two minutes. It is taken (deleted) on first use, so
  it can be answered once. A registration challenge carries the new account
  id; a sign-in challenge carries none, and is refused for a registration.
- `passkey.adapter.ts` is the only file importing `@simplewebauthn/server`.

Held by: `api/src/accounts/passkey.adapter.test.ts` › asks for a discoverable passkey, so signing in later needs no name
Held by: `api/src/accounts/accounts.controller.test.ts` › refuses a passkey it does not know, and a challenge it never issued

## Session

- The cookie `skull_king_session` carries the account id and its expiry,
  signed with HMAC-SHA256. It lasts 30 days and is `HttpOnly`, `Secure`,
  `SameSite=None` and `Path=/`, because the preview API is cross-origin.
- The HMAC key lives in `app_secret`, keyed on a fixed id. The first sign-in
  writes it, and the primary key makes two first sign-ins agree on one key.
  Reading a session never writes it.
- The prod reader cannot read `app_secret` or `webauthn_challenge`, because
  the key signs in as anyone.
- Every route reads the session as optional. A missing, forged or expired
  cookie reads as a guest. Only the routes that need an account refuse a
  guest, with `session-required`.
- CORS allows credentials only for `WEBAUTHN_ORIGIN`, the site, so no other
  page can read a signed-in player's games.

Held by: `api/src/accounts/session-cookie.utils.test.ts` › lasts thirty days
Held by: `api/src/accounts/accounts.controller.test.ts` › answers no account to a guest, and to a cookie it did not sign
Held by: `api/src/accounts/accounts.controller.test.ts` › lets the site, and only the site, send its cookie across origins
Held by: `cdk/test/stack.test.ts` › hides the session key and the pending challenges from the reader, since the key can sign in as anyone
