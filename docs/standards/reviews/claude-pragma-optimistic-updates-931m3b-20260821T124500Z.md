# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 7 file(s). Sealed: 4. Findings: 4.

The previous round's finding is closed. `removeSetupEdition`
(`apps/last-loop-lepin/api/src/edition/edition.service.ts:210-218`) now runs the whole cascade
in one transaction, in the shape `docs/standards/11-database.md:92-119` prescribes for a cascade
crossing a slice boundary, and the three tables keyed on `edition_slug` are all cleared —
`runners`, `loop_punches` and `manual_did_not_finishes`. Those are the only ones: `pgTable` appears
seven times in `apps/last-loop-lepin/api/src/` and `media.schema.ts` declares Zod input schemas
only, so the fourth table the previous report named does not exist.

The findings below are on the two `punch` files the same change touched, plus a displaced
blueprint annotation in `runner.repository.ts`.

## Findings

### apps/last-loop-lepin/api/src/punch/punch.repository.ts:164

Bullet: `reviewer` checks that a workflow writing more than one table wraps the writes in one transaction owned by the service, and that a cascade DSQL will not enforce is written out explicitly.

```ts
export async function deleteAllEditionPunchesAndDidNotFinishesOutsideATransaction(
  editionSlug: string,
): Promise<void> {
  await deleteAllEditionPunchesAndDidNotFinishes(getDatabase(), editionSlug);
}
```

This writes two tables — `loop_punches` (`punch.schema.ts:20`) and `manual_did_not_finishes`
(`punch.schema.ts:37`), both deleted at lines 158-161 of this file — on the plain client, so a
failure between the two deletes leaves an edition holding did-not-finish rows whose punches are
gone. The branch added the function and its name says out loud that it does not meet the bullet;
before the branch the same two deletes ran on `getDatabase()` inside
`deleteAllEditionPunchesAndDidNotFinishes` itself, so this is a rename of an existing gap rather
than a new one — but the transactional half now exists two lines above, which makes the
untransacted half a deliberate keep.

What would satisfy it: give the punch slice the same `runInOneTransaction` that
`edition.repository.ts:134-138` exports and call it here, so the one entry point is
`deleteAllEditionPunchesAndDidNotFinishes(executor, slug)` and both callers are inside a
transaction. That also removes the pair of near-identical exports.

### apps/last-loop-lepin/api/src/punch/punch.service.ts:238

Bullet: `reviewer` checks that a workflow writing more than one table wraps the writes in one transaction owned by the service, and that a cascade DSQL will not enforce is written out explicitly.

```ts
export async function clearEditionPunchHistory(editionSlug: string): Promise<void> {
  await deleteAllEditionPunchesAndDidNotFinishesOutsideATransaction(editionSlug);
}
```

This is the service-side workflow of the finding above: two tables, no transaction. Its sibling
`clearEditionPunchHistoryWithin` (line 242) is the same work done correctly, which makes the
asymmetry the thing to fix rather than to document. Its only caller is
`apps/last-loop-lepin/api/src/__test/test-seed.service.ts:64`, so the blast radius is the seed
route, not the race — but it is application source under `api/src/`, not a test file, and the
bullet reads on the write, not on who calls it.

### apps/last-loop-lepin/api/src/punch/punch.service.ts:233

Bullet: `reviewer` checks that a workflow writing more than one table wraps the writes in one transaction owned by the service, and that a cascade DSQL will not enforce is written out explicitly.

```ts
  await insertPunch(punch);
  await deleteManualDidNotFinish(input.editionSlug, input.runnerSlug);
  return punch;
```

`catchupPunch` inserts into `loop_punches` and then deletes from `manual_did_not_finishes` — two
tables, one workflow, no transaction. If the second write fails the runner holds both a punch for
the loop and a manual did-not-finish, which `VOCABULARY.md:89` describes as mutually exclusive
states, and nothing retries it. This code is **not introduced by this branch** and the diff does
not touch it; it is reported because `punch.service.ts` has never been sealed
(`docs/standards/seals.jsonl` holds no entry for its path), so this is the file's first review and
the bullet applies to its content.

What would satisfy it: wrap both writes in the punch slice's own `runInOneTransaction`, passing the
executor to `insertPunch` and `deleteManualDidNotFinish` as required arguments.

### apps/last-loop-lepin/api/src/runner/runner.repository.ts:24

