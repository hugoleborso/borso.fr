# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 1 file(s). Sealed: 0. Findings: 1.

`seal.ts verify --base origin/main` reported one uncleared file. Every other
file changed on this branch is still sealed under its current content, so this
round's scope is that one file, read in full.

## Findings

### apps/last-loop-lepin/site/src/lib/queries/editions.ts:13

Bullet: `reviewer` checks that a mutation whose full result the client already holds reconciles from the response rather than refetching, because an immediate read after a write can be served a pre-commit snapshot.

```ts
function refetchTheCurrentEditionProjection(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: editionKeys.current() });
}
```

Called from `onSettled` in both optimistic mutations:

```ts
    onSettled: () => {
      refetchTheCurrentEditionProjection(queryClient);
    },
```

(`useDeleteEdition`, line 116; `useTransitionEditionStatus`, line 157.)

Narrowing the invalidation from `editionKeys.all` to `editionKeys.current()`
takes the optimistically written list out of the blast radius, which is what
the rewritten lint rule now checks. The residue it hands to a reviewer is
whether `current` is a projection the client cannot derive, and here it is not.

`apps/last-loop-lepin/api/src/edition/edition.service.ts:149` selects the
current edition out of the very list the site already caches:

```ts
export async function getCurrentEdition(): Promise<RaceEdition | null> {
  const editions = await listEditions();
  const live = editions.find((edition) => edition.status === 'live');
```

and `getAllEditions` (`edition.service.ts:102`) is `return listEditions();`, so
`GET /api/editions` — the payload `onMutate` has just rewritten — carries every
row and field this selection reads. Nothing server-generated enters it: no
identifier, no derived timestamp, no parse. The status write's own response is
`return context.json({ slug, status });`
(`edition.controller.ts:102`) — literally the request echoed back, which is the
definition of a result the client already holds.

The consequence is the recorded one rather than a hypothetical.
`apps/last-loop-lepin/site/src/routes/AdminPage.tsx:59-60` reads that key while
the write is fired from a child of the same tree:

```tsx
  const currentEdition = useCurrentEdition();
  const edition = currentEdition.data?.edition ?? null;
```

and `FinishRacePrompt` — rendered from `selectEditionNeedingFinish(edition, …)`
on that same value — calls `useTransitionEditionStatus`. So the operator
finishes the race, `onSettled` fires a `GET /api/editions/current` against a
mounted query, and a Lambda on a DSQL connection that has not seen the commit
answers with `status: 'live'`, putting the prompt the operator just dismissed
back on screen.

Both hooks also carry `// @FollowsBlueprint query-optimistic-mutation`
(lines 86 and 121), whose description is explicit on this point: *"It then
stops: nothing here refetches, because the cache it just wrote is the answer."*
The follower does refetch.

What would satisfy the bullet: settle `current` from what the mutation already
knows instead of from a `GET`. For the transition, `onMutate`/`onSuccess` can
write the new status into `editionKeys.current()` when the slug matches, beside
the list write it already does. For the delete, the next current edition is the
selection above applied to the list `onMutate` just produced — extracting
`getCurrentEdition`'s ordering into a site-side `*.core.ts` (last-loop-lepin has
no `apps/<app>/domain/`) makes both sides read the same rule and removes the
read entirely. Either way the `onSettled` hook goes away rather than being
re-scoped a second time.

## Sealed

None. The one file in scope has a finding, so it stays unsealed and
`seal.ts verify` keeps failing until the refetch is resolved.

## Unclear

None.

## Outside the checklist

- `docs/standards/06-data-fetching.md` still says *"refetch that one key and
  write the reason on the line, as an `eslint-disable-next-line`"*. After the
  rule was rewritten to compare keys, a sibling-key refetch no longer triggers
  it, and `eslint.config.js:99` sets
  `linterOptions: { reportUnusedDisableDirectives: 'error' }` — so following
  that sentence now fails lint for the opposite reason. The paragraph needs to
  say that a sibling key passes on its own and that the reviewer, not a disable
  comment, is what checks the projection claim.
- `refetchTheCurrentEditionProjection` names its mechanism (`refetch…`) rather
  than its result, and reads awkwardly with the article inside the identifier.
  No reviewer bullet covers the verb `refetch`, so this changed no verdict; if
  the finding above is resolved by writing the cache instead, the name goes with
  it.
- The module is `queries/editions.ts` where `pragma`'s siblings are
  `*.queries.ts`. That is the `layer-marker:last-loop-lepin` budget in
  `docs/standards/convention-baseline.json`, which is gated by
  `convention-drift.ts --check`, not something for me to re-litigate here.
