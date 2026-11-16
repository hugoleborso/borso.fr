# Technical validation — Each member opens a song on the chord chart for the instrument they play

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/brave-clarke-5a6nxj
- Base: 9f6f153f0d8c50de8b5046d18ad02a26c77a11ee
- Run at: 2026-11-16T02:14:30Z
- Round: 2
- Reviewed: 9362d35069b35005319905f1e56bc14b0b596d06
- Touched workspaces: @borso-app/pragma (api `__test`, site)

Round 2 reads `git diff c823c61814fee3fb43e3740bee98876b55569415..HEAD`, the fix commit `9362d350` plus the round-1 report committed in `f5c8ca1f`. No merge commit sits in that range (`git rev-list --merges` printed nothing). The fix commit carries no new scope, so no file round 1 never read was walked. HEAD did not move during the review. The commit message dismisses one round-1 item (E01, graded PASS with a question in Notes), so it gets a row below.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q "What does a pill read?": "then " · " and the label when there is one"; Q "A label?": "an empty one stored as null" | A chart saved with no label is titled by its instruments alone, everywhere the site reads it | site/src/routes/catalog/song-chart-cards.core.ts:68, site/src/lib/queries/songs.queries.ts:202, :208, site/src/routes/catalog/chart-title.utils.ts:35-37 | The B14 fix changed the save payload to `const assignment = { instrumentIds: [...card.instrumentIds], label: card.label };`, so a card with no label now sends `label: ''` (song-draft.core.test.ts:162-165 pins it). The update's `onMutate` writes that payload straight into the song caches through `mergeSongUpdate(song, patch)` and `mergeSongUpdate(old.song, patch)`, and `buildOptimisticSong` does the same on a create. `describeChordChartTitle` then tests `chart.label === null ? instrumentsText : \`${instrumentsText}${LABEL_SEPARATOR}${chart.label}\``. Failing case, run with `tsx` on HEAD: `chartsFromDraft` of one ChordPro card for instrument `g` with no label, merged by `mergeSongUpdate`, gives `[{"kind":"chordpro","text":"[C]Hi","instrumentIds":["g"],"label":""}]`, and `describeChordChartTitle(…, [{ id: 'g', name: 'Guitare' }], 'All instruments')` returns `"Guitare · "` where the spec gives `"Guitare"`. Every save of a song with two charts or more shows its switcher pills with a trailing " · " until the response lands. Offline, the mutation pauses after `onMutate` and the persisted cache keeps the wrong titles until the device reconnects. A typed `" Solo "` shows as `"Guitare ·  Solo "` in the same window. Before the fix the payload held `null`. Introduced: this branch (fix commit). Fix size: one line (send `null` for a blank label again, and record that B14 does not apply because the optimistic cache reads the payload as a stored chart, or normalise the label in `song-cache.core.ts`) | FAIL (blocking) |
| A02 | Result, edit form (upload on a card) | A file chosen on a card lands on that card without undoing other edits made meanwhile | site/src/components/organisms/SongChartFields.tsx:49-56, site/src/components/organisms/SongEditForm.tsx:77-79, :218 | `props.onCardsChange((current) => withChartCardChanged(current, card.cardId, changes))` and `const updateCharts = (update: SongChartCardsUpdate): void => { form.setFieldValue('charts', update(form.getFieldValue('charts'))); };`. The stale `onChange` of the render that started the upload now carries only a card id and a change, and reads the list at the moment it applies | PASS |
| A03 | Edge (round-1 Notes): a picked chart on the setlist scene does not carry to another song moved under the held index | The pick is scoped to the shown song | site/src/routes/catalog/chart-switch.hook.ts:30-33, :44, site/src/routes/setlists/SetlistScenePage.tsx:103 | `const pickedIndex = pick !== null && pick.scope === pickScope ? pick.index : null;` with `setPick({ scope: pickScope, index });` and the scene passing `entry?.songId` | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A31 (blocking): an upload writes back the card list of the render that started it | `9362d350` SongChartFields.tsx:49-56, SongEditForm.tsx:77-79. Pinned by `it('keeps a label typed while the photo of its card uploads')` at SongEditForm.test.tsx:250, which defers the upload, types "Solo", resolves it and asserts `{ ...BLANK_CHART_CARD, kind: 'image', imageS3Key: 'charts/a.png', label: 'Solo' }` (the exact round-1 probe), and `it('keeps a card removed while its photo uploads removed')` at :267, asserting `.toEqual([kept])`. Both ran green in C01 | PASS |
| R02 | C04 (blocking): 4 mutants survived in song-chart-cards.core.ts | `9362d350` song-chart-cards.core.test.ts: `expect(canMoveChartCard(1, 2, -1)).toBe(true);`, `it('leaves the list as it is when the moved card is gone')`, and `describe('chartsFromCards') > it('drops a card switched away from its file whose new file was removed')` with `{ kind: 'image', pdfS3Key: 'a.pdf', imageS3Key: '' }` and `{ kind: 'none', imageS3Key: 'a.png' }`. C03 below scores the file 100 % (122 killed, 0 survived) | PASS |
| R03 | B13 (non-blocking): `AFTERGLOW_GUITAR_TAB` | `const AFTERGLOW_GUITAR_CHART = \`{title: Afterglow}` at api/src/__test/test-seed.core.ts:46 | PASS |
| R04 | B14 (non-blocking): the site restated the API's label trim | Removed at song-chart-cards.core.ts:68. The removal introduced A01 | PASS (see A01) |
| R05 | B15 (non-blocking): hand-written `SeedChart` | `export type SeedChart = Extract<z.output<typeof chordChartSchema>, { kind: 'chordpro' }>;` at test-seed.core.ts:38 | PASS |
| R06 | B22 (non-blocking): unused key `catalog.chordChart` | Removed from en.json and fr.json. `grep -rn '"chordChart"' site/src/i18n` prints nothing | PASS |
| R07 | D11 (non-blocking): no test pins the transpose reset | `it('resets the transpose when the scene moves to another song')` at SetlistScenePage.test.tsx:258, `expect(readTranspose(container)).toBe('+0');` after `ArrowRight` | PASS |
| R08 | D13 (non-blocking): no test for a scene whose charts are all files | `it('says the song has no ChordPro chart when every chart is a file')` at SongScenePage.test.tsx:110, `expect(container.textContent).toContain('No ChordPro chart attached to this song.');` | PASS |
| R09 | E01 dismissal in `9362d350`: "production runs on DSQL, where the scrub and a concurrent song save conflict instead of losing an update, and dropInstrumentFromSongLineupsWithin … has the same shape on main" | Checked. `git show 9f6f153f:apps/pragma/api/src/instruments/instruments.repository.ts` holds `dropInstrumentFromSongLineupsWithin` at :177-193, a select of `defaultLineup` then `executor.update(songTable).set({ defaultLineup })` per song, the same shape. The chart scrub runs in `runInOneInstrumentTransaction` (instruments.repository.ts:237), and `api/src/helpers/persistence/conflict-abort.core.ts:4-6` lists `'OC000'` and `'40001'` as the conflicts it handles | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <13 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B02 | No `any` | `grep -nP '\bany\b'` on the changed files | only test names ("shows any other failed save") and `expect.any(String)` | PASS |
| B03 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on the changed files | none found. `as const` at SongEditForm.test.tsx (`kept`) only | PASS |
| B04 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found | PASS |
| B05 | Names carry intent | sampled `updateCharts`, `SongChartCardsUpdate`, `loadedCardId`, `ScopedPick`, `pickScope`, `pickChart`, `finishUpload` | each says what it holds or does | PASS |
| B06 | Magic strings | read in full | `const LOADED_CARD_ID_PREFIX = 'chart-';` at song-chart-cards.core.ts:32 is named | PASS |
| B07 | `noUncheckedIndexedAccess` | read in full | `const moved = cards[index]; const displaced = cards[target]; if (moved === undefined \|\| displaced === undefined) return cards;` at song-chart-cards.core.ts:127-129, and the test guards `if (first === undefined \|\| …) throw` at SetlistScenePage.test.tsx | PASS |
| B08 | Standards checklist, every `reviewer` bullet, against each changed source file read in full (test-seed.core.ts, SongChartCard.tsx, SongChartFields.tsx, SongEditForm.tsx, chart-switch.hook.ts, song-chart-cards.core.ts, SetlistScenePage.tsx, en.json, fr.json) | read in full | No new finding beyond A01. The 02 bullet ("a limit or a rule written in a site does not restate one the API enforces") is what led to A01: the site's optimistic cache is a second reader of the payload, so the trim was not only a restatement. The 03 bullet holds at test-seed.core.ts:38. The 09 bullet holds: no key added | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed c823c61814fee3fb43e3740bee98876b55569415 --coverage --reporter=verbose` | 0. 77 files, 447 tests passed. Coverage 100 % statements, branches, functions and lines. Ran `SongEditForm.test.tsx`, `SongScenePage.test.tsx`, `SetlistScenePage.test.tsx`, `song-chart-cards.core.test.ts`, `song-draft.core.test.ts` and `test-seed.core.test.ts` | PASS |
| C02 | @borso-app/pragma back-e2e | `pnpm --filter @borso-app/pragma run test:e2e --changed c823c61814fee3fb43e3740bee98876b55569415 --reporter=verbose` | 0. 50 files, 490 tests passed (reached through `api/src/__test/test-seed.core.ts`) | PASS |
| C03 | @borso-app/pragma mutation | `scripts/mutate-changed.sh $(git rev-parse c823c618…) apps/pragma` | 0. Score 100.00: test-seed.core.ts 28 killed, song-chart-cards.core.ts 122 killed, song-draft.core.ts 54 killed, 0 survived | PASS |
| C04 | @borso-app/pragma `*.utils.ts` | `git diff --name-only c823c618..HEAD -- '*.utils.ts'` | no `*.utils.ts` changed in this round; round 1 found 59 of 59 with a sibling test | PASS |

