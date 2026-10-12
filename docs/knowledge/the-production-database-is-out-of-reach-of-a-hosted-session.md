---
summary: 'A hosted session reads SSM, but the harness refuses the DSQL admin token as a production read; hand the query to a local session.'
triggers:
  commands:
    - 'dsql-shell\.sh'
    - 'generate-db-connect-admin-auth-token'
---

# The production database is out of reach of a hosted session

_Last verified: 2026-09-17, on claude.ai/code as `AI-Dev-ReadOnly`._

A hosted session can read most of AWS. It cannot open a production DSQL
database, and the refusal does not come from IAM.

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

## What to do instead

Write a handoff for a local Claude Code session, which runs with the
operator's own `borso-admin` SSO profile. PR #107's handoff carried:

- the exact command, `AWS_PROFILE=borso-admin APP=pragma STAGE=prod ./scripts/dsql-shell.sh`;
- the read to run first and the expected row count, so the local session
  stops and asks rather than guessing when the count is wrong;
- any write inside `BEGIN`, with the expected `UPDATE 1` and a `ROLLBACK`
  for anything else;
- what not to touch, and what to report back.

When the answer gates a merge, as it did here, say so in the pull
request's *Before merge* block. No check in CI can see a production table,
so a human owns that line.

## Related

- [`scripts/dsql-shell.sh`](../../scripts/dsql-shell.sh) now requires `APP`;
  see [`the-database-shell-that-opened-the-other-app.md`](../dantotsus/the-database-shell-that-opened-the-other-app.md).
- [`aws-dsql-cli-token-flag-name.md`](./aws-dsql-cli-token-flag-name.md) for the
  token command's flag.
