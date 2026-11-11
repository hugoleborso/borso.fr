# Technical validation — Pages that compute what the tables know, and a visible lateness

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent, see A00)
- Branch: feat/talos-computed-pages-and-freshness
- Base: def77d93 (round 2 diff: `89fab5c3..HEAD`, the fix commit `3da2e2a7`)
- Run at: 2026-11-11T20:27:41Z
- Round: 2
- Reviewed: 3da2e2a7be3173fdc0f5230e6a91ca1835ed3f7d
- Touched workspaces: @borso-app/talos

The spec is in the short form. Categories A and D are built from the two behaviour bullets the fix commit rewrote (C2.2 and C3.1) and from the code it changed. Nothing is routed to `/visual-validation`; 0 use cases are out of scope for this report.

Round 1 had no blocking finding. The fix commit acted on its six non-blocking findings and on three of its notes, so each gets a row below. Rows of round 1 that the fix did not touch keep their round-1 verdict and are not repeated, except the three UNVERIFIABLE rows, which still stand.

`git diff 89fab5c3..HEAD` also holds commit `4ce3535e`, which adds only the round-1 report. It was not reviewed.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | plan | Plan absent | `docs/features/talos/computed-pages-and-freshness/plan/` does not exist | `ls` shows only `kaizen.md`, `spec`, `validation`. Files were taken from the diff. No row below depended on the plan. | UNVERIFIABLE |
| A01 | C2.2 (new sentence) | A fact whose `learned_on` is not a full ISO day is not listed | apps/talos/api/src/memory/computed-sections.core.ts:100-107, apps/talos/api/src/memory/memory-containment.repository.ts:44-46 | `.filter(isLearnedOnADay)` `.filter((fact) => fact.learnedOn >= windowStart)`; in the query `like(memoryFactTable.learnedOn, ISO_DAY_LIKE),` and `` sql`translate(${memoryFactTable.learnedOn}, ${DIGITS}, '') = ${ISO_DAY_WITHOUT_DIGITS}` ``. The two forms accept the same strings: ten characters, a dash in fifth and eighth place, digits elsewhere. | PASS |
| A02 | C2.3 | At most 10, most recent first, now decided in the query as well | memory-containment.repository.ts:49-54, apps/talos/api/src/memory/memory-page.service.ts:52-57 | `.orderBy(desc(memoryFactTable.learnedOn), asc(memoryFactTable.entitySlug), asc(memoryFactTable.position))` `.limit(limit);` called with `windowStart, RECENT_FACT_LIMIT`. The partial dates are refused before the limit, so they take no place among the ten. | PASS |
| A03 | C3.1 | `entity.upsert` drops the lines under the five computed headings by one rule and keeps the headings | computed-sections.core.ts:51-55, :144-148 | `[FACTS_HEADING, HISTORY_HEADING, RELATIONS_HEADING, CONTAINED_HEADING, RECENT_FACTS_HEADING].map((heading) => `## ${heading}`)`; `isUnderComputedHeading: COMPUTED_HEADING_LINES.has(line.trimEnd())`; `const isComputedLine = state.isUnderComputedHeading && line.startsWith(LIST_ITEM_PREFIX);` | PASS |
| A04 | C3.1 | A page read then written back stores no computed line, and the next read shows each once | apps/talos/api/src/memory/memory-plans.core.ts:46-47 | `operation.body === undefined ? (existing?.body ?? '') : dropComputedLines(operation.body)`. Measured with the pure functions over four round trips, from five starting bodies (three headings, no heading, only `## Faits récents`, that heading before `## Chronologie`, empty): the stored body is the same after each write, and the last read holds the fact, the history line, the relation, the `## Comprend` line and the `## Faits récents` line once each. Script: `/tmp/claude-0/-home-user-borso-fr/2ad21149-51d3-5fff-98e8-0e9474b187e4/scratchpad/technical-validator-computed/probe2.ts`. | PASS |
| A05 | C2.1 | `## Faits récents` after `## Comprend`, also when the body carries only the second heading | apps/talos/api/src/memory/page-rendering.core.ts:158-172 | `const laterIndex = headingLines.findIndex((line) => laterHeadings.some((heading) => line === `## ${heading}`));` then `...bodyLines.slice(0, laterIndex), `## ${section.heading}`, '', ...renderLines(section.lines), '', ...bodyLines.slice(laterIndex)`. Measured: body `# J\n\n## Faits récents\n` renders `## Comprend`, its line, then `## Faits récents`. | PASS |
| A06 | C3.2, D.1 | `MEMORY-CONTRACT.md` §3 states the write rule, the line formats and the position rule as the code now has them | apps/talos/MEMORY-CONTRACT.md:65, :69, :70, :121 | `A fact whose `learned_on` is null or a partial date (`2026`, `2026-09`, `~2026-01`) is not listed.`; `One exception keeps that order: a body that has a `## Faits récents` heading and no `## Comprend` heading gets `## Comprend` and its lines right above`; `every line that starts with `- ` between one of the five headings`; `a fact or relation line sent inside the `body` is dropped without an error` | PASS |
| A07 | F2.2 | « Résumé du … » stays under a title that follows blank lines | apps/talos/site/src/components/organisms/brain-page-title.core.ts:11-12 | `const opening = markdown.trimStart();` `if (!opening.startsWith(TITLE_PREFIX)) return { title: '', rest: markdown };`. Measured: `splitTitleLine('\n# Jardin\n\ntexte')` answers `{ title: '# Jardin', rest: '\ntexte' }`. | PASS |
| A16 | C4.2 | Removing the stored `## Projets liés` is asked in the pull request | none | `gh api repos/<repo>/pulls?head=<owner>:feat/talos-computed-pages-and-freshness&state=all` answers 0 pull requests, so nothing can be read. | UNVERIFIABLE |
| A25 | D.2 | The pull request states the contract change | none | Same call, 0 pull requests. The fix widened what must be stated: the strip of five sections, the silent drop of a fact line sent in a body, the full-day rule and the position exception. | UNVERIFIABLE |

