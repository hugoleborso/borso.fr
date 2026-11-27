---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#104'
fix-commits: [60fcd964e8]
eradication-level: 5
eradication-paths: [scripts/local-postgres.sh]
time-to-detect: minutes
tags: [testing, postgres, agents, sandbox, harness, pragma]
zone: scripts/local-postgres.sh
---

# The suite that pulled the database out from under the browser

## User impact

Two agents worked at once. One drove pragma in a browser against the dev
server. The other ran the back-e2e suite. The browser agent's session stopped
verifying mid-run, its bars vanished, and its login attempts came back as
wrong credentials until the rate limiter shut it out for fifteen minutes
(observed in that run, PR #104).

| | Seen | Expected |
| --- | --- | --- |
| Browser agent during a back-e2e run | bars gone, valid credentials refused, then locked out | its seeded data and sign-in unchanged |

Nothing had gone wrong in the application. Anyone running the dev server and
the suite of the same app at once was affected. CI was not, because its
suite reads a service container nobody else uses.

## Causal chain

- The browser agent lost its data and its sign-in.
  - Every table it read had been dropped and recreated empty.
    - The back-e2e harness drops the tables it knows and replays the
      migrations at the start of its run
      (`apps/pragma/test/setup-postgres.ts`:
      `DROP TABLE IF EXISTS ${TRACKED_TABLES.join(', ')} CASCADE`).
    - The dev server read the same database. Both called
      `scripts/local-postgres.sh start pragma`, which returned one URL ending
      in `pragma_test`.
      - Commit `0fafc5782` scaffolded pragma with
        `"dev:api": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) STAGE=dev ..."`.
        - It copied the shape of `last-loop-lepin`'s `dev:api`, which called
          the same helper the same way.
          - The helper was written for one consumer, the test suite. Its
            header said it pre-created "the `<app>_test` database", and it
            returned that one URL to any caller. The only Postgres in the
            codebase served the harness and the dev server alike (Machine).

## Root cause of occurrence

*Thought the sandbox Postgres was a server two consumers could share,
actually the harness owns its database destructively, so any other reader of
the same database holds data the next test run deletes.* (Machine)

The writer copied a working example. The helper offered one database per
app, so the codebase made the shared database the obvious call. The header
of `scripts/local-postgres.sh` at `0fafc5782` reads: "with trust auth and the
`<app>_test` database pre-created".

## Detection failure causes

- **Typing:** a connection string is a string.
- **Local validation:** both halves work alone. Only the overlap breaks, and
  the overlap is rare for a human and normal for an orchestrator that
  validates while it tests.
- **CI:** CI runs the suite against a service container nobody else reads,
  so the shared-database case does not exist there.
- **Review:** the dev script and the test script sit in the same
  `package.json` and read as two lines calling the same helper. Seeing a
  conflict requires knowing what the harness does at startup.

## Countermeasure

None at the time. The run was redone after the suite finished, and the
orchestration was changed by hand to serialise the two.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `60fcd964e8` (PR #105).

The cluster hosts one database per purpose. The harness keeps `<app>_test`,
which it may drop at will. A dev server asks for `<app>_dev`:

```diff
-  DB_NAME="${APP_SLUG//-/_}_test"
+  DB_PURPOSE="${2:-test}"
+  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"
```

```diff
-"dev:api": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) STAGE=dev ..."
+"dev:api": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma dev) STAGE=dev ..."
```

Every `dev:db` and `dev:api` script in `apps/*/package.json` passes `dev`
today (`grep -n local-postgres apps/*/package.json`). The separation is
opt-in, though. `scripts/local-postgres.sh` still defaults
`DB_PURPOSE="${2:-test}"`, and the only guard is the script's header comment.
A new dev caller that omits `dev` gets the database the harness drops, as
every `db:local:start` script does today. That is a written instruction, so
level 5. The level-1 claim of the first version did not hold.

**Proof it can fail:** not shown. No check exists to fail.

**Proposed:** make the destructive side refuse. Each
`apps/*/test/setup-postgres.ts` would refuse to drop tables in a database
whose name lacks `_test_`, before the `DROP TABLE`. A dev server reading a
`_dev_` database would then be out of the harness's reach whatever its
caller passed. Simpler still, `scripts/local-postgres.sh` could require the
purpose argument, so no caller gets the test database by default. The six
copies of `setup-postgres.ts` (`ls apps/*/test/setup-postgres.ts`) would
best share one guard rather than six.

**Similar instances:** `last-loop-lepin`'s dev server had the same collision
waiting and was moved to its own database in the same commit. A later
dantotsu, [`four-worktrees-one-test-database.md`](./four-worktrees-one-test-database.md),
found the same shape between checkouts, and the database name now carries a
checkout key too.

**Related.**

- [`a-table-the-harness-never-dropped-passed-the-first-run.md`](./a-table-the-harness-never-dropped-passed-the-first-run.md), the same reset seen from the harness's side.
- [`parallel-agents-share-one-scratchpad.md`](../knowledge/parallel-agents-share-one-scratchpad.md), the same shape in a different shared resource.
