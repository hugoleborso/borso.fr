---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#107'
fix-commits: [cda3dd2c41]
eradication-level: 1
eradication-paths: [scripts/dsql-shell.sh]
time-to-detect: weeks
tags: [dsql, tooling, operator]
zone: scripts/dsql-shell.sh
---

# The database shell that opened the other app

## User impact

The operator, opening pragma's production database from a local session for
PR #107's password-reset handoff, could land in another app's database.

| | Seen | Expected |
| --- | --- | --- |
| `scripts/dsql-shell.sh` with no `APP` | a shell on **last-loop-lepin's** production cluster | a refusal, or pragma's |
| `APP=pragma scripts/dsql-shell.sh` | banner "Tables: editions, runners, loop_punches, manual_dnfs, auth_attempts, _migrations", none of which pragma has | a banner naming pragma |

No wrong write is known. The handoff needed two warnings to be safe.

## Causal chain

- A shell opened without `APP` connected to last-loop-lepin's production
  cluster.
  - The script set its target by default:

    ```bash
    APP="${APP:-last-loop-lepin}" # ← the only app with a cluster when written
    ```

    - Commit `fa5d6c9fa` wrote the script when last-loop-lepin was the only app
      with a DSQL cluster. The default was correct that day.
      - pragma and banana-rush then got their own clusters. Those commits
        touched their app and its stack, not the operator scripts that read
        a cluster's parameters. The default turned wrong without a line
        changing.
        - Per-app knowledge in operator scripts (defaults, banners, app lists)
          is kept by hand, and adding an app runs
          `scripts/check-app-registration.sh`, which checks path filters,
          commit scopes, `dev:db`, the README and the bucket name, never these
          scripts (Machine).
- With `APP=pragma`, the banner listed last-loop-lepin's tables.
  - The banner was a literal string written in the same commit for the same
    app.

## Root cause of occurrence

*Thought the default named the application, actually it named the only
application there was when it was written.* (Machine)

Nothing in the repository ties an operator script's app knowledge to the set
of apps. A new app reaches every gate that `check-app-registration.sh` runs,
and none of them reads `scripts/`. So a correct default in a one-app world
stays in place in a five-app world.

## Detection failure causes

- **Linter:** no rule tells a stale default from a deliberate one.
- **App registration gate:** it lists what a new app must touch, and operator
  scripts are not on that list.
- **Code review:** each new cluster was reviewed in its own stack, not against
  the scripts that read its parameters.

## Countermeasure

The PR #107 handoff named `APP=pragma` explicitly and warned about the banner.

## Eradication

**Type:** structural impossibility (level 1) for `dsql-shell.sh`. It cannot
open a cluster nobody named.

**Reference:** commit `cda3dd2`.

```diff
-APP="${APP:-last-loop-lepin}"
+APP="${APP:?APP is required: name the application whose cluster to open, for example APP=pragma}"
```

The banner names the app and points at `\dt` instead of one app's tables.

**Proof it can fail:** run without `APP`, the script stops at the `:?`
expansion before any AWS call (the shell's behaviour for `${VAR:?}`).

**Similar instances:** `grep -rn "DEFAULT_APP" scripts --include='*.ts'`
finds `scripts/database/read-target.utils.ts:4`,
`export const DEFAULT_APP = 'pragma';`, read by `db-read.ts:64`. It reads, so
a wrong default shows the wrong rows rather than risking a write. The usage
lines in `scripts/database/db-read.ts:58` and `scripts/db-read.sh:12` list
four apps by hand, while `READABLE_SCHEMA_BY_TARGET` beside them also names
`skull-king`. The level above holds for `dsql-shell.sh` only.

**Proposed:** delete `DEFAULT_APP` the way `dsql-shell.sh` lost its default,
so `db-read` refuses a call without `APP`. Build both usage lines from
`READABLE_SCHEMA_BY_TARGET`. No operator script can then pick an app by
omission or print a stale list.
