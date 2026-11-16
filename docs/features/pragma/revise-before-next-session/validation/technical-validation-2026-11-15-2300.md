# Technical validation — Revise a song before the next session

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (Tier 1 change routed without a plan)
- Branch: claude/beautiful-curie-v1tz1m
- Base: 4b7b3e6ad980a779a2b3bc8bed5490dbad2a2c21
- Run at: 2026-11-15T22:48:17Z
- Round: 2
- Reviewed: b0b2b8e8a36e282fb73396d47bfd4bf7d4a95437
- Touched workspaces: @borso-app/pragma (site only, no API, domain or CDK file)

Round 2 reads `git diff 84ce1008da00690263d5a3889e7d0ad68aa183c3..HEAD`, one commit (`b0b2b8e8a`). No merge commit sits above the reviewed SHA. The commit renames the concept from *revision* to *brush-up* across 4 source files and 3 test files. It also changes the guard in `selectSessionToBrushUp` and the hook's handling of a task list that has not loaded. It adds a VOCABULARY entry and an INVARIANTS section, and amends the spec in three places (a *Name* section, behaviour 2 and behaviour 3). It brings no new scope beyond those files. Category A rows cover only the spec amendments. Categories B to E cover only the files the commit touched.

0 new use cases routed to /visual-validation in this round. The two routed in round 1 (375 px fit, struck-through done line) are unchanged and out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | `plan/` does not exist under `docs/features/pragma/revise-before-next-session/` | UNVERIFIABLE |
| A01 | Behaviour 2 (amended) | "While the task list has not loaded, the item is not shown" | apps/pragma/site/src/components/organisms/brush-up.hook.ts:52-60, 73-74; brush-up.core.ts:44 | `const tasks = tasksQuery.data?.tasks;` then `(tasks === undefined ? null : indexBrushUpTasksBySong(...))`, `tasksBySong === null ? null : (tasksBySong.get(songId) ?? NO_ROWS)`, and in the core `if (songTasks === null \|\| memberId === null) return null;`. `askActionOf` returns `undefined` when `session === null` (hook:74), so the row gets no `onAskBrushUp` and draws no menu item | PASS |
| A02 | Behaviour 2 | With no next session, the item is not shown (the guard on `nextSession` was removed) | brush-up.core.ts:46 | `return hasOwnBrushUp ? null : nextSession;` returns `null` when `nextSession` is `null` | PASS |
| A03 | Behaviour 3 (amended) | The line's label is the shared session label: kind, date, and venue when set | brush-up.hook.ts:46, 65 | `const labelOf = useSessionLabel();` and `sessionLabel: nextSession === null ? null : labelOf(nextSession),` | PASS |
| A04 | *Name* (new section) | In code the task is a **brush-up** (`brush-up.core.ts`); the screen says *To revise* | brush-up.core.ts, brush-up.hook.ts, molecules/BrushUpCheck.tsx; en.json:663 | `grep -rniE 'revision' apps/pragma/site/src apps/pragma/domain` (excluding `revise.` i18n keys) prints nothing; the menu label is still `t('setlist.revise.menu')` (SetlistEntryRow.tsx:80) | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A03 (blocking): **To revise** shows and posts a duplicate while `GET /api/tasks` is pending or failed | `b0b2b8e8a` brush-up.hook.ts:52-60 and brush-up.core.ts:44. With `tasksQuery.data` undefined, `songTasksOf` returns `null`, `selectSessionToBrushUp` returns `null`, and `askActionOf` returns `undefined`, so the menu item is absent and no tap can post | PASS |
| R02 | C03 (blocking): `scripts/mutate-changed.sh` at 93.55, 2 survivors | `b0b2b8e8a` brush-up.core.ts:44 (dead `nextSession === null` guard removed) and brush-up.core.test.ts:50-53 (another member's task beside the member's own). `scripts/mutate-changed.sh 84ce1008… apps/pragma/site/src/components/organisms/brush-up.core.ts` exits 0: 31 mutants, 31 killed, 0 survived, score 100.00 | PASS |
| R03 | D04 (blocking): no test pins "hidden once the member has one" beside another member's task, or while the list loads | `b0b2b8e8a` brush-up.core.test.ts:50 `it('offers nothing once the member has one, even ticked and beside another member’s')` with `const tasks = [task({ assigneeId: 'bruno' }), task({ status: 'done' })]; expect(selectSessionToBrushUp(tasks, 'anna', NEXT)).toBeNull();`, and :55 `it('offers nothing while the task list has not arrived')` with `expect(selectSessionToBrushUp(null, 'anna', NEXT)).toBeNull();`. The hook's mapping from `undefined` to `null` has no test (see D02) | PASS |
| R04 | D07 (non-blocking), dismissed: "A test would restate the key, and the i18n catalogue check covers both languages" | Claim checked. `apps/pragma/site/src/i18n/i18n-parity.core.ts` `diffCatalogs` fails on a key present in one catalogue only, and `react-i18next.d.ts` types `t` keys against `en.json`, so a missing or misspelt key fails the parity test or `tsc`. Both catalogues carry `setlist.revise.taskTitle` (en.json:663 `"Revise {{title}}"`, fr.json:663 `"Réviser {{title}}"`). The claim holds as stated. It does not catch a swap to another existing key, which the dismissal does not claim to | PASS |
| R05 | E01 (non-blocking), dismissed: "the spec rules out an API change, and a duplicate from two devices at once is an ordinary task the member can delete" | Claim checked. spec.md:12 reads "Nothing changes on the API." A task can be deleted through `useDeleteTask` (lib/queries/tasks.queries.ts:120, `api.api.tasks[':id'].$delete`), called from the task sheet (components/organisms/task-sheet.hook.ts:47, 71) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read the changed files in full | Sample: `brushUpItems`, `hasOwnBrushUp`, `songTasksOf`, `tasksBySong`, `onAskBrushUp`. None found | PASS |
| B02 | Magic numbers and strings extracted | read in full | No new literal | PASS |
| B03 | No prose comments | read in full | Only `/** @Feature tasks */` and `// @FollowsBlueprint …` annotations | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\b)\w'` on the 9 changed .ts/.tsx files | One hit, SetlistEntryRow.test.tsx:162, the test name "as a box to tick", not an assertion | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `tasksBySong.get(songId) ?? NO_ROWS` (hook:60), `tasks?.find(...)?.status ?? null` (hook:62) | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <9 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none found | PASS |
| B10 | knip clean | `pnpm knip --workspace apps/pragma` (repo root) | exit 0; three configuration hints, no unused file or export | PASS |
| B11 | Standards checklist: "a definition in a `VOCABULARY.md` … [is] still true" (01-naming) | read apps/pragma/VOCABULARY.md:168-180 in full | The **Brush-up** entry names `brush-up.core.ts`, which exists. It points to `site/src/components/organisms/INVARIANTS.md`, which now holds a *Brush-up* section. It contrasts with **study queue** and **mastery**, both defined entries (VOCABULARY.md:665, :318). The refusal of *revision* (VOCABULARY.md:860-862) now holds in code | PASS |
| B12 | Standards checklist: `INVARIANTS.md` of each changed folder still true, and each *Held by* names a real test | read components/organisms/INVARIANTS.md:60-73 | The four *Held by* names match `it(...)` names in brush-up.core.test.ts:21, 50, 55, 66 word for word, and all four ran green in C01 | PASS |
| B13 | Standards checklist: "a `find…` returns `null` … and a `build…`, `project…` or `select…` returns what its verb says" (01-naming) | read in full | `selectSessionToBrushUp` returns the session or `null`; `buildBrushUpTask` returns the write body; `indexBrushUpTasksBySong` returns a map | PASS |
| B14 | Standards checklist: "a derived type is derived" (03-typing) | read in full | `BrushUpLine.assignee: ReturnType<typeof findAssignee>` (hook:24) and `BrushUpCheckProps.assignee: TaskAssignee \| null` (BrushUpCheck.tsx:11) are both derived now. See Notes on the remaining hand-written shapes, which round 1 already read | PASS |
| B15 | Standards checklist: "a test name states the behaviour and the condition" (10-testing) | read the two new tests | `offers nothing once the member has one, even ticked and beside another member’s`, `offers nothing while the task list has not arrived` | PASS |
| B16 | Blueprint markers on renamed files | read in full | `// @FollowsBlueprint molecule-presentational` (BrushUpCheck.tsx:17), `core-view-projection` (brush-up.core.ts:26), `hook-stateful-helper` (brush-up.hook.ts:36) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse 84ce1008…) --coverage --reporter=verbose` | 0. 4 files, 22 tests passed: `brush-up.core.test.ts` (8), `SetlistEntryRow.test.tsx`, `SetlistEntriesList.test.tsx`, `App.test.tsx`. Coverage of the gated changed file 100% statements (12/12), branches (13/13), functions (4/4), lines (9/9) | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse 84ce1008…) --reporter=verbose` | 0. No test file found: the commit changes no file under `api/`, so no back-e2e test imports a changed file | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh $(git rev-parse 84ce1008…) apps/pragma/site/src/components/organisms/brush-up.core.ts` | 0. 31 killed, 0 survived, score 100.00, threshold 100 | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` files changed | none in the round-2 diff | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 2 (amended): the item is not shown while the task list has not loaded, rule side | `it('offers nothing while the task list has not arrived')` at brush-up.core.test.ts:55, `expect(selectSessionToBrushUp(null, 'anna', NEXT)).toBeNull();` | PASS |
| D02 | Behaviour 2 (amended): the item is not shown while the task list has not loaded, hook side | (none found). Nothing tests that `useSongBrushUps` turns an undefined `tasksQuery.data` into `null`. Replace brush-up.hook.ts:54 `(tasks === undefined ? null : indexBrushUpTasksBySong(tasks, …))` with `indexBrushUpTasksBySong(tasks ?? [], …)`, and every test still passes while the round-1 A03 duplicate comes back. The code is right today, so nothing breaks if it ships. Fix size: one hook test with `useTasksList` returning no data | FAIL (non-blocking) |
| D03 | Behaviour 2: hidden once the member has a task on the song and session, another member's task beside it | `it('offers nothing once the member has one, even ticked and beside another member’s')` at brush-up.core.test.ts:50, `expect(selectSessionToBrushUp(tasks, 'anna', NEXT)).toBeNull();` with `tasks = [task({ assigneeId: 'bruno' }), task({ status: 'done' })]` | PASS |
| D04 | Behaviour 2: with no next session the item is not shown | `it('offers nothing with no next session or no signed-in member')` at brush-up.core.test.ts:59, `expect(selectSessionToBrushUp([], 'anna', null)).toBeNull();` | PASS |
| D05 | Behaviour 3 (amended): the line's label is the shared session label | **structural:** the hook passes `labelOf(nextSession)` from the shared `useSessionLabel()` (brush-up.hook.ts:46, 65), and the row renders it unchanged (SetlistEntryRow.tsx:163 `sessionLabel={props.brushUpSessionLabel ?? ''}`), asserted at SetlistEntryRow.test.tsx `expect(screen.getByText('Léa revises it for Practice · Wed 18 Nov')).toBeTruthy();` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E00 | Server write paths | Does the round-2 diff add or change one? | `git diff --name-status 84ce1008…..HEAD` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`; the API is unchanged | PASS |
| E01 | `askActionOf` → `createTask.mutate(...)` (brush-up.hook.ts:72-83) | Check-then-write, one tab | The window where the cached list was `undefined` and each tap posted is closed (R01). The cross-device duplicate stays as round 1 graded it, and its dismissal holds (R05) | PASS |
| E02 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds none; `NO_ROWS` (hook:34) is a frozen empty array. Site code only, no Lambda state | PASS |
| E03 | Concurrent proof | Key-held rules | No rule in the diff is held by a key | PASS |

## Blocking findings

- none

## Non-blocking findings

- D02: no test pins that `useSongBrushUps` hides **To revise** while `GET /api/tasks` has not answered; reverting brush-up.hook.ts:54 to `tasks ?? []` would pass every test.

## Notes

- A00 is UNVERIFIABLE by design. The change was routed as Tier 1 without a plan, and the files were taken from the diff.
- The commit message says B12 is fixed. The assignee shape is now derived. Still, `findAssignee`'s own return type stays hand-written (band-tasks.core.ts:88), and `BrushUpLine` and `BrushUpCheck` derive it from two different sources (`ReturnType<typeof findAssignee>` and `TaskAssignee`). `BrushUpTaskWrite` (brush-up.core.ts:18) still restates part of the create body. Round 1 graded B12 non-blocking and read this code, so no row is raised. Should `findAssignee` return `TaskAssignee | null`, so the two sources become one?
- A failed `GET /api/tasks` after a first success keeps the cached list (`tasksQuery.data` stays set), so the item shows from stale data then. Is that intended? The spec's "has not loaded" reads as covering only the first load.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
