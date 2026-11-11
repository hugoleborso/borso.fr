---
date: 2026-11-11
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#292'
fix-pr: none (the kaizen pull request of PR #292, not numbered when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/talos/test/dev-database.setup.ts, apps/talos/test/dev-live-seed.json]
time-to-detect: hours
tags: [talos, local-dev, agents, agent-browser, validation]
zone: apps/talos/test/dev-database.setup.ts
recurs: [the-dev-seed-that-lived-in-a-bash-string, pnpm-dev-served-an-empty-database]
---

# The dev database that opened no screen

## User impact

The operator validates talos on screens. On PR #292 no agent could open one
with the tools CLAUDE.md names, so the 375 px checks were skipped, replaced by
a stubbed API, or done with a script each agent wrote for itself.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm dev` in `apps/talos` | no sign-in printed, every screen redirects to `/login` | a `[dev:db]` line with a sign-in, as pragma prints |
| A state added to `memory-seed.json` | never reaches a database seeded once | the next `pnpm dev` replays it |
| « Jour » and « Décider » on the seed | no awaited commitment, no journal of the day, one expired proposal | rows that are current on the day of the seed |
| Round 1 and 2 of `routine-launch` | the 375 px row is UNVERIFIABLE twice (B21, B11) | measured |

Seven of the fifteen friction lines of the pull request are this, from five
writers (`main`, `routine-launch`, `technical-validator` three times,
`index-navigation`, `todo-switch`), counted in
`docs/features/meta/lessons-from-pr-292/inventory.md` rows 01 to 07.

## Causal chain

- An agent cannot show a talos screen at 375 px.
  - `agent-browser` reaches only `/login`.
    - Every route but `/login` needs a session, and a session is issued only after a passkey ceremony.
      - `agent-browser` has no virtual authenticator, so the ceremony needs a hand-written Playwright script with CDP.
        - That script registers a passkey in the shared local database, which closes registration for the next browser context.
      - `test/dev-database.setup.ts` seeded the memory and no session.
  - The screen that does open is empty of what the feature shows.
    - The seed's rows are dated October 2026, because the back e2e tests assert on those dates.
    - A row added to the seed is not applied: the script posted the seed under the fixed idempotency key `dev-seed`, and a batch whose key is known is skipped.

## Root cause of occurrence

*Thought a seeded memory is a seeded app, actually an app is seeded when a
screen can be opened on rows that are current.*

`apps/talos/test/dev-database.setup.ts` before this change:

```ts
const seed = changeRequestSchema.parse({
  idempotencyKey: 'dev-seed',
  actor: 'import',
  operations: MEMORY_SEED,
});
```

The idempotency key exists so the agent can resend a batch safely. The dev
seed borrowed it to make `pnpm dev` restartable, which also made the seed
unchangeable. Posting it under a new key is not the fix: measured, a replay
left 4 relations for 2 seeded.

## Detection failure causes

- **Knowledge:** `screenshotting-talos-behind-its-passkey.md` documented the passkey route as the recipe, so each agent read the wall as known and worked round it instead of logging a defect. Its triggers fired only on `db:local:wipe` and on the authenticator call, after the agent had already chosen the route.
- **CLAUDE.md:** *Checking a screen* says the `[dev:db]` line prints the seeded sign-in "where the app has one". talos had none, and the sentence made that read as intended.
- **Validation:** the validator typed the 375 px row UNVERIFIABLE, which does not fail a round, so two reports passed without the measure.

## Countermeasure

`pnpm dev` now does three things, in `test/dev-database.setup.ts`:

1. It writes one session row, `dev-seeded-sign-in`, and prints its cookie and the `agent-browser` line that sets it. The cookie is signed with the key only `main.dev.ts` gives the local API.
2. It keys the seed on a hash of its operations. When another dev seed is already applied it empties the `memory_*` tables, then replays. Passkeys and sessions stay.
3. It adds `test/dev-live-seed.json`, rows dated from the day of the seed.

Verified on 2026-11-11: `GET /api/session` with the cookie answers
`{"signedIn":true,"registered":false}`, and `agent-browser` at 375 by 812
rendered « Jour » with the brief of the day, « En attente · 1 » and
« À décider 2 ». A second `pnpm dev:db` printed no wipe and left 2 relations.
`oxlint --type-aware` and `pnpm run typecheck` pass.

## Eradication

**Type:** structural impossibility (level 1). The app cannot be started locally without a usable sign-in being printed, and a seed cannot be edited without being replayed.

**Reference:** the commit that adds this file.

```diff
-const seed = changeRequestSchema.parse({
-  idempotencyKey: 'dev-seed',
+const seedHash = createHash('sha256').update(JSON.stringify(operations)).digest('hex');
+const seedKey = SEED_KEY_PREFIX + seedHash.slice(0, SEED_KEY_HASH_LENGTH);
+...
+await sql`
+  insert into session (id, created_at, expires_at)
+  values (${SEEDED_SESSION_ID}, ${now}, ${new Date(now.getTime() + SESSION_LIFETIME_MS)})
+  on conflict (id) do update set created_at = excluded.created_at, expires_at = excluded.expires_at`;
```

**Proof it can fail:** no check was added, a mechanism was. The old behaviour was reproduced first: the seed posted under a second key on a seeded database left `memory_relation` at 4 rows.

**What is given up:** rows an agent posted by hand to the local memory are emptied when the seed or the day changes. The local Postgres is shared between agents, so one agent's `pnpm dev` on a new day clears another's hand-made rows. The passkey route had the same reach through `db:local:wipe`.

**Similar instances:** `grep -n "seeded\|sign in" apps/*/test/dev-database.setup.ts`. pragma prints its members and password. last-loop-lepin and banana-rush were not checked for a printed sign-in in this sweep.

The knowledge entry is rewritten around the cookie:
[`screenshotting-talos-behind-its-passkey.md`](../knowledge/screenshotting-talos-behind-its-passkey.md).
