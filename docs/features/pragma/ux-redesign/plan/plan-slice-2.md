# Plan: pragma UX redesign, slice 2 (shell, navigation and Home)

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) and with the slice 1 plan, [`plan.md`](./plan.md), whose atoms, `Sheet`, lint rules and harness this slice builds on. When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

This plan covers **slice 2 only**, on branch `claude/pragma-ux-redesign-slice-2`, stacked on slice 1 (PR #207). It delivers what the spec's *Slices* section assigns to slice 2: four tabs with no counts, the top safe area, Home with the next session, Your part and Your tasks, the Band hub holding tasks with the account link last, Sessions with a Setlists section, sessions listed next first, the manifest shortcut to Home, the theme colour per scheme in `index.html`, the language switch on the account page, task chips that wrap, and Studies reached through Band until slice 6. It also carries two fixes from the operator's review of slice 1 on `/tasks`: one primary action per screen, and drafts that survive a closed sheet.

Nothing in this slice touches the database or adds a dependency. No ADR is triggered: [ADR-0050](../../../../adr/0050-a-task-names-an-optional-session.md) (task session link) is slice 5 and [ADR-0051](../../../../adr/0051-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) is slice 6.

Every file path below was read on this branch while planning. Paths under `site/`, `api/`, `domain/` and `scripts/` are relative to `apps/pragma/`.

## What the spec settles, and which source wins

The spec text is the contract; the mockups show structure. Where `mockups/after-home.png` and `mockups/after-band.png` show more than the text names, this slice builds the text only:

- Home's readiness checklist ("17 songs in order", "2 songs still need a lineup") and the "Coming" avatars are not in the spec text. The avatars are attendance, which is out of scope (D4). Neither is built.
- Band's tasks grouped "For Wednesday's practice" need the task session link, which is slice 5. In slice 2, My tasks is one list in the API's order.
- The counts beside the Band links ("Venues to pitch 4") are not in the text, and D1 removes counts from the tabs. The links carry no count.
- Home's **Open the setlist** sits in the mockup's card. The spec's *Primary action placement* rule says the one primary goes in the bottom strip. The rule wins: it is the strip's pill.

## Order of work

Each step is one or more commits on `claude/pragma-ux-redesign-slice-2`.

1. **Harness first.** Teach `scripts/task-metrics/` the slice 2 measures (listed under *Acceptance and how the harness measures it*) and a start path option, then run it on the unchanged slice 1 head and write `validation/slice-2-before.json`. No app file changes before this file exists.
2. **Domain rule for the session schedule**, with its tests: `domain/session-schedule.core.ts`, then the API listing order and its back-e2e test, then `VOCABULARY.md` › Session.
3. **Draft store made generic**, with the transition draft moved onto it and its tests unchanged, then the task sheet and `SongDefaultsDialog` keeping their drafts.
4. **Shell**: four tabs, no counts, no More, top safe area, theme colour per scheme, manifest shortcut.
5. **Band hub**: `/band` with My tasks and Everyone, New task as the one primary, the quick add folded into the sheet, the links with the account page last; `/tasks` redirects; the language switch moves to the account page.
6. **Sessions**: the Sessions and Setlists section switch, the list in its new order.
7. **Home**: `/` renders Home instead of redirecting to `/catalog`.
8. **Walks updated and measured again**: every walk starts on `/`, the walks that went through More or the Setlists tab take the new path, and `validation/slice-2-after.json` is written.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D1, *Navigation* | Four tabs: Home, Sessions, Songs, Band. No count on any tab. The More drawer goes | `components/organisms/AppShell.tsx`: `PRIMARY_NAV`, `WORKSHOP_NAV`, `ADMIN_NAV` and `MORE_NAV_DESTINATIONS` become one `SHELL_TABS` array of four items (`/` `home`, `/sessions` `sessions`, `/catalog` `song`, `/band` `members`); the More `Sheet`, `isMobileNavOpen` and the `LanguageSwitcher` leave the shell. `BottomTabBar.tsx` loses `badges`, `moreDestinations`, `isMoreOpen`, `onToggleMore`, the More `<button>` and its `eslint-disable` line. `navigation-badges.hook.ts` is deleted | `pnpm exec knip` clean; `grep -rn "nav.more\|useNavigationBadges\|isMoreTabActive" site/src` returns nothing; harness `shell.tabCount` is 4 and `shell.tabNumbers` is 0 |
| D1, *Navigation* | Each tab is active for the destinations it holds | `components/organisms/navigation-active.core.ts`: `isNavigationDestinationActive` and `isMoreTabActive` are replaced by `selectActiveTab(pathname): ShellTabId`. `/` matches Home only when the path is exactly `/`; Sessions holds `/sessions` and `/setlists`; Songs holds `/catalog`; Band holds `/band`, `/tasks`, `/members`, `/instruments`, `/bars`, `/compos`, `/improvements`, `/studies` and `/account`; anything else selects no tab | `navigation-active.core.test.ts` at 100%, one case per prefix, `/` against `/sessions` (the old `startsWith` would make Home active everywhere), and an unknown path; no surviving mutant |
| D1, desktop | The sidebar keeps working at `lg` | `AppShell.tsx` sidebar maps the same `SHELL_TABS`, keeps the signed-in member card linking to `/account` at its foot, and drops the section overlines | Visual validation at 1280 px; the spec puts any further desktop layout out of scope |
| *Navigation*, rank 35 | One icon per destination | The four tab icons and the Band link icons are one data table, `BAND_DESTINATIONS` in `routes/band/band-destinations.core.ts`, beside `SHELL_TABS` | `band-destinations.core.test.ts` asserts no icon repeats across the four tabs and the Band links (Studies keeps `bolt`, Improvements `bulb`, Bars `beer`) |
| D2 | The app opens on Home | `App.tsx`: `<Route path="/" element={<HomePage />} />` replaces the `Navigate` to `/catalog`; `routes/login.core.ts` `DEFAULT_POST_LOGIN_PATH` becomes `/`, so a sign-in from `/login` and a password recovery land on Home too | Harness: a fresh sign-in lands on `/` and the walk's first screen is `/` |
| D2 | The manifest shortcut points to Home | `site/public/manifest.webmanifest`: the "Catalogue" shortcut becomes "Home" (`name` and `short_name` follow the manifest's `lang: fr`, "Accueil"), `url: "/"`; the Setlists shortcut stays, its address still exists | Harness `shell.manifestShortcutUrls` reads `["/", "/setlists"]` |
| *Slices* › 2, *Safe areas* | The shell pads `env(safe-area-inset-top)` | `AppShell.tsx` root `div`: `pt-[env(safe-area-inset-top)]`, the same arbitrary-value form the shell already uses for the bottom inset, which `no-arbitrary-tailwind-value` allows (it refuses colour, size, radius and shadow values) | Harness, with its 47 px top inset: `shell.firstContentTop` is 47 or more on `/`, `/band`, `/sessions` and `/catalog` |
| *Slices* › 2 | Tab arrival | `/band` opened at `scrollY` 151 from a scrolled Home | 0 for Sessions, Songs and Band | `--slice-2` probe `tabArrivalScroll`: scroll Home to its end, tap the tab, read `scrollY`. The tab links call `scrollPageToTop` on press |
| Theme colour per scheme | `site/index.html`: two `<meta name="theme-color">`, `media="(prefers-color-scheme: light)"` with `#f5f1e8` and `media="(prefers-color-scheme: dark)"` with `#16130f`, the light and dark `paper` of `tokens.css`, so the status bar continues the page as the mockups draw it. The manifest's `theme_color` stays `#2d5fa0`, as the spec's *Tokens* paragraph requires | `design-tokens.utils.test.ts` gains a case reading `index.html` and asserting both values equal `--color-paper`'s two `light-dark()` values; harness reads the meta in each scheme |
| *Home* | Next session: kind, date, place, setlist name, song count, total time | New `routes/home/HomePage.tsx` (queries: sessions, setlists by session, entries of the first setlist, songs, instruments, members, tasks, signed-in member, clock store) and new `routes/home/home.core.ts`: `buildHomeView(input, now)` returns `{ nextSession, memberPart, memberTasks }`. Presentational organisms `components/organisms/NextSessionCard.tsx`, `MemberPartList.tsx` | `home.core.test.ts` at 100%; `HomePage.test.tsx` renders the seeded shapes |
| *Home* | Which session is next | New `domain/session-schedule.core.ts`: `bandDayOf(instant)` (calendar day in `BAND_TIME_ZONE`), `selectNextSession(sessions, now)`: the earliest session whose band day is today or later, ties broken on `id`. A practice earlier today stays next until midnight, which is what *Practice mode* (slice 5) and Q13's recommendation need | `session-schedule.core.test.ts`: a session this morning, one tonight, one tomorrow, a past one, a tie, midnight in Paris against UTC |
| *Home* | Setlist of the session | The first setlist of `GET /api/setlists/by-session/:id`, which the repository already orders by `session_setlist.position` | Unit case with two setlists; the first by position is named |
| *Home*, D6 | Total time from the songs' durations | `home.core.ts` sums `durationSeconds` of the setlist's songs through a new `sumKnownDurations` in `components/molecules/song-duration.utils.ts`; `formatTotalDuration` beside `formatDuration` gives "1 h 18" and "48 min" through the i18n keys `home.totalHoursMinutes` and `home.totalMinutes` | `song-duration.utils.test.ts` stays at 100%; a setlist where no song has a duration shows no time |
| *Home* › Your part | The songs of that setlist where the signed-in member plays, with their instruments | `home.core.ts` calls the existing `filterEntriesForMember` (`components/organisms/setlist-filter.core.ts`) over the entries and the songs, so Home and the setlist's My part filter agree; each row is a `ListRow` link to `buildMemberPartPath(setlistId, memberId)` with `InstrumentGlyphs` | Unit case: a member in three of five songs, one through a `lineupOverride`; harness reads the rows on `/` |
| *Home* › Your tasks | Open tasks assigned to the member, by urgency as on Band | `home.core.ts` keeps `isTaskOpen` tasks whose `assigneeId` is the member, **in the order the API returns**: `tasks.repository.ts` already orders in progress, then waiting, then by nearest due date (`VOCABULARY.md` › Task). Rows reuse `TaskRow`; tapping one opens the task sheet (see the shared host below) | Unit case: done tasks and other members' tasks left out, order kept |
| *Home*, edge "No session ahead" | Empty state with **New session** | `HomePage.tsx`: `EmptyState`, and **New session** (`plus`) as the one primary pill in `BottomActions`, opening `CreateSessionDialog` as `SessionsPage` does | Component test; harness on a seed with no future session (`--seed no-upcoming-session`, below) |
| *Home*, primary placement | **Open the setlist** (`arrowR`) is Home's one primary, in the bottom strip | `HomePage.tsx` `BottomActions` with a `ButtonLink` to `/setlists/:id`; **Start the practice** is slice 5 | Harness: one primary on `/`, in the bottom third on arrival |
| *Slices* › 2, D3 | Band hub opens on **My tasks / Everyone** | New `routes/band/BandPage.tsx` at `/band`, holding today's `TasksPage` logic. `SectionTabs` with `my` and `everyone`, value in the `view` search parameter so the back button and a reload keep it, `my` by default. My tasks: the member's tasks as one `TaskRow` list in the API's order. Everyone: today's `MemberTaskColumn` grid. `routes/tasks/TasksPage.tsx` is deleted and `/tasks` becomes `<Navigate to="/band" replace />`; `routes/tasks/tasks-page.core.ts` and its test move to `routes/band/band-tasks.core.ts` with `git mv` | Harness task 3b: `/` then the Band tab, the member's first task visible on arrival; `grep -rn "routes/tasks" site/src` returns nothing |
| *Band tab*, operator review (a) | One primary action per screen: **New task** | `BandPage.tsx`: **New task** (`plus`) moves from `PageHeader` actions into `BottomActions` as the only primary. `QuickAddForm` leaves the page: the New task sheet focuses its title field on opening, which is the quick add, and **Save** in the sheet's footer is the one primary while it is open. `QuickAddForm` keeps its other caller, `BarQuickAdd`. The i18n keys `tasks.quickAddLabel` and `tasks.quickAddSubmit` are deleted | Harness `primaryCount` on `/band` is 1 (slice 1 head: 2); `i18n-parity.core.test.ts` passes |
| *Band tab* | Links below the tasks: members, instruments, bars, compositions, improvements, Studies until slice 6, the account page last | `BandPage.tsx` renders `BAND_DESTINATIONS` as `ListRow` links ending in `chevR` | Harness reads the link order on `/band`; the account link is last |
| *Band tab*, rank 21 | A long song title in a task wraps or ends in an ellipsis; chips wrap | `TaskRow.tsx` keeps `flex-wrap` on its badge line and `truncate` on the song badge; the My tasks list adds no fixed width | Harness `layoutWidth` on `/band` is 390 at 390x844 (before: 493 on `/tasks` in `baseline.json`, 390 already after slice 1) and 375 at 375x667, after the `--slice-2` probe links a task to the audit seed's longest song title through the API |
| *Navigation*, *Slices* › 2 | Language switch moves to the account page | `components/organisms/AccountSettings.tsx` gains a `Card` titled `account.language` holding `LanguageSwitcher`, placed after `SignedInMemberCard`; `AppShell.tsx` no longer imports it | Harness: the switch is on `/account`, absent from the shell; reviewer clicks EN and FR on `/account` |
| *Navigation* | Sessions holds a **Sessions / Setlists** section switch; Setlists is today's library | New molecule `components/molecules/SessionsSectionTabs.tsx` wrapping `SectionTabs` with `sessions` and `setlists`; it navigates with `replace` between `/sessions` and `/setlists`, both routes kept, so every existing back link to `/setlists` still lands. Rendered under the `PageHeader` of `SessionsPage.tsx` and `SetlistsPage.tsx` | Harness task 2 reaches the library through the Sessions tab then **Setlists** (one tap more, as the spec's row 2 says) |
| *Types / domain model* › Session, rank 22 | Coming sessions first, nearest at the top, then past ones, newest first | `domain/session-schedule.core.ts`: `orderSessionsForListing(sessions, now)` using the same band day as `selectNextSession`. Callers: `api/src/sessions/sessions.service.ts` `getSessions(now)` (the controller passes `new Date()` as the write routes do), so the API order and every cached copy agree; `routes/sessions/SessionsPage.tsx` orders at render with the clock store, so an optimistic session lands in its place instead of at the end, where `useCreateSession` appends it. `sessions.repository.ts` keeps `orderBy(desc(date))` as a stable input | `session-schedule.core.test.ts`; `sessions.controller.test.ts` "lists both newest-first" becomes "lists coming sessions first, nearest at the top, then past ones" with one past and two coming sessions; `VOCABULARY.md` › Session line and its `Held by` updated |
| *Slices* › 2 | Studies reached through Band until slice 6 | `BAND_DESTINATIONS` holds `/studies`; Band is the active tab there | Harness task 10 still reaches a study |
| *Sheets* rule, operator review (b) | Drafts survive a close by `close`, Escape or backdrop | New `lib/sheet-draft.store.ts`: `createSheetDraftStore<TDraft>()` returns a `useSheetDraft(key)` hook (`draft`, `keep`, `discard`) over a module store read through `useSyncExternalStore`, and `lib/sheet-draft.utils.ts` holds the generic `putDraft`, `takeDraft`, `clearDraft` over a `ReadonlyMap<string, TDraft>`. `lib/transition-draft.store.ts` becomes one instance of it and `transition-draft.utils.ts` keeps only `buildTransitionDraftKey` | `sheet-draft.utils.test.ts` at 100%; `TransitionCommentModal.test.tsx` passes unchanged |
| *Sheets* rule, operator review (b) | The task sheet keeps its draft | `TaskForm.tsx`: `defaultValues` is the kept draft when there is one, else `props.values`. Its `onClose` keeps `form.state.values` when the form is dirty, then calls `props.onClose`. A successful save discards the draft before the sheet unmounts. Key: `new` for a new task, the task id for an edit, so an edit's draft never fills New task | `TaskForm.test.tsx` (new): type a title, close by Escape, reopen, the title is there; same with a click on the `<dialog>` element; save, open New task, the form is blank; edit task A, close, open task B, B's values show. Harness `taskDraftAfterBackdrop` is true (slice 1 head: false) |
| *Sheets* rule | Every other dismissible sheet that holds typed fields with an explicit save keeps its draft | `SongDefaultsDialog.tsx` (key: the song id) on the same store. Left as they are, each with its reason: `SetlistEntrySheet` saves as you type; `LineupEditor` holds choices, not typed text, and slice 3 replaces it with the inline lineup; the six sheets with `isDismissible={false}` cannot lose a draft to a close and become dismissible in the slice that rebuilds them (slice 1 decision) | Component test for `SongDefaultsDialog`; reviewer greps `<Sheet` callers holding an `Input`, `AutoGrowTextarea` or `textarea` and checks each is on the store, saves as it goes, or is not dismissible |
| *Shared task sheet* | Tapping a task opens the same sheet filled with its values, on Band and on Home | New `components/organisms/task-sheet.hook.ts`: `useTaskSheet()` owns `editedTaskId`, the open flag, create, update and delete, and returns `openNewTask`, `openTask` and the sheet element; `BandPage` and `HomePage` both call it, so the two screens cannot drift | `pnpm exec knip`; both pages' tests open a task and save it |
| VOCABULARY, *Changes* › Types | New nouns **Home** and **Band tab** | `apps/pragma/VOCABULARY.md`: `## Home` (lives in `site/src/routes/home/`; the start screen showing the next session; not the catalogue, which was the start screen before) and `## Band tab` (lives in `site/src/routes/band/`; not the band as the set of members, which is **Member**) | `scripts/check-vocabulary-paths.sh` passes |
| i18n | Every new label in both languages | `site/src/i18n/en.json`, `fr.json`: `nav.home`, `nav.songs`, `nav.band`, `home.*`, `band.*`, `sessions.section.*`, `account.language`; `nav.more`, `nav.workshopSection`, `nav.administrationSection`, `nav.setlists`, `nav.catalog`, `nav.tasks` deleted when nothing reads them | `i18n-parity.core.test.ts`; `borso/no-literal-jsx-text` clean |
| *Home* `NextConcertStrip` on `/catalog` | Not changed in this slice | (out of scope: slice 6 rebuilds the Songs tab and removes it; until then it keeps the vote and stage shortcuts it carries today) | |
| D3, ADR-0050, tasks grouped by session, task sheet's session and all songs, **Start the practice** | | (out of scope: slice 5) | |
| Setlist views, entry sheet, vote page | | (out of scope: slice 3) | |
| Add songs, Order | | (out of scope: slice 4) | |
| To learn filter replacing Studies, song page, chords | | (out of scope: slice 6) | |

## Acceptance and how the harness measures it

Rows of the spec's *Acceptance criteria* marked slice 2, plus the operator's two fixes and the slice 1 rows this slice must not undo on the screens it changes. Before values: `spec/baseline/baseline.json` where the spec quotes it, and `validation/slice-2-before.json` (step 1, the slice 1 head) for the rest. After values: `validation/slice-2-after.json` (step 8).

| Row | Before | Target | How `apps/pragma/scripts/task-metrics` measures it |
|---|---|---|---|
| 3b See my own tasks | 2 taps / 0 scrolls / 3 screens (`/catalog`, More, `/tasks`) | 1 / 0 / 2 | Walk `3b` rewritten: `startFresh('/')`, tap the Band tab (`nav a` named Band), then `bringIntoView` on the member's first task in `ul[aria-label="My tasks"]`; it must be in view on arrival, so the scroll count stays 0 |
| 12 Check what is next | 1 tap, concert only (`/catalog` then My part) | 0 taps; next practice or concert with date, place and setlist on Home | Walk `12` rewritten: `startFresh('/')`, no tap; it reads `section[aria-label="Next session"]` and passes when the text holds the session's kind, its date as `formatSessionDate` prints it, the venue when the session has one, the setlist name and a song count. The audit seed's next session is the practice in 3 days with its setlist |
| Tabs | 5 plus More, 3 numbers | 4, no numbers | New `--slice-2` probe `shell`: count `a` and `button` in `nav[aria-label="Main sections"]`, and digits in their text |
| Band tasks layout width at 390 | 493 px (`/tasks`, baseline) | 390 px | `--routes` measures `/band` (added to the route list; `/tasks` stays listed and lands on `/band`); `layoutWidth` at 390x844, and the `--slice-2` probe repeats it at 375x667 |
| Primary actions per screen (operator review a) | 2 on `/tasks` (New task and the quick Add); 5 on `/account` | 1 on `/`, `/band`, `/sessions`, `/setlists`; 0 on `/account`, whose card actions are secondary because no one of them is the page's action | `--slice-2` probe `primaryCount`: visible `[data-variant="primary"]` elements outside `nav` and closed dialogs. `Button.tsx` and `ButtonLink.tsx` gain `data-variant={variant}`, which also lets the probe stop guessing from colours |
| Primary action in the bottom third on arrival (spec, each slice holds its routes) | `/sessions` yes; Home and `/band` do not exist | yes on `/`, `/band`, `/sessions`, `/setlists` | `--routes` bottom-third classification, unchanged |
| Task sheet draft after a close (operator review b) | lost | kept after a backdrop tap and after Escape | `--slice-2` probe `taskDraft`, built like slice 1's transition draft probe: open New task, type, tap the backdrop through argent, reopen, read the title field; again with Escape |
| Top safe area | not padded | first content at 47 px or more | `--slice-2` probe `firstContentTop` on `/`, `/band`, `/sessions`, `/catalog` with the harness's 47 px inset |
| Theme colour per scheme | one value, `#2d5fa0` | `#f5f1e8` light, `#16130f` dark | `--slice-2` probe reads the `theme-color` meta matching each emulated scheme |
| Manifest shortcut | `/catalog` | `/` | `--slice-2` fetches `/manifest.webmanifest` and lists the shortcut urls |
| Language switch | in the More drawer | on `/account` only | `--slice-2` probe looks for the FR and EN chips in the shell and on `/account` |
| Held from slice 1 on `/`, `/band`, `/sessions`, `/setlists`, `/account` | 0 after slice 1 | 0 | `--routes --slice-1`: text-only buttons (a control with `aria-pressed` or a tab, radio, option, switch or checkbox role is counted under `choices`, since the spec calls chips and section tabs choices), icon-only without a name, routes with two vertical scroll areas, tap targets under 44 px, text under 4.5:1 in both schemes, text set in a member colour |
| Tasks whose path changed (1, 2, 3, 8, 8b, 9, 10, 11) | `slice-2-before.json` | recorded, not gated here | Every walk starts on `/`. D2 says browsing songs costs one more tap, and D1 says the same of the Setlists section, so these counts move by design; their targets belong to slices 3 to 6 |

Harness changes, all in `apps/pragma/scripts/task-metrics/`:

- `band-session.setup.ts`: `startFresh` defaults to `/`.
- `task-walks.setup.ts`: every walk starts on `/`; walks 3 and 3b use the Band tab instead of More then Tasks; walk 2 uses the Sessions tab then the **Setlists** section tab; walk 12 reads Home.
- `route-measures.setup.ts`: `/` and `/band` join the route list.
- New `slice-two-measures.setup.ts` (shell, primary count, task draft, first content top, theme colour, manifest, language switch), wired to a `--slice-2` flag in `task-metrics.core.ts` `parseTaskMetricsArguments` and in `task-metrics.setup.ts`, as `--slice-1` is.
- `audit-seed.setup.ts`: a `no-upcoming-session` variant, chosen by `--seed`, that dates every session in the past, for Home's empty state.
- `README.md`: the `--slice-2` and `--seed` options.

Run, from `apps/pragma`:

```bash
pnpm run task-metrics -- --tasks all --routes --slice-1 --slice-2 --out ../../docs/features/pragma/ux-redesign/validation/slice-2-before.json   # step 1, slice 1 head
pnpm run task-metrics -- --tasks all --routes --slice-1 --slice-2 --out ../../docs/features/pragma/ux-redesign/validation/slice-2-after.json    # step 8
pnpm run task-metrics -- --tasks none --slice-2 --seed no-upcoming-session --out ../../docs/features/pragma/ux-redesign/validation/slice-2-after-empty.json
```

## New files and their blueprints

Blueprints read from `.claude/skills/blueprint/blueprint-index.md`, regenerated with `scripts/reports.sh blueprints` at planning time. Each new file carries `// @FollowsBlueprint <id>`.

| File | Blueprint |
|---|---|
| `domain/session-schedule.core.ts` | `domain-shared-selection` (`last-loop-lepin/domain/edition-selection.core.ts`): a rule both sides read |
| `domain/session-schedule.core.test.ts`, `site/src/routes/home/home.core.test.ts`, `site/src/routes/band/band-destinations.core.test.ts`, `site/src/lib/sheet-draft.utils.test.ts` | `test-pure-unit` (`domain/transition.core.test.ts`) |
| `site/src/routes/home/HomePage.tsx`, `site/src/routes/band/BandPage.tsx` | `route-detail-page` (`SessionDetailPage.tsx`) for Home, which shows one session; `route-list-page` (`CatalogPage.tsx`) for Band, which lists tasks |
| `site/src/routes/home/home.core.ts` | `core-view-projection-joining-two-lists` (`banana-rush` `game-summary.core.ts`): it joins sessions, setlists, entries, songs and tasks into one view |
| `site/src/routes/band/band-destinations.core.ts` | `core-lookup-table` (`last-loop-lepin` `auth.core.ts`) |
| `site/src/routes/band/band-tasks.core.ts` (moved) | keeps its existing markers (`core-view-projection`, `core-view-intent`, `core-form-schema`); moving a file does not move a recorded subject |
| `site/src/components/organisms/NextSessionCard.tsx`, `MemberPartList.tsx` | `organism-presentational` (`SongCard.tsx`) |
| `site/src/components/organisms/task-sheet.hook.ts` | `hook-stateful-helper` (`last-loop-lepin` `useGpxFile.ts`) |
| `site/src/components/molecules/SessionsSectionTabs.tsx` | `molecule-presentational` (`StatusChip.tsx`) |
| `site/src/lib/sheet-draft.store.ts` | `hook-external-store` (`online-status.hook.ts`) |
| `site/src/lib/sheet-draft.utils.ts` | `utils-pure-module` (`member-color.utils.ts`) |
| `site/src/routes/home/HomePage.test.tsx`, `site/src/routes/band/BandPage.test.tsx`, `site/src/components/organisms/TaskForm.test.tsx`, `SongDefaultsDialog.test.tsx` | `test-component-render` (`MemberFilterPills.test.tsx`) |
| `apps/pragma/scripts/task-metrics/slice-two-measures.setup.ts` | No blueprint, as for the other harness `.setup.ts` files (slice 1 plan); shaped like `slice-one-measures.setup.ts` |

The edited `api/src/sessions/sessions.controller.test.ts` follows `test-back-e2e`; `sessions.service.ts` keeps its marker, and `getSessions` takes `now` the way `service-clock-injected` (`uploads.service.ts`) does.

## Pattern coherence

- **Next session, three rules today.** `selectNextConcert` (`lib/next-concert.core.ts`, concerts only, strictly after now), `findNextSession` in `api/src/sessions/offline-manifest.core.ts` (any kind, strictly after now) and Home's new rule (any kind, band day today or later). Home takes the domain rule. `NextConcertStrip` keeps `selectNextConcert` until slice 6 removes the strip. The offline manifest keeps its rule in this slice: it is a `@Blueprint core-projection` whose description states "strictly after `now`", and changing which session a phone pre-caches belongs with practice mode's offline promise in slice 5. The difference is named in the risk register.
- **Drafts.** One generic store replaces the transition-only one, so the next sheet that keeps a draft does not copy a third module store.
- **Task sheet host.** One hook owns opening, saving and deleting a task, used by Band and Home, instead of the page-level state `TasksPage` holds today.
- **Section switches.** `SectionTabs` from slice 1 serves Band's My tasks / Everyone and Sessions / Setlists; no second tab component.
- **Dependencies.** None added or removed.

## Decisions taken while planning

Implementation choices the spec leaves open; none changes what a member sees beyond the spec.

- **The section switch between Sessions and Setlists navigates between two routes** rather than merging them, so every link and back link that names `/setlists` keeps working, and Sessions stays the active tab on both.
- **Band's view lives in the `view` search parameter**, so a reload or the back button returns to Everyone when that was the view.
- **The quick add is folded into the sheet, not kept as a secondary.** The spec's Band section names only **New task** and its sheet with the title focused; a second field at the top of the page would be a second way to do the same thing.
- **A session with no setlist on Home**: the card shows kind, date and place, and the one primary pill is **Open the session** (`arrowR`) linking to `/sessions/:id`, which is where a setlist is attached today; slice 5 replaces it with **Add songs**. The operator may prefer something else; it is a one-line change.
- **A setlist where only some songs have a duration** shows the total of the known ones; a setlist with none shows no time. Slice 3's setlist header reads the same helper, so the two screens cannot disagree.
- **A signed-in account with no member row** shows no Your part and no Your tasks, and My tasks on Band shows its empty state.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Home's tab is active on every page, because `/` is a prefix of every path, the way `isNavigationDestinationActive` matches today | high | `selectActiveTab` matches Home on the exact path only | `navigation-active.core.test.ts` case `/sessions` selects Sessions, not Home; harness reads `aria-current` on each tab per route |
| Changing the API's session order breaks a caller that took the first row as the newest (the setlist attach picker, `CreateSessionDialog`'s concert list, the concert readiness study) | high | Grep every reader of `useSessionsList`, `listSessions` and `getSessions` before step 2 and check each one sorts for itself or wants the new order; `concert-readiness.core.ts` filters with `selectUpcomingConcerts` and is order-free | Back-e2e suite; `/technical-validation` per-decision pass on each caller listed in the commit body |
| The band day is computed in the browser's time zone instead of Paris, so a member abroad sees a different next session | medium | `bandDayOf` formats with `Intl.DateTimeFormat` in `BAND_TIME_ZONE` | Unit case at 23:30 UTC (00:30 in Paris) |
| Home and the offline manifest disagree on the next session for the hours after a practice starts on its day | medium | Named above; slice 5's plan owns the offline manifest | The slice 5 acceptance row "take recorded with the network off" exercises it |
| A kept task draft fills New task after a save, because the dialog's `close` event fires after the save and keeps the saved values | high | Save discards the draft, and `onClose` keeps only a dirty form | `TaskForm.test.tsx` "save, then New task is blank" |
| An edit's draft leaks into another task's sheet | medium | Draft key is the task id; `new` for a new task | `TaskForm.test.tsx` "edit A, close, open B" |
| Removing the More drawer strands a destination nobody can reach on a phone | high | `BAND_DESTINATIONS` lists every route the drawer held; `/tasks` redirects | Harness `--routes` reaches all 26 routes through the app; `band-destinations.core.test.ts` asserts the drawer's seven destinations are all present |
| `/band` with My tasks and the links becomes long and pushes the links below several screens | low | My tasks lists one member's tasks only; Everyone is a choice | Harness `pageHeightInScreens` on `/band`, recorded |
| The Band tab's My tasks shows done tasks among open ones | low | It keeps the API's order, which places done last, and `TaskRow` strikes them through | Harness reads the row order on `/band` |
| Walks rewritten to start on `/` hide a regression in a task's own path | medium | Step 1 records every task on the slice 1 head with the old start; step 8 records the new start; the commit body lists each changed count and its cause (D1 or D2) | Diff of `slice-2-before.json` and `slice-2-after.json` per task in `validation/` |
| A primary pill appears twice when a page renders `BottomActions` and its header also passes a `primary` button | medium | `PageHeader` actions use `secondary` or `IconButton` only on the slice 2 pages | Harness `primaryCount` |
| The status bar colour in dark mode mismatches `paper` after a later token change | low | The `index.html` test reads `tokens.css` | `design-tokens.utils.test.ts` |
| The `@Blueprint organism-shell` description ("its only state is the mobile panel flag a button writes") goes stale when the flag goes | medium | Rewrite the description in the same commit: the shell holds no state | `/standards-review`; reviewer reads the block |
| Moving `tasks-page.core.ts` breaks a `@FollowsBlueprint` subject | low | `git mv` keeps the symbols under their markers | `blueprint-indexing.ts --check` |
| A new file without a layer suffix raises `layer-marker:pragma` | low | Every new file ends in a suffix from the table above | `convention-drift.ts --check` |

