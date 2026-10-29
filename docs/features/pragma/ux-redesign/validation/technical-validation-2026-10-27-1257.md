# Technical validation — Pragma redesign, slice 1 (foundation)

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 1
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-ux-redesign
- Base: origin/main (merge base `3bd18b51`)
- Run at: 2026-10-27T12:57:30Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics), root (`eslint-rules/`, `scripts/standards/`, `eslint.config.js`, `knip.json`)

Scope: slice 1 only (tokens, Newsreader, atoms and molecules, `Sheet`, required icons, member colour atoms, the two note-loss fixes, the slice 1 gates, the task-metrics harness moved into the repository). Rows for slices 2 to 6 are out of scope. The acceptance-table rows are `/visual-validation` assertions; they are cited here only where the plan makes a harness number its self-check, read from the committed `validation/slice-1-before.json` and `validation/slice-1-after.json`. The harness was not re-run in this pass.

This pass ran the validator's procedure inline: the subagent that ran it had no Agent tool, so it could not dispatch the `technical-validator` agent.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Slice 1 acceptance, Q9 | The harness reruns from the repository and reproduces every task's counts in `baseline.json` | `apps/pragma/scripts/task-metrics/task-metrics.core.ts:18`; `validation/slice-1-before.json` | `COMPARED_FIELDS = ['taps', 'textEntries', 'scrollGestures', 'screensVisited']`; comparing `slice-1-before.json` with `spec/baseline/baseline.json` over tasks 1 to 12 and 8b found 0 differences in taps, text entries, scroll gestures and screens | PASS |
| A02 | Q9 | The audit copies stop being runnable code in `docs/` | `docs/features/pragma/ux-redesign/audit/task-metrics/` | `ls` lists only `baseline.json` and `baseline.md`; `grep -rn "scratchpad\|/tmp/claude" apps/pragma/scripts/task-metrics` is empty; `check-doc-links.ts` exit 0 | PASS |
| A03 | Edge case › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | `site/src/components/molecules/latest-text-save.utils.ts:37-40`, `latest-text-save.hook.ts:43-56` | `if (state.inFlightText !== null) return null;` (one save in flight); on success `apply({ kind: 'saveSucceeded' }); sendLatest();` | PASS |
| A04 | Edge case › entry note | Key and capo carry the same fix; closing the sheet sends the pending text | `site/src/components/organisms/SetlistEntryRow.tsx:109-125` | `const keySave = useLatestTextSave({...})` … `closeSheet = () => { notesSave.flush(); keySave.flush(); capoSave.flush(); ...}` | PASS |
| A05 | Edge case › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | `site/src/lib/transition-draft.store.ts:40-55`, `TransitionCommentModal.tsx:40,84,47` | `const draft = kept.text ?? existing.data?.comment.comment ?? '';`, `onChange={(event) => kept.keep(event.target.value)}`, only `onSuccess` calls `kept.discard()` | PASS |
| A06 | Design system › Tokens, ADR-0045 | Notebook tokens, `on-color-dark` and `on-color-light` independent of the scheme | `site/src/styles/tokens.css:41-42` | `--color-on-color-dark: #0a0907;` `--color-on-color-light: #fffdf8;` (the dark ink differs from the spec's measured `#1d1914`; the commit body names the change and why) | PASS |
| A07 | Q2b, Member colours, ADR-0045 | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts:90-97` | `return contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB) ? 'on-color-light' : 'on-color-dark';`; `grep -rn readableForeground site/src` count 0 | PASS |
| A08 | Member colours | The colour reaches the screen only through `Avatar` and `MemberMark`, filled, never as text | `atoms/Avatar.tsx:15`, `atoms/MemberMark.tsx:16-23`; `LineupSlots.tsx:24`, `BandStreaks.tsx:28`, `ConcertReadView.tsx:57` | `const filled: CSSProperties = { backgroundColor: color, ...style };`; `grep -rnE "style=\{\{[^}]*[cC]olor" site/src` lists only `MemberMark.tsx:34`; harness `textSetInMemberColour` 4 to 0 | PASS |
| A09 | Q2b, "members created without one get the five-colour palette of `member-palette.utils.ts`"; operator instruction "garder la couleur pour qu'on s'habitue" | A new member gets the palette colour the band has been getting | `apps/pragma/domain/member-palette.core.ts:1-7`, `api/src/members/member-palette.utils.ts:1`, `site/src/routes/members/members-page.core.ts:29-33` | Diff replaces the API palette `{ name: 'coral', hex: '#e87b62' }, … '#3a9b9b', '#d6a93c', '#8a4f7a', '#7a9b6f'` with `'#c4583a', '#3d8a8a', '#c4912b', '#8a4870', '#6e8a48'` | FAIL |
| A10 | ADR-0046 | Newsreader replaces Instrument Serif | `apps/pragma/package.json`, `site/src/main.tsx`; `dist/assets` | `pnpm build` exit 0; `dist/assets` holds `newsreader-latin-opsz-normal-*.woff2` and `newsreader-latin-opsz-italic-*.woff2` and no Instrument Serif file; `grep -rln instrument-serif apps/pragma` (sources) empty | PASS |
| A11 | ADR-0046 | Titles upright; only notes and comments use the italic display face | `SetlistEntryNotesField.tsx:37`, `TransitionCommentModal.tsx:91`, `SongNotes.tsx:47`, `BarForm.tsx:281`, `TaskForm.tsx:181`, `TransitionStrip.tsx:73`, `ConcertReadView.tsx:83` | Every `font-display … italic` hit renders a `notes` field or a transition comment, for example `<form.Field name="notes">` … `className="font-display italic"` (`BarForm.tsx:272-281`) | PASS |
| A12 | Type roles, acceptance "distinct font sizes" and "`text-[`" | Six roles; no arbitrary text size | `tokens.css`; `slice-1-after.json` | `grep -rn "text-\[" site/src` (tests excluded) count 0; harness distinct sizes outside the scene views 18 to 5 (`12px, 14px, 16px, 19px, 30px`) | PASS |
| A13 | Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink`, `label` on `IconButton` | `atoms/Button.tsx:7`, `atoms/IconButton.tsx:10-11,22` | `readonly icon: IconName;`, `aria-label={label}`; harness text-only buttons 181 to 0, icon-only without a name 0 | PASS |
| A14 | Rules › One icon per verb | Icon sizes are the three named sizes; Lucide notice carried | `atoms/Icon.tsx`, `apps/pragma/THIRD_PARTY_NOTICES.md` | `grep -rnE "size=\{[0-9]+\}" site/src` hits only `BrandLogo` (not `Icon`); the notice file exists | PASS |
| A15 | Rules › Sheets, D10 | One `Sheet` on `<dialog>` with grabber, title, Close icon button, one scroll body, footer padded by the safe area | `molecules/Sheet.tsx:22-24,55-91`, `sheet.variants.ts:21` | `'pb-[max(16px,env(safe-area-inset-bottom))]'`, `<IconButton data-sheet-close icon="close" label={t('common.close')} …/>`, `SHEET_BODY_CLASS = 'min-h-0 flex-auto overflow-y-auto …'` | PASS |
| A16 | Slice 1, 14 dialogs; acceptance "raw `<dialog>` outside `Sheet`" | Every dialog renders inside `Sheet` | `grep -rln "<dialog" site/src` | Lists `Sheet.tsx`, `SongScenePage.tsx`, `SetlistScenePage.tsx`; the two scene pages carry `-- the scene view is a full-screen stage, not a sheet` exceptions, as the plan allows | PASS |
| A17 | Rules › focus, rank 23 | A sheet holding a field focuses the first field, else Close | `site/src/lib/modal-dialog.adapter.ts:13-18` | `dialog.querySelector(FIRST_FIELD_SELECTOR) ?? dialog.querySelector(CLOSE_BUTTON_SELECTOR)`; harness `focusOnCancelOrCloseWithField` 3 to 0 | PASS |
| A18 | Rules › One scroll | Sheet bodies are the one scroll; the document scrolls; text areas grow | `eslint.config.js` (`no-vertical-scroll-container`), `SongChordPreview.tsx:27` | Remaining `overflow-y-auto`: `sheet.variants.ts:21`, the two scene pages, and `SongChordPreview.tsx:28` under a slice 6 exception; harness `sheetsWithInnerVerticalScroll` 2 to 0, routes with two or more vertical scroll areas 2 to 1 (`/catalog/:songId/edit`) | PASS |
| A19 | Rules › Primary action placement, graft 2 | Bottom strip of pills, never hidden on scroll, no round floating button | `site/src/components/atoms/BottomActions.tsx`; `SetlistEditor.tsx` | `<Button variant="primary" icon="plus" onClick={() => setPickerOpen(true)}>`; `bottom-action-bar.hook.ts` gone; harness `addSongAtStart.top` 702 = `addSongAtPageEnd.top` 702 | PASS |
| A20 | Rules › Tap targets ("stay at 44x44 px or more"); plan row *Rules › Tap targets*, self-check "no tappable element under 44 px on the 26 routes" | Every tappable element is 44x44 px or more | `validation/slice-1-after.json` › `sliceOne.totals.tapTargetsUnder44` | `"tapTargetsUnder44":68`; `/tasks` `'Mark as done 16x16'` x12, `/setlists/:setlistId` `'View / comment the transition 358x24'` x19 | FAIL |
| A21 | Design system › Contrast; acceptance "text pairs under 4.5:1" | Every listed text pair at 4.5:1 or more in both schemes | `site/src/lib/design-tokens.utils.test.ts:186` | `it.each(SCHEMES)('keeps every listed text pair at 4.5:1 or more in the %s scheme'`; harness `textPairsUnderMinimumContrast` 0 | PASS |
| A22 | Rules › No value outside the tokens | A class naming an undefined token fails the build | `design-tokens.utils.test.ts:219,229`; canary in `scripts/standards/canary-registry.ts` | `'uses only colour, text, radius and shadow utilities the stylesheet generates'`; canary plants `'bg-surface'` and expects `/GateCanaryToken\.tsx: bg-surface/` | PASS |
| A23 | Slice 1 atom list | `SectionTabs`, `ListRow`, `PageHeader`, `EmptyState`, `Menu`, `ButtonLink`, `IconButton`, `MemberMark` exist and are used | `site/src/components/{atoms,molecules}/` | All present; `EnergyBar`, `SegmentButton`, `StickyFormActions`, `Crumb`, `BottomActionBar`, `OverflowMenu`, `VoteModeToggle` absent; `pnpm exec knip` exit 0 | PASS |
| A24 | Gates cited in their standard | Each new mechanism resolves in the ledger, scoped to pragma | `scripts/standards/citations.core.ts`, `ledger.core.ts`; `docs/standards/{03,05,08,12}-*.md` | `enforcement-ledger.ts --check`: "Every standard names a mechanism that exists and runs." | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the 265 changed `.ts/.tsx/.js/.mjs/.mts` files | exit 0 | PASS |
| B02 | Prettier | `prettier --check --ignore-unknown` on changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B05 | Type assertions limited to `as const` / `as unknown`; no `any` | grep on added lines | No `as <Type>` and no `: any` in added code | PASS |
| B06 | `useEffect` is a smell | `grep -E "^\+.*useEffect\("` on the site diff | none added; the save timer is owned by handlers (`latest-text-save.hook.ts:59-66`), the draft lives in a `useSyncExternalStore` store | PASS |
| B07 | No comments | grep on added comment lines, minus machine annotations; `check-no-comments-in-styles-and-markup.sh` | No prose comments added; the one `// Stryker disable next-line … -- reason` at `member-color.utils.ts:93` is an annotation with its reason | PASS |
| B08 | Magic numbers named | Sample | `TEXT_SAVE_PAUSE_MS = 600`, `MEMBER_LANE_TINT_SHARE = '18%'`, `CONTRAST_OFFSET = 0.05`, `KEY_SEPARATOR = '>'` | PASS |
| B09 | Generated-file gates | `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `architecture-graph.ts --check`, `check-vocabulary-paths.sh`, `check-doc-links.ts`, `gate-canaries.ts --inventory` | all exit 0; "115 gate(s), 115 with a canary." | PASS |
| B10 | A `@FollowsBlueprint` marker sits on the symbol it claims (CLAUDE.md, *Architecture map*; dantotsu "the marker that moved to the function below it") | Read of `eslint-rules/no-arbitrary-tailwind-value.js` | Lines 42-44: `// @FollowsBlueprint lint-rule` / `/** @type {import('eslint').Rule.RuleModule} */` / `function reportStyleColours(context, candidate) {`. The marker and the `RuleModule` type annotate the helper, not the rule object (`export default {` further down); the two sibling rules place both above `export default` | FAIL |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm --filter @borso-app/pragma run test:core` | 0; 268 files, 2672 tests; coverage 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma test` | 0; 29 files, 301 tests | PASS |
| C03 | root (`eslint-rules/`, `scripts/standards/`) | `pnpm run test:eslint-rules` | 0; 72 files, 1564 tests | PASS |
| C04 | @borso-app/pragma mutation, changed `*.core.ts` / `*.utils.ts` / `*.adapter.ts` (17 files, `task-metrics.core.ts` and `latest-text-save.utils.ts` included) | `pnpm exec stryker run --mutate <list>` | 0; score 100.00 (838 killed, 2 timeout, 0 survived) | PASS |
| C05 | root mutation, `citations.core.ts`, `ledger.core.ts` | `pnpm exec stryker run --mutate <list>` | 0; score 100.00 (256 killed) | PASS |
| C06 | @borso-app/pragma build | `pnpm build` | 0 | PASS |
| C07 | Every `*.utils.ts` has its sibling test | listing | `latest-text-save.utils.test.ts`, `transition-draft.utils.test.ts`, `design-tokens.utils.test.ts`, `member-color.utils.test.ts`, `member-palette.utils.test.ts` (site and api), `class-name.utils.test.ts` present and run | PASS |

## D. Test coverage of spec

The slice 1 behaviours testable outside a browser come from *Use cases / edge cases* (the two note-loss edge cases, the member colour edge case) and the slice 1 parts of *Test strategy* › Unit and › Gates. All happy paths and the acceptance-table rows are routed to `/visual-validation`; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Entry note typed fast on a slow network: the last text typed is stored | `'stores the full text whatever order the replies come back in (run %i)'`, 8 runs, `latest-text-save.hook.test.tsx:58-79`; fails on `expect(server.stored).toBe(FULL_TEXT);` | PASS |
| D02 | A reply to an older save never overwrites a newer one | Same test: the fake server stores each request on its own reply delay (`REPLY_DELAYS_MS`), so two saves in flight would leave the earlier text stored; `expect(server.requests.at(-1)).toBe(FULL_TEXT)`; the transition rules at 100% mutation score in `latest-text-save.utils.test.ts` | PASS |
| D03 | Closing the entry sheet before the pause ends still saves the full note | `'saves the full note when the sheet is closed before the pause ends'`, `SetlistEntryRow.test.tsx:142` | PASS |
| D04 | Transition sheet closed by the backdrop with a typed draft: the draft is kept and shown on reopening | `'is kept after a click on the backdrop and shown on reopening'`, `TransitionCommentModal.test.tsx:62-70`; fails on `expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();` | PASS |
| D05 | Same, closed by Escape | structural: Escape fires the dialog's `close`, which reaches `onClose` like the backdrop; the draft is written on every change (`TransitionCommentModal.tsx:84`) and only a successful save clears it (`:47`), so how the sheet closes cannot reach the draft | PASS |
| D06 | The draft is gone after a successful save | `'is gone once saved: …'`, `TransitionCommentModal.test.tsx:72-91` | PASS |
| D07 | A member colour close to `accent` or very pale: ink chosen by contrast, glyph readable on any stored colour | `selectInkOnMemberColor` tests, `member-color.utils.test.ts:101-125` (five colours, black and white, malformed hex) | PASS |
| D08 | Unit: `member-color.utils.ts`, each of the five palette colours at 4.5:1 or more, malformed hex | `it.each([...['coral', '#c4583a', …]])('draws on %s (%s) with %s at 4.5:1 or more'`, `member-color.utils.test.ts:101`; `'falls back to the dark ink on a malformed colour'` | PASS (see A09 for which five colours) |
| D09 | Gate: the button type | `button.types.test.ts:8-16` with three `@ts-expect-error`; canary `'a pragma button drawn without its icon'` | PASS |
| D10 | Gate: the new lint rules with `RuleTester` suites | `no-arbitrary-tailwind-value.test.js`, `no-raw-interactive-element.test.js`, `no-vertical-scroll-container.test.js` | PASS |
| D11 | Gate: one-scroll test over every route and sheet, `/catalog/:songId/edit` its one exception | `no-vertical-scroll-container` over `apps/pragma/site/src/**` with the exception written at `SongChordPreview.tsx:27` | PASS |
| D12 | Gate: contrast test over the token values | `design-tokens.utils.test.ts:186` | PASS |
| D13 | Gate: a class naming a colour token `tokens.css` does not define fails | `design-tokens.utils.test.ts:219,229` and the `bg-surface` canary | PASS |
| D14 | Each gate cited in its standard | `enforcement-ledger.ts --check` exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | `git diff -- 'apps/pragma/api/**'` touches only `member-palette.utils.ts` (a pure pick, no `insert(`, `update(`, `delete(`, `transaction(` or `onConflict` added) | PASS |
| E02 | API module state | Per-process state | No module-level `let` or `new Map/Set` added under `api/` | PASS |
| E03 | Site module store `transition-draft.store.ts:14-15` | Per-process state | Client-only, per tab, deliberately not shared; the spec asks only that the draft survives a close on the same device | PASS |
| E04 | Entry note, key and capo saves (`PATCH` per field) | Two saves for one field at once | Held client-side by one save in flight per field (`latest-text-save.utils.ts:38`), and each `PATCH` carries only its own field (`SetlistEntryRow.tsx:111-119`), so note and key saves cannot overwrite each other | PASS |

## Notes

- **A09 (FAIL).** Failing case: a member created without a colour through `POST /api/members` as the first member of a band now stores `#c4583a`; before this branch `pickPaletteHex(0)` stored `#e87b62`. On the members page, `selectFreePaletteColor` (`members-page.core.ts:30-33`) lowercases the stored colours and skips only the new five, so in a band whose coral member holds `#e87b62` the next member is offered `#c4583a`, a second coral close to the first. The spec's own contrast figures (coral 2.78:1 and 6.19:1, teal 3.26:1 and 5.28:1, mustard 2.15:1 and 7.99:1, plum 5.94:1, sage 3.06:1 and 5.61:1) are exactly those of `#e87b62`, `#3a9b9b`, `#d6a93c`, `#8a4f7a`, `#7a9b6f` against `#fffdf8` and `#1d1914`, so the palette the spec measured is the API palette this branch replaced. The plan called the token values "the five hex values the band already has", but this branch holds no evidence of that, and `scripts/db-read.sh` timed out from this session, so the band's stored colours could not be read. The commit body of `d8ec262e` names the change as an observable property. The operator's instruction is that members keep their colour so the band gets used to it. Keeping the API palette's five values as `MEMBER_PALETTE` meets that instruction and still meets the spec, because with the chosen inks they measure 5.94:1 to 9.10:1. `member-color.utils.test.ts` should then pin those five values. No existing member row is written, and that part holds.
- **A20 (FAIL).** `slice-1-after.json` counts 68 tappable elements under 44 px (150 before). The largest groups are the transition line button (`358x24`, 19 on each setlist route), the task "Mark as done" checkbox (`16x16`, 12 on `/tasks`), form checkboxes (`INPUT 20x20` on `/catalog/new`, `/catalog/:songId/edit` and `/account`), and three `20 px` high links on `/compos`. The plan's self-check for *Rules › Tap targets* is 0 on the 26 routes. Either those controls get a 44 px hit area in this slice, or the plan row must say which slice owns them. The transition line belongs to slice 3, which rebuilds it as "Note this transition".
- **B10 (FAIL).** Move `// @FollowsBlueprint lint-rule` and the `@type` JSDoc down to `export default {` in `eslint-rules/no-arbitrary-tailwind-value.js`. Today the index records `reportStyleColours` as a follower of `lint-rule`, and the rule object loses its `RuleModule` type annotation.
- Plan deviations that are disclosed and not graded: `scripts/task-speed/` is kept, although the plan's *Pattern coherence* section deletes it, and the commit gives the reason. `BottomActions` sits in `atoms/`, while the plan placed it in `molecules/`. The harness has no "one-scroll verdict with its exception list" in `task-metrics.core.ts`; the lint rule carries that gate instead (D11). The dark ink is `#0a0907`, not `#1d1914` (A06).
- Question: the harness note race recorded `"requests":1` in all 8 after-runs. The 600 ms pause folds the typing into one request, so the after value shows that no race occurs, not how one is resolved. The replay with out-of-order replies is proved only by D01 and D02. Should the harness's typing gaps straddle the pause so that it also exercises a second save?
- Question: the entry sheet's focus now lands on the key `input` (`focusedTag: "input"`, `focusedName: ""` in `slice-1-after.json`), which is the first field and so follows the slice 1 rule. The spec's happy path wants the focus in the note field, which is slice 3's entry-sheet rebuild. Is that the intended order?
- Question: `TransitionCommentModal.tsx:82-93` keeps a fixed `rows={6}` `textarea` with `resize-y`, which scrolls inside itself past six lines. The spec says "text areas grow", and the lint rule does not see a `textarea`'s own scroll. Should it be an `AutoGrowTextarea` like the note fields?
- `scripts/standards/seal.ts verify` fails on this branch because `/standards-review` has not run yet. That is plan gate 15 and is outside this report.

## Verdict: FAIL
