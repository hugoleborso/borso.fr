# Technical validation — Concert sign-up page (use case 14, installed app on `/`)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent
- Branch: claude/pwa-opens-erp
- Base: 143937e8265315a54726a36f977a4a880f9d85b6
- Run at: 2026-11-26T21:45:10Z
- Round: 1
- Reviewed: eb718f5eece599cde4a95e97a62b082946c8bc73
- Touched workspaces: @borso-app/pragma (site only)

The change under review is the last two sentences of use case 14. HEAD is a merge of `origin/main`, so the files come from `git log --first-parent --no-merges --name-only <base>..HEAD`: `ConcertsLandingPage.tsx`, `ConcertsLandingPage.test.tsx`, `concerts/INVARIANTS.md` and the spec. The spec is in a short form: *Use cases* and *Rules*, with no *Test strategy* section. Category D is built from the two claims of the amended sentence. 0 use cases routed to /visual-validation. A redirect is not motion or layout, so a component test can assert it. HEAD did not move during the review.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/concert-sign-up/` holds `spec/`, `validation/`, `kaizen.md` and no `plan/` | UNVERIFIABLE (non-blocking) |
| A01 | UC14 | "The installed app that opens on `/` ... goes straight to `/app`" | apps/pragma/site/src/routes/concerts/ConcertsLandingPage.tsx:44-45 | `const isInstalledApp = readInstallContext().isStandalone;` / `if (isInstalledApp) return <Navigate to={DEFAULT_POST_LOGIN_PATH} replace />;` | PASS |
| A02 | UC14 | The redirect target is `/app`, the ERP home | apps/pragma/site/src/routes/login.core.ts:6; App.tsx:44,54 | `export const DEFAULT_POST_LOGIN_PATH = '/app';` and `<Route path="/app" element={<HomePage />} />` | PASS |
| A03 | UC14 | "Installed" covers the app installed before the move, on both Android/desktop and iOS | apps/pragma/site/src/lib/display-mode.adapter.ts:35 | `isStandalone: environment.isHomeScreenApp \|\| environment.matchesStandaloneDisplay,` reads `navigator.standalone` (iOS) and `(display-mode: standalone)`. The manifest has had `"display": "standalone"` since 0fafc5782 (2026-05-19), so every past install runs standalone | PASS |
| A04 | UC14 | "A browser tab on `/` keeps the concert page" | ConcertsLandingPage.tsx:45-56 | Only a standalone context returns `<Navigate>`. Otherwise the page renders `<main ...>` with `<NextConcert />` as before | PASS |
| A05 | UC14 | The redirect replaces the history entry, so Back does not bounce the installed app back to `/` | ConcertsLandingPage.tsx:45 | `<Navigate ... replace />` | PASS |
| A06 | INVARIANTS.md | The new invariant is true of the code | apps/pragma/site/src/routes/concerts/INVARIANTS.md:17-18 | "The installed app never shows this page. Opened on `/` in standalone display (`readInstallContext`), it redirects to `/app`, the ERP home." This matches A01 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read both changed files | `isInstalledApp`, `renderInstalledAppAtHome`, `query`. None found | PASS |
| B02 | Magic strings extracted | read | The target is `DEFAULT_POST_LOGIN_PATH`, not a literal `'/app'`. The test's `'/app'` route path is a fixture | PASS |
| B03 | No prose comments (`borso/no-comments`) | read diff | No comment added | PASS |
| B04 | Type assertions only `as const` / `as unknown`. No `any` | `grep -nP '\bany\b\|\bas (?!const\|unknown)\w'` | The only hits are English words in test names (lines 107, 208, 235). No code assertion and no `any` | PASS |
| B05 | `noUncheckedIndexedAccess` | read | No index access added | PASS |
| B06 | Lint clean | `pnpm exec oxlint --type-aware <both changed .tsx>` | exit 0, no output | PASS |
| B07 | knip | `pnpm exec knip --workspace apps/pragma` | exit 0. One configuration hint about `.css`, unrelated | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | none found. The redirect is decided in render with `<Navigate>` | PASS |
| B09 | Hooks order | read ConcertsLandingPage.tsx:43-45 | `useTranslation()` runs before the early return, so every render calls the same hooks | PASS |
| B10 | Standards checklist 01-naming: "an invariant promising behaviour carries a `Held by:` line" | INVARIANTS.md read in full | `- The installed app never shows this page. Opened on \`/\` in standalone display (\`readInstallContext\`), it redirects to \`/app\`, the ERP home.` at apps/pragma/site/src/routes/concerts/INVARIANTS.md:17-18. The `Held by:` list at lines 56-81 names no test for it. The test that holds it exists: `ConcertsLandingPage.test.tsx` › "sends the installed app to the members area, where it opened before the ERP moved to /app". Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B11 | Standards checklist 01-naming: VOCABULARY/INVARIANTS still true | read in full | The pre-existing bullet "No link leads to the members' area" (line 16) still holds. A redirect in standalone display is not a link, and the browser-tab page is unchanged | PASS |
| B12 | Standards checklist 01-naming: comments, negated booleans, verb table, file names | read in full | No comment added. `isInstalledApp` is not negated. `renderInstalledAppAtHome` renders what its name says. No file added or renamed | PASS |
| B13 | Standards checklist 02-purity: a site rule restating an API rule | read | The redirect is a display-mode decision the API has no copy of | PASS |
| B14 | Standards checklist 05-frontend: a route composes organisms and owns no layout primitive | ConcertsLandingPage.tsx read in full | The addition is one `<Navigate>` early return. The layout markup is unchanged from base. File carries `// @FollowsBlueprint route-list-page` | PASS |
| B15 | Standards checklist 05-frontend: no new label that explains the interface | read | No visible text added. No i18n key added (09-i18n not engaged) | PASS |
| B16 | Standards checklist 10-testing: a test name states the behaviour and the condition | ConcertsLandingPage.test.tsx:348 | `it('sends the installed app to the members area, where it opened before the ERP moved to /app', ...)`. Behaviour (sends to the members area) and condition (installed app) are both named | PASS |
| B17 | Test isolation | ConcertsLandingPage.test.tsx:98,103 | `vi.stubGlobal('matchMedia', ...)` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`, so the `matches: true` override at line 349 cannot leak | PASS |
| B18 | Remaining reviewer bullets (03 typing, 04 backend, 06 data fetching, 07 effects, 08 styling, 11 database, 12 disable comments, 14 pre-commit budgets, 00 hotspots/temporal coupling) | read | Not engaged. No type, API, query, effect, style, schema, disable comment or hook added | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 143937e8265315a54726a36f977a4a880f9d85b6 --coverage --reporter=verbose` | 0. 3 files, 40 tests passed, including all 20 of `site/src/routes/concerts/ConcertsLandingPage.test.tsx` and `site/src/App.test.tsx`. Coverage reports 0/0 because no changed file is in the coverage include | PASS |
| C02 | @borso-app/pragma (e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed 143937e8265315a54726a36f977a4a880f9d85b6 --reporter=verbose` | 0. "No test files found". The branch changes no file under `api/`, so no e2e file is affected | PASS |
| C03 | Mutation | `scripts/mutate-changed.sh` | Not run. No `.core`, `.utils` or `.adapter` file or its test changed (`ConcertsLandingPage.tsx` is a route) | PASS |
| C04 | `*.utils.ts` coverage | first-parent file list | No `*.utils.ts` changed | PASS |
| C05 | Lockfile / catalog | `git diff <base>...HEAD -- pnpm-lock.yaml pnpm-workspace.yaml` | empty, so no full core run is required | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC14: the installed app opening on `/` goes straight to `/app` | `it('sends the installed app to the members area, where it opened before the ERP moved to /app')` at apps/pragma/site/src/routes/concerts/ConcertsLandingPage.test.tsx:348. Sets the condition with `vi.stubGlobal('matchMedia', (query) => ({ matches: true, media: query }))` (line 349), renders at `initialEntries={['/']}` with a `/app` route (lines 360-363). The assertions that fail without the redirect: `expect(await screen.findByText('members area')).toBeTruthy();` (line 351) and `expect(screen.queryByRole('button', { name: "I'll be there!" })).toBeNull();` (line 352) | PASS |
| D02 | UC14: the iOS home-screen flag alone also counts as installed | `it('reads either the iOS home screen flag or the standalone display mode as installed')` at apps/pragma/site/src/lib/display-mode.adapter.test.ts:49. Assertion: `expect(readInstallContext({ ...BROWSER_TAB_ON_LINUX, isHomeScreenApp: true }).isStandalone).toBe(true);` | PASS |
| D03 | UC14: a browser tab on `/` keeps the concert page | `beforeEach` stubs `matchMedia` to `matches: false` (ConcertsLandingPage.test.tsx:98). Under it, `it('shows only the next concert, its venue as a map search, its message and its prize, and no way to the members area')` at line 107 renders the concert page at `/`. An unconditional redirect would make its assertions on the ticket and the "I'll be there!" button fail, along with the 18 other tests of the file | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` on the first-parent file list is empty. The diff touches only a site route, its test and two documents. The `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` check found no module-level state added | PASS |

## Blocking findings

- none

## Non-blocking findings

- B10 — The new invariant at `concerts/INVARIANTS.md:17-18` has no `Held by:` line. Add `Held by: \`site/src/routes/concerts/ConcertsLandingPage.test.tsx\` › sends the installed app to the members area, where it opened before the ERP moved to /app`.

## Notes

- A00 is UNVERIFIABLE because there is no plan. The spec is short-form with no plan, and the files came from the diff. This does not block.
- Question: `display_override` lists `minimal-ui` as a fallback after `standalone`. A browser that installs the app but cannot do `standalone` would run it in `minimal-ui`, which `(display-mode: standalone)` does not match, so it would keep the concert page on `/`. No such browser was identified, so this is not a finding. Should `readInstallContext` also match `(display-mode: minimal-ui)`?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
