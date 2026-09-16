# `pnpm dev` serves a schema it never migrated

Two ways the local Postgres will lie to you, both measured on `pragma` on
2026-09-15.

## A new migration is invisible to `pnpm dev`

`dev:api` boots the API against the cluster `scripts/local-postgres.sh` starts.
It applies no migrations. Nothing in the dev path does.

The only thing that applies them is `apps/pragma/test/setup-postgres.ts`, the
back-e2e setup, which drops the tracked tables and replays every `.sql` file in
order.

So after adding a migration, local development answers:

```
500  error: column "deezer_track_id" of relation "song" does not exist
     code: 42703 errorMissingColumn
```

until the back-e2e suite happens to run and applies it as a side effect. The
error names a column, not a missing migration, so it reads like a bug in the
code you just wrote.

**What to do:** run the back-e2e suite once after adding a migration
(`pnpm --filter @borso-app/pragma exec vitest run --project back-e2e`), or wipe
and let it rebuild (`pnpm --filter @borso-app/pragma run db:local:wipe`). Both
destroy local rows, which is why neither is wired into `dev`.

Note this is *not* what happens on a deploy — the Lambda applies migrations at
boot, and preview schemas are cloned. It is only the local dev path that skips
them.

## The dev API and back-e2e share one cluster

`scripts/local-postgres.sh start pragma` returns the same connection string to
both. There is one database.

The consequence bites when you use the test seed route by hand: a
`POST /api/__test/seed` against the running dev API while the back-e2e suite is
running calls `deleteAllDomainRows()` on the database that suite is using. Its
rows vanish mid-run and a test fails — in an unrelated file, with an assertion
that has nothing to do with seeding. It happened here in
`voting.controller.test.ts`, which passed in isolation immediately afterwards.

**What to do:** treat a back-e2e failure that passes in isolation as a
collision, not a flake, and check whether anything touched the database while
it ran. Do not seed by hand during a suite.

Related: [`local-postgres-without-docker`](./local-postgres-without-docker.md)
for how the cluster is started at all, and
[`a-timeout-under-parallel-gates-is-not-a-regression`](./a-timeout-under-parallel-gates-is-not-a-regression.md)
for the other shape of "the suite failed because of what was running beside it".