## D. Test coverage of spec

Round 2 adds no spec claim. The rows below cover the behaviour the fix commit adds. 7 use cases routed to /visual-validation in round 1 stay out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | A label typed during an upload survives it (A02) | `it('keeps a label typed while the photo of its card uploads')` at SongEditForm.test.tsx:250, asserting `label: 'Solo'` on the saved card | PASS |
| D02 | A card removed during an upload stays removed (A02) | `it('keeps a card removed while its photo uploads removed')` at SongEditForm.test.tsx:267, asserting `.toEqual([kept])` | PASS |
| D03 | A pick does not carry to another song moved under the held index (A03) | `it('opens the song a reorder moves under the scene on its own opening chart')` at SetlistScenePage.test.tsx:244. It picks *All instruments* (index 0) on song 2, moves song 4 under the index with the Basse lineup, and asserts `toContain('Upright bass')`, the Basse chart at index 1, which a carried pick of 0 would hide | PASS |
| D04 | A chart saved with no label is titled by its instruments alone after a save (A01) | none. No test reads a pill title from the cache `onMutate` writes. `song-draft.core.test.ts:162-165` pins `label: ''` in the payload and `chart-title.utils.test.ts` only tests `label: null` | FAIL (blocking), same root cause as A01 |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths | Check-then-write | `git diff c823c618..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty (0 lines). The round adds no write path | PASS |
| E02 | Module-level state | Per-process state | `git diff c823c618..HEAD -- apps/pragma \| grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` matched nothing (exit 1). The new module constant `LOADED_CARD_ID_PREFIX` is a string. The pending-upload list in SongEditForm.test.tsx is test-only | PASS |

## Blocking findings

- A01: a chart saved with no label now sends `label: ''`. The optimistic song caches store it as is, and the switcher pill reads "Guitare · " until the server answers, or until the device reconnects when offline (song-chart-cards.core.ts:68, songs.queries.ts:202, :208, chart-title.utils.ts:35).
- D04: no test pins the pill title after a save. Same root cause as A01.

## Non-blocking findings

- None new. The six round-1 non-blocking findings are fixed (R03 to R08).

## Notes

- Loaded cards take the ids `chart-0`, `chart-1`, … by position (song-chart-cards.core.ts:34-36, :51). If the form is re-initialised from a saved song while an upload is still pending, could that upload land on whichever card now holds its old position id? I found no path that resets `form.charts` from the server while the form is open, so this has no failing case yet.
- The spec's test strategy asks for "build". I ran lint, the changed core and e2e tests and the mutation run, not `pnpm --filter @borso-app/pragma build`. CI runs it.

## Verdict: FAIL
