---
status: done
summary: |
  Added `asyncifyIndex` rewriter to the migration runner alongside the
  existing `makeIdempotent` + `stripUsingClause` helpers, wired into
  `splitStatements` as the final pass. Slots `ASYNC` into the AWS-mandated
  position: `CREATE [UNIQUE] INDEX ASYNC [IF NOT EXISTS] name ...`. The
  rewrite composes safely with the other two — a drizzle-kit `CREATE
  INDEX "foo" ON "t" USING btree ("col")` arrives at DSQL as `CREATE INDEX
  ASYNC IF NOT EXISTS "foo" ON "t" ("col")`. Three new test cases cover
  the standard rewrite, the composition with `stripUsingClause`, and the
  no-double-ASYNC idempotency guarantee. Knowledge doc updated with a new
  §11 (CREATE INDEX ASYNC requirement), error symptom added to the
  lookup table, JSDoc + test comments cross-reference §11. Migration
  source in pragma stays untouched — the runner handles the rewrite at
  deploy time. `pnpm --filter @borso/infra run test:coverage` green:
  173/173 tests, 100% statements / branches / functions / lines on
  `migration-runner/index.ts`. `typecheck`, `lint`, `build` all clean.
  Final SHA: 5c7ab79f04163c332594ad0ce9e7e6390fae0899. Commit count: 3
  (feat infra, docs meta, docs pragma verdict).
artifacts:
  - infra/cdk/src/internal/migration-runner/index.ts
  - infra/cdk/test/unit/migration-runner.test.ts
  - docs/knowledge/dsql-postgres-compat-gaps.md
partialDeferrals: []
next:
  kind: validate
---
