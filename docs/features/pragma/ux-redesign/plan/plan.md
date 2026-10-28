# Plan: pragma UX redesign, slice 1 (foundation)

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) and its review [`../spec/critique.md`](../spec/critique.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

This plan covers **slice 1 only**: the measuring harness moved into the repository, the Notebook tokens with their grafts, Newsreader, the atoms and molecules, every button with an icon, the 14 dialogs on one `Sheet`, the member colour atoms, the two note-loss fixes and the slice 1 gates. Slices 2 to 6 get their own plan when they start. The decisions it applies are [ADR-0047](../../../../adr/0047-pragma-design-system-is-notebook-with-grafts.md) (Notebook with grafts, members keep their stored colours) and [ADR-0048](../../../../adr/0048-newsreader-replaces-instrument-serif.md) (Newsreader). [ADR-0050](../../../../adr/0050-a-task-names-an-optional-session.md) (a task names a session) lands in slice 5 and [ADR-0051](../../../../adr/0051-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) (chord text from paste and PDF) in slice 6; nothing in this slice touches either.

Every count below was taken on this branch while planning, with `grep` over `apps/pragma/site/src` (tests left out), unless it names the harness.

## Member colours are kept

The operator's instruction for this run: member colours matter above all for the lineup, and each member keeps their colour so the band gets used to it. Slice 1 is where that rule is built, so it is stated here before anything else:

- No member's stored `member.color` is changed, remapped or migrated. Notebook's `member-1` to `member-6` and `on-member` tokens are not added.
- Slice 1 makes the colour **more** visible, not less. Today `Avatar` draws the initial in a fixed light ink (`text-bg-elev` in `avatar.variants.ts`), which reads at 2.15:1 to 3.26:1 on four of the five palette colours, and `LineupSlots.tsx:27` tints glyphs with the colour on the page background. After slice 1, every place a member appears in a lineup draws a mark **filled** with their colour, and the ink on it is the one of `on-color-dark` and `on-color-light` with the higher contrast ratio.
- The colour reaches the screen through two atoms only, `Avatar` and the new `MemberMark` (dot, ring, filled cell), as an inline `backgroundColor` or `borderColor`. Text is never set in a member colour; the member's name beside a mark stays in `ink` or `ink-soft`.
- The Lineup grid itself is slice 3. Slice 1 delivers what it is built from: `MemberMark` with its filled-cell form, the ink-by-contrast helper, and the lane tint as a named constant.

## Order of work

Each step is one or more commits on `claude/pragma-ux-redesign`. The order is the spec's: the harness first, so every later number in the slice is measured with it.

1. **Harness moved and reproducing.** Move `audit/task-metrics/` and `audit/coordinator/{pragma-instance.sh,seed-audit.mts,vite-site.mjs}` into `apps/pragma/scripts/task-metrics/`, convert them to the repository's TypeScript and lint rules, run them on the unchanged app and require every task's taps, text entries, scroll gestures and screens to equal `spec/baseline/baseline.json`. No app file changes before this passes.
2. **Harness gains the slice 1 measures**, still on the unchanged app, and records their before values into a new `validation/slice-1-before.json`: icon-only buttons without a name, sheets whose focus lands on Cancel or Close, text set in a member colour, distinct font sizes outside the scene views, the note race (8 runs), the transition draft after a backdrop tap, and the three values the spec says were read from screenshots (setlist first row top at 390x844, lineup songs on the first screen, Order rows under today's chart).
3. **Ledger can scope a citation to one application** (`scripts/standards/`), so the pragma-only lint rules of step 6 can be cited honestly.
4. **Note-loss fixes**, each with its unit and component tests, before the visual sweep so the fix is reviewed on its own diff.
5. **Tokens, font, member colour helper, atoms and molecules**: `tokens.css`, `main.tsx`, `package.json`, `member-color.utils.ts`, `Icon`, `Button`, `ButtonLink`, `IconButton`, `Avatar`, `MemberMark`, `Sheet`, `BottomActions`, `SectionTabs`, `ListRow`, `EmptyState`, `Menu`, `PageHeader`.
6. **Lint rules and gate tests**, each with its `RuleTester` suite or test, cited in `docs/standards/`.
7. **Sweep**: every caller moves onto the new tokens, type roles and components; the 14 dialogs move onto `Sheet` with their content unchanged; every button gets its icon. The type checker's list of `Button` calls without `icon` is the work list.
8. **Measure again** with the harness and write the slice 1 rows into `validation/`.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q9, slice 1 acceptance | The harness moves into the repository and runs without a scratchpad path | `apps/pragma/scripts/task-metrics/` (files listed under *New files*); `pnpm --filter @borso-app/pragma run task-metrics -- --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json` | On the unchanged app the command exits 0 and prints no difference for tasks 1 to 12 and 8b; `grep -rn "scratchpad\|/tmp/claude" apps/pragma/scripts/task-metrics` returns nothing |
| Q9 | The audit copies stop being runnable code in `docs/` | `git mv` of the five scripts; `audit/coordinator/runbook.md`, `audit/task-metrics/baseline.md`, `spec/baseline/baseline.md`, `audit/solution-designer-2/proposals.md`, `kaizen.md` and `docs/quality/working-conditions.html` point at the new paths | `scripts/docs/check-doc-links.ts` passes; `ls docs/features/pragma/ux-redesign/audit/task-metrics` shows only `baseline.json` and `baseline.md` |
| Design system › Tokens, ADR-0047 | Notebook tokens in one `@theme static` block of `light-dark()` values, `--color-*`, `--text-*`, `--radius-*` and `--shadow-*` reset to `initial`, the `@media (prefers-color-scheme: dark)` block deleted | `site/src/styles/tokens.css`, with the rename table under *Token renames* | The undefined-token test (below) passes over `site/src`; `grep -c "prefers-color-scheme" site/src/styles/tokens.css` is 0 |
| Design system › Tokens | Two scheme-independent inks for anything drawn on a member colour | `--color-on-color-dark: #0a0907` and `--color-on-color-light: #fffdf8` in `tokens.css` (darker than `ink`'s `#1d1914`, which leaves a free member colour at 4.15:1 at worst and an audit seed member's initial at 4.38:1; `#0a0907` lifts that worst case to 4.42:1 and the five palette colours to 5.94:1 to 9.10:1), the same two hex values as named constants in `member-color.utils.ts` | `design-tokens.utils.test.ts` asserts the stylesheet and the constants hold the same values |
| Q2b, Member colours, ADR-0047 | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts`: add `contrastRatio(first, second)` and `selectInkOnMemberColor(hex): 'on-color-dark' \| 'on-color-light'`; delete `readableForeground`, `foregroundForLuminance` and `READABLE_THRESHOLD`; `parseHex` keeps the `@Blueprint utils-pure-module` block | Unit test: the five palette colours give 5.28:1 or more with the chosen ink (coral, teal, mustard, sage take the dark ink, plum the light one), a malformed hex falls back to `on-color-dark`; 100% coverage and no surviving mutant |
| Member colours | `Avatar` filled with the member colour, initial in the chosen ink | `atoms/Avatar.tsx`, `atoms/avatar.variants.ts` (an `ink` variant `dark \| light` mapped to `text-on-color-dark` / `text-on-color-light`; the `sm` size of 22 px goes) | The `style={{ color: readableForeground(...) }}` workarounds in `ConcertEditForm.tsx:133`, `MasteryMatrix.tsx:138` and `MembersPage.tsx:128` are deleted; `grep -rn readableForeground site/src` returns nothing |
| Member colours | Dot, ring and filled cell in the member colour | New `atoms/MemberMark.tsx` with `member-mark.variants.ts` (`shape: dot \| ring \| cell`), the lane tint share as a named constant `MEMBER_LANE_TINT_SHARE` beside it, mixed with `color-mix(in srgb, <colour> <share>, var(--color-paper))` | Render test per shape; the cell holds glyphs in the chosen ink |
| Member colours, VOCABULARY › Lineup slot | A lineup slot is drawn **on** its member's colour, no longer tinted with it | `molecules/LineupSlots.tsx` renders each slot as `MemberMark shape="cell"`; `BandStreaks.tsx:29`, `ConcertReadView.tsx:62` move onto `MemberMark`; `apps/pragma/VOCABULARY.md` › Lineup slot updated | `grep -rnE "style=\{\{[^}]*color" site/src` lists only `Avatar.tsx`, `MemberMark.tsx` and the lines carrying a `-- reason` exception; harness "text set in a member colour" is 0 |
| Member colours | Members created without a colour take the five-colour palette | `atoms/member-palette.utils.ts`: `MEMBER_COLOR_TOKENS` (CSS variables) becomes `MEMBER_PALETTE`, holding the five hex values the API already stores for a new member (`#e87b62`, `#3a9b9b`, `#d6a93c`, `#8a4f7a`, `#7a9b6f`, the colours the spec's contrast figures were measured on), moved to `domain/member-palette.core.ts` so the API and the site read one list and no member's colour changes; `routes/members/members-page.core.ts` picks the first palette colour no member uses, in place of `DEFAULT_MEMBER_COLOR = '#2d5fa0'`, which equals `accent`; `AppShell`'s fallback while the member loads becomes an `Avatar` on `sunk` | `members-page.core.test.ts` covers an empty band, a band using the first two colours, and a band using all five (falls back to the first). No existing member row is written |
| ADR-0048 | Newsreader replaces Instrument Serif, `opsz` stylesheets | `apps/pragma/package.json` (add `@fontsource-variable/newsreader` `5.3.0`, remove `@fontsource/instrument-serif`), `site/src/main.tsx` (the two `opsz` imports), `tokens.css` (`--font-display` keeps its name, family `'Newsreader Variable'`) | `pnpm --filter @borso-app/pragma build` and the `dist/assets` listing show the two Newsreader latin files and no Instrument Serif file; `grep -rn instrument-serif apps/pragma` returns nothing |
| ADR-0048 | Titles become upright, only notes stay italic | The 46 components that use `font-display` drop `italic` unless they render a member's note or comment; note fields (`SetlistEntryNotesField`, `TransitionCommentModal`, `SongNotes`) move from `font-mono` to `font-display italic` | `grep -rn "font-display italic" site/src` lists only note and comment renderers |
| Q4 | JetBrains Mono stays, for chord symbols only | `--font-mono` unchanged; `font-mono` removed from notes and statuses (46 files use it today) and kept on keys, capo, tempo, durations, energy, scores and ChordPro, as `migration.md` step 2 says | Reviewer check of the `font-mono` grep after the sweep |
| Design system › Type roles | Six sizes: `display` 30, `heading` 22, `title` 19, `body` 16, `meta` 14, `label` 12; `body` replaces today's `body { font-size: 14px }` | `tokens.css` `--text-*` roles with line height, weight and tracking as in `design/notebook/tokens.css`; scene views get `--text-stage-*` roles so their sizes leave `text-[` too | Harness: distinct font sizes outside the scene views is 6 (was 18); `grep -rc "text-\[" site/src` sums to 0 (was 21) |
| Graft 1 | Pill buttons in Notebook's blue: primary (`accent` fill, `on-accent` label), secondary (translucent fill, `ink` label, `accent` icon, no border), sizes 36, 44, 52, press scale 97%, disabled drops to the plain fill | `atoms/button.variants.ts`: variants `primary`, `secondary`, `quiet`, `danger`, `stage`; sizes `sm` (36, with a 44 px hit area), `md` (44), `lg` (52); `icon` size and its `shadow-lg` round button deleted | Render test per variant; the contrast test covers the secondary label over `paper` and over `raised` |
| Graft 5 | A chosen option turns ink, never blue | Selected `Chip`, segment and section tab: `ink` fill or underline with a `paper` label; `VoteModeToggle` loses the undefined `bg-surface` (rank 25) | Contrast test includes `paper` on `ink`; harness shows no text pair under 4.5:1 on `/setlists/:id/vote` |
| Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink` by type; `label` required on `IconButton` and used as its accessible name | `atoms/Button.tsx` (`icon: IconName`, rendered before the children at `md` size), new `atoms/ButtonLink.tsx` (React Router `Link` with `buttonVariants`, `icon` required), new `atoms/IconButton.tsx` (`label: string`, `aria-label` from it) | `pnpm --filter @borso-app/pragma typecheck` fails on a `Button` without `icon` (proved by the type test `button.types.test.ts` with `@ts-expect-error`); harness text-only buttons over 26 routes is 0 (was 181), icon-only without a name is 0 |
| Rules › One icon per verb | Lucide path data copied into the registry, one glyph per verb and per destination | `atoms/Icon.tsx`: new glyphs `arrowR`, `key`, `unlink`, `expand`, `bulb`, `reorder`, `swap`, `clipboard`, `camera`, `refresh` from Lucide (ISC), existing ones kept; `size` becomes `'sm' \| 'md' \| 'lg'` (16, 20, 24); Improvements takes `bulb`, Bars takes `beer` (rank 35) | `apps/pragma/THIRD_PARTY_NOTICES.md` carries Lucide's ISC notice; `grep -rn "size={1[0-9]}\|size={2[0-9]}" site/src` returns nothing |
| Rules › Sheets, D10 | One `Sheet` molecule on `<dialog>` with `showModal()`: grabber, title, `close` icon button, one scroll body, footer padded `max(16px, env(safe-area-inset-bottom))` | New `molecules/Sheet.tsx` and `molecules/sheet.variants.ts` (`size: sheet \| full \| confirm`); opens through `lib/modal-dialog.adapter.ts`, which gains `focusFirstField(dialog)`: the first `input`, `textarea` or `select` in the body, else the Close button (rank 23) | Component test per rule; harness "sheets whose focus lands on Cancel or Close while they hold a field" is 0 (was 3) |
| Slice 1 › 14 dialogs, content unchanged | Each dialog renders its current content inside `Sheet` | `InstallWalkthroughSheet`, `TransitionCommentModal`, `CreateSetlistDialog`, `SetlistEntrySheet`, `SetlistSongPicker`, `RecordingSheet`, `CreateSessionDialog`, `TakeUploadForm`, `AttachSetlistDialog`, the More drawer in `AppShell` (organisms); `LineupEditor`, `ConfirmDialog` (becomes `Sheet size="confirm"` with a `danger` button), `SongDefaultsDialog`, `ListenLinksDialog` (molecules) | `grep -rln "<dialog" site/src` lists `Sheet.tsx` and the two scene pages only (was 16 files); each organism's existing test still passes with its assertions unchanged |
| Rules › One scroll | While a sheet is open its body is the only scroll | The inner `overflow-y-auto` of `SetlistSongPicker.tsx:116`, `LineupEditor.tsx:33` and `SongDefaultsDialog.tsx:85` goes; the list is the sheet body | Harness: sheets with an inner vertical scroll is 0 (was 2) |
| Rules › One scroll | The document scrolls, nothing inside it scrolls vertically, text areas grow | `SongSearch.tsx:65` and `SuggestSongField.tsx:73` lose `max-h-72 overflow-y-auto` (the result list grows); `BarForm.tsx` textareas become `AutoGrowTextarea` (fixes `/bars`); `SongChordPreview.tsx:27` keeps its scroll with an inline exception naming slice 6 | Lint rule `no-vertical-scroll-container` (below); harness routes with two or more vertical scroll areas is 1, `/catalog/:songId/edit` (was 2) |
| Rules › Primary action placement, graft 2 | The bottom strip holds pills, never hides on scroll, no round floating button | New `molecules/BottomActions.tsx` replaces `molecules/BottomActionBar.tsx` and `atoms/StickyFormActions.tsx` at their callers (`SetlistEditor`, `CatalogPage`, `SetlistsPage`, `SessionsPage`, `BarForm`, `SongEditForm`, `VoteClosePanel`, `TaskForm`); `bottom-action-bar.core.ts` and `bottom-action-bar.hook.ts` (the hide on scroll) are deleted | Harness: the strip's pills keep the same y at scroll 0 and at the page end on `/setlists/:id` |
| Slice 1 atom list | `SectionTabs`, `ListRow`, `PageHeader`, `EmptyState`, `Menu` | New `molecules/SectionTabs.tsx` replaces `VoteModeToggle` and the `SegmentButton` atom; new `molecules/ListRow.tsx` takes the rows that are raw `<button>` today (rows end in `chevR` or start with a cover or avatar); new `molecules/EmptyState.tsx` takes the ad hoc empty texts of the list pages; new `molecules/Menu.tsx` replaces `OverflowMenu.tsx`, each item with an icon; `PageHeader.tsx` takes the type roles and absorbs `Crumb` | `pnpm exec knip` clean: every new molecule has at least one caller in this slice |
| Migration step 5 | Atoms that go | Delete `EnergyBar` (no importer outside its own test), `SegmentButton`, `StickyFormActions`, `Crumb`; keep `HintText`, `PointsBadge` and the rest, restyled through tokens | `ls site/src/components/atoms` no longer lists the four; knip clean |
| Error and edge cases › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | New pure `molecules/latest-text-save.utils.ts`: a reducer over `typed`, `saveStarted`, `saveSucceeded`, `saveFailed` that allows one save in flight per field and, when it settles, sends the latest text if it differs from what was sent. New `molecules/latest-text-save.hook.ts` owns the pause timer from its handlers (no `useEffect`) and drives `useUpdateSetlistEntry`. `SetlistEntryNotesField` and `SetlistEntryKeyCapoFields` call it instead of `onPatch` per key press | Unit test of every transition at 100%; component test replays 8 out-of-order reply sequences against a mocked mutation and asserts the last request sent carries the full text; harness note race: 8 of 8 runs store the full text (before value recorded in step 2) |
| Error and edge cases › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | New `lib/transition-draft.store.ts` (module store read through `useSyncExternalStore`, keyed by the song pair) with its pure `lib/transition-draft.utils.ts` (key, put, take, clear); `TransitionCommentModal` reads its draft from the store, writes on change, clears on a successful save | `TransitionCommentModal.test.tsx`: type, close by a click on the dialog element, reopen, the draft is there; save, reopen, the saved comment shows and the draft is gone. Harness task 5 variant: draft kept after an argent tap on the backdrop |
| Design system › Contrast fixes | Every text pair at 4.5:1 or more in both schemes; dark highlighter retuned; the secondary pill's fill and label computed | New `lib/design-tokens.utils.ts` (parse `light-dark(a, b)` declarations, composite a translucent fill over a background) with `design-tokens.utils.test.ts`, which also reads the real `tokens.css` and checks a named list of text pairs per scheme | The test fails on any listed pair under 4.5:1; the secondary pill's fill against `paper` and `raised` is printed into `validation/` with no threshold, as the spec says the pill is identified by its label and icon |
| Rules › No value outside the tokens; acceptance "text pairs under 4.5:1" | A class naming a token `tokens.css` does not define fails the build (how `bg-surface` shipped) | `design-tokens.utils.ts` also extracts the colour, text-size, radius and shadow utilities from a class string; the test walks every `.ts` and `.tsx` under `site/src` and checks each against the tokens the stylesheet defines | Planting `bg-surface` in any component makes `pnpm --filter @borso-app/pragma test:core` fail naming the file |
| Gates (spec *Test strategy*) | New lint rules with `RuleTester` suites | `eslint-rules/no-arbitrary-tailwind-value.js` (`text-[`, `bg-[`, `rounded-[`, `shadow-[`, hex, `rgb(`, `rgba(`, `hsl(` in `className` strings and `.variants.ts` files); `eslint-rules/no-raw-interactive-element.js` (`<button>` outside `Button`, `IconButton`, `Chip`, `ListRow`, `SectionTabs`, `Menu`; `<dialog>` outside `Sheet`); `eslint-rules/no-vertical-scroll-container.js` (`overflow-auto`, `overflow-y-auto`, `overflow-scroll`, `overflow-y-scroll` outside `Sheet` and the scene views); each beside its `.test.js`, registered in `eslint-rules/index.js`, enabled in a new `PRAGMA_SITE_FILES` block of `eslint.config.js` | `pnpm exec eslint --no-warn-ignored --max-warnings 0` clean; `scripts/standards/gate-canaries.ts --inventory` lists the three new canaries |
| Gates cited in their standard | The ledger resolves each new mechanism | `docs/standards/08-styling.md` cites the three rules and the token test; `docs/standards/03-typing.md` cites `types:` for the required `icon` and `label`; `docs/standards/05-frontend-architecture.md` cites the raw element rule | `pnpm exec tsx scripts/standards/enforcement-ledger.ts --check` exits 0 |
| (no spec ref; gate honesty) | A rule meant for one application can be cited without reading as `partly` | `scripts/standards/citations.core.ts` reads an optional reach after the target, e.g. `eslint:borso/no-raw-interactive-element (pragma/site)`; `ledger.core.ts` uses the declared reach as the candidate scopes when present; `docs/standards/12-linting-and-gates.md` explains the form | `citations.core.test.ts` and `ledger.core.test.ts` cover a declared reach that matches, one that the configuration does not reach (`broken`), and no declared reach (today's behaviour); both files stay at 100% |
| Rules › Tap targets | 44x44 px or more | `button.variants.ts` `sm` keeps a 44 px hit area through an `after:` pseudo-element on spacing tokens; `IconButton` is 44x44 | Harness reports no tappable element under 44 px in either dimension on the 26 routes |
| Rules › Safe areas | Sheet footers pad the bottom inset | `Sheet.tsx` footer | Reviewer; the shell's top inset is slice 2 |
| Acceptance, slice 1 rows | Numbers measured, not read | `validation/slice-1-before.json` (step 2) and `validation/slice-1-after.json` (step 8), both written by the harness | Each slice 1 row in the spec's *Acceptance criteria* table has a before and an after value from these two files |
| Q3, Lineup grid, graft 3 | Up to six members, filled lanes | (out of scope: slice 3) | |
| D1, D2, Home, Band, safe area top, theme colour per scheme | Navigation and shell | (out of scope: slice 2) | |
| Setlist views, entry sheet, vote page, "a sheet never opens another" gate | | (out of scope: slice 3) | |
| Add songs, Order, batch route (Q5) | | (out of scope: slice 4) | |
| D3 / ADR-0050, practice mode, Q11 to Q13 | | (out of scope: slice 5) | |
| D9 / ADR-0051, Q6, Q7 YouTube mark, buttons inside a link, `/catalog/:songId/edit` one scroll | | (out of scope: slice 6) | |
| Production strategy › `EntryNoteSaveError` | Alert on any failed note save | (out of scope: slice 3, with the "Saved" and "Not saved" line of the entry sheet); `latest-text-save.utils.ts` already exposes the failed state that slice 3 renders and reports | |

## Token renames

Old names are added as aliases of the new ones at the start of step 7, every caller is swept, and the aliases are deleted in the same pull request. The undefined-token test proves none remain.

| Today | Becomes |
|---|---|
| `bg` | `paper` |
| `bg-elev` | `leaf` on the page; `raised` in sheets and menus |
| `bg-sunk` | `sunk` |
| `surface` (never defined, 6 files) | `leaf` |
| `ink-900`, `ink-700` | `ink` |
| `ink-500` | `ink-soft` |
| `ink-400` | `ink-faint` for placeholders and disabled text, `ink-soft` for information |
| `ink-300` | `rule-strong` |
| `line`, `line-strong` | `rule`, `rule-strong` |
| `accent`, `accent-ink`, `accent-soft` | `accent`, `accent-strong`, `accent-soft` |
| `warn`, `warn-soft`, `danger`, `good` | same names, Notebook values, with `danger-soft` and `good-soft` added |
| `status-wip-*`, `status-rehearsed-*` | `warn-soft` with `warn`, `good-soft` with `good`, no border |
| `member-coral` to `member-sage` | deleted; the hex values move to `MEMBER_PALETTE` |
| `stage-*` | same, plus `stage-line` and `stage-hover` for the scene views' translucent whites |
| (new) | `raised`, `hover`, `rule`, `margin`, `pencil`, `highlight`, `on-highlight`, `on-accent`, `accent-pressed`, `on-color-dark`, `on-color-light`, `scrim`, `focus` |

Raw colours in components go to tokens as `migration.md` *Raw colours in components* lists them, except the rows about member colours, which ADR-0047 replaced: `members-page.core.ts:27` moves to `MEMBER_PALETTE`, and `member-color.utils.ts:22-23` become the two `on-color-*` inks rather than `on-member`. `cover-art.utils.ts:38` keeps its per-song hue, because a cover tile is not a token value; it gets an inline exception naming that reason.

## New files and their blueprints

Blueprints read from `.claude/skills/blueprint/blueprint-index.md`, regenerated with `scripts/reports.sh blueprints` at planning time. Each new file carries `// @FollowsBlueprint <id>`.

| File | Blueprint |
|---|---|
| `site/src/components/atoms/ButtonLink.tsx`, `IconButton.tsx`, `MemberMark.tsx` | `atom-variant` (`button.variants.ts`) |
| `site/src/components/atoms/member-mark.variants.ts` | `atom-variant` |
| `site/src/components/molecules/Sheet.tsx` | `molecule-dialog-form` (`LineupEditor.tsx`) |
| `site/src/components/molecules/sheet.variants.ts` | `atom-variant` |
| `site/src/components/molecules/BottomActions.tsx`, `SectionTabs.tsx`, `ListRow.tsx`, `EmptyState.tsx`, `Menu.tsx` | `molecule-presentational` (`StatusChip.tsx`) |
| `site/src/components/molecules/latest-text-save.utils.ts` | `utils-pure-module` (`member-color.utils.ts`) |
| `site/src/components/molecules/latest-text-save.hook.ts` | `hook-timer-owned-by-handlers` (`long-press.hook.ts`) |
| `site/src/lib/transition-draft.store.ts` | `hook-external-store` (`online-status.hook.ts`) |
| `site/src/lib/transition-draft.utils.ts`, `site/src/lib/design-tokens.utils.ts` | `utils-pure-module` |
| Every new `*.test.tsx` of a component | `test-component-render` (`MemberFilterPills.test.tsx`) |
| `eslint-rules/no-arbitrary-tailwind-value.js`, `no-raw-interactive-element.js`, `no-vertical-scroll-container.js` | `lint-rule-predicate` (`site-paths.js`), shaped like `no-scroll-container-on-main.js` |
| their `*.test.js` | `test-lint-rule` (`no-use-effect.test.js`) |
| Each inline rule exception (`SongChordPreview`, the two scene pages, `cover-art.utils.ts`, `MasteryProgressChart`'s member-coloured series) | `lint-exception` (`Galaxy.tsx`) |
| `apps/pragma/scripts/task-metrics/task-metrics.core.ts` (argument parsing, the comparison with `baseline.json`, bottom-third and button classification, distinct font sizes, the one-scroll verdict with its exception list) | `core-decision` (`last-loop-lepin` race window) |
| `apps/pragma/scripts/task-metrics/cdp-session.adapter.ts` (the DevTools websocket and `/json/list`), `argent-input.adapter.ts` (the `argent` CLI) | `adapter-external-service` |
| `apps/pragma/scripts/task-metrics/task-metrics.setup.ts`, `task-walks.setup.ts`, `route-measures.setup.ts`, `page-probes.setup.ts`, `audit-seed.setup.ts`, `vite-site.setup.ts`, `pragma-instance.sh`, `run-task-metrics.sh` | No blueprint exists for a workspace measuring script. The in-repository precedent is `apps/pragma/scripts/task-speed/` (`.setup.ts` entry points beside a `.core.ts`), which these follow; no marker is written |

## Pattern coherence

- **Two harnesses measure the same jobs.** `apps/pragma/scripts/task-speed/` (Playwright, synthetic clicks, 375x667) and the moved `task-metrics` (argent, real taps, 390x844, the baseline every acceptance number compares with). CLAUDE.md says a synthetic click is not a tap, and two harnesses over the same tasks would report two different before values. Decision: once step 1 reproduces `baseline.json`, slice 1 deletes `scripts/task-speed/` and the `task-speed` package script, and `docs/features/pragma/task-speed/spec/spec.md` gets one line naming `task-metrics` as its successor. Reversible from git if the operator wants it back.
- **Dialog opening.** `modal-dialog.adapter.ts` stays the one place `showModal()` is called; `Sheet` is its only caller outside the scene adapter. Five test files stub `showModal` each in their own way today (`TakeUploadForm`, `RecordingSheet`, `ListenLinksProvider`, `InstallOffer`, `SetlistEntryRow`); the stub moves into one shared test helper with `Sheet`.
- **Client stores.** The transition draft store follows the existing `*.store.ts` pattern (`vote-countdown.store.ts`, `listen-links.store.ts`); no new state library.
- **Class composition.** Everything still goes through `composeClassName` (`clsx` and `tailwind-merge`, ADR-0028), with the theme's own sizes, radii and shadows registered (see the risk register).
- **Dependencies.** One added (`@fontsource-variable/newsreader`, ADR-0048), one removed (`@fontsource/instrument-serif`). Icons are copied path data, not `lucide-react`.

## Decisions taken while planning

These are implementation choices the spec leaves open. None changes what a member sees beyond the spec.

- **Sheets that cannot be dismissed today stay so in slice 1.** `CreateSetlistDialog`, `SetlistSongPicker`, `CreateSessionDialog`, `TakeUploadForm`, `AttachSetlistDialog` and `RecordingSheet` open with `openDialogOnAttach` (no backdrop close). Making them dismissible before they keep drafts would add a way to lose typed text, and `RecordingSheet` closing on a stray tap would cut a take. `Sheet` takes `dismissible`, default `true`; these six pass `false`, as today. Each becomes dismissible in the slice that rebuilds it with a kept draft.
- **Key and capo use the same last-text save as the note.** They call the same `onPatch` per key press and so carry the same race; leaving them would be walking past a known defect.
- **The new lint rules are pragma only.** Enabled on all six sites they would fail 157 arbitrary values and 29 raw buttons in five other applications that have no design-system decision. The ledger change in step 3 is what makes a one-application citation honest instead of reading as `partly`.
- **The colour test covers text sizes, radii and shadows too.** `tokens.css` resets those namespaces, so `text-xs` (164 uses) and `rounded-xl` stop generating; without the test that failure is silent, which is how `bg-surface` shipped.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| The converted harness counts differently from the audit's `.mjs`, so every later number is compared against a moved goalpost | high | Step 1 converts and compares before any app change; the comparison is a pure function at 100% coverage and mutation tested | `task-metrics -- --compare` exits non-zero and prints each differing task and field |
| `tailwind-merge` reads `text-meta` or `text-title` as a colour and drops `text-ink` beside it (or the reverse), so a label loses its size or its colour without a warning | high | `class-name.utils.ts` moves to `extendTailwindMerge` with the theme's text sizes, radii and shadows registered | `class-name.utils.test.ts` asserts `composeClassName('text-meta', 'text-ink')` keeps both, and that two text sizes still collapse to the last |
| `--color-*: initial` and the other resets make every unswept `bg-white`, `text-xs`, `rounded-xl` generate nothing, so elements render unstyled | high | The undefined-token test walks every source file | The test fails naming the file and the class; the harness's distinct font size count also moves |
| A member colour ends up as text, or outside the two atoms, and the "no value outside the tokens" rule loses its meaning (ADR-0047 negative consequence) | medium | Only `Avatar` and `MemberMark` set colour through `style`; the arbitrary-value rule checks `style` colour properties outside them; the one other place, `MasteryProgressChart`'s series, carries a written exception | Lint; harness "text set in a member colour" is 0 |
| A palette colour with the chosen ink falls under 4.5:1 for an initial | medium | `selectInkOnMemberColor` compares the two ratios; tests pin all five palette colours at 5.28:1 or more | Unit test fails; a member's free colour can still reach about 4.15:1 at worst, the spec's accepted limit for an initial |
| Moving `TransitionCommentModal` and `SetlistEntrySheet` onto `Sheet` changes when they close, and a note-loss fix regresses during the sweep | high | Step 4 lands the fixes and their tests before the sweep; the component tests assert behaviour, not markup | The two component tests and the harness's note race and draft task in step 8 |
| The note save sends less often, and a member who closes the sheet during the pause loses the last characters | medium | Closing the sheet flushes the pending text through the same queue | Component test: type, close before the pause ends, the mutation receives the full text |
| `focusFirstField` puts the keyboard up on a phone where today nothing did (a sheet with a field now focuses it) | low | This is the spec's rule (rank 23); `ConfirmDialog` and `ListenLinksDialog`, which hold no field, focus Close | Harness focus probe; visual validation at 375x667 with argent |
| Newsreader at 19 px truncates long titles sooner (ADR-0047) and `body` grows from 14 to 16 px, so rows wrap or overflow at 375 px | medium | Titles keep `truncate` or wrapping as today; the harness records layout width per route | Harness layout width is 390 on every route at 390x844; visual validation at 375x667 |
| Removing `max-h-72 overflow-y-auto` from the two search result lists makes a long result list push the form far down | low | The music service returns a bounded number of hits; the list is the document's scroll now | Harness page height on `/catalog/new`; reviewer |
| The `@FollowsBlueprint` and `@Blueprint` markers move to another symbol when `member-color.utils.ts` and `button.variants.ts` are edited | medium | `parseHex` and `buttonVariants` stay directly under their markers | `blueprint-indexing.ts --check` against `docs/standards/blueprint-subjects.json` |
| A new file without a layer suffix raises the `layer-marker:pragma` budget | low | Every new file ends in a suffix from the table above | `convention-drift.ts --check` |
| The ledger change lets a citation declare a reach the configuration does not have and still pass | medium | A declared reach is checked against the probed scopes like any other; missing scopes are `broken` | `ledger.core.test.ts` case for a declared reach the configuration misses; the gate canary for each new rule |
| Deleting `task-speed` loses a measure the band relied on | low | `task-metrics` covers every job `task-speed` walked, at the spec's viewport | Reviewer compares `task-speed-journeys.setup.ts` with the walks in `task-walks.setup.ts` before deleting |
| Lucide path data is copied without its licence notice | low | `THIRD_PARTY_NOTICES.md` | Reviewer |
| Dark mode untested on a screen the sweep touched | medium | Every token has both values by construction (`light-dark()`) | Visual validation in both schemes; contrast test per scheme |

## Code-quality self-check

- [ ] `pnpm exec eslint --no-warn-ignored --max-warnings 0` clean, including `borso/no-type-assertion-except-unknown` (only `as const`; `as unknown` only where unavoidable) and the three new rules.
- [ ] `pnpm --filter @borso-app/pragma typecheck` clean.
- [ ] No `any`.
- [ ] No abbreviations or one-letter locals; the harness conversion renames the audit's `w`, `e`, `r`, `C`, `vp`, `opt`.
- [ ] Magic numbers and strings named: the lane tint share, the note save pause, the contrast threshold 4.5, the hit area, the note race run count and delay range.
- [ ] No comments: the harness's explanatory comments become names or move to `apps/pragma/scripts/task-metrics/README.md`; machine annotations stay.
- [ ] Function names describe the result (`selectInkOnMemberColor`, `planNextSave`, `listUndefinedTokens`).
- [ ] Conventional-commit scope `pragma` for app and plan files, `meta` for `scripts/standards/`, `eslint-rules/` and `docs/standards/`.
- [ ] `pnpm exec knip` clean: deleted atoms have no importer left, every new molecule has a caller.
- [ ] Every pure helper is a `*.utils.ts` or `*.core.ts` with its sibling test at 100%: `member-color.utils.ts`, `latest-text-save.utils.ts`, `transition-draft.utils.ts`, `design-tokens.utils.ts`, `member-palette.utils.ts`, `members-page.core.ts`, `task-metrics.core.ts`, `citations.core.ts`, `ledger.core.ts`.
- [ ] No new `useEffect`: the note save timer is owned by its handlers, the draft lives in a store, the dialog opens from a ref callback.
- [ ] Every user-facing string through `en.json` and `fr.json`; `borso/no-literal-jsx-text` clean.
- [ ] Every page renders at 375 px with no sideways scroll.

## Pre-flight gates

1. `pnpm install`.
2. `pnpm --filter @borso-app/pragma run task-metrics -- --compare ../../docs/features/pragma/ux-redesign/spec/baseline/baseline.json` on the commit before step 4. Must exit 0.
3. `pnpm --filter @borso-app/pragma typecheck`.
4. `pnpm exec eslint --no-warn-ignored --max-warnings 0`.
5. `pnpm --filter @borso-app/pragma run test:core` (coverage gate on every touched `*.utils.ts` and `*.core.ts`) and `pnpm --filter @borso-app/pragma test` (back-e2e, unchanged but rerun).
6. `pnpm run test:eslint-rules` (root `vitest run`, which collects the three new `RuleTester` suites and the `scripts/standards` tests for the ledger change).
7. `pnpm --filter @borso-app/pragma run test:mutation -- --mutate <the changed *.utils.ts and *.core.ts, comma separated>`.
8. `pnpm --filter @borso-app/pragma build`.
9. `pnpm exec knip`.
10. `pnpm exec tsx scripts/standards/enforcement-ledger.ts --check`, `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check`, `pnpm exec tsx scripts/standards/convention-drift.ts --check`, `pnpm exec tsx scripts/architecture/architecture-graph.ts --check`, `scripts/check-vocabulary-paths.sh`, `pnpm exec tsx scripts/docs/check-doc-links.ts`.
11. `pnpm exec tsx scripts/standards/gate-canaries.ts --inventory` lists a canary for each new rule.
12. `pnpm --filter @borso-app/pragma run task-metrics -- --routes --tasks all --out ../../docs/features/pragma/ux-redesign/validation/slice-1-after.json`, then every slice 1 row of the spec's acceptance table checked against it.
13. `/visual-validation docs/features/pragma/ux-redesign/spec/spec.md`, scoped to slice 1, at 375x667 and 390x844 in both schemes, touch through `scripts/argent.sh`.
14. `/technical-validation docs/features/pragma/ux-redesign/spec/spec.md`.
15. `/standards-review`, then `pnpm exec tsx scripts/standards/seal.ts verify`.
16. human: the operator looks at the setlist and the members page in both schemes and confirms each member is still recognisable by their colour.

## Open questions / unknowns

None blocks slice 1. Q11, Q12 and Q13 are open in the spec and belong to slice 5, which the spec says must have them answered before it starts.

## Missing technical skills

- **Tailwind v4 design tokens.** The traps live in two knowledge entries (`tailwind-v4-theme-and-preflight-traps.md`, `conflicting-tailwind-classes-are-not-merged.md`) and nothing walks a token migration end to end.
- **Native `<dialog>` sheets.** Focus, dismissal, safe areas and jsdom stubbing are rediscovered per dialog; a skill would carry them.
- **A measuring harness blueprint.** No blueprint exists for a workspace script that drives a browser and compares with a committed baseline; `task-metrics` could become the first one once it reproduces.
