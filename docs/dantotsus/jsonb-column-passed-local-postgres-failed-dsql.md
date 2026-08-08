---
date: 2026-06-05
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#26'
fix-pr: '#30'
fix-commits: [8776ee2]
eradication-level: 2
tags: [dsql, postgres, drizzle, ddl, deploy]
---

# A `jsonb` column sailed through local Postgres and blew up at the DSQL migration

## Symptom

Pragma's round-2 schema declared `jsonb` on six columns across
`songs` / `setlists` / `sessions`. Every local gate passed. The first
preview deploy failed at the CloudFormation migration custom resource:

```
AppDbSchema  CREATE_FAILED
Received response status [FAILED] from custom resource.
Message returned: datatype jsonb not supported
```

`pragma-pr-26` sat in `ROLLBACK_COMPLETE` through six rounds of
orchestration before the schema was rewritten to `text`.

## Root-cause chain

1. **Why did `jsonb` ship?** The implementer authored a normal Drizzle
   schema; `jsonb` is the idiomatic Postgres JSON column.
2. **Why wasn't it caught locally?** The back-e2e suite runs against a
   real local Postgres, which supports `jsonb` natively — every test
   passed.
3. **Why did DSQL reject it?** Aurora DSQL's serverless storage layer
   has no `jsonb` backing; it supports `text` / `json` only
   (compat-gaps §1). The canonical adaptation — `text` + JSON.stringify
   at insert + JSON.parse + zod-validate at read — was already
   documented and demonstrated in `last-loop-lepin`, but nothing forced
   the implementer to apply it.
4. **Why didn't the pre-deploy DDL lint catch it?** A migration-DDL
   compatibility linter (`scripts/check-migration-sql-dsql-compat.sh`,
   wired into pre-commit + CI) already existed — but it only covered
   `ALTER TABLE` / `ADD CONSTRAINT` / `DROP COLUMN` forms. `jsonb`
   column _declarations_ weren't in its rule set.

**Root cause:** thought "the back-e2e suite proves the schema deploys",
actually it proves the schema runs on _local Postgres_, whose DDL
surface is a superset of DSQL's — the only gate that speaks DSQL is the
DDL lint, and it had a `jsonb`-shaped hole.

## Detection failure causes

- **Typing:** Drizzle types `jsonb()` as valid; it _is_ valid Postgres.
- **CI (tests / build):** back-e2e ran on local Postgres, which accepts
  `jsonb` — green.
- **Pre-deploy DDL lint:** existed and was enforced, but its rule set
  predated this column type; `jsonb` declarations weren't scanned.
- **CFN:** caught it, but at deploy time — the most expensive place,
  after a six-round latency.

## Countermeasure

- **Code:** extend the DDL lint to flag any `\bjsonb\b` token in a
  migration SQL file, with a message pointing at the `text`-column
  adaptation and the `last-loop-lepin` reference implementation.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit + CI lint rule)

**Reference:** [PR #30](https://github.com/hugoleborso/borso.fr/pull/30) · commit `fix(ci): DSQL DDL lint flags jsonb columns`

**The actual fix:**

```diff
+ # jsonb column type — anywhere (CREATE TABLE column list or ADD COLUMN).
+ # DSQL has no jsonb backing; CREATE TABLE fails at deploy with
+ # "datatype jsonb not supported" (compat-gaps §1).
+ if echo "$stripped" | grep -qE -i '\bjsonb\b'; then
+   violations+=("$file: jsonb is not supported by DSQL — use \`text\` and JSON.stringify at insert / JSON.parse + zod-validate at read ...")
+ fi
```

Verified: the rule fires on a `jsonb DEFAULT '[]'` probe migration and
stays clean against the repo's current (jsonb-free) migrations. The
sibling DSQL gap from the same run — `CREATE INDEX` needing `ASYNC` — is
handled structurally instead, by the migration runner's `asyncifyIndex`
rewrite, so it needs no lint rule.

**Sibling defects swept:** the `CREATE INDEX ASYNC` gap (compat-gaps
§11) surfaced the same way (local Postgres accepted it, DSQL rejected
it) and was eradicated at the runner level during the original PR.

## See also

- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) — §1 (jsonb), §11 (CREATE INDEX ASYNC).
- [`dsql-alter-table-only-add-column.md`](./dsql-alter-table-only-add-column.md) — the ALTER-TABLE gaps the lint already covered.
- [`docs/knowledge/local-postgres-without-docker.md`](../knowledge/local-postgres-without-docker.md) — why the test DB is real Postgres, and what that does _not_ prove.
