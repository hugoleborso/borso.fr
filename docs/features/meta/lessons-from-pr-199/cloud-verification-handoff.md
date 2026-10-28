# Handoff: prove the production read path from a hosted session

ADR-0044's read path has never been exercised end to end. PR #199 recorded that
as its validation gap, PR #202's sweep could not close it, and
[ADR-0049](../../../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md)
then replaced the transport because the gap turned out to be structural. This
is the brief for the session that can close it.

## What changed, and why a laptop still cannot do this

The first version of this handoff asked a hosted session to run
`scripts/db-read.sh` against port 5432. That cannot work: the sandbox a hosted
session runs in refuses outbound 5432, and Aurora DSQL has no HTTP data API to
fall back on. ADR-0049 moved the connection into a reader Lambda per
application. The script now invokes `<app>-prod-agent-reader` over
`lambda.eu-west-3.amazonaws.com`, which that sandbox does reach.

The identity constraint is unchanged and is still what makes a hosted session
the only place this runs. The database role `ai_reader_prod` is mapped to the
IAM user `AI-Dev-ReadOnly` and now also to each reader function's execution
role. A local session signs in through the `borso-admin` SSO profile, which is
neither, and the user's long-lived keys live in the claude.ai/code project
environment and nowhere else.

The auto mode classifier refuses an ad-hoc `psql` or a DSQL admin token as a
production action. `scripts/db-read.sh` is allow-listed in
`.claude/settings.json` and is the only path that gets through. Do not try to
work around a refusal; see
[the knowledge entry](../../../knowledge/the-auto-mode-classifier-refuses-guard-probes.md).

## What is already true, so you do not re-check it

- The IAM half of ADR-0044 is applied and verified. `Prod-db-read` allows
  `dsql:DbConnect` on the three cluster ARNs; `Explicit-write-deny` denies
  `dsql:*` everywhere else and every DSQL action but `DbConnect` on those three.
  Confirmed with `iam simulate-principal-policy` on 2026-10-27.
- ADR-0049's IAM half — `lambda:InvokeFunction` on the three function ARNs, and
  the matching narrowing of the blanket `lambda:Invoke*` deny — is in
  [`docs/aws-setup.md`](../../../aws-setup.md) §12.7. Check it was applied
  before concluding anything from an `AccessDeniedException`.
- The construct, the handler and the assessment ship with the infra suite at
  100% statement, branch, function and line coverage. Every refusal branch is
  covered by a unit test; none of that is evidence the live path works.

## What to do

Work on `main` once this has merged and the production deploy has run. The
reader function is created by that deploy, so there is nothing to verify before
it.

```bash
APP=pragma scripts/db-read.sh "SELECT 1"
APP=pragma scripts/db-read.sh "SELECT count(*) FROM member"
APP=last-loop-lepin scripts/db-read.sh "SELECT count(*) FROM editions"
APP=banana-rush scripts/db-read.sh "SELECT count(*) FROM game"
APP=talos scripts/db-read.sh "SELECT 1"
APP=pragma scripts/db-read.sh "SELECT 1 FROM member_credential"
APP=last-loop-lepin scripts/db-read.sh "SELECT 1 FROM admin_sessions"
APP=pragma scripts/db-read.sh "SELECT 1 FROM member FOR UPDATE"
```

Record what came back, verbatim. Expected, in order:

| Line | Expected |
| --- | --- |
| 1 | One row, and a line on stderr naming the function and `ai_reader_prod`. Anything else means the role mapping is not what the function thinks. |
| 2, 3, 4 | One number each. These are the three reads nobody has ever obtained. |
| 5 | Refused by the script, before any call, naming ADR-0039 and the talos agent API. |
| 6, 7 | Refused **by the function**, naming the table. pragma blocks ten tables, last-loop-lepin blocks `admin_credentials`, `admin_sessions` and `auth_attempts`. |
| 8 | Refused by the function, for naming `UPDATE`. |

Lines 6 to 8 are the ones worth the exercise: they are the first evidence that
the guard runs where ADR-0049 put it rather than where the caller is.

## Reading a failure

- `AccessDeniedException` on `lambda:InvokeFunction` — §12.7's deny narrowing
  was not applied, or the allow names a function ARN that does not match.
- `refused: the deployed stack carries no AgentReaderFunctionName output` — the
  production deploy of that application has not run since ADR-0049 landed.
- `the reader function failed with …` naming a missing environment variable —
  the construct and the handler disagree about a name. That is a defect, not a
  deployment gap.
- A Postgres authentication error inside the function's error message — the
  function's execution role is not mapped into `ai_reader_prod`, so
  `grantReaderConnect` did not reach the schema resource.
- A line that should be refused and is not — that is the finding worth the
  whole exercise. Stop and report it.

## Also worth probing, since you are the only session that can

`SELECT count(*) FROM member_credential` is refused by the function before it
connects. The database half of the rule, the `SELECT` grant that excludes those
tables, has therefore still never been observed. There is no supported way to
ask for a blocklisted table past the function, and inventing one would be
working around a guard. Say so rather than reporting it as checked.

## When you are done

- Log friction as you hit it: `scripts/kaizen.sh --from cloud-verify "<one sentence>"`.
- Archive the log before the session ends, or it does not survive the container:
  `scripts/kaizen.sh archive meta/lessons-from-pr-199`, then commit it. PR #199
  skipped this step and its sweep had to rebuild sixteen rows from commits
  and CI.
- Replace the *Gap* paragraph in this folder's `inventory.md` row 09 with what
  actually came back, and say so on the pull request, with the output.
