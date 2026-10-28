# Technical validation — Pragma redesign, slice 2 (shell, navigation and Home), second pass

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 2
- Plan: [`../plan/plan-slice-2.md`](../plan/plan-slice-2.md)
- Branch: claude/pragma-ux-redesign-slice-2 (HEAD `2640e8ae`)
- Base: origin/claude/pragma-ux-redesign; slice 1 is a separate pull request and is not graded here
- Run at: 2026-10-28T09:45:00Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics)

Scope: the slice 2 diff only, 79 files, ten commits from `eb9026df` (plan) to `2640e8ae`. Since the first pass ([`technical-validation-slice-2-r1.md`](./technical-validation-slice-2-r1.md), FAIL on C03), one commit landed: `2640e8ae` asserts the whole unknown-seed message in `task-metrics.core.test.ts`. Every gate below was re-run on `2640e8ae`, and every evidence line was read again on that commit. Some line numbers moved since the first pass.

All happy paths, edge cases and acceptance rows are routed to /visual-validation by the spec's *Test strategy* › Visual validation ("every happy path and edge case above, and every row of *Acceptance criteria*"). That covers the 2 slice 2 edge cases (no session ahead; the transition draft closed by backdrop or Escape) and the slice 2 acceptance rows (tabs, tasks 3b and 12). They are out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | D1, *Navigation* | Four tabs: Home, Sessions, Songs, Band | `site/src/components/organisms/navigation-active.core.ts:16-19` | `{ id: 'home', to: '/', …}`, `{ id: 'sessions', to: '/sessions', …}`, `{ id: 'songs', to: '/catalog', …}`, `{ id: 'band', to: '/band', …}` | PASS |
| A02 | D1 | No count on any tab, and the More drawer is gone | `organisms/AppShell.tsx:74`; `navigation-badges.hook.ts` deleted | `<BottomTabBar tabs={SHELL_TABS} activeTab={activeTab} />`; the diff removes the badges, `moreDestinations` and the More button | PASS |
| A03 | D1 | Each tab is active for the screens it holds; Home only on `/` | `navigation-active.core.ts:45-55` | `return pathname === destination \|\| pathname.startsWith(\`${destination}${PATH_SEPARATOR}\`);`; `if (pathname === HOME_PATH) return 'home';` | PASS |
| A04 | D2 | The app opens on Home | `site/src/App.tsx:44` | `<Route path="/" element={<HomePage />} />` | PASS |
| A05 | D2; manifest | The manifest shortcut points to Home | `site/public/manifest.webmanifest:37-39` | `"name": "Accueil"`, `"short_name": "Accueil"`, `"url": "/"` | PASS |
| A06 | *Safe areas*; AppShell | The shell pads the top safe area | `AppShell.tsx:38` | `<div className="min-h-dvh flex bg-paper text-ink pt-[env(safe-area-inset-top)]">` | PASS |
| A07 | *Slices* › 2; index.html | A theme colour for each scheme | `site/index.html:6-7` | `media="(prefers-color-scheme: light)" content="#f5f1e8"`, `media="(prefers-color-scheme: dark)" content="#16130f"` | PASS |
| A08 | *Navigation*; AccountSettings | The language switch moves to the account page | `organisms/AccountSettings.tsx:22-23` | `<h2 …>{t('account.language')}</h2>` `<LanguageSwitcher />` | PASS |
| A09 | *Navigation*, *Band tab* | Band lists members, instruments, bars, compositions, improvements, then the account page last | `routes/band/band-destinations.core.ts:14-20` | `/members`, `/instruments`, `/bars`, `/compos`, `/improvements`, `/studies`, `/account` in that order | PASS |
| A10 | *Slices* › 2 | Studies is reached through Band until slice 6 | `band-destinations.core.ts:19` | `{ to: '/studies', labelKey: 'nav.studies', icon: 'bolt' }` | PASS |
| A11 | rank 35 | Each destination has its own icon; Studies and Improvements no longer share `bolt` | `band-destinations.core.ts:14-20` | `'audience'`, `'instr'`, `'beer'`, `'compos'`, `'bulb'`, `'bolt'`, `'user'`; tabs use `'home'`, `'sessions'`, `'song'`, `'members'` | PASS |
| A12 | *Band tab*, D3 | Band opens on My tasks / Everyone, with My tasks as the default, kept in the URL | `routes/band/band-tasks.core.ts:161,165`; `BandPage.tsx:43` | `const DEFAULT_BAND_VIEW: BandView = 'my';` `?? DEFAULT_BAND_VIEW;`; `readBandView(searchParams.get(BAND_VIEW_PARAM))` | PASS |
| A13 | *Band tab* | **New task** (`plus`) is the one primary action | `BandPage.tsx:152-153` | `<Button icon="plus" variant="primary" onClick={taskSheet.openNewTask}>` `{t('tasks.newTitle')}` | PASS |
| A14 | *Band tab*, rank 2 | Tapping a task opens the same sheet, filled with its values | `organisms/task-sheet.hook.ts:89-90`; `HomePage.tsx:142,149` | `openTask: (task) => { setOpenSheet({ draftKey: task.id, values: formValuesFromTask(task), isEditing: true });`; `onOpen={taskSheet.openTask}`, `<TaskSheetHost controller={taskSheet}` | PASS |
| A15 | rank 21 | A long song title in a task wraps or ends in an ellipsis | `molecules/TaskRow.tsx:52,58` | `flex flex-wrap items-center gap-1.5`, `<span className="truncate">{props.songTitle}</span>` | PASS |
| A16 | *Navigation* | Sessions holds a Sessions / Setlists switch | `SessionsPage.tsx:61`; `SetlistsPage.tsx:48` | `<SessionsSectionTabs value="sessions" />`, `<SessionsSectionTabs value="setlists" />` | PASS |
| A17 | rank 22, *Types* › Session | Coming sessions come first, nearest at the top, then past ones, newest first | `domain/session-schedule.core.ts:47-54`; `api/src/sessions/sessions.service.ts` `getSessions`; `SessionsPage.tsx:42` | `return [...coming.toSorted(compareEarliestFirst), ...past.toSorted(compareNewestFirst)];`; `return orderSessionsForListing(await listSessions(), now);`; `orderSessionsForListing(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs))` | PASS |
| A18 | *Home* | The next session, practice or concert, whichever comes first | `HomePage.tsx:58-59`; `session-schedule.core.ts:36-43` | `selectNextSession(sessionsQuery.data?.sessions ?? NO_ROWS, new Date(nowEpochMs))`; `sessions.filter((session) => isComing(session, today)).toSorted(compareEarliestFirst)[0] ?? null` | PASS |
| A19 | *Home* | The card shows kind, date, place, setlist name, song count and total time | `HomePage.tsx:108-116` | `isConcert={nextSession.kind === 'concert'}`, `dateLabel=`, `venue=`, `setlistName={setlist?.name ?? null}`, `songCount={setlist?.songCount ?? null}`, `totalLabel=` | PASS |
| A20 | *Home* | **Open the setlist** is the primary action | `routes/home/home.core.ts:108-112`; `HomePage.tsx:167-169` | `link: { to: \`/setlists/${input.setlistId}\`, labelKey: 'home.openSetlist' }`; `<ButtonLink icon="arrowR" variant="primary" to={primaryAction.link.to}>` | PASS |
| A21 | *Home* › Your part | The songs of the setlist where the member plays, with their instruments | `HomePage.tsx:120-127`; `home.core.ts` | `<MemberPartList label={t('home.yourPart')} rows={view.memberPart} …/>` | PASS |
| A22 | *Home* › Your tasks | Open tasks assigned to the member, in urgency order as on Band | `home.core.ts:73` | `tasks.filter((task) => task.assigneeId === memberId && isTaskOpen(task))`, which keeps the API's order | PASS |
| A23 | *Home*, edge case | No session ahead: an empty state with **New session** | `HomePage.tsx:104-105,162-164`; `home.core.ts:120` | `<EmptyState icon="sessions">{t('home.noSessionAhead')}</EmptyState>`; `<Button icon="plus" variant="primary" …>{t('sessions.newSession')}`; `return { link: null, isNewSessionOffered: !input.isLoading };` | PASS |
| A24 | Operator review (b) | The task sheet keeps its draft when it closes; a save discards it | `organisms/TaskForm.tsx:63-71` | `defaultValues: kept.draft ?? props.values,`; `await props.onSubmit(value); kept.discard();`; `if (form.state.isDirty && !form.state.isSubmitSuccessful) kept.keep(form.state.values);` | PASS |
| A25 | Operator review (b) | `SongDefaultsDialog` keeps its draft | `molecules/SongDefaultsDialog.tsx:55,58,65` | `defaultValues: kept.draft ?? songDefaultsToFormValues(defaults),`; `kept.discard();`; the same `kept.keep` guard | PASS |
| A26 | Slice 1 transition draft | The transition draft moved onto the shared store | `site/src/lib/transition-draft.store.ts:6,16` | `const useTransitionTextDraft = createSheetDraftStore<string>();` | PASS |
| A27 | VOCABULARY | Home and Band tab are defined; the Session order is updated | `apps/pragma/VOCABULARY.md:40,334,793` | `## Band tab`, `## Home`, "the past ones, newest first (`orderSessionsForListing`"; `check-vocabulary-paths.sh` exit 0 | PASS |
| A28 | i18n | Every new label exists in both languages | `site/src/i18n/en.json`, `fr.json` | `i18n-parity.core.test.ts` green within C01 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `./node_modules/.bin/oxlint --type-aware` on the 65 changed `.ts/.tsx` files | exit 0, no output | PASS |
| B02 | Formatting | `pnpm exec oxfmt --check` on the 72 changed non-markdown files | "All matched files use the correct format." | PASS |
| B03 | Typecheck | `pnpm run typecheck` in `apps/pragma` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 | PASS |
| B05 | No `any`; assertions only `as const` / `as unknown` | `grep -P '\bany\b\|\bas (?!const\b\|unknown\b)[A-Z]\w*'` over the added lines | none | PASS |
| B06 | `useEffect` is a smell | `grep 'useEffect('` over the added lines | none. The clock comes from `useSyncExternalStore(subscribeClock, …)` (`SessionsPage.tsx:40`), and the drafts from `useSyncExternalStore(subscribe, read, read)` (`sheet-draft.store.ts:32`) | PASS |
| B07 | No comments | `borso/no-comments` through B01; `check-no-comments-in-styles-and-markup.sh` | B01 clean; the script exits 0 | PASS |
| B08 | Names carry intent | names sampled from the new code | `selectNextSession`, `orderSessionsForListing`, `selectActiveTab`, `closeKeepingDraft`, `selectHomePrimaryAction`, `selectOpenTasksOf` | PASS |
| B09 | Magic values have names | read of the new modules | `HOME_PATH`, `PATH_SEPARATOR`, `BAND_VIEW_PARAM`, `DEFAULT_BAND_VIEW`, `SEED_VARIANTS` | PASS |
| B10 | Generated-file and document gates | `enforcement-ledger.ts --check`, `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `check-vocabulary-paths.sh` | all exit 0 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm run test:core` in `apps/pragma` | 0; 277 files, 2746 tests; 100% statements (4463/4463), branches (2112/2112), functions (1298/1298), lines (3809/3809) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm test` in `apps/pragma` | 0; 29 files, 301 tests | PASS |
| C03 | @borso-app/pragma mutation on the changed cores and utilities | `pnpm exec stryker run --mutate domain/session-schedule.core.ts,site/src/routes/home/home.core.ts,site/src/routes/band/band-destinations.core.ts,site/src/routes/band/band-tasks.core.ts,site/src/components/organisms/navigation-active.core.ts,site/src/lib/sheet-draft.utils.ts,site/src/lib/transition-draft.utils.ts,site/src/components/molecules/song-duration.utils.ts,scripts/task-metrics/task-metrics.core.ts` | 0; 454 killed, 1 timed out, 0 survived; "Final mutation score of 100.00 is greater than or equal to break threshold 100". The first pass's surviving mutant at `task-metrics.core.ts:85` is now killed by `toThrow(new Error('unknown seed empty; expected one of audit, no-upcoming-session'))` | PASS |
| C04 | @borso-app/pragma build | `pnpm build` | 0 | PASS |
| C05 | Each `*.utils.ts` / `*.core.ts` has a sibling test | read of the diff | the new `session-schedule.core.ts`, `home.core.ts`, `band-destinations.core.ts` and `sheet-draft.utils.ts` each have a `.test.ts`; the coverage gate in C01 holds them at 100% | PASS |

## D. Test coverage of spec

The rows below cover the slice 2 part of *Test strategy* › Unit (`home.core.ts`: next session, my part, my tasks) and the session order (rank 22). They also cover the two drafts the plan took from the operator's review. Each row is graded on its deterministic test.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Next session: the earliest coming session, including one from earlier today | `'keeps a session from earlier today as the next one until midnight'`, `domain/session-schedule.core.test.ts:20`; fails on `expect(selectNextSession([TOMORROW, TONIGHT, THIS_MORNING, LAST_WEEK], NOW)).toBe(THIS_MORNING);` | PASS |
| D02 | Next session: past days are skipped; nothing ahead gives null | `'skips the sessions of past days'` (`:24`), `'answers null when no session is ahead'` (`:33`); fail on `.toBe(TOMORROW)` and `expect(selectNextSession([LAST_WEEK, YESTERDAY], NOW)).toBeNull();` | PASS |
| D03 | Next session: the day is the band's day in Paris | `'turns over at midnight in Paris while it is still the same day in UTC'` (`:38`); fails on `expect(selectNextSession([TONIGHT, TOMORROW], afterMidnightInParis)).toBe(TOMORROW);` | PASS |
| D04 | My part: the songs where the member plays, including an override, with the instruments | `'lists the songs where the member plays, an override included, with the instruments'`, `site/src/routes/home/home.core.test.ts:65`; fails on `expect(view.memberPart.map((row) => row.entryId)).toEqual(['e1', 'e3', 'e4']);` (`:67`) and `…parts.map((part) => part.name)).toEqual(['Bass'])` (`:70`) | PASS |
| D05 | My tasks: only the member's open tasks, in the order given | `'keeps the open tasks of the member in the order given'`, `home.core.test.ts:81`; fails on `.memberTasks.map((row) => row.id)).toEqual([` (`:88`) | PASS |
| D06 | Total time: the known durations are summed | `'adds up the known durations of the setlist songs'`, `home.core.test.ts:73`; fails on `expect(buildHomeView(INPUT).totalSeconds).toBe(360);` | PASS |
| D07 | Home's primary action: the setlist, else the session, else New session; nothing while loading | `home.core.test.ts:107,116,125,131`; fail on `.toEqual({ link: null, isNewSessionOffered: true })` and `.toEqual({ link: null, isNewSessionOffered: false })` | PASS |
| D08 | Rank 22: coming sessions nearest first, then past ones newest first | `session-schedule.core.test.ts:45` `'lists coming sessions nearest first, then past ones newest first'`; through the API, `api/src/sessions/sessions.controller.test.ts:37` `'lists coming sessions first, nearest at the top, then past ones'`, which fails on `expect(list.sessions.map((session) => session.date)).toEqual([` (`:65`) | PASS |
| D09 | Task draft kept after Escape | `'is kept after Escape and shown on reopening'`, `TaskForm.test.tsx:60`; fails on `expect(readTitle()).toBe(TYPED_TITLE);` (`:67`) | PASS |
| D10 | Task draft kept after a backdrop click | `'is kept after a click on the backdrop'`, `TaskForm.test.tsx:70`; fails on `expect(readTitle()).toBe(TYPED_TITLE);` (`:77`) | PASS |
| D11 | A saved task leaves no draft | `'is gone once saved, so New task opens blank'`, `TaskForm.test.tsx:80`; fails on `expect(readTitle()).toBe('');` (`:90`) | PASS |
| D12 | One task's draft never fills another task's sheet | `'belongs to one task: an edited task closed does not fill another one'`, `TaskForm.test.tsx:93`; fails on `expect(readTitle()).toBe('Task B');` (`:99`) | PASS |
| D13 | Song defaults draft kept after a backdrop click, and gone once saved | `SongDefaultsDialog.test.tsx`; fail on `expect(readStartKey()).toBe('C#m');` and `expect(readStartKey()).toBe('Am');` | PASS |
| D14 | Rank 35: each destination has its own icon | `band-destinations.core.test.ts`; fails on `expect(new Set(icons).size).toBe(icons.length);` | PASS |
| D15 | Home is active only on `/` | `navigation-active.core.test.ts` `'lights Home up on the start screen only'`; fails under a prefix match | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | The diff adds no write: `git diff origin/claude/pragma-ux-redesign...HEAD -- apps/pragma/api apps/pragma/domain \| grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` is empty. The only API change is the order of a read (`getSessions(now)`) | PASS |
| E02 | API module state | Per-process state | `grep -E '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` over the same diff: empty | PASS |
| E03 | `site/src/lib/sheet-draft.store.ts:16-17` | Per-process state | `const listeners = new Set<Listener>();` and `drafts: new Map()` live in the browser, one per tab. The spec asks for a draft that survives a close on the same device, not across devices | PASS |

## Notes

- The first pass's only FAIL, C03, is fixed by `2640e8ae`, and Stryker now reports 0 survived.
- Disclosed plan deviations, not graded: the next-session rule is `selectNextSession` in `domain/session-schedule.core.ts`, not in `home.core.ts`, so Home and the session list share one rule. The session order is applied in the service, not in `sessions.repository.ts`, the path the spec gives as indicative.
- Question, carried over: if `GET /api/sessions` fails, `isLoading` is false and `nextSession` is null. `selectHomePrimaryAction` then returns `isNewSessionOffered: true`, and Home shows "No session ahead" with **New session** and no error line (`HomePage.tsx:100-106`). The spec lists no error case for Home. Should a failed load show an error instead?
- Question, carried over: `HomePage.tsx` renders the task sheet but never reads `taskSheet.errorMessage`, while `BandPage.tsx:78-96` does show it. A task toggle or save that fails from Home shows no error. Should Home show the same line?
- Carried from the plan's risk register: the offline manifest still picks the next session as the one strictly after now, while Home keeps a session for its whole Paris day. Slice 5 owns this.
- `scripts/standards/seal.ts verify` (plan gate 13, `/standards-review`) is outside this report.

## Verdict: PASS
