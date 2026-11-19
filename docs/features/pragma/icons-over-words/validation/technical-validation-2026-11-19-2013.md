# Technical validation — pragma draws members, instruments and side actions as marks

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/pragma-icons-over-words
- Base: origin/main; round 2 diffs from `35bc113cd09306c209ddee724a39cbd5ed7c76cc`
- Run at: 2026-11-19T20:16:00Z
- Round: 2
- Reviewed: 78808e2a2821426251b658674485da46473f1073
- Touched workspaces: @borso-app/pragma (site only)

Round 2 reads `git diff 35bc113c..78808e2a`: one commit, `fix(pragma): keep the signed-in name and draw the catalog's instruments as glyphs`. It touches AppShell.tsx, SongCard.tsx, CatalogPage.tsx, catalog-page.core.ts, three test files and one bullet of the spec. The commit message dismisses no round-1 finding. No merge commit sits above the base. HEAD printed the reviewed SHA after every run. 1 use case routed to /visual-validation (layout at 375 px); out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | `docs/features/pragma/icons-over-words/plan/plan.md` | file does not exist | UNVERIFIABLE |
| A01 | Rule 5 | The signed-in card writes the member's name again | apps/pragma/site/src/components/organisms/AppShell.tsx:69-78 | `<Avatar aria-hidden="true" initials={memberInitial(signedInName)} …/>` `<div className="truncate text-meta font-medium">{signedInName}</div>` `<div className="truncate text-meta text-ink-soft">{t('shell.meVersion')}</div>`; identical to origin/main:69-73 except the avatar is now `aria-hidden`, so the name is read once | PASS |
| A02 | Rule 2 | The catalog "To learn" card draws a specific instrument as its glyph, named as accessible name and tooltip | catalog-page.core.ts:172-188, CatalogPage.tsx:86-89, SongCard.tsx:45-48 | `const namedInWords = selectInstrumentIdsNamedInWords(learned);` … `isNameNeeded: namedInWords.has(instrument.id)`; `toSongCard(entry.song, learned.detail, learned.instruments)`; `{instruments.length > 0 ? <MemberPartGlyphs parts={instruments} size="sm" /> : null}`. MemberPartGlyphs.tsx:24-38 sets `role="img" aria-label={part.name} title={part.name}` | PASS |
| A03 | Rule 2 | Generic glyph or a glyph shared on the card keeps the word | catalog-page.core.ts:178 | reuses `selectInstrumentIdsNamedInWords` from lineup-slots.core.ts, the same rule every other surface reads | PASS |
| A04 | Rule 2 | The score stays after the glyphs, alone when no instrument is known | catalog-page.core.ts:166-170 | `if (lowestScore === null) return '';` … `return isAfterGlyphs ? `${SCORE_AFTER_GLYPHS_PREFIX}${score}` : score;` | PASS |
| A05 | Seen 6 (amended) | "A row of three or more actions, such as the practice day's bottom bar" | spec.md:40; SessionPrimaryActions.tsx:41-61 | The amendment names the row round-1 A10 found as the only one reaching three; no code change, the spec now says what the code does | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A06 — catalog "To learn" card wrote "Bass, Voice · 4/10" | `78808e2a` catalog-page.core.ts:172-188, SongCard.tsx:45-48. The round-1 case now yields `instruments: [bass glyph, mic-vocal glyph]`, both `isNameNeeded: false`, and `detail: '· 4/10'` (catalog-page.core.test.ts:176-189) | PASS |
| R02 | A13 — signed-in card dropped the name | `78808e2a` AppShell.tsx:74-77 `{signedInName}` above `{t('shell.meVersion')}` | PASS |
| R03 | D15 — no test pins the signed-in card's words | `78808e2a` AppShell.test.tsx:53 `'writes the member’s name above the version, the avatar beside it silent to a screen reader'`, fails at :62 `getByRole('link', { name: 'Gui Pragma · v0.1' })` and :64 `expect(card.textContent).toBe('GGuiPragma · v0.1')` if the name is removed | PASS |
| R04 | D16 — no test pins that the task assignee picker keeps names | `78808e2a` TaskForm.test.tsx:88 `'writes each member’s first name beside their avatar, named once for a screen reader'`, fails at :92 `expect(screen.getByText(member.firstName).closest('button')).toBe(chip)` if the word is dropped | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 7 changed source and test files | none found; sampled `instrumentsById`, `describeLowestScore`, `SCORE_AFTER_GLYPHS_PREFIX`, `isAfterGlyphs`, `learned` | PASS |
| B02 | Magic numbers / strings named | read in full | `SCORE_AFTER_GLYPHS_PREFIX = '· '` (catalog-page.core.ts:24), `NO_CARD_INSTRUMENTS` (:124) | PASS |
| B03 | No prose comments | grep `//\|/\*` on added lines | only `// @FollowsBlueprint` markers (catalog-page.core.ts:171, AppShell.test.tsx:39) | PASS |
| B04 | Type assertions only `as const` / `as unknown` | grep `\bas ` on added lines | only `'bass' as const` etc. in catalog-page.core.test.ts | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B06 | `noUncheckedIndexedAccess` | read new code | `instrumentsById.get(instrumentId)` checked `=== undefined` at catalog-page.core.ts:175-176; no array index added | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <7 changed .ts/.tsx>` | exit 0, no diagnostics | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | knip | `pnpm knip --workspace apps/pragma` | exit 0, configuration hints only | PASS |
| B10 | `useEffect` is a smell | grep `\buseEffect\(` on added lines | none added; CatalogPage.tsx:72 change keeps a `useMemo` | PASS |
| B11 | Standards 01: `describe…`/`to…` return what the verb says; booleans not negated | read in full | `describeSongToLearn(...): SongToLearnDetail`, `isAfterGlyphs`, `isNameNeeded` positive | PASS |
| B12 | Standards 03: "a derived type is derived … rather than being written out by hand beside the thing it mirrors" | read in full | catalog-page.core.ts:117-122 `export interface SongCardInstrument { readonly instrumentId: string; readonly name: string; readonly icon: InstrumentIcon; readonly isNameNeeded: boolean; }` restates `MemberPart` (setlist-filter.core.ts:53-58), which entry-lineup-change.core.ts:7 already imports for the same glyph shape; `LearnedInstrument` (:154-158) restates `PartInstrument` (setlist-filter.core.ts:47-51). A field added to the glyph shape (MemberPartGlyphs.tsx:8-13) now has a third hand-written copy to follow. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B13 | Standards 02: `.core` vs `.utils` | catalog-page.core.ts | the glyph projection is a band-facing rule in a `.core` file, calling the shared rule in lineup-slots.core.ts rather than a copy | PASS |
| B14 | Standards 05: no family of booleans where a variant belongs | SongCardProps (SongCard.tsx:12-21) | one array prop `instruments` added, no boolean | PASS |
| B15 | Standards 10: test names state behaviour and condition | read added `it(...)` | `'keeps the word beside the generic glyph and beside a glyph two instruments share'`, `'writes the score alone when no instrument is known'` | PASS |
| B16 | Standards 01: VOCABULARY / INVARIANTS still true | `git diff 35bc113c..HEAD --name-only` | no `VOCABULARY.md` or `INVARIANTS.md` changed; the round-1 note on the catalog invariant "A chart for one instrument reads that instrument's name" concerns chart pills, which this commit does not touch | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 35bc113cd09306c209ddee724a39cbd5ed7c76cc --coverage --reporter=verbose` | 0 (6 files, 51 tests, including AppShell.test.tsx, TaskForm.test.tsx, catalog-page.core.test.ts, CatalogPage.test.tsx; coverage 100 % on catalog-page.core.ts) | PASS |
| C02 | @borso-app/pragma | `scripts/mutate-changed.sh 35bc113cd09306c209ddee724a39cbd5ed7c76cc apps/pragma` | 0 (103 killed, 0 survived on catalog-page.core.ts) | PASS |
| C03 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 35bc113cd09306c209ddee724a39cbd5ed7c76cc --reporter=verbose` | 0, no back-e2e file affected (site-only diff) | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` enumeration | no `*.utils.ts` changed; catalog-page.core.ts has its sibling test in the diff and the run | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Rule 5: the signed-in card keeps its words | see R03 | PASS |
| D02 | Rule 5: the task assignee picker keeps names | see R04 | PASS |
| D03 | Rule 2: the "To learn" card's specific glyph carries no word, named for a screen reader | `'draws each instrument as its glyph, named for a screen reader, then the lowest score'` catalog-page.core.test.ts:176, fails at :183-189 `toEqual({ instruments: [{ … name: 'Bass', icon: 'bass', isNameNeeded: false }, …], detail: '· 4/10' })` | PASS |
| D04 | Rule 2: generic or shared glyph keeps the word on the card | `'keeps the word beside the generic glyph and beside a glyph two instruments share'` catalog-page.core.test.ts:192, :197-202 `['Voice', true], ['Backing vocals', true], ['Kazoo', true], ['Bass', false]` | PASS |
| D05 | Rule 2: the card draws the glyphs it is given | (none found). `grep -n "learning\|Bass\|/10" CatalogPage.test.tsx` prints nothing, and no test renders `SongCard`. Failing case: delete the `<MemberPartGlyphs parts={instruments} …/>` line at SongCard.tsx:46 → the "To learn" card for a song on Bass at 4 shows only "· 4/10", and every test still passes. The projection under it is pinned (D03, D04) and the rendering component is pinned elsewhere (round-1 D07) | FAIL (non-blocking) |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff --name-only 35bc113c..HEAD \| grep -E '\.(service\|repository\|controller)\.ts$'` prints nothing; `grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` on the diff prints nothing. The `Map` in CatalogPage.tsx:72-80 is built inside a `useMemo`, per render | PASS |

## Blocking findings

- none

## Non-blocking findings

- B12 — `SongCardInstrument` and `LearnedInstrument` in catalog-page.core.ts restate `MemberPart` and `PartInstrument` by hand.
- D05 — no test renders the "To learn" card, so dropping its glyphs from SongCard.tsx would pass every test.

## Notes

- A00: no plan exists. Files were taken from the diff.
- Round-1 notes on A15 (are instrument toggles "pickers"?) and A16 (does Rule 1 reach the Members page roster?) are still open product questions. This commit does not touch either surface, and the round-1 rows stay UNVERIFIABLE.
- The spec's "What the musician sees" bullet 6 was rewritten in this commit, from "a page header" to "a row … such as the practice day's bottom bar". Was that wording change agreed with the operator, or written to match the code?
- With glyphs and no score, SongCard.tsx:47 renders an empty `<span className="truncate">`. Would leaving it out when `detail` is empty say the same with no empty node? No standards bullet covers it.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
