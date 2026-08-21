# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 6 file(s). Sealed: 5. Findings: 1.

## Findings

### apps/last-loop-lepin/api/src/edition/edition.service.ts:207

Bullet: `reviewer` checks that a workflow writing more than one table wraps the writes in one transaction owned by the service, and that a cascade DSQL will not enforce is written out explicitly.

```ts
export async function removeSetupEdition(slug: string): Promise<void> {
  const existing = await getEdition(slug);
  if (existing.status !== 'setup') throw new EditionNotInSetupError(slug);
  await deleteEdition(slug);
}
```

`deleteEdition` is a single-table delete — `apps/last-loop-lepin/api/src/edition/edition.repository.ts:125` reads
`await getDatabase().delete(editionsTable).where(eq(editionsTable.slug, slug));` — and four tables key rows on
`edition_slug` with no foreign key, because DSQL enforces none: `runner.schema.ts:9`, `punch.schema.ts:22`,
`punch.schema.ts:40` and `media.schema.ts:8`. Runners are the reachable case: `createRunner`
(`runner.service.ts:32`) has no edition-status gate, so a `setup` edition holds a roster, and the delete leaves it
behind. The rows are not merely orphaned — `runnersTable`'s primary key is `(editionSlug, slug)`
(`runner.schema.ts:15`) and `createEdition` allows the slug to be taken again, so re-creating the edition under the
same slug silently returns the old roster from `listRunnersForEdition` (`runner.repository.ts:25-27`).

What would satisfy it: write the cascade out, in the shape `docs/standards/11-database.md:92-119` gives for a cascade
that crosses a slice boundary — the owning repository exports `runInOneTransaction(work)`, the service deletes the
dependent rows and the edition row inside it — since `borso/no-cross-slice-repository-imports` stops
`edition.service.ts` calling `runner.repository.ts`. `docs/adr/0006-cascade-on-delete-via-json-blob-scrub.md` is the
recorded decision for the same problem on `pragma`. Note this is not code the branch touched: the diff on this file is
only `getCurrentEdition` delegating to `@domain/edition-selection.core`. The file has never been sealed
(`docs/standards/seals.jsonl` holds no entry for its path), so this is its first review and the bullet applies to it now.

## Sealed

- `apps/last-loop-lepin/domain/edition-selection.core.ts` — `.core.ts` over `.utils.ts` is right: "the current edition" is a term the race uses and `VOCABULARY.md:110-126` already defines it. The workspace-level `domain/` placement meets ADR-0010's condition, with a real caller on each side (`edition.service.ts:151`, `editions.ts:22`). `select…` returns what the rule chose, matching the verb table. `instantOf` passes an argument to `new Date`, so the file reads no clock. The third branch dropping the old `status === 'finished'` filter is behaviour-preserving, because the two branches above return for `live` and `setup` and those are the only other values (`edition.types.ts:2`, `VOCABULARY.md:134`).
- `apps/last-loop-lepin/site/src/lib/queries/editions.ts` — the two `onSettled` refetches are gone and both optimistic mutations now write `editionKeys.current()` from the list they just wrote, which is exactly the derivable-projection path `docs/standards/06-data-fetching.md:123-128` asks for ahead of a refetch. `useCreateEdition` and `useReplaceEdition` keep `onSuccess` invalidation, which line 95 of that standard is the pessimistic shape, and both are genuinely unpredictable client-side (the server parses the GPX and derives `sunriseAt`/`sunsetAt`). Every cache and variables type is now derived — `InferResponseType` and `Parameters` over the Hono client — where the file previously spelled them by hand, which is the 03 bullet on derived types.
- `apps/last-loop-lepin/vite.config.ts` — adds the `@domain` alias only; the site build now resolves the shared selection.
- `apps/last-loop-lepin/vitest.config.ts` — still a faithful copy of `workspace-test-config` (`apps/pragma/vitest.config.ts:18`): two projects, explicit `sequence.groupOrder`, coverage above them. `domain/**/*.core.ts` is added to the coverage globs and `domain/**/*.core.test.ts` to the `core` project, so the new file is inside the 100% gate rather than beside it.
- `apps/last-loop-lepin/vitest.mutation.config.ts` — same addition on the mutation side; `stryker.config.js:5` lists `domain/**/*.core.ts` in `mutate`, so the two halves agree.

## Unclear

None.

## Outside the checklist

- `apps/last-loop-lepin/domain/edition-selection.core.ts:1` declares `EditionStatusName = 'setup' | 'live' | 'finished'`, which is now the third hand-written copy of that union alongside `apps/last-loop-lepin/api/src/edition/edition.types.ts:2` (`EditionStatus`) and `apps/last-loop-lepin/api/src/__test/test-seed.core.ts:4`. The domain copy is defensible — `domain/` must not import from `@api`, and the union is the generic constraint both sides satisfy — but the cleanest direction is the reverse: let `EditionStatus` alias the domain type so the union has one source. No bullet covers it.
- `apps/last-loop-lepin/api/src/edition/edition.service.ts:99` names a function `getEditionOrNull` while the verb table (`docs/standards/01-naming.md`) reserves `get…` for the throwing form. I did not treat it as a finding: the `OrNull` suffix makes the return predictable, which is what the table is for, and the function is untouched by this branch. It is a plain alias for `findEditionBySlug`, so `findEdition` would say the same thing with the table's own verb.
- `apps/last-loop-lepin/site/src/lib/queries/editions.ts` carries no layer suffix, where `pragma` uses `<domain>.queries.ts`. That is tracked as a budget rather than a finding: `docs/standards/convention-baseline.json:12` records `"layer-marker:last-loop-lepin": 6` and `convention-drift.ts --check` only fails on an increase.
- `apps/last-loop-lepin/VOCABULARY.md:125` still describes `getCurrentEdition` correctly, and the rule it describes is unchanged. It could gain a line saying the selection now lives in `domain/` and the site applies it optimistically, since that is the fact a reader of the front end would want from the vocabulary.
