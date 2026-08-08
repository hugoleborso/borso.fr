# Technical validation — Les douze travaux

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/implement-design-file-U1rFg`
- Base: `origin/main`
- Run at: 2026-05-12T00:33:06Z
- Touched workspaces: `@borso-app/borso-fr` (only)

> 9 of the spec's use cases are routed to `/visual-validation` (happy path 1–5, 7, plus all edge-cases except the clock-dependent ones); out of scope for this report. The clock-sensitive flows (default featured month on initial load, year-switch-to-current-year, "year not present" fallback, current-month dot) and the "no months" / "month not found" error fallbacks remain in this report's category D — they're explicitly assigned to code review by the spec's Test-strategy section.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q "audience = friends / truthful content" | AI-fabricated v0 `note`/`proofs` replaced by real data from Hugo | `apps/borso-fr/site/12-travaux/data-2025.ts:1-15`, `data-2026.ts:1-15` | `Y2025: Year = { … months: [ { … challenges: [ { t: 'Sport tous les jours', kind: 'daily', status: 'partial', note: "Un blocage de dos…" }` — real content, no `montage-journee`/`m'étais menti` strings (grep returns nothing) | PASS |
| A02 | Q "core interaction = filmstrip + drill-in" | Filmstrip with 12 cards, click selects month | `App.tsx:336-347` | `<div className="twelve-travaux-filmstrip" …>{yearData.months.map((month) => (<FilmstripCard … active={selected === month.m} … onSelect={() => setSelected(month.m)} />))}</div>` | PASS |
| A03 | Q "today = `new Date()`" | No URL override, no build-time freeze, no hard-coded date | `App.tsx:12,16,28` | `const FALLBACK_YEAR = new Date().getFullYear();` / `function pickDefaultMonth(year: number) { const now = new Date(); …}` / `const now = new Date();` — grep for `process.env`, URL-search-params, hard-coded year string in this folder returns nothing | PASS |
| A04 | Q "year-switch = current-month-if-current-year, else month 1" | `pickDefaultMonth(year)` called on year click | `App.tsx:15-19,87-90` | `function pickDefaultMonth(year: number): number { const now = new Date(); if (year === now.getFullYear()) return now.getMonth() + 1; return 1; }` then `onClick={() => { setYear(y); setSelected(pickDefaultMonth(y)); }}` | PASS |
| A05 | Q "drop `+ ajouter une preuve`" | No add-proof button in featured month | `apps/borso-fr/site/12-travaux/featured-month.tsx` (entire file) | `grep "ajouter une preuve" apps/borso-fr/site/12-travaux/` returns nothing | PASS |
| A06 | Q "drop magazine chrome — chronique mensuelle / Reprise de la mesure" | No magazine-chrome strings | `apps/borso-fr/site/12-travaux/*` | `grep "chronique mensuelle\|Reprise de la mesure" apps/borso-fr/site/12-travaux/` returns nothing | PASS |
| A07 | Q "keep striped image placeholders" | `ImageSlot` is a striped CSS-gradient placeholder | `components.tsx:67-72` | `background: \`repeating-linear-gradient(135deg, ${base} 0 8px, ${alt} 8px 16px)\`` — but see notes B-Notes-1: the schema *also* grew an optional `cover?: string` on `Month` (`data.types.ts:15`) that switches to a real `<img>` when set (`featured-month.tsx:184-189`). Spec said "keep placeholders"; impl kept them *and* added a cover-photo escape hatch. Not in the spec; reads as additive, not contradictory. | PASS (with note in §Notes) |
| A08 | Files to change — `data.ts` UPDATE | Real statuses + notes/proofs merged from `data-input.md` | `data.ts:33-52` + `data-2025.ts` + `data-2026.ts` | `data.ts` now imports `Y2025`, `Y2026` from sibling year-files; content is real. Spec listed only `data.ts` as the update target, not three new sibling modules. Additive split, schema preserved. | PASS (with note in §Notes about the split) |
| A09 | Files to change — schema as in v0 | Domain model = `ChallengeStatus`/`ChallengeKind`/`ProofType`/`Proof`/`Challenge`/`Month`/`Year`/`Data` | `data.types.ts:1-17` | Types match spec lines 86-100 verbatim, **plus** `Month` gains `cover?: string` (line 15). The `cover` extension is documented in `data.ts:8-9` comment block and used in `featured-month.tsx:184-192`. | PASS (extension noted in §Notes) |
| A10 | Homepage nav points to `/12-travaux/` (not Rickroll) | `<a href="12-travaux/">` | `apps/borso-fr/site/index.html` line 30 (post-diff) | `<li><a href="12-travaux/">Les 12 travaux de Borso</a></li>` — grep for `dQw4w9WgXcQ` returns nothing | PASS |
| A11 | Vite entry registered | `douzeTravaux` rollup input | `apps/borso-fr/vite.config.ts` (diff +1) | `douzeTravaux: fromHere('./site/12-travaux/index.html')` | PASS |
| A12 | Knip entry registered | Entry list contains `site/12-travaux/main.tsx` | `knip.json` (diff +1) | `"site/12-travaux/main.tsx"` listed under `entry`; `"ignore": ["docs/**"]` also added | PASS |
| A13 | `data-input.md` NEW | Fill-in template exists | `docs/features/borso-fr/12-travaux/spec/data-input.md` | File present, 226 lines | PASS |
| A14 | Out-of-scope: no analytics SDK / events | No analytics/posthog/plausible/umami/gtag | `apps/borso-fr/site/12-travaux/*` | `grep -i 'analytics\|posthog\|plausible\|umami\|gtag'` returns nothing | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | grep on changed files | `App.tsx:34` `.find((m) => m.m === selected)` and `App.tsx:83-104` `ALL_YEARS.map((y) => …)` use single-letter locals across 6 lines. Plan §Code-quality self-check explicitly said `y` "has been renamed in v0 review — confirmed in current file; if not, rename in impl." → impl did not rename. CLAUDE.md *Clean code* bans 1-letter locals outside trivial scopes; a 22-line map closure is not a trivial scope. | FAIL |
| B02 | Magic numbers / strings extracted to named consts | Scan changed source | Palette in `theme.ts` (12 named exports); `DONE_WEIGHT`/`PARTIAL_WEIGHT` in `data.utils.ts:3-4`; `ACTIVE_INNER_BORDER` in `filmstrip-card.tsx:6`; responsive breakpoints in `styles.css`. Many inline magic font-sizes/paddings remain in `App.tsx`/`featured-month.tsx` (e.g. `fontSize: 72`, `padding: '8px 14px'`, `letterSpacing: '0.18em'`) — repo norm: inline style values for *one-shot* element styling are accepted when the value isn't reused; the *responsive* font sizes (148/220/108/96/72/140) are correctly hoisted to `styles.css`. Bar on this rule is "named when reused / when documenting a non-obvious choice" — current state is consistent with the rest of `apps/borso-fr/site/`. | PASS |
| B03 | Comments document the WHY only | scan diff for inline comments | `data.ts:1-31` is a single doc-block explaining the abbreviated field names (`t`, `v`) — non-obvious to a future reader, WHY-style. `filmstrip-card.tsx:6` defines `ACTIVE_INNER_BORDER` without a comment, fine. No what-comments observed. | PASS |
| B04 | Function names describe the result | Sample 5 names | `monthScore`, `yearScore`, `formatScore`, `statusLabel`, `kindLabel`, `proofIcon`, `pickDefaultMonth`, `countChallenges`, `roleColor`, `filmstripBarColor` — all result-shaped, none mechanism-shaped. | PASS |
| B05 | Type assertions restricted to `as const` / `as unknown` | grep `as [A-Z]` across changed files | Zero hits. Only assertions present are `as const satisfies Record<…, …>` (data.utils.ts: 5 occurrences; components.tsx: 1; filmstrip-card.tsx: 0) — allowed pattern. | PASS |
| B06 | No `any` | `grep -P '\bany\b'` on changed `.ts`/`.tsx` | Zero hits. | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | Audit array accesses in changed code | `App.tsx:13` `ALL_YEARS[ALL_YEARS.length - 1] ?? FALLBACK_YEAR` — guarded. `App.tsx:34` `yearData.months.find(...) ?? yearData.months[0]` — guarded. `App.tsx:35` `if (!featured) throw` — type-narrows. `App.tsx:25-26` `DATA.years[year]; if (!yearData) throw` — narrows. No bare `arr[i]` without fallback. | PASS |
| B08 | Biome lint clean | `pnpm exec biome lint apps/borso-fr/site/12-travaux/ apps/borso-fr/site/index.html apps/borso-fr/vite.config.ts knip.json` | "Checked 14 files in 1508ms. No fixes applied." + "Checked 2 files in 1326ms. No fixes applied." — both exit 0. | PASS |
| B09 | `useEffect` is a smell | grep on changed `.tsx` | Zero `useEffect` calls in the diff. State is set in event handlers (`onClick` in `App.tsx:87-90`), derived state computed during render. Aligns with the CLAUDE.md guidance. | PASS |
| B10 | `*.utils.ts` 100% coverage gate | `vitest --coverage` | `data.utils.ts`: 100/100/100/100. See §C. | PASS |
| B11 | No `!important` re-introduced | grep | Zero hits in `styles.css`. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr run test:coverage` | 0 (102 tests, 6 files, all `*.utils.ts` at 100% S/B/F/L) | PASS |
| C02 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr run typecheck` (tsc CDK + main) | 0 | PASS |
| C03 | @borso-app/borso-fr | `pnpm --filter @borso-app/borso-fr run build` (Vite multi-page) | 0; emits `dist/12-travaux/index.html` + `assets/douzeTravaux-*.{js,css}` | PASS |
| C04 | (repo) | `pnpm exec knip` | 0 (no orphans) | PASS |
| C05 | `*.utils.ts` paired with `*.utils.test.ts` (CLAUDE.md gate) | enumerate | `12-travaux/data.utils.ts` ↔ `12-travaux/data.utils.test.ts` (29 tests, 100% coverage). No other `*.utils.ts` added in the diff. | PASS |

## D. Test coverage of spec

> Visual-routed assertions (happy-path #1-5, #7; doing-status tag fill; missing-note; missing-proofs; `<=760px` filmstrip overflow; homepage href) are out of scope here — see preamble. The rows below are the spec's residual non-visual behaviours: pure-logic edge cases and clock-dependent flows the spec explicitly assigned to `/technical-validation`.

| # | Use case | Covering test / code location | Verdict |
|---|---|---|---|
| D01 | `monthScore`/`yearScore` arithmetic — done=1, partial=0.5, others=0 | `data.utils.test.ts:23-49` — `describe('monthScore')` ("counts done as 1 and partial as 0.5", "returns zero done when no challenges qualify", "returns zero total for an empty month") + `describe('yearScore')` ("sums month scores") | PASS |
| D02 | `formatScore` integer vs fractional rendering | `data.utils.test.ts:51-59` — `describe('formatScore')` ("renders integers without decimals", "renders fractional values with one decimal") | PASS |
| D03 | `statusLabel` covers all 6 statuses | `data.utils.test.ts:61-72` — `describe('statusLabel')` `it.each` over `done`/`partial`/`failed`/`abandoned`/`doing`/`todo` | PASS |
| D04 | `statusColorRole` mapping correctness (drives StatusTag/`doing` saffron) | `data.utils.test.ts:74-85` — `describe('statusColorRole')` `it.each` all 6 statuses | PASS |
| D05 | `kindLabel` covers daily/count/oneshot | `data.utils.test.ts:87-95` — `it.each` all 3 kinds | PASS |
| D06 | `filmstripBarColor` — fixed colours for done/partial/failed/doing | `data.utils.test.ts:98-103` — "uses fixed colors for done/partial/failed/doing" | PASS |
| D07 | `filmstripBarColor` — abandoned/todo depend on `active` (active-card invert) | `data.utils.test.ts:105-110` — "darkens abandoned and todo when the card is active" | PASS |
| D08 | `proofIcon` covers all 5 proof types | `data.utils.test.ts:113-123` — `it.each` over photo/video/link/note/stat | PASS |
| D09 | `countChallenges(predicate)` — drives `Quotidiens` / `Ponctuels` / `Restants` mini-stats | `data.utils.test.ts:125-138` — three predicates (`daily`/`done`/false) | PASS |
| D10 | "Edge: month with zero challenges → score `0/0`" (pure logic part) | `data.utils.test.ts:35-37` — `monthScore({ … challenges: [] })` returns `{ done: 0, total: 0 }`. (DOM-render side is /visual-validation's job per spec.) | PASS |
| D11 | "Edge: today falls in a year not in `data.ts` → latest year selected, no crash, no current-month dot" — clock-dependent, /technical-validation scope per spec | Code: `App.tsx:13` `const DEFAULT_YEAR = ALL_YEARS[ALL_YEARS.length - 1] ?? FALLBACK_YEAR;` (latest year via numeric sort `App.tsx:9-11`); `App.tsx:342` `isCurrent={year === todayYear && month.m === todayMonth}` — `isCurrent` only true when `today.year` is *the rendered year*, so when `today.year` is absent from `data.years`, `DEFAULT_YEAR` is set to the most recent present year and no card receives `isCurrent`. Latest-year invariant relies on numeric-asc sort + `[length-1]`. **No automated assertion** ties this together (no test mocks `new Date()` to a year outside `data.years` and asserts default year + no dot). | FAIL |
| D12 | "Default featured month = current-month-if-current-year-selected, else month 1" (clock-dependent, /technical-validation scope per spec) | Code: `App.tsx:15-19` `pickDefaultMonth` + `App.tsx:23` `useState(() => pickDefaultMonth(DEFAULT_YEAR))` + `App.tsx:87-90` re-applied on year-switch. **No unit test mocks `new Date()` and asserts the two branches** of `pickDefaultMonth` (current-year → today's month; other year → 1). Pure deterministic function once `new Date()` is faked; trivially Vitest-able with `vi.setSystemTime`. The spec explicitly hands this to /technical-validation and the implementation didn't write the test. | FAIL |
| D13 | "Error: non-existent month selected → fall back to `months[0]`; empty `months` → throw at render" | Code: `App.tsx:34-35` `const featured = yearData.months.find(...) ?? yearData.months[0]; if (!featured) throw new Error(\`Year ${year} has no months\`);` Behaviour is correct but **no test asserts** the fallback path or the throw. Pure logic, in principle testable, but lives inside a React component and `App` is not extracted into a testable selector. | FAIL |
| D14 | "Error: `DATA.years[year]` missing → throw" | Code: `App.tsx:25-26` `const yearData = DATA.years[year]; if (!yearData) throw new Error(\`No data for year ${year}\`);` Same pattern; no test. | FAIL |

## Notes

- **B01 (FAIL).** `App.tsx:83-104` declares `ALL_YEARS.map((y) => …)` and uses the 1-letter local `y` six times across a 22-line closure (key, onClick, two ternary comparisons, label render). `App.tsx:34` uses `.find((m) => m.m === selected)`. CLAUDE.md *Clean code* bans 1-letter locals "outside trivial scopes like `for (let i = 0; ...)`". The plan (§Code-quality self-check, last bullet) *named this risk by name* — "Variable `y` in App.tsx's year-switch button has been renamed in v0 review — confirmed in current file; if not, rename in impl." — and the implementation didn't follow through. Recommend renaming `y` → `candidateYear` (or `optionYear`) and `m` → `candidateMonth` (or `entry`).
- **A07 / A09 note.** `Month.cover?: string` was added to the schema (not in the spec's type block) and `featured-month.tsx:184-192` renders an `<img>` when present, else the `ImageSlot` placeholder. Two photo assets ship with the PR (`public/media/12-travaux/avril-2026-{carte,journal}.jpg`). This is additive — not contradictory with the spec's "keep placeholders" decision (placeholders remain the default; covers are an escape hatch the spec didn't anticipate). Worth a one-line bump to `spec.md` "Files to change" if the operator wants the spec to match what shipped.
- **A08 note.** Spec listed `data.ts` as the single UPDATE target; impl split into `data.ts` + `data.types.ts` + `data-2025.ts` + `data-2026.ts`. Reasonable refactor; the schema-types file extraction is exactly what `data.utils.ts` imports from. Worth updating the spec's Files-to-change block.
- **D11 / D12 / D13 / D14 (all FAIL).** The spec's Test-strategy section explicitly carved out the clock-sensitive flows and error-path fallbacks for /technical-validation code review *plus* leaves the door open for unit coverage (it says the gate is "100% on `*.utils.ts`" — which the impl meets — but the spec also enumerates these residual behaviours under "Edge cases" / "Error cases" and the standard requires a covering test per use case). The clock-dependent flows `pickDefaultMonth(year)` and the "latest-year fallback" are pure functions of `new Date()` + a sorted year list — both trivially testable with `vi.setSystemTime(new Date('2099-06-15'))` and a fixture. The render-time throws are harder to test without React Testing Library, which isn't currently in `apps/borso-fr`. Recommendation: extract `pickDefaultMonth` and a `pickDefaultYear(allYears, today)` helper into `data.utils.ts` and cover both with `vi.useFakeTimers`. The throw paths are acceptable to leave as code-reviewed-only, but the clock helpers aren't.

## Verdict: FAIL (5)

- 1 FAIL in §B (`B01` — single-letter `y`/`m` locals; named in the plan, ignored in impl).
- 4 FAIL in §D (`D11`-`D14` — clock-dependent + error-path use cases listed in the spec without covering tests; the spec routed these to /technical-validation as code-reviewed *and* expected the gate to catch missing coverage).

Recommendation to operator:
1. Rename `y` → `candidateYear` and `m` → `candidateMonth` in `App.tsx`.
2. Extract `pickDefaultMonth` (and a new `pickDefaultYear`) into `data.utils.ts`; add Vitest cases under `data.utils.test.ts` using `vi.useFakeTimers` + `vi.setSystemTime` to assert both branches of each.
3. Optionally update `spec.md` Files-to-change to reflect the actual file split (`data.types.ts`, `data-2025.ts`, `data-2026.ts`, the `cover?` schema field, and the two media assets) so future validators don't re-flag these as drift.
4. Re-run `/technical-validation`.
