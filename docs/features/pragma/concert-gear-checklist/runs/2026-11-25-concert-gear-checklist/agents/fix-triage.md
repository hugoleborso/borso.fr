# Fix triage, technical validation round 1

Both blocking findings are fixed. Five of the eight non-blocking findings are fixed too. The three left are dismissed below, each with its reason.

## Blocking

| Finding | Decision | What changed |
|---|---|---|
| B10, a new entry on the `import/no-cycle: off` list | Fixed | The two cascade steps, `releaseGearOfMemberBeingDeleted` and `deleteGearOfSessionBeingDeleted`, moved into `gear-items-cascade.service.ts`. That service imports only its own repository. `sessions.repository.ts` and `members.repository.ts` import it instead of `gear-items.service.ts`, so the cycle is gone. The entry is removed from `.oxlintrc.json`, and `oxlint --type-aware` is clean on the three slices (measured). A repository calling another slice's service is the shape `docs/standards/11-database.md` documents for `deleteSessionWithCascade` and `deleteMemberWithLinks`, the same shape `takes` and `tasks` use there. The finding's other half, standard 04's "a repository imports nothing from another slice", is the cost that section names. Removing it means moving both whole deletion cascades into services, which belongs to those slices and not to this feature. |
| C03, three surviving mutants | Fixed | `gear-status.core.ts:68`: `concert.id !== target.id` was an equivalent mutant, because the target's own date is never strictly before itself. The clause is removed, and the test "never picks the target itself" still holds the rule. `gear-status.core.ts:20`: a new assertion, `isGearHoldingUpdateValid({ memberId: null })` is `false`, kills it. `gear-item-tool.core.ts:20`: the mutant is equivalent, because `nameEntity` answers the id it was given when no member matches, so a null id comes back as null. The type checker needs the guard, so it stays, with a `Stryker disable next-line` comment that gives the reason, the same form as five other pragma core files. `scripts/mutate-changed.sh origin/main apps/pragma` reports 100.00 (measured). |

## Non-blocking

| Finding | Decision | Reason or change |
|---|---|---|
| B11, the INVARIANTS prose | Fixed | The first rule now says that reading, creating and copying answer `not-a-concert`, and that a create or a copy claims the concert. Update and delete stay under their own `not-found` rule. |
| B12, the route draws the section list itself | Dismissed for this round | Extracting a gear list organism moves the page's whole visible layout. The checks that would catch a regression there, the 375 px screenshots and `/visual-validation`, run after this round. Doing it now would ship a layout change no fix round reviews by eye. The finding is valid, and it fits best as part of the visual-validation fix round if the operator wants it. |
| B13, `getGearChecklist` never throws | Fixed | It is renamed `readGearChecklist` in the service and its controller. |
| B14, `GearToolUpdate` restates `GearItemUpdateInput` | Fixed | The interface is deleted. `buildGearToolUpdate` returns `GearItemUpdateInput` through `import type`. |
| E02, a create that reuses another concert's id answers that concert's item | Fixed | `createGearItem` answers `id-taken` when the row read back belongs to another concert, and the controller maps it to `409 {"error":"id-taken"}`. The back-e2e test "refuses a create whose id already names an item of another concert" holds it, and INVARIANTS names that test. |
| E03, E05, E07, concurrent proofs | Dismissed | Each rule is held by a key or a row claim that the report itself grades PASS (E01, E04, and the claim behind E07). E06 already proves the same claim-then-write shape concurrently with `runSecondWhileFirstWaitsOnHold`. Three more tests would prove the same mechanism on the same row lock three more times. |
