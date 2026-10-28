# Handoff: prove the production read path from a hosted session

ADR-0044's read path has never been exercised end to end. PR #199 recorded that
as its validation gap, and the sweep in PR #202 could not close it either. This
is the brief for the session that can.

## Why a laptop cannot do this

The database role `ai_reader_prod` is mapped to the IAM user
`AI-Dev-ReadOnly`, and to that principal only. A local session signs in through
the `borso-admin` SSO profile, which is a different identity, so every attempt
ends at `FATAL: unable to accept connection, access denied` however correct the
IAM policy is. Measured on 2026-10-27 against pragma and banana-rush, after a
green production deploy. The user's long-lived keys live in the claude.ai/code
project environment and nowhere else, which is what makes a hosted session the
only place this can run.

The auto mode classifier refuses an ad-hoc `psql` or a DSQL admin token as a
production read. `scripts/db-read.sh` is allow-listed in `.claude/settings.json`
and is the only path that gets through. Do not try to work around a refusal;
see [the knowledge entry](../../../knowledge/the-auto-mode-classifier-refuses-guard-probes.md).

## What is already true, so you do not re-check it

- The IAM half is applied and verified. `Prod-db-read` allows `dsql:DbConnect`
  on the three cluster ARNs; `Explicit-write-deny` denies `dsql:*` everywhere
  else and every DSQL action but `DbConnect` on those three. Confirmed with
  `iam simulate-principal-policy` on 2026-10-27: allowed for pragma,
  last-loop-lepin and banana-rush, `explicitDeny` for talos, for
  `DbConnectAdmin` and for `DeleteCluster`.
- The production deploy of PR #199 ran green on all six applications, so
  `ai_reader_prod` exists on the three clusters.
- The script's own refusals are covered by unit tests and were exercised
  locally: talos, a locking read, and a blocklisted table named against the
  deployed template.

## What to do

Work on `claude/lessons-from-pr-199`, which carries PR #202's fail-closed
change to `db-read.ts`. Testing there covers both the feature and that change.

```bash
git fetch origin && git checkout claude/lessons-from-pr-199
```

Run each line and record what came back, verbatim.

```bash
APP=pragma scripts/db-read.sh "SELECT current_user"
APP=pragma scripts/db-read.sh "SELECT count(*) FROM member"
APP=last-loop-lepin scripts/db-read.sh "SELECT count(*) FROM editions"
APP=banana-rush scripts/db-read.sh "SELECT count(*) FROM game"
APP=talos scripts/db-read.sh "SELECT 1"
APP=pragma scripts/db-read.sh "SELECT 1 FROM member_credential"
APP=last-loop-lepin scripts/db-read.sh "SELECT 1 FROM admin_sessions"
APP=pragma scripts/db-read.sh "SELECT 1 FROM member FOR UPDATE"
```

Expected, in order:

| Line | Expected |
| --- | --- |
| 1 | `ai_reader_prod`. Anything else means the role mapping is not what the script thinks. |
| 2, 3, 4 | One number each. These are the three reads nobody has ever obtained. |
| 5 | Refused by the script, naming ADR-0039 and the talos agent API. |
| 6, 7 | Refused by the script, naming the table. pragma blocks ten tables, last-loop-lepin blocks `admin_credentials`, `admin_sessions` and `auth_attempts`. |
| 8 | Refused by the script, for naming `UPDATE`. |

## Reading a failure

- `FATAL: unable to accept connection, access denied` — the identity is wrong.
  Check `aws sts get-caller-identity` names `AI-Dev-ReadOnly`, not a role.
- `AccessDeniedException` naming an explicit deny — the IAM narrowing did not
  land, or a later edit put `dsql:*` back on `Resource: "*"`.
- `refused: the deployed stack carries no read-only reader` — PR #202's
  fail-closed check. It means the stack for that application has no reader in
  its deployed template, which should not be true after PR #199's deploy.
- A line that should be refused and is not — that is the finding worth the
  whole exercise. Stop and report it.

## Also worth probing, since you are the only session that can

`SELECT count(*) FROM member_credential` is refused by the script before any
connection. The database half of the rule, the `SELECT` grant that excludes
those tables, has therefore never been observed. There is no supported way to
ask for a blocklisted table past the script, and inventing one would be working
around a guard. Say so rather than reporting it as checked.

## When you are done

- Log friction as you hit it: `scripts/kaizen.sh --from cloud-verify "<one sentence>"`.
- Archive the log before the session ends, or it does not survive the container:
  `scripts/kaizen.sh archive meta/lessons-from-pr-199`, then commit it. PR #199
  skipped this step and its sweep had to rebuild sixteen rows from commits
  and CI.
- Replace the *Gap* paragraph in this folder's `inventory.md` row 09 with what
  actually came back, and say on PR #202 that the path is proven, with the
  output.