## Round-1 findings (round 2 only)

Round 1 had no blocking finding. These rows re-check its non-blocking findings and the notes the fix commit acted on.

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A08, `## Faits récents` rendered before `## Comprend` when the body carries only its heading | `3da2e2a7` page-rendering.core.ts:151-173; test page-rendering.core.test.ts:240. Round 1's failing input now renders `## Comprend` first (measured, A05). | PASS |
| R02 | B11, `CONTAINED_HEADING` and `HEADING_PREFIXES` declared twice | `3da2e2a7` apps/talos/api/src/pages/pages.core.ts:2, `import { CONTAINED_HEADING, HEADING_PREFIXES } from '../memory/computed-sections.core';`. `grep -rn "= 'Comprend'" apps/talos/api/src --include=*.ts` minus tests leaves computed-sections.core.ts:38 only. | PASS |
| R03 | B12, « Computed section » promised "never stored" with no `Held by:` line | `3da2e2a7` apps/talos/VOCABULARY.md:116, `Held by: `api/src/agent/agent-page.controller.test.ts` › stores no computed line when a page read is written back, the headings kept in place`. That test exists under that name at agent-page.controller.test.ts:82. | PASS |
| R04 | B13, `splitTitleLine` lived in `late-pages.core.ts` | `3da2e2a7` moved to `site/src/components/organisms/brain-page-title.core.ts` with its own test file; `late-pages.core.ts` keeps `orderLatePages`, `selectLatePageCount`, `isPageLate`. | PASS |
| R05 | B14, `listEntitiesIn` wrote its row type by hand | `3da2e2a7` memory-containment.repository.ts:12, `Promise<Pick<typeof memoryEntityTable.$inferSelect, 'slug' \| 'kind' \| 'attributes'>[]>` | PASS |
| R06 | E06, every fact below a page was read to keep 10 | `3da2e2a7` memory-containment.repository.ts:33-54. The window, the full-day rule, the order and `.limit(limit)` are in the query, so at most 10 rows come back. | PASS |
| R07 | Note, « Faits », « Historique » and « Relations » doubled on a write-back | `3da2e2a7` computed-sections.core.ts:51-55 and the spec's C3.1. Round 1's measurement repeated: each of the three lines shows once after four round trips (A04). | PASS |
| R08 | Note, `MEMORY-CONTRACT.md:22` and `:70` contradicted each other | `3da2e2a7` MEMORY-CONTRACT.md:22, `stored without the *lines* of the five computed sections … whoever writes: `entity.upsert` drops them`, and :70 says the same. | PASS |
| R09 | Note, `splitTitleLine` missed a title below a blank line | `3da2e2a7` brain-page-title.core.ts:11; test brain-page-title.core.test.ts, `finds the title below blank lines, and leaves them out of the rest`. | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of every changed source file | `laterHeadings`, `isPlacedByItsHeading`, `learnedSince`, `windowStart`, `opening`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <14 changed .ts/.tsx under apps/talos>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm knip` | exit 0, configuration hints only. The three constants `page-rendering.core.ts` now exports and `RECENT_FACT_LIMIT`, `HEADING_PREFIXES` each have an importer. | PASS |
| B05 | Magic numbers and strings named | read in full | `ISO_DAY_LIKE = '____-__-__'`, `DIGITS`, `ISO_DAY_WITHOUT_DIGITS = '--'`, `TITLE_PREFIX` | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on the 14 changed files | six hits, all prose inside test names | PASS |
| B07 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Za-z]'` minus `as const` on the changed files | only prose in test names | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read in full | no indexed access added; `findIndex` results are compared with `-1` before use (page-rendering.core.ts:162) | PASS |
| B09 | `useEffect` | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B10 | No prose comment | read in full | the commit adds no comment besides `// @FollowsBlueprint core-view-projection` (brain-page-title.core.ts:9) | PASS |
| B11 | Standards: "a definition in a `VOCABULARY.md` is still true" (01) | apps/talos/VOCABULARY.md:112 | `A section of a rendered entity whose lines come from the tables at every read and are never stored: « Comprend » and « Faits récents ».` names two sections, and the same entry ends `Not to be confused with: « Faits », « Historique » and « Relations »`. The commit makes the spec's C3.1 and MEMORY-CONTRACT.md:22 and :121 say `the five computed sections`, and `COMPUTED_HEADING_LINES` (computed-sections.core.ts:51) holds five. One term now means two sets. The same drift is in the test name `drops the lines under the two computed headings and keeps the headings in place` (computed-sections.core.test.ts:213). Introduced: this branch; Fix size: one line | FAIL (non-blocking) |
| B12 | Standards: `Held by:` on a promise (01) | VOCABULARY.md:116 | see R03 | PASS |
| B13 | Standards: "a file name says what the file holds" (01) | brain-page-title.core.ts | holds `splitTitleLine` and `TitledMarkdown` only | PASS |
| B14 | Standards: "a derived type is derived" (03) | memory-containment.repository.ts:12, :37 | `Pick<typeof memoryEntityTable.$inferSelect, …>`; `(typeof memoryFactTable.$inferSelect)[]` | PASS |
| B15 | Standards: "a repository returns rows, arrays and counts" (04) | memory-containment.repository.ts:33-54 | `select()` with a `where`, an `orderBy` and a `limit`; no derived field | PASS |
| B16 | Standards: verb table (01) | read in full | `listRecentFactsOfEntities` returns an array; `splitTitleLine` returns the two parts; `isLearnedOnADay` returns a boolean and is not negated | PASS |
| B17 | Standards: test names state behaviour and condition; e2e asserts on what the database holds (10) | changed tests | `lists no fact whose learned_on is %s, not a full day, and ten of them take no place among the ten`; the write-back test reads the stored body and asserts `expect(stored).toBe(...)` (agent-page.controller.test.ts:114) | PASS |
| B18 | Blueprint claims | blueprint ids | the new file carries `core-view-projection`, as the file it was split from did | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed 89fab5c3 --coverage --reporter=verbose` | 0. 10 files, 96 tests, coverage 100 % on statements, branches, functions and lines. Files of the fix: `computed-sections.core.test.ts` (21), `memory-plans.core.test.ts` (18), `page-rendering.core.test.ts` (15), `pages.core.test.ts` (5), `brain-page-title.core.test.ts` (3), `late-pages.core.test.ts` (3), `App.memory.test.tsx` (10) | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed 89fab5c3 --reporter=verbose` | 0. 21 files, 142 tests, among them `agent-page.controller.test.ts` (10), `pages.controller.test.ts` (5), `graph.controller.test.ts` (2) | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh 89fab5c3 apps/talos` | 0. 6 files, 570 mutants, score 100.00, 0 survived (`computed-sections.core.ts` 97, `page-rendering.core.ts` 199, `memory-plans.core.ts` 139, `pages.core.ts` 41, `brain-page-title.core.ts` 18, `late-pages.core.ts` 16). 510 of the 570 results were reused from Stryker's incremental file, which an earlier run on this working tree wrote. | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The fix commit adds or changes no `*.utils.ts` (`git diff 89fab5c3..HEAD --name-only` has none). | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | C2.2 a partial or null `learned_on` is not listed (pure rule) | `lists no fact whose learned_on is not a full day, even when it sorts inside the window` at apps/talos/api/src/memory/computed-sections.core.test.ts:186, `expect(recent?.lines).toStrictEqual([`2026-11-03 \| [[${VEGETABLES}]] \| jour entier`])` over `2026-11`, `2026`, `~2026-12`, `2026-11-02 env.`, `2026-1x-01`, `20261-1-05`; null stays covered by round 1's D10 test | PASS |
| D02 | C2.2 the same rule in the query, and partial dates take no place among the ten | `lists no fact whose learned_on is %s, not a full day, and ten of them take no place among the ten` at apps/talos/api/src/agent/agent-page.controller.test.ts:123, `expect(page.markdown).toContain(`\n## Faits récents\n\n${RECENT_FACT_LINES}`)` and `not.toContain('date partielle')`. `~2026-12` and `2026-1x-01` sort above the real days, so without the query's filter the limit would return only them and the section would be absent. `2026-1x-01` passes the `like` and is refused by `translate`; `20261-1-05` passes `translate` and is refused by the `like`. | PASS |
| D03 | C3.1 lines dropped under each of the five headings, headings kept | `drops the lines under « %s » and keeps its heading and the hand-written lines` at computed-sections.core.test.ts:260, `.toBe(`# Jardin\n\n## ${heading}\n\nUne phrase.\n\n## Chronologie\n- gardée\n`)` for the five headings | PASS |
| D04 | C3.1 through `entity.upsert` | `stores a received body without the lines of the computed sections, their headings kept` at apps/talos/api/src/memory/memory-plans.core.test.ts:89, `toMatchObject({ values: { body: stored } })` with a `## Faits` line in the body sent | PASS |
| D05 | C3.1 a page read then written back stores no computed line | `stores no computed line when a page read is written back, the headings kept in place` at agent-page.controller.test.ts:82, `expect(stored).toBe(`${STORED_BODY}\n## Historique\n\n\n## Comprend\n\n\n## Faits récents\n\n`)` (:114) | PASS |
| D06 | C3.1 the next read shows each of them once | same test, `expect(tableLines.map((line) => again.markdown.split(line).length)).toStrictEqual(tableLines.map(() => 2))` (:117), where `tableLines` holds a fact, a history line, three relations, the contained lines and the recent facts | PASS |
| D07 | C2.1 order when the body carries only the later heading | `puts a computed section whose heading the body lacks before the heading of a later one` at apps/talos/api/src/memory/page-rendering.core.test.ts:240, `.endsWith('# Jardin\n\n## Comprend\n\n- [[second-brain/projets/potager]]\n\n## Faits récents  \n\n- 2026-11-02 \| semis\n## Chronologie\n')` | PASS |
| D08 | F2.2 title below blank lines | `finds the title below blank lines, and leaves them out of the rest` at apps/talos/site/src/components/organisms/brain-page-title.core.test.ts:13, `toStrictEqual({ title: '# Jardin', rest: '\ntexte' })` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | New write paths | Any? | `git diff 89fab5c3..HEAD -- 'apps/**/*.ts'` minus tests, grepped for `insert(`, `update(`, `delete(`, `onConflict`, `transaction(` on added lines, returns nothing. | PASS |
| E02 | `upsertEntityOperation` → `upsertEntity`, whose body value the commit changes again | Check-then-write | `dropComputedLines(operation.body)` (memory-plans.core.ts:47) is still a pure function of the received body; the commit only widens the set of headings. No decision from rows read earlier is added. Round 1's question on `expectedVersion` stands in its Notes and is not reopened. | PASS |
| E03 | Per-process state | Module-level variables | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api source files returns nothing. | PASS |
| E04 | Concurrent proof | Rule held by a key | No rule held by a key in this commit, so no concurrent test is owed. | PASS |
| E05 | Cost of one page read, number of queries | Changed? | Unchanged from round 1: `listRecentFactsOfEntities` replaces `listFactsOfEntities` at the same single call (memory-page.service.ts:53), outside any loop. | PASS |
| E06 | Cost of one page read, rows | Does it grow with the facts below the page? | Rows returned are at most 10: `.limit(limit)` at memory-containment.repository.ts:54 with `RECENT_FACT_LIMIT`. The database still reads every fact row of the descendants through `memory_fact_entity_slug_idx` to apply the three predicates, since no index carries `learned_on`; that is a question in Notes, not a failing case. | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B11 — `VOCABULARY.md:112` defines a computed section as two sections, while the spec, `MEMORY-CONTRACT.md` and the code now count five.

