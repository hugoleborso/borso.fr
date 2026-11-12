# Technical validation — Recurring tasks, and a PWA that opens on an index

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent, see A06)
- Branch: feat/talos-recurring-tasks-and-navigation
- Base: 42012559 (`42012559a452be185705eabf4e4760d202266fb3`)
- Run at: 2026-11-11T18:15:55Z
- Round: 2
- Reviewed: 0b4f8ca90343856f17893cc012b710da3ab8b54a
- Touched workspaces: @borso-app/talos

Round 2 reads only `git diff b9a56e904bbda7ed81470913b37fc83621dca581..HEAD`, the `Reviewed:` SHA of [`technical-validation-2026-11-11-1753.md`](./technical-validation-2026-11-11-1753.md). That diff is one fix commit, `0b4f8ca9`, plus the commit of the round-1 report. It touches 8 source and test files, `fr.json`, `CONTRAT.md` and `VOCABULARY.md`.

The spec is in the short form. Nothing is routed to `/visual-validation`. 0 use cases routed to /visual-validation; out of scope for this report.

The five round-1 blocking findings are fixed. The three non-blocking ones were fixed too, none was dismissed. The only row that is not PASS is the absent plan.

## A. Correctness vs spec

Rows cover the source lines the fix commit changed. The rest of category A stands as round 1 graded it.

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | T2.2 | « Récurrentes » carries the count of due recurring tasks | apps/talos/site/src/components/organisms/TodayOverview.tsx:63, recurring-task-board.core.ts:18-22 | `dueRecurringTaskCount={countDueTasksOnceLoaded(recurring.data?.tasks)}`; `return tasks === undefined ? undefined : countDueTasks(tasks);` | PASS |
| A02 | T2.3 | A tile is always shown and never moves, a count of zero is muted | TodayIndex.tsx:100, 123-128, IndexTile.tsx:40, 44 | `...(dueRecurringTaskCount === undefined ? {} : { count: dueRecurringTaskCount }),` keeps the tile in the list with no count; `{count === undefined ? null : (` and `count === 0 ? 'text-ink-faint' : undefined,` | PASS |
| A03 | T2.2 | « Lancements » is the eighth tile and opens the Message screen at its list | TodayIndex.tsx:106-110, fr.json:191 | `to: ROUTINE_RUN_LIST_PATH,` `label: t('today.index.runs'),`; `"today.index.runs": "Lancements",` | PASS |
| A04 | Data shape | `RecurringTasks` holds `generatedAt` and `tasks` | apps/talos/api/src/recurring-tasks/recurring-tasks.core.ts:15-18 | `readonly generatedAt: string \| null;` `readonly tasks: readonly RecurringTask[];`. `pnpm --filter @borso-app/talos run typecheck` exits 0, so the site still reads the type through the Hono client | PASS |
| A05 | T5.1 | `CONTRAT.md` describes the new « Jour »; `VOCABULARY.md` holds « Recurring task » | apps/talos/CONTRAT.md:315, apps/talos/VOCABULARY.md:91-92 | `« Récurrentes » shows no count until its tasks are loaded, so a pending or failed read never reads as nothing due.`, which matches A01 and A02; `Held by: \`api/src/recurring-tasks/recurring-tasks.controller.test.ts\` › answers 404 to a POST, a PUT and a DELETE and leaves the state as written` | PASS |
| A06 | plan absent | A plan names the files and the data shape before the code | docs/features/talos/index-navigation/plan/plan.md | The file still does not exist (`ls docs/features/talos/index-navigation/` lists `kaizen.md`, `spec`, `validation`). No row of either round depended on it | UNVERIFIABLE |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D08, blocking: no test mounts the app at `/recurring` | `0b4f8ca9` apps/talos/site/src/App.test.tsx:311-335, `'shows the recurring tasks at their address, and the tile of the day leads there'`. It sets the address with `window.history.replaceState(null, '', '/recurring');`, mounts `<App />` and asserts `expect(tree.container.querySelector('h1')?.textContent).toBe('Tâches récurrentes');` (:317). It then clicks the tile on « Jour » and asserts `expect(window.location.pathname).toBe('/recurring');` (:332) and the title again (:333). The round-1 failing case, the route renamed to `/recurrings`, now fails :317 and :333 | PASS |
| R02 | D20, blocking: no test pins the index as the first content of « Jour » | `0b4f8ca9` App.test.tsx:281-309, `'opens the day on its index, the due recurring tasks raised, then the rest in a fixed order'`. `expect(content?.previousElementSibling?.textContent).toContain('Scan il y a');` (:290) and `expect(content?.firstElementChild).toBe(index);` (:291), where `index` is `nav[aria-label="Raccourcis"]`. Moving `<TodayIndex />` below `<TodayAwaited />` fails :291 | PASS |
| R03 | D22, blocking: no test serves `/api/recurring-tasks` to the day screen | `0b4f8ca9` App.test.tsx:83, `'/api/recurring-tasks': { generatedAt: '2026-10-08T05:00:00Z', tasks: RECURRING_TASKS },` with two due tasks of three, and :298-299, `expect(tile.textContent).toBe('2Récurrentes');` `expect(tile.className).toContain('bg-danger-soft');`. A count hard-wired to `0` fails both | PASS |
| R04 | D28, blocking: no test pins the order of the content below the index | `0b4f8ca9` App.test.tsx:86-95 and :292-296. Each child of the content column is mapped to its marker and the list is compared whole: `).toStrictEqual(DAY_CONTENT_IN_ORDER);` with `'Récurrentes', 'Notifications', 'Lucie Martin', 'Journée calme', 'Envoyer le devis', 'En attente · 1', 'Atelier client', 'Activité · 1'`, which is index, notifications offer, birthdays, brief, agenda, « En attente », focus, activity. The fixture gained a birthday (`soonBirthdays`, :69-77) so that the birthdays block renders. Swapping `<TodayFocus />` and `<TodayAgenda />` fails :296 | PASS |
| R05 | D30, blocking: no test long-presses a tile | `0b4f8ca9` App.test.tsx:300-307. `fireEvent.pointerDown(tile, { button: 0, clientX: 5, clientY: 5 });`, `vi.advanceTimersByTime(450);`, then `expect(tree.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Récurrentes · 2');`. Removing the `onLongPress` spread at TodayIndex.tsx:131-140 leaves no dialog and fails :305 | PASS |
| R06 | A13, non-blocking: the tile showed a muted « 0 » while the read was pending or had failed | `0b4f8ca9` TodayOverview.tsx:63, TodayIndex.tsx:17 and :100. Held by App.test.tsx:337-366, `'shows %s of due recurring tasks on their tile %s'`, over a read that never answers, a 500, and a loaded list with none due: `expect(tile.textContent).toBe(count === 'no count' ? 'Récurrentes' : '0Récurrentes');` (:360). Also TodayIndex.test.tsx:78 and recurring-task-board.core.test.ts:45 | PASS |
| R07 | B10, non-blocking: « The app never writes the state » had no `Held by:` line | `0b4f8ca9` apps/talos/VOCABULARY.md:92, naming recurring-tasks.controller.test.ts:42. The test sends `POST`, `PUT` and `DELETE` with a body, asserts `expect(response.status).toBe(404);` (:53) and `expect(after).toBe(before);` (:56). I ran the claim: `scripts/check-vocabulary-paths.sh` exits 0, the test passes in C02, and `apps/talos/api/src/app.ts:51` mounts a router that declares `.get('/')` only | PASS |
| R08 | B12, non-blocking: the « Lancements » tile used `message.runs.title` | `0b4f8ca9` TodayIndex.tsx:109, `label: t('today.index.runs'),`, key added at fr.json:191. `message.runs.title` keeps its one caller on the Message screen, RoutineRunList.tsx:31 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of the 8 changed `.ts`/`.tsx` files | `countDueTasksOnceLoaded`, `answerFrom`, `stubStandaloneDisplay`, `getRecurringTile`, `DAY_CONTENT_IN_ORDER`, `fetchStub`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <8 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | Unused files and exports | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B04 | Types hold | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B05 | No `any`, assertions limited to `as const` and `as unknown` | `grep -nP '\bany\b\| as (?!const\|unknown)'` on the changed files | only the test name `before any passkey exists` (App.test.tsx:145) and `as const` on the method list (recurring-tasks.controller.test.ts:47) | PASS |
| B06 | No prose comments | `grep -nE '^\s*//'` on the changed files | only `@FollowsBlueprint` markers and the Stryker directive round 1 graded in B09; the fix adds no comment | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read | `tiles[6]?.className` (TodayIndex.test.tsx:85), `const body = routes[new URL(request.url).pathname];` followed by `body === undefined ?` (App.test.tsx:99-101) | PASS |
| B09 | Function names describe the result | read | `countDueTasksOnceLoaded` answers `undefined` before the tasks are loaded and the count after; `getRecurringTile` throws when the tile is missing (`if (tile === null) throw new Error('no recurring tile');`), which is what the `get…` verb promises (standard 01) | PASS |
| B10 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" and "a definition in a `VOCABULARY.md` is still true" (01) | read `apps/talos/VOCABULARY.md` in full, ran the gate | lines 92 and 172 both start at column 0, where the gate reads them; `scripts/check-vocabulary-paths.sh` prints `every Held by names a test that exists`. State writes exist only under `/api/agent` (app.ts:61), the agent's contract, so « the app never writes the state » is true | PASS |
| B11 | Standards checklist: "a key's dotted path names the screen and the element" (09) | read fr.json | `"today.index.runs": "Lancements"` names the day and its index | PASS |
| B12 | Standards checklist: "a test name states the behaviour and the condition" (10) | read the new tests | `'opens the day on its index, the due recurring tasks raised, then the rest in a fixed order'`, `'shows no count of due recurring tasks on their tile while they are loading'` (from the `it.each` at App.test.tsx:337), `'answers 404 to a POST, a PUT and a DELETE and leaves the state as written'`. The back-e2e test asserts on what the route reads back, not on a call | PASS |
| B13 | Standards checklist: "a derived type is derived" (03), "a prop set has not grown a family of booleans" (05), ".core.ts or .utils.ts" (02) | read | the site still takes the response type from the Hono client; `TodayIndexProps` changes one prop to `number \| undefined` and adds no boolean; the new function sits in `recurring-task-board.core.ts` beside `countDueTasks` | PASS |
| B14 | Standards checklist: the remaining bullets (04, 06, 07, 08, 11, 12, 14) | read | not applicable to this diff: no repository, write, mutation, form, effect, new variant, disable comment or pre-commit check | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed b9a56e904bbda7ed81470913b37fc83621dca581 --coverage --reporter=verbose` | 0. 17 files, 74 tests passed. Coverage 100% statements (22/22), branches (14/14), functions (9/9), lines (18/18). The feature's own files ran: `App.test.tsx` (9 tests), `TodayIndex.test.tsx` (4), `recurring-task-board.core.test.ts` (5), `recurring-tasks.core.test.ts` (6), `RecurringTaskBoard.test.tsx` (6) | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed b9a56e904bbda7ed81470913b37fc83621dca581 --reporter=verbose` | 0. 19 files, 125 tests passed, one more than round 1, `recurring-tasks.controller.test.ts` among them | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh b9a56e904bbda7ed81470913b37fc83621dca581` | 0. No mutant survived and none lacked coverage. `recurring-task-board.core.ts` 15 killed (11 in round 1, the new function adds 4), `recurring-tasks.core.ts` 19 killed | PASS |
| C04 | @borso-app/talos | every `*.utils.ts` the diff touches has its test | the diff changes no `*.utils.ts` | PASS |

## D. Test coverage of spec

The five rows round 1 failed are graded in R01 to R05 above. The rows below are the behaviour the fix commit changed.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | T2.2 « Récurrentes » counts the due recurring tasks, zero included | `'counts the due tasks once they are loaded, zero included'` at recurring-task-board.core.test.ts:48; `expect(countDueTasksOnceLoaded(TASKS)).toBe(2);` `expect(countDueTasksOnceLoaded([])).toBe(0);`. On the screen: App.test.tsx:298 | PASS |
| D02 | T2.3 the tile is shown and stays in place whatever its count, here with no count yet | `'shows no count on the recurring tile until its count is known, the tile kept in place'` at TodayIndex.test.tsx:78; `expect(tiles.map((tile) => tile.textContent).slice(5, 8)).toStrictEqual(['6Relations', 'Récurrentes', 'Lancements']);` | PASS |
| D03 | T2.3 a count of zero is muted, on the screen | `'shows a muted zero of due recurring tasks on their tile once loaded with none due'` at App.test.tsx:337; `expect(tile.querySelector('.text-ink-faint')?.textContent).toBe(count === 'no count' ? undefined : '0');` (:361) | PASS |
| D04 | T2.4 « Récurrentes » is calm unless its count is not zero | same `it.each`, all three cases; `expect(tile.className).not.toContain('bg-danger-soft');` (:364), against `toContain('bg-danger-soft')` at :299 with two due | PASS |
| D05 | T1.1 no write | `'answers 404 to a POST, a PUT and a DELETE and leaves the state as written'` at recurring-tasks.controller.test.ts:42; `expect(after).toBe(before);` (:56). Round 1 held this row structurally, it now has a test | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | No write path in the diff | Check-then-write | `git diff b9a56e90..HEAD -- 'apps/talos/api/**' \| grep -E '^\+' \| grep -cE 'insert\(\|update\(\|delete\(\|onConflict\|transaction\('` finds no source line. The only API source change is a type, `readonly tasks: readonly RecurringTask[];` (recurring-tasks.core.ts:17). The new back-e2e test sends writes and asserts they are refused with 404 | PASS |
| E02 | Module-level values in the changed files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^let '` on the changed API and site sources finds nothing. The diff adds module constants only to `App.test.tsx` (`WATCH`, `DAY_ROUTES`, `DAY_CONTENT_IN_ORDER`), which no test mutates | PASS |
| E03 | Rules held by a key | Concurrent proof | none to prove: E01 found no write | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None.

## Notes

- A06 (UNVERIFIABLE): no plan was written for this feature. The spec names its data shape and no row lacked a file list. Run `/technical-conception` first if a plan is wanted on record. Copy this row into the pull request description.
- The round-1 note asking whether `RecurringTasks.tasks` should be readonly was taken up: recurring-tasks.core.ts:17.
- Two round-1 questions are still open, on code this round did not read. Does a real finger lift close the action sheet a long press just opened, as the Playwright harness showed on a tile and on a todo row alike? Is `atom-plain` the right blueprint for `StateDot.tsx`, which draws two looks and takes no `className`?
- The fix commit also moved the `Held by:` line of « Routine run » to column 0 (VOCABULARY.md:172), outside this feature, so that the gate reads it. The test it names exists and the gate passes.
- No browser was opened this round and nothing was written to the local dev database: the diff changes no layout class.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
