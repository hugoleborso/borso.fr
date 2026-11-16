# Technical validation — Revise a song before the next session

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (Tier 1 change routed without a plan)
- Branch: claude/beautiful-curie-v1tz1m
- Base: b0b2b8e8a36e282fb73396d47bfd4bf7d4a95437
- Run at: 2026-11-16T00:17:35Z
- Round: 1
- Reviewed: 3fea86aa8fba9af27ed7a865c0e67c6b8bd0d57e
- Touched workspaces: @borso-app/pragma (site only, no API, domain or CDK file)

The base is the `Reviewed:` SHA of the last passing report (round 2, 2026-11-15 23:00). The spec was revised after it, so this round 1 reads `git diff b0b2b8e8a…3fea86aa8` in full: 3 commits, no merge commit (`git rev-list --merges` prints nothing). The source change drops the box to tick from the setlist row (deletes `molecules/BrushUpCheck.tsx`, strips `linesOf`, `toggle` and `sessionLabel` from `brush-up.hook.ts`, three props from `SetlistEntryRow`, three i18n keys per language) and adds a *Setlist row* VOCABULARY entry and INVARIANTS section. `brush-up.core.ts` and its test are unchanged in this diff. The rest is the round-2 report, the visual report and the archived friction log.

The spec is in the short form (*Why*, *Name*, *Who*, *Behaviour*, *Out of scope*). Categories A and D are built from its *Behaviour* bullets and *Out of scope*, files taken from the diff.

