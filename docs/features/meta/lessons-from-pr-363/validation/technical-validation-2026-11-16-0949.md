# Technical validation — Lessons from PR #363 (kaizen sweep)

- Spec: [`../inventory.md`](../inventory.md) (claims of rows 03, 09, 10, 13, 18, 19) and [`the-review-fix-that-deleted-the-copy-the-cache-read.md`](../../../../dantotsus/the-review-fix-that-deleted-the-copy-the-cache-read.md) for row 18
- Plan: none (kaizen sweep, no plan by design)
- Branch: claude/lessons-from-pr-363
- Base: d37a4bcba014324b2d4ac63b4bced9015fe76703
- Run at: 2026-11-16T09:58:59Z
- Round: 1
- Reviewed: a4240be0b6dcdd5a3a5e477e18dc3498b1ed50ef
- Touched workspaces: @borso-app/pragma (source), @borso-app/banana-rush, @borso-app/borso-fr, @borso-app/borsouvertures, @borso-app/last-loop-lepin, @borso-app/talos (one `vitest.config.ts` line each), `scripts/`, `.claude/`, `docs/`

HEAD did not move during the review (checked at start and end). No merge commit sits above the base. Tests ran in the working tree at the reviewed SHA. 0 claims routed to /visual-validation; no claim of this sweep is a browser-runtime behaviour.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Row 03 | "The script now checks every existing path it is given, and refuses the same stub with exit 1." | scripts/check-migration-sql-dsql-compat.sh:49-50 | `for candidate in "$@"; do` / `[ -f "$candidate" ] && printf '%s\0' "$candidate"`. Measured: a stub `ALTER TABLE "songs" ADD COLUMN "x" text NOT NULL DEFAULT 'a';` passed by absolute path exits 1 with two violations; the base script exits 0 on it; a no-argument run exits 0 on the tree. | PASS |
| A02 | Row 03 | Same claim, for a path given relative to the caller's directory. | scripts/check-migration-sql-dsql-compat.sh:34 | `cd "$(dirname "${BASH_SOURCE[0]}")/.."` runs before the `[ -f "$candidate" ]` test, so a relative path is resolved against the repository root. Failing case (measured): `cd <scratchpad>/tech-validator && /home/user/borso.fr/scripts/check-migration-sql-dsql-compat.sh stub.sql` with the same stub exits 0 and prints nothing, without reading the file. That is the row-03 friction itself ("exited 0 on a stub migration in a scratch folder without reading it"). A missing argument path is skipped silently rather than reported, so a typo also passes. | FAIL (blocking) |
| A03 | Row 09 | `technical-conception/standard.md` asks the planner to name every line a grep self-check still prints after the change. | .claude/skills/technical-conception/standard.md:41 | `Run a grep self-check on the base before you write it, and name every line it will still print after the change, such as a parameter that shares the name or a frozen column read.` | PASS |
| A04 | Row 10 | `skipFull: false` in each app's `vitest.config.ts`. | apps/{banana-rush,borso-fr,borsouvertures,last-loop-lepin,pragma,talos}/vitest.config.ts | `reporter: [['text', { skipFull: false }]],` in all six (`grep skipFull apps/*/vitest.config.ts` counts 6; `ls apps` lists 6). Measured: the pragma `--changed --coverage` run printed four per-file rows at 100% (`...harts.core.ts`, `songs.schema.ts`, `...label.core.ts`, `...cards.core.ts`). Vitest source confirms the cause: `if (isAgent) { // default to \`skipFull\` …` in vitest 4.1.12 `coverage.DM_a_rWm.js:300`. | PASS |
| A05 | Row 10 | knowledge `vitest-hides-full-coverage-rows-from-agents` keeps the line from being removed. | docs/knowledge/vitest-hides-full-coverage-rows-from-agents.md:3-6 | `triggers: paths: - 'apps/*/vitest.config.ts'` / `Do not remove that line to cut output`. Its claim that `infra/cdk` and `infra/shared` keep `['text', 'lcov', 'html']` matches infra/cdk/vitest.config.ts:16 and infra/shared/vitest.config.ts:16. | PASS |
| A06 | Row 13 | `technical-validator.md` says to run tests and probes in the working tree and delete the probe. | .claude/agents/technical-validator.md:150 | `Run tests and probes in the working tree, which holds that SHA while you work: a \`git archive\` export cannot run them, … Delete a probe file before you report.` No other `git archive` instruction remains under `.claude/` (grep). | PASS |
| A07 | Row 19 | Both documents agree that the validator runs `mutate-changed.sh`, and the agent's core command carries `--coverage`. | .claude/skills/technical-validation/standard.md:15,74,76; .claude/agents/technical-validator.md:105 | standard:15 `A changed gated file also runs \`scripts/mutate-changed.sh <base> <path>\``; standard:74 `The whole suites are CI's, and so is mutation of files the branch did not change.`; agent:105 `vitest run --project core --changed <base> --coverage --reporter=verbose`. `grep -rn "Mutation is CI"` over `.claude`, `docs/standards`, `CLAUDE.md` finds nothing. | PASS |
| A08 | Row 18 / dantotsu countermeasure | `normalizeChartLabel` in `domain/` trims and turns a blank label into `null`. | apps/pragma/domain/chart-label.core.ts:2-5 | `const trimmed = label?.trim() ?? '';` / `return trimmed.length === 0 ? null : trimmed;` | PASS |
| A09 | Row 18 | The API's `chordChartSchema` calls it, and `nullWhenEmpty` is gone. | apps/pragma/api/src/songs/songs.schema.ts:23,83-88 | `import { normalizeChartLabel } from '@domain/chart-label.core';` / `.nullable()` / `.transform(normalizeChartLabel),`. `grep -rn nullWhenEmpty apps/` finds nothing. | PASS |
| A10 | Row 18 | The site's `chartFromCard` calls it. | apps/pragma/site/src/routes/catalog/song-chart-cards.core.ts:3,68-72 | `const assignment = {` / `instrumentIds: [...card.instrumentIds],` / `label: normalizeChartLabel(card.label),` | PASS |
| A11 | Row 18 | Standard 02's `reviewer` bullet now names the remedy. | docs/standards/02-purity-and-core-files.md:293-295 | `The finding's fix moves the rule to \`domain/\`, never deletes the site's copy` | PASS |
| A12 | Row 04 (knowledge, not a fixed row) | The cache-buster knowledge prints when a pragma schema or core file is edited. | docs/knowledge/a-pragma-response-shape-change-needs-the-cache-buster.md:3-6 | `- 'apps/pragma/api/src/**/*.schema.ts'` / `- 'apps/pragma/api/src/**/*.core.ts'` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on the six changed pragma `.ts` files and `apps/*/vitest.config.ts` | exit 0, no output | PASS |
| B02 | knip clean | `pnpm knip` | exit 0; only configuration hints that predate the branch, none about the removed `nullWhenEmpty` or the new `chart-label.core.ts` | PASS |
| B03 | No `any`, assertions only `as const` / `as unknown` | `grep -nP '\bany\b\|\bas (?!const\|unknown)'` on chart-label.core.ts, song-chart-cards.core.ts, songs.schema.ts | none found | PASS |
| B04 | Names carry intent, no abbreviations | read in full | `normalizeChartLabel`, `trimmed`, `assignment`; the verb matches the existing `normalizeLineup` in the same folder | PASS |
| B05 | No prose comments | read in full | the TypeScript changes add only `// @FollowsBlueprint core-decision` and `// @FollowsBlueprint test-pure-unit`; the shell comment at check-migration-sql-dsql-compat.sh:39-43 is outside oxlint's reach and states why paths are taken as given | PASS |
| B06 | `noUncheckedIndexedAccess` | read in full | no index access in the changed lines | PASS |
| B07 | `useEffect` | grep | no `.tsx` changed; none found | PASS |
| B08 | Standards checklist: 02 "a limit or a rule written in a site does not restate one the API enforces under another name" | read songs.schema.ts and song-chart-cards.core.ts in full | the label rule now has one home, imported by both sides (A09, A10). The schema's own `.trim()` before `.max(SONG_CHART_LABEL_MAX_LENGTH)` stays, because the length limit is measured after trimming; it is not a second copy of the blank-to-null rule. | PASS |
| B09 | Standards checklist: 02 "the choice between `.core.ts` and `.utils.ts`" | read chart-label.core.ts | *chart label* is a band term in pragma's vocabulary, so `.core.ts` is right | PASS |
| B10 | Standards checklist: 01 "a file name says what the file holds" | file list | `chart-label.core.ts` holds the chart label rule | PASS |
| B11 | Standards checklist: 01 "an invariant promising behaviour carries a `Held by:` line" / "a rule in an `INVARIANTS.md` is still true" | read apps/pragma/domain/INVARIANTS.md | no invariant of the folder is contradicted by the change; the new rule is not listed there (see Notes) | PASS |
| B12 | Standards checklist: 10 "a test name states the behaviour and the condition" | read chart-label.core.test.ts | `it('stores a blank label as no label', …)`, `it('keeps a label without the spaces around it', …)` | PASS |
| B13 | Standards checklist: 14 "a new check in `.husky/pre-commit` declares a scope … and a whole-tree run in `ci.yml`" | .husky/pre-commit:258-259, .github/workflows/ci.yml:81 | no new check; the existing call keeps its scope `'api/src/database/migrations/.*\.sql$'` and its whole-tree run in CI | PASS |
| B14 | Blueprint marker | apps/pragma/domain/chart-label.core.ts:1, chart-label.core.test.ts:4 | `// @FollowsBlueprint core-decision`, `// @FollowsBlueprint test-pure-unit` | PASS |
| B15 | Documents agree with themselves | .claude/agents/technical-validator.md:150 | `The branch may move while you review. Keep reviewing the SHA you recorded … Run tests and probes in the working tree, which holds that SHA while you work`. Failing case: the main session commits a fix while the validator runs; the working tree then holds the new SHA, and the validator's test run grades code that is not the `Reviewed:` SHA, which the same paragraph says it must keep reviewing. The sentence states as fact what the sentence before it says can be false. Introduced: this branch. Fix size: one line. | FAIL (non-blocking) |
| B16 | Shell lint | `shellcheck scripts/check-migration-sql-dsql-compat.sh` | not installed in the sandbox (exit 127). The removed `# shellcheck disable=SC2053` went with the glob comparison it covered, so no stale directive remains. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed d37a4bcba014324b2d4ac63b4bced9015fe76703 --coverage --reporter=verbose` | 0. 452 files, 4430 tests passed (the changed `vitest.config.ts` reruns every file). Coverage 100% on the four changed gated files, 94/94 statements, 46/46 branches. The run names `domain/chart-label.core.test.ts`, `api/src/songs/song-charts.core.test.ts`, `site/src/routes/catalog/song-draft.core.test.ts`. | PASS |
| C02 | @borso-app/pragma back-e2e | `pnpm --filter @borso-app/pragma run test:e2e --changed d37a4bcba014324b2d4ac63b4bced9015fe76703 --reporter=verbose` | 0. 57 files, 509 tests passed, including `songs.controller.test.ts > persists each of the three chord-chart variants with its instruments and label`. | PASS |
| C03 | @borso-app/pragma mutation | `scripts/mutate-changed.sh d37a4bcba014324b2d4ac63b4bced9015fe76703 apps/pragma` | 0. 156 mutants killed, 0 survived: `song-charts.core.ts` 26, `chart-label.core.ts` 8, `song-chart-cards.core.ts` 122. | PASS |
| C04 | Other five apps | (one coverage reporter line each) | Not run. The line changes only the text reporter's output, and C01 measured its effect on the identical line in pragma. | PASS |
| C05 | `*.utils.ts` sibling tests | `git diff --name-only … \| grep utils` | no `*.utils.ts` changed; the new `chart-label.core.ts` has its sibling `chart-label.core.test.ts` | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Row 18: a blank or whitespace label becomes `null` | `it('stores a blank label as no label')` at apps/pragma/domain/chart-label.core.test.ts:6; `expect(normalizeChartLabel('   ')).toBeNull();` (line 8) | PASS |
| D02 | Row 18: a label is trimmed | `it('keeps a label without the spaces around it')` at chart-label.core.test.ts:12; `expect(normalizeChartLabel(' Solo ')).toBe('Solo');` | PASS |
| D03 | Row 18: the site's payload carries `null`, so the pill reads "Guitare" (deleting the site's call turns a test red) | `it('titles the pill of a chart saved with a blank label by its instruments alone')` at apps/pragma/site/src/routes/catalog/song-draft.core.test.ts:163; `expect(titles).toEqual(['Guitare']);` (line 169). C03 killed all 122 mutants of `song-chart-cards.core.ts`. | PASS |
| D04 | Row 18: the API stores a blank label as `null` | `it('trims the label, stores a blank one as null and refuses one too long')` at apps/pragma/api/src/songs/songs.schema.test.ts:105; `expect(chordChartSchema.parse(chart({ label: '  ' })).label).toBeNull();` (line 107) | PASS |
| D05 | Row 10: the coverage table lists every measured file | structural: `reporter: [['text', { skipFull: false }]]` at apps/pragma/vitest.config.ts:54, with the four rows observed in C01 | PASS |
| D06 | Row 03: the script reads a path outside the migrations folder | (none found). `grep -rln check-migration-sql-dsql-compat scripts --include=*.test.*` finds no test. Failing case: restoring the base's `[[ "$candidate" == $glob_pattern ]] &&` filter leaves every test green, and the stub passes again. `scripts/` already holds Vitest tests of scripts, such as `scripts/pre-push-range.test.ts`. | FAIL (non-blocking) |
| D07 | Rows 09, 13, 19: instructions to agents | structural: document lines quoted in A03, A06 and A07; no test can assert them | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write, per-process state, concurrent proof | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints 0 lines; the module-level grep over the `apps/` diff finds no new `let` or `new Map`/`new Set`. The change is a pure function moved into `domain/` and called from a Zod transform and a site core function. | PASS |

## Blocking findings

- A02 — `check-migration-sql-dsql-compat.sh` changes to the repository root before testing its arguments, so a stub passed by a path relative to the caller's directory (`cd <scratch> && …/check-migration-sql-dsql-compat.sh stub.sql`) is skipped and the script exits 0 without reading it. That is the row-03 friction, still open.

## Non-blocking findings

- B15 — technical-validator.md:150 says the working tree "holds that SHA while you work" right after saying the branch may move.
- D06 — no test pins that the migration script reads a path outside the migrations folder; reverting the fix leaves every test green.

## Notes

- apps/pragma/domain/INVARIANTS.md lists the rules of `domain/` with their `Held by:` tests, and the new chart-label rule (blank to `null`, trimmed) is not among them. Should it get an entry, given that the dantotsu calls it the rule's one home?
- The script comment at check-migration-sql-dsql-compat.sh:39-40 says pre-commit passes "deleted ones included", and `[ -f ]` skips those. That is correct for a deletion. Should a path that never existed be reported rather than skipped, so a typo cannot pass? The fix for A02 may settle both.

## Verdict: FAIL
