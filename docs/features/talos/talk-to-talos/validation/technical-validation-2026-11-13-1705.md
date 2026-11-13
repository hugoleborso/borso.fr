# Technical validation — Talk to Talos, and clean home-screen icons

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`docs/features/talos/talk-to-talos/plan/` does not exist)
- Branch: feat/talos-talk-to-talos
- Base: origin/main (`488128f8c65c34c7f1d03aa7e90425ecea09ad18`)
- Run at: 2026-11-13T17:05:22Z
- Round: 1
- Reviewed: 1396d64d09689b9a9b201d9e8538a7e9290f8879
- Touched workspaces: @borso-app/talos (site, api, domain)

The spec is in the short form (Goal, Data shape, Behaviour, Out of scope). Categories A and D are built from its Data shape and Behaviour bullets, in order, and the files are taken from the diff. No merge of `main` sits above the base (`git rev-list --merges origin/main..HEAD` prints nothing). The working tree stayed clean at the reviewed SHA for every run below.

4 use cases routed to /visual-validation; out of scope for this report: the link's filled bronze look (Behaviour 1), the tab bar with « Parler à Talos » holding at 375 px (Behaviour 1), the back button not landing on `/talk` (Behaviour 3), and the coin looking sharp on the iOS home screen (Behaviour 6).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | docs/features/talos/talk-to-talos/ | The folder holds `kaizen.md`, `spec/` and `validation/` only. No row below depends on a plan; conformance to one cannot be checked. | UNVERIFIABLE |
| A01 | Data shape 1 | `GET /api/messages/claude-code` is unchanged | apps/talos/api/src/messages/ | `git diff --stat origin/main...HEAD -- apps/talos/api/src/messages apps/talos/site/src/lib/claude-code-address.core.ts apps/talos/site/src/lib/queries/messages.queries.ts` prints nothing. | PASS |
| A02 | Data shape 2 | `TalkToTalosLink { href, target }` from `useTalkToTalosLink` | apps/talos/site/src/lib/talk-to-talos.hook.ts:12-17 | `export interface TalkToTalosLink { readonly href: string \| undefined; readonly target: string \| undefined; }` / `export function useTalkToTalosLink(): TalkToTalosLink {` | PASS |
| A03 | Data shape 3 | `TALK_PATH = '/talk'`, `ROUTINE_RUN_LIST_PATH = '/runs'` | apps/talos/site/src/lib/talk-to-talos.core.ts:1; apps/talos/site/src/lib/routine-run.core.ts:1; apps/talos/site/src/App.tsx:106-107 | `export const TALK_PATH = '/talk';` / `export const ROUTINE_RUN_LIST_PATH = '/runs';` / `<Route path={ROUTINE_RUN_LIST_PATH} element={<RoutineRunsPage />} />` `<Route path={TALK_PATH} element={<TalkPage />} />` | PASS |
| A04 | Data shape 4 | Manifest shortcut `{ name: 'Parler à Talos', short_name: 'Parler', url: '/talk' }`, replacing « Message » | apps/talos/site/public/manifest.webmanifest:28-32 | `"name": "Parler à Talos",` `"short_name": "Parler",` `"url": "/talk",` and the line `{ "name": "Message", "url": "/message" }` is removed. An `icons` entry is added, which the spec does not forbid. | PASS |
| A05 | Data shape 5, Behaviour 7 | Cache version `talos-v3`, so a device drops what `talos-v2` cached | apps/talos/site/public/sw.js:1-3, 15 | `const CACHE_VERSION = 'talos-v3';` with `SHELL_CACHE`, `DATA_CACHE` and `FONT_CACHE` all derived from it. | PASS |
| A06 | Behaviour 1 | Tab bar holds Jour, Todo, Décider, Mémoire, then « Parler à Talos », on every screen in the shell | apps/talos/site/src/components/organisms/AppShell.tsx:22-24, 54; BottomTabBar.tsx:76 | The `/message` tab is removed from `TABS`; `trailing={<TalkToTalosLink />}`; `{trailing === undefined ? null : <li className="shrink-0 ml-1">{trailing}</li>}` after the four tabs. `AppShell` wraps every signed-in route. | PASS |
| A07 | Behaviour 2 | The link is `buildClaudeCodeAddress` on the build environment, with the prompt « Tu es Talos. Hugo veut te parler : »; `environment` only on the web link, a new tab on the web | apps/talos/site/src/lib/talk-to-talos.hook.ts:10, 20-23; claude-code-address.core.ts (unchanged); fr.json:125 | `const TALK_ENVIRONMENT: ClaudeCodeEnvironment = 'build';` / `href: buildEnvironmentAddress(target.data, TALK_ENVIRONMENT, t('talk.prompt'), opener),` / `target: selectClaudeCodeLinkTarget(opener),`; the builder keeps `if (launch.environmentId !== null && opener === 'web')`; `"talk.prompt": "Tu es Talos. Hugo veut te parler :"`. | PASS |
| A08 | Behaviour 3 | `/talk` shows « Parler à Talos » and leaves for the same link once known, with `location.replace` | apps/talos/site/src/components/organisms/TalkRedirect.tsx:16-24; apps/talos/site/src/lib/departure.adapter.ts:9-11 | `<PageTitle hasMark>{t('talk.title')}</PageTitle>`; the anchor renders only when `link.href` is defined, with `ref={followLinkOnAttach}`; `link?.ownerDocument.location.replace(link.href);`. The callback is module-level, so React attaches it once, per blueprint `ref-callback-browser-api`. No `useEffect`. | PASS |
| A09 | Behaviour 4 | Message screen, composer, `POST /api/routine/runs`, the message text rule and the launch toasts are removed | api/src/routine/routine.controller.ts:7-9; deleted MessagePage.tsx, MessageComposer.tsx, message-composer.core.ts, domain/routine-run.core.ts, api/src/routine/routine.core.ts; mutation-toasts.core.ts | The router is now `.use('*', requireSession).get('/runs', …)` only. `ROUTINE_LAUNCHED_TOAST`, `selectLaunchFailureToast`, `useLaunchMessageRun`, `messageTextSchema` and `'routine-fire-failed'` are gone. A grep across `apps/talos`, `.github`, `infra`, `scripts` and `.claude` for each removed name finds none outside the generated `docs/standards/blueprint-subjects.json` (see Notes). | PASS |
| A10 | Behaviour 4 | Routine runs keep their table; old `message` rows stay listed | apps/talos/api/src/routine/routine.schema.ts:8; api/src/helpers/routine/routine-fire.core.ts:3; site/src/lib/routine-run.core.ts | `trigger: text('trigger', { enum: ROUTINE_TRIGGERS }).notNull(),` with `ROUTINE_TRIGGERS = ['proposition', 'message']`; the site keeps `message: 'runs.trigger.message'`. | PASS |
| A11 | Behaviour 5 | « Lancements » at `/runs`, its own screen, from the tile of the day, with an empty state | apps/talos/site/src/components/organisms/TodayIndex.tsx:110; RoutineRunBoard.tsx:25-29; routes/RoutineRunsPage.tsx | `to: ROUTINE_RUN_LIST_PATH,`; `<PageTitle>{t('runs.title')}</PageTitle>`; `{runs.data.items.length === 0 ? <EmptyState icon="send" label={t('runs.empty')} /> : null}`. | PASS |
| A12 | Behaviour 6 | Home-screen icons are opaque RGB, no longer palettes; coin at 85 %, 66 % on the maskable | apps/talos/site/public/icons/*.png | Measured with Pillow: `apple-touch-icon.png RGB (180,180) alpha (255,255) frac 0.85`, `icon-192.png RGB … frac 0.849`, `icon-512.png RGB … frac 0.85`, `icon-maskable-512.png RGB … frac 0.66`. The same four files on `origin/main` read mode `P`. The favicons stay RGBA, which the spec does not cover. | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <every added or modified .ts/.tsx under apps/talos>` | exit 0, no output | PASS |
| B02 | No `any`, assertions limited to `as const` / `as unknown` | `grep -nE '\bany\b\| as [A-Z]'` on the same files | Only matches are English words in test names (`App.test.tsx:164`, `departure.adapter.test.ts:5`, `service-worker.test.ts:183`). | PASS |
| B03 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | None. The `/talk` redirect is a module-level ref callback (`departure.adapter.ts:9`), the blueprint `ref-callback-browser-api` copied from pragma's `modal-dialog.adapter.ts`. Under `StrictMode` (`main.tsx:26`) dev calls it attach, detach, attach, so `replace` runs twice in dev only, with the same address. | PASS |
| B04 | No prose comments | read in full | The only comments are `/** @DependsOnExternal browser-location */` and `// @FollowsBlueprint …`, which tools read. | PASS |
| B05 | Names carry intent; magic numbers | read in full | `followLinkOnAttach`, `useTalkToTalosLink`, `TALK_ENVIRONMENT`, `TALK_ICON_SIZE`, `RoutineRunBoard`. `TalkRedirect.tsx:31` writes `size={20}` where `TalkToTalosLink.tsx:6` names `TALK_ICON_SIZE = 20`; the site has 12 other `size={20}` in components, and lint accepts it. | PASS |
| B06 | Standards checklist: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true" | read `apps/talos/VOCABULARY.md` in full | `The « Parler à Talos » link at the end of the tab bar, on every screen. It opens a new Claude Code session on the agent repository, in the build environment, with a short prompt prefilled.` at apps/talos/VOCABULARY.md:180. From the iOS home-screen app the link is `claude://code/new?repo=…&q=…`, with no `environment`, and the session starts in the app's default environment (spec Behaviour 2, `claude-code-address.core.ts` `opener === 'web'`). The definition is false on the owner's main device. Introduced: this branch; Fix size: one line. | FAIL (non-blocking) |
| B07 | Standards checklist: "an invariant promising behaviour carries a `Held by:` line" | read in full | `Held by: api/src/proposals/proposals.controller.test.ts › commits the decision even when no routine is configured` (VOCABULARY.md:199). The test exists at proposals.controller.test.ts:253 and asserts `expect(await getDatabase().select().from(routineRunTable)).toEqual([]);`. | PASS |
| B08 | Standards checklist: verb table (`build…`, `select…` return what the verb says) | read in full | `buildEnvironmentAddress` returns an address or `undefined`; `selectTriggerLabelKey` returns a key; `followLinkOnAttach` returns `void` and follows. | PASS |
| B09 | Standards checklist: a file name says what it holds; `.core` vs `.utils` | read in full | `talk-to-talos.core.ts` holds `TALK_PATH`, the way `proposal-board.core.ts` holds `PROPOSALS_PATH`; `talk-to-talos.hook.ts` holds the hook; `departure.adapter.ts` holds the one browser call. | PASS |
| B10 | Standards checklist: a site limit does not restate an API one | read in full | `RECENT_ROUTINE_RUN_LIMIT = 20` moved from `domain/` to `routine.service.ts:6`; the site no longer reads it since `placeNewestRunFirst` went. | PASS |
| B11 | Standards checklist: a route composes organisms and owns no layout primitive | read in full | `TalkPage` returns `<TalkRedirect />`; `RoutineRunsPage` returns `<RoutineRunBoard />`. | PASS |
| B12 | Standards checklist: no label that explains the interface | read in full | New strings: `nav.talk`, `talk.title`, `talk.prompt` (a prompt sent to Claude), `runs.empty` « Aucun lancement pour l'instant », the empty state the spec asks for. | PASS |
| B13 | Standards checklist: an i18n key names the screen and the element | read fr.json diff | `runs.title`, `runs.empty`, `runs.trigger.*`, `runs.open`, `talk.title`, `talk.prompt`, `nav.talk`. | PASS |
| B14 | Standards checklist: a test name states the behaviour and the condition | read the changed tests | e.g. `'no longer exists, since the PWA has no Message screen to send from'`, `'does nothing when React detaches the link'`. | PASS |
| B15 | Blueprint index | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | exit 0, `Annotations are complete; the index was refreshed.` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm exec vitest run --project core --changed 488128f8c65c34c7f1d03aa7e90425ecea09ad18 --reporter=verbose` (in apps/talos) | 0; 40 files, 226 tests; ran the feature's own `site/src/App.test.tsx`, `App.todo.test.tsx`, `TodayIndex.test.tsx`, `lib/departure.adapter.test.ts`, `lib/talk-to-talos.core.test.ts`, `lib/routine-run.core.test.ts`, `lib/queries/mutation-toasts.core.test.ts`, `sw/service-worker.test.ts`, `api/src/routine/routine.schema.test.ts` | PASS |
| C02 | @borso-app/talos | `pnpm run test:e2e api/src/routine/routine.controller.test.ts api/src/proposals/proposals.controller.test.ts` | 0; 2 files, 20 tests | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh 488128f8c65c34c7f1d03aa7e90425ecea09ad18 apps/talos` | 0; 43 killed, 0 survived, score 100 | PASS |
| C04 | @borso-app/talos | `*.utils.ts` in the diff | None added or changed; the workspace has `test:core` and coverage. | PASS |

