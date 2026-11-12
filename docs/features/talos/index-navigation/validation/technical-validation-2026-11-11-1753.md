# Technical validation — Recurring tasks, and a PWA that opens on an index

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent, see A23)
- Branch: feat/talos-recurring-tasks-and-navigation
- Base: 42012559 (`42012559a452be185705eabf4e4760d202266fb3`)
- Run at: 2026-11-11T18:02:00Z
- Round: 1
- Reviewed: b9a56e904bbda7ed81470913b37fc83621dca581
- Touched workspaces: @borso-app/talos

The spec is in the short form (what is wrong, data shape, behaviour T1 to T5, out of scope). Categories A and D are built from its behaviour bullets, walked in order, and the files are taken from the diff. Nothing is routed to `/visual-validation`. 0 use cases routed to /visual-validation; out of scope for this report.

The five blocking findings are all missing tests. Each behaviour they concern was observed working in a browser at the reviewed SHA (375 by 812, `pnpm dev`, seeded memory), so the code is right and nothing pins it.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Data shape | `RecurringTask` and `RecurringTasks` in English, French values kept | apps/talos/api/src/recurring-tasks/recurring-tasks.core.ts:4-18 | `readonly lastRunOn: string \| null;` `readonly nextRunOn: string;` `readonly isDue: boolean;` and `readonly generatedAt: string \| null; readonly tasks: RecurringTask[];` | PASS |
| A02 | T1.1 | `GET /api/recurring-tasks`, session required, read from the state `recurring` | apps/talos/api/src/app.ts:51, recurring-tasks.controller.ts:8-9, memory-files.core.ts:22 | `.route('/api/recurring-tasks', buildRecurringTasksRouter())`, `.use('*', requireSession)`, `['etat/recurrentes.json', 'recurring'],` | PASS |
| A03 | T1.1 | Unknown cadence or routine kept; a task that does not parse is dropped; missing or unreadable state answers the empty shape; no write | recurring-tasks.core.ts:30-31, 41-42, 59-61 | `cadence: z.string(),` `routine: z.string(),`; `if (!taskEntry.success) return null;`; `if (!recurringFile.success) return NO_RECURRING_TASKS;`. The service is one read: `return parseRecurringTasks(await readContentFile(RECURRING_TASKS_PATH));` (recurring-tasks.service.ts:8) | PASS |
| A04 | T1.2 | Route `/recurring`, titled « Tâches récurrentes » | apps/talos/site/src/App.tsx:87, fr.json `recurring.title` | `<Route path="/recurring" element={<RecurringTasksPage />} />`, `"recurring.title": "Tâches récurrentes"`. Browser: `/recurring` rendered h1 « Tâches récurrentes » | PASS |
| A05 | T1.3 | Head says the count and the due count, due count in the alert colour when not zero | RecurringTaskBoard.tsx:27-30 | `{t('recurring.count', { count: tasks.length })} ·{' '}` `<span className={dueCount > 0 ? 'font-semibold text-danger' : undefined}>`. Browser: « 13 tâches · 2 dues » | PASS |
| A06 | T1.4 | Due first, then soonest `nextRunOn`; dot, title, cadence, last and next run as short days; « jamais » | recurring-task-board.core.ts:8-11, RecurringTaskBoard.tsx:49-55 | `Number(right.isDue) - Number(left.isDue) \|\| left.nextRunOn.localeCompare(right.nextRunOn)`; `task.lastRunOn === null ? t('recurring.never') : formatShortDay(task.lastRunOn, DISPLAY_LOCALE)` | PASS |
| A07 | T1.5 | The dot carries an accessible label, « due » or « à jour » | StateDot.tsx:20, RecurringTaskBoard.tsx:46 | `<span className="sr-only">{label}</span>`; `stateLabel={t(task.isDue ? 'recurring.state.due' : 'recurring.state.up-to-date')}` | PASS |
| A08 | T1.6 | « quoi » hidden until the row is tapped; the routine shows with it | RecurringTaskRow.tsx:39-40, 64-67 | `<details className="group">` `<summary`; `<p className="m-0 text-body-sm text-ink-soft">{what}</p>` `<p className="m-0 mt-1 text-caption text-ink-muted">{routine}</p>` | PASS |
| A09 | T1.7 | 13 folded rows fit 375 by 812, no third line | RecurringTaskRow.tsx:43, 50-51 | `'flex items-center gap-1 min-h-11 pr-3 cursor-pointer list-none'`, both lines `truncate`. Measured: 13 rows, each 44 px high, last row bottom 727 px, tab bar top 750 px, document height 812, no truncated text | PASS |
| A10 | T1.8 | Empty list shows the faint empty state | RecurringTaskBoard.tsx:69 | `{tasks.length === 0 ? <EmptyState icon="scan" label={t('recurring.empty')} /> : null}` | PASS |
| A11 | T2.1 | The index sits right under the header, before any other content | TodayOverview.tsx:55-65 | `<div className="flex flex-col gap-4">` `<TodayIndex` … `/>` `<NotificationsPrompt />`. Measured: the nav is the first child, top 128 px | PASS |
| A12 | T2.2 | Nine tiles in the fixed order, each a door with its counter; « Lancements » opens the Message screen at its list | TodayIndex.tsx:41-120, routine-run.core.ts:5-6, RoutineRunList.tsx:16-19, 30 | keys in order `proposals, overdue, owed, awaited, drafts, relations, recurring, runs, history`; `export const ROUTINE_RUN_LIST_PATH = \`/message#${ROUTINE_RUN_LIST_ID}\`;`; `if (isAddressed) section?.scrollIntoView();` | PASS |
| A13 | T2.2 | « Récurrentes » carries the count of due recurring tasks | TodayOverview.tsx:63 | `dueRecurringTaskCount={countDueTasks(recurring.data?.tasks ?? [])}`. Failing case: `GET /api/recurring-tasks` answers 500 (or has not answered yet) while `GET /api/today` answers 200 and the state holds 2 due tasks. The tile shows a muted « 0 », which says nothing is due, where the app does not know. The spec states no error case, hence non-blocking | FAIL (non-blocking) |
| A14 | T2.3 | A tile is always shown and never moves; zero is muted; the pills and `keepNonZeroCounters` are gone | TodayIndex.tsx:123, IndexTile.tsx:44 | `{tiles.map(({ key, to, icon, count, label, isAlert, subject }) => (` with no filter; `count === 0 ? 'text-ink-faint' : undefined,`. `today-counters.core.ts` and `CounterPill.tsx` are deleted, and `grep -rn keepNonZeroCounters apps/talos` finds nothing | PASS |
| A15 | T2.4 | Alert colour only on « En retard » and « Récurrentes », only when not zero | TodayIndex.tsx:57, 102, IndexTile.tsx:26 | `isAlert: true,` on `overdue` and `recurring` only; `const isRaised = isAlert && count !== undefined && count > 0;` | PASS |
| A16 | T2.5 | The index fits the first screen with the header | TodayIndex.tsx:122, IndexTile.tsx:32 | `className="grid grid-cols-3 gap-2"`, `min-h-16`. Measured: index top 128 px, bottom 336 px, tab bar top 750 px, `scrollY` 0, nine tiles of 109 by 64, no truncated label, `scrollWidth` 375 | PASS |
| A17 | T2.6 | Below the index: birthdays, brief, agenda, « En attente », focus, activity; activity folded under « Activité · N » | TodayOverview.tsx:66-71, TodayActivity.tsx:25 | `<TodayBirthdays` `<TodayBrief` `<TodayAgenda` `<TodayAwaited` `<TodayFocus` `<TodayActivity` in that order; `<FoldedSection label={t('today.activity.count', { count: entries.length })}>` | PASS |
| A18 | T2.7 | A long press on a tile keeps the action sheet the pills had | TodayIndex.tsx:131-139, IndexTile.tsx:25, 30 | `onLongPress: () => { openActionSheet({ title: count === undefined ? label : \`${label} · ${String(count)}\`, subject, }); }`; `{...press.handlers}`. Browser, touch held 800 ms: dialog « Récurrentes · 2 » on that tile, « Historique » on that one. « Lancements » carries no subject and opens no sheet, which `CONTRAT.md` states and which was never a pill | PASS |
| A19 | T3.1, T3.2 | Engagements and « Tâches récurrentes » lead back to « Jour »; the tab bar keeps six tabs | CommitmentBoard.tsx:33, RecurringTaskBoard.tsx:22 | `<BackLink to="/" label={t('common.back')} />` in both. The diff touches no tab bar file. Browser: tabs « Jour, Todo, Taff, Décider, Mémoire, Message » | PASS |
| A20 | T4.1 | The « Scanner » prompt says `scan` | apps/talos/site/src/i18n/fr.json:223 | `"scan.prompt": "Tu es Talos. Lance le skill scan sur toutes les sources…"`; `grep -rn talos-scan apps/talos` finds nothing | PASS |
| A21 | T5.1 | `CONTRAT.md`, `MEMORY-CONTRACT.md` and `VOCABULARY.md` updated | CONTRAT.md (route table, « Tâches récurrentes », « Aujourd'hui »), MEMORY-CONTRACT.md:36, VOCABULARY.md:83-93 | `\| GET \| /recurring-tasks \| \| { generatedAt: string \| null, tasks: RecurringTask[] }…`; `` `recurring` (the recurring tasks, read by the PWA at `GET /api/recurring-tasks`) ``; `## Recurring task` | PASS |
| A22 | Evidence | Before and after captures at 375 px | docs/features/talos/index-navigation/validation/screens/ | eight PNG files, each `375 x 812` per `file`: before and after of today, commitments and message, plus `after-recurring.png` and `after-recurring-open.png` | PASS |
| A23 | plan absent | A plan names the files and the data shape before the code | docs/features/talos/index-navigation/plan/plan.md | The file does not exist. No row above depended on it, the files were taken from the diff | UNVERIFIABLE |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of every changed source file | `taskEntry`, `recurringFile`, `dueCount`, `isRaised`, `showWhenAddressed`; only `t` from `useTranslation`, the app's convention | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <34 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | Unused files and exports | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B04 | No `any`, assertions limited to `as const` and `as unknown` | `grep -nP '\bany\b'` and `grep -nP ' as (?!const\|unknown)'` on the changed files | only prose in test names (`before any passkey exists`, `reads %s as a %s`) | PASS |
| B05 | No prose comments | `grep -nE '^\s*//'` minus `@FollowsBlueprint` | one line, the Stryker directive of B09 | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found. The scroll to the run list is a ref callback (RoutineRunList.tsx:16-19) | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | `rows[0] ?? document.body`, `const [task] = …; task?.cadence`, `fetchStub.calls[0]?.url` | PASS |
| B08 | Function names describe the result | sample | `parseRecurringTasks`, `readRecurringTask` (answers `null` when the entry does not parse), `orderRecurringTasks`, `countDueTasks`, `isRunListAddressed` | PASS |
| B09 | Standards checklist: "the reason on a disable comment is a claim about that line which a reader can check" (12) and "a comment documents something the code cannot say" (01) | ran the claim | `// Stryker disable next-line ConditionalExpression: equivalent mutant, a missing state parses to null and fails the schema below exactly like this early answer.` at recurring-tasks.core.ts:58. `parseJsonOrNull` is `JSON.parse(raw)` in a `try`, `JSON.parse(null)` is `null`, and `z.object` refuses `null`, so the claim holds | PASS |
| B10 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" (01) | read `VOCABULARY.md` in full | `- Read only. The app never writes the state.` at apps/talos/VOCABULARY.md:91, with no `Held by:` line. Introduced: this branch; Fix size: one line | FAIL (non-blocking) |
| B11 | Standards checklist: "a definition in a `VOCABULARY.md` is still true" (01) | read against the code | `Lives in: api/src/recurring-tasks/`, the eight field mappings and the two value lists match recurring-tasks.core.ts:43-53 | PASS |
| B12 | Standards checklist: "a key's dotted path names the screen and the element" (09) | read fr.json and its callers | `label: t('message.runs.title'),` at TodayIndex.tsx:109 draws a key of the Message screen on « Jour », where its eight neighbours use `today.counters.*` and `today.shortcuts.*`. Introduced: this branch; Fix size: one line and one key | FAIL (non-blocking) |
| B13 | Standards checklist: "untrusted input is parsed with Zod" and "a derived type is derived" (03) | read | `recurringTaskSchema.safeParse(entry)` at recurring-tasks.core.ts:41; the site reads the response type through the Hono client, `await api.api['recurring-tasks'].$get()` at recurring-tasks.queries.ts:14. The API interface is a renamed projection of the French schema, which `z.infer` cannot give | PASS |
| B14 | Standards checklist: "a route composes organisms and owns no layout primitive" and "no new page subtitle … explains the interface" (05) | read | `return <RecurringTaskBoard />;` at RecurringTasksPage.tsx:6; the subtitle is the two counts, data only | PASS |
| B15 | Standards checklist: "every screen holds together at 375 pixels" (05) | Playwright, 375 by 812, touch, on `pnpm dev` | `scrollWidth` 375 on `/`, `/recurring` and `/commitments`; measures in A09 and A16. agent-browser cannot enter talos, see Notes | PASS |
| B16 | Standards checklist: "a prop set has not grown a family of booleans" (05) and "more than two visual variants goes through `cva`" (08) | read | `IndexTile` and `StateDot` each take one boolean, `isAlert`, and draw two looks | PASS |
| B17 | Standards checklist: "a boolean name is not negated" (01), "a file name says what the file holds" (01), "the choice between `.core.ts` and `.utils.ts`" (02) | read | `isDue`, `isAlert`, `isRaised`, `isAddressed`; `recurring-task-board.core.ts` holds the ordering and the due count of the domain's own noun | PASS |
| B18 | Standards checklist: "a test name states the behaviour and the condition" (10) | read the new tests | `'keeps the due count calm when nothing is due'`, `'drops a task that does not parse and keeps the others'`, `'lands on the list when the address names it, and stays put otherwise'` | PASS |
| B19 | Standards checklist: backend, data fetching, database and tool-budget bullets (04, 06, 11, 14) | read | not applicable: no repository, no write, no mutation, no form, no rate limit, no pre-commit check in the diff | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 42012559a452be185705eabf4e4760d202266fb3 --coverage --reporter=verbose` | 0. 23 files, 108 tests passed. Coverage 100% statements (69/69), branches (42/42), functions (24/24), lines (60/60). The feature's own files ran: `recurring-tasks.core.test.ts`, `memory-files.core.test.ts`, `RecurringTaskBoard.test.tsx`, `TodayIndex.test.tsx`, `TodayActivity.test.tsx`, `CommitmentBoard.test.tsx`, `recurring-task-board.core.test.ts`, `routine-run.core.test.ts`, `MessagePage.test.tsx`, `App.test.tsx` | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed 42012559a452be185705eabf4e4760d202266fb3 --reporter=verbose` | 0. 19 files, 124 tests passed, `recurring-tasks.controller.test.ts` among them (3 tests) | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh 42012559a452be185705eabf4e4760d202266fb3` | 0. 413 killed, 0 survived, 0 without coverage. `recurring-tasks.core.ts` 19 killed, `recurring-task-board.core.ts` 11, `memory-files.core.ts` 38, `routine-run.core.ts` 26, `discussion-subject.core.ts` 34, `action-sheet.core.ts` 6 | PASS |
| C04 | @borso-app/talos | every `*.utils.ts` the diff touches has its test | the diff changes no `*.utils.ts` (`git diff --name-only 42012559..HEAD \| grep utils` is empty) | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | T1.1 the route answers `RecurringTasks` from the state | `'reads the stored recurring state'` at recurring-tasks.controller.test.ts:12; `expect(recurring.tasks).toHaveLength(13);` and the `toEqual` on `tasks[0]` | PASS |
| D02 | T1.1 session required | `'refuses a request without a session'` at recurring-tasks.controller.test.ts:42; `expect((await requestJson(app, '/api/recurring-tasks')).status).toBe(401);` | PASS |
| D03 | T1.1 an unknown cadence or routine is kept as written | `'keeps a cadence and a routine it does not know as written'` at recurring-tasks.core.test.ts:55; `expect([task?.cadence, task?.routine]).toStrictEqual(['bisannuelle', 'aube']);` | PASS |
| D04 | T1.1 a task that does not parse is dropped, the others kept | `'drops a task that does not parse and keeps the others'` at recurring-tasks.core.test.ts:62; `expect(recurring.tasks.map((task) => task.id)).toStrictEqual(['bilan-budget']);` | PASS |
| D05 | T1.1 a missing state answers the empty shape | `'answers an empty list when the state is missing'` at recurring-tasks.controller.test.ts:35; `expect(await response.json()).toEqual({ generatedAt: null, tasks: [] });` | PASS |
| D06 | T1.1 an unreadable state answers the empty shape | `'answers an empty list when the state is missing or unreadable'` at recurring-tasks.core.test.ts:84; `expect(parseRecurringTasks('{')).toStrictEqual(empty);` | PASS |
| D07 | T1.1 no write | structural: recurring-tasks.service.ts:8 is one `readContentFile` call, and the controller declares `.get('/')` only | PASS |
| D08 | T1.2 the route `/recurring` shows the screen | (none found). Failing case: rename the path at App.tsx:87 to `/recurrings`. Every test still passes, and the « Récurrentes » tile opens a blank page. `RecurringTaskBoard.test.tsx` renders the organism directly and `TodayIndex.test.tsx` asserts only the href | FAIL (blocking) |
| D09 | T1.2 titled « Tâches récurrentes » | `'says in its head how many tasks there are…'` at RecurringTaskBoard.test.tsx:73; `expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tâches récurrentes');` | PASS |
| D10 | T1.3 the head says both counts | same test; `expect(dueCount.parentElement?.textContent).toBe('4 tâches · 2 dues');` | PASS |
| D11 | T1.3 the due count is in the alert colour when not zero | same test, `expect(dueCount.className).toContain('text-danger');`, and `'keeps the due count calm when nothing is due'` at :82, `expect(dueCount.className).not.toContain('text-danger');` | PASS |
| D12 | T1.4 due first, then soonest next run | `'puts the due tasks first, then the soonest next run, without touching its input'` at recurring-task-board.core.test.ts:12; `toStrictEqual(['due-soon', 'due-late', 'calm-soon', 'calm-late'])` | PASS |
| D13 | T1.4 a row shows the title, the cadence and both runs as short days | `'lists the due tasks first, then the soonest next run, each with its state in words'` at RecurringTaskBoard.test.tsx:90; `'dueBilan du budgethebdomadaire · Dernier lancement jeu. 5 nov. → Prochain lancement dim. 8 nov.'` | PASS |
| D14 | T1.4 a task that never ran says « jamais » | same test; `'à jourRevue des abonnementstrimestrielle · Dernier lancement jamais → Prochain lancement lun. 9 nov.'` | PASS |
| D15 | T1.5 the dot carries the label « due » or « à jour » | same test; `expect(within(rows[0] ?? document.body).getByText('due').className).toBe('sr-only');` and the `'à jour'` line after it | PASS |
| D16 | T1.6 « quoi » hidden until tapped, one tap unfolds it | `'hides what a task does until its row is tapped, then shows it with its routine'` at RecurringTaskBoard.test.tsx:103; `expect(details?.open).toBe(false);` then `expect(details?.open).toBe(true);` | PASS |
| D17 | T1.6 the routine shows with it | same test; `expect(details?.textContent).toContain('Routine collecte-mac');` | PASS |
| D18 | T1.7 13 folded rows fit 375 by 812, no third line | structural: RecurringTaskRow.tsx:43 `min-h-11` and :50-51, two `block … truncate` lines. jsdom has no layout; measured in a browser, see A09 | PASS |
| D19 | T1.8 an empty list shows the faint empty state | `'shows the faint empty state when there is no task'` at RecurringTaskBoard.test.tsx:114; `expect((await screen.findByText('Aucune tâche récurrente')).parentElement?.role).toBe('status');` | PASS |
| D20 | T2.1 the index comes right under the header, before any other content | (none found). Failing case: move `<TodayIndex … />` back below `<TodayAwaited … />` in TodayOverview.tsx, which is the layout N2 describes. Every test still passes: App.test.tsx:154-168 asserts only `expect(text).toContain(expected)` | FAIL (blocking) |
| D21 | T2.1 each tile is a door with its counter; T2.2 the nine tiles in the fixed order | `'shows the nine tiles in their fixed order, each a door with its counter'` at TodayIndex.test.tsx:44; the `toStrictEqual` on the nine `[textContent, href]` pairs | PASS |
| D22 | T2.2 « Récurrentes » counts the due recurring tasks | (none found). Failing case: replace `countDueTasks(recurring.data?.tasks ?? [])` at TodayOverview.tsx:63 with `0`. Every test still passes. `TodayIndex.test.tsx` passes the count as a prop, and App.test.tsx serves no `/api/recurring-tasks`, so the screen test only ever sees zero | FAIL (blocking) |
| D23 | T2.2 « Lancements » opens the Message screen at its list | `'lands on the list when the address names it, and stays put otherwise'` at MessagePage.test.tsx:114; `expect(scrollIntoView).toHaveBeenCalledTimes(1);`, with `['Lancements', '/message#runs']` at TodayIndex.test.tsx:54 | PASS |
| D24 | T2.3 a tile is always shown and never moves | `'keeps every tile in place at zero, its count muted'` at TodayIndex.test.tsx:59; the `toStrictEqual` on the nine labels | PASS |
| D25 | T2.3 a count of zero is muted | same test; `screen.getAllByText('0').every((count) => count.className.includes('text-ink-faint'))` | PASS |
| D26 | T2.4 alert colour on « En retard » and « Récurrentes » when not zero, the others calm | `'raises the alert only on the overdue and the recurring tiles when they are not zero'` at TodayIndex.test.tsx:78; `toStrictEqual(['2En retard', '7Récurrentes'])`, and at zero `expect(tiles.some((tile) => tile.className.includes(ALERT_CLASS))).toBe(false);` at :75 | PASS |
| D27 | T2.5 the index fits the first screen | structural: TodayIndex.tsx:122 `grid grid-cols-3 gap-2` and IndexTile.tsx:32 `min-h-16`, three rows. Measured in a browser, see A16 | PASS |
| D28 | T2.6 the order below the index: birthdays, brief, agenda, « En attente », focus, activity | (none found). Failing case: swap `<TodayFocus … />` and `<TodayAgenda … />` in TodayOverview.tsx:68-70. Every test still passes, for the reason of D20 | FAIL (blocking) |
| D29 | T2.6 the activity is folded under « Activité · N » and unfolds on a tap | `'folds the activity under its counter and unfolds it on a tap'` at TodayActivity.test.tsx:19; `expect(details?.open).toBe(false);`, `screen.getByText('Activité · 2')`, `expect(details?.open).toBe(true);` | PASS |
| D30 | T2.7 a long press on a tile opens the action sheet | (none found). Failing case: delete the `onLongPress` spread at TodayIndex.tsx:131-139. Every test still passes: no test presses a tile, the only long press tested is on a todo row (App.test.tsx:189) | FAIL (blocking) |
| D31 | T3.1 Engagements leads back to « Jour » | `'leads back to the day'` at CommitmentBoard.test.tsx:23; `expect(screen.getByRole('link', { name: 'Retour' }).getAttribute('href')).toBe('/');` | PASS |
| D32 | T3.1 « Tâches récurrentes » leads back to « Jour » | `'leads back to the day'` at RecurringTaskBoard.test.tsx:120; same assertion | PASS |
| D33 | T3.2 the tab bar keeps its six tabs | structural: the diff touches no tab bar file, and App.test.tsx:48-50 still finds `'Navigation principale'` | PASS |
| D34 | T4.1 the « Scanner » prompt says `scan` | `'draws the dashboard and opens Claude Code on a long-pressed todo'` at App.test.tsx:97; `expect(scanLink?.getAttribute('href')).toContain('skill%20scan%20sur');` at :183 | PASS |
| D35 | T5.1 the state file is known under its key | `'reads the state files from their state keys'` at memory-files.core.test.ts:21; `expect(locateMemoryFile('etat/recurrentes.json')).toEqual({ kind: 'state', key: 'recurring' });` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | No write path in the diff | Check-then-write | `git diff 42012559..HEAD -- 'apps/talos/api/**' \| grep -E '^\+' \| grep -cE 'insert\(\|update\(\|delete\(\|onConflict\|transaction\('` prints 0. The only new route is `.get('/', async (context) => context.json(await readRecurringTasks()))` | PASS |
| E02 | Module-level values in the changed API files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^let '` finds nothing. Read by hand: `const NO_RECURRING_TASKS: RecurringTasks = { generatedAt: null, tasks: [] };` (recurring-tasks.core.ts:38) and `const STATE_FILES: ReadonlyMap<string, string> = new Map([` (memory-files.core.ts:19) are constants no code writes. No cache, counter or limit | PASS |
| E03 | Rules held by a key | Concurrent proof | none to prove: E01 found no write | PASS |

## Blocking findings

- D08 — no test mounts the app at `/recurring`, so renaming the route breaks the « Récurrentes » tile with every test green.
- D20 — no test pins the index as the first content of « Jour », so moving it back under the agenda passes.
- D22 — no test serves `/api/recurring-tasks` to the day screen, so a « Récurrentes » count hard-wired to zero passes.
- D28 — no test pins the order of the content below the index.
- D30 — no test long-presses a tile, so removing the action sheet from the tiles passes.

One screen test closes the five: `App.test.tsx` already serves `/api/today`, and it needs `/api/recurring-tasks` in its routes, an assertion on the order of the children of the day, a long press on a tile, and a mount at `/recurring`.

## Non-blocking findings

- A13 — the « Récurrentes » tile shows a muted « 0 » while `GET /api/recurring-tasks` is pending or has failed, which reads as nothing due.
- B10 — `VOCABULARY.md:91` promises « The app never writes the state » with no `Held by:` line.
- B12 — the « Lancements » tile on « Jour » is labelled by `message.runs.title`, a key of the Message screen.

## Notes

- A23 (UNVERIFIABLE): no plan was written for this feature. The spec is in the short form and names its data shape, so no row above lacked a file list. Run `/technical-conception` first if a plan is wanted on record.
- The 375 px measures come from a Playwright script against `pnpm dev`, with a CDP virtual authenticator as `docs/knowledge/screenshotting-talos-behind-its-passkey.md` prescribes. The script registered a passkey in the local dev database on each of its three runs. I deleted that passkey row and its session row after each run and left the cluster unwiped, and `GET /api/session` answers `registered: false` again, as it did before. The session row dated 17:35 UTC, which predates this review, was left in place.
- In that harness a held touch opened the sheet and the release closed it, on a tile and on a todo row of the agenda alike (`dialogWhileHeld: "Récurrentes · 2"`, `dialogAfter: null`). The todo row is code this branch does not change. Is that the harness sending its `touchEnd` on the backdrop, or does a real finger lift also close the sheet? `scripts/phone.sh` was not run on it.
- `StateDot.tsx` is marked `// @FollowsBlueprint atom-plain`, whose index entry reads « one look », merges the caller's `className` and forwards the ref. `StateDot` draws two looks from `isAlert` and takes no `className`. `PageTitle.tsx`, older, carries the same marker with the same gap. Is `atom-plain` the right blueprint for it? No reviewer bullet covers this.
- `parseRecurringTasks` answers the one shared `NO_RECURRING_TASKS` object, whose `tasks` array is typed mutable. Nothing mutates it today. Should `RecurringTasks.tasks` be `readonly RecurringTask[]`?

## Verdict: FAIL