## Code-quality self-check

- [ ] `pnpm run lint` clean (oxlint with the type-aware rules, including `borso/no-type-assertion-except-unknown`, `borso/no-raw-interactive-element`, `borso/no-arbitrary-tailwind-value`, `borso/no-vertical-scroll-container`, `borso/no-use-effect`, `borso/no-comments`, `borso/no-literal-jsx-text`), and `pnpm run format:check` clean.
- [ ] `pnpm --filter @borso-app/pragma typecheck` clean.
- [ ] No `any`, no `as Foo`.
- [ ] No abbreviations or one-letter locals.
- [ ] Magic values named: the tab table, the band destinations, the `view` parameter name and its two values, the draft key `new`, the two theme colours.
- [ ] No comments; machine annotations stay.
- [ ] Function names describe the result (`selectNextSession`, `orderSessionsForListing`, `selectActiveTab`, `buildHomeView`, `sumKnownDurations`).
- [ ] No new `useEffect`: the clock comes from `clock.store.ts`, drafts from `useSyncExternalStore`, the view from the URL.
- [ ] Every pure helper is a `*.core.ts` or `*.utils.ts` with its sibling test at 100%: `session-schedule.core.ts`, `home.core.ts`, `band-destinations.core.ts`, `navigation-active.core.ts`, `band-tasks.core.ts`, `sheet-draft.utils.ts`, `transition-draft.utils.ts`, `song-duration.utils.ts`.
- [ ] Every user-facing string in `en.json` and `fr.json`.
- [ ] Every page renders at 375 px with no sideways scroll.
- [ ] `pnpm exec knip` clean: `navigation-badges.hook.ts`, `TasksPage.tsx` and the deleted i18n keys leave no importer behind.
- [ ] Commit scopes: `pragma` for app, harness and plan files; `meta` for anything under `docs/standards/` or `docs/adr/`.