The brief reports, measured by the main session, typecheck, `lint`, the whole core project with `--coverage` (159 files, 1334 tests, 100 % per file), the whole back-e2e project (30 files, 161 tests) and `pnpm knip` green. This round did not re-run those.

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | B1: the bar reads Jour, Todo, Décider, Mémoire, then « Parler à Talos » | `it('keeps four tabs and the link to talk to Talos, …')` at apps/talos/site/src/App.todo.test.tsx:95; `).toStrictEqual(['Jour', 'Todo', 'Décider', 'Mémoire', 'Parler à Talos']);` at :102 | PASS |
| D02 | B1: the link is on every screen inside the shell | `it('puts « Parler à Talos » in the tab bar of every screen, …')` at App.test.tsx:334 on `/recurring`, and D01 on `/todos`; `expect(link?.getAttribute('href')).toBe(TALK_ADDRESS);` at :340 | PASS |
| D03 | B2: on the web, the link is `https://claude.ai/code/new?repo=…&environment=<build id>&q=<prompt>` | App.test.tsx:334; `TALK_ADDRESS = 'https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_construction' + '&q=Tu%20es%20Talos.%20Hugo%20veut%20te%20parler%20%3A'` at :93-95, asserted at :340. `env_construction` is the `build` id, `env_lecture` the `talos` one, so the test fails if the hook picks the wrong environment. | PASS |
| D04 | B2: on the web it opens in a new tab | App.test.tsx:341 `expect(link?.getAttribute('target')).toBe('_blank');` | PASS |
| D05 | B2: from the iOS home-screen app, the link is `claude://code/new?repo=…&q=…` without `environment` | The builder is covered: claude-code-address.core.test.ts:47 `).toBe('claude://code/new?repo=a%2Fb&q=p');`. The hook is not: no test stubs `navigator.standalone` around the tab bar or `/talk` (`grep -rn standalone site/src --include=*.test.*` finds only `claude-code-opener.adapter.test.ts`). Failing case: change `talk-to-talos.hook.ts:22` to pass `'web'` instead of `opener`; the home-screen app then gets an `https://` link carrying `environment`, which the Claude app drops (docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md), and every test stays green (inferred from reading the tests). | FAIL (non-blocking) |
| D06 | B3: `/talk` shows « Parler à Talos » with the link once known | `it('answers /talk, the address of the home-screen shortcut, …')` at App.test.tsx:346; waits for `main a[href="${TALK_ADDRESS}"]` and asserts `expect(tree.container.querySelector('h1')?.textContent).toBe('Parler à Talos');` at :352 | PASS |
| D07 | B3: `/talk` leaves for that link with `location.replace` | The adapter is covered: departure.adapter.test.ts:5-12 `expect(replace).toHaveBeenCalledExactlyOnceWith('https://claude.ai/code/new?repo=a%2Fb');`. The wiring on `/talk` is not: App.test.tsx:347 silences `console.error` (where jsdom reports the navigation) and asserts nothing about leaving. Failing case: delete `ref={followLinkOnAttach}` at TalkRedirect.tsx:23; `/talk` then shows a button and never leaves, and every test stays green (inferred from reading the tests). | FAIL (non-blocking) |
| D08 | B4: `POST /api/routine/runs` is removed | `it('no longer exists, since the PWA has no Message screen to send from')` at api/src/routine/routine.controller.test.ts:58; `expect(response.status).toBe(404);` at :65 and no row stored | PASS |
| D09 | B4: the Message screen and its composer are removed | D01's tab list at App.todo.test.tsx:102 has no « Message »; `it('leaves no shortcut to the removed Message screen')` at talk-to-talos.core.test.ts:27 asserts the shortcut urls `toStrictEqual(['/todos', '/proposals', TALK_PATH])`. `/message` itself falls to `<Route path="*" element={<Navigate to="/" replace />} />` (App.tsx:109). | PASS |
| D10 | B4: the message text rule and the launch toasts are removed | structural: `domain/routine-run.core.ts` and its test are deleted; `mutation-toasts.core.ts` no longer exports `ROUTINE_LAUNCHED_TOAST` or `selectLaunchFailureToast`; `pnpm knip` green (brief, measured). A removal has no behaviour left to test. | PASS |
| D11 | B4: routine runs keep their table | `it('holds the five columns of a routine run, the address alone optional')` at api/src/routine/routine.schema.test.ts:6 | PASS |
| D12 | B4: old `message` rows stay listed | `it('answers the 20 most recent runs, newest first, the runs of the former Message screen included')` at routine.controller.test.ts:26, asserting `trigger: 'message'` at :38; the label in routine-run.core.test.ts `['message', 'runs.trigger.message']` | PASS |
| D13 | B5: « Lancements » is a screen of its own at `/runs` | `it('lists the routine runs on a screen of their own')` at App.test.tsx:357; `expect(tree.container.querySelector('h1')?.textContent).toBe('Lancements');` at :377 | PASS |
| D14 | B5: reached from the tile of the day | TodayIndex.test.tsx:56 `['Lancements', '/runs'],` | PASS |
| D15 | B5: `/runs` shows an empty state | No site test renders `/runs` with `{ items: [] }`; `grep -rn "Aucun lancement\|runs.empty" site/src --include=*.test.*` finds nothing. The API side is covered (routine.controller.test.ts:44, `{ items: [] }`), not the screen. Failing case: delete the `EmptyState` at RoutineRunBoard.tsx:29; `/runs` with no run then shows an empty card, and every test stays green. | FAIL (non-blocking) |
| D16 | B6: icons are opaque RGB PNGs, coin at 85 % / 66 % | structural, measured on the files themselves (A12): mode `RGB`, alpha extrema `(255, 255)`, coin bbox 0.85 / 0.849 / 0.85 / 0.66 of the side. No test reads the files, so a later palette export would pass CI (see Notes). | PASS |
| D17 | B7: `talos-v3` drops the caches of `talos-v2` | `it('deletes the caches of an earlier version on activate')` at sw/service-worker.test.ts:47, seeding `'talos-v2-shell', '/icons/icon-192.png'` at :49 and asserting only the `talos-v3-*` caches remain | PASS |
| D18 | Data shape: `TALK_PATH = '/talk'`, `ROUTINE_RUN_LIST_PATH = '/runs'` | talk-to-talos.core.test.ts:23 `expect(TALK_PATH).toBe('/talk');`; routine-run.core.test.ts `expect(ROUTINE_RUN_LIST_PATH).toBe('/runs');` | PASS |
| D19 | Data shape: shortcut `name: 'Parler à Talos'`, `url: '/talk'` | talk-to-talos.core.test.ts:24 `expect(readManifestShortcuts()).toContainEqual({ name: 'Parler à Talos', url: TALK_PATH });` | PASS |
| D20 | Data shape: shortcut `short_name: 'Parler'` | The test's schema `z.object({ name: z.string(), url: z.string() })` (talk-to-talos.core.test.ts:9) strips `short_name`, so nothing pins it. Failing case: delete `"short_name": "Parler"` at manifest.webmanifest:30; Android then labels the shortcut with the full name, and the test stays green. | FAIL (non-blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `launchMessageRun` → `insertRoutineRun` (removed from apps/talos/api/src/routine/routine.service.ts) | Write path removed | The diff deletes the only write the Message screen reached: `- const outcome = await fireRoutine('message', message);` … `- return await storeRoutineRun({ trigger: 'message', …`. | PASS |
| E02 | `launchProposalRun` → `storeRoutineRun` → `insertRoutineRun` (routine.service.ts:10-29, touched by the diff) | Check-then-write | `const run = { id: randomUUID(), ...firedRun }; await insertRoutineRun(run);` takes no decision from rows read earlier: no count, no existence check. The spec states no rule over routine runs, such as one run per decision, that two concurrent requests could break. | PASS |
| E03 | Module-level state in the changed api and lib files | Per-process state | `grep -nE '^(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^let '` finds nothing. The new module-level names are constants: `RECENT_ROUTINE_RUN_LIMIT = 20` (routine.service.ts:6), `TALK_ENVIRONMENT = 'build'` (talk-to-talos.hook.ts:10). | PASS |
| E04 | Concurrent proof | Key-held rules | E02 found no rule held by a key, so no concurrent test is owed. | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B06: VOCABULARY.md:180 says the link opens the session « in the build environment », which is false from the iOS home-screen app, where it carries no `environment`.
- D05: no test pins that the tab bar and `/talk` give the iOS home-screen app the `claude://` link without `environment`; passing `'web'` at talk-to-talos.hook.ts:22 would ship green.
- D07: no test pins that `/talk` actually calls `location.replace`; deleting `ref={followLinkOnAttach}` at TalkRedirect.tsx:23 would ship green.
- D15: no site test renders the `/runs` empty state; deleting the `EmptyState` at RoutineRunBoard.tsx:29 would ship green.
- D20: the manifest test's schema strips `short_name`, so `"short_name": "Parler"` is not pinned.

