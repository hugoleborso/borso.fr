---
summary: 'talos `pnpm dev` prints a seeded sign-in cookie on its `[dev:db]` line: set it with `agent-browser cookies set` and every screen opens. A CDP virtual authenticator is only for the login screen itself.'
triggers:
  commands:
    - 'talos.*db:local:wipe'
    - 'WebAuthn\.addVirtualAuthenticator'
    - 'insert into session'
  paths:
    - 'apps/talos/test/dev-live-seed.json'
    - 'apps/talos/test/memory-seed.json'
---

# Screenshotting talos behind its passkey

talos has no preview stage ([ADR-2026-10-06T2302](../adr/2026-10-06T2302-talos-deploys-to-prod-only.md)), so a screenshot of a screen comes from `pnpm dev` on the machine, and every screen but `/login` sits behind a passkey.

## Opening a screen

`pnpm dev` from `apps/talos/` prints two lines after it seeds the database:

```
[dev:db] seeded sign-in, no passkey needed: cookie talos_session=<value>
[dev:db] agent-browser cookies set talos_session '<value>' --url http://localhost:5180 && agent-browser open http://localhost:5180/
```

Run the second line. The cookie names a session row the seed writes, signed with the key only `main.dev.ts` gives the local API, so it opens no other stage. It needs no passkey, so `GET /api/session` answers `signedIn: true, registered: false`, and nothing is written that closes registration for the next agent. Measured on 2026-11-11 with `agent-browser` at 375 px: « Jour » and « Décider » both rendered.

## What the seed holds

Two files, both invented content:

- `apps/talos/test/memory-seed.json` carries fixed dates, because the back e2e tests assert on them.
- `apps/talos/test/dev-live-seed.json` carries rows dated from the day of the seed, written `{{day+0}}`, `{{day+2}}` and so on: an awaited commitment, two pending proposals (one a grouped `-faits`), and today's journal. A screen that shows only what is current reads these.

Edit either file and run `pnpm dev` again. The seed's idempotency key is a hash of both files and the day, so a changed seed empties the `memory_*` tables and replays, and says so on a `[dev:db]` line. Passkeys and sessions are kept. The wipe matters: a seed replayed under a new key without it doubled the relations and added a todo (measured, 4 relations for 2 seeded).

Rows another agent posted to `/api/agent/changes` on the same local database go with that wipe. The local Postgres is shared, see [`local-postgres-without-docker.md`](./local-postgres-without-docker.md).

## When the login screen is the subject

Only then drive a passkey. In Playwright, open a CDP session on the page and add a virtual authenticator before the first navigation: `WebAuthn.enable`, then `WebAuthn.addVirtualAuthenticator` with `protocol: 'ctap2'`, `transport: 'internal'`, `hasResidentKey`, `hasUserVerification`, `isUserVerified` and `automaticPresenceSimulation` all true. On `/login`, the first run shows the bootstrap step: fill `#bootstrap-code` with `talos-dev` and press « Créer la passkey ».

The local database keeps that passkey, so registration is closed afterwards, a fresh context's authenticator holds no credential, and every later screenshot is the login screen. Delete the passkey row you created when the run ends. `pnpm run db:local:wipe` also clears it, and clears every other agent's rows with it. Stop the servers by the port they hold, `lsof -ti tcp:5180` and `tcp:3001`, not with `pkill`.

Content in these screenshots must stay fictional: they are committed under `docs/features/talos/`, and talos exists to hold private content.

## Why this entry changed

Until PR #292's sweep the passkey recipe was the only way in, and `agent-browser` cannot drive it. Five agents on that pull request each wrote their own way round it. See [`the-dev-database-that-opened-no-screen.md`](../dantotsus/the-dev-database-that-opened-no-screen.md).
