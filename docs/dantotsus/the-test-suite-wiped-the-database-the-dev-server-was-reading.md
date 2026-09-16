---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#104'
fix-pr: '#105'
fix-commits: []
eradication-level: 1
time-to-detect: minutes
tags: [testing, postgres, agents, sandbox, harness, pragma]
---

# The suite that pulled the database out from under the browser

## Symptom

Two agents were working at once: one driving the application in a browser
against the dev server, the other running the back-e2e suite. The browser
agent's session stopped verifying mid-run, its bars vanished, and its
login attempts came back as wrong credentials until the rate limiter shut it
out for fifteen minutes.

Nothing had gone wrong in the application.

## Root-cause chain

1. **Why did the browser agent lose its data?**
   Every table it was reading had been dropped and recreated empty.
2. **Why?**
   The back-e2e harness drops the tables it knows and replays the migrations
   at the start of its run.
3. **Why did that reach the dev server's data?**
   Both connect to the same database. `scripts/local-postgres.sh start pragma`
   returns one URL, ending in `pragma_test`, and the dev server's `dev:api`
   script and the test script both call exactly that.
4. **Why did one database serve both?**
   The script was written for a single consumer, the test suite, and the dev
   server was later pointed at it because it was the Postgres that existed.
   Nothing marked the database as the harness's to destroy.
5. **Why was the collision not obvious?**
   It is invisible while only one of the two runs. It appears the first time
   a person, or an agent, does both at once — which is exactly what an
   orchestration that validates while it tests will do.

**Root cause:** thought the sandbox Postgres was a server two consumers could
share, actually the harness owns its database destructively, so any other
reader of the same database is data the next test run deletes.

## Detection failure causes

- **Typing:** a connection string is a string.
- **Functional validation locally:** both halves work alone; only the overlap
  breaks, and the overlap is rare for a human and normal for an orchestrator.
- **CI:** CI runs the suite against a service container nobody else reads, so
  the shared-database case does not exist there.
- **Code review:** the dev script and the test script are in the same
  `package.json` and read as two lines that happen to call the same helper.
  Reading them as a conflict requires knowing what the harness does at
  startup.

## Countermeasure

None at the time: the run was re-done after the suite finished, and the
orchestration was changed by hand to serialise the two.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #105

**The actual fix:** the cluster now hosts one database per purpose. The
harness keeps `<app>_test`, which it may drop at will; a dev server asks for
`<app>_dev` and is unreachable from the harness:

```diff
-  DB_NAME="${APP_SLUG//-/_}_test"
+  DB_PURPOSE="${2:-test}"
+  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"
```

```diff
-"dev:api": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) STAGE=dev ..."
+"dev:api": "DATABASE_URL=$(../../scripts/local-postgres.sh start pragma dev) STAGE=dev ..."
```

The default is unchanged, so every existing caller keeps the test database
and nothing had to be updated in CI. The two consumers now share a cluster
and a port, which is what made the arrangement cheap, and share no tables,
which is what made it dangerous.

**Sibling defects swept:** `last-loop-lepin`'s dev server had the same
collision waiting and was moved to its own database in the same commit.

## See also

- [`a-table-the-harness-never-dropped-passed-the-first-run.md`](./a-table-the-harness-never-dropped-passed-the-first-run.md) — the same reset, seen from the harness's side.
- [`parallel-agents-share-one-scratchpad.md`](../knowledge/parallel-agents-share-one-scratchpad.md) — the same shape in a different shared resource.
