# 03. Typing

## Rule

You may write `as const`, and you may write a single `as unknown`. Every other
type assertion is banned, and `any` is banned outright.

## Reason

Writing `as Foo` tells the compiler to stop checking, and it is a promise you
have no way to keep. When the shape later drifts, because of a schema change, a
renamed column, or a new API version, the assertion still compiles, and the
failure moves to runtime, usually in production and usually far from the line
that caused it.

Every case where an assertion feels necessary has an alternative that keeps the
check.

## Parsing untrusted input, so use Zod

```ts
// Don't
const body = await request.json() as CreateRunnerBody;

// Do
const body = createRunnerSchema.parse(await request.json());
```

The Zod schema is also where the type comes from:

```ts
export const createRunnerSchema = z.object({
  firstName: z.string().min(1),
  bibNumber: z.number().int().positive(),
});
export type CreateRunnerBody = z.infer<typeof createRunnerSchema>;
```

One definition is validated at the boundary and typed everywhere inside it.

## Narrowing a union, so use a type guard

```ts
// Don't
const finished = entry as FinishedEntry;

// Do
function isFinishedEntry(entry: LeaderboardEntry): entry is FinishedEntry {
  return entry.kind === 'finished';
}
```

A guard is a function with a body, so you can test it, and it is pure, so it
belongs in a `.core.ts` file.

## Reading JSON of a known shape, so use `as unknown` and then parse

```ts
const parsed: unknown = JSON.parse(rawPayload);
const openings = openingsSchema.parse(parsed);
```

`as unknown` is the one allowed escape, because it removes information rather
than inventing it. Chaining it as `as unknown as Foo` puts the invention back,
so the chained form is banned.

## Prefer inference to annotation

Annotate the boundary and infer the inside, because annotating every local is
noise, and it hides the moment inference produces something you did not expect.

```ts
export function buildLapTable(punches: readonly Punch[]): LapTable {
  const punchesByRunner = groupPunchesByRunner(punches);
  …
}
```

An exported function always annotates its return type, so that a change inside
the body cannot widen the public contract without anyone noticing.

## Never hand-write a type another tool derives

| Source of truth | How to get the type |
|-----------------|---------------------|
| A Drizzle table | `typeof runnersTable.$inferSelect` |
| A Drizzle insert | `typeof runnersTable.$inferInsert` |
| A Zod schema | `z.infer<typeof schema>` |
| The Hono routes | `hc<typeof apiRouter>` on the front end |

A hand-written copy of any of the four drifts away from its source. See
[06. Data fetching](./06-data-fetching.md).

## Use `readonly` for parameters the function does not own

A pure function never mutates its arguments, so the annotation costs nothing
and it documents the contract.

```ts
export function rankRunners(runners: readonly Runner[], now: Date): Ranking {
```

## Enforced by

- `@typescript-eslint/no-explicit-any`, set to error.
- `borso/no-type-assertion-except-unknown`, a custom ESLint rule, which allows
  `as const` and a single `as unknown` and rejects everything else.
- `@typescript-eslint/explicit-module-boundary-types`, set to error.
- The type-aware `no-unsafe-argument`, `no-unsafe-assignment`,
  `no-unsafe-call`, `no-unsafe-member-access`, and `no-unsafe-return` rules
  from `typescript-eslint`, all set to error.
- `tsc --noEmit`, run by the `typecheck` script in every workspace and in CI.
