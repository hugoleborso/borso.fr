# Technical validation — Pragma first features (round 6, non-regression)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-erp-specification-k41Mg
- Base: a84b276 (round-5 baseline) → HEAD 5b9e43e
- Run at: 2026-05-20T10:00:59Z
- Touched workspaces: @borso-app/pragma (site/ only; api/ untouched in this range)

Scope reminder: this is the design-fidelity follow-up sweep. Round 5 cleared the
architectural baseline; this round confirms the 8 visual-blocker fixes (commits
`dd6c434…72a3d7f`) did not introduce architectural regressions, and that the two
new utility modules carry sibling tests at 100% coverage. Visual-fidelity
re-validation is handled by `/visual-validation` in parallel and is out of scope
for this report.

## A. Correctness vs spec (non-regression spot checks)

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | "useEffect is a smell" — dark mode is CSS-driven | Tailwind v4 dark-mode override lives outside `@theme` and targets `:root` | apps/pragma/site/src/styles/tokens.css:84-100 | `@media (prefers-color-scheme: dark) { :root { --color-bg: #16130f; ... } }` | PASS |
| A02 | Catalog chord-chart icon (Q.O.D. catalog visuals) | Regression fixed — API field is `chart`, extractor reads `chart.kind` | apps/pragma/site/src/routes/catalog/CatalogPage.tsx:197 | `chartKind: extractChartKind(song.chart ?? null)` | PASS |
| A03 | Sessions/Setlists/Bars nav badges (Q.O.D. shell layout) | One-shot fetch on mount, fail-silent, replaces React state once | apps/pragma/site/src/components/organisms/useNavBadges.ts:43-83 | `useEffect(() => { let cancelled = false; (async () => {...}); return () => { cancelled = true; }; }, []);` | PASS |
| A04 | Atomic-design plumbing | 8 atoms / 11 molecules / 7 organism components (+1 hook) — no flat `components/`, no `controllers/`/`services/` folders | apps/pragma/site/src/components/{atoms,molecules,organisms}/ | `ls` returns Avatar/Badge/Button/Card/Chip/Crumb/Icon/Input atoms; ChartKindIcon..StatusChip molecules; AppShell/CatalogGrid/ChordChartViewer/MasteryMatrix/RequireSession/SongCard + useNavBadges | PASS |
| A05 | Cross-level import direction | Zero atoms import from molecules; zero molecules import from organisms | grep -rn "from '.*molecules/' atoms/" → empty; "from '.*organisms/' molecules/" → empty | PASS |
| A06 | Per-domain triad on api/src/ untouched | `git diff a84b276..5b9e43e -- apps/pragma/api/` is empty | n/a | n/a (untouched) | PASS |
| A07 | Backend `chart` field shape unchanged | No back-end churn; rename is purely UI-side extraction | apps/pragma/site/src/routes/catalog/chart-kind.utils.ts:5-12 | `// the round-5 regression where the page read \`chordChart?.kind\`` | PASS |
| A08 | Session detail read-only by default (commit a555a4c) | Read-views split from edit-views into sibling files | apps/pragma/site/src/routes/sessions/{ConcertReadView,PracticeReadView}.tsx (new) | files present, imported by SessionDetailPage | PASS |
| A09 | Song detail split read/edit (commit 0a7168b) | Edit page is a dedicated route component | apps/pragma/site/src/routes/catalog/SongEditPage.tsx (new) | file present, route wired in App.tsx | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Biome lint clean | `pnpm exec biome lint` | `Checked 513 files in 1975ms. No fixes applied.` exit 0 | PASS |
| B02 | TypeScript clean | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B03 | Knip clean | `pnpm exec knip` | only configuration hint (`@borso/infra apps/pragma knip.json Remove from ignoreDependencies`) — no unused exports/files/deps | PASS |
| B04 | No banned type assertions | `grep -rnE "\bas [A-Z][A-Za-z]+\b" --exclude const/unknown/Promise<…/React./keyof` | empty | PASS |
| B05 | No `any` | covered by biome `noExplicitAny` in B01 | n/a | PASS |
| B06 | `useEffect` justified — new effects in this diff | useNavBadges.ts:46 — one-shot mount fetch with cancel guard (external system: API); AppShell.tsx:75/86 already PASS in round 5; SongEditPage.tsx:63 — autofocus/scroll on mount (UI ref); SetlistsPage.tsx:74 — one-shot fetch; SongDetailPage.tsx unchanged signature; ConcertReadView/PracticeReadView contain no useEffect (read-only) | All new effects synchronise with an external system (network fetch with cleanup, DOM ref) — none are derived-state watchers | PASS |
| B07 | Tailwind v4 dark-mode pattern correct | tokens.css | `@theme { /* light values */ }` then `@media (prefers-color-scheme: dark) { :root { ... } }` outside `@theme`; comment 70-83 explains the trap explicitly | PASS |
| B08 | Inline `style={{}}` only for dynamic/computed values | Existing usages: animation, fontSize from state, mastery color computation, drag-offset top — all dynamic; no static layout via inline style | PASS |
| B09 | i18n parity | en.json + fr.json both gained the same 5 keys (`nav.setlists`, `nav.openMenu`, `nav.closeMenu`, `setlist.indexSubtitle`, `setlist.indexEmpty`) | git diff: matching ±lines on both files | PASS |
| B10 | New utils named `*.utils.ts`, pure | chart-kind.utils.ts (29 LoC, no side effects), setlist-editor.utils.ts (65 LoC, no side effects) | both files have only pure exports | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma test:core` | 0 — 273/273 across 27 files | PASS |
| C02 | @borso-app/pragma (core + coverage) | `pnpm exec vitest run --project core --coverage` | 0 — `success:true`, `perFile: { statements/branches/functions/lines: 100 }` thresholds met for every `*.utils.ts` / `*.core.ts` | PASS |
| C03 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma test` | 0 — 51/51 across 9 files | PASS |
| C04 | @borso-app/pragma (build) | `pnpm --filter @borso-app/pragma build` | 0 — 144 modules transformed, dist emitted | PASS |
| C05 | Sibling tests for every `*.utils.ts` / `*.core.ts` | enumeration loop | every file has `<name>.test.ts` sibling; `DONE` with zero `MISSING TEST` lines | PASS |
| C06 | New utility — chart-kind.utils.ts coverage | included in C02 perFile gate | 5 test cases covering null/undefined, the three valid kinds, and the unknown-kind reject branch | PASS |
| C07 | New utility — setlist-editor.utils.ts coverage | included in C02 perFile gate | 11 test cases covering tonalityLabelFor (undef/null/equal/null-end/arrow), instrumentHarmonicMap, lineupOf (override/default/missing), compactLineup (null/empty drop) | PASS |

