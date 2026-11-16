# Technical validation — Friction inventory of PR #367

- Spec: [`../inventory.md`](../inventory.md)
- Plan: none, a kaizen sweep has no plan
- Branch: claude/lessons-from-pr-367
- Base: a0c07e4963326326fd965b64f8ec1f538fe9bdbe
- Run at: 2026-11-16T13:04:54Z
- Round: 1
- Reviewed: 73ab3c609d3318b7c143dc2d5e279ca75bd9a03f
- Touched workspaces: @borso-app/pragma (api `__test` seed fixture), plus `.claude/agents/` and `docs/knowledge/`

Category A is built from the three `fixed:` decisions of the inventory (rows 01, 02, 03). The no-op and merge rows (04 to 09) claim no change, and the diff carries none for them. No merge commit sits above the base (`git rev-list --merges` printed nothing). HEAD still printed the recorded SHA after every run. 0 use cases routed to /visual-validation; out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 01 | The chart moves to `test-seed-charts.core.ts` | apps/pragma/api/src/__test/test-seed-charts.core.ts:1; apps/pragma/api/src/__test/test-seed-fixture.core.ts:4,84 | `export const SLOW_BURN_CHORD_CHART = \`{title: Slow Burn}`; `import { SLOW_BURN_CHORD_CHART } from './test-seed-charts.core';`; `chordChartText: SLOW_BURN_CHORD_CHART,` | PASS |
| A02 | Row 01 | The chart gains a comment directive | test-seed-charts.core.ts:3 | `{comment: Intro, guitar alone}`. The viewer draws it: `DIRECTIVE_PATTERN = /^\{[a-zA-Z_]+(?::\s*.+)?\}$/` (site/src/lib/chordpro.utils.ts:43) and `if (line.kind === 'directive')` renders an italic `<p>` (ChordChartViewer.tsx:86-94) | PASS |
| A03 | Row 01 | The chart gains a chord-only intro | test-seed-charts.core.ts:4 | `[Am] [F] [C] [G]`. The viewer branches on it: `if (!hasLyricText(line.tokens))` (ChordChartViewer.tsx:113) | PASS |
| A04 | Row 01 | The chart gains a tab block | test-seed-charts.core.ts:37-42 | `{start_of_tab}` … `{end_of_tab}`. The parser maps it: `['start_of_tab', 'tab']` (chordpro.utils.ts:138), and `if (isInsideTab && line.kind !== 'blank') return { kind: 'tab-line', … }` (chordpro.utils.ts:165) | PASS |
| A05 | Row 01 | The chart reaches the seeded database a validator opens | apps/pragma/api/src/__test/test-seed.core.ts:70; test-seed.service.ts:159 | `{ kind: 'chordpro', text: song.chordChartText, instrumentIds: [], label: null }`; `for (const seed of SEED_SONGS) {` | PASS |
| A06 | Row 01 | A test refuses a chart that lacks any of them | apps/pragma/api/src/__test/test-seed-charts.core.test.ts:9-15 | see D01 to D04 | PASS |
| A07 | Row 02 | `a-spec-bullet-that-leans-on-what-the-code-already-does` gains a section | docs/knowledge/a-spec-bullet-that-leans-on-what-the-code-already-does.md:70-75 | `## An assertion that compares with before` … `Name what the reader sees instead, such as "a comment directive shows in italics on its own line".` | PASS |
| A08 | Row 02 | It is printed when a `spec.md` is written | same file, front matter lines 3-5 | `triggers:` / `paths:` / `- 'docs/features/*/*/spec/spec.md'` (pre-existing trigger, unchanged by the diff) | PASS |
| A09 | Row 03 | The agent's sheet says to scroll and take viewport shots | .claude/agents/visual-validator.md:31 | `agent-browser screenshot <absolute-path>       # Save a PNG of the viewport; scroll and shoot again for more. --full repeats sticky bars mid-image` | PASS |
| A10 | Row 03 | `driving-previews-with-agent-browser-and-argent` says why | docs/knowledge/driving-previews-with-agent-browser-and-argent.md:117-120 | `**\`screenshot --full\` repeats sticky bars.** On a page with a sticky header or a fixed bottom bar, such as every Pragma screen, the full-page image draws them again in the middle of the content` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the three changed source files | `chartLines`, `CHORD_ONLY_LINE`, `line`; none found | PASS |
| B02 | Magic numbers / strings extracted | read | the chord-only regex is named `CHORD_ONLY_LINE` (test-seed-charts.core.test.ts:5); the directive literals are the assertion subjects | PASS |
| B03 | No prose comments | read | only `// @FollowsBlueprint test-pure-unit` (test-seed-charts.core.test.ts:7), a machine-read marker | PASS |
| B04 | Type assertions / no `any` | `grep -nP '\bany\b\|\bas (?!const\|unknown)\w'` on the changed files | none found (exit 1) | PASS |
| B05 | `noUncheckedIndexedAccess` | read | no indexed access in changed code | PASS |
| B06 | Lint clean | `pnpm exec oxlint --type-aware` on the three changed `.ts` files | exit 0, no output | PASS |
| B07 | Knip clean | `pnpm exec knip --workspace apps/pragma` | exit 0, configuration hints only, no unused export or file | PASS |
| B08 | `useEffect` is a smell | grep | no `.tsx` changed; none found | PASS |
| B09 | Standards checklist: "a test name states the behaviour and the condition" (10-testing) | read test-seed-charts.core.test.ts in full | `it('holds every kind of line the chart viewer draws, so a validator needs no hand-typed chart'` states the behaviour and its reason | PASS |
| B10 | Standards checklist: "a file name says what the file holds" (01-naming) and "the choice between `.core.ts` and `.utils.ts`" (02-purity) | read | `test-seed-charts.core.ts` holds the seeded charts, beside its siblings `test-seed-fixture.core.ts`, `test-seed-task-board.core.ts` and `test-seed-presences.core.ts`, which use the same suffix | PASS |
| B11 | Standards checklist, remaining `reviewer` bullets (VOCABULARY/INVARIANTS, verb table, negated booleans, derived types, Zod parsing, repositories, transactions, routes, labels, 375 px, styling, i18n, disable comments, pre-commit checks) | read | the diff changes no `VOCABULARY.md`, `INVARIANTS.md`, function, type, route, screen, i18n key, disable comment or hook; nothing in scope | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed a0c07e4963326326fd965b64f8ec1f538fe9bdbe --coverage --reporter=verbose` | 0; 7 files, 33 tests, including `test-seed-charts.core.test.ts` and `test-seed-fixture.core.test.ts`; coverage 100% on both changed `.core.ts` files | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed a0c07e4963326326fd965b64f8ec1f538fe9bdbe --reporter=verbose` | 0; 50 files, 490 tests, including the 10 tests of `test-seed.controller.test.ts` ("seeds a coherent fixture (instruments, members, songs, setlist)") | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh a0c07e4963326326fd965b64f8ec1f538fe9bdbe apps/pragma` | 0; `test-seed-charts.core.ts` and `test-seed-fixture.core.ts` yield 0 mutants (module-level constants under `ignoreStatic`), score n/a, "every changed gated file passed mutation" | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` enumeration | the diff touches no `*.utils.ts`; the new `.core.ts` has its sibling `test-seed-charts.core.test.ts`, picked up by the `core` project's `api/src/**/*.core.test.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 01: a seed chart without a comment directive is refused | `it('holds every kind of line the chart viewer draws, …')` at apps/pragma/api/src/__test/test-seed-charts.core.test.ts:9; fails on `expect(chartLines.some((line) => line.startsWith('{comment:'))).toBe(true);` (line 13) | PASS |
| D02 | Row 01: a seed chart without a chord-only line is refused | same test; fails on `expect(chartLines.some((line) => CHORD_ONLY_LINE.test(line))).toBe(true);` (line 14), with `CHORD_ONLY_LINE = /^(\[[^\]]+\]\s*)+$/` (line 5), which matches `[Am] [F] [C] [G]` and no lyric line | PASS |
| D03 | Row 01: a seed chart without a tab block is refused | same test; fails on `expect(chartLines).toContain('{start_of_tab}');` (line 12) | PASS |
| D04 | Row 01: the seeded song actually carries this chart | `it('opens every chart on the ChordPro title directive of that song')` and the other `the seeded charts` tests of test-seed-fixture.core.test.ts read `SEED_SONGS`; structural: `chordChartText: SLOW_BURN_CHORD_CHART,` at test-seed-fixture.core.ts:84 is the only source of the Slow Burn chart | PASS |
| D05 | Row 02: the new section prints when a spec is written | structural: the trigger `- 'docs/features/*/*/spec/spec.md'` at a-spec-bullet-that-leans-on-what-the-code-already-does.md:5 prints the whole entry, the new section included | PASS |
| D06 | Row 03: the sheet and the knowledge entry carry the advice | structural: documentation only, quoted in A09 and A10; no behaviour to test | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Whole diff | Check-then-write and per-process state | `git diff a0c07e4…HEAD` grepped for `insert(`, `update(`, `delete(`, `onConflict`, `transaction(` and new module-level `Map`/`Set`/`let`: no match (exit 1). The diff moves a string constant the existing seed already writes; no write path or state is added or changed | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- The mutation run produced no mutant for either changed gated file, because both hold only module-level constants. The chart's content is pinned by the five assertions of `test-seed-charts.core.test.ts` alone, as `docs/knowledge/a-file-of-constant-tables-passes-mutation-with-no-mutant.md` describes. Should the test also pin `{end_of_tab}`, since a chart with an unclosed tab would still pass and the parser would treat every later line as tab?
- Whether the seeded chart draws its comment, chord-only line and tab block correctly in a browser is a screen claim; this report checked only that the parser recognises each kind (A02 to A04).

## Verdict: PASS