Bullet: review procedure step 4 — a file carrying `// @FollowsBlueprint <id>` is claiming to copy that blueprint; check that it does. (No ledger bullet covers annotation placement; the generators check that the id resolves, not that the claim is true.)

```ts
// @FollowsBlueprint repository-query
export async function deleteAllEditionRunners(
  executor: DatabaseExecutor,
  editionSlug: string,
): Promise<void> {
```

The new function was inserted between an existing annotation and its subject. In
`origin/main` that `// @FollowsBlueprint repository-query` line sat directly above
`listRunnersForEdition`, which returns an array of rows and is what the blueprint describes —
*"Each function returns rows, an array of rows, or a count"*
(`.claude/skills/blueprint/blueprint-index.md:165`). It now decorates a `void`-returning delete,
and `listRunnersForEdition` (line 32) carries no annotation at all. Nothing in the tag itself is
false enough for a generator to catch, which is why it is here.

What would satisfy it: move the annotation back above `listRunnersForEdition`. The delete needs no
tag; its punch-side twin, `deleteAllEditionPunchesAndDidNotFinishes`, carries none.

## Sealed

- `apps/last-loop-lepin/api/src/database/client.ts` — `DatabaseExecutor` (line 12) is derived from `Database['transaction']` through `Parameters`, not spelled out beside the thing it mirrors, which is the 03 bullet on derived types; it is the same union `11-database.md:88-90` describes. Nothing else in the file moved.
- `apps/last-loop-lepin/api/src/edition/edition.repository.ts` — `runInOneTransaction` (line 134) is the standard's shape verbatim: the owning repository lends the executor out, the service composes the other slices' *service* calls inside it, and no cross-slice repository import appears. The new `@Blueprint repository-owned-transaction` block describes what the code does, including why the executor is required rather than optional. `deleteEdition` now takes the executor as its first argument with no `?? getDatabase()` fallback. `findEditionBySlug` returns `null` and `getEdition` throws, matching the verb table; `rowToEdition` narrows field by field and parses the GPX blob with Zod rather than annotating it.
- `apps/last-loop-lepin/api/src/edition/edition.service.ts` — `removeSetupEdition` keeps the `setup` gate, then clears punches, roster and the edition row in one transaction. The cascade is complete against the schema, not just against the previous report: `runners`, `loop_punches` and `manual_did_not_finishes` are the only tables with an `edition_slug` column. It crosses the slice boundary through `clearEditionPunchHistoryWithin` and `clearEditionRoster`, both services, so the repository-import rule holds. No other function in the file writes more than one table.
- `apps/last-loop-lepin/api/src/runner/runner.service.ts` — `clearEditionRoster` is a one-line delegation taking the executor as a required argument, and "roster" is the word `VOCABULARY.md:265` defines for the runners of one edition rather than a new synonym. It reads no clock and derives nothing.

## Unclear

None.

## Outside the checklist

- `deleteAllEditionPunchesAndDidNotFinishesOutsideATransaction` names a mechanism, and a negative one: it says what the function is not inside. `01-naming.md:44-55` asks a function name to describe the result. The name reads as an admission, and the fix in the first finding removes the need for it.
- Nothing asserts the punch half of the cascade. `edition.service.test.ts` proves the roster is gone and that the slug comes back empty, and both new test names state a behaviour and a condition — but no test shows `loop_punches` or `manual_did_not_finishes` emptied by `removeSetupEdition`, which is the half that needed two extra repositories to reach.
- `11-database.md:95` still reads *"No application has that case today, so the shape below is the one a standards review arrived at on an application that did"*. This branch is that application. The paragraph can now point at `edition.repository.ts:134` and `edition.service.ts:213` instead of describing code from memory.
- `VOCABULARY.md:110-126` lists the edition's invariants, including that the same `setup` gate guards deletion, and does not yet say that deleting an edition takes its roster and its punch history with it. That is now a fact about the noun a reader would want.
- Deleting an edition leaves the runners' photos in S3 (`media.schema.ts` presigns uploads keyed on the edition and runner slug). Not a database cascade, so no bullet reaches it, but it is the fourth thing keyed on the slug.
- `getEditionOrNull` (`edition.service.ts:102`) and `getCurrentEdition` (line 153) both return `null` where the verb table reserves `get…` for the throwing form. Carried forward from the previous round's advisory rather than re-litigated: both are untouched by this branch and the suffix makes the first predictable.
