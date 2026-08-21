# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 3 file(s). Sealed: 1. Findings: 2.

All four of the previous round's findings are closed, and I checked each against the
tree rather than against the brief:

- `punch.repository.ts:64-68` now exports `runInOneTransaction`, in the shape
  `docs/standards/11-database.md:99-106` prescribes for a cascade crossing a slice boundary.
- `deleteAllEditionPunchesAndDidNotFinishesOutsideATransaction` is gone from the diff; the one
  entry point is `deleteAllEditionPunchesAndDidNotFinishes(executor, editionSlug)` (line 161).
- Every write in the slice takes the executor as a required first argument — `insertPunch`
  (line 70), `deleteManualDidNotFinish` (line 146), `deleteAllEditionPunchesAndDidNotFinishes`
  (line 161) — with no `?? getDatabase()` branch, which is what `11-database.md:115-118` asks for.
- `catchupPunch` (`punch.service.ts:233-236`) wraps the insert and the did-not-finish delete in one
  transaction, so the two tables `VOCABULARY.md` calls mutually exclusive can no longer diverge.
- `runner.repository.ts:31` has its `// @FollowsBlueprint repository-query` back above
  `listRunnersForEdition`, and the new delete carries no tag.

The two findings below are on content the branch did not introduce. Both files are unsealed for
the first time (`docs/standards/seals.jsonl` holds no entry for either path), so the bullets read
on the whole file — the same basis the previous round used to report `catchupPunch`.

## Findings

### apps/last-loop-lepin/api/src/punch/punch.repository.ts:12

Bullet: `reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors.

```ts
interface LoopPunchRow {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
  readonly correctedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly source: string | null;
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
  readonly distanceFromCenterM: number | null;
  readonly userAgent: string | null;
}
```

Every one of those thirteen fields is a column of `loopPunchesTable`, declared thirteen lines away
in `punch.schema.ts:20-35` and imported at line 3 of this file. It is the hand-written copy
`03-typing.md:82-92` names outright — *"A Drizzle table | `typeof loopPunchesTable.$inferSelect`"*
— and the drift it warns about is one-directional here: widening a column in the schema
(`source` becoming `notNull`, say) still satisfies this interface, so the copy goes stale without
a compiler error. The same application already does it the derived way four times over in
`pragma` (`setlists.repository.ts:16`, `setlists.repository.ts:41`, `sessions.repository.ts:19`,
`songs.repository.ts:152`).

What would satisfy it: `type LoopPunchRow = typeof loopPunchesTable.$inferSelect;`. Nothing else in
the file has to move — `rowToLoopPunch` reads a subset of the columns and keeps narrowing `source`
through `narrowPunchSource`, which is the part of the row-mapper pattern the derived type does not
replace.

Two things travel with the fix, and neither belongs to me to change. This file **is** the
`repository-row-mapper` blueprint, and its description (lines 32-37) prescribes the defect:
*"Declares the row shape as a private interface and maps it field by field"*. And
`edition.repository.ts:6` carries the identical `EditionRow` interface and was sealed last round,
so that seal is honest about what was checked and wrong about this bullet; the fix is the same one
line, and the seal will need retaking either way once the file changes.

### apps/last-loop-lepin/api/src/punch/punch.service.ts:184

Bullet: `reviewer` checks the half of the verb table the rule above cannot reach: that a `find…` actually returns `null` rather than throwing, that a `get…` throws, and that a `build…`, `project…` or `select…` returns what its verb says.

```ts
export async function getPunchesForEdition(editionSlug: string): Promise<readonly LoopPunch[]> {
  return listPunchesForEdition(editionSlug);
}

export async function listManualDidNotFinishes(
  editionSlug: string,
): Promise<readonly ManualDidNotFinish[]> {
  return listManualDidNotFinishesForEdition(editionSlug);
}
```

`get…` promises *"The thing, and throws when it is absent"* (`01-naming.md:60`); this returns an
array, possibly empty, and cannot throw. The verb for that row of the table is `list…`, and the
function four lines below is the same one-line delegation wearing it — so the file answers the
question against itself. The likely cause is mechanical rather than considered: `listPunchesForEdition`
is already bound in this module by the import at line 20, so the export could not reuse the name.

What would satisfy it: rename to `listEditionPunches`, which does not collide, and update the four
call sites — `ranking.service.ts:5,36,49,73` and `runner.service.ts:2,90`.

The previous round left the same class advisory on `edition.service.ts` (`getEditionOrNull` line
102, `getCurrentEdition` line 153) and sealed the file. I am reporting this one rather than
carrying it forward because those two return `null` for a thing that can genuinely be absent, where
this returns a collection, for which the table names a different verb outright. If the two are
swept together the seal on `edition.service.ts` will need retaking; nothing forces that in this PR.

## Sealed

- `apps/last-loop-lepin/api/src/runner/runner.repository.ts` — the displaced marker is fixed:
  `// @FollowsBlueprint repository-query` (line 31) is on `listRunnersForEdition` again, which
  returns rows, and the branch's new `deleteAllEditionRunners` (line 24) carries no tag, matching
  its punch-side twin. That delete takes `executor` as a required first argument with no
  `getDatabase()` fallback, writes one table, and is reached only from inside the transaction
  `edition.service.ts:214` owns. `findRunner` (line 15) returns `null` and never throws;
  `listRunnersForEdition` returns the select unprojected, so no repository derives a shape.

## Unclear

None.

## Outside the checklist

- `runner.repository.ts:10-13`: `upsertRunner` carries `// @FollowsBlueprint repository-idempotent-upsert`
  but writes `.onConflictDoNothing()`, while the blueprint it names promises the opposite —
  *"a second call with different content overwrites rather than failing on the primary key"*
  (`blueprint-index.md:161`). The other three followers all use `onConflictDoUpdate`
  (`auth.repository.ts:26`, `transitions.repository.ts:51`, `mastery.repository.ts:37`), so this is
  the only one where a replay with a changed `displayName` or `bib` is silently dropped. No ledger
  bullet covers whether a `@FollowsBlueprint` claim is true, and the fix is a behaviour choice
  about seeding rather than a standards one, so it did not hold the seal. Worth a decision: either
  make it `onConflictDoUpdate` or drop the tag and the `upsert` prefix.
- `punch.service.ts:155` throws `new PunchNotFoundError(id)`, and that class (line 29) declares no
  constructor, so the id lands in `Error.message` rather than on a field a controller can read.
  Its sibling `PunchRejectedError` (line 39) does carry its reason as a readonly field, which is
  what the `named-domain-error` blueprint describes.
- `docs/standards/hotspots.md:49-50` lists `punch.types.ts` and `runner.types.ts` as two of the
  most-changed files in the repository, both *"follows no recorded pattern"*. That is the file pair
  the first finding is about: `LoopPunch` and `Runner` are hand-maintained mirrors of two tables
  that keep moving. Deriving the row types is the pattern that page is asking someone to write down.
- `seedPunch` (line 253), `seedManualDidNotFinish` (line 257) and `clearEditionPunchHistory`
  (line 240) exist in the production service for one caller, `__test/test-seed.service.ts`. No
  bullet reaches it, and the seed route is real application surface, so this is an observation
  rather than a complaint.
