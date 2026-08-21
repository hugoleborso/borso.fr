# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: PASS
Ledger: a71d330af564
Reviewed: 2 file(s). Sealed: 2. Findings: 0.

`seal.ts verify --base origin/main` named the two files this round covers; the
other thirteen reviewable files in the diff were already sealed against the
current ledger and their current content, and `verify` now reports all fifteen
sealed. Both earlier rounds' findings are cleared:

- Round 1 (`…103729Z`) — `editionKeys.current()` had lost its only writer, so the
  admin panel kept rendering the setup form after *start race*. Both mutations now
  call `refetchTheCurrentEditionProjection`, which invalidates `current()` alone,
  with the reason on the line. That is the shape standard 06 prescribes: *"If a key
  really does hold a projection no client can derive, refetch that one key and write
  the reason on the line."*
- Round 2 (`…110500Z`) — the hand-written `CachedEdition` / `CachedPunch` mirrors are
  gone from both files, replaced by `InferResponseType` and
  `Parameters<typeof api…>[0]['json']`. The note in that round asked for both files
  to be fixed and re-sealed together; they were.

## Findings

None.

## Sealed

- `apps/last-loop-lepin/site/src/lib/queries/editions.ts` — the two
  `no-refetch-of-optimistically-written-query` exceptions state a checkable claim, and
  it checks out: `onMutate` writes `editionKeys.list()` (`['editions','list']`) only,
  the refetch names `editionKeys.current()` (`['editions','current']`), and the reason's
  description of the projection — *live, else earliest setup by `startsAt`, else latest
  finished by `endsAt`* — is `getCurrentEdition` at
  `apps/last-loop-lepin/api/src/edition/edition.service.ts:149-161`, line for line.
  `useCreateEdition` and `useReplaceEdition` stay pessimistic because the server runs
  `parseGpx` on the body (`edition.service.ts:69`, `:191`), which is the *"server computes
  something"* case the standard reserves pessimistic for. `CachedEditionList` is
  `InferResponseType<typeof api.api.editions.$get>` and the controller returns
  `{ editions }` (`edition.controller.ts:29`), so the `old.editions` writes are typed by
  the real response rather than beside it.
- `apps/last-loop-lepin/site/src/lib/queries/punches.ts` — `useVoidPunch` now writes
  `forRunner` in `onMutate` and refetches nothing, which is the optimistic shape.
  `useCatchupPunch` stays pessimistic: `catchupPunch` (`punch.service.ts:203`) generates
  the id, derives `finishedAt` from `lastInstantOfLoop(edition, loopIndex)` and stamps
  `correctedAt` from `now`, none of which the client can name before the request. The
  two `query-uncached-mutation` followers hold up because no punch list is mounted when
  either fires (`PunchPanel`, `DidNotFinishPanel` vs `CorrectionPanel` /
  `RunnerProfilePage`) and `main.tsx:14-21` sets no `staleTime`, so the next mount
  refetches. `VoidPunchVariables` stays hand-written correctly — it is a cache-key
  argument, not a request body; the request sends `param: { id }` only.

## Unclear

None.

## Outside the checklist

- `apps/last-loop-lepin/site/src/lib/queries/punches.ts:126` — the `@BlueprintDescription`
  on `query-uncached-mutation` rests the pattern's correctness on something this module
  does not have: *"What makes this correct rather than forgetful is the module header
  naming the query that does surface the write, which for a punch is the standings poll."*
  There is no module header in `punches.ts` (line 1 is an import, line 5 the
  `@FollowsBlueprint query-module` marker). The text is unchanged from `origin/main`, so
  it is not this branch's doing, and a `@Blueprint` block is a machine-read annotation
  rather than a comment, so no ledger bullet reaches it. Worth fixing at the source: five
  followers copy a pattern whose stated safeguard is absent from its own example.
- The two `eslint-disable-next-line` reasons in `editions.ts` (`:116`, `:158`) are the
  same 300-character sentence twice. Both are true and both are needed where they sit —
  the rule wants the reason on the line — but if a third caller of
  `refetchTheCurrentEditionProjection` appears, the sentence will be in three places and
  will start to drift.
