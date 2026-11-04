# Technical validation — Setlist breaks

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (missing)
- Branch: claude/friendly-cray-ovcmqo
- Base: origin/main
- Run at: 2026-11-03T18:17:55Z
- Round: 2
- Reviewed: ace7d30871fb2921079af3bd8c6c89dab779fe94
- Touched workspaces: @borso-app/pragma (api, site)

Round 2 reads `git diff e6b644ddd5a55d41a1a31a2f350f07a3ae091956..HEAD` only (commits `6e6696e7` and `ace7d308`), and re-checks the nine blocking findings of [`technical-validation-2026-11-03-1745.md`](./technical-validation-2026-11-03-1745.md). The spec still has no Test strategy section, so 0 use cases are routed to /visual-validation. Every row below is in scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Spec amendment (Behaviour 7, Data shape 3) | The spec gained two claims in `ace7d308` with no plan and no Files-to-change list | docs/features/pragma/setlist-breaks/spec/spec.md:22-23, 37-40 | Spec amended after the plan; files taken from the diff. The plan is still absent, so nobody planned these two parts | UNVERIFIABLE |
| A02 | Behaviour 5 | A break never shifts a song number the assistant is shown (ambiguity hint) | apps/pragma/api/src/setlists/setlist-tool.core.ts:126-131 | `.toSorted((left, right) => left.position - right.position)` `.map((entry, songIndex) => ({ … candidate: describeEntry(entry, songIndex + FIRST_POSITION, songs) }))`, the same numbering as `projectEntriesForTool` at :74-79 (`position: songIndex + FIRST_POSITION`) | PASS |
| A03 | Data shape 3 (amended) | The undo of a song removal remembers where the breaks stood and, once the song is back, sends the full order | site/src/components/organisms/SetlistEditor.tsx:171-179; setlist-breaks.hook.ts:43-50, 63 | `const putBreaksBack = breakActions.rememberPlacement();` captures the render's pre-removal `breaks`; `onSuccess: removed.putBreaksBack` runs after the hook-level `onSuccess` settled the restored id into the cache; `const orderedIds = listItemIds(entryIds, placed); … reorder.mutate({ setlistId, entryIds: orderedIds }, …)`. Traced both round-1 cases: `A, B, [x], C` and `A, B, [x]` each end with x after B again | PASS |
| A04 | Data shape 3 (amended) | The full-order undo puts each break back whatever happened in the undo window | setlist-breaks.hook.ts:47, 63; api/src/setlists/setlist-break.core.ts:37-39 | `rememberPlacement: () => putBreaksBackTo(breaks)` sends the remembered break ids only. Failing case: setlist `A, B, [x], C`; remove B; add a break after A (`y`) before tapping **Undo** → the restore lands `A, [y], [x], B', C`, then `PUT /reorder` with `[A, B', x, C]` matches neither every id nor the song ids, `arrangeReorder` returns `null` and the controller answers `409 reorder-stale` (setlists.controller.ts:257). The member sees the break failure message and x stays before B. Deleting x in the window gives the same 409 with a message for nothing. Introduced: this branch. Fix size: one file (merge the remembered `songsBefore` into the current break list) | FAIL (non-blocking) |
| A05 | Behaviour 7 (amended) | My part offers no **Add a break after** | site/src/components/organisms/SetlistEntriesList.tsx:125 | `onAddBreakAfter={props.inFilteredMode ? undefined : props.onAddBreakAfter}` | PASS |
| A06 | Behaviour 7 (amended) | The Lineup view offers no **Add a break after** | SetlistViewContent.tsx (untouched) | The lineup grid renders no `SetlistEntryRow` and so no song more menu; the diff does not touch it | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A09 (ambiguity hint counts breaks) | `ace7d308` api/src/setlists/setlist-tool.core.ts:126-139; test setlist-tool.core.test.ts:163 `expect(matchEntryReference([encore, CREEP_ENTRY], SONGS, 'Creep')).toEqual({ … hint: '#1' … hint: '#2' })` with the encore at stored position 4 | PASS |
| R02 | A19 (undo moves the following break one song earlier) | `ace7d308` SetlistEditor.tsx:171-179, setlist-breaks.hook.ts:43-63, spec.md:37-40 (see A03; the remaining edge is A04, non-blocking) | PASS |
| R03 | B03 (knip fails on `deleteBreaksOfSetlistWithin`) | `6e6696e7` deletes the function from setlist-break.repository.ts; `pnpm knip` exits 0 | PASS |
| R04 | D10 (transition across a break untested) | `ace7d308` site/src/components/organisms/SetlistEntriesList.test.tsx:71 `it('shows a break between the songs it separates and offers no transition across it')`; `expect(stripsWithoutBreak).toBe(2); expect(countTransitionStrips()).toBe(1);` at :81-82 | PASS |
| R05 | D11 (My part with breaks untested) | `ace7d308` SetlistEntriesList.test.tsx:85 `it('shows no break and offers none in the My part view')`; `expect(document.querySelector('[data-setlist-break]')).toBeNull();` at :88 | PASS |
| R06 | D19 (undo with a break in the setlist untested) | `ace7d308` adds only `describe('listItemIds')` at setlist-breaks.core.test.ts:152, which interleaves ids given `songsBefore`. No test removes a song before a break and undoes it. Nothing pins that `rememberPlacement` captures the pre-removal breaks (SetlistEditor.tsx:171), nor that the restore's `onSuccess` sends the full order (SetlistEditor.tsx:179). Failing case for the proof: move `const putBreaksBack = breakActions.rememberPlacement();` to read the breaks cache after `withdrawSong`, and the suite stays green while `A, B, [x], C` → remove B → Undo ends `A, [x], B, C` again. The `test-hook-probe` blueprint shows a hook test is feasible here. Fix size: one test file | FAIL (blocking) |
| R07 | D21 (`breaks` in write responses unasserted) | `ace7d308` setlist-breaks.controller.test.ts:122 `expect(breaks).toEqual([{ ...setlistBreak, songsBefore: 1 }]);` (POST), :235 `expect(removedBody.breaks.map(…)).toEqual([[secondBreak.id, 1]])` (DELETE), :268 `expect(renamedBody.breaks.map((row) => row.label)).toEqual(['Tune the bass'])` (PUT) | PASS |
| R08 | D22 (vote close dropping breaks untested) | `ace7d308` voting.controller.test.ts:252 `it('drops the breaks of a setlist whose vote closes again')`; `expect(breaks.breaks).toEqual([]);` at :286 (see Notes on its precondition) | PASS |
| R09 | E07 (no concurrent proof for break writes) | `ace7d308` setlist-breaks.controller.test.ts:316 `it('keeps every position distinct when a break lands while a song is appended')`: two `POST /breaks`, one `POST /entries` and one `PUT /reorder` in one `Promise.all`; `expect(positions).toEqual([0, 1, 2, 3, 4, 5]);` at :356, which also pins the row count (3 seeded songs, 1 appended, 2 breaks) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <16 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B03 | knip | `pnpm knip` | exit 0, configuration hints only | PASS |
| B04 | No `any`; assertions only `as const` / `as unknown` | grep on changed sources | none found | PASS |
| B05 | `noUncheckedIndexedAccess` | read changed lines | `entryIds[0] ?? ''`, `closedOrder.entries[0]?.id`, `cached?.entries ?? []` | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed .ts/.tsx | none found | PASS |
| B07 | Standards checklist (03): "a derived type is derived" | read in full | `export type BreakToolRequest = Omit<z.infer<typeof setlistBreakSaveToolInputSchema>, 'setlist'>;` at api/src/setlists/setlist-tool.core.ts:209, and `setlist` is the key of `setlistReferenceShape` (setlists.schema.ts:171) | PASS |
| B08 | Standards checklist (02): `.core.ts` or `.utils.ts` | read in full | `setlist-breaks.utils.ts` renamed `setlist-breaks.core.ts`, marker `// @FollowsBlueprint core-projection` at :16; all five import sites follow | PASS |
| B09 | Standards checklist (01): names from the vocabulary; verb returns what it says | read in full | `breakItems` at setlist-break.core.ts:27; `listItemIds` returns the item ids; `rememberPlacement` returns the restorer | PASS |
| B10 | Standards checklist (01): an invariant carries a `Held by:` line | read apps/pragma/VOCABULARY.md block | `Held by: … voting.controller.test.ts › drops the breaks of a setlist whose vote closes again` and `Held by: … setlist-breaks.controller.test.ts › keeps every position distinct when a break lands while a song is appended` match the test names at voting.controller.test.ts:252 and setlist-breaks.controller.test.ts:316 | PASS |
| B11 | Standards checklist (06): a mutation reconciles from its response | read in full | the undo's reorder updates the break cache through `following.followReorder(setlistId, orderedIds, onFailure)` (setlist-breaks.hook.ts:48) and rolls back on error; no refetch | PASS |
| B12 | Standards checklist (10): test names state behaviour and condition | read new tests | all five new `it(…)` names state a behaviour and its condition | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed e6b644dd --coverage --coverage.reportsDirectory=<scratchpad>/coverage` | 0: 8 files, 59 tests; coverage 100% statements (148/148), branches (72/72), functions (64/64), lines (114/114) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm run test:e2e --changed e6b644dd` (from apps/pragma, after `local-postgres.sh start pragma`) | 0: 44 files, 415 tests. A verbose run of the two touched files confirmed the new vote-close and concurrent tests ran and passed | PASS |
| C03 | Pure-file siblings | enumerate renamed/new pure files | `setlist-breaks.core.ts` → `setlist-breaks.core.test.ts`, picked up by the core project at 100% | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 5: the assistant's ambiguity hint numbers songs only | `it('numbers the candidates by song order, whatever the stored positions and their gaps')` at api/src/setlists/setlist-tool.core.test.ts:163; `{ id: 'entry-9', label: 'Creep', hint: '#2' }` at :169 for an entry stored at position 4 | PASS |
| D02 | Behaviour 7 (amended): My part offers no **Add a break after** | SetlistEntriesList.test.tsx:85; `expect(screen.queryByRole('button', { name: 'Add a break after', hidden: true })).toBeNull();` at :89. `Menu` renders its items inside a closed `<dialog>` (Menu.tsx:50-79), so the query would find the item if the prop were still passed | PASS |
| D03 | Behaviour 7 (amended): Lineup offers no **Add a break after** | **structural:** the lineup grid renders no `SetlistEntryRow`, so it has no song more menu; SetlistViewContent.tsx is untouched | PASS |
| D04 | Data shape 3 (amended): the undo of a removal puts each break back | (none found). See R06 | FAIL (blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Server write paths in this diff | Check-then-write | `git diff e6b644dd..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` touches only setlist-break.repository.ts, and only to delete `deleteBreaksOfSetlistWithin`. The undo's new client call goes through the existing `PUT /reorder`, held by `didClaimSetlistWithin` (setlist-entry.service.ts:152) and proved concurrent by R09 | PASS |
| E02 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` over changed files: none. `NO_BREAK` in setlist-breaks.hook.ts is a frozen empty constant | PASS |

## Blocking findings

- R06 / D04: no test removes a song before a break and undoes it. Only the pure `listItemIds` is tested, so the capture of the pre-removal breaks and the full-order reorder after the restore are unpinned.

## Non-blocking findings

- A04: a break added or deleted between a removal and its undo makes the undo's full-order reorder answer `409 reorder-stale`, shows the break failure message, and leaves the remembered break one song early.

## Notes

- A01 UNVERIFIABLE: `plan/plan.md` is still absent and the spec has no Files-to-change or Test-strategy section, so the two amendments in `ace7d308` were taken from the diff. The commit dismisses round-1 A00 because "no separate plan was written for this size". The operator decides whether that disclosure goes in the PR body.
- The vote-close test (voting.controller.test.ts:252) never asserts that its `POST /breaks` answered 201 before the second close. If that insert were refused, `expect(breaks.breaks).toEqual([])` would still pass. Reading `insertBreak` (setlist-break.service.ts:46-73), nothing refuses a break on a closed setlist, so the test likely holds today (inferred). Should it assert the 201 or the break list before the close?
- The concurrent test (setlist-breaks.controller.test.ts:316) asserts the final positions but not the four statuses. A refused write would surface as a shorter position list, except the reorder, whose 409 is an allowed outcome.
- Round-1 B12 (repository-owned transactions) was dismissed in `ace7d308` with a reason. Round 2 does not re-check non-blocking findings.

## Verdict: FAIL
