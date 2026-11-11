# Technical validation — Pages that compute what the tables know, and a visible lateness

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent, see A00)
- Branch: feat/talos-computed-pages-and-freshness
- Base: def77d93 (feature commit reviewed: 49391ccf)
- Run at: 2026-11-11T20:05:11Z
- Round: 1
- Reviewed: 89fab5c36a926fd779b4d0b073e10017e55f9e58
- Touched workspaces: @borso-app/talos

The spec is in the short form (facts, data shapes, behaviour, out of scope). Categories A and D are built from its behaviour bullets, walked in order. Nothing is routed to `/visual-validation`; 0 use cases are out of scope for this report.

Only the feature commit `49391ccf` was reviewed (`git diff def77d93 49391ccf`). `git diff 49391ccf HEAD -- apps/talos` is empty (measured), so the tests run on HEAD exercise exactly that commit's talos code.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | plan | Plan absent | `docs/features/talos/computed-pages-and-freshness/plan/` does not exist | `ls` shows only `kaizen.md`, `spec`, `validation`. Files were taken from the diff. No row below depended on the plan. | UNVERIFIABLE |
| A01 | C1.1 | Entity with an open outgoing `comprend` gets `## Comprend`, one line per contained page, in relation order | apps/talos/api/src/memory/computed-sections.core.ts:54 | `.filter((relation) => relation.verb === CONTAINMENT_VERB && relation.until === null)` `.toSorted((left, right) => left.position - right.position)` | PASS |
| A02 | C1.2 | Line `- [[slug]]`, a project continues with `statut`, `meteo`, `prochaine_etape`, `echeance` when present and not empty | computed-sections.core.ts:86 | `if (entity?.kind !== PROJECT_KIND) return link;` … `return typeof value === 'string' && value !== '' ? [` \| ${key}: ${value}`] : [];` over `PROJECT_LINE_ATTRIBUTES = ['statut', 'meteo', 'prochaine_etape', 'echeance']` | PASS |
| A03 | C1.3 | Closed relation not listed; a missing page listed by slug alone | computed-sections.core.ts:55, :88 | `relation.until === null`; `composeContainedLine(slug, entitiesBySlug.get(slug))` returns the bare link when the entity is undefined | PASS |
| A04 | C1.4 | No open `comprend`, no section, whatever the kind | apps/talos/api/src/memory/memory-page.service.ts:45 | `const containedSlugs = selectContainedSlugs(outgoing);` `if (containedSlugs.length === 0) return [];` | PASS |
| A05 | C1.5 | Placed under an existing heading, else appended at the end | apps/talos/api/src/memory/page-rendering.core.ts:174 | `const body = computedSections.reduce((rendered, section) => insertSectionLines(rendered, section.heading, section.lines), withRelations);` | PASS |
| A06 | C1.6 | « Relations » unchanged, still lists `comprend` | page-rendering.core.ts:168 | `const relationLines = relations.toSorted(byPosition).map(...)` is untouched by the diff; no verb filter | PASS |
| A07 | C2.1 | `## Faits récents` after `## Comprend` | computed-sections.core.ts:112 | `return [{ heading: CONTAINED_HEADING, ... }, { heading: RECENT_FACTS_HEADING, ... }]`. Holds when both are appended or both headings are stored in that order. | PASS |
| A08 | C2.1 | Same claim, body that carries only a `## Faits récents` heading | page-rendering.core.ts:137 | Failing case (measured with `renderEntityPage`): body `# J\n\n## Faits récents\n`, one open `comprend`, one fact in the window → `## Faits récents` and its line come first, `## Comprend` is appended after it. The spec says after. Reachable only from a hand-written body; a write-back stores both headings in order. | FAIL (non-blocking) |
| A09 | C2.2 | Facts of contained pages, two levels down, `learned_on` on or after the summary day; 30 days when no day | memory-page.service.ts:47, computed-sections.core.ts:62, :82 | `listRelationsFrom(containedSlugs)` then `new Set([...containedSlugs, ...selectContainedSlugs(relationsOfContained)])`; `return summaryDay ?? addDaysToDate(today, -DEFAULT_WINDOW_DAYS);`; `.filter(({ learnedOn }) => learnedOn >= windowStart)` | PASS |
| A10 | C2.2 | Summary day is `resume_le`, else `maj`, else the day of `updated_at` | computed-sections.core.ts:76 | `const writtenDay = SUMMARY_DAY_ATTRIBUTES.map((key) => attributes[key]).find(isIsoDay);` … `return updatedAt === null ? null : formatParisDate(updatedAt);` | PASS |
| A11 | C2.3 | At most 10, most recent first, line `<learned_on> \| [[slug]] \| <fact>` | computed-sections.core.ts:96 | `.toSorted((left, right) => right.learnedOn.localeCompare(left.learnedOn)).slice(0, RECENT_FACT_LIMIT)` … `` `${learnedOn} | [[${fact.entitySlug}]] | ${fact.raw ?? composeFactRaw(fact)}` `` | PASS |
| A12 | C2.4 | Own facts not listed; section absent with no fact in the window | computed-sections.core.ts:68, page-rendering.core.ts:135 | `descendants.delete(slug);`; `if (lines.length === 0) return body;` | PASS |
| A13 | C3.1 | `entity.upsert` drops the lines under the two computed headings and keeps the headings | apps/talos/api/src/memory/memory-plans.core.ts:46, computed-sections.core.ts:130 | `operation.body === undefined ? (existing?.body ?? '') : dropComputedLines(operation.body)`; `const isComputedLine = state.isUnderComputedHeading && line.startsWith(LIST_ITEM_PREFIX);`. Measured round trip: the second read carries each computed line once. The three older sections are in Notes. | PASS |
| A14 | C3.2 | Reserved headings in `MEMORY-CONTRACT.md` §3, with line formats and position rule | apps/talos/MEMORY-CONTRACT.md:55-72 | `### Computed sections: ## Comprend and ## Faits récents` / `Two headings are reserved.` / `- **Position.** As « Faits » and « Relations »: ...` | PASS |
| A15 | C4.1 | PWA page without `## Projets liés` when `## Comprend` is rendered; stored body and agent read keep it | apps/talos/api/src/pages/pages.core.ts:41, :54 | `const hasComputedContainment = contained !== null && contained !== '';` `return hasComputedContainment ? removeSection(body, HAND_WRITTEN_COPY_HEADING) : body;`. `readMemoryPage` (agent) does not go through `projectStoredPage`. | PASS |
| A16 | C4.2 | Removing the stored `## Projets liés` is asked in the pull request | none | No pull request exists yet for this branch, so nothing can be read. | UNVERIFIABLE |
| A17 | F1.1 | `GET /api/freshness`, session required, from state `freshness`; bad page dropped; missing state answers the empty shape; no write | apps/talos/api/src/freshness/freshness.controller.ts:7, freshness.core.ts:61-69, memory-files.core.ts:23 | `.use('*', requireSession).get('/', async (context) => context.json(await readFreshness()))`; `['etat/fraicheur.json', 'freshness']`; `.map((entry) => readLatePage(entry)).filter((page) => page !== null)` | PASS |
| A18 | F1.2 | Tenth tile « Mémoire » after « Historique », count of late pages, opens the Mémoire tab, calm, no count until loaded | apps/talos/site/src/components/organisms/TodayIndex.tsx:124-130 | `key: 'memory', to: '/brain',` `...(latePageCount === undefined ? {} : { count: latePageCount }),` `isAlert: false,` | PASS |
| A19 | F1.3 | « En retard · N » above the search, folded, hidden at zero, most late first, title, kind, summary date, tap opens | apps/talos/site/src/components/organisms/LatePages.tsx:15-17, BrainSearch.tsx:31 | `if (freshness.data === undefined \|\| freshness.data.lateCount === 0) return null;` `<FoldedSection label={t('brain.late', { count: freshness.data.lateCount })}>` `{orderLatePages(freshness.data.pages).map(...` | PASS |
| A20 | F1.4 | No new screen, no new tab | diff | `git diff def77d93 49391ccf --name-only -- apps/talos/site` lists no route, `App.tsx` or tab bar file | PASS |
| A21 | F2.1 | Page view gains `summarizedOn`, null for what is not an entity | apps/talos/api/src/memory/memory-page.core.ts:23, pages.core.ts:57 | `const NOT_AN_ENTITY = { targets: [], summarizedOn: null } as const;`; `summarizedOn: view.summarizedOn,` | PASS |
| A22 | F2.2 | « Résumé du <short day> » under the title | apps/talos/site/src/components/organisms/BrainPageView.tsx:101-108 | `<MarkdownContent html={renderMarkdownToSafeHtml(title)} ... />` `{page.data.summarizedOn === null ? null : (<SummaryLine ...` `<MarkdownContent html={renderMarkdownToSafeHtml(rest)} ...` | PASS |
| A23 | F2.3 | Late page: alert colour and words | BrainPageView.tsx:42-45, fr.json | `isLate ? 'font-semibold text-danger' : 'text-ink-muted'`; `"brain.page.summarized-late": "Résumé du {{day}}, en retard"` | PASS |
| A24 | D.1 | Contract §3 and state keys, `CONTRAT.md`, `VOCABULARY.md` | MEMORY-CONTRACT.md:36, CONTRAT.md:153, :235, :328, :339, VOCABULARY.md:97, :110 | `` `freshness` (the late summaries, written by the agent every night and read by the PWA at `GET /api/freshness`; the API never writes it) ``; `### Freshness: etat/fraicheur.json`; `## Freshness`, `## Computed section` | PASS |
| A25 | D.2 | The pull request states the contract change | none | No pull request exists yet. | UNVERIFIABLE |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of every changed source file | `containedSlugs`, `relationsOfContained`, `descendantFacts`, `windowStart`, `hasComputedContainment`; none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <34 changed .ts/.tsx under apps/talos>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/talos run typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm knip` | exit 0, configuration hints only | PASS |
| B05 | Magic numbers and strings named | read in full | `DEFAULT_WINDOW_DAYS = 30`, `RECENT_FACT_LIMIT = 10`, `PROJECT_KIND`, `FRESHNESS_PATH`, `HAND_WRITTEN_COPY_HEADING` | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | two hits, both prose inside test names | PASS |
| B07 | Type assertions limited to `as const` / `as unknown` | read in full | only `as const` (computed-sections.core.ts:40, memory-page.core.ts:23, freshness.queries.ts:5) | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read in full | no indexed access in changed source; `entitiesBySlug.get(slug)` is handled as `undefined` | PASS |
| B09 | `useEffect` | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B10 | No prose comment; the reason on a disable is checkable | freshness.core.ts:60 | `// Stryker disable next-line ConditionalExpression: equivalent mutant, a missing state parses to null ...`. Checked: `parseJsonOrNull` is `JSON.parse(raw)`, `JSON.parse(null)` is `null`, and `freshnessFileSchema` refuses `null`. The claim holds. | PASS |
| B11 | Standards: "a limit or a rule ... does not restate one ... under another name" (02) | read in full | `const CONTAINED_HEADING = 'Comprend';` at apps/talos/api/src/pages/pages.core.ts:24 restates `export const CONTAINED_HEADING = 'Comprend';` at computed-sections.core.ts:35, and `HEADING_PREFIXES` at pages.core.ts:23 restates computed-sections.core.ts:47. A renamed heading changes one and not the other. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B12 | Standards: "an invariant promising behaviour carries a `Held by:` line" (01) | apps/talos/VOCABULARY.md:112 | `A section of a rendered entity whose lines come from the tables at every read and are never stored` has no `Held by:` line, while the test `stores no computed line when a page read is written back, the headings kept in place` (agent-page.controller.test.ts) holds it. Introduced: this branch; Fix size: one line | FAIL (non-blocking) |
| B13 | Standards: "a file name says what the file holds" (01) | apps/talos/site/src/components/organisms/late-pages.core.ts:32 | `export function splitTitleLine(markdown: string): TitledMarkdown` splits a page's title from its markdown and knows nothing of late pages. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B14 | Standards: "a derived type is derived" (03) | apps/talos/api/src/memory/memory-containment.repository.ts:8 | `): Promise<{ slug: string; kind: string; attributes: string }[]> {` is written by hand beside `memoryEntityTable`; the two other functions of the file use `$inferSelect`. Introduced: this branch; Fix size: one line | FAIL (non-blocking) |
| B15 | Standards: "a repository returns rows, arrays and counts" (04) | memory-containment.repository.ts | three `select` with `inArray` and `orderBy`, no derived field | PASS |
| B16 | Standards: verb table (01) | read in full | `selectContainedSlugs`, `selectSummaryDay` return what a rule chose; `composeComputedSections` assembles; `isIsoDay`, `isPageLate` return booleans; `listEntitiesIn` returns an array | PASS |
| B17 | Standards: untrusted input parsed with Zod (03) | freshness.core.ts:23-38 | `freshnessFileSchema.safeParse(parseJsonOrNull(raw))`, `latePageSchema.safeParse(entry)` | PASS |
| B18 | Standards: a definition in `VOCABULARY.md` is still true (01) | VOCABULARY.md:97-121, :173 | `selectSummaryDay` is in `api/src/memory/computed-sections.core.ts`; the `Held by:` test of « Freshness » exists at freshness.controller.test.ts:52 under that name | PASS |
| B19 | Standards: i18n key path names the screen and the element (09) | fr.json | `brain.page.summarized`, `brain.page.summarized-late`, `brain.late`, `today.index.memory` | PASS |
| B20 | Standards: test names state behaviour and condition; e2e asserts on what the database holds (10) | changed tests | `stores no computed line when a page read is written back, the headings kept in place` reads the stored body through `/api/agent/export` | PASS |
| B21 | Blueprint claims | blueprint-index.md | each new file carries a `@FollowsBlueprint` id present in the index (`repository-query`, `service-read-model`, `controller-guarded-router`, `core-parse-untrusted`, `core-view-projection`, `molecule-presentational`, `organism-query-owning`, `query-module`); `LatePageRow` uses `usePressGesture` as five sibling molecules do | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed def77d93 --coverage --reporter=verbose` | 0. 25 files, 157 tests, coverage 100 % on statements, branches, functions and lines. Feature files run: `computed-sections.core.test.ts`, `freshness.core.test.ts`, `pages.core.test.ts`, `memory-plans.core.test.ts`, `page-rendering.core.test.ts`, `memory-page.core.test.ts`, `memory-files.core.test.ts`, `late-pages.core.test.ts`, `TodayIndex.test.tsx`, `App.memory.test.tsx` | PASS |
| C02 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed def77d93 --reporter=verbose` | 0. 21 files, 138 tests, among them `agent-page.controller.test.ts`, `freshness.controller.test.ts`, `pages.controller.test.ts`, `graph.controller.test.ts` | PASS |
| C03 | @borso-app/talos | `scripts/mutate-changed.sh def77d93` | 0. talos 8 files, score 100.00, 0 survived (`computed-sections.core.ts` 99 killed, `freshness.core.ts` 19 killed). The run also mutated one tooling file and one infra-cdk file from the merges of main, both at 100.00. | PASS |
| C04 | @borso-app/talos | `*.utils.ts` enumeration | The feature commit adds or changes no `*.utils.ts` (`git diff def77d93 49391ccf --name-only` has none). | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | C1.1 section present, one line per contained page, relation order | `lists what a domain contains and what moved below it, two levels down, and keeps « Projets liés »` at apps/talos/api/src/agent/agent-page.controller.test.ts:48, `expect(page).toEqual({ ... markdown: `${FRONT_MATTER}${RENDERED_BODY}` ...})`; order: `keeps the open comprend relations, in position order, each page once` at computed-sections.core.test.ts:59, `.toStrictEqual([VEGETABLES, GREENHOUSE])` | PASS |
| D02 | C1.2 project line, present attributes, fixed order | `links each contained page, a project with its attributes that are present, in a fixed order` at computed-sections.core.test.ts:144, `expect(contained?.lines).toStrictEqual([...])` with an empty `meteo`, an array `echeance` and a `domaine` carrying `statut` | PASS |
| D03 | C1.3 closed relation not listed | agent-page.controller.test.ts:48, `expect(page.markdown).not.toContain(`- [[${ORCHARD}]]\n`)`; `leaves out a closed relation and any other verb` at computed-sections.core.test.ts:69 | PASS |
| D04 | C1.3 missing page listed by slug alone | `lists a contained page that no longer exists by its slug alone` at agent-page.controller.test.ts:73, `toContain(`${CONTAINED_LINES}- [[https://exemple.test/ruches]]\n`)` | PASS |
| D05 | C1.4 no section without an open `comprend` | `adds no section to a page that contains nothing` at agent-page.controller.test.ts:66, `not.toContain('## Comprend')` on a person and on a project | PASS |
| D06 | C1.5 under an existing heading, else at the end | `places each computed section under its heading of the body, else at the end, in the order given` at page-rendering.core.test.ts:205, both `endsWith(...)` assertions | PASS |
| D07 | C1.6 « Relations » still lists `comprend` | pages.controller.test.ts:35, `toContain(`- comprend → [[second-brain/projets/verger]] \| depuis: 2026-03 \| jusqu'à: 2026-09\n`)` | PASS |
| D08 | C2.1 `## Faits récents` after `## Comprend` | agent-page.controller.test.ts:48, `RENDERED_BODY` ends `## Comprend\n\n${CONTAINED_LINES}\n## Faits récents\n\n${RECENT_FACT_LINES}` | PASS |
| D09 | C2.2 two levels down | agent-page.controller.test.ts:48, the line `- 2026-11-05 \| [[${COMPOST}]] \| bac: le deuxième est plein` (compost is under potager, under jardin); `goes two levels down, without the page itself and without a closed branch` at computed-sections.core.test.ts:80 | PASS |
| D10 | C2.2 on or after the summary day | `lists the facts learned on or after the window start, the most recent first, as « Faits » renders them` at computed-sections.core.test.ts:169: `2026-10-19` and a null `learnedOn` are out, `2026-10-20` is in | PASS |
| D11 | C2.2 `resume_le`, else `maj`, else `updated_at` | computed-sections.core.test.ts:97, :103, :119; wiring: `dates the summary of an entity from maj, then from its last update, and of nothing else` at pages.controller.test.ts:53, `toBe('2026-09-12')`, `toBe(formatParisDate(new Date()))` | PASS |
| D12 | C2.2 no day, last 30 days | `starts at the day of the summary, else thirty days before today` at computed-sections.core.test.ts:130, `expect(selectRecentWindowStart(null, '2026-11-11')).toBe('2026-10-12')`; `answers no day when nothing gives one` at :124 | PASS |
| D13 | C2.3 at most 10, most recent first | `keeps ten facts at most, the most recent` at computed-sections.core.test.ts:186, `toHaveLength(10)`, `recent?.lines[0]` is `2026-11-21` | PASS |
| D14 | C2.3 line format | computed-sections.core.test.ts:179, `` `2026-11-05 | [[${COMPOST}]] | bac: plein | src: journal/2026-11-05` `` (raw) and `` `2026-10-20 | [[${VEGETABLES}]] | planches: 6 | depuis: 2026` `` (fields) | PASS |
| D15 | C2.4 own facts not listed | agent-page.controller.test.ts:59, `not.toContain(`[[${GARDEN}]] \| surface`)` | PASS |
| D16 | C2.4 section absent with no fact in the window | `lists a project inside a project, and no recent facts when none is in the window` at agent-page.controller.test.ts:60, `not.toContain('## Faits récents')` | PASS |
| D17 | C3.1 lines dropped, headings kept | `drops the lines under the two computed headings and keeps the headings in place` at computed-sections.core.test.ts:198; `stores a received body without the lines of the computed sections, their headings kept` at memory-plans.core.test.ts:89 | PASS |
| D18 | C3.1 a page read then written back stores no computed line | `stores no computed line when a page read is written back, the headings kept in place` at agent-page.controller.test.ts:82, `expect(stored).not.toContain(`[[${VEGETABLES}]] \| statut`)` and `expect(again.markdown.split(CONTAINED_LINES)).toHaveLength(2)` | PASS |
| D19 | C4.1 PWA hides `## Projets liés` when `## Comprend` is rendered | pages.controller.test.ts:35, `expect(page.markdown).not.toContain('Projets liés')`; `keeps the body as written when nothing is computed or nothing is copied` at pages.core.test.ts:71 | PASS |
| D20 | C4.1 stored body not rewritten, agent read keeps it | `leaves the stored body of the seed untouched by a read` at agent-page.controller.test.ts:104, `toBe(STORED_BODY)`; agent-page.controller.test.ts:48 `RENDERED_BODY` holds `## Projets liés` | PASS |
| D21 | F1.1 answers `Freshness` from the state | `reads the stored freshness state` at freshness.controller.test.ts:12, `toEqual({ generatedAt: '2026-11-11T20:10:00+01:00', lateCount: 7, pages: [...] })` | PASS |
| D22 | F1.1 session required | `refuses a request without a session` at freshness.controller.test.ts:70, `toBe(401)` | PASS |
| D23 | F1.1 a page that does not parse is dropped | `drops a page that does not parse and keeps the others` at freshness.core.test.ts:50, `toStrictEqual(['second-brain/projets/potager'])` | PASS |
| D24 | F1.1 missing or unreadable state | `answers nothing late when the state is missing` at freshness.controller.test.ts:45; `answers nothing late when the state is missing or unreadable` at freshness.core.test.ts:79 | PASS |
| D25 | F1.1 no write | `answers 404 to a POST, a PUT and a DELETE and leaves the state as written` at freshness.controller.test.ts:52, `expect(after).toBe(before)` | PASS |
| D26 | F1.2 tenth tile after « Historique », with the count, opens the tab, calm | `counts the late pages on a tenth tile after the history, calm, and the tile opens the memory tab` at apps/talos/site/src/App.memory.test.tsx:161, `toHaveLength(10)`, `toStrictEqual(['Historique', '7Mémoire'])`, `not.toContain(ALERT_TILE_CLASS)`, `toBe('/brain')` | PASS |
| D27 | F1.2 no count until loaded | `shows %s of late pages on the memory tile %s` at App.memory.test.tsx:185 (loading, failed, zero), `expect(tile.textContent).toBe(count === 'no count' ? 'Mémoire' : '0Mémoire')` | PASS |
| D28 | F1.3 above the search, folded, most late first, title, kind, date, tap opens | `lists the late pages above the search, folded until tapped, the most late first, each opening its page` at App.memory.test.tsx:200, `expect(section.open).toBe(false)`, `toBe('En retard · 7')`, the three ordered rows, `toBe(`/brain/page/${GREENHOUSE}`)` | PASS |
| D29 | F1.3 hidden when N is zero | `shows no late section when %s` at App.memory.test.tsx:228, `expect(tree.container.querySelector('details')).toBeNull()` | PASS |
| D30 | F1.4 no new screen, no new tab | **structural:** the site diff adds no route and no tab; `to: '/brain'` at TodayIndex.tsx:125 points at the existing tab | PASS |
| D31 | F2.1 `summarizedOn` by the rule, null for what is not an entity | pages.controller.test.ts:53, `toBeNull()` on a proposal and on a journal entry; pages.controller.test.ts:39 `expect(page.summarizedOn).toBe('2026-10-20')` | PASS |
| D32 | F2.2 « Résumé du <short day> » under the title | `says under the title of a page when its summary was written, calmly when the page is not late` at App.memory.test.tsx:240, `toBe('Résumé du mar. 20 oct.')`, `line.previousElementSibling?.querySelector('h1')?.textContent` is `Jardin`; `shows no summary line on what is not an entity` at :264 | PASS |
| D33 | F2.3 late page in the alert colour and in words | `says in words and in the alert colour that the summary of a late page is late` at App.memory.test.tsx:254, `toBe('Résumé du sam. 12 sept., en retard')`, `toContain(ALERT_TEXT_CLASS)` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | New write paths | Any? | `grep -nE "insert\(\|update\(\|delete\(\|onConflict\|transaction\("` on the changed source files returns only `Set.delete` (computed-sections.core.ts:68, memory-page.core.ts:75-76). The feature adds no table, no write and no route that writes. | PASS |
| E02 | `upsertEntityOperation` → `upsertEntity` (memory-entity-operations.service.ts:74), whose body value this commit changes | Check-then-write | The commit adds no decision computed from rows read earlier: `dropComputedLines(operation.body)` at memory-plans.core.ts:47 is a pure function of the received body. The `expectedVersion` check on that path predates the commit and is a question in Notes. | PASS |
| E03 | Per-process state | Module-level variables | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api files returns nothing. `COMPUTED_HEADING_LINES` (computed-sections.core.ts:48) is a frozen constant. | PASS |
| E04 | Concurrent proof | Rule held by a key | Step 2 found no rule held by a key in this commit, so no concurrent test is owed. | PASS |
| E05 | Cost of one page read, number of queries | Does it grow with the contained pages? | Counted by reading memory-page.service.ts: an entity that contains nothing makes 5 queries, as before (`findEntity` :66, `listFactsOf` and `listRelationsTouching` :68, `listRelationsTouching` and `listSlugsLinkingTo` :115-117). An entity that contains pages makes 8: plus `listEntitiesIn` and `listRelationsFrom` in one `Promise.all` (:47), then `listFactsOfEntities` (:51). Each takes every slug in one `inArray`; none is in a loop, so the count is fixed. An empty list is safe: drizzle 0.45 turns `inArray(column, [])` into `false`. | PASS |
| E06 | Cost of one page read, rows | Does it grow with the contained pages? | memory-containment.repository.ts:31 reads `select()` of every fact of every descendant, with no `learned_on` filter and no limit, and computed-sections.core.ts:96 then keeps 10. Case: a domain that contains 44 projects loads every fact row of those projects and of what they contain, `raw` text included, on each read of the domain page, to render at most 10 lines. The result is right; the rows read grow with the facts below the page. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |

## Blocking findings

- None.

## Non-blocking findings

- A08 — a body that carries only `## Faits récents` renders it before `## Comprend`.
- B11 — `CONTAINED_HEADING` and `HEADING_PREFIXES` are declared twice, in `pages.core.ts` and `computed-sections.core.ts`.
- B12 — the « Computed section » entry of `VOCABULARY.md` promises "never stored" with no `Held by:` line.
- B13 — `splitTitleLine` lives in `late-pages.core.ts`.
- B14 — `listEntitiesIn` writes its row type by hand.
- E06 — `listFactsOfEntities` reads every fact below the page to keep 10.

## Notes

- A00 — no plan was written. The spec is in the short form and the files were taken from the diff. `/technical-conception` would produce one.
- A16, A25 — C4.2 and D.2 are claims about the pull request body. No pull request exists for this branch yet, so they can only be read once it opens.
- **The three older sections on the same round trip (measured).** `entity.upsert` stores the lines of « Faits », « Historique » and « Relations » as received, and the next read inserts the rows again above them. Measured with the pure functions (`renderEntityPage` → `planEntityUpsert` → `renderEntityPage`, script in the scratchpad): stored body `# Jardin\n\n## Faits\n\n## Historique\n\n## Relations\n`, one fact `surface: 300 m2`, one history line, one `comprend` relation. After the rendered body is written back unchanged, the stored body holds `- surface: 300 m2`, `- ancien verger` and `- comprend → [[p/potager]]`, and the second read shows each of the three twice, while the `## Comprend` line and the `## Faits récents` line show once. Each further round trip adds one copy. This predates the branch (the body was stored as received before it), and `MEMORY-CONTRACT.md:70` now says so in words. The spec's sentence "as it does for « Faits », « Historique » and « Relations »" describes a strip that no code performs. The branch's own e2e test (agent-page.controller.test.ts:82) writes back a body holding `- surface: 300 m²` and the relation lines and asserts nothing about them. Does the agent strip those three sections before it calls `entity.upsert`? If it does not, this is a data defect on every page it rewrites, and the same `dropComputedLines` rule would cover it.
- `MEMORY-CONTRACT.md:22` still describes `memory_entity.body` as stored "with the lines of « Faits », « Historique » and « Relations » removed", and line 70 says `entity.upsert` stores them as received. Both are true only if every writer strips them first. Which one is the contract?
- `splitTitleLine` finds a title only when the markdown starts with `# ` (late-pages.core.ts:33). Measured: `splitTitleLine('\n# Jardin\n\ntexte')` answers `{ title: '', rest: '\n# Jardin\n\ntexte' }`, so the summary line would render above the title, against F2.2. Every seeded body starts with `# `. Do the bodies of the real memory start with `# `, or with a blank line after the front matter? Not measured here.
- « Faits récents » lists facts of section `history` as well as `facts` (computed-sections.core.test.ts:176, MEMORY-CONTRACT.md:66). The spec says "facts of the pages the entity contains" and does not name the section. Is a closed fact meant to show there?
- `dropComputedLines` drops only lines that start with `- `. Measured: `## Comprend\n* [[a]]\n  - [[b]]\n- [[c]]\n` keeps the `* ` line and the indented line. The renderer only ever writes `- `, so a round trip is unaffected.
- The `expectedVersion` check of `entity.upsert` (memory-plans.core.ts:35) is computed from a row read at memory-entity-operations.service.ts:67, and `upsertEntity` (memory-write.repository.ts:38) writes with `onConflictDoUpdate` and no version condition. It predates this commit (d98a860d). On Aurora DSQL the chunk runs in a transaction retried on a conflict (memory-changes.service.ts:170-178), which should re-read the version; that is inferred from the code, not measured, and no back-e2e test fires two upserts at once. Does a second writer with a stale `expectedVersion` get its 409 when both arrive together?
- `--changed def77d93` and `scripts/mutate-changed.sh def77d93` also ran the tests and mutants of files that the merges of main brought in. All passed.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