1 use case routed to /visual-validation (Behaviour 5, the menu item fits at 375 px); out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | `plan/` does not exist under `docs/features/pragma/revise-before-next-session/` | UNVERIFIABLE |
| A01 | Behaviour 1 | Next session is the earliest practice or concert on today's band day or later, from `selectNextSession`, not tied to this setlist | apps/pragma/site/src/components/organisms/brush-up.hook.ts:32-35 | `() => selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),` | PASS |
| A02 | Behaviour 2 | The menu shows **To revise** when a next session exists and the member has no task for the song on it | brush-up.hook.ts:46-48; SetlistEntryRow.tsx:69-80, 125-126 | `const session = selectSessionToBrushUp(songTasksOf(songId), memberId, nextSession);` `if (session === null \|\| memberId === null) return undefined;` and in the row `onAskBrushUp === undefined ? [] : [{ label: t('setlist.revise.menu'), …` | PASS |
| A03 | Behaviour 2 | Choosing it creates one task: title `Revise <song title>` in the member's language, assigned to the member, `songId`, `sessionId`, `dueDate` the session's date | brush-up.hook.ts:49-57; en.json `"taskTitle": "Revise {{title}}"`, fr.json `"taskTitle": "Réviser {{title}}"` | `createTask.mutate(buildBrushUpTask({ title: t('setlist.revise.taskTitle', { title: songTitle }), memberId, songId, session, }))` | PASS |
| A04 | Behaviour 2 | Status `todo` | apps/pragma/api/src/tasks/tasks.schema.ts:32 | The body carries no `status`; `status: taskFieldShape.status.default(DEFAULT_TASK_STATUS),` with `DEFAULT_TASK_STATUS` `'todo'` | PASS |
| A05 | Behaviour 2 | With no next session, or while the task list has not loaded, the item is not shown | brush-up.hook.ts:36-43 | `() => (tasks === undefined ? null : indexBrushUpTasksBySong(tasks, nextSession?.id ?? null)),` and `tasksBySong === null ? null : (tasksBySong.get(songId) ?? NO_ROWS);`; the core returns `null` for a `null` list or a `null` session (brush-up.core.ts:44, 46) | PASS |
| A06 | Behaviour 3 | Asking adds no line, badge or checkbox to the setlist row | SetlistEntryRow.tsx:23-41, 81-147 | The props interface carries no task data, only `readonly onAskBrushUp?: () => void;`. Against the pre-feature base `4b7b3e6ad`, the row's markup is unchanged apart from `...brushUpItems,` in the menu (`git diff 4b7b3e6ad HEAD -- SetlistEntryRow.tsx` shows only the prop, the item array and its spread) | PASS |
| A07 | Behaviour 3 | Once asked, the menu item disappears for that member and song | brush-up.hook.ts:47; apps/pragma/site/src/lib/queries/tasks.queries.ts:68-71 | `useCreateTask`'s `onMutate` inserts the task into the cached list: `return { tasks: [...old.tasks, buildOptimisticTask(temporaryId, variables)] };`, so the next render's `selectSessionToBrushUp` finds the member's own task and returns `null` | PASS |
| A08 | Behaviour 4 | The task is ticked like any other, on the session's tasks (Who does what), the band tab and the assistants' tools | apps/pragma/site/src/components/organisms/SessionTasks.tsx:31, 54; task-sheet.hook.ts:97-98 | `selectTasksOfSession(tasksQuery.data?.tasks ?? NO_ROWS, sessionId)` keeps every task with that `sessionId`; `onToggleDone={taskSheet.toggleDone}` → `updateTask.mutate({ id: task.id, status: nextStatusAfterToggle(task.status) });`. The task is an ordinary `task` row written through the shared `useCreateTask` | PASS |
| A09 | Out of scope | No brush-up is shown on any setlist view | repo grep | `grep -rn "BrushUpCheck\|brushUpLines\|linesOf\|revise\.line\|revise\.toggle"` over `apps/pragma` prints nothing; `SongBrushUps` is now `{ readonly askActionOf: … }` only (brush-up.hook.ts:17-19) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read changed source in full | none found (`songTasksOf`, `tasksBySong`, `brushUpItems`, `addBreakItems`) | PASS |
| B02 | Magic numbers / strings extracted | read changed source in full | the only literal added back is the existing `POSITION_DIGITS` use; class strings are unchanged from the pre-feature row | PASS |
| B03 | No prose comments | read changed source in full | only `/** @Feature … */` and `// @FollowsBlueprint …` tags | PASS |
| B04 | Function names describe the result | sample | `useSongBrushUps`, `askActionOf`, `songTasksOf` | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Za-z{]'` on the 5 changed source and test files | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on the 5 changed files | none found (exit 1) | PASS |
| B07 | `noUncheckedIndexedAccess` | read in full | no index access added; `tasksBySong.get(songId) ?? NO_ROWS` (hook:43) | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <5 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B09 | No unused exports or files | `pnpm knip --workspace apps/pragma` | exit 0; only configuration hints. Deleting `BrushUpCheck.tsx` and `BrushUpLine` left no orphan | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B11 | Standards checklist (01): "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" | read VOCABULARY.md *Brush-up* and *Setlist row*, INVARIANTS.md *Setlist row* and *Brush-up* against the code | *Brush-up*: "A member asks for one from a song's menu in a setlist, and ticks it with the other tasks" matches the hook and `SessionTasks`. *Setlist row*: "position, album cover, title, its lineup slots or the member's part, artist and key, and the entry's note and tonight's lineup change when set" matches SetlistEntryRow.tsx:91-130. INVARIANTS *Brush-up* now reads `selectSessionToBrushUp`, "reading `indexBrushUpTasksBySong`", which matches hook:37-47 | PASS |
| B12 | Standards checklist (01): "an invariant promising behaviour carries a `Held by:` line" | read INVARIANTS.md | *Setlist row* carries `Held by: … SetlistEntryRow.test.tsx › grows by the note and tonight’s change only, so the list keeps its songs on screen`, a test that exists and runs (C01) | PASS |
| B13 | Standards checklist (01): a `select…` / `build…` returns what its verb says; boolean names not negated | read in full | no new function; no boolean added | PASS |
| B14 | Standards checklist (01): file name says what it holds | file list | `brush-up.hook.ts`, `SetlistEntryRow.tsx` unchanged names; one file deleted | PASS |
| B15 | Standards checklist (03): derived types are derived | read in full | `SongBrushUps` is the hook's own return contract; the hand-written `BrushUpLine` assignee shape is deleted | PASS |
| B16 | Standards checklist (05): no prop family of booleans; no explaining label | read in full | three props removed, none added; the menu label `To revise` is unchanged | PASS |
| B17 | Standards checklist (05): screen holds at 375 px | routed | Behaviour 5 is routed to /visual-validation | PASS |
| B18 | Standards checklist (09): a key's dotted path names the screen and the element | en.json, fr.json | remaining keys `setlist.revise.menu`, `setlist.revise.taskTitle`; the removed `listLabel`, `line`, `toggle` are gone in both languages and referenced nowhere | PASS |
| B19 | Standards checklist (10): a test name states the behaviour and the condition | SetlistEntryRow.test.tsx:159 | `it('grows by the note and tonight’s change only, so the list keeps its songs on screen'` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse b0b2b8e8a…) --coverage --reporter=verbose` | 0. 69 files, 381 tests passed, among them `SetlistEntryRow.test.tsx` (10, including `grows by the note and tonight’s change only…`) and `SetlistEntriesList.test.tsx` (`asks for a brush-up of the tapped song with its title`). No coverage-included file changed, so the coverage summary is empty | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core site/src/components/organisms/brush-up.core.test.ts --reporter=verbose` | 0. 8 tests passed (run by name because `brush-up.core.ts` is unchanged, so `--changed` does not pick it, and category D cites it) | PASS |
| C03 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed $(git rev-parse b0b2b8e8a…) --reporter=verbose` | 0. "No test files found": no file under `api/` changed | PASS |
| C04 | @borso-app/pragma | `scripts/mutate-changed.sh` | not run: the diff changes no `.core`, `.utils` or `.adapter` file or its test | PASS |
| C05 | @borso-app/pragma | `*.utils.ts` in the diff | none | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 1: the next session is the earliest on today's band day or later | `it('keeps a session from earlier today as the next one until midnight')` at apps/pragma/domain/session-schedule.core.test.ts:26, `expect(selectNextSession([TOMORROW, TONIGHT, THIS_MORNING, LAST_WEEK], NOW)).toBe(THIS_MORNING);` | PASS |
| D02 | Behaviour 1: practice or concert, nearest wins, need not carry this setlist | **structural:** `selectNextSession` filters only on `isComing(session, today)` (session-schedule.core.ts:42), and the hook passes the whole sessions list (brush-up.hook.ts:33) | PASS |
| D03 | Behaviour 2: **To revise** shows when a next session exists and the member has no task on the song for it | `it('offers the next session when the member has no task on the song for it')` at brush-up.core.test.ts:46, `expect(selectSessionToBrushUp([task({ assigneeId: 'bruno' })], 'anna', NEXT)).toBe(NEXT);`; `it('offers To revise in its more menu only when the member can still ask')` at SetlistEntryRow.test.tsx:147, `expect(onAskBrushUp).toHaveBeenCalledOnce();` | PASS |
| D04 | Behaviour 2: choosing it creates one task for the tapped song | `it('asks for a brush-up of the tapped song with its title')` at SetlistEntriesList.test.tsx:96, `expect(askActionOf).toHaveBeenCalledWith('song-a', 'a'); expect(ask).toHaveBeenCalledOnce();` | PASS |
| D05 | Behaviour 2: title `Revise <song title>` in the member's language | (none found). `buildBrushUpTask` takes the title as input (brush-up.core.test.ts:69 passes `'Revise Roxanne'`), and nothing exercises brush-up.hook.ts:52. Replacing `t('setlist.revise.taskTitle', …)` with `t('setlist.revise.menu')` passes every test and writes tasks titled "To revise". The code is right today, so nothing breaks if it ships. Fix size: one hook test | FAIL (non-blocking) |
| D06 | Behaviour 2: assigned to the member, `songId`, `sessionId`, `dueDate` the session's date | `it('assigns the member and dates the task on the session')` at brush-up.core.test.ts:66, `toEqual({ title: 'Revise Roxanne', assigneeId: 'anna', songId: 'song-a', sessionId: 'next', dueDate: … })` | PASS |
| D07 | Behaviour 2: status `todo` | **structural:** no `status` in the body; the API defaults it at tasks.schema.ts:32 `status: taskFieldShape.status.default(DEFAULT_TASK_STATUS),` | PASS |
| D08 | Behaviour 2: with no next session the item is not shown | `it('offers nothing with no next session or no signed-in member')` at brush-up.core.test.ts:59, `expect(selectSessionToBrushUp([], 'anna', null)).toBeNull();`; SetlistEntryRow.test.tsx:156 `expect(screen.queryByRole('menuitem', { name: 'To revise' })).toBeNull();` | PASS |
| D09 | Behaviour 2: while the task list has not loaded the item is not shown, rule side | `it('offers nothing while the task list has not arrived')` at brush-up.core.test.ts:55, `expect(selectSessionToBrushUp(null, 'anna', NEXT)).toBeNull();` | PASS |
| D10 | Behaviour 2: while the task list has not loaded the item is not shown, hook side | (none found). Nothing tests that `useSongBrushUps` turns an undefined `tasksQuery.data` into `null`. Replace brush-up.hook.ts:38 `(tasks === undefined ? null : indexBrushUpTasksBySong(tasks, …))` with `indexBrushUpTasksBySong(tasks ?? [], …)`: every test passes, and a member tapping **To revise** before `GET /api/tasks` answers can post a duplicate. The code is right today. Carried from the 2026-11-15 23:00 report (its D02), still unfixed. Fix size: one hook test | FAIL (non-blocking) |
| D11 | Behaviour 3: asking adds no line, badge or checkbox to the row | `it('grows by the note and tonight’s change only, so the list keeps its songs on screen')` at SetlistEntryRow.test.tsx:159, `expect(row?.querySelectorAll('input, ul').length).toBe(0);` and `expect(row?.textContent).not.toContain('revise');`, with `onAskBrushUp` set. **structural:** `SetlistEntryRowProps` (SetlistEntryRow.tsx:23-41) carries no task data, so the row has nothing to draw a task from | PASS |
| D12 | Behaviour 3: once asked, the menu item disappears for that member and song | `it('offers nothing once the member has one, even ticked and beside another member’s')` at brush-up.core.test.ts:50, `expect(selectSessionToBrushUp(tasks, 'anna', NEXT)).toBeNull();`; the hook reads the list `useCreateTask` writes optimistically (tasks.queries.ts:70) | PASS |
| D13 | Behaviour 4: ticked on the session's tasks (Who does what) | `it('keeps the tasks linked to that session')` at band-tasks.core.test.ts:101, `expect(selectTasksOfSession(tasks, 'session-1').map((entry) => entry.id)).toEqual(['a']);`; `it('sends a checkbox back to the status a task starts at')` at domain/task-status.core.test.ts:17, `expect(nextStatusAfterToggle('todo')).toBe('done');` | PASS |
| D14 | Behaviour 4: on the band tab and the assistants' task tools, editable and deletable there | **structural:** the task is written through the shared `useCreateTask` (brush-up.hook.ts:50) as an ordinary `task` row, the one table `TasksPage` and the task tools read | PASS |
| D15 | Behaviour 5: the menu item fits at 375 px | routed to /visual-validation | routed to /visual-validation |
| D16 | Out of scope: no brush-up on any setlist view | **structural:** `SongBrushUps` exposes only `askActionOf` (brush-up.hook.ts:17-19), and the only imports of `brush-up.*` outside its own files are `useSongBrushUps` in SetlistEditor.tsx:32 and the `SongBrushUps` type in SetlistEntriesList.tsx:22 and its test (`grep -rn "brush-up" apps/pragma/site/src \| grep import`) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E00 | Server write paths | Does the diff add or change one? | `git diff --name-status b0b2b8e8a…HEAD` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`; the API is unchanged, as the spec states | PASS |
| E01 | `askActionOf` → `createTask.mutate(buildBrushUpTask(...))` (brush-up.hook.ts:46-57) | Check-then-write | Code unchanged by this diff apart from the deleted siblings. "The member has no task yet for this song on this session" is read from the client cache and held by no key; the same member tapping on two devices before either refetches gets two tasks. The spec states a visibility rule, not a uniqueness rule, and rules out an API change; round 1 of 2026-11-15 graded it non-blocking and its dismissal held in round 2 (R05). Nothing in this diff changes that | PASS |
| E02 | `toggle` → `updateTask.mutate` (formerly brush-up.hook.ts:85-89) | Check-then-write | Deleted by this diff; ticking now goes through `task-sheet.hook.ts:97-98`, unchanged | PASS |
| E03 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds none; `NO_ROWS` (hook:21) is a frozen empty array. Site code only, no Lambda state | PASS |
| E04 | Concurrent proof | Key-held rules | No rule in the diff is held by a key | PASS |

