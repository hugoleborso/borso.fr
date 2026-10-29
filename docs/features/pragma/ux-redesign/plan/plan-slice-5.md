# Plan: pragma UX redesign, slice 5 (session page, tasks on sessions, practice mode)

> Pair with [`../spec/spec.md`](../spec/spec.md) and the earlier plans in this folder. Short on purpose: the spec carries the decisions, and this file says where each one lands.

Branch `claude/pragma-ux-redesign-slice-5`, stacked on slice 4. It delivers what the spec's *Slices* section gives slice 5: the task's session link ([ADR-0050](../../../../adr/0050-a-task-names-an-optional-session.md)), the task sheet on Band and on the session with every song offered, the session page (setlist preview without key, **Who does what**, takes grouped by song, **Add songs** creating the session's setlist), Home's tasks with the next session's first, and practice mode with **Start the practice** on the session page and on Home.

The operator answered Q11 to Q13 on 2026-10-28: practice mode's position lives on each device (local storage, no schema change), the quick note goes into the current setlist entry's note, and practice mode is offered on the session's own day only. The spec rows now carry those answers.

One schema change, ADR-0050's `task.session_id`, already accepted. No new dependency. The takes list route gains a `sessionId` filter beside `songId`: a query parameter on an existing route, not a new route. Paths are relative to `apps/pragma/site/src/` unless they start with `apps/` or `api/`.

## How each spec decision becomes code

| Spec decision | File | Change | Blueprint |
| --- | --- | --- | --- |
| ADR-0050: nullable `task.session_id`, no foreign key | new `api/src/database/migrations/0021_task_session.sql`, `api/src/tasks/tasks.schema.ts` | `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "session_id" uuid;`; `sessionId` on the table and on the create and update inputs, default `null` | `schema-table-and-input` |
| The task write claims its session, refused with `session-not-found` | `api/src/tasks/tasks.service.ts`, `tasks.repository.ts`, `tasks.controller.ts` | `findLinkRefusalWithin` claims the session with `didClaimSessionWithin` after the assignee and the song; the projection and the insert carry `sessionId`; the controller answers 400 `session-not-found`; `task_created` product event with `hasSession` | `service-crud-update`, `repository-projection`, `controller-dispatch` |
| Deleting a session nulls its tasks' session | `api/src/tasks/tasks.repository.ts`, `tasks.service.ts`, `api/src/sessions/sessions.repository.ts` | `detachDeletedSessionFromTasks` beside `detachDeletedSongFromTasks`, called by `deleteSessionWithCascade` after the session row is removed, as takes are | `repository-owned-transaction` |
| The session page lists the takes recorded at it | `api/src/takes/takes.schema.ts`, `takes.service.ts`, `takes.repository.ts`, `takes.controller.ts` | `GET /api/takes` takes exactly one of `songId` or `sessionId`; `listTakesOfSessionNewestFirst` | `schema-refine-pure-helper`, `controller-dispatch` |
| Site reads and settles the session's takes | `lib/queries/takes.queries.ts` | `useTakesOfSession` under `takeKeys.ofSession`; `writeCreatedTake`, take delete and comment counts also write the session's list | `query-module`, `query-settled-from-the-write-response` |
| Task sheet: every song, an optional session, preset from the session page | `components/organisms/TaskForm.tsx`, `TaskSheetHost.tsx`, `task-sheet.hook.ts`, `routes/band/band-tasks.core.ts`, `lib/queries/tasks.queries.ts`, `routes/band/BandPage.tsx`, `routes/home/HomePage.tsx` | `songs` replaces `compositions`; a session select listing sessions coming first; `sessionId` in the form shape and the write payload; `openNewTask(preset)` takes an optional session; `selectTasksOfSession` | `organism-form`, `hook-stateful-helper`, `core-form-schema` |
| Home: Your tasks with the next session's first; **Start the practice** on the practice's day | `routes/home/home.core.ts`, `routes/home/HomePage.tsx` | `buildHomeView` orders the member's open tasks with the ones linked to the next session first; `selectHomePrimaryAction` answers **Start the practice** (`play`) when practice mode is offered | `core-view-projection-joining-two-lists`, `core-view-intent` |
| Practice mode offered: a practice, on its own day, with at least one song | new `routes/sessions/practice-mode.core.ts` | `isPracticeModeOffered(session, songCount, now)` on `bandDayOf`, `now` a parameter | `core-decision` |
| Session page: setlist preview (count, total time, first three songs with cover, title and lineup, `warn` on a song with no lineup, no key), **Who does what** with **Add a task**, takes grouped by song; no "Prepared concert" picker on a past practice that has none | `components/organisms/SessionDetail.tsx`, new `organisms/SessionSetlistPreview.tsx`, new `organisms/SessionTasks.tsx`, new `organisms/SessionTakes.tsx`, new `routes/sessions/session-page.core.ts` | The core picks the preview rows, the total time and the songs with no lineup, groups the session's takes by song, says when the prepared concert picker shows, and picks the bottom strip's pills. `SessionSetlists` keeps new, attach and detach, moved into the header's `more` menu and each preview's `more` | `organism-query-owning`, `organism-presentational`, `core-view-projection` |
| No setlist yet: **Add songs** creates a setlist named after the session and opens the Add songs sheet, which closes on the setlist | `components/organisms/SessionDetail.tsx`, `organisms/SetlistSongPicker.tsx` | `useCreateSetlist` with the session's name ("Practice · Wed 28 Oct"), then the picker; the picker gains `onAdded`, which the session page uses to open the setlist | `organism-query-owning` |
| Session page primary: **Start the practice** (`play`) and **Open the setlist** on the practice's day; otherwise **Open the setlist** (`arrowR`); **Add songs** with no setlist | `components/organisms/SessionDetail.tsx`, `routes/sessions/session-page.core.ts` | `BottomActions` holds the pills `selectSessionPrimaryActions` picks | `core-view-intent` |
| Practice mode's song order, current and next song, a removed current song | `routes/sessions/practice-mode.core.ts` | `buildPracticeSongs` (setlists in the session's order, then entry position), `resolvePracticePosition` (stored entry, then stored index, then the first), `selectNextPracticeSong` (with the setlist name when it changes) | `core-view-projection` |
| Practice mode's position held on the device, ignored on another day | new `lib/practice-position.adapter.ts`, new `lib/practice-position.store.ts`, `routes/sessions/practice-mode.core.ts` | The adapter reads and writes `pragma.practice.<sessionId>` in local storage, each call in `try`; the core parses the stored text (`parseStoredPracticePosition`) and drops a position from another day; the store mirrors it through `useSyncExternalStore` | `adapter-storage-keyed-by-record`, `core-persisted-slice-parsed-not-trusted`, `hook-external-store` |
| Practice mode screen: header with the session and "Song 3 of 12" (opens the song list sheet) and `more` (End the practice, Open the setlist); current song with cover, title, artist, key and capo, lineup, entry note, transition comment; **Chords**; takes of this song at this session; Next line; strip **Record a take** and **Next song** / **End the practice** | new `routes/sessions/PracticeModePage.tsx`, new `organisms/PracticeCurrentSong.tsx`, new `organisms/PracticeSongListSheet.tsx`, `App.tsx` | The route reads the session, its setlists, their entries (`useSetlistEntriesOfSetlists`), songs, members, instruments, transitions and the session's takes, and holds the recording controller (`useRecordingSheet`, `RecordingSheetDialogs`), so recording is one tap and **Next song** is withheld while the sheet is open | `route-detail-page`, `organism-presentational`, `query-module` |
| Quick note into the current entry's note, saved after a pause with "Saved" | new `organisms/PracticeNoteSheet.tsx` | `useSetlistEntryForm`, `SetlistEntryNotesField`, `useLatestTextSave` and `TextSaveStatus`, as the entry sheet does | `organism-form` |
| **Chords** opens the scene view and its close returns to practice mode | `routes/catalog/SongScenePage.tsx`, `routes/catalog/scene-view.core.ts` | `?back=` carries the practice path; `selectSceneExitPath` accepts only a path under `/sessions/` | `core-decision` |
| Vocabulary: Task names a session and any song; **Practice mode**; Session page | `apps/pragma/VOCABULARY.md` | Task updated; new **Practice mode** section | |

