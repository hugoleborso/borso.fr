# Technical validation — Pragma redesign, slice 1 (foundation), sixth pass

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 1
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-ux-redesign (HEAD `9f3e5f71`)
- Base: origin/main (merge base `3bd18b51`)
- Run at: 2026-10-27T22:11:55Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics), root (`eslint-rules/`, `scripts/standards/`, `eslint.config.js`)
- Previous pass: [`technical-validation-slice-1-r5.md`](./technical-validation-slice-1-r5.md) PASS

Scope: slice 1 only. Rows for slices 2 to 6 are out of scope. The acceptance-table rows are `/visual-validation` assertions and are not graded here, except the harness reproduction (A01), which this pass re-ran.

Since the fifth pass, two commits landed: `fb50352b` and `6c3ba34e` (the r5 reports, docs only) and `9f3e5f71`, which makes each practice recording row at least 44 px tall (`PracticeRecordingList.tsx:41`), widens the scene-control gaps to 8 px and pads the scroll row by 4 px (`SceneControls.tsx:30,46`), makes the harness's tap-target probe measure the reachable hit area, and makes tasks 3 and 7 wait for `<main>`. Every gate below was re-run on HEAD `9f3e5f71` this pass, including the full 13-task harness comparison.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Slice 1 acceptance, Q9 | The harness reruns from the repository and reproduces every task's counts in `baseline.json` | `apps/pragma/scripts/task-metrics/`; `pnpm run task-metrics -- --tasks all --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json` | Run this pass on `9f3e5f71`, exit 0: `[task] 4: taps=4 textEntries=0 scrollGestures=0 screensVisited=3` … `[task] 8b: taps=6 textEntries=1 scrollGestures=0 screensVisited=4`, then `[compare] no difference with …/baseline.json for 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 8b` | PASS |
| A02 | Edge case › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | `site/src/components/molecules/latest-text-save.utils.ts:38-39` | `if (state.inFlightText !== null) return null;` `return state.latestText === state.savedText ? null : state.latestText;` | PASS |
| A03 | Edge case › entry note; plan decision on key and capo | Key and capo carry the same fix; closing the sheet sends the pending text | `site/src/components/organisms/SetlistEntryRow.tsx:109-124` | `const notesSave = useLatestTextSave({`, `const keySave = …`, `const capoSave = …`; `notesSave.flush();` `keySave.flush();` `capoSave.flush();` | PASS |
| A04 | Edge case › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | `TransitionCommentModal.tsx:40,47,84` | `const draft = kept.text ?? existing.data?.comment.comment ?? '';`; the one `kept.discard();` in `site/src` (grep) sits in the save's `onSuccess`; `onChange={(event) => kept.keep(event.target.value)}` | PASS |
| A05 | Design system › Tokens, ADR-0045 | Two scheme-independent inks for anything on a member colour | `site/src/styles/tokens.css:41-42` | `--color-on-color-dark: #0a0907;` `--color-on-color-light: #fffdf8;` | PASS |
| A06 | Q2b, Member colours | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts:94` | `return contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB)` | PASS |
| A07 | Member colours | The colour reaches the screen through `Avatar` and `MemberMark` | `atoms/Avatar.tsx:15`, `atoms/MemberMark.tsx:17-21` | `const filled: CSSProperties = { backgroundColor: color, ...style };`; `dot: (color) => ({ backgroundColor: color })`, `ring: (color) => ({ borderColor: color })`, `` `color-mix(in srgb, ${color} ${MEMBER_LANE_TINT_SHARE}, var(--color-paper))` `` | PASS |
| A08 | Q2b; "garder la couleur" | New members get the palette the API already stored; no stored colour changes | `apps/pragma/domain/member-palette.core.ts`; `api/src/members/member-palette.utils.ts` | `git diff --stat origin/main...HEAD -- apps/pragma/api apps/pragma/domain` lists only the four `member-palette.*` files (40+, 26-); no schema, migration or write | PASS |
| A09 | ADR-0046 | Newsreader replaces Instrument Serif, `opsz` stylesheets | `site/src/main.tsx:2-3`; `package.json:42` | `import '@fontsource-variable/newsreader/opsz.css';`, `…/opsz-italic.css`; `"@fontsource-variable/newsreader": "5.3.0"`; build emits `newsreader-latin-opsz-normal` and `-italic` | PASS |
| A10 | Type roles | Six roles 30 to 12; no arbitrary text size | `tokens.css:59,74`; `grep -rc "text-\[" site/src` | `--text-display: 30px;` … `--text-label: 12px;`; no file with a `text-[` | PASS |
| A11 | Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink`, `label` on `IconButton` | `atoms/Button.tsx:7`, `atoms/ButtonLink.tsx:8`, `atoms/IconButton.tsx:11,22` | `readonly icon: IconName;`, `readonly label: string;`, `aria-label={label}` | PASS |
| A12 | Rules › list rows end in `chevR` | The task row's open button carries an icon | `molecules/TaskRow.tsx:42` | `<ListRow className={OPENING_BUTTON_CLASS} onClick={props.onOpen}>` | PASS |
| A13 | Rules › Sheets, D10 | One `Sheet` on `<dialog>` with Close and a safe-area footer | `molecules/Sheet.tsx:24,77` | `'pb-[max(16px,env(safe-area-inset-bottom))]'`; `data-sheet-close` | PASS |
| A14 | Slice 1, 14 dialogs | Every dialog renders inside `Sheet` | `grep -rln "<dialog" site/src` | `Sheet.tsx`, `LineupEditor.test.tsx` (a test), `SongScenePage.tsx`, `SetlistScenePage.tsx` (the plan's two scene exceptions) | PASS |
| A15 | Rules › focus, rank 23 | A sheet holding a field focuses the first field, else Close | `site/src/lib/modal-dialog.adapter.ts:15` | `dialog.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR) ??` then the close selector | PASS |
| A16 | Rules › One scroll | Nothing inside the document scrolls vertically | `eslint-rules/no-vertical-scroll-container.js` | ESLint exit 0 over all changed files (B01) | PASS |
| A17 | Rules › Primary action placement | Bottom strip of pills with a spacer | `atoms/BottomActions.tsx:8,16` | `fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]`; `<div aria-hidden="true" className="h-20 lg:h-16" />` | PASS |
| A18 | Rules › Tap targets | 44x44 px or more | `atoms/button.variants.ts:24-25,51-52` | `sm: 'h-9 … after:-inset-y-1 after:content-[""]'`, `md: 'min-h-11 …'`; icon `sm: 'size-9 after:absolute after:-inset-1 …'`, `md: 'size-11'` | PASS |
| A19 | Rules › Tap targets (fix commit `9f3e5f71`) | Adjacent small buttons do not eat each other's hit area | `organisms/PracticeRecordingList.tsx:41`; `organisms/SceneControls.tsx:30,46` | `<li key={entry.id} className="flex min-h-11 items-center gap-2">` around a `size={isCompact ? 'sm' : 'md'}` record button (36 + 2x4 extension = 44 per row, plus `divide-y`); `const GROUP_CLASS = 'flex items-center gap-2 shrink-0';` between `size="sm"` buttons (two 4 px extensions meet in an 8 px gap); scroll row `… overflow-x-auto … p-1 …` keeps the 4 px extension inside the clipping box | PASS |
| A20 | Design system › Contrast | Every listed text pair at 4.5:1 or more in both schemes | `lib/design-tokens.utils.test.ts:188` | `it.each(SCHEMES)('keeps every listed text pair at 4.5:1 or more in the %s scheme', …)`; core suite exit 0 (C01) | PASS |
| A21 | Rules › No value outside the tokens | A class naming an undefined token fails | `lib/design-tokens.utils.test.ts:221,231` | `'names only colour variables the stylesheet defines'`, `'uses only colour, text, radius and shadow utilities the stylesheet generates'` | PASS |
| A22 | Slice 1 atom list | Replaced components gone, nothing unused | `pnpm exec knip` | exit 0 | PASS |
| A23 | Gates cited in their standard | Each new mechanism resolves in the ledger | `scripts/standards/enforcement-ledger.ts --check` | "Every standard names a mechanism that exists and runs." | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the 269 changed `.ts/.tsx/.js/.mjs/.mts/.cjs` files | exit 0 | PASS |
| B02 | Prettier | `pnpm exec prettier --check --ignore-unknown` on changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B05 | No `any`; assertions only `as const` / `as unknown` | grep over the 8256 added lines of changed code files | the one `\bany\b` and the one `as <Word>` hit are inside harness string literals (`'… before any scroll'`, `'argent gesture-tap / …'`) | PASS |
| B06 | `useEffect` is a smell | `grep 'useEffect('` over added lines | none added | PASS |
| B07 | No comments | added lines opening `//` or `/*`; `check-no-comments-in-styles-and-markup.sh` | only `@Blueprint` blocks, `@ts-expect-error -- …` in `button.types.test.ts`, `/** @type … RuleModule */` on the three rules, and `// Stryker disable next-line EqualityOperator: equivalent mutant, …` in `member-color.utils.ts`; script exit 0 | PASS |
| B08 | Names carry intent; no one-letter locals | grep of added lines for one-letter `const`/`let` and arrow parameters | none found; sampled `waitForMain`, `reachableHitBox`, `clipExtension`, `selectInkOnMemberColor`, `GROUP_CLASS` | PASS |
| B09 | Generated-file and doc gates | `enforcement-ledger.ts --check`, `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `architecture-graph.ts --check`, `check-doc-links.ts`, `check-vocabulary-paths.sh`, `check-mutation-covers-gated-files.sh` | all exit 0 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm run test:core` in `apps/pragma` | 0; 269 files, 2679 tests; 100% statements (4379/4379), branches (2076/2076), functions (1262/1262), lines (3743/3743) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm test` in `apps/pragma` | 0; 29 files, 301 tests | PASS |
| C03 | root (`eslint-rules/`, `scripts/standards/`) | `pnpm run test:eslint-rules` | 0; 72 files, 1564 tests | PASS |
| C04 | @borso-app/pragma mutation, the 20 changed `*.core.ts` / `*.utils.ts` / `*.adapter.ts` | `pnpm exec stryker run --mutate <20 files>` | 0; "Final mutation score of 100.00"; 1011 killed, 2 timed out, 0 survived, 0 no coverage | PASS |
| C05 | root mutation | `pnpm exec stryker run --mutate scripts/standards/citations.core.ts,scripts/standards/ledger.core.ts` | 0; 100.00, 90 and 166 killed | PASS |
| C06 | @borso-app/pragma build | `pnpm build` | 0 | PASS |
| C07 | Every `*.utils.ts` and `*.core.ts` has its sibling test | `find site api domain scripts -name '*.utils.ts' -o -name '*.core.ts'` (175 files), each checked for `.test.ts(x)` | none missing | PASS |

## D. Test coverage of spec

29 use cases routed to /visual-validation; out of scope for this report: the 8 happy paths, every acceptance-table row (the tap-target row included), the 5 error cases, and the edge cases that are screen behaviour or belong to slices 2 to 6 (no cover, more than six members, two instruments in one cell, a member in no song, every song already in the setlist, an empty setlist, entries with no energy, pasted chart, deleted session, no session ahead, dark mode, the six practice-mode cases). The rows below walk *Edge cases* in order, one row per claim, then the slice 1 parts of *Test strategy* › Unit and › Gates.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Entry note typed fast on a slow network: the server keeps the last text typed | `it.each(…RACE_RUNS…)`, `latest-text-save.hook.test.tsx:59`; fails on `expect(server.stored).toBe(FULL_TEXT);` (`:78`) | PASS |
| D02 | A reply to an older save never overwrites a newer one | Same test, replies landing out of order; fails on `expect(server.requests.at(-1)).toBe(FULL_TEXT);` (`:77`) and `:78` | PASS |
| D03 | Closing the entry sheet before the pause ends still saves the full note | `'saves the full note when the sheet is closed before the pause ends'`, `SetlistEntryRow.test.tsx:142`; fails on `expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });` (`:151`) | PASS |
| D04 | Transition sheet closed by the backdrop with a typed draft: kept and shown on reopening | `'is kept after a click on the backdrop and shown on reopening'`, `TransitionCommentModal.test.tsx:62`; fails on `expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();` (`:69`) | PASS |
| D05 | Same, closed by Escape | structural: the draft is written on every change (`TransitionCommentModal.tsx:84`) and the only `kept.discard()` in `site/src` is the save's `onSuccess` (`:47`), so how the sheet closes cannot reach it | PASS |
| D06 | A member colour close to `accent` or very pale: the colour stays as stored | `'fills a cell with the stored member colour and inks it with the readable ink'`, `MemberMark.test.tsx:35`; `expect(coral?.style.backgroundColor).toBe('rgb(232, 123, 98)');` (`:37`) | PASS |
| D07 | Ink on that colour chosen by contrast, readable on any stored colour | `'takes the light ink on a colour as dark as the dark ink'`, `member-color.utils.test.ts:114`; `expect(selectInkOnMemberColor('#000000')).toBe('on-color-light');`, `…('#ffffff')).toBe('on-color-dark');` | PASS |
| D08 | Unit: each of the five palette colours at 4.5:1 or more with the chosen ink | `member-color.utils.test.ts`, fails on `expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(4.5);` (`:111`) | PASS |
| D09 | Unit: a malformed hex | `'falls back to the dark ink on a malformed colour'`, `member-color.utils.test.ts:119`; `expect(selectInkOnMemberColor('coral')).toBe('on-color-dark');` | PASS |
| D10 | Unit: the last-write-wins helper | `latest-text-save.utils.test.ts`, 100% coverage (C01), no surviving mutant (C04) | PASS |
| D11 | Members created without a colour get the five-colour palette | `'takes the first palette colour for an empty band'`, `members-page.core.test.ts:57`; `'falls back to the first colour once all five are taken'` (`:65`) | PASS |
| D12 | Gate: the button type | `'refuse to type-check without the icon or the name each one requires'`, `button.types.test.ts:8`, three `@ts-expect-error`; typecheck exit 0 (B03) means each expected error fires | PASS |
| D13 | Gate: the new lint rules with `RuleTester` suites | `no-arbitrary-tailwind-value`, `no-raw-interactive-element`, `no-vertical-scroll-container` suites (C03) | PASS |
| D14 | Gate: one scroll, `/catalog/:songId/edit` its one exception | `no-vertical-scroll-container` with its inline exception in `SongChordPreview.tsx`; ESLint exit 0 | PASS |
| D15 | Gate: contrast test over the token values | `design-tokens.utils.test.ts:188`, per scheme | PASS |
| D16 | Gate: a class naming an undefined colour token fails | `'names only colour variables the stylesheet defines'`, `design-tokens.utils.test.ts:221` | PASS |
| D17 | Every button has an icon, held for list rows | `'opens the task from a button that carries an icon beside the title'`, `TaskRow.test.tsx:14`; fails on `expect(openingButton.querySelector('svg')).not.toBeNull();` (`:28`) | PASS |
| D18 | Each gate cited in its standard | `enforcement-ledger.ts --check` exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | the API and domain diff is the four `member-palette.*` files; `grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` over it is empty | PASS |
| E02 | API module state | Per-process state | `grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` over the changed `api/` and `domain/` lines: none | PASS |
| E03 | Site store `transition-draft.store.ts` | Per-process state | `const listeners = new Set<Listener>();`: client-only, per tab; the spec asks only that the draft survives a close on the same device | PASS |
| E04 | Entry note, key and capo saves | Two saves for one field at once | one save in flight per field (`latest-text-save.utils.ts:38`, `if (state.inFlightText !== null) return null;`) | PASS |

## Notes

- A01: the full 13-task comparison ran once on `9f3e5f71` and matched. The slice 1 measures (`--routes --slice-1`, tap targets included) are `/visual-validation` acceptance rows and were not re-run here.
- Question, new: `9f3e5f71` changed the probe's threshold from `box.width < minimum` to `Math.round(box.width) < minimum` (`page-probes.setup.ts`, `COUNT_SMALL_TAP_TARGETS`). A hit area of 43.5 to 43.99 px now counts as 44. No such control was found, and finding one would need an instrumented probe run, so this is not a FAIL row. Is half a pixel of tolerance intended under a rule that says "44x44 px or more"?
- Disclosed plan deviations, carried, not graded: `scripts/task-speed/` and its package script are kept although the plan's *Pattern coherence* section deletes them (commit `d8ec262e`: "task-metrics does not yet cover every walk it measures"); `BottomActions` sits in `atoms/` where the plan put it in `molecules/`.
- Question, carried: `TransitionCommentModal.tsx` keeps a fixed `rows={6}` `textarea` with `resize-y`, unchanged from `origin/main`, while the spec says "text areas grow". Should slice 3, which rebuilds the transition sheet, make it an `AutoGrowTextarea`?
- Question, carried: the root Stryker config does not mutate `eslint-rules/*.js`. Should the `RuleTester` suites be held by mutation, given these rules are the design system's only gate against arbitrary values?
- `scripts/standards/seal.ts verify` is plan gate 15 (`/standards-review`) and outside this report.

## Verdict: PASS
