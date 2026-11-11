---
date: 2026-11-11
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#290'
fix-pr: '#290'
fix-commits: [2d59df1c1, self]
eradication-level: 1
eradication-paths: [apps/last-loop-lepin/test/dev-database.setup.ts, apps/last-loop-lepin/package.json]
time-to-detect: days
tags: [last-loop-lepin, pnpm, local-dev]
zone: apps/last-loop-lepin/package.json
recurs: [pnpm-dev-served-an-empty-database]
---

# The one dev seed written as JavaScript inside a bash string

## User impact

`pnpm dev` in last-loop-lepin, the command CLAUDE.md gives every agent for
checking a screen, did not start on `main`.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm dev` in `apps/last-loop-lepin` | Died at once under `set -u` (logged by `wide-events-rollout`) | Site, API and a seeded database |
| The database the seed wrote | The test database, while `dev:api` reads the dev one (#290 commit `fc3d094`) | The dev database, with the admin PIN |

## Causal chain

- `pnpm dev` died at start.
  - `dev-db.sh` expanded `$6` under `set -u`.
    - The admin PIN's scrypt hash, which holds `$`, sat inside a JavaScript program inside a double-quoted bash string, so every `$` needed escaping for two parsers and one escape was wrong.
      - last-loop-lepin seeded its dev database from bash, while pragma and banana-rush run `test/dev-database.setup.ts` with `tsx`.
- Once it ran, it seeded the wrong database.
  - It called `local-postgres.sh start last-loop-lepin` without `dev`, which the other two apps' `dev:db` lines pass.

## Root cause of occurrence

*Thought each app's dev seed could take its own shape, actually only the
shared shape gets the fixes.*

`docs/dantotsus/pnpm-dev-served-an-empty-database.md` gave pragma and
banana-rush `test/dev-database.setup.ts`, and `check-app-registration.sh`
accepted `test/dev-database.setup.ts` or `dev-db.sh`, so nothing moved the
third app onto the shared shape, and its copy got none of the shared fixes.

## Detection failure causes

- **CI:** nothing runs `pnpm dev`.
- **The registration gate:** it checked that `dev:db` named a seed, and
  `dev-db.sh` counted, whatever it did inside.

## Countermeasure

#290 fixed the escape and the database name in `dev-db.sh`. This pull request
replaces the script with `test/dev-database.setup.ts`, which runs the same
`test/setup-postgres.ts` the e2e suite does and inserts the PIN hash as a
query parameter, so no shell ever reads it. `pnpm dev:db` printed
`[dev:db] migrations applied, admin PIN seeded: lastloop` and the row read
back as `1|scrypt$6ccc66e` from the dev database (run 2026-11-11).

## Eradication

**Type:** structural impossibility (level 1). The JavaScript-in-bash seed is
deleted. The PIN hash is now a query parameter in TypeScript, so no shell
parses its `$`, and the database name sits in the `dev:db` line beside
`dev:api`'s, as in the other two apps.

**Reference:** the kaizen branch for PR #290, commit `self`.

```diff
-    "dev": "concurrently -k -n db,api,site -c blue,magenta,green 'pnpm dev:db' 'pnpm dev:api' 'pnpm dev:site'",
-    "dev:db": "./dev-db.sh",
+    "dev": "pnpm dev:db && concurrently -k -n api,site -c magenta,green 'pnpm dev:api' 'pnpm dev:site'",
+    "dev:db": "DATABASE_URL=$(../../scripts/local-postgres.sh start last-loop-lepin dev) tsx test/dev-database.setup.ts",
```

This drops a property the script had: it stopped the local cluster when
`pnpm dev` exited. The other two apps never did, and `local-postgres.sh stop`
still does.

No check is added. `check-app-registration.sh` tests only that `dev:db` names
a seed file, so tightening the names it accepts would not catch a broken seed.
The operator rejected that as a fix. Nothing yet runs `pnpm dev` in CI, so a
seed that dies at start is still found by the next person who runs it.

**Proof it can fail:** not applicable, no new check. `pnpm dev:db` seeded the
dev database on 2026-11-11, as the countermeasure records.

**Similar instances:** `ls apps/*/dev-db.sh` finds none left.
