# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: FINDINGS
Ledger: a71d330af564
Reviewed: 3 file(s). Sealed: 2. Findings: 1.

The other twelve reviewable files in the diff are still sealed against the current
ledger and their current content (`seal.ts verify --base origin/main`), so this round
covers only what the last commits unsealed.

## Findings

### apps/last-loop-lepin/site/src/lib/queries/editions.ts:34

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from
`$inferSelect`, a request body from `z.infer`, and a response from the Hono client,
rather than being written out by hand beside the thing it mirrors."

```ts
export type EditionStatusName = 'setup' | 'live' | 'finished';

interface CachedEdition {
  readonly slug: string;
  readonly status: EditionStatusName;
}

interface CachedEditionList {
  readonly editions: readonly CachedEdition[];
}
```

`CachedEditionList` is the declared type of the cache this branch's optimistic writes
depend on — `getQueryData<CachedEditionList>(listKey)` at `:123` and `:160`,
`setQueryData<CachedEditionList>` at `:124` and `:161`. The value actually held under
`editionKeys.list()` is `useEditionList`'s response (`:62`), which is
`api.api.editions.$get` → `getAllEditions` (`edition.service.ts:102`) →
`readonly RaceEdition[]`, and `RaceEdition` (`edition.types.ts:15`) carries `slug`,
`displayName`, `startsAt`, `endsAt`, `sunriseAt`, `sunsetAt`, `intervalMinutes`, `gpx`
and `status`. `EditionStatusName` (`:34`) is likewise a hand copy of
`EditionStatus` (`edition.types.ts:2`).

Standard 06 states the rule the bullet enforces: *"every request and response type comes
from the Hono client … it never declares a response type by hand"*, and standard 03:
*"A hand-written copy of any of the four drifts away from its source."* The drift here is
silent and lands on this branch's own subject: rename `slug` on the API and
`replaceEntityBySlug(old.editions, variables.slug, …)` (`:165`) still compiles, matches
nothing, and the status transition simply stops appearing — green types, dead optimism.

`InferResponseType<typeof api.api.editions.$get>` would type both call sites, as
`instruments.queries.ts:13` and `mastery.queries.ts:14` do in this same diff. The three
`*Variables` interfaces (`:16`, `:25`, `:36`) mirror request bodies the client also types;
they are checked structurally at their `json:` arguments, so they are the weaker half of
the same point, but `Parameters<typeof api.api.admin.editions.$post>[0]['json']` is the
cheaper read either way.

Note for whoever fixes it: `punches.ts:35-41` carries the identical `CachedPunch` /
`CachedPunchList` pattern and is currently sealed. That seal was taken on content with the
same problem; fix both files and re-seal both, rather than treating the two differently.

## Sealed

- apps/pragma/site/src/lib/queries/instruments.queries.ts — `InstrumentCreateVariables` and
  `InstrumentUpdateVariables` now derive through `Parameters<typeof api…>[0]['json']` and
  `InstrumentsListResponse` through `InferResponseType`, which is what the previous round
  raised outside its checklist. The insert follows `query-optimistic-insert`: a client
  `crypto.randomUUID()` in `onMutate`, `settleTemporaryEntity(…, context.temporaryId,
  data.instrument)` in `onSuccess`, no refetch anywhere. Update and delete follow
  `query-optimistic-mutation` — snapshot, predict, restore verbatim on error, stop.
  `listInstruments` returns a list, `isResponseSuccessful` is not a negated boolean, and the
  only comments are `@Feature` and `@FollowsBlueprint`.
- apps/pragma/site/src/lib/queries/mastery.queries.ts — `MasteryDefaultVariables` now derives
  from the `$put` body. Both writes reconcile `masteryKeys.defaults()` only, neither
  invalidates nor refetches, and `overridesOf` is untouched by either. `upsertMasteryDefault`
  and `withoutMasteryDefault` (`mastery.utils.ts:13`, `:24`) do what their verbs promise —
  replace-or-append, and filter out.

## Unclear

None.

## Outside the checklist

- `editions.ts:137` and `:179` — the disable reason clears the bullet in 12 (it is a claim
  about that line, and I checked its two load-bearing parts: `current()` is not a key either
  `onMutate` writes, and `getCurrentEdition` at `edition.service.ts:149` is exactly live →
  earliest `setup` by `startsAt` → latest `finished` by `endsAt`). One clause reads true only
  of the file's own narrowed type: *"the cached list rows carry a slug and a status only"* is
  what `CachedEdition` declares, not what the cache holds. Deriving the type per the finding
  above will make that clause false on its face and the sentence will need rewording — the
  honest version is that deriving `current()` on the client would mean reimplementing the
  server's ordering, and no admin screen mounts `useEditionList` at all (`AdminPage.tsx:59`
  takes `useCurrentEdition` alone), so the list cache is usually absent when these mutations
  run.
- The same reason string is duplicated verbatim on two lines. Standard 12 says a disable that
  repeats itself across many files is a scoping decision in disguise; twice in one file is not
  that, and there is no way to write it once, so this is an observation and not a finding.
- `editions.ts` and `punches.ts` still carry no layer suffix, unlike every pragma sibling.
  That is the `layer-marker:last-loop-lepin` budget in `convention-baseline.json`, not a
  reviewer call — repeated from the previous round because it is still true.
