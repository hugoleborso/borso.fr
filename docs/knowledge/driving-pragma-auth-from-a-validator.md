---
summary: 'Driving pragma sign-in from a validator: the seeded logins, a fresh rate-limit bucket per `X-Forwarded-For`, and why passkey claims belong in back-e2e.'
triggers:
  paths:
    - 'docs/features/pragma/*/validation/**'
  commands:
    - 'localhost:\d+/api/auth'
  output:
    - '"error":\s*"rate-limited"'
---

# Driving pragma's sign-in flows from a validator

_Last verified: 2026-09-18, against the PR #107 dev server, by the
visual-validation run committed under
`docs/features/pragma/password-recovery-with-the-band-password/validation/`._

Three things about pragma's authentication that a validator meets the first
time it tries to exercise it, and that neither the spec nor the tooling
says.

## Start from a seeded database

`pnpm dev` now migrates the dev database and seeds the preview fixture, so
the members `hugo`, `lea`, `marc` and `sarah` sign in with
`pragma-preview`, which is also the band password. Before that fix it
served an empty schema; see
[`pnpm-dev-served-an-empty-database.md`](../dantotsus/pnpm-dev-served-an-empty-database.md).
The fixture route, if you need to reseed mid-run, is
`POST /api/__test/seed`, not `/api/test/seed`. Each `pnpm dev` wipes and
reseeds, so a run that changes passwords leaves nothing behind for the
next one.

## The rate limiters key on the address

Sign-in allows five failures per quarter-hour, recovery three per hour, and
both count per IP hash, where the IP is the first hop of
`X-Forwarded-For`. A browser run that walks every error case locks itself
out after the third wrong band password, for an hour. A validator gets a
fresh bucket by sending a different `X-Forwarded-For` value per case, which
is how the PR #107 run covered every refusal in one session. The buckets
live in the API process's memory, so restarting `pnpm dev` clears them too.

## Passkeys cannot be exercised in a browser here

`agent-browser` exposes no WebAuthn virtual authenticator, and no seeded
member holds a passkey, so a claim such as "a member's passkeys survive a
recovery" cannot be observed from the browser in either direction. Put it
in a back-e2e case instead: insert a `member_passkey` row through the
repository, perform the action, and assert the row is still there.
`auth.controller.test.ts` does exactly that.

## Proving one named test ran

The back-e2e suite prints counts only. To show a specific case executed
without a second full run of about two and a half minutes, run it alone:

```sh
cd apps/pragma && DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) pnpm exec vitest run --project back-e2e -t "accepts a new password equal to the old one"
```
