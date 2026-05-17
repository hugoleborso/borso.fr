---
date: 2026-05-15
introduced-at: implementation
detected-at: operator-deploy
severity: high
related-pr: 23
fix-pr: this PR (branch `claude/lessons-from-pr-23`)
fix-commits: [<pending — pushed in this kaizen PR>]
prior-fix-commits: [20bbed6, 0d4fc0e, dd47f3b]
eradication-level: 2
time-to-detect: hours
tags: [dsql, postgres, drizzle, ddl, deploy]
---

# DSQL's ALTER TABLE surface is far narrower than Postgres — and the local Postgres hides it

## Symptom

Preview deploy of PR #23 failed three times in a row, each time on
the same custom-resource migration runner:

1. *« ALTER TABLE ADD COLUMN with constraint not supported »* on the
   compact `ADD COLUMN "source" text DEFAULT 'admin' NOT NULL`.
2. *« unsupported ALTER TABLE ALTER COLUMN ... SET NOT NULL
   statement »* on the canonical fallback (`ADD COLUMN nullable
   → UPDATE backfill → ALTER COLUMN SET NOT NULL → ALTER COLUMN SET
   DEFAULT`).
3. *« column "source" of relation "loop_punches" already exists »*
   on the re-deploy, because the DSQL schema is a logical schema in
   a shared cluster and CFN's `DELETE_COMPLETE` doesn't wipe it —
   the partial state from attempt 1 survived.

Each iteration burnt 15-20 minutes of deploy + rollback.

## Root-cause chain

1. **Why did DSQL refuse the compact `ADD COLUMN … NOT NULL DEFAULT`
   form?** It's not in the DSQL ALTER TABLE grammar. The
   [AWS doc](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html)
   enumerates exactly which `action` clauses are accepted; the
   `ADD COLUMN` action has signature `ADD [COLUMN] [IF NOT EXISTS]
   column_name data_type [STORAGE ...]` — **no constraint clauses
   at all**.
2. **Why did the canonical fallback fail too?** Same doc: there is
   no `ALTER COLUMN ... SET NOT NULL` action, no `ALTER COLUMN ...
   SET DEFAULT` either. The only `ALTER COLUMN` actions DSQL accepts
   are `SET STORAGE`, the four GENERATED variants, and `DROP
   IDENTITY`. Post-creation, the column's nullability / default /
   type are *all immutable*.
3. **Why did the implementer ship the buggy migration despite the
   risk being named in `plan.md` (R-DSQL)?** The plan said *"if
   DSQL rejects, fall back to the 3-statement form"*. The implementer
   tested the compact form locally on `pnpm dev`'s Postgres — which
   accepted it without complaint — and concluded *"the dry-run gate
   accepted it, ship the compact form"*. The dry-run gate was on
   the wrong engine.
4. **Why didn't the back-e2e suite catch the difference?** Because
   it runs against the same local Postgres. DSQL was never in the
   loop until preview deploy.
5. **Why did the re-deploy fail with "column already exists"?** The
   partial DSQL state from attempt 1 left `source` column already
   on `loop_punches`. The migration runner Lambda has a
   `makeIdempotent` rewrite that injects `IF NOT EXISTS`, but the
   bundle in question apparently didn't pick it up (CDK cached an
   older `dist/`?), or the rewrite missed something in the path.
   The cleanest path was to write `IF NOT EXISTS` *directly into
   the migration SQL file* so the file is self-evidently safe.

