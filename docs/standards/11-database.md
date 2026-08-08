# 11. Database

## Rule

Every read and every write goes through Drizzle, inside a `*.repository.ts`
file. No other file imports the database client, and no file anywhere writes
raw SQL except inside a generated migration.

## Reason

Drizzle derives the row types from the table definitions, so a renamed column
becomes a TypeScript error in every file that reads it, and a hand-written SQL
string becomes a runtime error instead.

Keeping the client import inside repositories means you can answer "what writes
to this table" by opening one file, and a reviewer can check every query
against a schema without searching the whole application.

## Schema

Table definitions live in `<domain>.schema.ts` inside the slice that owns the
table, and `database/schema.ts` re-exports all of them for drizzle-kit.

```ts
export const runnersTable = pgTable('runners', {
  id: uuid('id').primaryKey().defaultRandom(),
  editionId: uuid('edition_id').notNull().references(() => editionsTable.id),
  firstName: text('first_name').notNull(),
  bibNumber: integer('bib_number').notNull(),
});

export type Runner = typeof runnersTable.$inferSelect;
export type NewRunner = typeof runnersTable.$inferInsert;
```

Never hand-write `Runner`, because the inferred type is the same type the
database has. See [03. Typing](./03-typing.md).

## Migrations

Generate a migration with `pnpm --filter <app> run db:generate`, and never edit
the generated SQL by hand, because the snapshot files under `migrations/meta`
have to stay consistent with it.

The snapshot files are generated artefacts, so the formatter and the linter
both ignore them.

Migrations run from the CDK migration runner Lambda at deploy time, and the
audit test in `database/migrations.audit.test.ts` fails when the checked-in
migrations and the schema disagree.

## Transactions

A workflow that writes more than one table wraps the writes in one transaction,
and the transaction lives in the service that owns the workflow, with the
repository methods taking the transaction as an argument.

```ts
export async function transferRunnerToEdition(input: TransferInput): Promise<void> {
  await database.transaction(async (transaction) => {
    await runnerRepository.updateEdition(input, transaction);
    await punchRepository.deleteForRunner(input.runnerId, transaction);
  });
}
```

## Aurora DSQL constraints

Production runs on Aurora DSQL, which is Postgres compatible and not Postgres,
so several things behave differently and the details are in
[`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md).

Read after write consistency holds per connection, so a `GET` immediately after
a `POST` may be served by a different Lambda on a different connection and may
return the state from before the commit. The front end therefore reconciles
from the mutation response rather than refetching. See
[06. Data fetching](./06-data-fetching.md).

Foreign keys are not enforced by DSQL, so a cascade that Postgres would give
you for free has to be written explicitly in a service, and the decision is
recorded in
[`docs/adr/0006-cascade-on-delete-via-json-blob-scrub.md`](../adr/0006-cascade-on-delete-via-json-blob-scrub.md).

## Local development

`scripts/local-postgres.sh` starts a private Postgres cluster without Docker,
and the `test` script calls it, so the back end end-to-end suite runs anywhere.
The background is in
[`docs/knowledge/local-postgres-without-docker.md`](../knowledge/local-postgres-without-docker.md).

## Enforced by

- `borso/no-database-client-outside-repository`, a custom ESLint rule.
- `borso/no-raw-sql-outside-migrations`, a custom ESLint rule, which rejects
  Drizzle's `sql` template tag outside a migration or a repository.
- `database/migrations.audit.test.ts`, which compares the checked-in migrations
  with the schema.
- The `back-e2e` Vitest project, which runs every repository method against a
  real Postgres.
