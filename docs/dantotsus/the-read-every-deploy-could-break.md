---
date: 2026-11-04
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#193'
fix-pr: none (the pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/database/client.ts, apps/pragma/api/src/helpers/persistence/conflict-abort.core.ts, apps/pragma/api/src/database/client.test.ts]
time-to-detect: days
tags: [dsql, pragma, deploy, concurrency, sentry]
zone: apps/pragma/api/src/database/client.ts
recurs: [a-merge-raced-its-own-preview-teardown]
---

# The read every deploy could break

## User impact

For a few minutes after each pragma deploy, a musician's screen or an assistant's tool call failed. These were requests that only read: the sign-in check, the shared secret, an assistant's token.

| | Seen | Expected |
| --- | --- | --- |
| Opening pragma during a deploy | The request answers 500, and the screen shows an error | The screen loads, perhaps a few milliseconds later |
| An assistant calling `POST /mcp` during a deploy | The tool call fails | The tool call answers |

Sentry recorded 15 events in four issues, measured on 2026-11-04: BORSOFR-1 (7), BORSOFR-6 (4), BORSOFR-8 (3) and BORSOFR-2 (1). Each one fell within minutes of a pragma merge. BORSOFR-6 came at 19:24 UTC on 2026-11-03, two minutes after `ccf12bda` merged. BORSOFR-8 ran from 00:04 to 00:34 UTC on 2026-11-04, across the deploys of `5ce372fd` and `001f2451`.

## Causal chain

- The musician sees an error instead of the screen.
  - Why? `requireMemberSession` threw on its first read, and Hono answered 500.
    - Why? DSQL refused `select ... from app_config` with `schema has been updated by another transaction (OC001)`, SQLSTATE `40001` (Sentry event `69326315`).
      - Why? The deploy's migration ran DDL on the cluster while the warm Lambda's session still held the old catalog.
      - Why was the refusal not retried? The client every repository reads through sent each statement once.

```ts
// apps/pragma/api/src/database/client.ts, before
cachedDatabase = drizzle(client, { schema }); // every statement runs once, read or write
```

`retryingConflictAborts` existed (`conflict-abort.core.ts`, PR #193), but each repository opted in around chosen writes. No read was ever wrapped, and neither were the transactions in `voting.repository.ts` and `mastery.repository.ts`.

## Root cause of occurrence

*Thought only two writers touching the same row can lose to DSQL, so only writes need a retry. Actually any statement can lose, a plain `SELECT` included, when its session cached the schema before a DDL that every deploy runs.*

[AWS, Concurrency control in Aurora DSQL](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-concurrency-control.html), read this session:

> **OC001 — Schema conflict.** The session's cached schema catalog is out of date. When Aurora DSQL detects that the catalog version has changed since the session loaded its cache, and the transaction can't safely rebase to the current version, the transaction receives the OC001 response. [...] Design your applications to implement retry logic to handle these responses.

The belief is written down. `docs/dantotsus/a-merge-raced-its-own-preview-teardown.md` says pragma's retry "runs DML, which cannot meet OC001". This entry corrects that sentence.

## Detection failure causes

- **Typing:** the retry was a function to call, not a property of the client. A repository that skipped it typechecked the same.
- **Local and CI:** the e2e suites run on plain Postgres, which never answers OC001. No suite runs a migration while requests are in flight.
- **Review:** the earlier dantotsu stated that DML cannot meet OC001. Nobody checked that against the AWS page.
- **Monitoring:** Sentry captured every event from 2026-10-30, but no alert fired. The operator found the issues by asking for a review on 2026-11-04.

## Countermeasure

The database client now retries every refused statement and every refused transaction, up to three attempts in total. It does this for OC000, OC001 and `40001`, matched on the code or on the `(OC00x)` in the message. The refused attempt committed nothing, so running it again is safe. A statement sent outside a transaction runs again by itself. A transaction runs again from its first statement, because one of its statements cannot be replayed alone.

Verified on local Postgres with a function that raises the OC001 message and SQLSTATE `40001` on its first call. `client.test.ts` passes for a single statement and for a transaction, which runs twice.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit on branch `claude/fervent-galileo-sqcfvh`, pull request to follow

```diff
-  cachedDatabase = drizzle(client, { schema });
+  cachedDatabase = drizzle(retryingConflictAbortsOf(client), { schema });
```

`getDatabase()` is the only way a repository reaches DSQL. Every statement and transaction now passes through `retryingConflictAbortsOf`, so no repository can send an unretried statement, whether it is a read, a write or a new file.

**Proof it can fail:** planted on a scratch copy by reverting the line above, then running `vitest run --project back-e2e api/src/database/client.test.ts`:

```text
 FAIL  |back-e2e| api/src/database/client.test.ts > a statement that loses to a deploy migration (back-e2e) > answers on its second run instead of failing the request
Caused by: PostgresError: schema has been updated by another transaction (OC001)
      Tests  1 failed (1)
```

**Similar instances:** found with the loop below, which counts `.transaction(` calls against retry calls per file. Nine repositories wrap their transaction in `retryingConflictAborts`. `voting.repository.ts` and `mastery.repository.ts` wrap nothing, and the client now covers both. The nine repositories' own wrappers are now redundant, and a conflict there can run up to nine attempts. That is harmless, because each attempt is immediate. Removing them is a cleanup that changes no behaviour.

```bash
for f in $(grep -rln "\.transaction(" apps/pragma/api/src --include=*.ts | grep -v test); do echo "$(grep -c '\.transaction(' $f) $(grep -c retryingConflictAborts $f) $f"; done
```

`last-loop-lepin` and `banana-rush` also run on DSQL. Their clients were not checked in this change.
