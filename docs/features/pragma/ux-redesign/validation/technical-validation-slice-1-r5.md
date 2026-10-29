# Technical validation — Pragma redesign, slice 1 (foundation), fifth pass

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 1
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-ux-redesign (HEAD `444443eb`)
- Base: origin/main (merge base `3bd18b51`)
- Run at: 2026-10-27T19:42:16Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics), root (`eslint-rules/`, `scripts/standards/`, `eslint.config.js`)
- Previous pass: [`technical-validation-slice-1-r4.md`](./technical-validation-slice-1-r4.md) PASS; then [`visual-validation-slice-1-r4.md`](./visual-validation-slice-1-r4.md) FAIL on its row 02

Scope: slice 1 only. Rows for slices 2 to 6 are out of scope. The acceptance-table rows are `/visual-validation` assertions and are not graded here, except the harness reproduction (A01), which this pass re-ran.

Since the fourth pass, two commits landed: `0c0ba010` (the visual report, docs only) and `444443eb`, which puts the `chevR` back on the task row's open button (`TaskRow.tsx:42`, `isChevronShown={false}` removed) and adds `TaskRow.test.tsx`. Every gate below was re-run on HEAD `444443eb` this pass, including the full 13-task harness comparison.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Slice 1 acceptance, Q9 | The harness reruns from the repository and reproduces every task's counts in `baseline.json` | `apps/pragma/scripts/task-metrics/`; `pnpm run task-metrics -- --tasks all --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json` | Run this pass, exit 0: `[task] 1: taps=18 textEntries=0 scrollGestures=3 screensVisited=7` … `[task] 8b: taps=6 textEntries=1 scrollGestures=0 screensVisited=4`, then `[compare] no difference with …/baseline.json for 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 8b`. `grep -rn "scratchpad\|/tmp/claude" apps/pragma/scripts/task-metrics` is empty | PASS |
| A02 | Q9 | The audit copies stop being runnable code in `docs/` | `docs/features/pragma/ux-redesign/audit/task-metrics/` | `ls` lists `baseline.json`, `baseline.md` only; `check-doc-links.ts` exit 0 | PASS |
| A03 | Edge case › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | `site/src/components/molecules/latest-text-save.utils.ts:37-39`, `latest-text-save.hook.ts:47-51` | `if (state.inFlightText !== null) return null;` `return state.latestText === state.savedText ? null : state.latestText;`; on success `apply({ kind: 'saveSucceeded' }); sendLatest();` | PASS |
| A04 | Edge case › entry note; plan decision on key and capo | Key and capo carry the same fix; closing the sheet sends the pending text | `site/src/components/organisms/SetlistEntryRow.tsx:109-126` | `const notesSave = useLatestTextSave({ … })`, `keySave`, `capoSave`; `closeSheet`: `notesSave.flush(); keySave.flush(); capoSave.flush();` | PASS |
| A05 | Edge case › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | `TransitionCommentModal.tsx:40,47,84`; `lib/transition-draft.store.ts:40-55` | `const draft = kept.text ?? existing.data?.comment.comment ?? '';`; only the save's `onSuccess` calls `kept.discard();`; `onChange={(event) => kept.keep(event.target.value)}` | PASS |
| A06 | Design system › Tokens, ADR-0045 | Two scheme-independent inks for anything on a member colour | `site/src/styles/tokens.css:41-42` | `--color-on-color-dark: #0a0907;` `--color-on-color-light: #fffdf8;` | PASS |
| A07 | Q2b, Member colours | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts:90-97` | `return contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB) ? 'on-color-light' : 'on-color-dark';`; `grep -rn readableForeground site/src` empty | PASS |
| A08 | Member colours | The colour reaches the screen through `Avatar` and `MemberMark`, never as text | `atoms/Avatar.tsx:15`, `atoms/MemberMark.tsx:16-23,34` | `const filled: CSSProperties = { backgroundColor: color, ...style };`; `dot`/`cell` → `backgroundColor`, `ring` → `borderColor`, `lane` → `color-mix(in srgb, ${color} ${MEMBER_LANE_TINT_SHARE}, var(--color-paper))`. Every other `style={…}` under `site/src` sets a width, transform, opacity, height, left or font size, none a member colour | PASS |
| A09 | Q2b; operator: "garder la couleur pour qu'on s'habitue" | A new member gets the palette the API already stored; no stored colour changes | `apps/pragma/domain/member-palette.core.ts:1-7`; `api/src/members/member-palette.utils.ts:1` | The five `{ name, hex }` entries moved verbatim from the API file to `domain/` (`'#e87b62'`, `'#3a9b9b'`, `'#d6a93c'`, `'#8a4f7a'`, `'#7a9b6f'`); the API and domain diff is the four `member-palette.*` files, no schema, migration or write | PASS |
| A10 | ADR-0046 | Newsreader replaces Instrument Serif, `opsz` stylesheets | `site/src/main.tsx:2-3`; `package.json:42` | `import '@fontsource-variable/newsreader/opsz.css';`, `…/opsz-italic.css`; `"@fontsource-variable/newsreader": "5.3.0"`; build exit 0 emits `newsreader-latin-opsz-normal-*.woff2` and `-italic-*` (other subsets by `unicode-range`, as the ADR states); no `instrument-serif` in sources or `package.json` | PASS |
| A11 | ADR-0046 | Titles upright; notes use the italic display face | `SetlistEntryNotesField.tsx:37`, `TransitionCommentModal.tsx:91` | `className="font-display italic"`; `'font-display italic resize-y'` | PASS |
| A12 | Type roles | Six roles 30/22/19/16/14/12; no arbitrary text size | `tokens.css:59-74`; `grep -rc "text-\[" site/src` | `--text-display: 30px;` … `--text-label: 12px;`; no file with a `text-[` | PASS |
| A13 | Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink`, `label` on `IconButton` | `atoms/Button.tsx:7`, `atoms/ButtonLink.tsx:8`, `atoms/IconButton.tsx:11,22` | `readonly icon: IconName;`, `readonly label: string;`, `aria-label={label}` | PASS |
| A14 | Rules › list rows end in `chevR` (fix commit `444443eb`) | The task row's open button carries an icon | `molecules/TaskRow.tsx:42` | `<ListRow className={OPENING_BUTTON_CLASS} onClick={props.onOpen}>` (the `isChevronShown={false}` the r4 visual pass caught is gone) | PASS |
| A15 | Rules › Sheets, D10 | One `Sheet` on `<dialog>`: grabber, title, Close, one scroll body, safe-area footer | `molecules/Sheet.tsx:22-24,62-82` | `'pb-[max(16px,env(safe-area-inset-bottom))]'`; grabber `h-1 w-9 … bg-rule-strong`; `<IconButton data-sheet-close icon="close" …>` | PASS |
| A16 | Slice 1, 14 dialogs | Every dialog renders inside `Sheet` | `grep -rln "<dialog" site/src` | `Sheet.tsx`, `LineupEditor.test.tsx` (a test), `SongScenePage.tsx`, `SetlistScenePage.tsx` (the plan's two scene exceptions) | PASS |
| A17 | Rules › focus, rank 23 | A sheet holding a field focuses the first field, else Close | `site/src/lib/modal-dialog.adapter.ts:13-17` | `dialog.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR) ?? dialog.querySelector<HTMLElement>(CLOSE_BUTTON_SELECTOR);` | PASS |
| A18 | Rules › One scroll | Nothing inside the document scrolls vertically | `eslint-rules/no-vertical-scroll-container.js` | ESLint exit 0 over all changed files (B01) | PASS |
| A19 | Rules › Primary action placement | Bottom strip of pills, no round floating button, spacer equal to the strip | `atoms/BottomActions.tsx:7-18` | `fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]`, `pt-5 pb-2` around a 52 px pill, spacer `<div aria-hidden="true" className="h-20 lg:h-16" />` | PASS |
| A20 | Rules › Tap targets | 44x44 px or more | `atoms/button.variants.ts:24-25,51-52` | `sm: 'h-9 … after:-inset-y-1 after:content-[""]'`, `md: 'min-h-11 …'`; icon `sm: 'size-9 after:absolute after:-inset-1 …'`, `md: 'size-11'` | PASS |
| A21 | Design system › Contrast | Every listed text pair at 4.5:1 or more in both schemes | `lib/design-tokens.utils.test.ts:188,196` | `it.each(SCHEMES)('keeps every listed text pair at 4.5:1 or more in the %s scheme', …)`; core suite exit 0 (C01) | PASS |
| A22 | Rules › No value outside the tokens | A class naming an undefined token fails the build | `lib/design-tokens.utils.test.ts:221,231` | `'names only colour variables the stylesheet defines'`, `'uses only colour, text, radius and shadow utilities the stylesheet generates'`; core suite exit 0 | PASS |
| A23 | Slice 1 atom list | New atoms and molecules exist and are used; replaced ones gone | `site/src/components/{atoms,molecules}/` | `EnergyBar`, `SegmentButton`, `StickyFormActions`, `Crumb`, `BottomActionBar`, `OverflowMenu`, `VoteModeToggle` absent; `pnpm exec knip` exit 0 | PASS |
| A24 | Gates cited in their standard | Each new mechanism resolves in the ledger | `scripts/standards/enforcement-ledger.ts --check` | "Every standard names a mechanism that exists and runs." | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the 269 changed `.ts/.tsx/.js/.mjs/.mts/.cjs` files | exit 0 | PASS |
| B02 | Prettier | `pnpm exec prettier --check --ignore-unknown` on changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B05 | No `any`; assertions only `as const` / `as unknown` | grep over every added line of the changed code files | the one `\bany\b` and the one `as <Word>` hit are both inside string literals of the harness (`'… before any scroll'`, `'argent gesture-tap / …'`) | PASS |
| B06 | `useEffect` is a smell | `grep 'useEffect('` over every added line | none added | PASS |
| B07 | No comments | added lines opening `//` or `/*`; `check-no-comments-in-styles-and-markup.sh` | only machine annotations (`@Blueprint`, `@FollowsBlueprint`), `@ts-expect-error -- …` in `button.types.test.ts`, `/** @type … RuleModule */` on the three rules, and one `// Stryker disable next-line EqualityOperator: equivalent mutant, …` at `member-color.utils.ts:93`; script exit 0 | PASS |
| B08 | Names carry intent; no one-letter locals | grep of added lines for one-letter `const`/`let` and arrow parameters | none found; sampled `selectInkOnMemberColor`, `planNextSave`, `buildTransitionDraftKey`, `MEMBER_LANE_TINT_SHARE`, `OPENING_BUTTON_CLASS` | PASS |
| B09 | Generated-file and doc gates | `enforcement-ledger.ts --check`, `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `architecture-graph.ts --check`, `check-vocabulary-paths.sh`, `check-doc-links.ts`, `check-mutation-covers-gated-files.sh` | all exit 0 | PASS |
| B10 | `@FollowsBlueprint` markers on their subjects | `blueprint-indexing.ts --check` against `blueprint-subjects.json` | exit 0; `TaskRow.test.tsx` carries `// @FollowsBlueprint test-component-render` on its `describe` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm run test:core` in `apps/pragma` | 0; 269 files, 2679 tests; 100% statements (4379/4379), branches (2076/2076), functions (1262/1262), lines (3743/3743) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm test` in `apps/pragma` | 0; 29 files, 301 tests | PASS |
| C03 | root (`eslint-rules/`, `scripts/standards/`) | `pnpm run test:eslint-rules` | 0; 72 files, 1564 tests | PASS |
| C04 | @borso-app/pragma mutation, the 20 changed `*.core.ts` / `*.utils.ts` / `*.adapter.ts` (a changed test pulling in its source) | `pnpm exec stryker run --mutate <20 files>` in `apps/pragma` | 0; "Final mutation score of 100.00 is greater than or equal to break threshold 100"; 1011 killed, 2 timed out, 0 survived, 0 no coverage | PASS |
| C05 | root mutation, `scripts/standards/citations.core.ts`, `ledger.core.ts` | `pnpm exec stryker run --mutate scripts/standards/citations.core.ts,scripts/standards/ledger.core.ts` | 0; 100.00, 90 and 166 killed | PASS |
| C06 | @borso-app/pragma build | `pnpm build` in `apps/pragma` | 0 | PASS |
| C07 | Every `*.utils.ts` and `*.core.ts` has its sibling test | `find site api domain scripts -name '*.utils.ts' -o -name '*.core.ts'`, each checked for `.test.ts(x)` | none missing; all collected by the core project (C01 at 100%) | PASS |

## D. Test coverage of spec

29 use cases routed to /visual-validation; out of scope for this report: the 8 happy paths, every acceptance-table row, the 5 error cases (slices 3 to 6), and the edge cases that are screen behaviour or belong to slices 3 to 6 (a song with no cover, more than six members, a member in no song, every song already in the setlist, a setlist with no songs, entries with no energy, pasted chart, task with a deleted session, no session ahead, dark mode, the six practice-mode cases). The rows below walk *Edge cases* in order, keeping the slice 1 bullets split into one row per claim, then the slice 1 parts of *Test strategy* › Unit and › Gates.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Entry note typed fast on a slow network: the server keeps the last text typed | `'stores the full text whatever order the replies come back in (run %i)'`, `latest-text-save.hook.test.tsx:59-80`, 8 runs with reply delays from `REPLY_DELAYS_MS = [1500, 50, 900, …]`; fails on `expect(server.stored).toBe(FULL_TEXT);` (`:78`) | PASS |
| D02 | A reply to an older save never overwrites a newer one | Same test; the fake server writes `server.stored = text` when each reply lands, so an older reply landing last would leave a prefix; fails on `expect(server.requests.at(-1)).toBe(FULL_TEXT);` (`:77`) and `:78` | PASS |
| D03 | Closing the entry sheet before the pause ends still saves the full note (plan risk row) | `'saves the full note when the sheet is closed before the pause ends'`, `SetlistEntryRow.test.tsx:142-152`; fails on `expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });` | PASS |
| D04 | Transition sheet closed by the backdrop with a typed draft: kept and shown on reopening | `'is kept after a click on the backdrop and shown on reopening'`, `TransitionCommentModal.test.tsx:62-70`; fails on `expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();` (`:69`) | PASS |
| D05 | Same, closed by Escape | structural: the draft is written on every change (`TransitionCommentModal.tsx:84`, `kept.keep(event.target.value)`) and only a successful save clears it (`:47`), so how the sheet closes cannot reach it | PASS |
| D06 | A member colour close to `accent` or very pale: the colour stays as stored | structural: `Avatar.tsx:15` and `MemberMark.tsx:17-21` pass `color` unchanged into `style`; pinned for a stored hex by `'fills a cell with the stored member colour …'`, `MemberMark.test.tsx:35-41`, `expect(coral?.style.backgroundColor).toBe('rgb(232, 123, 98)');` | PASS |
| D07 | Ink on that colour chosen by contrast, readable on any stored colour | `'takes the light ink on a colour as dark as the dark ink'`, `member-color.utils.test.ts:114-117`; fails on `expect(selectInkOnMemberColor('#000000')).toBe('on-color-light');` and `…('#ffffff')).toBe('on-color-dark')` | PASS |
| D08 | Unit: each of the five palette colours at 4.5:1 or more with the chosen ink | `'draws on %s (%s) with %s at 4.5:1 or more'`, `member-color.utils.test.ts:99-112`; fails on `expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(4.5);` | PASS |
| D09 | Unit: a malformed hex | `'falls back to the dark ink on a malformed colour'`, `member-color.utils.test.ts:119-121`; `expect(selectInkOnMemberColor('coral')).toBe('on-color-dark');` | PASS |
| D10 | Unit: the last-write-wins helper for the note field | `latest-text-save.utils.test.ts` at 100% coverage (C01) with no surviving mutant (C04) | PASS |
| D11 | Members created without a colour get the five-colour palette | `'takes the first palette colour for an empty band'`, `members-page.core.test.ts:57`; `'falls back to the first colour once all five are taken'` (`:65`); `member-palette.core.test.ts` pins the five hex values in order | PASS |
| D12 | Gate: the button type | `'refuse to type-check without the icon or the name each one requires'`, `button.types.test.ts:8`, with `@ts-expect-error` on a `Button`, a `ButtonLink` and an `IconButton` missing their prop; typecheck exit 0 (B03) means each expected error fires | PASS |
| D13 | Gate: the new lint rules with `RuleTester` suites | `no-arbitrary-tailwind-value.test.js`, `no-raw-interactive-element.test.js`, `no-vertical-scroll-container.test.js` (C03) | PASS |
| D14 | Gate: one scroll, `/catalog/:songId/edit` its one exception | `no-vertical-scroll-container` with the inline exception in `SongChordPreview.tsx`; ESLint exit 0 | PASS |
| D15 | Gate: contrast test over the token values | `design-tokens.utils.test.ts:188,196`, per scheme | PASS |
| D16 | Gate: a class naming an undefined colour token fails | `'names only colour variables the stylesheet defines'`, `design-tokens.utils.test.ts:221` | PASS |
| D17 | Every button has an icon, held for list rows (fix commit) | `'opens the task from a button that carries an icon beside the title'`, `TaskRow.test.tsx:14-29`; fails on `expect(openingButton.querySelector('svg')).not.toBeNull();` | PASS |
| D18 | Each gate cited in its standard | `enforcement-ledger.ts --check` exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | `git diff origin/main...HEAD --stat -- apps/pragma/api apps/pragma/domain` lists only the four `member-palette.*` files; no added `insert(`, `update(`, `delete(`, `onConflict` or `transaction(` | PASS |
| E02 | API module state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` over the changed `api/` and `domain/` files: none | PASS |
| E03 | Site module store `transition-draft.store.ts:14-15` | Per-process state | `const listeners = new Set<Listener>();`, `const store = { drafts: new Map() }`: client-only, per tab; the spec asks only that the draft survives a close on the same device | PASS |
| E04 | Entry note, key and capo saves | Two saves for one field at once | One save in flight per field (`latest-text-save.utils.ts:38`); each `PATCH` carries only its own field (`SetlistEntryRow.tsx:111,115,119`) | PASS |

## Notes

- A01: this pass ran the full 13-task comparison once on HEAD `444443eb` and every task matched. The slice 1 measures (`--routes --slice-1`) were not re-run here; they are acceptance rows for `/visual-validation`.
- Disclosed plan deviations, carried, not graded: `scripts/task-speed/` and its package script are kept although the plan's *Pattern coherence* section deletes them (the commit says `task-metrics` does not yet cover every walk); `BottomActions` sits in `atoms/` where the plan put it in `molecules/`.
- Question, carried: `TransitionCommentModal.tsx:82-92` keeps a fixed `rows={6}` `textarea` with `resize-y`, unchanged from `origin/main` (slice 1 moves dialogs "with their content unchanged"), which scrolls inside itself past six lines while the spec's rule says "text areas grow". Should slice 3, which rebuilds the transition sheet, make it an `AutoGrowTextarea`? `ConcertEditForm.tsx:107` and `CreateSessionDialog.tsx:180` are the other raw `textarea`s.
- Question, carried: the root Stryker config does not mutate `eslint-rules/*.js`, and the fourth pass measured survivors in `class-strings.js` and `no-arbitrary-tailwind-value.js`. Should the `RuleTester` suites pin them, given these rules are the design system's only gate against arbitrary values?
- `scripts/standards/seal.ts verify` is plan gate 15 (`/standards-review`) and outside this report.

## Verdict: PASS