## D. Test coverage of spec

Round-6 changes are visual-fidelity fixes; the spec's behavioural assertions
were already mapped in round-5's report. The only new behavioural surface added
in this round is the two extracted utilities and the nav-badge hook, all
covered by C06/C07 above and by visual validation for the badge rendering. No
new behavioural assertions in the spec were introduced by the design fixes.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Catalog chart-kind extraction (regression case) | `extractChartKind > returns null for a missing chart (the regression case — API field is \`chart\`, not \`chordChart\`)` at apps/pragma/site/src/routes/catalog/chart-kind.utils.test.ts:5 | PASS |
| D02 | Setlist editor tonality label | `tonalityLabelFor` suite at apps/pragma/site/src/routes/setlists/setlist-editor.utils.test.ts:9 | PASS |
| D03 | Setlist editor lineup fallback | `lineupOf > falls back to the song default lineup when no override` at setlist-editor.utils.test.ts:88 | PASS |

## Notes

- Knip emitted one configuration hint about `@borso/infra` in `apps/pragma/knip.json` — not a defect, not a regression in this diff, and consistent with the round-5 baseline. Recording for the next kaizen sweep.
- RTK output interception swallowed the rendered coverage table; the per-file 100% threshold is asserted programmatically by Vitest's `perFile: true` workspace config, and exit 0 is the proof that every gated file met it.
- Inline `style={{ ... }}` audit (B08): 10 occurrences across changed files, all dynamic — keyframe animation, font-size derived from state, drag-offset top, mastery colour from computed prop, swatch backgrounds from member palette. No static layout-via-inline-style smell.

## Verdict: PASS
