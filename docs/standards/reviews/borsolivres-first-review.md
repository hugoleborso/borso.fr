# Standards review — claude/codebase-standards-practices-mtyo5e against origin/main

Verdict: FINDINGS
Ledger: 94366c6d2b49
Reviewed: 27 file(s). Sealed: 25. Findings: 2.

Scope for this run was narrowed by the dispatching operator to
`apps/borsolivres/` only, because the branch renames over four hundred files
and reviewing a mechanical rename is rubber-stamping. The 27 files are every
path under `apps/borsolivres/` that `isReviewablePath` in
`scripts/standards/seal.core.ts` accepts. Each was read in full.

Every checklist item comes from the **What only a reviewer can check** section
of `docs/standards/enforcement-ledger.md`. That section grew from twenty bullets
to twenty-one while this review was running, because commit `a982e1a` landed on
the branch under it. The added bullet is 00. Principles' *"reads that page
before deciding which pattern to write down next"*, which is about choosing the
next blueprint rather than about any line in a diff, so it changed no judgement
below. Every seal was re-recorded against the new ledger hash, after all
twenty-five sealed files had already been read in full.

Nine of the twenty-one bullets have no subject in this application: it ships no
React component, no route, no query hook, no effect and no `eslint-disable`, so
the front end architecture, data fetching, state, styling and lint-exception
bullets are vacuous here rather than passed.

## Findings

### apps/borsolivres/api/src/shelves/shelves.service.ts:47

Bullet: `reviewer` checks that a multi-table write is wrapped in one
transaction owned by the service. (04. Back end architecture) — and its twin,
`reviewer` checks that a workflow writing more than one table wraps the writes
in one transaction owned by the service, and that a cascade DSQL will not
enforce is written out explicitly. (11. Database)

```ts
export async function removeShelf(id: string): Promise<ShelfRemoval> {
  const shelf = await findShelfById(id);
  if (shelf === null) return { kind: 'not-found', detachedBookCount: NO_BOOKS_DETACHED };
  const detachedBookCount = await detachBooksFromShelf(id);
  await deleteShelf(id);
  return { kind: 'ok', detachedBookCount };
}
```

Half the bullet is met: the cascade DSQL will not enforce is written out
explicitly, and the file header says so. The other half is not. This is one
workflow writing two tables — an `UPDATE book SET shelf_id = NULL` followed by
a `DELETE FROM shelf` — as two independent statements, so a failure between
lines 50 and 51 leaves every book detached from a shelf that still exists.
`docs/standards/11-database.md` §Transactions gives the required shape, and
ADR-0006 rejected exactly this arrangement as its Option B: *"not atomic — a
crash mid-cascade leaves orphan member IDs in lineups"*. The file header cites
that same ADR at line 9 as its authority, which makes the gap easy to miss.

What would satisfy it: wrap both writes in one `database.transaction(…)` owned
by this service, and thread the handle through. The type the handle needs
already exists and is currently used nowhere —
`apps/borsolivres/api/src/database/client.ts:27` declares
`export type DatabaseExecutor` with the JSDoc *"a repository that has to run
inside or outside a transaction takes this widened type"*, which reads as the
shape having been prepared and then not wired. `detachBooksFromShelf` and
`deleteShelf` would each take a `DatabaseExecutor`; the cross-slice call stays
service-to-service, so `borso/no-cross-slice-repository-imports` is unaffected.

Note for the implementer: that fix also edits `books.service.ts` and both
repositories, which are sealed at their current content. A seal is over content,
so changing them correctly invalidates their seals and asks for a re-read. That
is the mechanism working, not a problem.

### apps/borsolivres/api/src/shelves/shelves.repository.ts:10

Bullet: `reviewer` checks that a derived type is derived, so a row type comes
from `$inferSelect`, a request body from `z.infer`, and a response from the
Hono client, rather than being written out by hand beside the thing it mirrors.
(03. Typing)

```ts
export interface ShelfRow {
  readonly id: string;
  readonly name: string;
}
```

`shelfTable` in `shelves.schema.ts:15-18` declares exactly `id` and `name`, so
`ShelfRow` is `typeof shelfTable.$inferSelect` written out by hand one file
away from the table it mirrors. `docs/standards/03-typing.md` §Never hand-write
a type another tool derives names the Drizzle table as the first of four
sources.

This is deliberately *not* raised against the books slice, and the difference
is worth stating. `books.repository.ts:33` declares `PersistedBookRow` with
`status: string` where the domain type is the narrower `BookStatus` union, and
`toBookRow` narrows it — that is the `repository-row-mapper` blueprint's stated
case, *"a column wider than the domain type"*, and the two canonical examples
(`punch.repository.ts`, `instruments.repository.ts`) both hand-write their row
interface for the same reason. `ShelfRow` narrows nothing and maps nothing:
`listShelves` at line 24 returns Drizzle's own rows unchanged. There is no
column wider than the domain here, so nothing exempts it from the bullet.

What would satisfy it: `export type ShelfRow = typeof shelfTable.$inferSelect;`.

Mitigating, and worth knowing before you weigh the fix: `PROJECTION` at line 16
names `shelfTable.id` and `shelfTable.name` directly, so a *renamed* column
fails to compile there. What stays silent is a column added to the table and
expected on the row.

## Sealed

- `api/src/app.ts` — chains `.route()` in one unbroken expression as
  `api-composition-root` requires, so `AppRouter` keeps its accumulated route
  types.
