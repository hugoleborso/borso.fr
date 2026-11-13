# Technical validation — Push when a member adds a song

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`docs/features/pragma/song-added-push/plan/plan.md` does not exist)
- Branch: claude/youthful-euler-ipkkn3
- Base: origin/main (`bf13850605d7386783a319a61e18420ccc45ac0c`)
- Run at: 2026-11-13T23:56:57Z
- Round: 2
- Reviewed: 4e7c69a0bf6da513e019961d9aa6c206f941b9ea
- Touched workspaces: @borso-app/pragma (api tests, site tests)

Round 2 reads `git diff a5ac1e672f898cd8ce088223bf2854fb1583d92f..HEAD`, one commit (`4e7c69a0` "test(pragma): pin the song push parameters and the silent audience import"). It changes three test files and adds the round-1 report. No source file changed, and no new scope arrived, so categories A and D re-check only the rows the commit touches. No merge sits above the base or the reviewed SHA (`git rev-list --merges` printed nothing for both ranges). The commit message dismisses no round-1 finding. 0 use cases routed to /visual-validation; out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `plan/plan.md` missing | UNVERIFIABLE |
| A01 | All rows of round 1 (A01 to A17) | No source file changed since the reviewed SHA, so every round-1 A row stands on the same code | `git diff --name-status a5ac1e67..HEAD` | `M apps/pragma/api/src/audience/audience.controller.test.ts`, `M apps/pragma/api/src/notifications/notifications.core.test.ts`, `M apps/pragma/site/src/components/organisms/NotificationSettings.test.tsx`, `A docs/features/pragma/song-added-push/validation/technical-validation-2026-11-13-2338.md` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | C03 (blocking): mutant `case 'song-created':` → `case "":` survived at notifications.core.ts:262 | `4e7c69a0` apps/pragma/api/src/notifications/notifications.core.test.ts:298 `[SONG_CREATED, { songTitle: 'Rehab' }],` in the `names the subject of %o` table. `scripts/mutate-changed.sh bf138506… apps/pragma` now exits 0: `Final mutation score of 100.00 is greater than or equal to break threshold 100`; the new case reports `(killed 1)` | PASS |
| R02 | B17 (non-blocking): test named "five categories" renders six | `4e7c69a0` NotificationSettings.test.tsx:118 `it('lists the six categories with the state the member saved', …)` | PASS |
| R03 | D14 (non-blocking): no site test asserts the `songs` checkbox | `4e7c69a0` NotificationSettings.test.tsx:123-125 `expect(isChecked(screen.getByRole('checkbox', { name: 'New songs in the catalogue' }))).toBe(true,);`. `getByRole` throws when the row or its label is missing | PASS |
| R04 | D15 (non-blocking): no test shows an audience suggestion sends no push | `4e7c69a0` audience.controller.test.ts:649-652 `const send = stubPushService(); await subscribeDevice(member, 'member-phone');` and :680 `expect(send).not.toHaveBeenCalled();`. Probed on a `git archive` copy of HEAD in the scratchpad: `insertSuggestedSong` changed to call `createSong(…, { memberId: <unknown uuid>, now })` makes this test fail at :680 with `Number of calls: 1`, so the assertion bites | PASS |

## B. Code cleanliness

The diff holds test files only; the standards checklist reads source files, so only the test-naming bullet and the repo rules apply.

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on the three changed test files | exit 0, no output | PASS |
| B02 | No `any`, no `useEffect`, no assertions beyond `as const`, no comments | added lines grepped for `\bany\b`, `useEffect(`, ` as [A-Z]`, `//` | none found | PASS |
| B03 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read the changed `it` blocks | `lists the six categories with the state the member saved` now matches its six-row fixture; the audience test name `imports a suggestion naming an unknown track as one idea carrying the provider columns` does not name the new no-push assertion, but the name stays true | PASS |
| B04 | Names carry intent | sampled `member`, `send` at audience.controller.test.ts:649-651 | plain, unabbreviated, same names as push-utils callers | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm exec vitest run --project core --changed a5ac1e672f898cd8ce088223bf2854fb1583d92f --coverage --reporter=verbose` (from apps/pragma) | 0. 2 files, 58 tests passed: notifications.core.test.ts (incl. `names the subject of { kind: 'song-created', … }`) and NotificationSettings.test.tsx (incl. `lists the six categories with the state the member saved`). Coverage reports 0/0 because no source file changed | PASS |
| C02 | @borso-app/pragma (back-e2e) | `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) pnpm run test:e2e --changed a5ac1e672f898cd8ce088223bf2854fb1583d92f --reporter=verbose` | 0. 1 file, 22 tests passed, incl. audience.controller.test.ts › `imports a suggestion naming an unknown track as one idea carrying the provider columns` | PASS |
| C03 | @borso-app/pragma (mutation) | `scripts/mutate-changed.sh bf13850605d7386783a319a61e18420ccc45ac0c apps/pragma` | 0. `Final mutation score of 100.00 is greater than or equal to break threshold 100`; `[mutate-changed] every changed gated file passed mutation (1 run(s))` | PASS |
| C04 | `*.utils.ts` coverage | changed file list | no `*.utils.ts` changed | PASS |

## D. Test coverage of spec

0 use cases routed to /visual-validation; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Round-1 rows D01 to D13 and D16 | unchanged test files and unchanged source; round 1 graded each PASS with its citation | PASS |
| D02 | The push names the song (`songTitle` in the payload), now pinned in core | `it.each(…)('names the subject of %o')` at apps/pragma/api/src/notifications/notifications.core.test.ts:296-307, row `[SONG_CREATED, { songTitle: 'Rehab' }],` at :298, asserting `expect(buildNotificationPayload(event, 'Léa').parameters).toEqual({ actorName: 'Léa', ...parameters, });` | PASS |
| D03 | Songs get their own toggle in Settings (round-1 D14) | `it('lists the six categories with the state the member saved', …)` at apps/pragma/site/src/components/organisms/NotificationSettings.test.tsx:118; `screen.getByRole('checkbox', { name: 'New songs in the catalogue' })` at :123 | PASS |
| D04 | An audience suggestion does not notify (round-1 D15) | `it('imports a suggestion naming an unknown track as one idea carrying the provider columns', …)` at apps/pragma/api/src/audience/audience.controller.test.ts:648; a band member's device is subscribed at :652 and `expect(send).not.toHaveBeenCalled();` at :680, shown to fail when the import notifies (R04) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | No write path or state in this round's diff | Check-then-write, per-process state | `git diff a5ac1e67..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints 0 lines; only test files changed. Round-1 rows E01 to E04 stand on unchanged code | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- A00 — UNVERIFIABLE: the plan is absent. Files were taken from the diff, as in round 1. Running `/technical-conception` would have produced the *Files to change* list.
- Round 1's open questions (the unique index against `docs/standards/11-database.md:145`, and a per-actor tag replacing an earlier song push on the device) are untouched by this commit and remain open for the operator.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
