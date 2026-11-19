# Technical validation — Friction inventory of PRs #380 and #381

- Spec: [`../inventory.md`](../inventory.md) (a kaizen sweep's inventory; category A and D rows are its rows marked `fixed`, plus the countermeasure of the dantotsu the inventory routes to)
- Plan: none (a kaizen sweep has no plan by design; no plan row)
- Branch: claude/lessons-from-pr-380-381
- Base: 43c4b8eba39ed427ac4b4bd9aec8178e0a34a2a4
- Run at: 2026-11-19T21:55:13Z
- Round: 1
- Reviewed: 52622b77ffe11c423226f3665a5b22ae44be4aa7
- Touched workspaces: @borso-app/pragma (api `__test` seed, site rename, dialog adapter), @borso-app/talos (vitest setup file only), scripts/browser, scripts/ lint wrappers, .claude/hooks, .claude/skills, docs

No merge commit sits above the base (`git rev-list --merges` printed nothing). HEAD still read 52622b77f after every test run. No use case is routed to `/visual-validation`. The inventory has no Test strategy section, so category D takes one row per claim of each `fixed` row.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 07 | A touch target may be `text=<name>`, through one finder in `cdp-session.ts` | scripts/browser/cdp-session.ts:93-106; touch-tap.ts:42-43; touch-drag.ts:62 | `if (!target.startsWith(${JSON.stringify(TEXT_TARGET_PREFIX)})) {` … `return named.find((element) => !named.some((other) => other !== element && element.contains(other)));`; both drivers now interpolate `${FIRST_VISIBLE_SCRIPT}` | PASS |
| A02 | Row 07 | The innermost visible element "whose `aria-label` or text is exactly that name" | scripts/browser/cdp-session.ts:101 | `(element.getAttribute('aria-label') ?? element.textContent ?? '').trim() === name` | FAIL (non-blocking): `<button aria-label="Close popup">Close</button>` with `scripts/phone.sh touch 'text=Close'` matches nothing and exits 1, because a present `aria-label` hides the text from the comparison. The code matches the accessible name, the inventory, `phone.sh:17-19`, the `touch-tap.ts` usage and the knowledge entry all say "aria-label or text". Fix size: one line (code) or four doc lines |
| A03 | Row 07 | `phone.sh` usage names a target | scripts/phone.sh:17-24, 64, 76-79, 94 | `#   scripts/phone.sh touch '<target>'              real touch tap on the first visible match`; `fail "usage: scripts/phone.sh drag '<from target>' '<to target>'" 2` | PASS |
| A04 | Row 08 | `/visual-validation` step 5 passes the sign-in step 3 printed | .claude/skills/visual-validation/SKILL.md:79 | `Pass the four absolute paths, the dev URL and the seeded sign-in step 3 printed.` | PASS |
| A05 | Row 13 | Every refusal prints "Nothing in this call ran" | .claude/hooks/kaizen-refusal.sh:28 | `echo "[hook] Nothing in this call ran. In a chained command, rerun the other steps on their own." >&2`, placed before the `KAIZEN_LOG_REFUSALS=0` early exit. All 16 callers under `.claude/hooks/` call it immediately before `exit 2` (grep), and no non-PreToolUse hook calls it. Ran `KAIZEN_LOG_REFUSALS=0 .claude/hooks/kaizen-refusal.sh test-rule`: printed the line, exit 0 | PASS |
| A06 | Row 14 | Both lint wrappers print `[lint] clean: <scope>` after a passing run, and nothing after a failing one | scripts/lint-workspace.sh:27-28; scripts/lint-repository.sh:26-27 | `node_modules/.bin/oxlint --type-aware "$@" "$workspace"` / `echo "[lint] clean: $workspace"`; both files run under `set -euo pipefail` (lines 35 and 16), so a failing oxlint exits before the echo. Ran `../lint-workspace.sh` from `scripts/browser`: `[lint] clean: scripts/browser`, exit 0 | PASS |
| A07 | Row 15 | The seed takes `practice=today` for a practice that shows the crowded row, opt-in | apps/pragma/api/src/__test/test-seed.controller.ts:23-26; test-seed-edge-cases.service.ts:31-54; test-seed.core.ts:83-88 | `const isPracticeToday = isPracticeTodayRequested(context.req.query('practice'));` / `if (isPracticeToday) await seedTodayPractice(now);`; `return practiceQuery === PRACTICE_TODAY_QUERY;` with `SEED_TODAY_PRACTICE.songTitles: ['Runaway Sun', 'Last Call', 'Lightning']` | PASS |
| A08 | Row 16 | The knowledge entry drops the advice to type into datetime segments and keeps the `eval` route | docs/knowledge/agent-browser-cli-quirks.md:211-213 | `and digits typed into its spin-button segments are ignored too (PR #381). Set the value through \`eval\` and dispatch \`input\` and \`change\`.` | PASS |
| A09 | Row 18 | The seed writes one inspiration with no author, the state a deleted member leaves | test-seed-edge-cases.service.ts:20-27; test-seed.service.ts:295 | `const formerMember = await createMember(SEED_FORMER_MEMBER);` → `createInspiration(…, { memberId: formerMember.id, now })` → `await removeMember(formerMember.id);`, called from `seedPreviewFixture` | PASS |
| A10 | Row 19 | `MemberPart` is `HeldInstrument`, `MemberPartGlyphs` is `HeldInstrumentGlyphs`, and more names follow; URL values and i18n keys stay | apps/pragma/site/src (two renamed files, 20 edited) | `export interface HeldInstrument {` (setlist-filter.core.ts), `export function HeldInstrumentGlyphs({`, `export function buildMemberSetlistPath(`. `grep -rnE "MemberPart\|memberPart" apps/pragma` leaves only the i18n key `setlist.lineupOpenMemberPart` (SetlistLineupGrid.tsx:181, en.json:683) and the `'my-part'` view value, both kept by the row's own exception. The renames are pure: the diffs of `next-concert.core.ts`, `scene-transition.core.ts`, `HomePage.tsx` and `catalog-page.core.ts` change names only. `blueprint-subjects.json` moves both entries | PASS |
| A11 | Row 22 | The shared jsdom setup is renamed `vitest-jsdom-missing-apis.js`, installs one still `ResizeObserver`, and the five copies are gone | scripts/vitest-jsdom-missing-apis.js:14-22; apps/pragma/vitest.config.ts:92; apps/talos/vitest.config.ts:53 | `if (typeof globalThis.ResizeObserver === 'undefined') { globalThis.ResizeObserver = StillResizeObserver; }`; `setupFiles: ['../../scripts/vitest-jsdom-missing-apis.js']`. The five test files lose `class StillResizeObserver` and `vi.stubGlobal('ResizeObserver', …)`. No live reference to the old file name remains: the only hits are in `docs/dantotsus/a-test-fired-an-event-react-was-not-listening-for.md`, whose `eradication-paths` the dantotsu gate checks against paths ever tracked | PASS |
| A12 | Dantotsu, Eradication | `openDialogOnAttach` returns a cleanup that closes the dialog on detach | apps/pragma/site/src/lib/modal-dialog.adapter.ts:23-27 | `export function openDialogOnAttach(dialog: HTMLDialogElement \| null): () => void {` / `dialog?.showModal();` / `return () => dialog?.close();`. React 19.3 (`pnpm-workspace.yaml:55`) calls a returned ref cleanup in place of the null call. `SceneTransitionStrip.tsx:28` passes it as `ref={openDialogOnAttach}`, so the popup gets the cleanup | PASS |
| A13 | Dantotsu, Similar instances | "The stage and the popup open through this adapter", and "a dialog opened through the adapter now closes when React removes it, whatever removed it" | apps/pragma/site/src/lib/scene-dialog.adapter.ts:8-12 | `export function openSceneOnAttach(dialog: HTMLDialogElement \| null): void {` / `openDialogOnAttach(dialog);` discards the cleanup. Failing case: in Scene Mode, tap the back chevron (`SongScenePage.tsx:119` `onClick={leaveScene}`) → `leaveScene` navigates and React removes the stage `<dialog>` while it is open; `close()` is never called. Nothing user-visible breaks, because the route changes and the opener is not on the next page, but the dantotsu's level-1 claim does not hold for the stage. Fix size: one file (return a cleanup from `openSceneOnAttach` that closes and releases the wake lock and status bar, which today rely on the null call) or one sentence in the dantotsu | FAIL (non-blocking) |
| A14 | Dantotsu, Eradication | The shared jsdom setup gained `close()`, guarded for node-environment files | scripts/vitest-jsdom-missing-apis.js:24-37 | `globalThis.HTMLDialogElement !== undefined && globalThis.HTMLDialogElement.prototype.close === undefined` → `Object.defineProperty(… 'close', { configurable: true, writable: true, value: closeDialog })`. jsdom here has no `close` (`node -e` with jsdom printed `undefined`) | PASS |
| A15 | Dantotsu, Similar instances | "The popup stays a raw dialog by choice, recorded in ADR-2026-11-19T1802" | docs/adr/2026-11-19T1802-…md:3 | `- **Status:** accepted` (was `proposed`) | UNVERIFIABLE: see Notes |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / one-letter locals | read the changed source files | new names: `formerMember`, `songIdByTitle`, `heldInstrumentsOf`, `isHeldInstrumentListShown`, `practiceEntriesInOrder`, `named`, `other`; none abbreviated | PASS |
| B02 | Magic numbers and strings named | read | `PRACTICE_TODAY_QUERY = 'today'` (test-seed.core.ts:83), `TEXT_TARGET_PREFIX = 'text='` (cdp-session.ts:93), seed literals in the `SEED_*` fixture constants | PASS |
| B03 | Function names describe the result | read | `isPracticeTodayRequested`, `buildMemberSetlistPath`, `describeHeldInstrumentsByEntryId`, `seedTodayPractice`, `seedFormerMemberInspiration` | PASS |
| B04 | No type assertions other than `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on the changed files | none found; `SEED_FORMER_MEMBER = { … } as const` only | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on the changed files | two hits, both English prose inside `it(...)` names (test-seed.core.test.ts:86, modal-dialog.adapter.test.ts:59) | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read | `const [member] = await getMembersSortedByFirstName(); if (member === undefined) throw …`; `songIdByTitle.get(title)` checked for `undefined`; `props.heldInstrumentsByEntryId[entry.id] ?? NO_HELD_INSTRUMENTS` | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <46 changed .ts/.tsx/.js files>` | exit 0, no output | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found | PASS |
| B09 | Standards checklist (11-database / 04-backend): "a workflow writing more than one table wraps the writes in one transaction owned by the service" | read test-seed-edge-cases.service.ts in full | `seedTodayPractice` writes `sessions` (`createSession`, line 37), `setlists` (`createSetlist`, line 41) and setlist entries (`appendEntry`, line 49) with no transaction; a throw at the third `appendEntry` leaves a practice with a two-entry setlist. Test-only fixture route, and a re-seed truncates every table, so nothing ships wrong. Introduced: this branch (copying `seedPreviewFixture`, which also composes services without one). Fix size: one file | FAIL (non-blocking) |
| B10 | Standards checklist (01-naming): "a comment documents something the code cannot say, and is not a restatement, a history note…" | read kaizen-refusal.sh, lint-workspace.sh, lint-repository.sh, phone.sh in full | `# step, the ones before the refused word included. An agent read one refusal` / `# as a lint fix that did not take, because its edit was chained in front.` at .claude/hooks/kaizen-refusal.sh:26-27 is a history note, which belongs in the commit message. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B11 | Standards checklist (01-naming): a `VOCABULARY.md` definition is still true | read apps/pragma/VOCABULARY.md Home entry and the refused-terms list | `the instruments the signed-in member holds in its setlist, or their open tasks` matches `HeldInstrumentList` on `HomePage.tsx:155`; line 882 still refuses **part** for what a member holds, and the code no longer uses it in identifiers | PASS |
| B12 | Standards checklist (01-naming): the verb table (`build…`, `select…`, `find…`, `get…`) | read | `buildMemberSetlistPath` builds a path; no new `find…` or `get…` | PASS |
| B13 | Standards checklist (01-naming): a boolean name is not negated | read | `isPracticeTodayRequested`, `isHeldInstrumentListShown`, `isPracticeToday` | PASS |
| B14 | Standards checklist (01-naming / 02-purity): a file name says what it holds, `.core` vs `.utils` | read | `test-seed-edge-cases.service.ts` orchestrates services (`// @FollowsBlueprint service-orchestration`); `isPracticeTodayRequested` sits in `test-seed.core.ts` (`// @FollowsBlueprint core-decision`) | PASS |
| B15 | Standards checklist (10-testing): a test name states the behaviour and the condition; a service test asserts on what the database holds | read the changed tests | `'adds on request a practice of today with three songs, so its action row is crowded'` asserts the rows in `listEntries(setlist.id)`; `'keeps an inspiration whose author was deleted, so its card reads former member'` asserts `listInspirationViewsNewestFirst()` | PASS |
| B16 | Blueprint marks | read | `modal-dialog.adapter.ts` updates its own `@BlueprintDescription` to say the cleanup closes on detach; new functions carry `// @FollowsBlueprint` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 43c4b8eba39ed427ac4b4bd9aec8178e0a34a2a4 --coverage --reporter=verbose` | 0: 468 files, 4576 tests (the setup-file change made `--changed` run every core file); coverage 100% statements, branches, functions and lines over the nine gated changed files | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 43c4b8eba39ed427ac4b4bd9aec8178e0a34a2a4 --reporter=verbose` | 0: 57 files, 512 tests, including all 14 of `api/src/__test/test-seed.controller.test.ts` | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 43c4b8eba39ed427ac4b4bd9aec8178e0a34a2a4 apps/pragma` | 0: 392 mutants, 392 killed, 0 survived (`test-seed.core.ts`, `entry-lineup-change.core.ts`, `setlist-filter.core.ts`, `modal-dialog.adapter.ts`, `next-concert.core.ts`, `catalog-page.core.ts`, `home.core.ts`, `scene-transition.core.ts`) | PASS |
| C04 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 43c4b8eba39ed427ac4b4bd9aec8178e0a34a2a4 --reporter=verbose` | 0: 161 files, 1370 tests | PASS |
| C05 | scripts/browser | `pnpm exec vitest run scripts/browser` | 0: 2 files, 51 tests (`touch-tap.core.test.ts`, `touch-drag.core.test.ts`) | PASS |
| C06 | `*.utils.ts` sibling tests | `git diff --name-only` for `*.utils.ts` | the branch changes no `*.utils.ts` | PASS |

## D. Test coverage of spec

0 use cases routed to /visual-validation; out of scope for this report: none.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 15: `?practice=today` adds a practice dated now with three seeded songs in order | `it('adds on request a practice of today with three songs, so its action row is crowded')` at apps/pragma/api/src/__test/test-seed.controller.test.ts:118; would fail at `expect(practiceEntriesInOrder.map((entry) => songTitleById.get(entry.songId))).toEqual(['Runaway Sun', 'Last Call', 'Lightning'])` | PASS |
| D02 | Row 15: the practice is opt-in, so a plain seed writes none | `it('seeds no practice by default, so a session today does not light every flame')` at test-seed.controller.test.ts:143; `expect((await listSessions()).map((session) => session.kind)).toEqual(['concert'])`; and `isPracticeTodayRequested('tomorrow')` → `false` at test-seed.core.test.ts:96 | PASS |
| D03 | Row 18: one inspiration whose author was deleted | `it('keeps an inspiration whose author was deleted, so its card reads former member')` at test-seed.controller.test.ts:148; `expect(inspirations.map(…)).toEqual([['Call Me Maybe', null]])` and `expect((await listMembers()).map((member) => member.firstName)).not.toContain('Théo')` | PASS |
| D04 | Row 22: one still `ResizeObserver` from the shared setup replaces the five copies | structural: jsdom has no `ResizeObserver` (measured), and `LineupSlots.test.tsx`, `SetlistEntriesList.test.tsx`, `SetlistEntryRow.test.tsx`, `SongDetailPage.test.tsx` and `PracticeModePage.test.tsx` lost their stubs and still pass in C01, so they fail if `vitest-jsdom-missing-apis.js:20-22` stops installing it | PASS |
| D05 | Dantotsu: the adapter closes the dialog on detach | `it('closes the dialog when React detaches it, so a dialog removed by state gives focus back')` at apps/pragma/site/src/lib/modal-dialog.adapter.test.ts:26; `detach(); expect(close).toHaveBeenCalledTimes(1);`. Mutation C03 killed all 11 mutants of the adapter | PASS |
| D06 | Dantotsu: the null call and its cleanup do nothing | `it('does nothing on the call React makes with null, nor on its cleanup')` at modal-dialog.adapter.test.ts:34; `openDialogOnAttach(null)();` inside `expect(…).not.toThrow()` | PASS |
| D07 | Dantotsu: the jsdom setup fills `close()` | structural: jsdom has no `HTMLDialogElement.prototype.close` (measured), and React Testing Library unmounts `SceneTransitionStrip` after each test in `SceneTransitionStrip.test.tsx` (`act(() => root.unmount())` at line 45), which now runs the adapter's `dialog?.close()`; those tests fail with `close is not a function` if `vitest-jsdom-missing-apis.js:29-37` is removed | PASS |
| D08 | Row 07: `text=<name>` reaches the innermost visible element of that name | (none found). The finder is a string of browser JavaScript in `cdp-session.ts`; `touch-tap.core.test.ts` and `touch-drag.core.test.ts` are unchanged. Failing case: replace the `text=` branch of `FIRST_VISIBLE_SCRIPT` with `return undefined;` and every test still passes. The inventory's proof is a by-hand run on a test page | FAIL (non-blocking) |
| D09 | Row 13: every refusal prints "Nothing in this call ran" | (none found). Failing case: delete `kaizen-refusal.sh:28` and no test fails. Exercised by hand in A05 | FAIL (non-blocking) |
| D10 | Row 14: a clean lint prints `[lint] clean: <scope>`, a failing one prints no such line | (none found). Failing case: delete the `echo` from `lint-workspace.sh:28` and no test fails. Exercised by hand in A06 | FAIL (non-blocking) |
| D11 | Rows 08, 16: skill and knowledge wording | structural: documentation only, quoted in A04 and A08 | PASS |
| D12 | Row 19: rename with URL values and i18n keys unchanged | structural: the type checker fails on any missed caller (B07 type-aware lint, C01), and `SetlistLineupGrid.test.tsx:163` still queries `'Show the part of Bruno'`, so a changed i18n value fails it | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `seedTodayPractice` (test-seed-edge-cases.service.ts:31) and `seedFormerMemberInspiration` (:20), behind `POST /api/__test/seed` | Check-then-write | Neither enforces a limit, an existence rule or a "max plus one": they read members and songs to find ids, then insert. The route is mounted only with `ALLOW_TEST_SEED` (`it('is not mounted when ALLOW_TEST_SEED is unset')`), and no rule in the inventory speaks to two seeds at once | PASS |
| E02 | Per-process state | Module-level `let` / `new Map` / `new Set` added | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api files: none found. `songIdByTitle` is a local inside `seedTodayPractice` | PASS |
| E03 | Concurrent proof | Rules held by a key | none: no write path in the diff holds a rule by a key | PASS |

## Blocking findings

- none

## Non-blocking findings

- A02 — `text=<name>` compares the `aria-label` alone when one is present, while every document says "aria-label or text".
- A13 — `openSceneOnAttach` drops the adapter's cleanup, so the stage dialog is removed open; the dantotsu says every dialog through the adapter closes on detach.
- B09 — `seedTodayPractice` writes three tables with no transaction.
- B10 — history note in the new comment of `kaizen-refusal.sh:26-27`.
- D08 — no test pins the `text=` finder.
- D09 — no test pins the refusal line.
- D10 — no test pins the `[lint] clean` line.

## Notes

- A15 UNVERIFIABLE: the branch flips ADR-2026-11-19T1802 from `proposed` to `accepted` (Deciders: Hugo). Did the operator accept it? The diff and the inventory carry no record of that decision, and the dantotsu leans on the ADR as "a product call".
- Would a small `node --test` or Vitest browser-less check over the lint wrappers and `kaizen-refusal.sh` (D09, D10) earn its run, given that both are shell lines a by-hand run already showed working?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
