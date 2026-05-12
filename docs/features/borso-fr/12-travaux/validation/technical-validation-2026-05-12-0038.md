# Technical validation — Les douze travaux

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/implement-design-file-U1rFg`
- Base: `origin/main`
- Run at: 2026-05-12T00:38Z
- Touched workspaces: `@borso-app/borso-fr`

> Note. The spec's *Test strategy* routes the bulk of behavioural assertions (page render, masthead link, year switcher non-current branch, filmstrip click, status/proof DOM, responsive breakpoints, homepage nav link) to `/visual-validation`. Those rows are out of scope for this report. The technical validation covers (a) the four clock-sensitive assertions the spec explicitly excludes from `/visual-validation` and routes here, (b) the pure-utils unit tests, (c) lint / typecheck / build / coverage gates, (d) correctness of each Q.O.D. row against the diff.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. "What's the audience" / Files-to-change `data.ts` | AI-fabricated v0 notes/proofs replaced with real Hugo content via `data-input.md` | apps/borso-fr/site/12-travaux/data-2025.ts:14-17, data-2026.ts:25-39 | `note: "Un blocage de dos au milieu du mois m'a coupé la série …"` (2025/Jan) and `note: '3 semaines sur 4. Sacrés changements de vie …'` (2026/Feb) — real first-person content, none of the v0 fabricated strings remain | PASS |
| A02 | Plan self-check "grep for v0 fabricated strings returns nothing" | `Compté la marche`, `m'étais menti`, `montage-journee` absent | apps/borso-fr/site/12-travaux/data-2025.ts + data-2026.ts | `grep -E "Compté la marche\|m'étais menti\|montage-journee" data-2025.ts data-2026.ts` → no matches | PASS |
| A03 | Q.O.D. "core interaction = filmstrip + drill-in" | Five visible blocks in order: masthead, title, hero, featured month, filmstrip, footer | apps/borso-fr/site/12-travaux/App.tsx:57, 111, 165, 301, 304, 350 | Comment markers `{/* Masthead */}`, `{/* Title — Les 12 travaux */}`, `{/* Hero — year */}`, `{/* Featured month */}`, `{/* Filmstrip */}`, `{/* Footer rule */}` in the expected order | PASS |
| A04 | Q.O.D. "Tech-lead = real `new Date()`; validator skips clock" | Page reads real `new Date()` for today, no env-var / URL param / hard-coded date | apps/borso-fr/site/12-travaux/App.tsx:20, 25, 29, 89 | `const FALLBACK_YEAR = new Date().getFullYear();` (line 20); `pickDefaultMonth(DEFAULT_YEAR, new Date())` (lines 25, 89); `const now = new Date()` (line 29) | PASS |
| A05 | Q.O.D. "year-switch behaviour: `pickDefaultMonth(year)`" | Switching to current year picks current month; switching to other year picks month 1 | apps/borso-fr/site/12-travaux/data.utils.ts:115-118 | `if (year === today.getFullYear()) return today.getMonth() + 1; return 1;` | PASS |
| A06 | Edge: "today falls inside a year not present in `data.ts` → latest available year selected" | Fallback year is the highest present year; FALLBACK_YEAR only used if list is empty | apps/borso-fr/site/12-travaux/data.utils.ts:120-122, App.tsx:17-21 | `return availableYears[availableYears.length - 1] ?? fallbackYear;` with `ALL_YEARS = Object.keys(DATA.years).map(Number).sort((a, b) => a - b)` | PASS |
| A07 | Edge: "current-month dot does not appear when today's year not in data" | Saffron dot only renders when `year === todayYear` | apps/borso-fr/site/12-travaux/App.tsx:342 | `isCurrent={year === todayYear && month.m === todayMonth}` | PASS |
| A08 | Error: "non-existent month → falls back to `months[0]`; if empty throws" | `selectFeaturedMonth` uses `?? year.months[0]` and throws if no months | apps/borso-fr/site/12-travaux/data.utils.ts:130-134 | `const featured = year.months.find((month) => month.m === monthNumber) ?? year.months[0]; if (!featured) throw new Error('Year has no months');` | PASS |
| A09 | Q.O.D. "drop `+ ajouter une preuve` button" | Button is not in the codebase | apps/borso-fr/site/12-travaux/ (full grep) | `grep -r 'ajouter une preuve' apps/borso-fr/site/12-travaux/` → no matches | PASS |
| A10 | Q.O.D. "drop `chronique mensuelle · n° X` and `Reprise de la mesure le 1er …`" | Strings absent | apps/borso-fr/site/12-travaux/ (full grep) | `grep -r 'chronique mensuelle\|Reprise de la mesure' apps/borso-fr/site/12-travaux/` → no matches | PASS |
| A11 | Q.O.D. "Keep placeholders for image slots; real photos via `proofs`" | `ImageSlot` is a striped placeholder; photo proofs render via `<img>` in `ProofMedia`; month `cover` field (extension) renders an `<img>` if provided, otherwise `ImageSlot` | apps/borso-fr/site/12-travaux/components.tsx:56-94, featured-month.tsx:10-41, 183-193 | `<ImageSlot label={month.name} height={420} />` as fallback when `!month.cover`; `<img src={proof.v} … />` in `ProofMedia` | PASS |
| A12 | Files-to-change `apps/borso-fr/site/index.html` "KEEP (nav link already points to /12-travaux/)" | Homepage nav link is `12-travaux/`, not the Rickroll URL | apps/borso-fr/site/index.html:27 (diff hunk) | `-<li><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">…` → `+<li><a href="12-travaux/">Les 12 travaux de Borso</a></li>` | PASS |
| A13 | Files-to-change `apps/borso-fr/vite.config.ts` "KEEP (entry already registered)" | Multi-page entry added | apps/borso-fr/vite.config.ts (diff hunk) | `+ douzeTravaux: fromHere('./site/12-travaux/index.html'),` | PASS |
| A14 | Files-to-change `knip.json` | Entry for `site/12-travaux/main.tsx` added | knip.json (diff hunk) | `+ "site/12-travaux/main.tsx",` and `"ignore": ["docs/**"]` | PASS |
| A15 | Q.O.D. "What status does an unspecified 2025 challenge default to? Real values" | All 2025 statuses are concrete (`done`/`partial`/`failed`/`abandoned`); none are still the v0 `all done` placeholder | apps/borso-fr/site/12-travaux/data-2025.ts (whole file) | Distinct statuses present across months (partial, done, failed, abandoned) — provisional `all done` overwritten | PASS |
| A16 | Spec "Featured month — striped image slot + per-challenge rows (numbered, status tag, kind label, optional note, optional proof chips)" | Featured panel renders exactly the listed elements; note is optional; proofs are optional | apps/borso-fr/site/12-travaux/featured-month.tsx:64-167 | `{position}.` numbered row, `<StatusTag>`, `{kindLabel(challenge.kind)}`, `{challenge.note && (…)}`, `{challenge.proofs && challenge.proofs.length > 0 && (…)}` | PASS |
| A17 | Spec "doing-status renders with filled saffron background tag; all other statuses bordered-only" | `StatusTag` paints saffron fill iff `status === 'doing'`, transparent bg otherwise | apps/borso-fr/site/12-travaux/components.tsx:29-53 | `const isLive = status === 'doing'; const bg = isLive ? ACCENT : 'transparent';` | PASS |
| A18 | Spec "Filmstrip — 12 cards; click → focus that month; active card inverts; current month carries a saffron dot" | `FilmstripCard` toggles bg/colour on `active`, renders accent dot when `isCurrent` | apps/borso-fr/site/12-travaux/filmstrip-card.tsx:33-35, 72-81 | `background: active ? INK : 'transparent', color: active ? PAPER : INK` and `{isCurrent && (<span … background: ACCENT … />)}` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | grep-style read across changed `.tsx`/`.ts` | Identifiers in App.tsx use `candidateYear`, `todayMonth`, `todayYear`, `score`, `featured`, `dailyCount`, `oneshotCount`, `remainingCount`. Comparator `(a, b) => a - b` (sort comparator — accepted). `(_, status)` underscore for unused param. Schema fields `m`, `t`, `v` are spec-defined data abbreviations documented in `data.ts:1-30` (intentional API surface; not local names). | PASS |
| B02 | Magic numbers / strings extracted | inspect changed code | Palette in `theme.ts` (ACCENT, INK, PAPER, MUTED, RULE, STRIPE_*, NOTE_INK, …); `DONE_WEIGHT`/`PARTIAL_WEIGHT` in `data.utils.ts:3-4`; `ACTIVE_INNER_BORDER` in `filmstrip-card.tsx:6`; responsive breakpoints in `styles.css:52, 61`; hero font sizes in `styles.css:20-30`. Inline-style numerics (padding, gap, font-size) on one-off elements are reasonable per repo precedent in `art/mondrian/`. | PASS |
| B03 | Comments document the WHY only | inspect changed code | Only comments are: `data.ts:1-31` (schema documentation block — explains abbreviated `t`/`v` field names; meets the "non-obvious" bar called out in CLAUDE.md), JSX section markers `{/* Masthead */}` etc. in App.tsx (navigational, not what-comments), and `<track kind="captions" />` for `<video>` accessibility. No what-comments anywhere. | PASS |
| B04 | Function names describe the result | sample 5+ from diff | `monthScore`, `yearScore`, `formatScore`, `statusLabel`, `kindLabel`, `proofIcon`, `pickDefaultMonth`, `pickDefaultYear`, `selectYearData`, `selectFeaturedMonth`, `countChallenges`, `filmstripBarColor`, `roleColor`, `proofKey`. All describe the produced value. | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -nE 'as [A-Z][A-Za-z]+\b'` on changed files | No matches. All assertions are `as const` (with `satisfies Record<…, …>` for branded shapes — `data.utils.ts:39, 54, 64, 75, 80, 96` and `components.tsx:23`). No `as Foo`, no `as unknown as Foo`. | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | No matches in `12-travaux/*.{ts,tsx}`. | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | inspect array accesses in changed code | `data.utils.ts:121` uses `?? fallbackYear` after `availableYears[availableYears.length - 1]`; `data.utils.ts:131` uses `?? year.months[0]` then a fallback throw guard. No raw indexed access in components (they iterate via `.map`). | PASS |
| B08 | Biome lint clean | `pnpm exec biome check apps/borso-fr/site/12-travaux/ apps/borso-fr/site/index.html apps/borso-fr/vite.config.ts knip.json` | `Checked 16 files in 1104ms. No fixes applied.` (exit 0) | PASS |
| B09 | Knip clean | `pnpm exec knip` | exit 0, no output | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\(' apps/borso-fr/site/12-travaux/*.{ts,tsx}` | No matches. App uses only `useState` + derived values computed during render. | PASS |
| B11 | Pure-helper rule: utilities in `*.utils.ts` and 100 % covered | `data.utils.ts` exists; `data.utils.test.ts` exists; coverage report | `apps/borso-fr/site/12-travaux/data.utils.ts` paired with `data.utils.test.ts`; coverage report shows `100/100/100/100` on `12-travaux/data.utils.ts`. No other utility files are introduced by this diff. | PASS |
| B12 | Plan-asserted file-size cap (no `App.tsx` over rule threshold) | `wc -l` on changed `.tsx` | `App.tsx` 367, `featured-month.tsx` 276, `filmstrip-card.tsx` 133, `components.tsx` 132 — all comfortably under any reasonable lines-per-file threshold; Biome's `noExcessiveLinesPerFile` is satisfied (lint passes). | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr typecheck` | 0 | PASS |
| C02 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr test:coverage` — 111 tests across 6 files; coverage `100/100/100/100` on every `*.utils.ts` in the workspace (including `12-travaux/data.utils.ts`) | 0 | PASS |
| C03 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr build` — vite multi-page build emits `dist/12-travaux/index.html` + `dist/assets/douzeTravaux-*.{js,css}` | 0 | PASS |
| C04 | repo-wide | `pnpm exec knip` | 0 | PASS |
| C05 | Utilities-with-sibling-test gate | every `*.utils.ts` paired with `*.utils.test.ts` in the touched workspace | `data.utils.ts` ↔ `data.utils.test.ts` present; no orphan `*.utils.ts` in the diff. | PASS |

## D. Test coverage of spec

> Per the spec's *Test strategy*, the following use cases are routed to `/visual-validation` and are **out of scope for this report**: Happy 1 (homepage nav href), Happy 4 (year switch non-current → reset to Jan), Happy 5 (click filmstrip card → invert + featured re-renders), Happy 7 (masthead returns home); Edge: challenge-without-note renders no `«` quote; Edge: challenge-without-proofs renders no chip container; Edge: `doing` saffron fill vs others bordered-only; Edge: ≤760px filmstrip overflow; Edge: ≤900px hero-year/title font drop. Clock-sensitive assertions (Happy 2, 3, 6; the current-month dot) are explicitly skipped by `/visual-validation` and verified here via code review (rows A04–A07).

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Score weighting: `done` counts 1, `partial` counts 0.5 (foundation for hero score, filmstrip score, featured-panel score) | `describe('monthScore') it('counts done as 1 and partial as 0.5')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:27-29 | PASS |
| D02 | Edge: month with zero challenges → `0/0` | `describe('monthScore') it('returns zero total for an empty month')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:39-41 | PASS |
| D03 | Year score sums across months | `describe('yearScore') it('sums month scores')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:44-52 | PASS |
| D04 | Integer scores render without decimals; fractional with `.5` | `describe('formatScore')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:55-63 | PASS |
| D05 | Each `ChallengeStatus` maps to its French label | `describe('statusLabel') it.each(…)` at apps/borso-fr/site/12-travaux/data.utils.test.ts:65-76 | PASS |
| D06 | Each `ChallengeStatus` maps to its colour role | `describe('statusColorRole') it.each(…)` at apps/borso-fr/site/12-travaux/data.utils.test.ts:78-89 | PASS |
| D07 | Each `ChallengeKind` maps to its French label | `describe('kindLabel') it.each(…)` at apps/borso-fr/site/12-travaux/data.utils.test.ts:91-99 | PASS |
| D08 | Filmstrip bar colour: fixed palette for `done`/`partial`/`failed`/`doing` | `describe('filmstripBarColor') it('uses fixed colors for …')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:102-107 | PASS |
| D09 | Filmstrip bar colour: `abandoned`/`todo` darken on `active` | `describe('filmstripBarColor') it('darkens abandoned and todo …')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:109-114 | PASS |
| D10 | Each `ProofType` maps to its glyph | `describe('proofIcon') it.each(…)` at apps/borso-fr/site/12-travaux/data.utils.test.ts:117-127 | PASS |
| D11 | `countChallenges` predicate covers kind, status, and zero-match cases (powers hero mini-stats) | `describe('countChallenges') it('counts challenges matching a predicate')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:129-142 | PASS |
| D12 | Clock-sensitive (Happy 2/3/6): `pickDefaultMonth` returns today's month when year === current; else 1 | `describe('pickDefaultMonth')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:145-153 | PASS |
| D13 | Edge: today's year not in `data.ts` → latest available year selected | `describe('pickDefaultYear') it('returns the last available year')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:156-158 | PASS |
| D14 | Edge: empty year list → fallback year (defensive — current year used) | `describe('pickDefaultYear') it('returns the fallback when the available years list is empty')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:160-162 | PASS |
| D15 | Error: requested year missing from `data.ts` → throws (not a silent render) | `describe('selectYearData') it('throws when the year entry is missing')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:177-179 | PASS |
| D16 | Error: non-existent month number → falls back to `months[0]` | `describe('selectFeaturedMonth') it("falls back to the first month when the requested number isn't present")` at apps/borso-fr/site/12-travaux/data.utils.test.ts:196-198 | PASS |
| D17 | Error: year with empty `months` → throws at render | `describe('selectFeaturedMonth') it('throws when the year has no months')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:200-204 | PASS |
| D18 | `selectYearData` happy path (powers the hero) | `describe('selectYearData') it('returns the year entry when present')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:173-175 | PASS |
| D19 | `selectFeaturedMonth` happy path (matches by `m`) | `describe('selectFeaturedMonth') it('returns the month matching the requested number')` at apps/borso-fr/site/12-travaux/data.utils.test.ts:192-194 | PASS |

## Notes

> No FAIL or UNVERIFIABLE rows. All categories pass.

- The spec's *Test strategy* explicitly partitions the surface: clock-sensitive behaviours + pure utilities go to `/technical-validation`; the visible DOM behaviour goes to `/visual-validation`. This report covers the former only, with one paragraph at the top of category D listing what's routed elsewhere.
- The diff introduces a `cover?: string` field on `Month` (data-2026.ts uses it for April's `avril-2026-carte.jpg`). This is a small extension of the spec's domain model — within the spirit of "real photos arrive through the `proofs` schema" (Q.O.D. on placeholders) since `cover` is the featured-panel hero swap. `FeaturedMonth` renders `ImageSlot` when no `cover` is set, preserving the placeholder behaviour for months without artwork. Not a defect; flagged here for visibility.
- 2025 data is fully populated with concrete statuses (mix of done / partial / failed / abandoned). The plan's risk row about "AI-fabricated 2025 statuses ship to prod" is closed.

## Verdict: PASS
