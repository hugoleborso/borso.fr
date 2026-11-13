# Technical validation — Setlists get their own tab, and a take goes up to 200 MiB

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`docs/features/pragma/setlists-tab-and-bigger-takes/plan/` does not exist)
- Branch: claude/brave-newton-rzu3qy
- Base: origin/main (`f7af31767a90d82ed65f6334f90730cb1b6b549e`)
- Run at: 2026-11-13T09:08:37Z
- Round: 1
- Reviewed: df671784d662d83b240d2133c40a1178b810ab1f
- Touched workspaces: @borso-app/pragma (api, domain, site)

The spec is in the short form (Perspectives, Why, Behaviour, Out of scope). Category A and D rows are built from its five *Behaviour* bullets, split where a bullet makes two claims, and the files come from the diff. No merge of `main` sits above the base (`git rev-list --merges origin/main..HEAD` prints nothing). The diff touches no database write path and no module-level state (category E). 1 use case routed to /visual-validation; out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Plan | plan absent; files taken from the diff | docs/features/pragma/setlists-tab-and-bigger-takes/ | `ls` prints `kaizen.md`, `spec` and `validation` only. No row below depends on a plan. | FAIL (non-blocking) |
| A02 | Behaviour 1 | Bar and sidebar list Home, Sessions, Setlists, Songs, Band, in that order | apps/pragma/site/src/components/organisms/navigation-active.core.ts:15-21 | `{ id: 'sessions', to: '/sessions', labelKey: 'nav.sessions', icon: 'sessions' },` / `{ id: 'setlists', to: '/setlists', labelKey: 'nav.setlists', icon: 'setlist' },` / `{ id: 'songs', to: '/catalog', labelKey: 'nav.songs', icon: 'song' },` | PASS |
| A03 | Behaviour 1 | Both the phone bar and the desktop sidebar read that one list | apps/pragma/site/src/components/organisms/AppShell.tsx:47, :76 | `{SHELL_TABS.map((tab) => (` / `{isNarrow ? <BottomTabBar tabs={SHELL_TABS} activeTab={activeTab} /> : null}`; BottomTabBar.tsx:17 lays the tabs out with `flex-1`, no fixed column count | PASS |
| A04 | Behaviour 2 | A path at or below `/setlists` lights Setlists | navigation-active.core.ts:26-28, :45-46 | `['sessions', ['/sessions']],` / `['setlists', ['/setlists']],` / `return pathname === destination \|\| pathname.startsWith(\`${destination}${PATH_SEPARATOR}\`);` | PASS |
| A05 | Behaviour 2 | `/sessions` and below light Sessions, and no longer `/setlists` | navigation-active.core.ts:27 | `['sessions', ['/sessions']],` (was `['sessions', ['/sessions', '/setlists']],`) | PASS |
| A06 | Behaviour 3 | Setlists page is titled "Setlists" | apps/pragma/site/src/routes/setlists/SetlistsPage.tsx:53; en.json:387; fr.json:387 | `<PageHeader title={t('nav.setlists')} />` / `"setlists": "Setlists",` | PASS |
| A07 | Behaviour 3 | Setlists page shows no Sessions/Setlists toggle | SetlistsPage.tsx:53; SessionsSectionTabs.tsx deleted | `<PageHeader title={t('nav.setlists')} />` has no children; `git diff --name-status` shows `D apps/pragma/site/src/components/molecules/SessionsSectionTabs.tsx`; `grep -rn SessionsSectionTabs apps/` finds nothing | PASS |
| A08 | Behaviour 3 | Sessions page shows no toggle | apps/pragma/site/src/routes/sessions/SessionsPage.tsx:97-105 | `title={t('sessions.title')}` … `>` then directly `<div className="mt-3 flex flex-wrap items-center gap-2">`; the `<SessionsSectionTabs value="sessions" />` line and its import are removed | PASS |
| A09 | Behaviour 4 | The form accepts up to exactly 200 MiB and refuses one byte more, naming 200 | apps/pragma/domain/take-upload.core.ts:39-40, :83; apps/pragma/site/src/components/organisms/take-upload-form.core.ts:72, :88-89 | `export const TAKE_MAX_MEBIBYTES = 200;` / `if (file.size > TAKE_MAX_BYTES) return { kind: 'too-large', maxMebibytes: TAKE_MAX_MEBIBYTES };` / `.refine((file) => file !== null && validateTakeFile(file).kind === 'ok'),` / `return { key: 'takes.fileErrors.tooLarge', maxMebibytes: verdict.maxMebibytes };` | PASS |
| A10 | Behaviour 4 | `POST /api/takes/sign` accepts up to exactly 200 MiB and answers 400 one byte over | apps/pragma/api/src/takes/takes.schema.ts:52 | `contentLength: z.number().int().positive().max(TAKE_MAX_BYTES),` (the assistant tool schema at :111 reads the same constant) | PASS |
| A11 | Perspectives, Tech-lead | The presign binds Content-Length, so S3 refuses a larger body | apps/pragma/api/src/uploads/uploads.adapter.ts:55 | `ContentLength: params.contentLength,` (unchanged by this branch) | PASS |
| A12 | Behaviour 5 | `nav.setlists` reads "Setlists" in English and French | apps/pragma/site/src/i18n/en.json:387; fr.json:387 | `"setlists": "Setlists",` in both catalogues, under `nav` | PASS |
| A13 | Perspectives, Designer | The toggle's keys go with the toggle | en.json, fr.json, i18n-parity.core.test.ts | `sessions.section.{label,sessions,setlists}` removed from both catalogues and from `IDENTICAL_BY_DESIGN`; `grep -rn "sessions\.section" apps/pragma` finds nothing | PASS |
| A14 | VOCABULARY | The Take entry states the new cap | apps/pragma/VOCABULARY.md:1489, :1505 | `The audio is one of the types in \`TAKE_CONTENT_TYPES\`, at most 200 MiB,` / `Held by: … › refuses a take one byte over 200 MiB` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the diff | New names: `TWO_HUNDRED_MEBIBYTES` (two test files), `'setlists'` tab id. None found. | PASS |
| B02 | Magic numbers named | read the diff | The cap is `TAKE_MAX_MEBIBYTES = 200` (take-upload.core.ts:39); every product file reads it | PASS |
| B03 | No prose comments | read the diff | No comment added | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | Only `expect.any(String)` (takes.controller.test.ts:285, :573, :579) and prose in test titles | PASS |
| B06 | `noUncheckedIndexedAccess` | read the diff | No index access added | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <10 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | No unused exports or files | `pnpm knip --workspace apps/pragma` | exit 0 (3 configuration hints, no finding) | PASS |
| B10 | `useEffect` smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B11 | Standards checklist (09-i18n): "a key's dotted path names the screen and the element" | SetlistsPage.tsx read in full | `<PageHeader title={t('nav.setlists')} />` at apps/pragma/site/src/routes/setlists/SetlistsPage.tsx:53 titles the Setlists screen with the navigation's key, while `setlist.title` ("Setlists", en.json:595, already read by SetlistEditorPage.tsx:104 and two other back labels) names this screen's title. Failing case: renaming the tab label `nav.setlists` to "Sets" to fit the bar also renames the page heading. Introduced: this branch; Fix size: one line (`t('setlist.title')`). | FAIL (non-blocking) |
| B12 | Standards checklist (01-naming): a VOCABULARY definition is still true, and a promise carries `Held by:` | VOCABULARY.md Take entry read | "at most 200 MiB" matches take-upload.core.ts:39; the renamed `Held by:` title matches takes.controller.test.ts:232 `it('refuses a take one byte over 200 MiB'` | PASS |
| B13 | Standards checklist (02-purity): a site limit does not restate an API limit under another name | take-upload-form.core.ts read | The form reads `validateTakeFile` from `@domain/take-upload.core` (:3), the same constant as takes.schema.ts:52 | PASS |
| B14 | Standards checklist (05-frontend): a route composes organisms and owns no layout primitive; no new subtitle or hint | SetlistsPage.tsx, SessionsPage.tsx read in full | The branch only removes an element from each; no new text | PASS |
| B15 | Standards checklist (10-testing): a test name states behaviour and condition | changed tests read | `'declares the five tabs in order'`, `'refuses a take one byte over 200 MiB'`, `'accepts a take of exactly 200 MiB'` | PASS |
| B16 | Standards checklist, remaining bullets (verb table, negated booleans, file names, derived types, Zod parsing, repositories, transactions, rate limits, effects, cva, disable reasons, pre-commit) | changed files read in full | No construct of these kinds is added or changed: no new file, function, boolean, type, schema, query, effect, variant set or disable comment | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed f7af31767a90d82ed65f6334f90730cb1b6b549e --coverage --reporter=verbose` | 0. 75 files, 518 tests passed, including `navigation-active.core.test.ts`, `take-upload.core.test.ts`, `take-upload-form.core.test.ts`, `takes.schema.test.ts`, `i18n-parity.core.test.ts`. Coverage of the gated changed files 100% statements, branches, functions, lines. | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed f7af31767a90d82ed65f6334f90730cb1b6b549e --reporter=verbose` | 0. 48 files, 453 tests passed, including `takes.controller.test.ts › signing an upload › refuses a take one byte over 200 MiB` | PASS |
| C03 | @borso-app/pragma (mutation) | `scripts/mutate-changed.sh f7af3176… <changed core files and tests>` | 0. `take-upload.core.ts` 37 killed, `navigation-active.core.ts` 18, `take-upload-form.core.ts` 84, `i18n-parity.core.ts` 43; 0 survived, 0 no coverage | PASS |
| C04 | @borso-app/pragma (`*.utils.ts`) | every `git ls-files 'apps/pragma/*.utils.ts'` checked for a sibling `.utils.test.ts` | 60 files, none missing; the branch changes no `.utils.ts` | PASS |