- `api/src/books/books.controller.ts` — the absent authentication is stated in
  the header with the barrier that replaces it, which is what
  `controller-public-router` asks for; every handler validates, calls one
  service function, and shapes a response.
- `api/src/books/books.core.ts` — `now` arrives as a parameter throughout;
  `chooseNullable`'s comment at line 134 documents a real trap (`??` cannot
  distinguish a deliberate `null` from an absent key) rather than restating the
  code.
- `api/src/books/books.repository.ts` — rows, arrays and a count only; the row
  mapper narrows a `text` column onto the domain union, which is the sanctioned
  case. See the second finding for why the books row interface is treated
  differently from the shelves one.
- `api/src/books/books.schema.ts` — the missing foreign key is named beside the
  column together with the application-level replacement, which standard 11
  requires; `bookUpdateSchema` derives from `bookCreateSchema` via `.partial()`.
- `api/src/books/books.service.ts` — reads, delegates every branch to
  `books.core.ts`, then writes; input types come from `z.infer`.
- `api/src/books/openlibrary.adapter.ts` — the fetcher, the clock and the cache
  all arrive as options; a non-ok response yields an empty list.
- `api/src/books/openlibrary.core.ts` — untrusted payload goes through
  `safeParse` and is never annotated into shape.
- `api/src/database/client.ts` — `getDatabase` throws when unconfigured, which
  is the promise `get…` makes in the naming table.
- `api/src/database/schema.ts` — re-exports the two tables and nothing else.
- `api/src/main.dev.ts`, `api/src/main.ts` — both start from `createApp` and
  declare no route.
- `api/src/shelves/shelves.controller.ts` — dispatches only; the header explains
  why the delete response carries `detachedBookCount`, which a reader could not
  deduce.
- `api/src/shelves/shelves.schema.ts` — table plus input schema, one file.
- `site/src/i18n/i18n-parity.core.ts`, `i18n.setup.ts`, `i18n.utils.ts`,
  `locale-storage.utils.ts` — pure where they claim to be; the catalogue keys
  read `<screen>.<element>`, e.g. `catalogue.empty-state.hint` and
  `book-form.rating-hint`, so the dotted path names the screen and the element.
  `i18n.setup.ts` matches `apps/pragma/site/src/i18n/i18n.setup.ts`; the
  `.setup.ts` suffix is carried by four files and is listed in
  `convention-drift.md`, so it is an existing convention rather than one
  invented here.
- `drizzle.config.ts`, `vite.config.ts`, `vitest.config.ts`,
  `vitest.mutation.config.ts` — the two vitest projects carry explicit
  `sequence.groupOrder`, and the comments above them document vitest
  constraints a reader cannot deduce.
- `test/database-utils.ts`, `test/request-utils.ts`, `test/setup-postgres.ts` —
  reviewable under `isReviewablePath` because none carries the `.test-utils.ts`
  suffix; read and cleared on the same bullets.

## Blueprint claims

The dispatching operator asked specifically about the earlier defect where full
`@Blueprint` blocks were copied out of canonical files and duplicate ids were
declared. It is fixed. `apps/borsolivres/` contains zero `@Blueprint`
declarations, 39 bare `// @FollowsBlueprint <id>` markers, and
`.claude/skills/blueprint/blueprint-indexing.ts --check` reports *"Annotations
are complete and the index is up to date"* across 1003 files with no orphaned
followers, so every id resolves to a real blueprint.

Each marker was checked against the blueprint it names, not just against the
existence of the id. Two worth recording:

- `api/src/app.ts:22` claims `api-composition-root`, whose point is that the
  `.route()` calls form one unbroken chain. They do.
- `test/setup-postgres.ts:52` claims `test-global-setup`, whose description
  includes *"boots a container only otherwise"*. This copy has no container arm
  and throws instead, because `pnpm run test` boots the sandbox cluster through
  `scripts/local-postgres.sh`. That is a deliberate and stated divergence, and
  the paired `teardown` matching it is why `teardown` is empty.

## Unclear

None.

## Outside the checklist

Advisory only; no bullet covers these and none changed a verdict.

- `apps/borsolivres/cdk.json` sets `"app": "tsx cdk/bin/cdk.ts"`, and
  `cdk/bin/`, `cdk/lib/` and `cdk/test/` are all empty directories that git does
  not track. `vitest.config.ts:38` likewise includes `cdk/test/**/*.test.ts`,
  which matches nothing. The application cannot be synthesised or deployed as it
  stands.
- `apps/borsolivres/vitest.config.ts:18` puts the marker inside a JSDoc block,
  as ` * // @FollowsBlueprint workspace-test-config`. The indexer counts it, so
  no gate cares, but the other 38 markers in the application and all five other
  followers of that blueprint are bare line comments.
- `apps/borsolivres/api/src/database/client.ts:27` exports `DatabaseExecutor`
  and nothing imports it; `books.service.ts:100` exports `listShelfBooks` and
  nothing calls it; `locale-storage.utils.ts:28` exports `writePersistedLocale`
  and nothing calls it. Whether these survive is knip's question, not mine.
- The i18n catalogues carry keys for a catalogue screen, a book form, a lookup
  panel and a shelves screen. No component renders any of them, because
  `site/src/` holds only `i18n/` and `styles/tokens.css`. The parity gate is
  green either way, and the front end is presumably the next slice of work.
