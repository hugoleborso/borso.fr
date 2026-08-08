# Blueprint: Hono back end

Follow the steps below to build the `api/` half of an application. The
reference implementation is `apps/last-loop-lepin/api`, so open it beside this
document.

## Dependencies

```
hono @hono/zod-validator zod
drizzle-orm postgres
@aws-sdk/dsql-signer            production credentials
@aws-sdk/client-s3              only when the application stores files
```

Development dependencies are `drizzle-kit`, `@hono/node-server`, `tsx`,
`vitest`, and `@stryker-mutator/core`.

## Folder layout

```
api/src/
  main.ts                     the Lambda handler
  main.dev.ts                 the local node server
  app.ts                      composes the routes and exports AppRouter
  <domain>/                   one folder per bounded context
    <domain>.controller.ts
    <domain>.service.ts
    <domain>.repository.ts
    <domain>.schema.ts
    <domain>.core.ts
  database/
    client.ts
    schema.ts                 re-exports every slice's tables
    migrations/               generated, never edited by hand
  helpers/<topic>/            cross-cutting, still layered
```

[04. Back end architecture](../standards/04-backend-architecture.md) explains
what each layer may and may not do.

## Step 1: write the schema first

Define the Drizzle tables in `<domain>.schema.ts`, and derive the row types
from them. The schema decides the shape of everything above it, so writing a
service against a schema you have not written yet produces types you throw
away.

Add the Zod input schemas in the same file, because they describe the same
nouns.

## Step 2: write the core rules next, with their tests

Write the pure decision functions before the service, in `<domain>.core.ts`,
and take `now` as an argument. Writing them first keeps them free of the
database, because there is no database to reach for yet.

## Step 3: write the repository

Only Drizzle queries go in the repository. When a method wants to return a
shape the database does not have, put the mapping in the core file instead.

## Step 4: write the service

The service reads through the repository, calls the core function to decide,
throws a named domain error when the decision rejects, and writes through the
repository.

## Step 5: write the controller last

The controller validates with `zValidator`, calls one service method, and
returns the response, so it should be a few lines per route.

## Step 6: export the router type

`app.ts` composes the controllers and exports the type the front end reads:

```ts
const apiRouter = app
  .route('/api/runners', runnerController)
  .route('/api/punches', punchController);

export type AppRouter = typeof apiRouter;
```

## Step 7: generate the migration

Run `pnpm --filter @borso-app/<app> run db:generate`, and commit the generated
SQL and the snapshot files under `migrations/meta` without editing either.

## Checks before you call it done

Run `pnpm --filter @borso-app/<app> run lint`, `typecheck`, `test`, and
`test:mutation`. The `test` script starts a local Postgres through
`scripts/local-postgres.sh`, so it works without Docker.
