# Technical validation — Pragma redesign, slices 2 to 6

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plans: [`../plan/plan-slice-2.md`](../plan/plan-slice-2.md), [`../plan/plan-slice-3.md`](../plan/plan-slice-3.md), [`../plan/plan-slice-4.md`](../plan/plan-slice-4.md), [`../plan/plan-slice-5.md`](../plan/plan-slice-5.md), [`../plan/plan-slice-6.md`](../plan/plan-slice-6.md)
- Branch: claude/pragma-ux-redesign-slice-6 (HEAD `135b8905`)
- Base: origin/claude/pragma-ux-redesign (slice 1, validated separately)
- Run at: 2026-10-28T14:56:42Z
- Touched workspaces: `@borso-app/pragma` (api, domain, site, scripts/task-metrics), root `eslint-rules/`, `.oxlintrc.json`, `scripts/check-named-paths-exist.sh`

Scope: 48 commits, 313 files (235 `.ts`/`.tsx`/`.js` source files added or changed). Each row names the slice that owns it (S2 to S6).

Category D routing: the spec's *Test strategy* routes "every happy path and edge case above" to `/visual-validation`, and also names unit and back-e2e targets. This report grades the claims whose logic lives in a pure function, a store parser or the API, which Vitest can assert without a browser: the ones the unit and back-e2e bullets name, plus the edge cases those functions decide. 13 use cases and edge cases are routed to `/visual-validation` and are out of scope for this report: the initials tile, two glyphs in one cell, dark mode, the member colour contrast on screen, an empty setlist's numbered line, My part's empty-state text, the phone locked while recording, no network in the practice room, two phones recording, microphone refused, storage full, upload errors shown under the button, and every *Acceptance criteria* row.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | S2, D1 | Four tabs, Home, Sessions, Songs, Band, with no count | site/src/components/organisms/navigation-active.core.ts:15-20 | `{ id: 'home', to: '/', … }`, `{ id: 'sessions', … }`, `{ id: 'songs', to: '/catalog', … }`, `{ id: 'band', to: '/band', … }` | PASS |
| A02 | S2, D2 | The app opens on Home | site/src/App.tsx:45 | `<Route path="/" element={<HomePage />} />` | PASS |
| A03 | S2, D2 | The manifest shortcut points to Home | site/public/manifest.webmanifest:35-39 | `"name": "Accueil", … "url": "/"` | PASS |
| A04 | S2, *Slices* | Theme colour per scheme in `index.html` | site/index.html:6-7 | `media="(prefers-color-scheme: light)" content="#f5f1e8"`, `media="(prefers-color-scheme: dark)" content="#16130f"` | PASS |
| A05 | S2, *Band tab* | Band lists members, instruments, bars, compositions, improvements, and the account page last | site/src/routes/band/band-destinations.core.ts:13-20 | `{ to: '/members', … }` … `{ to: '/improvements', … icon: 'bulb' }`, `{ to: '/account', … icon: 'user' }` | PASS |
| A06 | S2, *Navigation* | The language switch is on the account page, not in the shell | site/src/components/organisms/AccountSettings.tsx:23; `AppShell.tsx` has no `LanguageSwitcher` | `<LanguageSwitcher />` | PASS |
| A07 | S2, rank 22 | Sessions listed coming first, nearest at the top, then past ones | api/src/sessions/sessions.service.ts (`getSessions`) | `return orderSessionsForListing(await listSessions(), now);` | PASS |
| A08 | S2 → S6 | `/tasks` goes to Band; Studies leaves Band in slice 6 and `/studies` goes to To learn | site/src/App.tsx:61,63 | `<Route path="/studies" element={<Navigate to="/catalog?filter=learning" replace />} />`, `<Route path="/tasks" element={<Navigate to="/band" replace />} />` | PASS |
| A09 | S3, D7 D8 | Setlist `more` menu holds stage mode, open a vote, audience vote, copy the order, rename | site/src/components/organisms/SetlistHeaderActions.tsx:72-107 | `label: t('scene.title'), icon: 'play'`, `icon: 'vote'`, `icon: 'audience'`, `label: t('setlist.copyOrder'), icon: 'copy'`, `label: t('setlist.rename.label')` | PASS |
| A10 | S3 | Section tabs Songs, Lineup, My part, with icons | site/src/components/organisms/SetlistEditor.tsx:184-189 | `{ value: 'songs', … icon: 'song' }`, `{ value: 'lineup', … icon: 'members' }`, `{ value: 'my-part', … icon: 'user' }` | PASS |
| A11 | S3 | Transition line at 44 px with `warn`, the note, or `plus` | site/src/components/organisms/TransitionStrip.tsx:16,33 | `const LINE_CLASS = 'min-h-11 …'`; `name={isRisky ? 'warn' : hasNote ? 'edit' : 'plus'}` | PASS |
| A12 | S3 | Remove from the setlist is in the row's `more` menu | site/src/components/organisms/SetlistEntryRow.tsx:110-114 | `<Menu label={t('setlist.entryActions', …)}` … `label: t('setlist.removeFromSetlist')` | PASS |
| A13 | S3 | Entry sheet: cover, footer **Open the song** (`song`) and **Record a take** (`mic`) | site/src/components/organisms/SetlistEntrySheet.tsx:135,159,162 | `<AlbumCover … size="sheet" />`; `<ButtonLink variant="secondary" icon="song" to={…}>`; `<Button variant="primary" icon="mic" onClick={recordTake}>` | PASS |
| A14 | S3 | Vote page: back link naming the setlist, the vote action in the bottom strip | site/src/routes/setlists/SetlistVotePage.tsx:154,263 | `<BackLink to={`/setlists/${setlistId}`} label={displayedName} />`; `<BottomActions>{stripAction}</BottomActions>` | PASS |
| A15 | S4, Q5 | One route adds a list of songs in one transaction, all or nothing | api/src/setlists/setlist-entry.service.ts (`addEntries`); setlists.controller.ts `'/:id/entries/batch'` | `const isEverySongClaimed = await didClaimEverySongWithin(executor, input.songIds); if (!isEverySongClaimed) return { kind: 'song-not-found' };` | PASS |
| A16 | S4, D7 | Pill strip: **Add songs** (`plus`, primary) and **Order** (`reorder`) | site/src/components/organisms/SetlistEditor.tsx:208-217 | `icon="reorder"` … `<Button variant="primary" icon="plus" size="lg" …>` | PASS |
| A17 | S4, D7 | Order screen footer **Done** (`check`) and **Copy order** (`copy`) | site/src/routes/setlists/SetlistOrderPage.tsx:115-119 | `<Button variant="secondary" icon="copy" …>`; `<ButtonLink to={setlistPath} variant="primary" icon="check" …>` | PASS |
| A18 | S5, ADR-0049 | `task.session_id`, nullable, no foreign key | api/src/database/migrations/0020_task_session.sql:6; tasks.schema.ts | `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "session_id" uuid;`; `sessionId: z.string().uuid().nullable().default(null)` | PASS |
| A19 | S5 | The task write claims its session; deleting a session nulls its tasks' session | api/src/tasks/tasks.service.ts (`findLinkRefusalWithin`); sessions.repository.ts:125 | `!(await didClaimSessionWithin(executor, sessionId)); if (isSessionMissing) return { kind: 'session-not-found' };`; `await detachTasksOfSessionBeingDeleted(transaction, id);` | PASS |
| A20 | S5, Q13 | Practice mode offered on a practice, on its own day, with a song | site/src/routes/sessions/practice-mode.core.ts:44-50 | `input.kind === PRACTICE_KIND && input.songCount > 0 && bandDayOf(input.date) === bandDayOf(input.now)` | PASS |
| A21 | S5, Q11 | Position held on the device, per session | site/src/lib/practice-position.adapter.ts:6-23 | `const PRACTICE_KEY_PREFIX = 'pragma.practice.';` … `localStorage.setItem(practiceKeyOfSession(sessionId), position);` | PASS |
| A22 | S5 | Next song is withheld while a recording runs; the last song offers End the practice | site/src/routes/sessions/PracticeModePage.tsx:287-300 | `screen.position.isLast ? (<Button icon="check" … onClick={endPractice}>` … `disabled={recording.view.isOpen}` | PASS |
| A23 | S5, Q12 | Quick note goes to the current entry's note | site/src/routes/sessions/PracticeModePage.tsx:269-281 | `<PracticeNoteSheet … onSaveNote={(text) => updateEntry.mutateAsync({ setlistId: current.setlistId, entryId: current.entry.id, notes: text })}` | PASS |
| A24 | S5 | **Chords** is a labelled round action | site/src/components/organisms/PracticeCurrentSong.tsx:57 | `<ButtonLink variant="secondary" icon="text" to={props.chordsTo}>`: a secondary pill, not `RoundAction` | FAIL |
| A25 | S5, edge "several setlists" | The header names the setlist when the current song moves into another one | site/src/routes/sessions/PracticeModePage.tsx:182-208 | The header renders `<BackLink … label={sessionLabel} />`, the `Menu` and `t('practice.position', …)`; no setlist name is rendered for the current song | FAIL |
| A26 | S6 | Song page: listen row, setlists line, round actions, Your part, transpose, **Record a take** in the strip | site/src/components/organisms/SongDetail.tsx:95,99,102,128,159-163; SongChartPreviews.tsx:37 | `<ListenRow links={listenLinks} />`, `t(setlistsLine.messageKey, …)`, `<SongRoundActions`, `<SongYourPart row={memberRow} />`, `<BottomActions>` … `icon="mic"`; `<TransposeStepper` | PASS |
| A27 | S6, rank 29 | **Edit** is a link drawn as a button | site/src/components/organisms/SongDetailHeader.tsx:45 | `<ButtonLink to={`/catalog/${song.id}/edit`} variant="secondary" size="sm" icon="edit">` | PASS |
| A28 | S6, D9 Q6 | Paste text, Photo, PDF; a PDF with text goes through the converter, otherwise stored as a `pdf` chart | site/src/components/organisms/SongChartFields.tsx:76-90,98-120 | `icon="clipboard"`, `icon="camera"`, `icon="upload"`; `if (text.length > 0) { showText(text); return; }` … `props.onChartKindChange('pdf');` | PASS |
| A29 | S6, ADR-0050 | `pdfjs-dist` is loaded on the chord editor only | site/src/lib/pdf-text.adapter.ts:26-27 | `import('pdfjs-dist'),`; no static import of `pdfjs-dist` anywhere under `site/src` | PASS |
| A30 | S6, Q7 | YouTube's official mark in `BrandLogo` | site/src/components/atoms/BrandLogo.tsx:6,20; THIRD_PARTY_NOTICES.md:55-57 | `export type BrandName = 'deezer' \| 'spotify' \| 'youtube';`; "copied from Simple Icons 16.36.0 … YouTube's brand resources" | PASS |
| A31 | S6 | **To learn** filter and **Add a song** (`plus`) in the bottom strip of Songs | site/src/routes/catalog/CatalogPage.tsx:40,185-186 | `learning: 'catalog.filterToLearn',`; `<Button variant="primary" size="lg" icon="plus" onClick={() => setIsAddSongOpen(true)}>` | PASS |
| A32 | S3 to S6, *Production strategy* | The site sends the named input events (`setlist_songs_added`, `setlist_view_changed`, `setlist_order_opened`, `entry_note_saved`, `transition_comment_saved`, `entry_note_save_superseded`, `chord_chart_added`, `practice_mode_started`, `practice_mode_ended`, `from_practice_mode`) | `grep -rnE "<each event name>" apps/pragma/{api,site}` | Only `task_created` (api/src/tasks/tasks.core.ts:41) is found; none of the site events exist | FAIL |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent | sample of new names | `resolvePracticeIndex`, `didClaimEverySongWithin`, `appendSongsWithin`, `selectSessionPills`, `convertChordsAboveLyrics`, `layOutPdfText`; no one-letter locals found | PASS |
| B02 | Magic numbers and strings named | read the new cores and services | `SETLIST_BATCH_ADD_MAX = 200`, `TAB_STOP = 8`, `FIRST_INDEX = 0`, `PRACTICE_KEY_PREFIX = 'pragma.practice.'` | PASS |
| B03 | No comments | `borso/no-comments` through oxlint; `git diff … -- '*.css' '*.html'` for `/*` and `<!--` | none; the migration's SQL comment matches all 21 earlier migrations | PASS |
| B04 | Function names describe the result | same sample | `buildPracticeSongs`, `describeSetlistsOfSong`, `selectHomePrimaryAction` | PASS |
| B05 | Assertions limited to `as const` / `as unknown` | `grep -nE '\bas [A-Z]…\|as unknown as'` over the 235 files | none (the hits are prose and `import * as Sentry`) | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` over the changed non-test files | none | PASS |
| B07 | `noUncheckedIndexedAccess` | `pnpm --filter @borso-app/pragma run typecheck`; e.g. practice-mode.core.ts:137 `const current = songs[index] ?? null;` | exit 0 | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <235 changed files>` | exit 0, no diagnostics | PASS |
| B09 | `useEffect` is a smell | `git diff … -- apps/pragma \| grep -E '^\+.*\buseEffect\('` | none added; the practice position uses `useSyncExternalStore` (practice-position.store.ts:34-39) | PASS |
| B10 | No value outside the tokens | `grep` for `text-[`, `bg-[`, `rounded-[`, `shadow-[`, hex, `rgba(` in added site lines | only `BrandLogo` (`youtube: '#ff0000'`) and member colours in test fixtures | PASS |
| B11 | `.core.ts` takes `now` as a parameter | `grep -n "new Date()"` over the 41 changed cores, utils and adapters | none | PASS |
| B12 | Unused exports and files | `pnpm exec knip` | exit 0 | PASS |
| B13 | Build | `pnpm --filter @borso-app/pragma run build` | exit 0 (Vite's chunk-size warning only) | PASS |
| B14 | Blueprint markers resolve | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | exit 0, "Annotations are complete" | PASS |
| B15 | Changed lint rule keeps its suite | `pnpm exec vitest run eslint-rules/no-raw-interactive-element.test.js` | 9 passed | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm --filter @borso-app/pragma run test:core` | 0: 291 files, 2894 tests; Statements 100% (4856/4856), Branches 100% (2334/2334), Functions 100% (1443/1443), Lines 100% (4134/4134) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test` | 0: 30 files, 309 tests | PASS |
| C03 | `*.utils.ts` / `*.core.ts` siblings | every tracked `*.utils.ts` and `*.core.ts` under `apps/pragma` checked for its `*.test.ts` | none missing | PASS |
| C04 | Stryker, S2 and S3 files (spec, *Technical validation*), run from `apps/pragma` | `pnpm exec stryker run --mutate <the 41 changed `*.core.ts`, `*.utils.ts` and `*.adapter.ts` files, comma-separated>` | exit 1 overall (score 97.31, break threshold 100): 1986 killed, 2 timeouts, 55 survived. The S2 and S3 files have no survivors: `session-schedule.core.ts`, `navigation-active.core.ts`, `band-tasks.core.ts`, `lineup-grid.core.ts`, `entry-lineup-change.core.ts`, `setlist-header.core.ts`, `setlist-view.core.ts`, `sheet-draft.utils.ts`, `transition-view.core.ts`, `setlists.utils.ts`, `task-metrics.core.ts` | PASS |
| C05 | Stryker, S4 files | same run | 5 survived: `energy-curve.utils.ts:57:19`, `:57:39`, `:58:45`; `add-songs.core.ts:48:10`, `:94:7` | FAIL |
| C06 | Stryker, S5 files | same run | 16 survived: `practice-mode.core.ts:85:7`, `:145:65`, `:207:7`; `session-page.core.ts:65:7`; `home.core.ts:78:5`, `:116:7`; `practice-position.adapter.ts:24:11`, `:32:11`; `scene-view.core.ts:68:33`, `:69:30` (5 regex mutants), `:73:7` | FAIL |
| C07 | Stryker, S6 files | same run | 34 survived: `pdf-text-layout.core.ts` 17 (lines 22, 29, 30, 38, 49, 51, 52, 55, 67, 76, 81, 87), `chords-above-lyrics.core.ts` 8 (lines 32, 72, 76, 82, 86, 90, 118), `pdf-text.adapter.ts` 5 (lines 12, 30), `catalog-page.core.ts:94:31`, `:126:7`, `song-page.core.ts:53:7`, `:61:52`, `add-song.core.ts:55:34` | FAIL |

## D. Test coverage of spec

13 use cases routed to /visual-validation; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | S4, happy path task 1 / 8: the batch adds in pick order after the existing entries | `'appends the songs after the existing entries, in the order they were picked'`, api/src/setlists/setlists.batch.controller.test.ts:61; fails on `expect(added.map((entry) => [entry.songId, entry.position])).toEqual([[fourth, 1], [second, 2], [third, 3]])` | PASS |
| D02 | S5, happy path task 3: a task linked to a session and to a song that is not an original | `'links a task to a session and to a cover song, …'`, api/src/tasks/tasks.controller.test.ts:171; fails on `expect(created.task).toMatchObject({ sessionId, songId });` | PASS |
| D03 | S5, happy path record: Start the practice on Home on the practice's day | `'starts the practice on its day'`, site/src/routes/home/home.core.test.ts:127 | PASS |
| D04 | S5: practice mode offered only on a practice, on its day, with a song | practice-mode.core.test.ts:26,37; fails on `expect(isPracticeModeOffered({ ...base, now: NEXT_DAY })).toBe(false);` and the `kind: 'concert'` and `songCount: 0` lines | PASS |
| D05 | S5: Next song moves without writing to the server | `'starts on the first song, and Next song moves on without writing to the server'`, PracticeModePage.test.tsx:104; fails on `expect(stub?.calls.every((request) => request.method === 'GET')).toBe(true);` | PASS |
| D06 | S5: End the practice on the last song returns to the session page | PracticeModePage.test.tsx:129; fails on `expect(localStorage.getItem(PRACTICE_STORAGE_KEY)).toBeNull();` and `findByText('Session page')` | PASS |
| D07 | S5: the session page lists the session's takes, grouped by song | takes.controller.test.ts:310 `expect(takes.map((take) => take.id)).toEqual([newerTake, olderTake]);`; session-page.core.test.ts:87 `expect(groupTakesBySong(takes, …)).toEqual([` | PASS |
| D08 | S6, happy path task 10: Practised logs a study | SongDetailPage.test.tsx:151; fails on `expect(await studyWrites[0]?.json()).toEqual({ songId: SONG.id, instrumentId: 'bass' });` | PASS |
| D09 | S6: one way into stage mode, no button inside a link | SongDetailPage.test.tsx:125; fails on `expect(stageLinks.map((link) => link.textContent)).toEqual(['Full screen']);` and `expect(document.querySelectorAll('a button')).toHaveLength(0);` | PASS |
| D10 | S6, happy path task 9: pasted chords above lyrics become ChordPro, preview under the box | chords-above-lyrics.core.test.ts:55; song-draft.core.test.ts:140; SongEditForm.test.tsx:73, fails on `textBox.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING` | PASS |
| D11 | S3, edge: a reply to an older note save never overwrites a newer one | `'sends the newer text when the older save settles'`, latest-text-save.utils.test.ts:53; fails on `expect(planNextSave(state)).toBe('Finir');` | PASS |
| D12 | S2, edge: transition draft kept after backdrop or Escape | TransitionCommentModal.test.tsx:62 (backdrop) on the generic store; the same store's Escape path in TaskForm.test.tsx:91 | PASS |
| D13 | S3, edge: a member in no song gets no column | lineup-grid.core.test.ts:28, fixture `members: [ANNA, BRUNO, CLARA]`; fails on `expect(grid.columns).toEqual([{ memberId: 'anna', … }, { memberId: 'bruno', … }]);` | PASS |
| D14 | S4, edge: every song already in the setlist shows an empty state | add-songs.core.test.ts:110; fails on `.toBe('setlist.addSongsEveryoneIn');` | PASS |
| D15 | S4, edge: and **Add songs** stays disabled | SetlistSongPicker.test.tsx:83; fails on `expect(screen.getByRole('button', { name: 'Add songs' }).hasAttribute('disabled')).toBe(true);` | PASS |
| D16 | S4, edge: entries with no energy at the default level, muted | energy-curve.utils.test.ts:14 `{ id: 'c', level: 5, isStored: false, heightRatio: 0.5 }`; :85 the unset bar muted | PASS |
| D17 | S6, edge: a pasted chart already in ChordPro is kept as is | chords-above-lyrics.core.test.ts:98; fails on `toEqual({ chordPro, hasChords: true, isChanged: false })` | PASS |
| D18 | S6, edge: a pasted text with no chord is kept as text | chords-above-lyrics.core.test.ts:107; fails on `chordPro: 'Just words\nand more words', hasChords: false` | PASS |
| D19 | S6, edge: and its tonality is left empty | domain/tonality.core.test.ts:10 `'returns null for both ends when nothing parses as a chord'`; SongEditForm.tsx:67 writes only `if (currentStart.length === 0 && derived.start !== null)` | PASS |
| D20 | S5, edge: a task whose session is deleted keeps the task and loses the session | tasks.controller.test.ts:208; fails on `expect(tasks[0]).toMatchObject({ id: created.task.id, sessionId: null });` | PASS |
| D21 | S2, edge: no session ahead offers New session | home.core.test.ts:169; fails on `.toEqual({ link: null, isNewSessionOffered: true });` | PASS |
| D22 | S5, edge: reloaded the same day, practice mode resumes on its song | practice-mode.core.test.ts:102; PracticeModePage.test.tsx:115, fails on `findByRole('heading', { name: 'Valerie' })` | PASS |
| D23 | S5, edge: on the next day the stored position is ignored | `'ignores a position stored on another day'`, practice-mode.core.test.ts:109; fails on `.toBe(0)` with `NEXT_DAY` | PASS |
| D24 | S5, edge: the setlist changes during the practice and the current song stays current | practice-mode.core.test.ts:102 covers a **stored** position only; with nothing stored, `resolvePracticeIndex` returns `FIRST_INDEX` (practice-mode.core.ts:116) | FAIL |
| D25 | S5, edge: a removed current song makes the following one current | `'makes the following song current when the stored one was removed'`, practice-mode.core.test.ts:115; fails on `.toBe(1)` | PASS |
| D26 | S5, edge: several setlists, the songs follow one another across them | practice-mode.core.test.ts:46; fails on `expect(songs).toEqual(SONGS);` over `set-1` then `set-2` | PASS |
| D27 | S4, error: adding songs fails, the sheet keeps its picks and shows an error | SetlistSongPicker.test.tsx:112; fails on `expect(checkbox('Jolene').getAttribute('aria-checked')).toBe('true');` and the `role('alert')` line | PASS |
| D28 | S4, error: nothing is half added | setlists.batch.controller.test.ts:89; fails on `expect(await testDatabase().select().from(setlistEntryTable)).toEqual([]);` | PASS |
| D29 | S3, error: a note save fails, the field keeps its text with Not saved and a retry | SetlistEntrySheet.test.tsx:108; fails on `expect(screen.getByText('Not saved'))`, `expect(screen.getByDisplayValue('Tempo')).toBe(notes);`, `expect(onSave).toHaveBeenCalledTimes(2);` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | S4 `addEntries` → `appendSongsWithin` (api/src/setlists/setlist-entry.service.ts) | Check-then-write | Positions come from `countEntriesWithin`, read after `didClaimSetlistWithin` (setlists.repository.ts:190-200, `UPDATE setlist SET name = name WHERE id = … RETURNING id`), so the setlist row's primary key serialises the writers | PASS |
| E02 | S4 same rule | Concurrent proof | No test fires two `POST /api/setlists/:id/entries/batch`, or a batch and a single append, at once. The single-append sibling exists (setlists.controller.test.ts:189), the batch has none | FAIL |
| E03 | S5 `createTask` / `updateTask` with `sessionId` against `deleteSessionWithCascade` | Check-then-write | Held by `didClaimSessionWithin` (sessions.repository.ts:105-115, an `UPDATE … RETURNING`) in the task's transaction, and by the delete of the same row plus `detachTasksOfSessionBeingDeleted` in the session's | PASS |
| E04 | S5 same rule | Concurrent proof | No test interleaves `PUT /api/tasks/:id { sessionId }` with `DELETE /api/sessions/:id`. The same rule for a member has one (tasks.controller.test.ts:281, `runSecondWhileFirstWaitsOnHold`), and takes have one for a session (takes.controller.test.ts:441) | FAIL |
| E05 | S5 `GET /api/takes?sessionId`, S6 `listEntryOwners` with `songId` | Write path | Reads only | PASS |
| E06 | API module state | Per-process state | `grep -nE '^\+(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^\+let '` over the api and domain diff: none | PASS |
| E07 | Site stores: `practice-position.store.ts:12`, `sheet-draft.store.ts`, `add-songs-draft.store.ts` | Per-process state | Browser module state, one per tab. Q11 chose per-device state; the drafts are per device by the spec's sheet rule | PASS |

## Notes

- **A24 (S5).** Spec line 77 says **Chords** is "a labelled round action". Slice 5's plan made it a secondary pill until slice 6 built `RoundAction`, and said practice mode "can adopt it then". Slice 6 built `atoms/RoundAction.tsx` and did not adopt it: `PracticeCurrentSong.tsx:57` still draws a `ButtonLink variant="secondary"`, and **Note** beside it is a pill too.
- **A25 (S5).** Spec edge case "a session with several setlists: … the header names the setlist when it changes". The failing case: a session with setlists "First half" [Superstition] and "Encore" [Valerie]. Tap **Next song**: the header shows the session label and "Song 2 of 2", and nothing on screen above the current song names "Encore". The data is there (`PracticeSong.setlistName`), but only the *Next* line reads it (`describeNext`, practice-mode.core.ts:198).
- **A32 (S3 to S6).** The spec's *Production strategy › Analytics* lists ten site events. None is sent, so tapping **Add 3 songs** records no `setlist_songs_added`. The slice 3 and slice 5 plans deferred them because "the site has no product event channel yet". The spec was never amended, and that deferral is the kind of postponement CLAUDE.md does not allow. The fix stage either builds the channel or amends the spec, which is a product decision.
- **D24 (S5).** The failing case: open practice mode and don't move, so nothing is stored and "Superstition" is "Song 1 of 2". On another phone, reorder the setlist so "Valerie" comes first. When this screen regains focus, the entries query refetches (TanStack's default `refetchOnWindowFocus`, staleTime 30 s, query-client.setup.ts:12), `resolvePracticeIndex(songs, null, now)` returns `FIRST_INDEX`, and "Valerie" becomes the current song. The spec says "the current song stays current". The position is written only by `moveTo` (PracticeModePage.tsx:151-155), never on arrival. A test on `resolvePracticeIndex`, or on the page with a reorder and no stored position, would catch it.
- **E02 (S4).** The failing case to pin: two `POST /api/setlists/:id/entries/batch` sent together on an empty setlist, with `[A, B]` and `[C, D]`. The test must assert positions `[0, 1, 2, 3]`, each request's songs contiguous, and four rows. The claim should hold, but nobody has seen it refuse anything on this path.
- **E04 (S5).** The failing case to pin: `PUT /api/tasks/:id { sessionId: S }` held open while `DELETE /api/sessions/S` runs. The test must assert the stored task ends with `session_id` null or the PUT answers `session-not-found`, and that no task row names a deleted session. Copy `'never leaves a task assigned to a member deleted while the assignment was written'` (tasks.controller.test.ts:281).
- **C05 to C07 (S4, S5, S6).** Stryker's break threshold is 100 (`stryker.config.js` through `stryker.shared.js`), and pre-push runs the same command scoped to a push's changed cores. Each survivor is a line whose behaviour no test pins. In `chords-above-lyrics.core.ts`, for example, `:32` is the tab-stop arithmetic in `expandTabs`, and `:72`, `:76`, `:86` and `:90` drop a `.trimEnd()`, `.trim()` or `.filter` with no test failing. The run took 17 min 58 s on 4 cores. The configured reporters are `progress-append-only` and `clear-text` (`stryker.shared.js:42`), so a rerun of the same command prints each survivor with its replacement.
- Question: the spec's zero-defect list has `TaskSessionNotFound` ("logged, no alert"). The API answers 400 `session-not-found` (tasks.controller.ts) and nothing visibly logs it. Is the 400 enough, or should a log line be added?
- Question: `getTakesMatching` falls back to `filter.songId ?? ''` (takes.service.ts). The schema's `isExactlyOneTakeFilterNamed` makes the fallback unreachable, so it is not a defect. Would a discriminated filter type remove the empty string?
- Not graded here (acceptance rows belong to `/visual-validation`), but recorded by the plans as misses against their targets: task 1 at 15 / 3 / 6 (target ≤ 15 / ≤ 1 / ≤ 4), task 2 at 12 / 0 / 7 (≤ 11 / 0 / ≤ 6), task 7 at 8 / 2 / 4 (≤ 7 / ≤ 1 / 3), task 9 at 6 / 0 / 4 from Home (≤ 3 taps plus the paste / 0 / ≤ 3; met from the song page), and tasks 13 and 13b counting one screen more than their targets.
- Disclosed plan deviations, not graded: `chords-above-lyrics.core.ts` sits under `site/src/routes/catalog/`, not `apps/pragma/domain/` (no API caller, so `domain/` would break ADR-0010's "a real caller on each side"). `practice-mode.store.ts` became `practice-position.store.ts`. The session page's empty preview holds no second **Add songs**, because the strip already does.

## Verdict: FAIL