**Root cause:** *thought DSQL's post-creation ALTER TABLE surface
mirrored Postgres's; actually DSQL only accepts plain `ADD COLUMN
<name> <type>` post-creation — no constraint, no default, and no
subsequent ALTER COLUMN can patch those in. The team's mental model
needs to be `CREATE TABLE` for everything, `ADD COLUMN <type>` (no
constraints) for additions, app-level invariants for the rest.*

## Detection failure causes

- **Typing / drizzle-kit:** `drizzle-kit generate` emits whatever
  the schema declares — `.notNull().default('admin')` becomes
  `NOT NULL DEFAULT 'admin'` in the SQL. drizzle-kit has no DSQL
  awareness.
- **Linter / static analysis:** None — Biome doesn't introspect SQL.
- **Functional validation locally:** `pnpm run db:local:wipe &&
  pnpm test` runs against `pnpm dev`'s Postgres, which accepts every
  banned form. The CREATE-then-ADD path also masks the
  "non-empty-table" subtlety because the back-e2e starts from an
  empty table.
- **CI:** No DSQL is wired into CI today (cost / boot time). Only
  preview deploys exercise DSQL.
- **Code review:** The migration file *was* commented to mention
  R-DSQL, but the bundling of NOT NULL DEFAULT was missed.
- **Production monitoring:** Custom-resource failures are surfaced
  via CloudFormation events; the operator caught them in real
  time, but that's a 15-minute round-trip per attempt.

## Countermeasure

The migration was rewritten in PR #23 over three commits (one per
DSQL revelation):

- `20bbed6` — split the compact `ADD COLUMN ... NOT NULL DEFAULT`
  into ADD + UPDATE + SET NOT NULL + SET DEFAULT (still wrong).
- `0d4fc0e` — drop the `.notNull().default()` from the drizzle
  schema entirely; the `source` column is now nullable forever, the
  app layer guarantees the invariant via `narrowPunchSource`.
- `dd47f3b` — write `ADD COLUMN IF NOT EXISTS` *into the SQL file
  itself* so a re-deploy after a partial-state survival is a no-op.

The knowledge entry
[`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md)
§10 was rewritten with the AWS reference and the exhaustive list of
rejected `action` clauses.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit hook + CI gate, paired
with the existing knowledge entry).

**Reference:** this kaizen PR ·
[`scripts/check-migration-sql-dsql-compat.sh`](../../scripts/check-migration-sql-dsql-compat.sh) ·
wired into `.husky/pre-commit` and `.github/workflows/ci.yml`.

**The actual fix:**

```bash
# .husky/pre-commit (excerpt)
if echo "$changed" | grep -q 'api/src/database/migrations/.*\.sql$'; then
  echo "[pre-commit] migration SQL changed — running DSQL-compat check"
  ./scripts/check-migration-sql-dsql-compat.sh
fi
```

The script greps every `apps/*/api/src/database/migrations/*.sql`
for the seven banned forms (`ADD COLUMN ... NOT NULL`, `ADD COLUMN
... DEFAULT`, `ALTER COLUMN ... SET/DROP NOT NULL`, `ALTER COLUMN
... SET/DROP DEFAULT`, `ALTER COLUMN ... TYPE`, `ADD CONSTRAINT`
(except UNIQUE-USING-INDEX), `DROP COLUMN`). SQL comments are
stripped before scanning so a documentation comment can mention the
trap without false-positive.

```diff
+ # DSQL-compat scan on every migration SQL file. Mirrors the
+ # pre-commit hook so a bypass via `git push --no-verify` still
+ # gets caught before merge.
+ - run: ./scripts/check-migration-sql-dsql-compat.sh
```

If a future drizzle-kit emits one of the banned forms (e.g. someone
adds `.notNull()` to a new column in an existing table), the commit
is rejected with a message pointing at the §10 knowledge entry —
the engineer chooses to either: change the schema (drop the
constraint, set the value app-side), or rewrite the migration
manually before committing.

**Sibling defects swept:** the script scans every migration in the
repo, not just freshly-staged ones. Today only one app
(`last-loop-lepin`) has DSQL migrations and they all pass. When
the second DSQL-backed app lands, no special wiring needed.

## See also

- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) — the broader DSQL ↔ Postgres divergence reference; §10 covers this trap with the AWS doc citation.
- [`docs/dantotsus/dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — neighbour entry: another DSQL-specific deploy-time gotcha.
- [`docs/dantotsus/dsql-grant-mismatched-runtime-auth.md`](./dsql-grant-mismatched-runtime-auth.md) — neighbour entry: DSQL's IAM/auth surface diverges similarly from Postgres'.
