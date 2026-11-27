---
date: 2026-06-05
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#26'
fix-commits: [8776ee26d6]
eradication-level: 2
eradication-paths: [scripts/check-migration-sql-dsql-compat.sh, docs/knowledge/dsql-postgres-compat-gaps.md]
tags: [dsql, postgres, drizzle, ddl, deploy]
zone: apps/pragma/api/src/database/migrations
recurs: [dsql-alter-table-only-add-column]
---

# A `jsonb` column sailed through local Postgres and blew up at the DSQL migration

## User impact

Pragma's round-2 preview never came up, so the operator had nothing to validate.

| | Seen | Expected |
| --- | --- | --- |
| First preview deploy of PR #26 | `AppDbSchema CREATE_FAILED … Message returned: datatype jsonb not supported`. `pragma-pr-26` sat in `ROLLBACK_COMPLETE` through six rounds of orchestration | The preview deploys and serves the new schema |
| Every local gate on the same branch | Green | Green |

## Causal chain

- The preview stack failed at the migration custom resource with `datatype jsonb not supported`.
  - Aurora DSQL has no `jsonb` type. It supports `text` and `json` only ([compat-gaps §1](../knowledge/dsql-postgres-compat-gaps.md)).
    - Pragma's schema declared `jsonb` on six columns across `songs`, `setlists` and `sessions`, and the migration SQL generated from it carried the type.
      - Commit `8be0e6216` (2026-05-19, "drizzle schema for catalog / sessions / setlist / bars / auth", written by an agent) used Drizzle's `jsonb()` builder from `drizzle-orm/pg-core`, the idiomatic Postgres JSON column.
        - `docs/knowledge/dsql-postgres-compat-gaps.md` already named the gap in its §1 at the parent commit, and `last-loop-lepin` already stored JSON as `text`. `CLAUDE.md` at the parent never named that entry, and no hook printed it when a schema file was written (`git show 8be0e6216^:CLAUDE.md`).
  - Branch for the merge. The back-e2e suite runs against a real local Postgres, which supports `jsonb`, so every test passed.

## Root cause of occurrence

*Thought DSQL accepts every Postgres column type Drizzle offers, actually DSQL has no `jsonb`, and JSON goes in a `text` column parsed at read.* (Material)

The document that held the answer existed and was absent from the agent's context when it wrote the schema. One more why lands on Machine. `drizzle-orm/pg-core` offers `jsonb()` as an ordinary builder, and nothing in the repository refused importing it in an app that deploys to DSQL.

## Detection failure causes

- **Typing:** Drizzle types `jsonb()` as valid, because it is valid Postgres.
- **Pre-deploy DDL lint:** `scripts/check-migration-sql-dsql-compat.sh` existed and ran in pre-commit and CI. It is a deny-list of forms met so far (`ALTER TABLE`, `ADD CONSTRAINT`, `DROP COLUMN`, after [dsql-alter-table-only-add-column](dsql-alter-table-only-add-column.md)), so a type nobody had met yet passed it.
- **CI tests:** back-e2e ran on local Postgres, whose DDL surface is a superset of DSQL's ([local-postgres-without-docker](../knowledge/local-postgres-without-docker.md)).
- **CloudFormation:** caught it at deploy, the most expensive place.

## Countermeasure

The schema was rewritten to `text`, with `JSON.stringify` at insert and `JSON.parse` plus zod validation at read, as `last-loop-lepin` does.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `8776ee26d` ("fix(ci): flag jsonb columns in the DSQL migration DDL lint").

```diff
+ if echo "$stripped" | grep -qE -i '\bjsonb\b'; then
+   violations+=("$file: jsonb is not supported by DSQL — use \`text\` and JSON.stringify at insert / JSON.parse + zod-validate at read ...")
+ fi
```

**Proof it can fail:** the rule fired on a `jsonb DEFAULT '[]'` probe migration and stayed clean against the repository's jsonb-free migrations.

Since then, `dsql-postgres-compat-gaps.md` carries `triggers:` on `apps/*/api/src/database/migrations/*.sql` and on the output `datatype \w+ not supported`, so the gap reaches the agent when it writes a migration. It does not fire on a `*.schema.ts` file, where the type is chosen.

The class is not eradicated. The lint refuses `jsonb` and each form already met, one entry per incident. The next DSQL-unsupported type passes it until a deploy fails.

**Proposed:** turn the migration lint into an allow-list of the column types DSQL supports, so an unlisted type is refused before anyone meets it at deploy. And refuse importing `jsonb` from `drizzle-orm/pg-core` in `apps/*/api` with `no-restricted-imports` and `importNames`, a rule `.oxlintrc.json` already uses this way for `buttonVariants`. The type would then be refused in the schema file, before any migration exists.

**Similar instances:** the `CREATE INDEX ASYNC` gap (compat-gaps §11) surfaced the same way and is handled structurally by the migration runner's `asyncifyIndex` rewrite. `grep -rn jsonb apps/*/api/src --include=*.ts` finds no `jsonb` column on 2026-11-27, only a blueprint note in `songs.repository.ts` that says DSQL forces text.
