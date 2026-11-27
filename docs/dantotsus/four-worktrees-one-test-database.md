---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#118, #161, #163, #165'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/local-postgres.sh]
time-to-detect: hours
tags: [testing, postgres, agents, sandbox, harness, pragma]
zone: scripts/local-postgres.sh
recurs: [the-test-suite-wiped-the-database-the-dev-server-was-reading]
---

# Four worktrees, one test database

## User impact

Four agents working in parallel, each in its own git worktree, ran pragma's back-e2e suite on code that was fine. Four of the twelve agents of the weekend logged it, each as a local surprise.

| | Seen | Expected |
| --- | --- | --- |
| A back-e2e run while another worktree runs the same suite | 49 to 76 errors: `duplicate key value violates unique constraint` on `app_config`, relations that did not exist, 503s from unrelated routes | The suite passes, as it did when each agent re-ran it alone |

## Causal chain

- The suite failed on correct code.
  - Its tables were truncated and re-migrated in the middle of the run.
    - Another run, from another worktree, was doing the same thing to the same database at the same time.
      - `scripts/local-postgres.sh` named the database from the app slug and the purpose only:

        ```bash
        DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"   # pragma_test, for every checkout
        ```

        - Commit `60fcd964e` (2026-09-16, an agent fixing what PR #104 found) added the purpose to the name. It answered "a dev server and a test run in one checkout" and kept one name per app for the whole machine.

## Root cause of occurrence

*Thought one machine holds one checkout, so app and purpose make a database private, actually a fan-out runs one worktree per agent on one machine, so the checkout is part of what makes a database private.* (Man)

The agent that wrote `60fcd964e` had the fact in its context. `CLAUDE.md` at its parent commit already said "When agents must genuinely not see each other, give them `isolation: "worktree"`" (`git show 60fcd964e^:CLAUDE.md`). The prior of one checkout per machine won over it. The fix for a Man cause is a mechanism that holds when the prior wins, not one more line in `CLAUDE.md`.

## Detection failure causes

- **Local:** the failure appears only when two runs overlap, so every rerun alone was green and read as a flake.
- **CI:** each matrix job has its own Postgres service, so CI cannot show it.
- **Review:** the previous dantotsu's fix was reviewed against the case it described, a dev server beside a test run.

## Countermeasure

The database name now carries a key derived from the checkout's root path, so `pragma_test` becomes `pragma_test_3381966237` in one worktree and a different name in the next. The cluster, its port and its start-up cost stay shared per app. Verified with pragma's full `test:coverage` in a worktree: 1932 core tests and 182 back-e2e tests passed against `pragma_test_3381966237`.

## Eradication

**Type:** structural impossibility (level 1), for database names

**Reference:** the commit adding this file, `e51cfdd5a` (PR #173).

```diff
-  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}"
+  CHECKOUT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)
+  CHECKOUT_KEY=$(printf '%s' "$CHECKOUT_ROOT" | cksum | awk '{print $1}')
+  DB_NAME="${APP_SLUG//-/_}_${DB_PURPOSE}_${CHECKOUT_KEY}"
```

Two checkouts can no longer reach each other's test database, because every caller (`test`, `test:coverage`, `dev:db`, `dev:api`, the gate canaries) gets its URL from this one function.

The class is wider than databases, and one sibling still carries the same belief. `scripts/dev-server.sh` keys its state on app and label only (`GROUP_FILE="$STATE_DIR/$APP.$LABEL.pgid"`, read 2026-11-27). A second worktree that starts the same app is told "already runs, and a second one would share its API ports. Use it: <url>", and that URL serves the first worktree's code.

**Proposed:** move the checkout key into one helper under `scripts/` that every script sources when it names something the whole machine shares: the database name, the dev-server state and log files, and the ports. Key the dev-server ports on it, so each worktree gets its own server. A new script that names a shared resource then gets the key by calling the helper, and cannot collide by forgetting it.

**Similar instances:** `grep -rn 'STATE_DIR\|/tmp/\|TMPDIR' scripts/*.sh` lists the scripts that name machine-wide paths. `grep` for hard-coded `_test` and `_dev` database names across `apps/` and `scripts/` found none on 2026-10-12. The first half of this class is [the-test-suite-wiped-the-database-the-dev-server-was-reading](the-test-suite-wiped-the-database-the-dev-server-was-reading.md). The local cluster is described in [local-postgres-without-docker](../knowledge/local-postgres-without-docker.md).