Removed when nothing imports them any more: `PracticeRecordingList.tsx` (the session page's takes section and practice mode replace it).

## Tests

- `practice-mode.core.test.ts`, `session-page.core.test.ts`, the new `home.core` and `band-tasks.core` cases, `scene-view.core` exit path, `takes.utils` session helpers: 100% coverage, mutants killed.
- Back-e2e in `tasks.controller.test.ts`: a task saved with a session and a song that is not a composition; `session-not-found` on an unknown session; deleting a session nulls its tasks' session and keeps the tasks. In `takes.controller.test.ts`: the list by session, newest first; 400 with neither or both filters.
- Component tests: `TaskForm` (every song offered, the session preset), `SessionDetail` pills, `PracticeModePage` (Next song moves and writes nothing, resumes from storage, End the practice on the last song).

## Decided while building

- Home's next-session card opens the session page: its date is a link ending in `chevR`. Without it, the session page sat two taps from Home (Sessions tab, then the row), and task 3 from the session page would cost 9 taps against a target of 8.
- The session page keeps **New setlist** and **Attach a setlist** in its header's `more` menu, and **Detach** in each preview's `more` menu, so the page holds no button other than **Add a task** and the bottom strip.
- With no setlist, **Add songs** is the bottom strip's primary pill and the empty state holds no second copy of it. The setlist it creates is named with the session's label ("Practice · Thu, Oct 29, 2026").
- The session page no longer lists a record button per song (`PracticeRecordingList`); recording at a practice goes through practice mode, the entry sheet or the song page.
- **Chords** and **Note** in practice mode are secondary pills: the labelled round action of the song page arrives with slice 6, and practice mode can adopt it then.
- No product event is sent from the site for practice mode (`practice_mode_started`, `practice_mode_ended`, `from_practice_mode`): the site has no product event channel yet, only error reporting, and adding one is beyond this slice. The API's `task_created` now carries `hasSession`.
- Task 13 joins the harness as a walk run by name (`--tasks 13`), with 13b nested in it as 3b is in 3; it moves the coming practice to today through the API before walking, and stays out of `--tasks all`, which is compared with the baseline.

## Acceptance rows (before -> target -> measured)

Measured column: `../validation/slice-5-after.json`, from `--tasks 1,3,7,13` on the slice 5 head at 390x844.

| Row | Before | Target | Measured |
| --- | --- | --- | --- |
| 1 Prepare the next practice | 18 / 3 / 7 (after slice 4) | ≤ 15 / ≤ 1 / ≤ 4, setlist created from the session in the same flow | 15 / 3 / 6; the setlist is created from the session, named after it, with the ten songs in pick order |
| 3 Agree who does what | 9 / 3 / 3, title field at 2.18 screens | ≤ 8 / 0 / ≤ 3, title focused on opening, song options 6 -> 44, task linked to a session | 8 / 0 / 3, 1 text entry; title focused; every song offered; the task carries the session |
| 7 Record a take and comment | 7 / 2 / 3 | ≤ 7 / ≤ 1 / 3, past practice lists its takes 0 of 7 -> 7 of 7 | 8 / 2 / 4 through the song page (slice 6's screen); the past practice now lists its takes |
| 13 Record a take during a practice, from Home on its day | not measured | 2 taps to start recording / 0 / 2, then 1 to stop | 2 / 0 / 3 (Home, practice mode, the recording sheet); Stop cannot be walked without a microphone |
| 13b Next song and record it | not measured | 2 taps / 0 / 1, no write to the server | 2 / 0 / 2 (practice mode, the recording sheet); the current song changes |
| Practice mode: current song, Record a take and Next song with no scroll at 375x667 and 390x844 | no such screen | yes | yes, by screenshot at both sizes |
| Practice mode: position resumed after a reload the same day | no such screen | yes | yes in `PracticeModePage.test.tsx`; the visual validator checks it in a browser |
| Practice mode: take recorded offline, uploaded once online, linked to song and session | no such screen | yes | left to the visual validator, with Chromium's fake microphone |

**Task 1 misses on scrolls and screens.** The three scrolls bring the last picks of the alphabetical list into view, as after slice 4; the spec's happy path picks "using search or a chip instead of scrolling", but a pick keeps the typed search, so a second search appends to the first. Clearing the search after a pick would let the walk search each title. The six screens are Home, Sessions, the New practice dialog, the session page, the Add songs sheet and the setlist the sheet closes on, which the spec asks for; reaching four would mean creating the practice and its songs from one screen, which the spec does not describe.

**Screens counted on tasks 13 and 13b include the recording sheet**, which the target rows did not count.

## Self-check before the gates

- No `useEffect` added: the position lives in an external store, the note save in `useLatestTextSave`'s handlers.
- Every new button has an icon; at most one primary pill per screen (**Start the practice**, **Open the setlist** or **Add songs** on the session; **Record a take** in practice mode).
- No `text-[`, `bg-[`, hex or `rgba()` in the new components; member colours reach the screen through `LineupSlots`.
- One scroll container: the session page and practice mode scroll as documents; the song list sheet's body is its only scroll.
- `.core.ts` files take `now` as a parameter; nothing calls `new Date()` in them.