## Pre-flight gates

1. `pnpm install`.
2. Step 1's `task-metrics` run on the slice 1 head writes `validation/slice-2-before.json` with no failed walk.
3. `pnpm --filter @borso-app/pragma typecheck`.
4. `pnpm run lint` and `pnpm run format:check`.
5. `pnpm --filter @borso-app/pragma run test:core` (coverage on every touched `*.core.ts` and `*.utils.ts`, including `domain/`) and `pnpm --filter @borso-app/pragma test` (back-e2e: the new session order).
6. `pnpm --filter @borso-app/pragma run test:mutation -- --mutate domain/session-schedule.core.ts,site/src/routes/home/home.core.ts,site/src/routes/band/band-destinations.core.ts,site/src/components/organisms/navigation-active.core.ts,site/src/lib/sheet-draft.utils.ts,site/src/components/molecules/song-duration.utils.ts,scripts/task-metrics/task-metrics.core.ts`.
7. `pnpm --filter @borso-app/pragma build`.
8. `pnpm exec knip`.
9. `pnpm exec tsx scripts/standards/enforcement-ledger.ts --check`, `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check`, `pnpm exec tsx scripts/standards/convention-drift.ts --check`, `pnpm exec tsx scripts/architecture/architecture-graph.ts --check`, `scripts/check-vocabulary-paths.sh`, `pnpm exec tsx scripts/docs/check-doc-links.ts`.
10. Step 8's three `task-metrics` runs; every row of *Acceptance and how the harness measures it* checked against `slice-2-after.json` and `slice-2-after-empty.json`.
11. `/visual-validation docs/features/pragma/ux-redesign/spec/spec.md`, scoped to slice 2, at 375x667 and 390x844 in both schemes and at 1280 px for the sidebar; the tab taps, the sheet backdrop and the section switches through `scripts/argent.sh touch`.
12. `/technical-validation docs/features/pragma/ux-redesign/spec/spec.md`, scoped to slice 2.
13. `/standards-review`, then `pnpm exec tsx scripts/standards/seal.ts verify`.
14. human: the operator opens the app on a phone, lands on Home, and confirms the four tabs and the Band hub read the way the spec describes.

## Open questions / unknowns

None blocks slice 2. The spec answers what Home shows and which four tabs exist; the gaps found while planning are recorded under *Decisions taken while planning*, each reversible in one file. Q11 to Q13 stay open in the spec and belong to slice 5.

## Missing technical skills

- **Navigation shell.** Active-tab matching, safe areas and a standalone PWA's status bar colour are rediscovered per app; nothing in `.claude/skills/` walks them.
- **Drafts in sheets.** The generic store here could become a blueprint once a third sheet uses it.