## Notes

- A00 — no plan was written. The spec is in the short form and the files were taken from the diff. `/technical-conception` would produce one.
- A16, A25 — C4.2 and D.2 are claims about the pull request body. No pull request exists for this branch (measured, 0 results), so they can only be read once it opens.
- The spec's C1.5 still says `## Comprend` goes "under an existing `## Comprend` heading of the body, else appended at the end". The fix for round 1's A08 places it above an existing `## Faits récents` heading instead, and `MEMORY-CONTRACT.md:69` states that exception. C1.5 and C2.1 cannot both hold for such a body, and the code follows C2.1. Should C1.5 carry the exception too?
- `dropComputedLines` drops every `- ` line until the next `# ` or `## ` heading, so a list under a `### ` sub-heading inside one of the five sections goes too. Measured: `## Faits\n### Détail\n- à moi\n## Chronologie\n- gardée\n` is stored as `## Faits\n### Détail\n## Chronologie\n- gardée\n`. This matches `MEMORY-CONTRACT.md:70` as written. Does any real body keep hand-written list lines under « Faits », « Historique » or « Relations »? The commit message says no stored body carries a line under these three headings today; that was measured by the agent session, not by this validator.
- The commit message says `translate` and `like` were checked on Aurora DSQL. This validator ran them on the local Postgres only (the back-e2e tests of D02). The claim is not verified here.
- The full-day rule now has two written forms, the pattern `/^\d{4}-\d{2}-\d{2}$/` (computed-sections.core.ts:45) and the `like` plus `translate` pair (memory-containment.repository.ts:44-45). The pure function runs after the query, so a query that drifts wider is still filtered; a query that drifts narrower would hide facts, and only the four values of D02 pin the two together.
- `gte` and the `desc` order compare `learned_on` as text under the database's collation. Every row that reaches them has the same ten-character shape, so the comparison reduces to its digits (inferred from the predicates, not measured under a non-C collation).
- `splitTitleLine` on a page with CRLF line ends answers `{ title: '# Jardin\r', rest: 'texte' }` (measured). No body in the seed uses CRLF.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
