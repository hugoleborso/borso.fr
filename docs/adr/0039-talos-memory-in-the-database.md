# ADR-0039: The talos memory moves into the database, behind an agent API

- **Status:** accepted
- **Date:** 2026-10-16
- **Deciders:** Hugo Borsoni
- **Tags:** talos, data, security, api

## Context

The talos memory (people, organisations, projects, facts, relations, sources, commitments, todos, proposals, drafts, journal) lives today as markdown files in a private git repository. The scheduled agent runs read and write those files, and the progressive web app reads and writes them through the GitHub contents API ([`apps/talos/CONTRAT.md`](../../apps/talos/CONTRAT.md)). Three costs come with it: every agent run clones and parses the whole repository before it can answer one question, two runs writing at once conflict on files, and the graph questions (who is linked to whom at a date) are answered by re-reading every page.

The talos app already owns an Aurora DSQL cluster and a `prod` stage schema for its passkeys and sessions, and its API Lambda connects as that stage's own role ([ADR-0036](./0036-one-database-role-per-stage-schema.md)). The owner asked for the memory to move there, with a frozen contract shared by every lot of the migration: [`apps/talos/MEMORY-CONTRACT.md`](../../apps/talos/MEMORY-CONTRACT.md).

## Decision

**The memory moves from the private git repository to `memory_*` tables in the talos `prod` schema, migrated by drizzle like the authentication tables, and the agents reach it through `/api/agent/*` with one bearer token per environment.** Git stayed the truth until the `cutover` key of `memory_state` read `"database"`; the importer filled the tables before that, and the PWA switched on the flag (see the amendment below).

- **Tables.** Seventeen tables, one per noun of the contract, prefixed `memory_`. Every column the contract types `jsonb` is `text` holding JSON, because DSQL refuses `jsonb` as a column type ([`dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §1). The HTTP shape is unchanged: the API decodes the text before answering.
- **Tokens.** Three new SecureStrings, `/talos/agent-token-lecture`, `/talos/agent-token-build` and `/talos/agent-token-mac`, compared in constant time; the matching name is recorded on every event. The Lambda already reads `/talos/*`, so no infrastructure change is needed. The parameter cache of the Lambda now expires after five minutes, for every talos secret, so a rotated token takes effect without a deploy.
- **Read-only SQL.** `POST /api/agent/sql` accepts one `SELECT` or `WITH` statement, refuses the write and session keywords outside literals and comments, wraps the statement in `SELECT * FROM (…) LIMIT 501`, and runs it in a transaction opened with `BEGIN READ ONLY`. A separate read-only DSQL role was rejected (see below).
- **Writes.** Every write goes through `POST /api/agent/changes`: Zod validation of every operation before any write, a secret guard, idempotency by key, chunks of at most 2,500 estimated rows and 8 MiB, three attempts on SQLSTATE `40001`, and one `memory_event` row per operation in the same transaction. No memory repository issues a `DELETE`.

## Amendment, 2026-10-28: the git storage mode is removed

The cutover happened on 2026-10-16 (`memory_state.cutover = "database"`). The private repository has held no data since, and its GitHub token was revoked and `/talos/github-token` deleted. The PWA's git path (the GitHub content store, the per-slice git branches and the per-request `cutover` read) is therefore removed: every content route reads and writes the memory tables, and setting `cutover` back to `git` is no longer a rollback. `/api/agent/status` still reports the `cutover` state for information.

## DSQL facts this relies on

Read on 2026-10-16 against the talos cluster with the `borso-admin` profile, read-only statements only:

- The engine reports PostgreSQL 16, and the `prod` schema holds no `memory_*` table yet.
- `BEGIN READ ONLY` (and `BEGIN TRANSACTION READ ONLY`) is accepted. `SET TRANSACTION READ ONLY` is refused (`setting configuration parameter "TRANSACTION" not supported`), so the read-only mode has to ride on the `BEGIN`. drizzle's transaction config issues `SET TRANSACTION`, which is why the SQL route opens its transaction through the postgres-js client directly.
- `SET LOCAL statement_timeout` is refused (`setting configuration parameter "statement_timeout" not supported`). The ten-second limit is therefore a client-side cancel of the running query.
- `jsonb` and `json` work as runtime types (`'{"a":1}'::jsonb ->> 'a'`), only not as column types.
- `unaccent` does not exist, and `lower()` leaves `É` and `Ç` as they are. Search therefore folds accents with `translate(lower(column), <accented letters>, <plain letters>)` and compares with `LIKE` against a pattern folded the same way in the API.
- `ILIKE` and `gen_random_uuid()` work.

That a write is refused inside `BEGIN READ ONLY` on DSQL was not checked against the cluster, because the probe would have been a write; the local Postgres refuses it with SQLSTATE `25006`, and a test holds that.

## Consequences

- `+` An agent answers a question with one HTTP call instead of a clone and a parse, and the graph questions become queries.
- `+` Two runs writing at once no longer conflict on a file; DSQL's optimistic concurrency retries the loser, and idempotency keys make a retried call safe.
- `+` Every write is attributed: actor, token, run and before and after values, in `memory_event`, which becomes the log the context route serves.
- `-` The keyword guard of the SQL route is a deny list. A function it does not name could still run inside the read-only transaction; the stage role ([ADR-0036](./0036-one-database-role-per-stage-schema.md)) bounds what such a function can reach to the talos schema.
- `-` JSON lives in text columns, so SQL over attributes needs a cast (`attributes::jsonb ->> 'type'`) and nothing validates the JSON at the database level.
- `-` A call too large for one transaction is applied chunk by chunk; when a later chunk fails, the earlier ones stay committed and the stored response says which. A retry of the same key replays that partial answer rather than finishing the work, so the client sends the rest under a new key.
- `~` The focus keeps three rows, ranks 1 to 3; a rank the new focus leaves empty is written with an empty title rather than deleted, because no memory repository issues a `DELETE`.

## Alternatives considered

### Option A — Keyword guard plus a `READ ONLY` transaction on the stage role (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - No new database role, no new IAM mapping, no change to the migration runner or to `infra/cdk`.
  - Two independent barriers: a statement that passes the guard still cannot write.
- **Costs:**
  - The guard is a deny list and has to be kept current.
- **Rationale:** The API already runs as a role confined to the talos schema, so the residual risk is a read of that schema, which the tokens already allow.

### Option B — A second, read-only DSQL role per stage (rejected)

- **Summary:** The migration runner creates a `<stage>_reader` role with `SELECT` grants only, maps it to the same Lambda, and the SQL route signs a second connection as that role.
- **Strengths:**
  - The database itself refuses every write, whatever the statement.
- **Costs:**
  - A second `AWS IAM GRANT` per stage, a second connection pool in the Lambda, and changes in `DsqlSchema`, the runner and `LambdaApi`, all under the 100 % coverage gate of `infra/cdk`.
- **Rejection rationale:** It loses on cost for a route only the owner's own agents call. It would win if the SQL route were ever opened to a token the owner does not control.

### Option C — Keep the memory in git and add a read cache (rejected)

- **Summary:** Leave the files as the truth and index them in the database after each push.
- **Strengths:**
  - No migration of the writers.
- **Costs:**
  - Two copies that can disagree, and the write conflicts between runs stay.
- **Rejection rationale:** It loses on the conflicts, which are half of the reason for the change.
