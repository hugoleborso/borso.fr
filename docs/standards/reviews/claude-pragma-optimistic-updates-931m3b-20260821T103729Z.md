# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 15 file(s). Sealed: 14. Findings: 1.

## Findings

### apps/last-loop-lepin/site/src/lib/queries/editions.ts:149

Bullet: "`reviewer` checks that a mutation whose full result the client already holds reconciles from the response rather than refetching, because an immediate read after a write can be served a pre-commit snapshot."

```ts
    onMutate: async (variables) => {
      const listKey = editionKeys.list();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<CachedEditionList>(listKey);
```

`useTransitionEditionStatus` (line 136) and `useDeleteEdition` (line 104) reconcile
`editionKeys.list()` and nothing else. The removed `refetchEditionProjectionsTheClientCannotPredict`
invalidated `editionKeys.all`, whose prefix also matched `editionKeys.current()`, so dropping it
left that key with no writer and no reader-side refresh:

- `editionKeys.current()` is a server-side projection over every edition's status —
  `apps/last-loop-lepin/api/src/edition/edition.service.ts:149` picks the `live` edition, else the
  earliest `setup`, else the latest `finished`.
- The admin setup screen renders off that key, not off the list:
  `apps/last-loop-lepin/site/src/routes/AdminPage.tsx:59` `const currentEdition = useCurrentEdition();`,
  passed at line 107 into `SetupPanel`, which at `SetupPanel.tsx:23` and `:32` chooses between
  `EditionEditForm` and `StartedEditionCard` purely on `edition.status`
  (`edition-form.core.ts:119` / `:125`).
- Nothing else refreshes it: `main.tsx:17` sets `refetchOnWindowFocus: false`, `useCurrentEdition`
  carries no `refetchInterval`, and the only surviving `invalidateQueries` calls in the app are in
  `useCreateEdition`, `useReplaceEdition`, `useCatchupPunch` and `runners.ts:69`.

Result: pressing *start race* on the admin panel writes the list, and the panel the operator is
looking at keeps showing the setup form until the page is left and remounted. Deleting the current
edition leaves its card on screen the same way.

The standard the bullet comes from names the fix on the line above the one this branch deleted:
*"If a key really does hold a projection no client can derive, refetch that one key and write the
reason on the line, as an `eslint-disable-next-line`. A helper named for the scoping is not enough."*
Either refetch `editionKeys.current()` alone with that reason, or predict it in `onMutate` the way
the list is predicted — a transition of the edition that is already `current` keeps it current with
the new status, which is fully derivable.

## Sealed

- apps/last-loop-lepin/site/src/lib/queries/optimistic.utils.ts — pure module, `replaceEntityBySlug` only.
- apps/last-loop-lepin/site/src/lib/queries/punches.ts — the removed `onSettled` invalidated the same
  `forRunner` key its `onMutate` writes, so nothing lost a writer; `useCatchupPunch` stays pessimistic
  and its refetch is a punch the client cannot predict.
- apps/pragma/site/src/lib/queries/bars.queries.ts — insert settles from `data.bar`; `barKeys.byId` has
  no `useQuery` behind it, so the dropped `barKeys.all` invalidate left no reader stale.
- apps/pragma/site/src/lib/queries/instruments.queries.ts — `list()` is the only key under `instrumentKeys.all`.
- apps/pragma/site/src/lib/queries/mastery.queries.ts — both writes reconcile `defaults()`, the key the
  removed invalidate named; `overridesOf` is untouched by either write.
- apps/pragma/site/src/lib/queries/members.queries.ts — `instrumentsOf` was inside the removed
  `memberKeys.all` invalidate but no member write changes a roster; `useAssignMemberInstruments` now
  predicts that key from the cached instrument list.
- apps/pragma/site/src/lib/queries/optimistic.utils.ts — new `utils-settle-temporary-entity` blueprint;
  the swap is keyed on the temporary id, as its description claims.
- apps/pragma/site/src/lib/queries/sessions.queries.ts — update writes both `list` and `byId`, delete
  `removeQueries` the detail; both keys the removed invalidate covered.
- apps/pragma/site/src/lib/queries/setlist-entries.queries.ts — the append settles from `data.entry`, and
  `appendEntry` (`setlists.service.ts:105`) derives exactly `id` and `position` server-side, which is what
  `settleAppendedEntry` takes.
- apps/pragma/site/src/lib/queries/setlists.queries.ts — the four newly optimistic writes snapshot and
  restore every summary cache through one pair of helpers; `useCreateSetlist` stays pessimistic and
  writes from the response.
- apps/pragma/site/src/lib/queries/setlists.utils.ts — `settleAppendedEntry` added, keyed on the temporary id.
- apps/pragma/site/src/lib/queries/songs.queries.ts — carries both mutation blueprints; the insert writes
  `byId` from the response and the update writes both keys.
- apps/pragma/site/src/lib/queries/transitions.queries.ts — the pair key and the list are both predicted
  and both restored; the client-invented `updatedAt` is never rendered.
- apps/pragma/site/src/lib/queries/transitions.utils.ts — `upsertTransitionComment`, ordered pair, tested
  in both directions.

Across all fourteen: verb promises hold (`selectSetlistsNotOnSession` filters, `build…` returns the row
it names, `snapshot…` returns the cache), no boolean name is negated, no file carries a prose comment or
a new `eslint-disable`, every response and request type in the diff is derived through the Hono client,
and no `useEffect`, route, style variant or i18n key changed.

## Unclear

None.

## Outside the checklist

- `apps/pragma/site/src/lib/queries/instruments.queries.ts:35` and `mastery.queries.ts:32` write their
  mutation body types by hand (`{ name: string; family: InstrumentFamily }`) where `bars`, `songs`,
  `sessions` and `setlist-entries` derive them with `Parameters<typeof api…$post>[0]['json']`. Not raised
  as a finding: the body is checked against the client at the `json:` argument, and the identical shape
  was sealed five times on `setlists.queries.ts`. Deriving it would still be the cheaper read.
- Appending or deleting a setlist entry leaves `songCount` on `setlistKeys.list()` stale. It predates this
  branch, the previous `onSettled` did not refresh it either, and pragma's 30 s `staleTime` heals it on the
  next visit to the catalogue — but it is the same shape as the finding above.
- The `query-uncached-mutation` blueprint says its correctness rests on "the module header naming the query
  that does surface the write". `punches.ts` has no such header, and `borso/no-comments` would reject one.
  A reader cannot check the condition the blueprint says makes the pattern honest.
- `apps/last-loop-lepin/site/src/lib/queries/editions.ts` and `punches.ts` carry no layer suffix, unlike
  every pragma sibling. That is the `layer-marker:last-loop-lepin` budget in `convention-baseline.json`,
  not a reviewer call.
