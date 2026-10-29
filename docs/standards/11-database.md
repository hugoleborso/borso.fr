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
table, `borso/no-cross-slice-repository-imports` stops one slice calling the
other slice's repository directly, so the other slice is reached through its
service, with the transaction handle passed in.

`pragma` has this case in three places. `deleteSongWithCascade` in
`songs.repository.ts`, `deleteSessionWithCascade` in `sessions.repository.ts`
and `deleteMemberWithLinks` in `members.repository.ts` each open the
transaction themselves and call other slices' services inside it, for example
`deleteTakesOfDeletedSong`, `detachTakesOfDeletedSession`,
`deleteStudiesOfDeletedSong` and `deletePushStateOfDeletedMember`. The rule
lets them through because each import names a service, not a repository. The
cost is that a repository then depends on another slice's service.

The shape below keeps that call in the service instead: the owning repository
exports the transaction, and the service runs both halves inside it. It is the
one a standards review arrived at on another application, and it is written
here rather than shown from the tree:

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

A uniqueness rule is held by a primary key, never by a unique index and never
by a check in code. DSQL refuses a partial index, builds every other index
asynchronously so it refuses nothing while the build runs, and a check over rows
read earlier is passed by two concurrent requests alike. When the natural key
cannot be the table's own primary key, because the rule covers only some rows
or the row needs a surrogate id, a claim table whose primary key is the unique
triple holds it, written and deleted in the same transaction as the row it
guards. `loop_punch_claims` in `last-loop-lepin` and `seat_claim` in
`banana-rush` are the shape, and
[04. Back-end architecture](./04-backend-architecture.md) has the service side.

Foreign keys are not enforced by DSQL, so a cascade that Postgres would give
you for free has to be written explicitly in a service, and the decision is
recorded in
[`docs/adr/0006-cascade-on-delete-via-json-blob-scrub.md`](../adr/0006-cascade-on-delete-via-json-blob-scrub.md).

A Postgres startup parameter is part of a contract with DSQL, not part of the
code, so one it does not accept is only refused by a cluster. DSQL closes the
connection rather than ignoring the parameter, and every driver double in this
repository takes any options object, so the failure lands at the first query of
a deployed function and no test, coverage threshold or mutant can reach it.
`search_path` is the one this repository has proven, and a second one enters the
list by being run against a cluster in the same commit that adds it. See
[`docs/dantotsus/the-connection-parameter-no-mock-could-refuse.md`](../dantotsus/the-connection-parameter-no-mock-could-refuse.md).

## Local development

`scripts/local-postgres.sh` starts a private Postgres cluster without Docker,
and the `test` script calls it, so the back end end-to-end suite runs anywhere.
The background is in
[`docs/knowledge/local-postgres-without-docker.md`](../knowledge/local-postgres-without-docker.md).

## Enforced by

- `oxlint:borso/no-database-client-outside-repository` fails when any file
  other than a `*.repository.ts` imports the database client.
- `oxlint:borso/no-raw-sql-outside-migrations` rejects Drizzle's `sql` template
  tag outside a migration or a repository.
- `test:migrations.audit.test.ts`, one per full-stack application, rejects a
  `DEFAULT now()` on any column outside that application's allow list.
- `script:scripts/check-numbered-sequences.sh` fails a migrations folder where
  one number is claimed by two files. The number is the only thing ordering one
  migration against another, so a shared number leaves the alphabet to decide;
  two branches open at once each take the next free number and git merges both
  filenames without a conflict, which makes the merge commit the first moment
  the collision exists and the last moment anybody is reading numbers. The same
  script covers `docs/adr`, which has the same shape and had no gate at all.
- `script:scripts/check-coupled-lists.sh` additionally fails when a table a
  migration creates is missing from either list the back-e2e harness keeps of
  them. The setup file drops its list before replaying the migrations and the
  truncate file empties its list between cases; a table absent from the first
  survives the reset and collides with its own `CREATE TABLE` on the second run
  of the suite, which is a state CI never reaches because its Postgres is
  always fresh.
- `script:scripts/check-dsql-connection-parameters.sh` fails a `connection: { … }`
  passed to the Postgres driver that names a startup parameter this repository
  has not run against a real DSQL cluster. The type is
  `Partial<ConnectionParameters>`, whose index signature accepts every spelling,
  and the suites mock the driver, so this is the only thing between a plausible
  Postgres setting and a deployed function that cannot open a connection.
- `gate:vitest-back-e2e` runs every repository method against a real Postgres.
- `reviewer` checks that a workflow writing more than one table wraps the
  writes in one transaction owned by the service, and that a cascade DSQL will
  not enforce is written out explicitly.
