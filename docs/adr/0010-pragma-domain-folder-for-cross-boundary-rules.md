# ADR-0010 — A `domain/` folder for the rules pragma's two sides share

- **Status:** proposed
- **Date:** 2026-08-13
- **Decided in:** PR [#46](https://github.com/hugoleborso/borso.fr/pull/46)

## Context

Some of pragma's business rules are read by both sides. Whether a chord chart
is major or minor decides a badge in the song form and a stored field in the
API. Whether two consecutive setlist entries share a harmonic anchor decides a
warning gutter in the editor and a response field on the setlist route. Neither
belongs to one side, and both are pure functions over plain data.

The repository had answered that question two different ways, neither of them
deliberate.

**The front end imported from the back end.** `SetlistEditor.tsx` imported
`evaluateTransition` from `@api/setlists/transition.core`, and a `lib/`
module existed for the sole purpose of re-exporting `deriveTonality` from
`@api/songs/tonality.core` — its own header said it existed to "avoid pulling
the rest of `api/src`", which is a workaround describing the problem rather
than solving it. The `@api/*` alias resolves inside one workspace, so nothing
failed; what it cost was that a browser bundle's dependency graph reached into
a folder full of Drizzle schemas and Hono routers, and one careless import
inside those modules would have pulled a database client into the front end.

**Or the rule was written twice.** `site/src/lib/stale-bar.utils.ts` opened
with "Front-end mirror of `apps/pragma/api/src/bars/bars.core.ts`" and repeated
the sixty-day threshold, the milliseconds-per-day constant, and the comparison,
differing only in that its `lastInteractionAt` was an ISO string rather than a
`Date`. `setlist-filter.core.ts` said its resolution "mirrors the BE
`resolveLineup` helper" and then rewrote it. Both copies had their own tests, so
both were green, and nothing anywhere would have reported the two drifting
apart.

Reading all of `api/src/` for the blueprint sweep also turned up what the
duplication had hidden: `bars.core.ts` and `lineup.core.ts` had **no back end
caller at all**. The front end's copy was the only live implementation, and the
back end's was dead code kept alive by its own test. `energy-curve.core.ts` was
dead on both sides — fifty-eight lines at a gated 100% coverage that nothing
imported.

## Decision

A fourth sibling folder, `apps/pragma/domain/`, reachable from both sides
through a `@domain/*` alias, holding the pure rules neither side owns.

```
apps/pragma/
  api/      Hono, Drizzle, the routes and the tables
  site/     Vite, React, the screens
  cdk/      the stack
  domain/   the rules both of the above read
```

It holds `tonality.core.ts`, `transition.core.ts`, `lineup.core.ts` and
`bar-staleness.core.ts`. Nothing else moved: a rule with one caller stays in
the bounded context that owns it, because moving it would trade a clear owner
for a shared folder nobody owns.

The alias is registered in four places, which is the real cost of the decision
and is stated here so the next person adding a folder knows the list:
`tsconfig.json` (paths and include), `vite.config.ts`, `vitest.config.ts`
(aliases, coverage include, and the `core` project's include), and
`vitest.mutation.config.ts` plus `stryker.config.js`. `knip.json` needs the
folder in both `entry` and `project`.

`bar-staleness.core.ts` accepts `Date | string | null`, which is what lets one
rule serve the value Drizzle returns and the value a JSON response carries. The
two test suites merged rather than one being deleted, so the ISO-string cases
the front end had and the `Date` cases the back end had both still run.

`instrumented-members.core.ts` folded into `domain/lineup.core.ts`, because
`transition.core.ts` needed it and the `Lineup`, `MemberId` and `InstrumentId`
types were declared in three files.

## Consequences

**The front end no longer reaches into `api/src/` for anything but the router
type.** `lib/api.ts` still imports `type { AppRouter } from '@api/app'`, which
is the point of the Hono client and is erased at compile time.

**A rule in `domain/` has no bounded context.** That is the cost. `api/src/` is
organised as vertical slices where "which domain owns this" always has an
answer, and `domain/` is a horizontal folder where it does not. The mitigation
is the admission bar above — two callers on opposite sides of the boundary,
not one — and the fact that four files is small enough to read in full.

**The gates had to be told about the folder in six configuration files**, and a
seventh that is forgotten would fail silently rather than loudly: a missing
`stryker.config.js` entry means the mutation gate stops covering those rules
without any test turning red. The same shape as the coverage gate that was
never armed, recorded in
[`docs/dantotsus/per-file-coverage-gate-was-never-armed.md`](../dantotsus/per-file-coverage-gate-was-never-armed.md).
All six are wired in the same commit, and the mutation run over the four files
was verified at 100% with zero survivors before it landed.

**This is pragma's answer, not the repository's.** `last-loop-lepin` has no
cross-boundary rule today, so it gets no `domain/` folder. If it grows one, the
shape is here to copy.

## Alternatives considered

Criteria, in order: the front end must not depend on back end infrastructure; a
shared rule must have exactly one implementation; the purity gates must keep
reaching it; and the cost must be proportionate to four files.

### Option A — A `domain/` folder inside the workspace, with an alias (chosen)

Meets the first three. The cost is one folder, one alias, and six configuration
entries. It matches how `site/`, `api/` and `cdk/` already sit together under
one `package.json`, so nothing about the workspace layout changes.

### Option B — A separate pnpm workspace, `@borso/pragma-domain` (rejected)

The stronger version of the same idea, and it was the shape first proposed. It
buys a real dependency boundary: the front end could not import from `api/src/`
even by accident, because the package would not export it.

Rejected on proportion. A published workspace needs its own `package.json`,
`tsconfig.build.json`, a `dist/`, and a build step that every consumer's
typecheck depends on — the repository already carries that for `@borso/infra`,
where a session-start hook exists specifically to build it, because a stale
`dist/` there breaks each app's typecheck with an error that does not name the
cause. Paying that for four files of pure functions inside one application is
a build graph and a class of stale-artefact failure in exchange for a boundary
the alias plus the lint rules already hold.

### Option C — Keep the mirrors, add a test asserting they agree (rejected)

Cheapest to write, and it does catch drift. It also keeps two implementations
forever, needs a third artefact to compare them, and cannot express the case
that motivated the merge: the two differed by input type, so an equality test
would have needed its own conversion layer and would have been asserting
against itself.

### Option D — Move the rules into `site/` and let the API import them (rejected)

Symmetric to what exists, and worse in the same way. It points the arrow from
the Lambda into a folder full of React components, which is a heavier
dependency to acquire by accident than the other direction.

## How this is enforced

- `borso/no-database-client-outside-repository` keeps the client out of
  anything the front end could reach, whichever alias it reaches through.
- The per-file coverage gate names `domain/**/*.core.ts` in
  `vitest.config.ts`, so a rule that moves here is covered at 100% or the run
  fails.
- `stryker.config.js` mutates the same glob, so a rule with a test that asserts
  nothing fails the mutation gate.
- `borso/no-impure-calls-in-core-files` applies to `apps/**`, so a `.core.ts`
  in this folder still cannot read the clock.

## See also

- [ADR-0008 — Purity enforced structurally](./0008-purity-enforced-structurally.md)
- [`docs/standards/02-purity-and-core-files.md`](../standards/02-purity-and-core-files.md)
- [`docs/standards/04-backend-architecture.md`](../standards/04-backend-architecture.md)
