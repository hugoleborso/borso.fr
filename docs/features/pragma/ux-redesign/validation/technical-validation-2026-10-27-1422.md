# Technical validation — Pragma redesign, slice 1 (foundation), second pass

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 1
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-ux-redesign (HEAD `fbdc6fc1`)
- Base: origin/main (merge base `3bd18b51`)
- Run at: 2026-10-27T14:22:01Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics), root (`eslint-rules/`, `scripts/standards/`, `eslint.config.js`, `knip.json`)
- Previous pass: [`technical-validation-2026-10-27-1257.md`](./technical-validation-2026-10-27-1257.md), FAIL on A09, A20 and B10

Scope: slice 1 only (tokens, Newsreader, atoms and molecules, `Sheet`, required icons, member colour atoms, the two note-loss fixes, the slice 1 gates, the task-metrics harness moved into the repository). Rows for slices 2 to 6 are out of scope. The acceptance-table rows are `/visual-validation` assertions; they are cited here only where the plan makes a harness number its self-check, read from the committed `validation/slice-1-after-fix-round-2.json`. The harness was not re-run in this pass.

This pass re-ran every gate below on HEAD and re-read every file the fix round changed (`901d8a7d`, `471a2b95`, `85500d05`, `fbdc6fc1`). Rows on files the fix round did not touch keep the previous pass's evidence, re-checked against the re-run gates. The subagent that ran it had no Agent tool, so it ran the `technical-validator` procedure inline rather than dispatching that agent.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Slice 1 acceptance, Q9 | The harness reruns from the repository and reproduces every task's counts in `baseline.json` | `apps/pragma/scripts/task-metrics/task-metrics.core.ts:18`; `validation/slice-1-after-fix-round-2.json` | Comparing `slice-1-after-fix-round-2.json` with `spec/baseline/baseline.json` over the 13 tasks (1 to 12 and 8b) on `taps`, `textEntries`, `scrollGestures`, `screensVisited`: 0 differences (task 1: 18 taps, 0 text entries, 3 scroll gestures, 7 screens on both sides) | PASS |
| A02 | Q9 | The audit copies stop being runnable code in `docs/` | `docs/features/pragma/ux-redesign/audit/task-metrics/` | Only `baseline.json` and `baseline.md`; `check-doc-links.ts` exit 0 | PASS |
| A03 | Edge case › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | `site/src/components/molecules/latest-text-save.utils.ts:37-40`, `latest-text-save.hook.ts:43-56` | `if (state.inFlightText !== null) return null;`; on success `apply({ kind: 'saveSucceeded' }); sendLatest();` | PASS |
| A04 | Edge case › entry note | Key and capo carry the same fix; closing the sheet sends the pending text | `site/src/components/organisms/SetlistEntryRow.tsx:109-125` | `closeSheet = () => { notesSave.flush(); keySave.flush(); capoSave.flush(); ...}` | PASS |
| A05 | Edge case › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | `site/src/lib/transition-draft.store.ts:40-55`, `TransitionCommentModal.tsx:40,47,84` | `const draft = kept.text ?? existing.data?.comment.comment ?? '';`; only `onSuccess` calls `kept.discard()` | PASS |
| A06 | Design system › Tokens, ADR-0045 | Two scheme-independent inks for anything on a member colour | `site/src/styles/tokens.css:41-42`; plan row *Design system › Tokens* | `--color-on-color-dark: #0a0907;` `--color-on-color-light: #fffdf8;`; the plan row now names `#0a0907` and why (fix round `471a2b95`) | PASS |
| A07 | Q2b, Member colours, ADR-0045 | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts:90-97` | `contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB) ? 'on-color-light' : 'on-color-dark'` | PASS |
| A08 | Member colours | The colour reaches the screen only through `Avatar` and `MemberMark`, filled, never as text | `atoms/Avatar.tsx:15`, `atoms/MemberMark.tsx:16-23` | `fix-round-2.json` › `sliceOne.totals.textSetInMemberColour` = 0 | PASS |
| A09 | Q2b, "members created without one get the five-colour palette"; operator: "garder la couleur pour qu'on s'habitue" | A new member gets the palette colour the band has been getting, and no member's colour changes | `apps/pragma/domain/member-palette.core.ts:1-7`; `api/src/members/member-palette.utils.ts:1` | `{ name: 'coral', hex: '#e87b62' }, … '#3a9b9b', '#d6a93c', '#8a4f7a', '#7a9b6f'`, byte-for-byte the list `origin/main` held in `api/src/members/member-palette.utils.ts`; the API now imports it (`import { MEMBER_PALETTE } from '@domain/member-palette.core';`). On `origin/main` the site's `MEMBER_COLOR_TOKENS` served only as `AppShell`'s fallback; stored member colours were always drawn as stored, and no member row is written | PASS |
| A10 | ADR-0046 | Newsreader replaces Instrument Serif | `apps/pragma/package.json`, `site/src/main.tsx` | `pnpm build` exit 0 on HEAD | PASS |
| A11 | ADR-0046 | Titles upright; only notes and comments use the italic display face | `SetlistEntryNotesField.tsx:37`, `TransitionCommentModal.tsx:91`, `SongNotes.tsx:47`, `BarForm.tsx:281`, `TaskForm.tsx:181`, `TransitionStrip.tsx:82`, `ConcertReadView.tsx:83` | `TransitionStrip.tsx:82` `hasNote ? 'font-display italic text-ink' : 'text-ink-soft'`; every hit renders a note or a transition comment | PASS |
| A12 | Type roles, acceptance "distinct font sizes" and "`text-[`" | Six roles; no arbitrary text size | `tokens.css`; `fix-round-2.json` | `sliceOne.totals.distinctFontSizesOutsideSceneViews` = 5 | PASS |
| A13 | Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink`, `label` on `IconButton` | `atoms/Button.tsx:7`, `atoms/IconButton.tsx:10-11,22` | `readonly icon: IconName;`, `aria-label={label}` | PASS |
| A14 | Rules › One icon per verb | Icon sizes are the three named sizes; Lucide notice carried | `atoms/Icon.tsx`, `apps/pragma/THIRD_PARTY_NOTICES.md` | Unchanged since the previous pass | PASS |
| A15 | Rules › Sheets, D10 | One `Sheet` on `<dialog>` with grabber, title, Close, one scroll body, safe-area footer | `molecules/Sheet.tsx:22-24,55-91`, `sheet.variants.ts:21` | `'pb-[max(16px,env(safe-area-inset-bottom))]'`, `<IconButton data-sheet-close icon="close" …/>` | PASS |
| A16 | Slice 1, 14 dialogs | Every dialog renders inside `Sheet` | `grep -rln "<dialog" site/src` | `Sheet.tsx` and the two scene pages under their written exceptions | PASS |
| A17 | Rules › focus, rank 23 | A sheet holding a field focuses the first field, else Close | `site/src/lib/modal-dialog.adapter.ts:13-18` | `dialog.querySelector(FIRST_FIELD_SELECTOR) ?? dialog.querySelector(CLOSE_BUTTON_SELECTOR)` | PASS |
| A18 | Rules › One scroll | Sheet bodies are the one scroll | `eslint.config.js` (`no-vertical-scroll-container`) | ESLint exit 0 over the changed files | PASS |
| A19 | Rules › Primary action placement | Bottom strip of pills, no round floating button | `atoms/BottomActions.tsx`; `SetlistEditor.tsx` | Unchanged since the previous pass | PASS |
| A20 | Rules › Tap targets; plan self-check "no tappable element under 44 px on the 26 routes" | Every tappable element is 44x44 px or more | `TransitionStrip.tsx:17-19,53,71`; `CompositionDetail.tsx:36`; `TaskRow.tsx:32`; `fix-round-2.json` | `sliceOne.totals.tapTargetsUnder44` = 0 (was 68). The strip keeps `h-6` and gains `after:absolute after:inset-x-0 after:-top-3 after:-bottom-2`: 12 px up spans the list's `gap-2` (8 px) and the previous card's border and `py-1` (5 px), 8 px down spans the row's `gap-1` (4 px) and the card's border and `py-1`, so the hit area reaches no control. The probe now counts a checkbox by its label, and the task checkbox sits in `<label className="… min-w-11 min-h-11 …">`, where a tap does toggle it | PASS |
| A21 | Design system › Contrast | Every listed text pair at 4.5:1 or more in both schemes | `site/src/lib/design-tokens.utils.test.ts:186` | `fix-round-2.json` › `textPairsUnderMinimumContrast` = 0 | PASS |
| A22 | Rules › No value outside the tokens | A class naming an undefined token fails the build | `design-tokens.utils.test.ts:219,229`; `bg-surface` canary | Core suite exit 0 | PASS |
| A23 | Slice 1 atom list | New atoms and molecules exist and are used; replaced ones gone | `site/src/components/{atoms,molecules}/` | `pnpm exec knip` exit 0 | PASS |
| A24 | Gates cited in their standard | Each new mechanism resolves in the ledger | `scripts/standards/enforcement-ledger.ts` | `--check`: "Every standard names a mechanism that exists and runs." | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the 266 changed `.ts/.tsx/.js/.mjs/.mts` files | exit 0 | PASS |
| B02 | Prettier | `prettier --check --ignore-unknown` on changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 | PASS |
| B05 | Type assertions limited to `as const` / `as unknown`; no `any` | grep on the fix-round diff | none added | PASS |
| B06 | `useEffect` is a smell | grep on the fix-round diff | none added | PASS |
| B07 | No comments | fix-round diff; `check-no-comments-in-styles-and-markup.sh` | no comment added; script exit 0 | PASS |
| B08 | Magic values named | fix-round diff | `COVERED_STRIP_HIT_AREA_CLASS`, `RISKY_STRIP_HIT_AREA_CLASS`, `LINK_CLASS` | PASS |
| B09 | Generated-file gates | `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `architecture-graph.ts --check`, `check-vocabulary-paths.sh`, `check-doc-links.ts`, `check-mutation-covers-gated-files.sh` | all exit 0 | PASS |
| B10 | A `@FollowsBlueprint` marker sits on the symbol it claims | Read of `eslint-rules/no-arbitrary-tailwind-value.js:51-53` | `// @FollowsBlueprint lint-rule` / `/** @type {import('eslint').Rule.RuleModule} */` / `export default {`; `reportStyleColours` at `:42` carries neither | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm --filter @borso-app/pragma run test:core` | 0; 268 files, 2672 tests; 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm test` in `apps/pragma` | 0; 29 files, 301 tests | PASS |
| C03 | root (`eslint-rules/`, `scripts/standards/`) | `pnpm run test:eslint-rules` | 0; 72 files, 1564 tests | PASS |
| C04 | @borso-app/pragma mutation, every changed `*.core.ts` / `*.utils.ts` / `*.adapter.ts` that exists (19 files: the list `.husky/pre-push:309-324` builds) | `pnpm exec stryker run --mutate <19 files>` in `apps/pragma` | 1. "Final mutation score 87.41 under breaking threshold 100". 0 survived; `scripts/task-metrics/argent-input.adapter.ts` 51 and `cdp-session.adapter.ts` 70 mutants with no coverage; the other 17 files at 100 | FAIL |
| C05 | root mutation, changed `scripts/` and `eslint-rules/` gated files | `pnpm exec stryker run --mutate <list>` | 0; score 100.00 (256 killed) | PASS |
| C06 | @borso-app/pragma build | `pnpm build` | 0 | PASS |
| C07 | Every `*.utils.ts` has its sibling test | listing | all present and run by the core project | PASS |

## D. Test coverage of spec

All happy paths and the acceptance-table rows are routed to `/visual-validation`; out of scope for this report. The rows below come from *Use cases / edge cases* and the slice 1 parts of *Test strategy* › Unit and › Gates.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Entry note typed fast on a slow network: the last text typed is stored | `'stores the full text whatever order the replies come back in (run %i)'`, `latest-text-save.hook.test.tsx:58-79`; fails on `expect(server.stored).toBe(FULL_TEXT);` | PASS |
| D02 | A reply to an older save never overwrites a newer one | Same test, replies delayed per request by `REPLY_DELAYS_MS`; `expect(server.requests.at(-1)).toBe(FULL_TEXT)` | PASS |
| D03 | Closing the entry sheet before the pause ends still saves the full note | `'saves the full note when the sheet is closed before the pause ends'`, `SetlistEntryRow.test.tsx:142` | PASS |
| D04 | Transition sheet closed by the backdrop keeps the draft and shows it on reopening | `'is kept after a click on the backdrop and shown on reopening'`, `TransitionCommentModal.test.tsx:62-70` | PASS |
| D05 | Same, closed by Escape | structural: the draft is written on every change (`TransitionCommentModal.tsx:84`) and only a successful save clears it (`:47`), so how the sheet closes cannot reach it | PASS |
| D06 | The draft is gone after a successful save | `'is gone once saved: …'`, `TransitionCommentModal.test.tsx:72-91` | PASS |
| D07 | A member colour close to `accent` or very pale: ink chosen by contrast | `selectInkOnMemberColor` tests, `member-color.utils.test.ts:101-125` | PASS |
| D08 | Unit: the five palette colours at 4.5:1 or more with the chosen ink; malformed hex | `it.each([['coral', '#e87b62', 'on-color-dark', 7.05], …, ['plum', '#8a4f7a', 'on-color-light', 5.94], …])('draws on %s (%s) with %s at 4.5:1 or more'`, `member-color.utils.test.ts:99-104`; these are the API palette's five values | PASS |
| D09 | A new member takes the first free palette colour; the list is the one the API stores | `members-page.core.test.ts:56-68` (`selectFreePaletteColor([])` is `'#e87b62'`); `member-palette.core.test.ts:16-23` pins the five hex values in order | PASS |
| D10 | Gate: the button type | `button.types.test.ts:8-16`; canary `'a pragma button drawn without its icon'` | PASS |
| D11 | Gate: the new lint rules with `RuleTester` suites | `no-arbitrary-tailwind-value.test.js`, `no-raw-interactive-element.test.js`, `no-vertical-scroll-container.test.js` (C03) | PASS |
| D12 | Gate: one scroll, `/catalog/:songId/edit` its one exception | `no-vertical-scroll-container` with the exception at `SongChordPreview.tsx:27` | PASS |
| D13 | Gate: contrast test over the token values | `design-tokens.utils.test.ts:186` | PASS |
| D14 | Gate: an undefined colour token fails | `design-tokens.utils.test.ts:219,229` and the `bg-surface` canary | PASS |
| D15 | Each gate cited in its standard | `enforcement-ledger.ts --check` exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | `git diff origin/main...HEAD -- apps/pragma/api` touches only `member-palette.utils.ts` and its test (an import of the palette, no `insert(`, `update(`, `delete(`, `transaction(` or `onConflict`) | PASS |
| E02 | API module state | Per-process state | No module-level `let` or `new Map/Set` added under `api/` | PASS |
| E03 | Site module store `transition-draft.store.ts:14-15` | Per-process state | Client-only, per tab; the spec asks only that the draft survives a close on the same device | PASS |
| E04 | Entry note, key and capo saves | Two saves for one field at once | One save in flight per field (`latest-text-save.utils.ts:38`); each `PATCH` carries only its own field (`SetlistEntryRow.tsx:111-119`) | PASS |

## Notes

- **C04 (FAIL).** Failing case: the first `git push` of this branch (it has no remote branch yet) runs pre-push, which builds its mutate list from every changed `apps/pragma/**/*.(core|utils|adapter).ts` that exists (`.husky/pre-push:309-324`). That list includes `scripts/task-metrics/argent-input.adapter.ts` and `scripts/task-metrics/cdp-session.adapter.ts`, added by `b1ccc72d`. Their tests exist (`argent-input.adapter.test.ts`, `cdp-session.adapter.test.ts`) and run in the core project, which `vitest.config.ts:33,52` points at `scripts/**/*.adapter.ts`. But `vitest.mutation.config.ts:20-29` collects only `scripts/**/*.core.test.ts`, and `stryker.config` mutates only `scripts/**/*.core.ts`. So the 121 mutants in the two adapters have no test, Stryker scores 87.41 against a break of 100, the `mutation-pragma` gate exits 1, and the push is refused. The previous pass's C04 passed because it mutated 17 files and left these two out. Two ways to fix it: add `scripts/**/*.adapter.test.ts` to `vitest.mutation.config.ts` and `scripts/**/*.adapter.ts` to `stryker.config` and kill whatever survives, or rename the two files to a suffix that is not mutation gated. The first matches how `site/` and `api/` treat adapters.
- The three FAIL rows of the previous pass are fixed: A09 by `471a2b95` (the palette is again the API's own five colours, so new members get the colour the band is used to, as the operator asked), A20 by `85500d05` (0 tap targets under 44 px), B10 by `901d8a7d`.
- The tap-target totals before and after are not measured the same way for labelled controls: `85500d05` changed the probe to count a checkbox by its label's box. The commit body says so. `slice-1-before.json`'s 150 therefore overstates the before figure for checkboxes and radios. That does not change the slice 1 target, which is 0.
- Carried from the previous pass, not graded: `scripts/task-speed/` is kept; `BottomActions` sits in `atoms/`; the one-scroll verdict lives in the lint rule, not the harness.
- Question, carried: the harness note race recorded `"requests":1` in every run, so the out-of-order replay is proved only by D01 and D02. Should the harness's typing gaps straddle the 600 ms pause?
- Question, carried: `TransitionCommentModal.tsx:82-93` keeps a fixed `rows={6}` `textarea` with `resize-y`, which scrolls inside itself past six lines, while the spec says "text areas grow". Should it be an `AutoGrowTextarea`?
- `scripts/standards/seal.ts verify` is plan gate 15 (`/standards-review`) and is outside this report.

## Verdict: FAIL
