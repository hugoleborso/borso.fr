# Technical validation — Revise a song before the next session

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (Tier 1 change routed without a plan)
- Branch: claude/beautiful-curie-v1tz1m
- Base: 4b7b3e6ad980a779a2b3bc8bed5490dbad2a2c21
- Run at: 2026-11-15T22:45:00Z
- Round: 1
- Reviewed: 84ce1008da00690263d5a3889e7d0ad68aa183c3
- Touched workspaces: @borso-app/pragma (site only, no API, domain or CDK file)

The spec is in the short form (Why, Who, Behaviour, Out of scope). Categories A and D are built from its five *Behaviour* items and its *Out of scope* bullets, and the files are taken from the diff. No merge commit sits above the base (`git rev-list --merges` printed nothing).

2 use cases routed to /visual-validation; out of scope for this report (behaviour 5, the line and the menu item fit at 375 px; behaviour 3, a done line drawn struck through).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | `plan/` does not exist under `docs/features/pragma/revise-before-next-session/` | UNVERIFIABLE |
| A01 | Behaviour 1 | The next session is the earliest practice or concert on today's band day or later, by `selectNextSession` | apps/pragma/site/src/components/organisms/song-revision.hook.ts:48-51 | `() => selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs)),` | PASS |
| A02 | Behaviour 1 | It does not have to carry this setlist | song-revision.hook.ts:49 | The sessions passed are the whole `sessionsQuery.data?.sessions`; nothing filters by `setlistId` | PASS |
| A03 | Behaviour 2 | **To revise** shows only when a next session exists and the signed-in member has no task yet for that song on that session | song-revision.hook.ts:52, 72-74; song-revision.core.ts:44-46 | `const tasks = tasksQuery.data?.tasks ?? NO_ROWS;` then `const session = selectSessionToRevise(songTasksOf(songId), memberId, nextSession);` | FAIL (blocking) |
|  |  | Failing case | | Anna already holds the task "Revise Roxanne" on the next practice. She opens `/setlists/:id`. `GET /api/sessions` and `GET /api/me` have answered, `GET /api/tasks` is still pending or has failed (`SetlistEditor` waits only on `entriesQuery.isLoading`, SetlistEditor.tsx:184). `tasks` falls back to `NO_ROWS`, so `selectSessionToRevise` sees no task of hers and the ⋯ menu of Roxanne shows **To revise**. Choosing it posts a second task. `useCreateTask`'s optimistic write returns `old` unchanged while the list is `undefined` (tasks.queries.ts `if (old === undefined) return old;`), so each further tap in that window posts one more. Inferred from reading the code; not reproduced in a running browser. Fix size: one line (return `undefined` from `askActionOf` while `tasksQuery.data === undefined`). | |
| A04 | Behaviour 2 | Title `Revise <song title>` in the member's language | song-revision.hook.ts:78; en.json / fr.json `setlist.revise.taskTitle` | `title: t('setlist.revise.taskTitle', { title: songTitle }),` with `"taskTitle": "Revise {{title}}"` and `"taskTitle": "Réviser {{title}}"` | PASS |
| A05 | Behaviour 2 | Assigned to the signed-in member; `songId` the song, `sessionId` the next session, `dueDate` the session's date | song-revision.core.ts:56-61 | `assigneeId: input.memberId, songId: input.songId, sessionId: input.session.id, dueDate: new Date(input.session.date).toISOString(),` | PASS |
| A06 | Behaviour 2 | Status `todo` | apps/pragma/api/src/tasks/tasks.schema.ts:34; domain/task-status.core.ts:5 | `status: taskFieldShape.status.default(DEFAULT_TASK_STATUS)` and `export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';` (the body omits `status`) | PASS |
| A07 | Behaviour 2 | With no next session, the item is not shown | song-revision.core.ts:44; SetlistEntryRow.tsx:75-85 | `if (memberId === null \|\| nextSession === null) return null;` and `onAskRevision === undefined ? [] : [...]` | PASS |
| A08 | Behaviour 3 | Under a song row, each task of that song on the next session is one line, done ones included | song-revision.core.ts:30-35; SetlistEntryRow.tsx:153-169 | `if (sessionId === null \|\| task.sessionId !== sessionId \|\| task.songId === null) continue;` and `{props.revisionLines.map((line) => ( <RevisionCheck ...` | PASS |
| A09 | Behaviour 3 | The line shows a checkbox, the assignee's first name and the session label (kind and date) | RevisionCheck.tsx:23-37; band-tasks.core.ts:91; session-label.utils.ts:16 | `return member === undefined ? null : { name: member.firstName, ...}`; the label is `[parts.kindLabel, parts.dateLabel, parts.venue].filter(isShown).join(LABEL_SEPARATOR)` | FAIL (non-blocking) |
|  |  | Failing case | | Next session a concert at venue "La Cigale" on Sat 21 Nov → the line reads "Léa revises it for Concert · Sat 21 Nov · La Cigale", where the spec names kind and date only. `useSessionLabel` adds the venue whenever one is set. Nothing breaks; either the spec's parenthesis describes the shared label or the line needs a kind-and-date label. Fix size: one line. | |
| A10 | Behaviour 3 | Ticking marks done; unticking reopens | song-revision.hook.ts:85-89 | `updateTask.mutate({ id: taskId, status: nextStatusAfterToggle(status) });` with `nextStatusAfterToggle` mapping `done` to `todo` and anything else to `done` | PASS |
| A11 | Behaviour 3 | A done task stays on the row, ticked, until the session's day is past | song-revision.core.ts:30-35; domain/session-schedule.core.ts:40-43 | Done tasks are not filtered out; the session stays "next" until `isComing(session, today)` fails on the band day after | PASS |
| A12 | Behaviour 4 | The task is an ordinary task, shown on the session's tasks, the band tab and the assistants' tools | song-revision.hook.ts:76 | Written through the shared `useCreateTask()` (`api.api.tasks.$post`) with no new field or endpoint | PASS |
| A13 | Out of scope | No revision lines on the scene view, the order screen or practice mode | SetlistEditor.tsx:197-216 | `SetlistEntriesList` (the only caller of `SetlistEntryRow`) is rendered only by `SetlistEditor`, which only `routes/setlists/SetlistEditorPage.tsx:159` mounts; `PracticeModePage.tsx` gains only `useTransitionNotesByPair()` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read in full; `borso/no-abbreviated-identifier` via oxlint | Sample: `songTasksOf`, `statusOf`, `labelOf`, `hasOwnRevision`, `reviseItems`. None found | PASS |
| B02 | Magic numbers and strings extracted | read in full | No new literal outside i18n keys and Tailwind classes | PASS |
| B03 | No prose comments | `grep -nP '//\|/\*'` on the changed files | Only `/** @Feature … */` and `// @FollowsBlueprint …` annotations | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\b)\w'` | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `bySong.get(task.songId) ?? []`, `tasksBySong.get(songId) ?? NO_ROWS`, `tasks.find(...)?.status ?? null` | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <11 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none found; the clock is read with `useSyncExternalStore(subscribeClock, …)` | PASS |
| B09 | knip clean | `pnpm knip --workspace apps/pragma` | exit 0; three configuration hints, no unused file or export | PASS |
| B10 | Standards checklist: "a `find…` returns `null` … and a `build…`, `project…` or `select…` returns what its verb says" (01-naming) | read in full | `selectSessionToRevise` returns the session or `null`, `buildRevisionTask` returns the write body, `indexRevisionTasksBySong` returns a map | PASS |
| B11 | Standards checklist: "a definition in a `VOCABULARY.md` … [is] still true" (01-naming), and CLAUDE.md "Read `apps/<app>/VOCABULARY.md` before naming" | read in full | apps/pragma/VOCABULARY.md:860-862 refuses the word: "**revision**, **review**, **practice session**, **homework**: … **revision** reads as a version in code". The branch names `song-revision.core.ts`, `song-revision.hook.ts`, `RevisionCheck.tsx`, `RevisionTask`, `RevisionLine`, `SongRevisions`, `useSongRevisions`, `indexRevisionTasksBySong` (e.g. song-revision.core.ts:9 `export interface RevisionTask {`), and adds no vocabulary entry for the new concept. Introduced: this branch. Fix size: 4 files plus the 3 test files | FAIL (non-blocking) |
| B12 | Standards checklist: "a derived type is derived … rather than being written out by hand beside the thing it mirrors" (03-typing) | read in full | `{ readonly name: string; readonly color: string } \| null` is written by hand at song-revision.hook.ts:24 and RevisionCheck.tsx:10, beside `findAssignee`'s identical return type (band-tasks.core.ts:89). `RevisionTaskWrite` (song-revision.core.ts:18) restates a subset of the create body (`TaskCreateVariables`). The compiler still checks the `mutate` call, so nothing breaks. Introduced: this branch. Fix size: one file | FAIL (non-blocking) |
| B13 | Standards checklist: "the choice between `.core.ts` and `.utils.ts`" (02-purity) | read in full | Whether a member has a task on the song for the next session is a band rule, so `.core.ts` fits | PASS |
| B14 | Standards checklist: "a key's dotted path names the screen and the element" (09-i18n) | en.json / fr.json diff | `setlist.revise.menu`, `setlist.revise.line`, `setlist.revise.toggle`, `setlist.revise.listLabel`, `setlist.revise.taskTitle`; both catalogues carry all five | PASS |
| B15 | Standards checklist: "a test name states the behaviour and the condition" (10-testing) | read the 10 new tests | e.g. `offers nothing once the member has one, even ticked`, `offers To revise in its more menu only when the member can still ask` | PASS |
| B16 | Standards checklist: "no new … button label explains the interface" (05-frontend) | read in full | The menu item is the short label "To revise" with the `tasks` icon | PASS |
| B17 | Standards checklist: "a prop set has not grown a family of booleans where one variant string belongs" (05-frontend) | read in full | The row gains `revisionLines`, `revisionSessionLabel`, `onToggleRevision`, `onAskRevision`; `RevisionCheck` holds one boolean, `isDone` | PASS |
| B18 | Standards checklist: "a mutation whose full result the client already holds reconciles from the response" (06-data-fetching) | read in full | The branch reuses `useCreateTask` (settles from `data.task`) and `useUpdateTask`; it adds no mutation | PASS |
| B19 | Standards checklist: "a limit or a rule written in a site does not restate one the API enforces" (02-purity) | read in full | The API holds no rule about one task per member, song and session; `selectSessionToRevise` restates nothing | PASS |
| B20 | Blueprint markers on new files | read in full | `// @FollowsBlueprint molecule-presentational` (RevisionCheck.tsx:16), `core-view-projection` (song-revision.core.ts:25), `hook-stateful-helper` (song-revision.hook.ts:36, transition-notes.hook.ts:9) | PASS |
| B21 | Standards checklist: `INVARIANTS.md` of each changed folder still true | read `components/organisms/INVARIANTS.md` and `components/molecules/INVARIANTS.md` | The branch changes no rule they state | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 4b7b3e6ad980a779a2b3bc8bed5490dbad2a2c21 --coverage --reporter=verbose` | 0. 70 files, 388 tests passed, including the 7 tests of `song-revision.core.test.ts`, 2 new in `SetlistEntryRow.test.tsx` and 1 new in `SetlistEntriesList.test.tsx`. Coverage of the gated changed file 100% statements, branches, functions and lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 4b7b3e6ad980a779a2b3bc8bed5490dbad2a2c21 --reporter=verbose` | 0. "No test files found": the branch changes no file under `api/`, so no back-e2e test imports a changed file | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 4b7b3e6ad980a779a2b3bc8bed5490dbad2a2c21 apps/pragma/site/src/components/organisms/song-revision.core.ts` | 1. Score 93.55, 29 killed, 2 survived, threshold 100 | FAIL (blocking) |
|  |  | Survivor 1 | `song-revision.core.ts:44:28` `if (memberId === null \|\| nextSession === null) return null;` mutated to `\|\| false`. The mutant is equivalent: with `nextSession === null` the function returns `nextSession`, which is `null`. The check is dead and should go, or the function should be restructured so no mutant exists. | |
|  |  | Survivor 2 | `song-revision.core.ts:45:26` `songTasks.some(...)` mutated to `songTasks.every(...)`. No test gives a song a task of another member **and** one of the signed-in member. With `[task({ assigneeId: 'bruno' }), task({ assigneeId: 'anna' })]` for `anna`, `some` returns `null` and `every` returns the session, so the mutant would show **To revise** to a member who already has one. CI runs this gate on every pull request. | |
| C04 | @borso-app/pragma | `*.utils.ts` files changed | none in the diff; no new `*.utils.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 1: the next session is the earliest on today's band day or later | `it('keeps a session from earlier today as the next one until midnight')` at apps/pragma/domain/session-schedule.core.test.ts:26, `expect(selectNextSession([TOMORROW, TONIGHT, THIS_MORNING, LAST_WEEK], NOW)).toBe(THIS_MORNING);`; the hook passes every session to it (song-revision.hook.ts:49) | PASS |
| D02 | Behaviour 1: practice or concert, the nearest of either wins; it need not carry this setlist | **structural:** `selectNextSession` filters only on `isComing(session, today)` (session-schedule.core.ts:42), with no kind or setlist filter, and the hook passes the whole sessions list (song-revision.hook.ts:49) | PASS |
| D03 | Behaviour 2: **To revise** shows when the member has no task on the song for the next session | `it('offers the next session when the member has no task on the song for it')` at song-revision.core.test.ts:30, `expect(selectSessionToRevise([task({ assigneeId: 'bruno' })], 'anna', NEXT)).toBe(NEXT);` and `it('offers To revise in its more menu only when the member can still ask')` at SetlistEntryRow.test.tsx:150, `expect(onAskRevision).toHaveBeenCalledOnce();` | PASS |
| D04 | Behaviour 2: **To revise** is hidden once the member has a task on that song and session, other members' tasks beside it | `it('offers nothing once the member has one, even ticked')` at song-revision.core.test.ts:34 sets up only the member's own task. No test puts another member's task beside it (see C03 survivor 2), and no test covers the tasks list still loading (A03) | FAIL (blocking) |
| D05 | Behaviour 2: with no next session the item is not shown | `it('offers nothing with no next session or no signed-in member')` at song-revision.core.test.ts:38, `expect(selectSessionToRevise([], 'anna', null)).toBeNull();`; SetlistEntryRow.test.tsx:157 `expect(screen.queryByRole('menuitem', { name: 'To revise' })).toBeNull();` | PASS |
| D06 | Behaviour 2: choosing it creates one task for the tapped song | `it('asks for a revision of the tapped song with its title')` at SetlistEntriesList.test.tsx:101, `expect(askActionOf).toHaveBeenCalledWith('song-a', 'a'); expect(ask).toHaveBeenCalledOnce();` | PASS |
| D07 | Behaviour 2: title `Revise <song title>` in the member's language | (none found). `buildRevisionTask` takes the title as input (song-revision.core.test.ts:44 passes `'Revise Roxanne'`), and nothing exercises `song-revision.hook.ts:78`. Swapping the key for another one passes every test. Nothing is wrong in the code today | FAIL (non-blocking) |
| D08 | Behaviour 2: assigned to the signed-in member, with `songId`, `sessionId` and `dueDate` the session's date | `it('assigns the member and dates the task on the session')` at song-revision.core.test.ts:43, `toEqual({ title: 'Revise Roxanne', assigneeId: 'anna', songId: 'song-a', sessionId: 'next', dueDate: '2026-11-18T18:00:00.000Z' })` | PASS |
| D09 | Behaviour 2: status `todo` | **structural:** the body carries no `status`, and the API defaults it with `taskFieldShape.status.default(DEFAULT_TASK_STATUS)` (tasks.schema.ts:34), `DEFAULT_TASK_STATUS = 'todo'` (task-status.core.ts:5) | PASS |
| D10 | Behaviour 3: each task of the song on the next session is one line, done ones included | `it('groups the tasks of the next session by song, done ones included')` at song-revision.core.test.ts:20, `expect(index.get('song-a')).toEqual([first, second]);` and `it('leaves out tasks of another session and tasks about no song')`, `expect(index.size).toBe(0);` | PASS |
| D11 | Behaviour 3: the line is a checkbox, the first name and the session label | `it('draws each revision of the next session as a box to tick')` at SetlistEntryRow.test.tsx:162, `expect(screen.getByText('Léa revises it for Practice · Wed 18 Nov')).toBeTruthy();` and `expect(tomBox).toHaveProperty('checked', true);` | PASS |
| D12 | Behaviour 3: ticking marks done | SetlistEntryRow.test.tsx:162, `expect(onToggleRevision).toHaveBeenCalledExactlyOnceWith('task-1');`; `it('sends a checkbox back to the status a task starts at')` at domain/task-status.core.test.ts:17, `expect(nextStatusAfterToggle('todo')).toBe('done');` | PASS |
| D13 | Behaviour 3: unticking reopens | domain/task-status.core.test.ts:18, `expect(nextStatusAfterToggle('done')).toBe(DEFAULT_TASK_STATUS);`; the hook passes the cached status straight to it (song-revision.hook.ts:88) | PASS |
| D14 | Behaviour 3: a done task stays until the session's day is past | session-schedule.core.test.ts:26 (the session stays next until midnight) and :30 `it('skips the sessions of past days')`, with song-revision.core.test.ts:20 keeping done tasks | PASS |
| D15 | Behaviour 4: the task is an ordinary task | **structural:** written through the shared `useCreateTask` (song-revision.hook.ts:76), so it reaches the same `task` table every other view reads | PASS |
| D16 | Behaviour 5: line and menu item fit at 375 px | routed to /visual-validation | routed to /visual-validation |
| D17 | Behaviour 3: a done line is drawn struck through | routed to /visual-validation | routed to /visual-validation |
| D18 | Out of scope: no lines on scene view, order screen or practice mode | **structural:** `SetlistEntryRow` is reached only through `SetlistEntriesList`, which only `SetlistEditor` renders (SetlistEditor.tsx:197) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E00 | Server write paths | Does the diff add or change one? | `git diff --name-only <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing; the API is unchanged, as the spec states | PASS |
| E01 | `askActionOf` → `createTask.mutate(buildRevisionTask(...))` (song-revision.hook.ts:72-83) | Check-then-write | "The member has no task yet for this song on this session" is read from the client's cached task list and nothing holds it at write time. The same member taps **To revise** on Roxanne on a phone and a laptop before either refetches → two tasks for Anna, Roxanne, the next practice. In one tab the optimistic insert hides the item after the first tap, except while the list is still `undefined` (A03). The spec states a visibility rule, not a uniqueness rule, and rules out an API change, so a duplicate is an ordinary task that can be deleted. See Notes | FAIL (non-blocking) |
| E02 | `toggle` → `updateTask.mutate({ id, status })` (song-revision.hook.ts:85-89) | Check-then-write | Two members ticking the same line at once both send `status: 'done'`, so the result is the same either way. A tick and an untick crossing is last-write-wins on one column of one row, and either end state is one a member chose | PASS |
| E03 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed files finds none; the only module constants are `NO_ROWS` (song-revision.hook.ts:30, transition-notes.hook.ts:7), frozen empty arrays. All site code, so no Lambda state | PASS |
| E04 | Concurrent proof | Key-held rules | No rule in the diff is held by a key, so no concurrent test applies | PASS |

## Blocking findings

- A03: **To revise** shows, and posts a duplicate task, while `GET /api/tasks` is pending or failed, because `tasks` falls back to an empty list (song-revision.hook.ts:52).
- C03: `scripts/mutate-changed.sh` fails at 93.55. One survivor is equivalent (the dead `nextSession === null` check at song-revision.core.ts:44). The other (`some` to `every` at :45) survives because no test mixes another member's task with the member's own.
- D04: no test pins "hidden once the member has a task" when another member's task is beside it, or while the task list is loading.

## Non-blocking findings

- A09: the line's session label includes the venue when one is set; the spec says kind and date.
- B11: identifiers use "revision", which apps/pragma/VOCABULARY.md:860-862 refuses ("reads as a version in code"). The new concept has no vocabulary entry.
- B12: the assignee shape is written by hand twice beside `findAssignee`'s return type, and `RevisionTaskWrite` restates a subset of the create body.
- D07: no test checks the task title key `setlist.revise.taskTitle` that the hook uses.
- E01: two devices of one member can create two tasks for one song and session. No API key holds the rule, and the spec rules out an API change.

## Notes

- A00 is UNVERIFIABLE by design. The change was routed as Tier 1 without a plan, and the files were taken from the diff.
- E01: is "one task per member, song and next session" a rule the band needs held, or only the condition that shows the menu item? If it is a rule, it needs a write-time key on the API, which the spec's "Nothing changes on the API" rules out today.
- `useSongRevisions` itself has no test. The core functions and presentational components are tested on their own, and the hook joins them. The A03 fix is the natural place for one hook test, with the task list `undefined`.

## Verdict: FAIL
