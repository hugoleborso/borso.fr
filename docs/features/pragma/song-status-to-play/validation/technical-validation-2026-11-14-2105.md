# Technical validation — a "to play" song status

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/nice-sagan-eczjqq
- Base: origin/main (round 2 diffs from the round-1 `Reviewed:` SHA `99352898d8ce858e08bdc8fe2966eaf4b2e7d936`)
- Run at: 2026-11-14T21:16:35Z
- Round: 2
- Reviewed: 36bc57c26b41d9c0601489ad08a241052b5468d2
- Touched workspaces: @borso-app/pragma (api, domain, site, scripts); repository tooling (`.claude/settings.json`, `.husky/pre-commit`, `.github/workflows/ci.yml`, `scripts/check-hook-commands-are-anchored.sh`)

Round 2 reads `git diff 99352898..36bc57c2`. It holds two commits and no merge. `36bc57c26` (`refactor(pragma): read the song statuses from one domain list`) is the fix round, and its message carries the triage of C02, D04, B11 and B12. `220e0ff27` (`fix(meta): anchor the merge-deploys-prod hook to the project root`) is new scope round 1 never read. It changes no app code, so it has no category A or D rows. Its new pre-commit check is graded under category B against the `reviewer` bullets of `docs/standards/14-tool-runtime-budgets.md`.

The spec is in the short form. Rows below cover only the files the fix touched. The three visual claims routed to /visual-validation in round 1 (chip position, badge tone, 375 px) stay routed there; out of scope for this report.

