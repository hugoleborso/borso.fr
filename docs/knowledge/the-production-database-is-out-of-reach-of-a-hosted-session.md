---
summary: 'A hosted session reads the prod schema of pragma, last-loop-lepin and banana-rush only through scripts/db-read.sh, as a SELECT-only role that cannot see credential, key or token tables; talos goes through its agent API, the admin token stays refused, and every other stage or write goes to a local session.'
triggers:
  commands:
    - 'dsql-shell\.sh'
    - 'generate-db-connect-admin-auth-token'
    - 'generate-db-connect-auth-token'
    - 'db-read\.sh'
    - 'db:read'
  output:
    - 'which the reader cannot read'
---

# The production database is out of reach of a hosted session, except through one read path

_Last verified: 2026-09-17, on claude.ai/code as `AI-Dev-ReadOnly`, for the admin token.
The read path below was written on 2026-10-25 and had not run end to end when this was
written, because it needs each application's production deploy and the manual IAM step first._

A hosted session can read most of AWS. It cannot open a production DSQL
database as `admin`, and the refusal does not come from IAM.

## What happened

During PR #107 a member had forgotten their pragma password, and the
question was whether every member still held a credential before enrolment
was deleted. Answering it takes one `SELECT` on the `prod` schema.

- `aws ssm get-parameter --name /borso/pragma/dsql-cluster-endpoint` worked
  and returned the endpoint.
- `aws dsql generate-db-connect-admin-auth-token --hostname <endpoint>` never
  ran: the harness's auto-mode classifier refused the call as a
  **production read**, before the AWS CLI was invoked. IAM was never asked.

So the line "reads work" in [`what-a-hosted-session-cannot-do-on-github.md`](./what-a-hosted-session-cannot-do-on-github.md)
is true of the AWS API and false of the data behind it. A token for the
database is a key to every row, and the harness treats minting one as
reading them.

## The read path for pragma, last-loop-lepin and banana-rush `prod`

[ADR-0044](../adr/0044-read-only-production-database-access-for-agents.md)
added one path, for the `prod` schema of pragma, last-loop-lepin and banana-rush:

```bash
scripts/db-read.sh "SELECT count(*) FROM member"                      # pragma, the default
APP=last-loop-lepin scripts/db-read.sh "SELECT count(*) FROM runners"
APP=banana-rush scripts/db-read.sh "SELECT count(*) FROM game"
```

- It signs in as `ai_reader_prod`, a database role that holds `SELECT` on
  the `prod` schema and nothing else, one per application's cluster.
- It cannot read the tables that hold credentials, keys or tokens, such as
  pragma's `app_config` and `vapid_key_pair` or last-loop-lepin's
  `admin_sessions`. The script refuses a query naming one, using the list in
  the deployed stack's template, and the database refuses it anyway with
  `permission denied for table`. ADR-0044 lists them per application; a
  migration that adds a secret-bearing table should add it to the
  application's reader blocklist in `cdk/lib/stack.ts`. `AI-Dev-ReadOnly` may connect as that
  role (`dsql:DbConnect`) and never as `admin`.
- It accepts one `SELECT` or `WITH … SELECT` statement, refuses write,
  session and transaction keywords outside literals and comments, runs
  inside `BEGIN READ ONLY … ROLLBACK`, returns at most 200 rows and cancels
  after 30 seconds.
- `.claude/settings.json` allows `Bash(scripts/db-read.sh *)`, so the
  classifier does not see the call. Call the shell path, not
  `pnpm run db:read`: auto mode may drop an allow rule for a package-manager
  run. A session started before that rule reached `main` does not have it.
- Pass the statement in double quotes, with no `$` and no backtick in it,
  so the shell substitutes nothing.
- Results land in the transcript. Select the columns the question needs,
  not `*` on a table that holds e-mail addresses, phone numbers or calendar
  addresses.

It needs two things that only the operator can do: each application's
production deploy, which creates its role, and the IAM change in
[`aws-setup.md` §12.7](../aws-setup.md#127-let-a-session-read-production).
An `AccessDeniedException` naming an explicit deny means the IAM change is
not applied. A Postgres authentication error means the role or its mapping
is not there yet.

## talos: its own agent API

`APP=talos` is refused by the script, and the IAM grant does not name its
cluster. Its data is private. Agents read it through `POST /api/agent/sql`
with an agent token ([ADR-0039](../adr/0039-talos-memory-in-the-database.md)).

## Everything else: hand the query to a local session

borso-fr and borsouvertures have no database. Any preview, and any write, still need a local Claude
Code session running with the operator's own `borso-admin` SSO profile.
PR #107's handoff carried:

- the exact command, `AWS_PROFILE=borso-admin APP=pragma STAGE=prod ./scripts/dsql-shell.sh`;
- the read to run first and the expected row count, so the local session
  stops and asks rather than guessing when the count is wrong;
- any write inside `BEGIN`, with the expected `UPDATE 1` and a `ROLLBACK`
  for anything else;
- what not to touch, and what to report back.

When the answer gates a merge, as it did here, say so in the pull
request's *Before merge* block. No check in CI can see a production table,
so a human or the read path above owns that line.

## Related

- [`scripts/dsql-shell.sh`](../../scripts/dsql-shell.sh) now requires `APP`;
  see [`the-database-shell-that-opened-the-other-app.md`](../dantotsus/the-database-shell-that-opened-the-other-app.md).
- [`aws-dsql-cli-token-flag-name.md`](./aws-dsql-cli-token-flag-name.md) for the
  token command's flag.
