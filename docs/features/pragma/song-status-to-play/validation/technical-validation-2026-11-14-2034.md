# Technical validation — a "to play" song status

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/nice-sagan-eczjqq
- Base: origin/main (diff base `efbd3f26627c214a63843ef3d25885880d523f8e`, the value of `origin/main` when the review started)
- Run at: 2026-11-14T20:52:53Z
- Round: 1
- Reviewed: 99352898d8ce858e08bdc8fe2966eaf4b2e7d936
- Touched workspaces: @borso-app/pragma (api, site, scripts)

The spec is in the short form (Goal, Data shape, Use cases, Out of scope; no Q.O.D., Changes or Test strategy). Category A is built from its Data shape and Use case bullets, with files from the plan's table. Category D walks the six use cases in order, split one claim per row.

3 use-case claims routed to /visual-validation; out of scope for this report: the chip's position "between In progress and Ideas" on screen (use case 3), the badge's "own tone" (use case 4), and 375 px (use case 6).

During the review, the branch moved to `220e0ff27` (`fix(meta): anchor the merge-deploys-prod hook to the project root`, touching only `.claude/settings.json`, `.github/workflows/ci.yml`, `.husky/pre-commit` and `scripts/check-hook-commands-are-anchored.sh`). `origin/main` moved to `9aaf0398a` (#333). No file under `apps/` differs between the reviewed SHA and the working tree, so the test runs below grade the reviewed SHA's app code. All `--changed` runs that are graded use the diff base `efbd3f26…`.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Data shape | `SONG_STATUSES` is `idea`, `to_play`, `wip`, `rehearsed`, `concert_ready`, in that order | apps/pragma/api/src/songs/songs.schema.ts:21 | `export const SONG_STATUSES = ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready'] as const;` | PASS |
| A02 | Data shape | `song.status` stays plain `text`, no migration | apps/pragma/api/src/songs/songs.schema.ts:31; diff file list | `status: text('status').notNull(),`. The diff adds no file under `drizzle/` or any migration. | PASS |
| A03 | Use case 1 | API accepts `to_play` on create and update, refuses others | apps/pragma/api/src/songs/songs.schema.ts:88, :130-131, :137 | `status: z.enum(SONG_STATUSES),` in `songFieldShape`; `songCreateInputSchema = songBaseSchema`; `songUpdateInputSchema = z.object(songFieldShape).partial()`; the find tool also reads `status: z.enum(SONG_STATUSES).optional()` | PASS |
| A04 | Use case 2 | Song form offers "To play" / "À jouer" | apps/pragma/site/src/routes/catalog/song-draft.core.ts:9, :19; site/src/components/molecules/SongClassificationFields.tsx:35-36; site/src/components/organisms/AddSongForm.tsx:120-126; site/src/i18n/en.json:194; fr.json:194 | `export const songStatuses = ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready'] as const;` · `to_play: 'catalog.statusToPlay',` · `options={songStatuses}` · `"statusToPlay": "To play"` / `"statusToPlay": "À jouer"` | PASS |
| A05 | Use case 3 | Catalogue filter chip "To play" / "À jouer", between "In progress" and "Ideas", `?filter=to_play` selects it, lists only `to_play` | apps/pragma/site/src/routes/catalog/catalog-page.core.ts:10-12, :52-54, :64-66; CatalogPage.tsx:42-44, :60, :116-123; en.json:164; fr.json:164 | `'wip',` `'to_play',` `'idea',` · `CATALOG_FILTERS.find((filter) => filter === rawFilter) ?? DEFAULT_FILTER` · `return status === 'all' \|\| song.status === status;` · `to_play: 'catalog.filterToPlay',` · `{CATALOG_FILTERS.map((option) => (` · `"filterToPlay": "To play"` / `"À jouer"` | PASS |
| A06 | Use case 4 | `to_play` status badge labelled "To play" / "À jouer", own tone | apps/pragma/site/src/components/molecules/StatusChip.tsx:6, :26; site/src/components/atoms/chip.variants.ts:12 | `to_play: 'catalog.statusToPlay',` · `<Chip tone={status}>{t(STATUS_LABEL_KEY[status])}</Chip>` · `to_play: 'bg-accent-soft text-accent-strong',` (no other tone uses `accent`) | PASS |
| A07 | Use case 5 | Audience pool marks a `to_play` song "not started yet" / "pas encore commencé" | apps/pragma/site/src/components/molecules/pool-song-row.core.ts:3; site/src/lib/queries/audience.utils.ts:25; en.json:823; fr.json:823 | `to_play: 'audience.notConcertReadyToPlay',` · `readonly status: 'idea' \| 'to_play' \| 'wip' \| 'rehearsed' \| 'concert_ready';` · `"notConcertReadyToPlay": "not started yet"` / `"pas encore commencé"` | PASS |
| A08 | Use case 6 | Every page works at 375 px. The plan says "Filter row already scrolls horizontally" | apps/pragma/site/src/routes/catalog/CatalogPage.tsx:114, :120 | `className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"` · `className="shrink-0"`. The plan's "already" claim holds in code; the rendered check belongs to /visual-validation | PASS |
| A09 | Out of scope | Setlist add-songs filters unchanged; `to_play` appears under "Not in setlist" | apps/pragma/site/src/components/organisms/add-songs.core.ts:17-22, :69-70 (not in the diff) | `if (filter === 'not-in-setlist') return !isInSetlist;` · `return song.status === STATUS_BY_FILTER[filter];` with no `to_play` entry | PASS |
| A10 | Plan | `VOCABULARY.md` › Song lists the new status | apps/pragma/VOCABULARY.md:1475-1478 | `` `status` is one of `idea`, `to_play`, `wip`, `rehearsed`, `concert_ready` `` | PASS |
| A11 | Plan | Seed script status union widened | apps/pragma/scripts/task-metrics/audit-seed.setup.ts:48 | `status: 'idea' \| 'to_play' \| 'wip' \| 'rehearsed' \| 'concert_ready';` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the diff | New identifiers are object keys and i18n keys (`to_play`, `statusToPlay`, `filterToPlay`, `notConcertReadyToPlay`); none abbreviated | PASS |
| B02 | Magic numbers / strings in named constants | read the diff | Every new literal sits in a named table (`SONG_STATUSES`, `songStatuses`, `CATALOG_FILTERS`, `STATUS_LABEL_KEY`, `NOT_CONCERT_READY_LABEL_KEY`, `FILTER_LABEL_KEY`) | PASS |
| B03 | No prose comments | read the diff | The diff adds no comment | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nE '\bas [A-Z]'` on changed files | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | one hit, prose in a test name: `songs.schema.test.ts:60 it('refuses an empty chart of any kind'` | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read the diff | The only new indexed read, `NOT_CONCERT_READY_LABEL_KEY[status]` (pool-song-row.core.ts:22), sits behind the `isNotConcertReady` type guard | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <12 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | Unused exports and files | `pnpm exec knip --workspace apps/pragma` | exit 0 (three configuration hints, no issue) | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B11 | Standards checklist (02): "a limit or a rule written in a site does not restate one the API enforces under another name" | read in full | `export const songStatuses = ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready'] as const;` at apps/pragma/site/src/routes/catalog/song-draft.core.ts:9 restates `SONG_STATUSES` at apps/pragma/api/src/songs/songs.schema.ts:21. The site's `songSchema` parses API songs with it (`status: z.enum(songStatuses)`, song-draft.core.ts:35, used by SongEditPage.tsx:83). This branch had to widen the list in five hand-kept places (site `songStatuses`, `StatusChip` keys, `chip.variants` tones, `PoolEntryView`, the seed type), and the sixth it missed is C02. `SONG_ORIGINS` already lives in `@domain/song-origin.core`, and both sides import it there (songs.schema.ts:19). Introduced: pre-existing, extended by this branch; Fix size: 5 call sites | FAIL (non-blocking) |
| B12 | Standards checklist (03): "a derived type is derived, so … a response from the Hono client, rather than being written out by hand beside the thing it mirrors" | read in full | `readonly status: 'idea' \| 'to_play' \| 'wip' \| 'rehearsed' \| 'concert_ready';` at apps/pragma/site/src/lib/queries/audience.utils.ts:25 hand-copies the API's `PoolSongStatus` (`api/src/audience/pool.core.ts:3`). Introduced: pre-existing, edited by this branch; Fix size: one line | FAIL (non-blocking) |
| B13 | Standards checklist (01): a `VOCABULARY.md` definition is still true; a promise carries `Held by:` | read the changed section | VOCABULARY.md:1475-1478 matches `SONG_STATUSES` and `text('status')`. The new sentence is a definition, not a behavioural promise | PASS |
| B14 | Standards checklist (01): `select…` returns what its verb says | read in full | `selectNotConcertReadyLabelKey` returns a key or `null` (pool-song-row.core.ts:20-23) | PASS |
| B15 | Standards checklist (09): a key's dotted path names the screen and the element | read the i18n diff | `catalog.filterToPlay`, `catalog.statusToPlay`, `audience.notConcertReadyToPlay` follow their siblings | PASS |
| B16 | Standards checklist (10): test name states behaviour and condition | read the test diff | `'reads the to play filter from the address'` (catalog-page.core.test.ts:34); `'marks a song the band chose to play and has not started'` (pool-song-row.core.test.ts:10) | PASS |
| B17 | Standards checklist (08): more than two visual variants go through `cva` | read in full | The new tone is a `cva` variant (chip.variants.ts:4, :12) | PASS |
| B18 | Standards checklist (05): a route composes organisms and owns no layout primitive | read CatalogPage.tsx | The diff adds one key to `FILTER_LABEL_KEY` (CatalogPage.tsx:43) and no markup | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed efbd3f26627c214a63843ef3d25885880d523f8e --reporter=verbose --coverage` | 0. 73 files, 462 tests, coverage 100/100/100/100. The run included the feature's own files `songs.schema.test.ts`, `catalog-page.core.test.ts`, `song-draft.core.test.ts` and `pool-song-row.core.test.ts` | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed efbd3f26627c214a63843ef3d25885880d523f8e` | 1. `FAIL \|back-e2e-assistants\| api/src/songs/songs-tools.controller.test.ts > songs tools (back-e2e) > answers the refusal codes the routes answer`. Expected `"status": "Invalid option: expected one of \"idea\"\|\"wip\"\|\"rehearsed\"\|\"concert_ready\""`, received `"… \"idea\"\|\"to_play\"\|\"wip\"\|\"rehearsed\"\|\"concert_ready\""` at songs-tools.controller.test.ts:146. The hard-coded text is at songs-tools.controller.test.ts:151 and was not updated. Tally: 1 failed, 489 passed (490) | FAIL (blocking) |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh efbd3f26… apps/pragma` | 0. pool-song-row.core.ts, audience.utils.ts, catalog-page.core.ts, song-draft.core.ts: 299 killed, 0 survived, 100.00 | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` touched have a sibling test | `audience.utils.ts` → `audience.utils.test.ts` ran in C01 (`site/src/lib/queries/audience.utils.test.ts > selectHistoryPollInterval …`) | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | 1. API accepts `to_play` on create | `it('accepts every status in the rehearsal pipeline and nothing else'` at apps/pragma/api/src/songs/songs.schema.test.ts:94. The loop over `['idea', 'to_play', …]` asserts `expect(songCreateInputSchema.safeParse(song({ status })).success).toBe(true);` (:96) | PASS |
| D02 | 1. API accepts `to_play` on update | **structural:** `songUpdateInputSchema = z.object(songFieldShape).partial()` (songs.schema.ts:131) reads the same `status: z.enum(SONG_STATUSES)` (:88) that D01 pins through `songBaseSchema`. No update-only status code exists for a test to miss | PASS |
| D03 | 1. API still refuses any status outside the list | songs.schema.test.ts:98 `expect(songCreateInputSchema.safeParse(song({ status: 'retired' })).success).toBe(false);` and :135 `expect(songUpdateInputSchema.safeParse({ status: 'retired' }).success).toBe(false);` | PASS |
| D04 | 2. Song form offers "To play" | No test fails when `'to_play'` is removed from `songStatuses` (song-draft.core.ts:9) and `SONG_STATUS_LABEL_KEY` (:19). The only test on the list, `it('carries a translation key for every status'` at song-draft.core.test.ts:68, asserts `expect(Object.keys(SONG_STATUS_LABEL_KEY)).toEqual([...songStatuses]);`, which compares the two copies with each other. It still passes when both lose `to_play`. Typecheck does not hold it either. `Song` is `z.infer` of the site's own `songSchema`, and a narrower `SongSavePayload.status` is assignable to the API input. The failing case is to delete `'to_play'` at song-draft.core.ts:9 and :19. Core tests and typecheck stay green, and the form no longer offers "To play" | FAIL (blocking) |
| D05 | 3. Catalogue shows a "To play" filter chip | `it('reads the to play filter from the address'` at apps/pragma/site/src/routes/catalog/catalog-page.core.test.ts:34, `expect(parseCatalogFilter('to_play')).toBe('to_play');` (:35). That would answer `'all'` if `'to_play'` left `CATALOG_FILTERS`, which CatalogPage.tsx:116 maps into the chips. `FILTER_LABEL_KEY … satisfies Readonly<Record<CatalogFilter, string>>` (CatalogPage.tsx:46) fails typecheck if the label is missing | PASS |
| D06 | 3. The chip lists only `to_play` songs | `it("matches only the song's own status"` at catalog-page.core.test.ts:82, `expect(isMatchingStatusFilter(song, 'rehearsed')).toBe(true);` / `expect(isMatchingStatusFilter(song, 'wip')).toBe(false);` (:83-84). The rule is one equality with no per-status branch: `song.status === status` (catalog-page.core.ts:65) | PASS |
| D07 | 3. `?filter=to_play` in the address selects it | catalog-page.core.test.ts:35 `expect(parseCatalogFilter('to_play')).toBe('to_play');` | PASS |
| D08 | 4. A `to_play` song's badge is labelled "To play" | **structural:** the catalogue's songs come typed from the Hono client (`useSongsList`, `api.api.songs…`), and `StatusChip`'s `status: SongStatus` is `keyof typeof STATUS_LABEL_KEY` (StatusChip.tsx:12). Dropping `to_play: 'catalog.statusToPlay'` (:6) makes `song.status` unassignable at SongCard, and `pnpm … run typecheck` (B08) fails | PASS |
| D09 | 5. Audience pool marks a `to_play` song "not started yet" | `it('marks a song the band chose to play and has not started'` at apps/pragma/site/src/components/molecules/pool-song-row.core.test.ts:10, `expect(selectNotConcertReadyLabelKey('to_play')).toBe('audience.notConcertReadyToPlay');` (:11). The English and French values are held by i18n parity (`the shipped catalogs are in parity`, ran in C01) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff add or change a write path or module-level state? | `git diff origin/main...HEAD --name-only` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`. The only api source change is the `SONG_STATUSES` literal (songs.schema.ts:21). No `insert(`, `update(`, `delete(`, `onConflict`, `transaction(`, `new Map`, `new Set` or module `let` in the diff. Existing song writes are unchanged and only accept one more enum value | PASS |

## Blocking findings

- C02 — `songs-tools.controller.test.ts:151` still hard-codes the four-status zod error text, so `test:e2e` fails on `answers the refusal codes the routes answer`.
- D04 — no test fails if the song form stops offering `to_play`. The only list test compares `SONG_STATUS_LABEL_KEY` with `songStatuses`, two copies of the same list.

## Non-blocking findings

- B11 — the site restates the API's `SONG_STATUSES` as `songStatuses` (song-draft.core.ts:9) and parses API songs with it. Moving the list to `@domain/`, as `SONG_ORIGINS` already is, would let one list replace the five copies this branch widened by hand.
- B12 — `PoolEntryView.status` (audience.utils.ts:25) is written out by hand instead of derived from the API's `PoolSongStatus`.

## Notes

- Does a stale browser tab matter for this release? The site parses a single song with its own `z.enum(songStatuses)` (song-draft.core.ts:35, SongEditPage.tsx:83). A tab that loaded the pre-merge bundle and then opens the edit page of a song another member set to `to_play` gets a failed parse there. The plan's Risks section covers only the other direction (new site, old API). Whether pragma's service worker (`site/public/sw.js`) can keep an old bundle alive across a deploy was not checked.
- Fixing B11 by moving the list to `@domain/` would make D04 hold through the type system, as D08 already does, and would remove the copy behind C02. That only applies if the error text in the test is built from the shared list.

## Verdict: FAIL
