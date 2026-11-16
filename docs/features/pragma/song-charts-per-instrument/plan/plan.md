# Plan for song charts per instrument

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible. The plan either named the risk and we missed mitigating it, did not name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

One question blocks `/implementation`, under *Open questions*. The spec's `get_song` summary shape overruns a tool budget the repository already gates (measured). Every other row below is decided.

Paths are relative to `apps/pragma/` unless they start with `scripts/`, `docs/` or `.claude/`.

## Data shape

```ts
// domain/input-limits.core.ts (moved here from the spec's songs.schema.ts, see Q-limits below)
export const SONG_CHARTS_MAX = 6;
export const SONG_CHART_LABEL_MAX_LENGTH = 64;
export const SONG_CHARTS_MAX_ENCODED_BYTES = 1_000_000;

// api/src/songs/songs.schema.ts
songTable.charts = text('charts');                       // nullable, no default
legacyChordChartSchema                                   // today's three-kind union, read only for `chart`
chordChartSchema                                         // the union, each arm spread with
  //   instrumentIds: z.array(z.guid()).transform(listEachInstrumentOnce)
  //   label: z.string().trim().max(SONG_CHART_LABEL_MAX_LENGTH).nullable().transform(nullWhenEmpty)
songChordChartsRowSchema = z.array(chordChartSchema)     // read side, no budget refine
songChordChartsSchema = songChordChartsRowSchema.max(SONG_CHARTS_MAX).refine(isWithinChartsByteBudget)
songFieldShape.charts = songChordChartsSchema            // no .default() here (zod 4 keeps it inside .partial())
songBaseSchema.charts = songFieldShape.charts.default([])
songChartToolInputSchema                                 // the union with instruments?: referenceSchema[], label?: string | null
songSaveToolInputSchema.charts = z.array(songChartToolInputSchema).max(SONG_CHARTS_MAX).optional()

// api/src/songs/songs.repository.ts
type SongChart = z.infer<typeof chordChartSchema>;       // { kind, text | s3Key, instrumentIds, label }
SongDecodedColumns.charts: SongChart[];                  // `chart` leaves SongRow and every response

// api/src/songs/song-charts.core.ts
resolveSongCharts(storedCharts: unknown | null, storedLegacyChart: unknown | null): SongChart[]
dropInstrumentFromCharts(charts: readonly SongChart[], instrumentId: string): SongChart[]
isWithinChartsByteBudget(charts: readonly unknown[]): boolean

// site/src/routes/catalog/song-draft.core.ts
interface SongChartCardDraft {
  readonly kind: SongChartKind;          // 'none' | 'chordpro' | 'pdf' | 'image'
  readonly chordproText: string;
  readonly pdfS3Key: string;
  readonly imageS3Key: string;
  readonly instrumentIds: readonly string[];
  readonly label: string;
}
SongDraftState.charts: SongChartCardDraft[];             // replaces chartKind, chordproText, pdfS3Key, imageS3Key

// site/src/routes/catalog/opening-chart.core.ts
selectOpeningChartIndex(charts, heldInstrumentIds): number   // -1 when charts is empty
isChartSwitcherShown(chartCount: number): boolean             // true from 2
```

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q where the charts live (c) | New nullable `charts` text column, `chart` kept and frozen | `api/src/database/migrations/0031_song_charts.sql` (the spec's SQL verbatim), `songTable.charts` in `api/src/songs/songs.schema.ts` | `scripts/check-migration-sql-dsql-compat.sh` with no argument exits 0 once the file sits in the migrations folder |
| Q migration (b) | Read-time lift of `chart` when `charts` is null | `resolveSongCharts` in `api/src/songs/song-charts.core.ts`, called once by `rowToSong` in `songs.repository.ts`. `PROJECTION` selects both columns | `song-charts.core.test.ts` covers null `charts` lifting `chart`, both null giving `[]`, `'[]'` not falling back |
| Q migration, "every write sets `charts`" | `encodeInsert` writes `charts` and never `chart`. `encodeUpdate` writes `charts` when the update carries it | `songs.repository.ts` | `grep -n "chart:" api/src/songs/songs.repository.ts` lists only `charts` writes. See the risk on partial updates |
| Q how many (6) and the byte budget | Limits in `domain/input-limits.core.ts`. `songChordChartsSchema` applies `.max` and the refine. Reads parse with `songChordChartsRowSchema`, which skips the re-encode | `songs.schema.ts`, `song-charts.core.ts` | `songs.controller.test.ts` answers 400 on seven charts and on a list over the budget |
| Q label | Trimmed, up to 64, empty stored as null | `chordChartSchema` label transform. Form input caps with `maxLength={SONG_CHART_LABEL_MAX_LENGTH}` | `songs.schema.test.ts` stores `'  '` as null and refuses 65 characters |
| Q pill text | Names in instrument order joined by " + ", or "All instruments", then " · " and the label | `describeChordChartTitle(chart, instruments, everyInstrumentText)` in `site/src/routes/catalog/chart-title.utils.ts` | `chart-title.utils.test.ts` covers names, no names, a label, an unknown id, every id unknown |
| Q order | Move up and move down buttons on each card | `moveChartCard(cards, index, offset)` in `song-draft.core.ts`, buttons in `SongChartFields.tsx` | `song-draft.core.test.ts` moves a card and refuses to move past either end |
| Q which opens (b) | Named match ranks above a chart for every instrument, then first in order | `selectOpeningChartIndex` in `site/src/routes/catalog/opening-chart.core.ts` | `opening-chart.core.test.ts` covers the seven cases the spec's test strategy names |
| Q setlist lineup | Entry-resolved lineup in the entry sheet and the setlist scene | `instrumentsHeldBy(resolveLineup(song.defaultLineup, entry.lineupOverride), memberId)` from `domain/lineup.core.ts`, read in `SetlistEntrySheet.tsx` and `SetlistScenePage.tsx` | `SetlistScenePage.test.tsx` opens a Basse chart for an entry whose override moves the member to Basse |
| Q deleted instrument | Drop the id in the same transaction | `dropInstrumentFromSongChartsWithin` in `api/src/instruments/instruments.repository.ts`, called first inside `deleteInstrumentWithLinks`, using `dropInstrumentFromCharts` | `instruments.controller.test.ts` deletes an instrument and reads the song's chart with `instrumentIds: []` |
| Q scene views ChordPro only | Filter to ChordPro, then pick the opening chart over that filtered list | `selectChordProCharts(charts)` in `site/src/routes/catalog/chart-kind.utils.ts` | `chart-kind.utils.test.ts`. `SongScenePage.test.tsx` shows the ChordPro chart for a song whose Guitare chart is a PDF |
| Q tapped pill per visit | Component state, never stored | `useChartSwitch` in `site/src/routes/catalog/chart-switch.hook.ts` holds `pickedIndex: number \| null`. The shown index is the pick when set, else the opening chart. No `useEffect` | `SongDetailPage.test.tsx` switches pills. A reload opens on the opening chart again |
| Q no `chart` mirror | Responses carry `charts` only | `projectSongForTool`, `SongRow` | `grep -rn "\.chart\b" api/src site/src --include=*.ts --include=*.tsx` returns test fixtures only, none after slice 5 |
| Result, song page | Switcher above the chart, transpose kept across pills | `SongChartPreviews.tsx` renders `ChordChartSwitcher` above `ChartPreviewCards`. `ChartPreviewCards` keeps one instance across pills, so `semitones` survives | `SongDetailPage.test.tsx` transposes, switches, and reads the same offset |
| Result, entry sheet | Same rule against the entry lineup | `SetlistEntrySheet.tsx` (prop `chart` becomes `charts`), `SetlistEditor.tsx` passes `openedSong.charts` | `SetlistEntrySheet.test.tsx` |
| Result, song scene and setlist scene | Stage-tone switcher under the header | `ChordChartSwitcher` with `tone="stage"`. `SectionTabs.tsx` gains a `tone` prop (`paper` default, `stage`), a file the spec does not list | `SongScenePage.test.tsx`, `SetlistScenePage.test.tsx`. Visual check at 375 px |
| Result, setlist scene entry change | Opening chart chosen again, transpose reset | `goToIndex` calls `resetPick()` from `useChartSwitch` next to `setSemitones(0)` | `SetlistScenePage.test.tsx` taps a pill, moves to the next entry, reads its opening chart |
| Result, edit form | One card per chart, chips, label, move, remove, Add a chart disabled at six | `SongChartFields.tsx` maps cards. `InstrumentToggleGroup.tsx` (new molecule on `ToggleButtonGroup`, `selectionMode="multiple"`). `SongEditForm.tsx` wires `charts` | `SongEditForm.test.tsx` adds, picks two chips, moves up, saves the payload, disables Add at six |
| Result, edit form ids | Unique element ids per card | `song-chord-text-${index}` in `SongChartFields.tsx` | `grep -rn "song-chord-text" apps/pragma` shows no bare id. `scripts/task-metrics/task-walks.setup.ts` taps `#song-chord-text-0` |
| Result, tonality fill | From any ChordPro card | The existing fill in `SongEditForm.tsx` runs on any card's text change and fills only empty tonality fields | `SongEditForm.test.tsx` pastes into the second card and reads the tonality |
| Result, empty card dropped | A card with kind `none` is dropped on save. A file card whose file was removed is dropped too (inferred, so the form never sends an `s3Key` the API refuses) | `chartsFromDraft` in `song-draft.core.ts` | `song-draft.core.test.ts` |
| Result, catalogue rows | Kind icon of the first chart | `extractChartKind(song.charts[0])` in `catalog-page.core.ts` | `catalog-page.core.test.ts` |
| Result, assistant tools | `get_song` and `save_song` read and write `charts` by instrument name | `projectSongForTool` in `song-tool.core.ts`. `resolveChartInstrumentsOrRefuse` in `songs.service.ts` reads `readLineupNames()` once and maps every name with `pickReference`, which throws the same `ToolRefusedError` an unknown lineup instrument does. `buildSongCreate` and `buildSongUpdate` take it. Descriptions in `songs-tools.controller.ts` | `songs-tools.controller.test.ts` stores an id from a name and refuses an unknown name |
| MCP byte budget | The resolved list passes `songChordChartsSchema.parse` before the write | `resolveChartInstrumentsOrRefuse` | `songs-tools.controller.test.ts` refuses seven charts |
| Vocabulary and invariants | Chord chart text, new Opening chart term | `VOCABULARY.md`, `api/src/songs/INVARIANTS.md`, `api/src/instruments/INVARIANTS.md`, `api/src/uploads/INVARIANTS.md`, `site/src/routes/catalog/INVARIANTS.md` | Lines listed under *INVARIANTS lines* |
| Analytics `chord_chart_switched` | Sent on a tap on a pill other than the shown one, with `surface` and `fromOpening` | `ProductEventName` in `site/src/observability/product-event.adapter.ts`, sent from `useChartSwitch.pick` | `SongDetailPage.test.tsx` spies `recordProductEvent` |
| i18n keys | The spec's table, plus the `scene.noChordpro` French fix | `site/src/i18n/en.json`, `fr.json`. `catalog.chartLabelPlaceholder` reads the same in both, so it gets an `IDENTICAL_BY_DESIGN` row in `site/src/i18n/i18n-parity.core.test.ts` | `i18n-parity.core.test.ts` |
| Layout at 375 px | Cards stack, chips wrap, 44 px targets, switcher scrolls sideways | Mobile-first classes in `SongChartFields.tsx` and `InstrumentToggleGroup.tsx` | `/visual-validation` step 8 |
| Test seed | A song with two charts, one for Guitare | `api/src/__test/test-seed.service.ts` adds a Guitare chart holding the tab block of *Afterglow* (`SEED_SONGS[3]`). Not `titleOf(2)` nor the newest song, which `tool-budget.test.ts` reads | `tool-budget.test.ts` stays green |
| Callers the spec does not list | Everything else that writes or reads `chart` | `scripts/task-metrics/audit-seed.setup.ts`, `band-session.setup.ts`, `route-measures.setup.ts`, `task-walks.setup.ts`. `lib/queries/song-cache.core.ts` (`charts: []`) | `grep -rnE "\bchart\b" scripts/task-metrics api/src/__test` shows no `chart:` key |
| Persisted query cache | Songs persist seven days in `localStorage`. A cache written before the deploy has no `charts`, and `song.charts.map` throws | `PERSISTED_CACHE_SHAPE_VERSION` goes from `'1'` to `'2'` in `site/src/lib/query-client.setup.ts`, a file the spec does not list | `grep -n SHAPE_VERSION site/src/lib/query-client.setup.ts` reads `'2'` |
| Out of scope | PDF and image in scenes, a stored pick, chart per member, the file of a removed chart, list payload size | (out of scope) | None |

### Pattern coherence

No dependency is added. `ToggleButtonGroup` and `Tabs` come from `react-aria-components`, already installed. The picked pill is `useState` in one hook, the pattern every scene already uses for `semitones`. No second state pattern appears.

### Blueprints for new files

| New file | Blueprint |
|---|---|
| `api/src/database/migrations/0031_song_charts.sql` | none (SQL takes no marker), modelled on `0007_spotify_track_id.sql` |
| `api/src/songs/song-charts.core.ts` | `core-projection` (the lift, as `normalizeLineup` and `resolveInstrumentFamily` do) |
| `api/src/songs/song-charts.core.test.ts` | `test-pure-unit` |
| `site/src/routes/catalog/opening-chart.core.ts` | `core-decision` |
| `site/src/routes/catalog/opening-chart.core.test.ts` | `test-pure-unit` |
| `site/src/routes/catalog/chart-title.utils.ts` | `utils-pure-module` |
| `site/src/routes/catalog/chart-title.utils.test.ts` | `test-pure-unit` |
| `site/src/routes/catalog/chart-switch.hook.ts` | `hook-stateful-helper` |
| `site/src/components/organisms/ChordChartSwitcher.tsx` | `organism-presentational` |
| `site/src/components/organisms/ChordChartSwitcher.test.tsx` | `test-component-render` |
| `site/src/components/molecules/InstrumentToggleGroup.tsx` | `molecule-presentational` |
| `site/src/components/molecules/InstrumentToggleGroup.test.tsx` | `test-component-render` |

Changed files keep their existing markers. The new functions inside them follow the marker the file already uses: `schema-table-and-input` in `songs.schema.ts`, `repository-json-column` in `rowToSong`, `core-projection` in `song-tool.core.ts`, `core-form-schema` in `song-draft.core.ts`, `core-lookup-table` in `chart-kind.utils.ts`.

### INVARIANTS lines

- `api/src/songs/INVARIANTS.md`, *Chord chart*. Replace "The column is nullable" with the spec's list rule, and write the write rule as "a create always sets `charts`, an update sets it when it carries it, and nothing writes `chart`" (see the risk on partial updates). Add:
  - `Held by: api/src/songs/songs.controller.test.ts › persists each of the three chord-chart variants with its instruments and label` (the existing title, renamed)
  - `Held by: api/src/songs/songs.controller.test.ts › reads a row holding only the old chart as one chart for every instrument`
  - `Held by: api/src/songs/songs.controller.test.ts › refuses a seventh chart and a list over the byte budget`
  - `Held by: api/src/songs/song-charts.core.test.ts › lifts the old chart when the list was never written`
  - `Held by: api/src/songs/song-charts.core.test.ts › keeps an empty list rather than falling back`
- `api/src/instruments/INVARIANTS.md`, *Instrument*. The delete bullet names the charts and the default lineups. Add `Held by: api/src/instruments/instruments.controller.test.ts › drops a deleted instrument from every song chart, and keeps the chart`.
- `api/src/uploads/INVARIANTS.md`. "`song.chart`" becomes "a chart in `song.charts`".
- `site/src/routes/catalog/INVARIANTS.md`, new *Opening chart* section with the rule. Add one `Held by` per case of `opening-chart.core.test.ts`, and `Held by: site/src/routes/catalog/chart-title.utils.test.ts › reads All instruments when no name is left`.
- `apps/pragma/VOCABULARY.md`. *Chord chart* text and *Lives in* `charts`. New *Opening chart* entry.

## Implementation slices

Run in order. Each slice ends green on its own command before the next starts. Slices 1 and 2 typecheck together, because `SongRow.charts` replaces `chart` in one move.

1. **Domain and schema.** `domain/input-limits.core.ts` limits. `songs.schema.ts` column, schemas, no default inside `songFieldShape`. `song-charts.core.ts` with its test. `songs.schema.test.ts` cases (label trim, dedupe, seven refused, budget, `.partial()` adds no `charts`).
   Verify: `cd apps/pragma && npx vitest run --project core api/src/songs/song-charts.core.test.ts api/src/songs/songs.schema.test.ts domain/input-limits.core.test.ts`. The pre-push coverage gate then holds `song-charts.core.ts` at 100 % per file.
2. **API and migration.** `0031_song_charts.sql`. `songs.repository.ts` (`PROJECTION`, `rowToSong`, `encodeInsert`, `encodeUpdate`). `songs.service.ts` (`valuesFromCreate`, `insertSuggestedSong`). `instruments.repository.ts` scrub. `test-seed.service.ts`. The four `scripts/task-metrics/*.setup.ts` callers. The back-end tests and the three API INVARIANTS files.
   Verify: `pnpm --filter @borso-app/pragma typecheck` (site errors are expected until slice 4, so read only `api/`, `domain/` and `scripts/` lines), `scripts/check-migration-sql-dsql-compat.sh`, then `cd apps/pragma && DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) npx vitest run --project back-e2e api/src/songs/songs.controller.test.ts api/src/instruments/instruments.controller.test.ts api/src/members/members.controller.test.ts api/src/database/migrations.audit.test.ts`
3. **MCP tools.** `songChartToolInputSchema`, `songSaveToolInputSchema`, `songCreateFieldsSchema` omits `charts`. `projectSongForTool`. `resolveChartInstrumentsOrRefuse` in `buildSongCreate` and `buildSongUpdate`. Descriptions.
   Verify: `cd apps/pragma && npx vitest run --project core api/src/songs/song-tool.core.test.ts api/src/mcp/tool-coverage.test.ts`, then `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) npx vitest run --project back-e2e-assistants api/src/songs/songs-tools.controller.test.ts api/src/mcp/tool-budget.test.ts api/src/mcp/mcp.controller.test.ts`
4. **Site edit form.** `song-draft.core.ts` (site `songSchema.charts`, cards, `chartsFromDraft`, `moveChartCard`, payload). `InstrumentToggleGroup.tsx`. `SongChartFields.tsx`. `SongEditForm.tsx`. `song-cache.core.ts`. i18n keys and the parity row. `PERSISTED_CACHE_SHAPE_VERSION`. `task-walks.setup.ts` selector.
   Verify: `cd apps/pragma && npx vitest run --project core site/src/routes/catalog/song-draft.core.test.ts site/src/components/organisms/SongEditForm.test.tsx site/src/components/molecules/InstrumentToggleGroup.test.tsx site/src/lib/queries/song-cache.core.test.ts site/src/i18n/i18n-parity.core.test.ts`
5. **Site viewers.** `opening-chart.core.ts`, `chart-title.utils.ts`, `chart-kind.utils.ts`, `chart-switch.hook.ts`, `SectionTabs.tsx` tone, `ChordChartSwitcher.tsx`, `SongChartPreviews.tsx`, `SongDetail.tsx`, `SetlistEntrySheet.tsx`, `SetlistEditor.tsx`, `SongScenePage.tsx`, `SetlistScenePage.tsx`, `catalog-page.core.ts`, `product-event.adapter.ts`. Site INVARIANTS and VOCABULARY.
   Verify: `pnpm --filter @borso-app/pragma typecheck`, `pnpm --filter @borso-app/pragma lint`, `cd apps/pragma && npx vitest run --project core site/src/routes/catalog site/src/routes/setlists site/src/components/organisms site/src/components/molecules`, then `pnpm --filter @borso-app/pragma dev` and the visual steps under gate 9.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| **Spec contradiction.** The spec's `get_song` summary `{ kind, instruments: [], label: null }` overruns `READ_BUDGETS` and `TASK_BUDGETS`. "who plays bass on a song" spends 464 of 500 characters today (measured this session). `"chart":"chordpro"` (17 characters) becoming `"charts":[{"kind":"chordpro","instruments":[],"label":null}]` (60) gives 507 | high | Blocked on the open question. Recommended shape omits `instruments` when empty and `label` when null, as `keepFilledList` does for `tags`, which costs 30 characters and lands at 477 (inferred from the character counts) | `tool-budget.test.ts` fails with the call and its size |
| Tool list grows past 19 000 characters with the `charts` input schema and longer descriptions. Today 17 621 (measured), so 1 379 remain | medium | Keep descriptions to one added clause. If the union still overruns, flatten `songChartToolInputSchema` to one object with `kind` as an enum and optional `text` and `s3Key`, refined, which `compactInputSchema` renders shorter. Raising the cap is the operator's call | `tool-budget.test.ts` › keeps the tool list an assistant reads before any call within its budget |
| A `.default([])` on `songFieldShape.charts` survives `.partial()` in zod 4, so a PUT carrying only `defaultLineup` (the lineup editor, `SongDetail.tsx`) writes `charts: []` and wipes every chart | high | The default lives in `songBaseSchema` only, as `chart` does today (`docs/knowledge/zod-4-changes-what-an-api-accepts-and-answers.md`) | `songs.schema.test.ts` asserts `songUpdateInputSchema.parse({ defaultLineup: {} })` has no `charts` key. `songs.controller.test.ts` saves a lineup and reads the charts unchanged |
| Rollback. The old Lambda's `PROJECTION` never selects `charts` and its writes never set it, so it runs on the new table (verified in `songs.repository.ts`). A song edited under the new code keeps a stale `chart`, which the old code shows. A `chart` edit made under the old code during a rollback is hidden after the roll-forward for a song whose `charts` is set | medium | Accepted by the spec's no-mirror decision. No data is lost, both columns stay | After any rollback, `APP=pragma scripts/db-read.sh "SELECT id, title FROM song WHERE charts IS NOT NULL AND chart IS NOT NULL"` lists the songs to check by hand |
| Null-`charts` fallback misreads production rows | high | `resolveSongCharts` parses `chart` with `legacyChordChartSchema` and returns `[{ ...chart, instrumentIds: [], label: null }]`. A preview clones the prod schema (`docs/knowledge/dsql-clone-from-prod.md`), so the PR preview reads the 52 real charts through the fallback | A parse failure throws in `rowToSong`, answers 500 and reaches Sentry. On the preview, the catalogue shows the chart icon on the same rows as prod |
| **Spec wording contradiction.** "Every write sets `charts`" is false for a partial update that omits it (the lineup editor, `save_song` changing a title). Such a row keeps `charts` null and keeps falling back, which is correct | low | The invariant is written as "a create always sets `charts`, an update sets it when it carries it". No behaviour changes | `songs.controller.test.ts` saves a lineup on a legacy row and still reads its one chart |
| Instrument delete leaves an id in `charts`, or runs outside the transaction | medium | `dropInstrumentFromSongChartsWithin` runs inside `deleteInstrumentWithLinks`, before the instrument row goes, with a `LIKE` on `charts` like the lineup scrub. Rows with `charts` null hold no id | `instruments.controller.test.ts` new case. A DSQL commit conflict retries the whole transaction, as today |
| `save_song` contract change. An assistant that sends `chart` (an old tool list) has the key stripped by `z.object`. A create succeeds without its chart, and an update naming only `chart` is refused as `empty-update` | low | Clients list tools at each session start, and the description names `charts` | `songs-tools.controller.test.ts` asserts the tool list carries `charts` and no `chart` |
| An old browser tab posts `chart` from the add-song form. The key is stripped and the song is created with no chart | low | Accepted under the spec's no-mirror decision. The window is one open tab across a deploy | None automatic. The member sees the empty Chords tab and pastes again |
| A persisted query cache from before the deploy has no `charts`. New code calls `song.charts.map` on `undefined` and the page throws, offline reading included | high | Bump `PERSISTED_CACHE_SHAPE_VERSION` to `'2'`, which drops the old cache once at first load | `SongDetailPage` error boundary reports to Sentry. A preview opened in a browser that held the prod cache shows it |
| `save_song` bypasses the byte budget, because `parseToolFields` runs on fields without `charts` | medium | The resolved list passes `songChordChartsSchema.parse` in `resolveChartInstrumentsOrRefuse` | `songs-tools.controller.test.ts` refuses seven charts. DSQL error 54000 in Sentry |
| Scene views pick the opening chart over every chart, so a Guitare PDF wins and the scene shows "No ChordPro chart" next to a ChordPro chart | medium | Filter with `selectChordProCharts` first, then call `selectOpeningChartIndex` | `SongScenePage.test.tsx` case |
| A pill switch remounts `ChartPreviewCards` and resets the transpose | low | The switcher sits outside `ChartPreviewCards`, and the shown chart is a prop, with no `key` on the chart index | `SongDetailPage.test.tsx` transposes then switches |
| A refetch reorders or shrinks the list while a pill is picked, and the pick points at another chart or past the end | low | `useChartSwitch` ignores a pick at or past the list length and shows the opening chart | `opening-chart.core.test.ts` or the hook probe test |
| The site `songSchema` drifts from the API and `SongEditPage` fails its parse on every song | medium | The site schema accepts exactly the API output (`instrumentIds: string[]`, `label: string \| null`). The limits come from `@domain/input-limits.core` | `SongEditForm.test.tsx` and `song-edit-page.core.test.ts` parse a fixture in the API shape |
| The form lets through what the API refuses (a seventh card, a long label, an emptied file card) | medium | Add a chart disabled at `SONG_CHARTS_MAX`, label `maxLength`, empty and emptied cards dropped | A 400 on `PUT /api/songs/:id` from the form, as the spec's zero-defect list says |
| Unique card ids break the task-metrics walk on `#song-chord-text` | low | `task-walks.setup.ts` taps `#song-chord-text-0` | `pnpm --filter @borso-app/pragma task-metrics` reports `savedAsChordPro: true` |
| While the signed-in member loads, the spec shows the first chart, then the opening chart replaces it. A non-holder can see one chart then another | low | Follow the spec. The hook computes the opening chart only once the member is known | `SongDetailPage.test.tsx` renders with the member pending, then resolved |
| The seeded second chart lands on a song the budget test reads and overruns it | low | Seed it on *Afterglow*, which `tool-budget.test.ts` reads through no call | `tool-budget.test.ts` |
| The French `catalog.chartLabelPlaceholder` equals the English one and fails the parity gate | low | `IDENTICAL_BY_DESIGN` row with its reason | `i18n-parity.core.test.ts` |

## Code-quality self-check

- [ ] Type assertions are only `as const` and `as unknown`. `rowToSong` narrows `JSON.parse` output through the schemas.
- [ ] No `any`.
- [ ] No abbreviations or one-letter locals outside trivial loop indices.
- [ ] Magic numbers and strings extracted to named constants (`SONG_CHARTS_MAX`, `SONG_CHART_LABEL_MAX_LENGTH`, `SONG_CHARTS_MAX_ENCODED_BYTES`, the pill separators `' + '` and `' · '`).
- [ ] The limits live in `domain/`, because `no-api-declaration-repeated-in-site` refuses a second copy in the site and `no-api-import-in-site` refuses an import from `api/`.
- [ ] No prose comments, except the SQL header the migration carries like every other one.
- [ ] Function names describe the result, not the mechanism.
- [ ] Every condition in a component sits in a pure function (`isChartSwitcherShown`, `selectOpeningChartIndex`), for `conditions-live-in-pure-functions`.
- [ ] No `useEffect`. The opening chart is derived during render.
- [ ] Conventional-commit scope `pragma`.
- [ ] `song-charts.core.ts`, `opening-chart.core.ts` and `chart-title.utils.ts` ship with sibling tests at 100 % per file. The vitest coverage config already includes `api/src/**/*.core.ts`, `site/src/**/*.core.ts` and `site/src/**/*.utils.ts`.
- [ ] Mobile first, 375 px, `sm:`/`md:`/`lg:` on layout classes only.

## Pre-flight gates

Each gate was run once on the tree at `9eed1072` this session, and passed, unless marked otherwise.

1. `pnpm --filter @borso-app/pragma build`. Passed on the tree.
2. `pnpm --filter @borso-app/pragma typecheck`. Passed on the tree. The pre-push hook runs it too. Listed because the brief asked for it.
3. `pnpm --filter @borso-app/pragma lint`. Exit 0 on the tree. The pre-commit hook runs oxlint too. Listed because the brief asked for it.
4. Affected core tests: `cd apps/pragma && npx vitest run --project core api/src/songs domain site/src/routes/catalog site/src/routes/setlists site/src/components site/src/lib/queries site/src/i18n api/src/mcp/tool-coverage.test.ts api/src/realtime/derived-read-roots.test.ts`. Passed on the tree (214 files, 1 949 tests).
5. Affected back-end tests: `cd apps/pragma && DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) npx vitest run --project back-e2e --project back-e2e-assistants api/src/songs/songs.controller.test.ts api/src/instruments/instruments.controller.test.ts api/src/members/members.controller.test.ts api/src/songs/songs-tools.controller.test.ts api/src/mcp/tool-budget.test.ts api/src/mcp/mcp.controller.test.ts api/src/database/migrations.audit.test.ts`. Passed on the tree, in two runs (6 files and 50 tests, then `mcp.controller.test.ts` with 9 tests).
6. `scripts/check-migration-sql-dsql-compat.sh` with no argument, once `0031_song_charts.sql` exists. It ignores any path outside `apps/*/api/src/database/migrations/`, so a stub elsewhere proves nothing (measured: a scratch file with `DEFAULT` passed).
7. `scripts/check-spec-records.sh docs/features/pragma/song-charts-per-instrument/spec/spec.md`. Exit 0. The spec creates no table.
8. `grep -rnE "\.chart\b|\bchart:" apps/pragma/api/src apps/pragma/site/src apps/pragma/scripts --include=*.ts --include=*.tsx | grep -v "\.test\."` prints nothing. It prints 43 lines on the tree today.
9. (UI) `/visual-validation docs/features/pragma/song-charts-per-instrument/spec/spec.md`, on `pnpm dev` at 375 px. The seed has no Piano, so the spec's step 5 pill reads "Guitare + Clavier". Sign in as `lea` (holds Guitare on *Afterglow*) for step 1 and as `hugo` (not on Guitare) for step 3.
10. `/technical-validation docs/features/pragma/song-charts-per-instrument/spec/spec.md`.

## Open questions / unknowns

- **Decided (a), 2026-11-16, by the main session.** Raising the budget hides the cost. What does `get_song` return per chart in its summary? Today an assistant reading "who plays bass on *Lightning*" spends 464 of the 500 characters the budget test allows (measured). The spec's shape, `{ kind, instruments: [], label: null }` on every chart, pushes it to 507, and the test fails.
  - (a) Omit empty fields. A chart for every instrument reads `{"kind":"chordpro"}`, and a Guitare chart reads `{"kind":"chordpro","instruments":["Guitare"]}`. The assistant reads a missing `instruments` as every instrument, which the description says. **Recommended.**
  - (b) Keep the spec's shape and raise the `get_song` and task budgets to 550. Every assistant read of a song costs about 40 more characters, and the tool budget no longer flags that growth.
  - (c) Leave `charts` out of the summary and show it only with `detail`. An assistant asked which chart a guitarist has makes two calls instead of one.

## Missing technical skills

- A DSQL migration skill. It would hold the additive-column, read-time fallback and rollback reasoning this plan rebuilt from `docs/knowledge/dsql-postgres-compat-gaps.md` and the migration files.
- An MCP tool-change skill that prints the current tool budget headroom before a plan changes a tool. This plan copied `tool-budget.test.ts` into a temporary file to measure it.