HEAD did not move during the review. Every test run graded below ran on `36bc57c26`.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Data shape | `SONG_STATUSES` is `idea`, `to_play`, `wip`, `rehearsed`, `concert_ready`, in that order, now from one domain module | apps/pragma/domain/song-status.core.ts:1, :3 | `export const SONG_STATUSES = ['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready'] as const;` · `export type SongStatus = (typeof SONG_STATUSES)[number];` | PASS |
| A02 | Use case 1 | The API schema still validates create, update and the find tool against the list | apps/pragma/api/src/songs/songs.schema.ts:20, :88, :137 | `import { SONG_STATUSES } from '@domain/song-status.core';` · `status: z.enum(SONG_STATUSES),` · `status: z.enum(SONG_STATUSES).optional(),` | PASS |
| A03 | Use case 2 | The song form and the add-song form offer every status of the domain list | apps/pragma/site/src/components/molecules/SongClassificationFields.tsx:31; site/src/components/organisms/AddSongForm.tsx:121; site/src/routes/catalog/song-draft.core.ts:23 | `options={SONG_STATUSES}` · `{SONG_STATUSES.map((status) => (` · `} as const satisfies Record<SongStatus, string>;` | PASS |
| A04 | Use case 4 | The badge's label table is keyed by the domain type | apps/pragma/site/src/components/molecules/StatusChip.tsx:3, :11, :14 | `import type { SongStatus } from '@domain/song-status.core';` · `} as const satisfies Record<SongStatus, string>;` · `status: SongStatus;` | PASS |
| A05 | Use case 5 | The audience pool's status reads the domain type on both sides | apps/pragma/api/src/audience/pool.core.ts:3; site/src/lib/queries/audience.utils.ts:27 | `export type PoolSongStatus = SongStatus;` · `readonly status: SongStatus;` | PASS |
| A06 | Out of scope | The setlist add-songs filter is unchanged; only its type import moves | apps/pragma/site/src/components/organisms/add-songs.core.ts:3 | `import type { SongStatus } from '@domain/song-status.core';` and no other line of the file changes | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | C02 (blocking): `songs-tools.controller.test.ts` hard-coded the four-status zod message | `36bc57c26` apps/pragma/api/src/songs/songs-tools.controller.test.ts:152 `` status: `Invalid option: expected one of ${SONG_STATUSES.map((status) => `"${status}"`).join('|')}`, ``. Run alone, `✓ \|back-e2e-assistants\| api/src/songs/songs-tools.controller.test.ts > songs tools (back-e2e) > answers the refusal codes the routes answer 174ms`, exit 0. The `--changed` e2e run is green too (C02 below) | PASS |
| R02 | D04 (blocking): no test failed if the form stopped offering `to_play` | `36bc57c26` apps/pragma/domain/song-status.core.test.ts:7 `expect(SONG_STATUSES).toEqual(['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready']);`. Both forms render `SONG_STATUSES` (SongClassificationFields.tsx:31, AddSongForm.tsx:121), so deleting `'to_play'` from the list fails this test. Deleting only the label at song-draft.core.ts:19 fails typecheck through `satisfies Record<SongStatus, string>` (:23), and also fails `carries a translation key for every status` (song-draft.core.test.ts:69). The commit's claim holds | PASS |
| R03 | B11 (non-blocking): the site restated the API's list as `songStatuses` | `36bc57c26`. `grep -rn songStatuses apps/pragma` returns nothing. A search for hand-written song status unions or arrays outside tests finds only `domain/song-status.core.ts:1` | PASS |
| R04 | B12 (non-blocking): `PoolEntryView.status` was a hand-written union | `36bc57c26` apps/pragma/site/src/lib/queries/audience.utils.ts:27 `readonly status: SongStatus;`, the same type the API's `PoolSongStatus` now aliases (pool.core.ts:3) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the diff | The one new local is `status` in the test's `.map((status) => …)` | PASS |
| B02 | Magic numbers / strings in named constants | read the diff | The literals sit in `SONG_STATUSES`. The test's expected list repeats them on purpose, as the pin | PASS |
| B03 | No prose comments | read the diff | The app diff adds no comment. The new shell script's header comment is outside `borso/no-comments`' reach (TS only) | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas [A-Z]'` on the 21 changed .ts/.tsx files | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on the same files | one hit, prose in a test name: song-draft.core.test.ts:142 `it('saves pasted chords above lyrics as ChordPro'` (matches `as C…`, not `any`) | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read the diff | No new indexed read | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <21 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | Unused exports and files | `pnpm exec knip --workspace apps/pragma` | exit 0 (three configuration hints, no issue). The type re-export `export type { SongStatus };` at songs.repository.ts:26 is read by song-tool.core.ts:3 | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B11 | Standards checklist (02): "a limit or a rule written in a site does not restate one the API enforces under another name" | read every changed source file in full | The site and the API both import `SONG_STATUSES` / `SongStatus` from `@domain/song-status.core`. No restated copy is left | PASS |
| B12 | Standards checklist (03): "a derived type is derived" | read in full | `NewSongStatus = SongStatus` (add-song.core.ts:5), `PoolSongStatus = SongStatus` (pool.core.ts:3), `SeedSong.status: SongStatus` (test-seed-fixture.core.ts:48), `ExtraSong.status: SongStatus` (audit-seed.setup.ts:49). None is written out by hand | PASS |
| B13 | Standards checklist (01): a `VOCABULARY.md` definition is still true; a file name says what it holds | read VOCABULARY.md:1475-1478 and the new file | The definition names `SONG_STATUSES` with no path, and the list still holds the five values it states. `song-status.core.ts` holds the song status list and type, beside `song-origin.core.ts` | PASS |
| B14 | Standards checklist (02): `.core.ts` against `.utils.ts` | read in full | A song status is a word the band recognises, so `.core.ts` is the right suffix, as for `song-origin.core.ts` | PASS |
| B15 | Standards checklist (10): test name states behaviour and condition | read the new test | `it('runs from idea to concert ready, with to play before work starts'` (song-status.core.test.ts:6) | PASS |
| B16 | Standards checklist (14): a new pre-commit check declares a scope naming everything it reads, fits the budget, and leaving the commit gets a whole-tree run in `ci.yml` | read `.husky/pre-commit:280-281`, the script and `ci.yml:121` | Scope `'^. \.claude/settings\.json$'` is the one file the script reads (`SETTINGS="${1:-.claude/settings.json}"`), and `^.` includes a deletion. Measured 0.006 s on the current tree. `ci.yml` runs `./scripts/check-hook-commands-are-anchored.sh` on the whole tree. It refuses the round-1 tree's settings (`git show 99352898:.claude/settings.json`), exit 1, naming `.claude/hooks/pretool-merge-deploys-prod.sh` twice, and passes the current one, exit 0 | PASS |
| B17 | Standards checklist (14): a new commit check answers *Earning the run* | measured here, since the commit message gives no numbers | It fires on 11 of the last 100 `origin/main` commits, the ones touching `.claude/settings.json`, which is also the only file it guards (30 commits in its history). Fire rate and guarded surface are the same set | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 99352898d8ce858e08bdc8fe2966eaf4b2e7d936 --reporter=verbose --coverage` | 0. 42 files, 369 tests. Coverage 100% statements (243/243), branches (139/139), functions (66/66), lines (196/196). Ran `domain/song-status.core.test.ts` and `site/src/routes/catalog/song-draft.core.test.ts` | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 99352898d8ce858e08bdc8fe2966eaf4b2e7d936` | 0. 51 files, 490 tests passed. The default reporter prints totals only, so the fixed file was also run alone with `--reporter=verbose` (R01), exit 0, 7/7 | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 99352898d8ce858e08bdc8fe2966eaf4b2e7d936 apps/pragma` | 0. `[mutate-changed] pragma: 8 file(s)`, final score 100.00, 0 survived. `domain/song-status.core.ts` was passed to Stryker but gets no row in the report (see Notes) | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` touched have a sibling test | `audience.utils.ts` and `setlist-editor.utils.ts` (import change only) both have `*.utils.test.ts` siblings, covered at 100% in C01 and mutated in C03 | PASS |
| C05 | repository tooling | `scripts/check-hook-commands-are-anchored.sh` | 0 on the current tree; 1 on the round-1 settings (B16) | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shape: the list and its order | `it('runs from idea to concert ready, with to play before work starts'` at apps/pragma/domain/song-status.core.test.ts:6, `expect(SONG_STATUSES).toEqual(['idea', 'to_play', 'wip', 'rehearsed', 'concert_ready']);` (:7) | PASS |
| D02 | 2. Song form offers "To play" | The form renders `SONG_STATUSES` (SongClassificationFields.tsx:31, AddSongForm.tsx:121), pinned by song-status.core.test.ts:7. The label is held by `satisfies Record<SongStatus, string>` (song-draft.core.ts:23) and `expect(Object.keys(SONG_STATUS_LABEL_KEY)).toEqual([...SONG_STATUSES]);` (song-draft.core.test.ts:69) | PASS |

Rows D01, D02, D03, D05 to D09 of round 1 covered code this round did not change, apart from import paths, and are not re-walked.

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the round-2 diff add or change a write path or module-level state? | `git diff 99352898..HEAD -- apps/` adds no `insert(`, `update(`, `delete(`, `onConflict`, `transaction(`, `new Map`, `new Set` or module `let` (grep exit 1). The changes move a constant and retype imports | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- Round 1's question about a stale browser tab is still open. The site parses a single song with `z.enum(SONG_STATUSES)` (song-draft.core.ts:35, SongEditPage.tsx:83). A tab that loaded the pre-merge bundle then opens the edit page of a song another member set to `to_play`. Does that parse fail, and can `site/public/sw.js` keep the old bundle alive across a deploy? The fix commit says one shared list "drops that independence, which nothing relied on". That is true for the list, but the old bundle still carries the old list until it reloads.
- `domain/song-status.core.ts` was in the set `mutate-changed.sh` handed to Stryker (8 files: the seven listed in the report plus this one), yet the report prints no row for it. Did Stryker create no mutant for the `as const` array, or did it skip the file? Either way the test at song-status.core.test.ts:7 compares the whole array, so any string or array mutant would be killed.

## Verdict: PASS
