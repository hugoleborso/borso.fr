# Invariants of last-loop-lepin, in `api/src/auth`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Admin session

- `admin_sessions.id` is the primary key, `expires_at` is not null, and the
  session expires 12 hours after it was issued.
- The cookie carrying that id is `httpOnly` and `SameSite=Lax`, never
  `Strict`: `Strict` withholds the cookie on a top-level navigation into the
  application, which logs the organiser out of every link they follow in from
  a mail or a bookmark. The write surface `Lax` leaves open is closed instead
  by `isRequestOriginRejected`, which refuses a state-changing method whose
  `Origin` is not in the stage's `ALLOWED_ORIGIN` list.
- The PIN is checked against a scrypt hash held in the single-row
  `admin_credentials` table. Login is denied with reason `misconfigured` when
  that row is absent.
- Login attempts are counted per client address in `auth_attempts`: five
  attempts per five-minute window, then reason `rate-limited`.
