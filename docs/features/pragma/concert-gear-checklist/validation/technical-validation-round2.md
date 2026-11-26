# Technical validation — A week before a concert, members see which gear the band has, asks the venue for, or still has to find

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/busy-lamport-v71cov
- Base: origin/main; round 2 diffs from c4919b3b9e85bbd1561c5d3af8c937502d29e8f0
- Run at: 2026-11-26T08:34:58Z
- Round: 2
- Reviewed: 5d29bdccb29fd1e9e77ce7214e337e1da46d6ce1
- Touched workspaces: @borso-app/pragma (api, domain), root `.oxlintrc.json`

Round 2 reads one commit, `5d29bdccb fix(pragma): break the gear import cycles and kill the surviving mutants`, over 11 code files plus 3 run documents. No merge of `main` sits above the base. HEAD stayed at the reviewed SHA through every run. The commit carries no new scope beyond the fixes, so categories A and D get no new rows except the new `409 id-taken` behaviour. The commit message says "The triage of every finding is in runs/2026-11-25-concert-gear-checklist/agents/fix-triage.md", a file the same commit adds. Its dismissals are graded here as dismissals carried by that commit.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A25 | INVARIANTS (round-1 E02 fix) | A create whose id names an item of another concert is refused with `409 id-taken` and writes nothing to the target | gear-items.service.ts:134-138; gear-items.controller.ts:57 | `await insertGearItemOnceWithin(executor, { ...input, sessionId, position });` · `if (writtenItem.sessionId !== sessionId) return { kind: 'id-taken' };` · `if (outcome.kind === 'id-taken') return context.json({ error: 'id-taken' }, 409);`. The MCP path (`addGearItemFromTool`, gear-items.service.ts:223-233) uses a fresh `randomUUID()` and forwards every non-ok kind as `refused` (gear-items-tools.controller.ts:30) | PASS |
| A26 | B13 fix | `getGearChecklist` renamed, behaviour unchanged | gear-items.service.ts:113; gear-items.controller.ts:24 | `export async function readGearChecklist(sessionId: string): Promise<GearChecklistOutcome>` · `const outcome = await readGearChecklist(context.req.valid('param').sessionId);` | PASS |
| A27 | `selectGearCopySource` clause removed | The target itself is still never the copy source | domain/gear-status.core.ts:66-68 | `(concert) => concert.gearItemCount > 0 && concert.date.getTime() < target.date.getTime(),`. The strict `<` excludes the target, whose date equals its own | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | B10 (blocking), new `import/no-cycle: off` entry | `5d29bdccb` .oxlintrc.json:1031 drops `"apps/pragma/api/src/gear-items/gear-items.service.ts",`. New `gear-items-cascade.service.ts` imports only `../database/client` (type) and `./gear-items.repository`. `sessions.repository.ts:4` and `members.repository.ts:18` now import `'../gear-items/gear-items-cascade.service'`. `pnpm exec oxlint --type-aware` on the 10 changed `.ts` files, the service included, exits 0 with the entry gone | PASS |
| R02 | B10, its second half (standard 04, "a repository imports nothing from another slice"), dismissed in fix-triage.md as the shape standard 11 documents | Claim checked: docs/standards/11-database.md:97-104 reads "`deleteSessionWithCascade` in `sessions.repository.ts` and `deleteMemberWithLinks` in `members.repository.ts` each open the transaction themselves and call other slices' services inside it … The cost is that a repository then depends on another slice's service." The two new imports follow the takes and tasks imports already in those files. The claim holds | PASS |
| R03 | C03 (blocking), three surviving mutants | `scripts/mutate-changed.sh c4919b3b9e85bbd1561c5d3af8c937502d29e8f0 apps/pragma` mutates the two files that held the survivors: `Final mutation score of 100.00 is greater than or equal to break threshold 100`, 118 killed, 0 survived, exit 0. gear-status.core.ts:20 killed by the new assertion `expect(isGearHoldingUpdateValid({ memberId: null })).toBe(false);` (gear-status.core.test.ts:41). gear-status.core.ts:68 removed as equivalent (A27). gear-item-tool.core.ts:21 disabled with a reason | PASS |
| R04 | C03, the `gear-item-tool.core.ts` survivor dismissed as equivalent | Claim checked: `nameEntity` at instruments/lineup-names.core.ts:37-38 is `return entities.find((entity) => entity.id === id)?.name ?? id;`, so a `null` id matches no member and comes back as `null`, the same answer as the guard. The `// Stryker disable next-line ConditionalExpression: …` form matches eight other pragma files (`grep -rn 'Stryker disable' apps/pragma`). The claim holds | PASS |
| R05 | B12 (non-blocking), dismissed "for this round" | Claim checked: CLAUDE.md "`/visual-validation` runs once, at the end", so no eye review follows this commit. The finding stays open and non-blocking, as round 1 typed it | PASS |
| R06 | E03, E05, E07 (non-blocking), dismissed because "E06 already proves the same claim-then-write shape concurrently with `runSecondWhileFirstWaitsOnHold`. Three more tests would prove the same mechanism on the same row lock three more times." | Claim checked and false. E06's test (gear-items.controller.test.ts:394-420) holds `holdGearItemRow(created.item.id)` and races a `PUT` against a member `DELETE`. Neither request calls `didClaimConcertWithin` (the session-row claim E05 and E07 rest on) or `insertGearItemOnceWithin` (the primary-key conflict E03 rests on). `grep -rln didClaimConcertWithin apps/pragma/api/src` finds it only in sessions.repository.ts, sessions.service.ts, gear-items.service.ts and INVARIANTS.md, and no test holds a session row around a gear create or copy. The only `holdSessionRow` is setlists.controller.test.ts:587, which races no gear route. So no concurrent test has ever exercised the concert claim or the item primary key. The false reason would ship in the branch's history. Fix: write the three tests round 1 described, or replace the reason in fix-triage.md with one that holds and leave the three findings open | FAIL (blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B22 | Lint clean | `pnpm exec oxlint --type-aware <10 changed .ts files>` | exit 0, no output | PASS |
| B23 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B24 | No `any`, assertions only `as const` / `as unknown` | `grep -nP '\bany\b'` and `grep -nP '\bas (?!const\|unknown)'` on the changed files | none found | PASS |
| B25 | No prose comments | changed files | one comment, gear-item-tool.core.ts:21, is a `Stryker disable next-line` directive a machine reads, with its reason, as `borso/no-comments` allows (lint exit 0) | PASS |
| B26 | Standards checklist: a new file copies the blueprint it cites | read gear-items-cascade.service.ts in full against `service-passthrough` ("Forwards to one repository function with no branching and no reshaping") | both functions are `await releaseGearOfDeletedMember(transaction, memberId);` / `await deleteGearOfDeletedSession(transaction, sessionId);`, no branching. A second `.service.ts` in a slice has precedent (`auth/`, `oauth/`, `songs/`, `setlists/`, `streaks/`) | PASS |
| B27 | Standards checklist (01): a rule in an `INVARIANTS.md` is still true | read api/src/gear-items/INVARIANTS.md in full | lines 8-11 now say reading, creating and copying answer `not-a-concert` and a create or a copy claims the concert, which matches gear-items.service.ts:115-130. Line 25-26 `refused with 409 id-taken` is held by `refuses a create whose id already names an item of another concert` (line 42) | PASS |
| B28 | Standards checklist (03): a body type from `z.infer`, not restated | read gear-item-tool.core.ts | `import type { GearItemUpdateInput } from './gear-items.schema';` and `buildGearToolUpdate(…): GearItemUpdateInput`. `GearToolUpdate` is gone | PASS |
| B29 | `useEffect`, module-level state | `grep -nE '\buseEffect\('` and `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files | none found | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C05 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed c4919b3b9e85bbd1561c5d3af8c937502d29e8f0 --coverage --reporter=verbose` | 0. 12 files, 79 tests, among them `domain/gear-status.core.test.ts`, `api/src/gear-items/gear-item-tool.core.test.ts`, `SessionGearPage.test.tsx`, `tool-coverage.test.ts`. Coverage 100 % statements, branches, functions and lines on `gear-item-tool.core.ts` and `gear-status.core.ts` | PASS |
| C06 | @borso-app/pragma back-e2e | `pnpm --filter @borso-app/pragma run test:e2e --changed c4919b3b9e85bbd1561c5d3af8c937502d29e8f0 --reporter=verbose` | 0. 54 files, 515 tests, among them `gear-items.controller.test.ts › refuses a create whose id already names an item of another concert` | PASS |
| C07 | @borso-app/pragma mutation | `scripts/mutate-changed.sh c4919b3b9e85bbd1561c5d3af8c937502d29e8f0 apps/pragma` | 0. 100.00 on `gear-item-tool.core.ts` (40 killed) and `gear-status.core.ts` (78 killed) | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D17 | A25: a create reusing another concert's item id answers 409 and writes nothing | `refuses a create whose id already names an item of another concert`, gear-items.controller.test.ts:179; `expect(reused.status).toBe(409); expect(await readJson(reused, errorEnvelope)).toEqual({ error: 'id-taken' }); expect((await readChecklist(app, cookieHeader, secondConcertId)).items).toHaveLength(0);` | PASS |
| D18 | A27: the target is never its own copy source | `never picks the target itself, nor a concert on the same instant`, gear-status.core.test.ts:92; `expect(selectGearCopySource([itself, sameInstant], TARGET)).toBeNull();` with `itself = { ...TARGET, gearItemCount: 5 }` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E11 | `createGearItem`, new `id-taken` branch (gear-items.service.ts:138) | Check-then-write | The decision reads the row the same transaction's `insertGearItemOnceWithin` (`.onConflictDoNothing()` on the primary key) left. Two creates with one id on concerts A and B at once: on Postgres the second insert waits for the first commit, does nothing, and reads A's row, so B answers `id-taken`; on DSQL the second commit conflicts and the retry reads A's row. The rule is held by the primary key. Its concurrent proof is the open E03 (see R06) | PASS |
| E12 | gear-items-cascade.service.ts | Write path moved | Same two repository calls inside the same deletion transactions (`deleteSessionWithCascade`, `deleteMemberWithLinks`); only the import path changed | PASS |
| E13 | Per-process state | Module-level state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files prints nothing | PASS |

## Blocking findings

- R06 — fix-triage.md dismisses E03, E05 and E07 on the claim that E06 already proves the same mechanism on the same row lock. E06 holds a gear item row and races a member claim. No test races the concert claim (`didClaimConcertWithin`) or the item primary key, so the reason is false.

## Non-blocking findings

- B12 (round 1, still open) — `SessionGearPage.tsx` draws the section list and `HolderMark` itself, where the `route-detail-page` blueprint hands that to an organism. Deferred to the visual-validation fix round.
- E03, E05, E07 (round 1, still open) — the item primary key, the copy refusal and the concert cascade are each tested in sequence only.

## Notes

- R06 is blocking only because of its false reason. Either remedy closes it. One is to write the three concurrent tests. The other is to state a reason that holds, such as "deferred", and leave E03, E05 and E07 open as non-blocking.
- The round-1 notes on the missing toast, the deploy window of migration 0033 and the stale sentence in the plan's risk register are not touched by this commit. Does the plan's "no migration touches `session.gear`" still need a fix before the PR opens?

## Verdict: FAIL
