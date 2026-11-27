---
date: 2026-10-02
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#107'
fix-commits: [a28ffcfdb9, 75d966d8c8, 40af66de99]
eradication-level: 2
eradication-paths: [scripts/check-app-registration.sh, apps/pragma/test/dev-database.setup.ts]
time-to-detect: weeks
tags: [pragma, banana-rush, local-dev, dsql, gates, pre-commit]
zone: apps/pragma/package.json
---

# `pnpm dev` served an empty database, and the next app copied it

## User impact

The visual validation of PR #107 started pragma with `pnpm dev`, the command
`/visual-validation` spawns. Every API call answered 500, so the validator could
not sign in, seed, or reach a screen behind the login. It spent six tool calls
finding out why, then applied the migrations by hand.

| | Seen | Expected |
| --- | --- | --- |
| Any API route on a fresh checkout | `PostgresError: relation "member_credential" does not exist` | the route answers, and the seeded sign-in works |
| A developer who had once run back-e2e | tables present, everything works | the same |

## Causal chain

- Every route answered 500.
  - The dev database had no tables.
    - pragma's `dev:db` booted the cluster and created the database, and applied
      nothing:

      ```json
      "dev:db": "../../scripts/local-postgres.sh start pragma",
      ```

      - Commit `0fafc57821` scaffolded pragma on 2026-05-19 with this line. Pragma
        had no migrations then, so the line was complete.
        - Commit `8be0e6216c`, the same day, added
          `api/src/database/migrations/0000_initial.sql` and left `dev:db` as it
          was. Its message says the client "mirrors last-loop-lepin's pattern",
          so the agent read last-loop-lepin's database client, not its
          `dev-db.sh`, which was where that app replayed its migrations.
          - Applying migrations to a dev database was a step each app wired by
            hand in its own script. Nothing shared ran it for an app that owned
            a migrations folder.
- banana-rush had the same defect, because it was scaffolded from pragma's
  scripts.

## Root cause of occurrence

*Thought adding a migrations folder gave every database the app uses its
schema, actually only the test harness replayed it, and the dev database got a
schema only from a per-app script pragma did not have.* (Machine)

The codebase split one job, "give this database the app's schema", across a
copy per app and per purpose: last-loop-lepin's `dev-db.sh`, each app's
`test/setup-postgres.ts`. An agent adding migrations had no single place that
would carry them to the dev database.

## Detection failure causes

- **CI:** CI never runs `pnpm dev`. The back-e2e suite migrates through its own
  global setup, so it stays green whatever `dev:db` does.
- **Local validation:** a database that had once seen back-e2e or a manual
  migration kept its tables, because nothing wiped it. Only a cluster nobody had
  prepared, which is what a validator or a fresh checkout gets, showed the bug.
- **Code review:** the script is one line and reads correctly.

## Countermeasure

Commit `a28ffcfdb9` points pragma's `dev:db` at `test/dev-database.setup.ts`,
which calls `test/setup-postgres.ts` to replay every migration, then seeds the
preview fixture. Commit `75d966d8c8` does the same for banana-rush. Both were
verified from an emptied `public` schema.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`40af66de99`](https://github.com/hugoleborso/borso.fr/commit/40af66de99).
`scripts/check-app-registration.sh` fails an app that owns
`api/src/database/migrations/` while its `dev:db` names neither
`test/dev-database.setup.ts` nor `dev-db.sh`:

```bash
if ! grep -qE '^[[:space:]]*"dev:db":[[:space:]]*"[^"]*(test/dev-database\.setup\.ts|dev-db\.sh)' \
  echo "[check-app-registration] $slug owns migrations but its dev:db does not apply them." >&2
```

**Proof it can fail:** green on the tree, and red with that message when
pragma's `dev:db` was put back to the bare cluster start (measured when the
check shipped).

**Gap:** the check reads a file name. A `dev-database.setup.ts` that never calls
`applyMigrations` passes. Every full-stack app keeps its own
`test/setup-postgres.ts` replaying the same folder
(`ls apps/*/test/setup-postgres.ts` lists them).

**Proposed:** make `scripts/local-postgres.sh start <app> dev` replay
`apps/<app>/api/src/database/migrations` itself whenever that folder exists,
through one shared replayer the test setups also call. A full-stack app could
then not get a dev database without its schema, and the file-name grep and the
per-app replay copies could be deleted (feasibility inferred, not tried).

**Similar instances:** `grep -n '"dev:db"' apps/*/package.json` shows every
full-stack app now runs `tsx test/dev-database.setup.ts` (measured).