`pnpm-lock.yaml` and the catalog are unchanged, so no full core run was needed.

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 1: the tabs are Home, Sessions, Setlists, Songs, Band, in that order | `it('declares the five tabs in order'` at apps/pragma/site/src/components/organisms/navigation-active.core.test.ts:38; assertion :39-45 `expect(SHELL_TABS.map((tab) => tab.to)).toEqual(['/', '/sessions', '/setlists', '/catalog', '/band'])`. Both surfaces read `SHELL_TABS` (AppShell.tsx:47, :76). | PASS |
| D02 | Behaviour 1: the bottom bar shows on a phone and the sidebar on desktop | routed to /visual-validation (which surface shows depends on the `isNarrow` media query in a running browser) | routed to /visual-validation |
| D03 | Behaviour 2: any path at or below `/setlists` lights Setlists | `it.each(…)('lights the tab holding %s up'` at navigation-active.core.test.ts:11, rows :14 `['/setlists', 'setlists']` and :15 `['/setlists/3/vote', 'setlists']`; assertion :27 `expect(selectActiveTab(pathname)).toBe(tabId);` | PASS |
| D04 | Behaviour 2: `/sessions` and below light Sessions | same test, rows :12 `['/sessions', 'sessions']` and :13 `['/sessions/7', 'sessions']`; assertion :27 | PASS |
| D05 | Behaviour 3: the Setlists page is titled "Setlists" | (none found). `apps/pragma/site/src/routes/setlists/` holds no `SetlistsPage.test.tsx`, and `grep -rn "SetlistsPage" apps/pragma --include=*.test.*` finds nothing. Failing case: put back `<PageHeader title={t('sessions.title')}>` at SetlistsPage.tsx:53, the line this branch replaced. Every test stays green, and the screen under the Setlists tab reads "Sessions". | FAIL (blocking) |
| D06 | Behaviour 3: the Setlists page shows no Sessions/Setlists toggle | structural: the component is deleted (`D apps/pragma/site/src/components/molecules/SessionsSectionTabs.tsx`) and SetlistsPage.tsx:53 is `<PageHeader title={t('nav.setlists')} />` with no children, so no page can render it | PASS |
| D07 | Behaviour 3: the Sessions page shows no toggle | structural: same deleted component; SessionsPage.tsx:97-120 renders only `SegmentedChoice` and `Chip` inside `PageHeader` | PASS |
| D08 | Behaviour 4: the form accepts a file of exactly 200 MiB | `it('accepts an audio file up to exactly 200 MiB and answers its normalized type'` at apps/pragma/domain/take-upload.core.test.ts:86; assertion :87 `expect(validateTakeFile({ type: 'audio/webm;codecs=opus', size: TAKE_MAX_BYTES })).toEqual({ kind: 'ok', …`; the size is pinned at :19 `expect(TAKE_MAX_BYTES).toBe(200 * ONE_MEBIBYTE);` | PASS |
| D09 | Behaviour 4: `POST /api/takes/sign` accepts exactly 200 MiB | `it('signs a PUT for the take key, bound to the declared length'` at apps/pragma/api/src/takes/takes.controller.test.ts:215, body `contentLength: TWO_HUNDRED_MEBIBYTES` (209_715_200, :30); assertion :224 `expect(response.status).toBe(200);`. Also `it('accepts a take of exactly 200 MiB'` at takes.schema.test.ts:46. | PASS |
| D10 | Behaviour 4: one byte more is refused before upload | `it('refuses a file one byte over 200 MiB and names the limit'` at take-upload.core.test.ts:93; assertion :94 `expect(validateTakeFile({ type: 'audio/mpeg', size: TAKE_MAX_BYTES + 1 })).toEqual({ kind: 'too-large', …`; the form refuses any verdict other than `ok` (take-upload-form.core.ts:72), and mutation killed all 84 mutants there (C03) | PASS |
| D11 | Behaviour 4: the refusal names "200" | `it('names the limit for a file over it'` at apps/pragma/site/src/components/organisms/take-upload-form.core.test.ts:108; assertion :109-112 `toEqual({ key: 'takes.fileErrors.tooLarge', maxMebibytes: 200 })`; en.json:825 `"This file is over {{maxMebibytes}} MiB."` | PASS |
| D12 | Behaviour 4: the API answers 400 one byte over | `it('refuses a take one byte over 200 MiB'` at takes.controller.test.ts:232, `contentLength: TWO_HUNDRED_MEBIBYTES + 1`; assertion :244 `expect(response.status).toBe(400);` | PASS |
| D13 | Behaviour 5: `nav.setlists` reads "Setlists" in English and French | structural: en.json:387 and fr.json:387 `"setlists": "Setlists",`. `it('leaves the shipped catalogs with only the entries identical by design'` at i18n-parity.core.test.ts:135 pins the two as identical (`nav.setlists` in `IDENTICAL_BY_DESIGN`, :67-70) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths | Check-then-write | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts' \| grep -cE "insert\(\|update\(\|delete\(\|onConflict\|transaction\("` prints `0`. The diff changes a Zod bound and site navigation only; no write path is added or touched. | PASS |
| E02 | Module-level state | Per-process state | `git diff origin/main...HEAD -- 'apps/*.ts' 'apps/*.tsx' \| grep -E "^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let "` prints nothing. The new module constants (`SHELL_TABS`, `DESTINATIONS_BY_TAB`) are immutable tables. | PASS |

## Blocking findings

- D05 — No test asserts that the Setlists page is titled "Setlists". Reverting SetlistsPage.tsx:53 to `t('sessions.title')` keeps every test green. One new `SetlistsPage.test.tsx` that renders the page and reads its heading would hold it, and could also assert that no tab list renders (D06).

## Non-blocking findings

- A01 — The plan is absent. No row depends on it.
- B11 — SetlistsPage.tsx:53 titles the screen with the navigation key `nav.setlists`, where `setlist.title` already names that screen's title. One-line fix.

## Notes

- A take's upload URL is signed for 5 minutes (`UPLOAD_URL_EXPIRES_MINUTES = 5`, apps/pragma/api/src/uploads/uploads.types.ts:16). The cap is now four times larger. Does S3 refuse a presigned PUT whose body is still streaming when the 5 minutes run out, or only one that starts after them? If it is the first, a 200 MiB WAV sent over a slow mobile link could fail on every attempt. This was not probed here. The spec's Tech-lead line covers S3's single-PUT size limit, not the expiry.
- `TasksPage.tsx:76` also titles its page with a `nav.*` key (`t('nav.tasks')`). That is the same pattern as B11, it predates this branch, and this round did not read it in full.

## Verdict: FAIL
