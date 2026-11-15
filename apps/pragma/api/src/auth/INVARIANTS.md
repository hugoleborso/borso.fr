# Invariants of pragma, in `api/src/auth`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Member credential

- Keyed on `memberId`, so a member holds one credential or none.
  `username` is lowercase, unique through its own index
  (`member_credential_username_idx`), and 2 to 64 characters of letters,
  digits, dot, dash or underscore, starting with a letter or a digit.
- `passwordHash` is argon2id. `sessionEpoch` is a whole number that goes
  up by one on every password change and every recovery
  (`nextSessionEpoch`), and a cookie carrying an older epoch stops
  verifying, which signs that member out everywhere else.
- No route creates one. `createCredentialForMember` is reached only from
  the test-seed route and the test helpers, so a new member needs an
  operator. Deleted with the member, in the same transaction that scrubs
  them from the lineups (`deleteMemberWithLinks`).
- Recovered rather than recreated: a member who forgot their password
  proves the shared password on the recovery route, and the same row is
  updated in place, which is why their passkeys survive it.

Held by: `api/src/auth/credentials.schema.test.ts` › lowercases and trims a username
Held by: `api/src/auth/auth.controller.test.ts` › no longer serves the enrolment endpoints
Held by: `api/src/auth/auth.controller.test.ts` › changes a password, keeps that member signed in here and drops their other browsers
Held by: `api/src/auth/auth.controller.test.ts` › drops the sessions the member had open elsewhere when they recover
Held by: `api/src/auth/auth.controller.test.ts` › keeps the member passkeys alive through a recovery
Held by: `api/src/auth/credentials.repository.test.ts` › deletes a member credential with the member it belongs to

## Passkey

- Stores the credential id, the public key as `bytea`, the signature
  counter and a label: the device kind guessed from the user agent at
  creation, which the member confirms or changes right after
  (`PATCH /api/me/passkeys/:passkeyId`). The credential id is unique.
- It is an alternative to the password, not a second factor: a member
  signs in with either. The password stays as the way back when a device
  is lost.
- The challenge of a registration or an assertion lives one row in
  `webauthn_challenge` for two minutes (`CHALLENGE_TTL_MS`), because the
  options call and the verify call are two Lambda invocations sharing no
  memory.

Held by: `api/src/auth/auth.controller.test.ts` › keeps the member passkeys alive through a recovery
Held by: `api/src/me/me.controller.test.ts` › answers 404 for a passkey of another member and leaves it as it was

## Sign-in session

- One `app_config` row, keyed `id = 1`, still holds the HMAC key that
  signs cookies, and a password hash the recovery route alone reads.
- The cookie is named `pragma_session` and is `payload.signature`, where
  the payload carries the member id, that member's session epoch, and the
  issue and expiry times. It lasts 30 days.
- The gate reads the cookie and the credential behind it: only the second
  read can see a password change.
- `requireBearerSession` is the second door: it resolves the member from an
  **assistant grant**'s access token, applies the same session epoch rule,
  and writes the same member id, so a service never knows which door was
  used.
- Rotating the shared password mints a fresh HMAC key, so every member's
  cookie stops verifying.
- Login attempts are counted per hashed client IP and rate limited.
- Every route passes `requireMemberSession` except sign-in, recovery,
  bootstrap and the passkey challenge (`auth.controller.ts`), the
  audience's public routes, which a ballot reaches
  (`audience.controller.ts`, which gates its two band routes one by one),
  the OAuth discovery, registration, authorization, token and revocation
  routes an **assistant client** calls (`oauth.controller.ts`), and the
  test-seed route.

Held by: `api/src/auth/auth.controller.test.ts` › gates a protected route on the member session cookie
Held by: `api/src/auth/auth.controller.test.ts` › refuses rotate-password without a session and rotates it with one
Held by: `api/src/auth/auth.controller.test.ts` › rate-limits after 5 attempts in 15 min on the same ip
Held by: `api/src/audience/audience.controller.test.ts` › answers every public route without a session cookie and gates the two band routes