## Notes

- A00 is UNVERIFIABLE because the plan does not exist, so plan conformance cannot be checked. No other row depends on it. Copy this row into the PR description.
- The owner gave `https://claude.ai/code?repositories=hugoleborso/talos&environment=<id>`. The branch builds `https://claude.ai/code/new?repo=hugoleborso%2Ftalos&environment=<id>&q=…` on the web and `claude://code/new?repo=…&q=…` from the iOS home-screen app, as spec Behaviour 2 decides. The knowledge entry records that the Claude app opens `claude.ai/code?…` with an empty composer and drops any link that carries `environment` (tested on a phone 2026-10-24). So reusing `buildClaudeCodeAddress` is correct against the spec. The spec's Goal still says « in the « Talos build » environment », and on the iOS home-screen app the session starts in the app's default environment instead. Does the owner accept that, given that it is the device he taps from?
- The same knowledge entry says an `https://` link carrying `environment`, tapped in Safari on a phone with the app installed, lands on the session list. `detectClaudeCodeOpener` reads only `navigator.standalone`, so Android's home-screen app and Safari on iPhone both get the `https://` link with `environment`. Has the `/talk` shortcut been tried on Android, where the manifest shortcut actually appears?
- If `GET /api/messages/claude-code` fails, `link.href` stays `undefined`. `/talk` then shows the spinner with no message and no retry (TalkRedirect.tsx:17-20), and the tab-bar link stays dimmed with no `href`. The spec says nothing about this case. Should `/talk` show the `QueryState` retry the way `RoutineRunBoard.tsx:26` does?
- `docs/standards/blueprint-subjects.json` still lists `MessageComposer.tsx`, `MessageComposer.test.tsx`, `message-composer.core.ts` and `MessagePage.tsx` (lines 4972-5291), all deleted by this branch. The blueprint check passes (B15). Would `blueprint-indexing.ts --accept` drop them?
- No test reads the icon files (D16). A later export back to a 256-colour palette or with transparency would pass CI. The spec does not ask for a gate.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