## Blocking findings

- none

## Non-blocking findings

- D05: no test pins that the task's title comes from `setlist.revise.taskTitle`; swapping the key in brush-up.hook.ts:52 passes every test.
- D10: no test pins that `useSongBrushUps` hides **To revise** while `GET /api/tasks` has not answered; reverting brush-up.hook.ts:38 to `tasks ?? []` passes every test. Carried from the previous report.

## Notes

- A00 is UNVERIFIABLE by design. The change was routed as Tier 1 without a plan, and the files were taken from the diff.
- `BrushUpTask.status` (brush-up.core.ts) is no longer read by any code since `linesOf` was deleted. Only brush-up.core.test.ts sets it, to show a ticked task still hides the item. Is it worth keeping as documentation, or should the type drop it? The file is unchanged in this diff, so no row is raised.
- INVARIANTS *Setlist row* says a song row "grows only by the entry's note and tonight's lineup change". The `<li>` also holds `props.transitionBefore` (SetlistEntryRow.tsx:83), the transition marker before the song. Read as the bordered row it is true. Should the sentence name the transition as sitting outside the row, so a reader of the `<li>` does not find a third thing?
- The optimistic insert that makes the item disappear after a tap (tasks.queries.ts:68-71) is tested nowhere in pragma (`grep -rn buildOptimisticTask` finds only its definition and call). Should `useCreateTask`'s optimistic list write get a test of its own?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
