---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#118, #161, #163, #165'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/local-postgres.sh]
time-to-detect: hours
tags: [testing, postgres, agents, sandbox, harness, pragma]
zone: scripts/local-postgres.sh
recurs: [the-test-suite-wiped-the-database-the-dev-server-was-reading]
---

# Four worktrees, one test database

## Symptom

Four agents working in parallel, each in its own git worktree, ran pragma's
back-e2e suite on code that was fine. Their runs failed with 49 to 76 errors:
`duplicate key value violates unique constraint` on `app_config`, relations
that did not exist, and 503s from routes that had nothing to do with the
change. Each agent re-ran the suite alone and it passed. Four of the twelve
agents of the weekend logged it, each as a local surprise.

## Root-cause chain

1. **Why did the suite fail on correct code?** Its tables were truncated and
   re-migrated in the middle of the run.
2. **Why?** Another run, from another worktree, was doing the same thing to
   the same database at the same time.
3. **Why the same database?** `scripts/local-postgres.sh` named it from the
   app slug and the purpose only:

   ```bash
   DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"   # pragma_test, for every checkout
   ```

4. **Why only those two?** The previous fix, for a dev server and a test run
   sharing one database, separated them by purpose. That answered "two kinds
   of process in one checkout" and assumed one checkout per machine.

**Root cause:** the script's author thought one machine meant one checkout,
but a fan-out runs one worktree per agent, so the checkout is part of what
makes a test database private.

## Detection failure causes

- **Functional validation locally:** the failure only appears when two runs
  overlap, so every rerun alone was green and read as a flake.
- **CI:** each matrix job has its own Postgres service, so CI cannot show it.
- **Code review:** the previous dantotsu's fix was reviewed against the case
  it described, a dev server beside a test run.

## Countermeasure

The database name now carries a key derived from the checkout's root path, so
`pragma_test` becomes `pragma_test_3381966237` in one worktree and a
different name in the next. The cluster, its port and its start-up cost stay
shared per app.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
-  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"
+  CHECKOUT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)
+  CHECKOUT_KEY=$(printf '%s' "$CHECKOUT_ROOT" | cksum | awk '{print $1}')
+  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}_${CHECKOUT_KEY}"
```

Two checkouts can no longer reach each other's test database, because every
caller (`test`, `test:coverage`, `dev:db`, `dev:api`, the gate canaries) gets
its URL from this one function. Verified with pragma's full `test:coverage`
in a worktree: 1932 core tests and 182 back-e2e tests passed against
`pragma_test_3381966237`.

**Sibling defects swept:** no caller hard-codes a database name; `grep` for
`_test` and `_dev` names across `apps/` and `scripts/` found none.

## See also

- [`the-test-suite-wiped-the-database-the-dev-server-was-reading.md`](./the-test-suite-wiped-the-database-the-dev-server-was-reading.md), the first half of the same class.
- [`../knowledge/local-postgres-without-docker.md`](../knowledge/local-postgres-without-docker.md)
