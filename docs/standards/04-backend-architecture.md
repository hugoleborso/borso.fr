# 04. Back end architecture

## Rule

Every back end is a set of vertical slices, with one folder per bounded context
and the same five or six file names inside each folder. There is no horizontal
`controllers/`, `services/`, or `domain/` folder.

```
api/src/
  auth/
    auth.controller.ts     HTTP only
    auth.service.ts        orchestration, input and output
    auth.repository.ts     Drizzle queries only
    auth.schema.ts         Drizzle tables and Zod input schemas
    auth.core.ts           pure rules, optional
    auth.types.ts          types shared inside the slice, optional
    auth.*.test.ts         one sibling test per file
  helpers/
    geo/  gpx/  sun/       cross-cutting, and still layered
```

## Reason

A feature changes across all four layers at once. When the layers are folders,
one change touches four directories, and the reviewer holds four files open.
When the layers are file names inside one folder, the whole change is one
directory listing.

The slice also draws the ownership line. Only `punch.repository.ts` may query
the punch tables, and while the rule holds, you can answer "what writes to
this table" by opening one file.

## The controller dispatches

A handler does three things, which are validating the input, calling one
service method, and shaping the response.

```ts
punchController.post('/punches', zValidator('json', createPunchSchema), async (context) => {
  const punch = await punchService.recordPunch(context.req.valid('json'));
  return context.json(punch, 201);
});
```

A controller may not call `map`, `filter`, `reduce`, or `find` over domain
data, and it may not hold a business condition or assemble a response object
inline. It may not make a second service call that exists only because the
first one did not do enough, and the orchestration moves into the service
instead.

A controller with logic in it is a service that nobody has extracted yet.

## The service orchestrates

The service owns the workflow, so it calls repositories, calls `.core.ts`
functions to decide, calls other services, and manages transactions.

The service is the one layer that is allowed to be impure and interesting at
the same time, which is why every decision inside it delegates to a pure
function.

```ts
export async function recordPunch(input: CreatePunchInput): Promise<Punch> {
  const edition = await editionRepository.getActive();
  const existingPunches = await punchRepository.listForRunner(input.runnerId);

  const decision = decidePunchAcceptance(existingPunches, input, edition, new Date());
  if (decision.kind === 'rejected') {
    throw new PunchRejectedError(decision.reason);
  }

  return punchRepository.insert(decision.punchToInsert);
}
```

`decidePunchAcceptance` is pure, it lives in `punch.core.ts`, and it holds
every branch, so the service reads as a sentence.

## The repository reads and writes

A repository holds Drizzle queries and transactions and nothing else, with no
business condition, no derived field, and no formatting. It is the only file in
the slice that imports the database client.

```ts
export function listForRunner(runnerId: string): Promise<Punch[]> {
  return database
    .select()
    .from(punchesTable)
    .where(eq(punchesTable.runnerId, runnerId))
    .orderBy(asc(punchesTable.recordedAt));
}
```

A repository method returns rows, arrays of rows, or a count. When it would
return a shape the database does not have, the mapping moves into a `.core.ts`
function that the service calls.

## The schema defines the data once

Drizzle table definitions and the Zod schemas for HTTP input live in the same
file, because they describe the same nouns. Types come from both and are never
hand-written. See [03. Typing](./03-typing.md).

## The core file holds the rules

The core file is pure, fully covered, and mutation tested. See
[02. Purity and core files](./02-purity-and-core-files.md).

## Rules across slices

A controller may import only its own service, its own schema, and framework
packages, and it may never import another slice's service or any repository.

A service may import another slice's service, and it may never import another
slice's repository, because reaching into a foreign repository takes ownership
of a table that belongs to someone else.

A repository imports nothing from another slice, and a `.core.ts` file imports
only types and other pure functions.

When two slices need the same rule, the rule moves to
`helpers/<topic>/<topic>.core.ts` rather than into one of the two slices.

## Errors

A service throws a named domain error, and the controllers translate errors to
status codes in one place, which is a Hono `onError` handler, rather than in a
`try` and `catch` block per route.

```ts
export class PunchRejectedError extends Error {
  constructor(readonly reason: PunchRejectionReason) {
    super(reason);
  }
}
```

The mapping from error to status code is a lookup table in a `.core.ts` file,
so it is a pure function of the error and it has tests.

## Enforced by

- `borso/no-controller-imports-outside-service`, a custom ESLint rule.
- `borso/no-cross-slice-repository-imports`, a custom ESLint rule.
- `borso/no-database-client-outside-repository`, a custom ESLint rule, which
  allows the client import only in `*.repository.ts` and `database/client.ts`.
- `borso/no-array-methods-in-controllers`, a custom ESLint rule, which rejects
  `map`, `filter`, `reduce`, `find`, `some`, and `every` in a `*.controller.ts`
  file.
- `borso/conditions-live-in-pure-functions`, which covers business branches
  everywhere else. See
  [02. Purity and core files](./02-purity-and-core-files.md).
