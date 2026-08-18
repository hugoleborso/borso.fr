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
  editionId: uuid('edition_id')
    .notNull()
    .references(() => editionsTable.id),
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
audit test in `database/migrations.audit.test.ts` reads the `.sql` files that
Lambda applies and fails on any column carrying `DEFAULT now()` outside a named
allow list. The allow list holds the row-lifecycle timestamps the database is
meant to own; a business date reaching it would take its value from the
migration runner's clock at deploy time instead. The test asserts on the
artifact rather than on the Drizzle objects, so it also catches SQL edited by
hand.

The two full-stack applications each carry their own copy, because the allow
list is a statement about that application's tables.

## Transactions

A workflow that writes more than one table wraps the writes in one transaction,
and the repository methods take the transaction as their first argument.

The transaction is opened in the **repository**, not in the service, and the
reason is the rule two sections up: only a `*.repository.ts` may import the
database client, so a service cannot write `database.transaction(...)` without
breaking it. `apps/pragma/api/src/members/members.repository.ts` is the shape:

```ts
export async function deleteMemberWithLinks(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  return await database.transaction(async (transaction) => {
    await scrubMemberFromSongDefaults(transaction, id);
    await scrubMemberFromSetlistOverrides(transaction, id);
    await transaction.delete(memberInstrumentTable).where(eq(memberInstrumentTable.memberId, id));
    const deleted = await transaction
      .delete(memberTable)
      .where(eq(memberTable.id, id))
      .returning({ id: memberTable.id });
    return selectDeletionOutcome(deleted.length);
  });
}
```

`DatabaseExecutor` is the type those helpers take. It is the union of the
client and a transaction handle, so one query function runs inside or outside a
transaction without a cast.

When the cascade crosses a **slice boundary** rather than reaching another
table, the owning repository exports the transaction instead, because
`borso/no-cross-slice-repository-imports` stops the service calling the other
slice's repository directly. No application has that case today, so the shape
below is the one a standards review arrived at on an application that did, and
it is written here rather than shown from the tree:

```ts
// shelves.repository.ts
export async function runInOneTransaction<Result>(
  work: (executor: DatabaseExecutor) => Promise<Result>,
): Promise<Result> {
  const database = getDatabase();
  return await database.transaction(work);
}

// shelves.service.ts — the boundary is a service call, inside one transaction
return await runInOneTransaction(async (executor) => {
  const detachedBookCount = await detachBooksFromShelf(executor, id);
  await deleteShelf(executor, id);
  return { kind: 'ok', detachedBookCount };
});
```

Take the executor as a required argument rather than an optional one. An
optional `executor ?? getDatabase()` adds a branch no test covers and makes
calling the second half outside the transaction merely discouraged instead of
impossible.

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

- `eslint:borso/no-database-client-outside-repository` fails when any file
  other than a `*.repository.ts` imports the database client.
- `eslint:borso/no-raw-sql-outside-migrations` rejects Drizzle's `sql` template
  tag outside a migration or a repository.
- `test:migrations.audit.test.ts`, one per full-stack application, rejects a
  `DEFAULT now()` on any column outside that application's allow list.
- `gate:vitest-back-e2e` runs every repository method against a real Postgres.
- `reviewer` checks that a workflow writing more than one table wraps the
  writes in one transaction owned by the service, and that a cascade DSQL will
  not enforce is written out explicitly.
