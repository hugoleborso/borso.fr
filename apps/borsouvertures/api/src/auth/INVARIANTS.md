# Invariants — borsouvertures, `api/src/auth`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Account

- The account is one `operator_credential` row, an argon2id hash and a
  `session_epoch`, plus the HMAC signing key in `app_config`. A script writes
  them on prod and the fixture seed writes them on a preview and in local dev.
- Signing in sets a signed `HttpOnly` cookie that lasts 30 days. A new epoch
  ends every session issued before it.
- The sixth failed sign-in from one address within 15 minutes answers
  `rate-limited`. A sign-in before the credential exists answers
  `auth-not-bootstrapped`.
- A signed-in device pushes the review events and the deck line events whose
  `receivedAt` is `null`, then pulls the account's events after each log's sync
  cursor, and merges both into that log by id. A refused push keeps the batch queued and shows "sync paused".
  A 401 marks the sync `expired`, and a band under the top bar says the session
  expired, with a button that opens the sign-in form in the settings sheet. The
  band shows on the screens that draw no board.
  Offline is not an error. A browser whose store cannot write still pulls every
  page into the open tab, and keeps that cursor in memory only.
- The account link shows only when the session route answers, so with no API
  the app shows no dead link.

Held by: `api/src/auth/auth.controller.test.ts` › has no enrolment route
Held by: `api/src/auth/auth.controller.test.ts` › rate limits the sixth failed sign-in, even with the right password
Held by: `api/src/review-events/review-events.controller.test.ts` › stores a batch pushed twice once, and answers the stored receivedAt both times
Held by: `site/src/review/sync.setup.unavailable-store.test.ts` › pulls every page once into the open tab and keeps the cursor off the disk
Held by: `site/src/components/organisms/TopBar.test.tsx` › says the session expired after a 401 and opens the sign-in form in the settings sheet
