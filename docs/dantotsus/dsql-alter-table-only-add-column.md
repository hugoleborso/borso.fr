---
date: 2026-05-15
introduced-at: implementation
detected-at: operator-deploy
severity: high
related-pr: '#23'
fix-commits: [c5eb3e0b3d]
eradication-level: 2
eradication-paths: [scripts/check-migration-sql-dsql-compat.sh, scripts/check-migration-sql-dsql-compat.test.ts]
time-to-detect: hours
tags: [dsql, postgres, drizzle, ddl, deploy]
zone: apps/last-loop-lepin/api/src/database/migrations
prior-fix-commits: [20bbed6, 0d4fc0e, dd47f3b]
---

# DSQL's ALTER TABLE surface is far narrower than Postgres, and the local Postgres hides it

## User impact

The PR #23 preview of last-loop-lepin, runners punching their own loop
end, failed to deploy three times in a row on the migration runner. Each
attempt cost a deploy and a rollback, 15 to 20 minutes (reported by the
operator, who watched the CloudFormation events).

| | Seen | Expected |
| --- | --- | --- |
| Attempt 1 | `ALTER TABLE ADD COLUMN with constraint not supported` | the migration applies |
| Attempt 2 | `unsupported ALTER TABLE ALTER COLUMN ... SET NOT NULL statement` | the migration applies |
| Attempt 3 | `column "source" of relation "loop_punches" already exists` | the migration applies |

## Causal chain

- The preview's migration runner failed on `0001_self_punch_columns.sql`.
  - DSQL refused the statement. Its `ADD COLUMN` action takes a name and a type and no constraint clause ([AWS ALTER TABLE support](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html)).

    ```sql
    -- 0001_self_punch_columns.sql at 8ad75cc88
    ALTER TABLE "loop_punches" ADD COLUMN "source" text DEFAULT 'admin' NOT NULL;
    ```

    - Commit 8ad75cc88 (2026-05-15) shipped it after a dry-run on local Postgres: "Dry-run on local Postgres confirmed the single-statement ADD COLUMN".
      - The plan named the risk and the check. `plan.md` row R-DSQL: the statement "peut être rejeté par DSQL (la doc `dsql-postgres-compat-gaps.md` ne le couvre pas)" (may be rejected by DSQL, the compat doc does not cover it). Its mitigation was a local dry-run, with a fallback of `ADD COLUMN nullable → UPDATE → ALTER COLUMN SET NOT NULL`.
        - Local Postgres accepts every form DSQL refuses, so the dry-run passed.
  - Attempt 2 shipped the plan's fallback (20bbed6). DSQL has no `ALTER COLUMN … SET NOT NULL` or `SET DEFAULT` action either.
  - Attempt 3 met the `source` column that attempt 1 had already added. The DSQL schema lives in a cluster shared across stacks, so a stack rollback does not remove it.

## Root cause of occurrence

*Thought a dry-run on local Postgres answers whether DSQL accepts a
migration, actually local Postgres accepts a superset of DSQL's DDL, and
DSQL's `ALTER TABLE` accepts only a bare `ADD COLUMN <name> <type>` after
creation.*

Tag: **Material** (agentic rule). The plan handed to the implementer named
the local dry-run as the check and carried a fallback DSQL also refuses.
The compat doc in its context did not cover `ALTER TABLE`, as the plan
itself says. The Machine condition under it: every local and CI run uses
an engine that accepts more than DSQL.

## Detection failure causes

- **drizzle-kit:** it emits what the schema declares, so `.notNull().default('admin')` becomes `DEFAULT 'admin' NOT NULL`. It knows nothing of DSQL.
- **Local and CI tests:** the back-e2e suite runs on the same local Postgres, which accepts every refused form. No DSQL runs in CI.
- **Review:** the migration header mentioned R-DSQL, so it read as handled.
- **Deploy:** a custom-resource failure surfaces only in CloudFormation events, one 15-minute round trip per attempt.

## Countermeasure

Three commits in PR #23. 0d4fc0e dropped `.notNull().default()` from the
Drizzle schema, so `source` stays nullable and `narrowPunchSource` holds
the invariant in the app. dd47f3b wrote `ADD COLUMN IF NOT EXISTS` into
the SQL file, so a retry after a partial apply is a no-op.
`docs/knowledge/dsql-postgres-compat-gaps.md` §10 now lists the refused
`ALTER TABLE` actions with the AWS reference.

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit [`c5eb3e0b3d`](https://github.com/hugoleborso/borso.fr/commit/c5eb3e0b3d)
added `scripts/check-migration-sql-dsql-compat.sh`. `.husky/pre-commit:259`
runs it on staged migrations and `.github/workflows/ci.yml:81` on all of
them. `scripts/check-migration-sql-dsql-compat.test.ts` tests it. No
library checks drizzle output against DSQL (squawk, atlas and
aurora-dsql-connectors were read when the entry was written; none has DSQL
DDL rules).

```bash
if echo "$stripped" | grep -qE -i 'ADD[[:space:]]+COLUMN[[:space:]]+[^,;]*NOT[[:space:]]+NULL'; then
```

What holds today has a gap. The script is a deny-list of forms it has
already met: `ADD COLUMN … NOT NULL`, `ADD COLUMN … DEFAULT`, `ALTER COLUMN
… SET/DROP NOT NULL`, `SET/DROP DEFAULT`, `TYPE`, `ADD CONSTRAINT` except
`UNIQUE USING INDEX`, `DROP COLUMN`, and `jsonb`. A form nobody has met yet
passes. It already happened once:
[`jsonb-column-passed-local-postgres-failed-dsql`](./jsonb-column-passed-local-postgres-failed-dsql.md)
(2026-06-05) reached a deploy, and `jsonb` joined the list only then in
8776ee26d.

**Proof it can fail:** `scripts/check-migration-sql-dsql-compat.test.ts`
plants each form and expects the refusal. Not rerun for this rewrite.

**Proposed:** turn the deny-list into an allow-list. The script would
accept only the statement shapes DSQL documents: `CREATE TABLE` with
supported types, `CREATE INDEX ASYNC`, bare `ADD COLUMN [IF NOT EXISTS]
<name> <type>`, and the few other documented actions. It would refuse
anything else. A form not proven accepted, such as the next `jsonb`, would
then fail at commit by default, instead of after a deploy.

**Similar instances:** the script scans every
`apps/*/api/src/database/migrations/*.sql`, so each new DSQL app is
covered without wiring.
