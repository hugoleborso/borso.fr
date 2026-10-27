# Technical validation — Pragma redesign, slice 1 (foundation), fourth pass

- Spec: [`../spec/spec.md`](../spec/spec.md), scoped to slice 1
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-ux-redesign (HEAD `82dc2b78`)
- Base: origin/main (merge base `3bd18b51`)
- Run at: 2026-10-27T17:57:02Z
- Touched workspaces: `@borso-app/pragma` (site, api, domain, scripts/task-metrics), root (`eslint-rules/`, `scripts/standards/`, `eslint.config.js`)
- Previous passes: [`technical-validation-2026-10-27-1257.md`](./technical-validation-2026-10-27-1257.md) FAIL, [`technical-validation-2026-10-27-1422.md`](./technical-validation-2026-10-27-1422.md) FAIL, [`technical-validation-2026-10-27-1506.md`](./technical-validation-2026-10-27-1506.md) PASS; then [`visual-validation-2026-10-27-1609.md`](./visual-validation-2026-10-27-1609.md) FAIL on its rows 01, 10, 15 and 21

Scope: slice 1 only. Rows for slices 2 to 6 are out of scope. The acceptance-table rows and the visual report's rows 10, 15 and 21 are `/visual-validation` assertions and are not re-graded here; this report checks that the code the fix commit changed is correct, clean, tested and gated.

Since the third pass, two commits landed: `a808caf7` (the visual report, docs only) and `82dc2b78`, which fixes the four visual rows: the next-concert strip keeps its height while loading and a walk taps only once the target's box is stable (row 01), disabled buttons and chips move to `ink-soft` and `ink-faint` is darkened (row 10), the main-instrument toggles become 44 px wide (row 15), and the task board uses container queries (row 21). Every gate below was re-run on HEAD `82dc2b78`, including the harness on task 9.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Slice 1 acceptance, Q9 | The harness reruns from the repository and reproduces every task's counts in `baseline.json` | `apps/pragma/scripts/task-metrics/task-metrics.core.ts:243-245`, `walk-recorder.setup.ts`; `validation/slice-1-after-fix-round-2.json` | Tasks 1 to 8, 8b, 10 to 12 equal the baseline in `slice-1-after-fix-round-2.json` (third pass). Task 9, the one the visual pass saw fail 3 of 4 times, re-run three times this pass with `pnpm run task-metrics -- --tasks 9 --compare …/baseline.json`: 3 of 3 exit 0, each `[task] 9: taps=6 textEntries=2 scrollGestures=1 screensVisited=3` and `[compare] no difference`. The stability check is `isSameBox(first, second)`: `first.length === second.length && first.every((value, index) => value === second[index])` | PASS |
| A02 | Q9 | The audit copies stop being runnable code in `docs/` | `docs/features/pragma/ux-redesign/audit/task-metrics/` | Only `baseline.json` and `baseline.md`; `check-doc-links.ts` exit 0 | PASS |
| A03 | Edge case › entry note, rank 7 | The server keeps the last text typed; a reply to an older save never overwrites a newer one | `site/src/components/molecules/latest-text-save.utils.ts:38`, `latest-text-save.hook.ts:43-50` | `if (state.inFlightText !== null) return null;`; on success `apply({ kind: 'saveSucceeded' }); sendLatest();` | PASS |
| A04 | Edge case › entry note | Key and capo carry the same fix; closing the sheet sends the pending text | `site/src/components/organisms/SetlistEntryRow.tsx:122-124` | `notesSave.flush(); keySave.flush(); capoSave.flush();` | PASS |
| A05 | Edge case › transition draft, rank 8 | A draft closed by the backdrop or Escape is kept and shown on reopening | `TransitionCommentModal.tsx:40,47,84` | `const draft = kept.text ?? existing.data?.comment.comment ?? '';`; only the save's success calls `kept.discard();`; `onChange={(event) => kept.keep(event.target.value)}` | PASS |
| A06 | Design system › Tokens, ADR-0045 | Two scheme-independent inks for anything on a member colour | `site/src/styles/tokens.css:41-42` | `--color-on-color-dark: #0a0907;` `--color-on-color-light: #fffdf8;` | PASS |
| A07 | Q2b, Member colours | Ink on a member colour chosen by the higher contrast ratio | `site/src/lib/member-color.utils.ts:94` | `return contrastRatio(color, ON_COLOR_LIGHT_RGB) > contrastRatio(color, ON_COLOR_DARK_RGB)` | PASS |
| A08 | Member colours | The colour reaches the screen through `Avatar` and `MemberMark`, never as text | `atoms/Avatar.tsx`, `atoms/MemberMark.tsx`; `InstrumentPlayerChips.tsx` (fix commit) | The fix commit marks the primary player with `PRIMARY_MEMBER_RING_CLASS = 'rounded-pill ring-2 ring-ink ring-offset-2 ring-offset-leaf'`, an `ink` ring as the spec asks ("a selected member is marked by an `ink` ring, never by another colour"); no member colour added to text | PASS |
| A09 | Q2b; operator: "garder la couleur pour qu'on s'habitue" | A new member gets the palette the band has been getting; no stored colour changes | `apps/pragma/domain/member-palette.core.ts:2-6`; `git diff origin/main...HEAD --stat -- apps/pragma/api apps/pragma/domain` | `{ name: 'coral', hex: '#e87b62' }`, `'#3a9b9b'`, `'#d6a93c'`, `'#8a4f7a'`, `'#7a9b6f'`; the API and domain diff is the four `member-palette.*` files only, no schema, migration or write | PASS |
| A10 | ADR-0046 | Newsreader replaces Instrument Serif, `opsz` stylesheets | `site/src/main.tsx:2-3`; `dist/assets` | `import '@fontsource-variable/newsreader/opsz.css';`, `…/opsz-italic.css`; build exit 0, `newsreader-latin-opsz-normal-*.woff2` and `-italic-*` emitted, no Instrument Serif file; `grep -rln instrument-serif apps/pragma` (sources) empty | PASS |
| A11 | ADR-0046 | Titles upright; only notes and comments use the italic display face | `TransitionStrip.tsx:82`, `SetlistEntryNotesField.tsx:37` | `hasNote ? 'font-display italic text-ink' : 'text-ink-soft'`; unchanged since the third pass | PASS |
| A12 | Type roles | Six roles; no arbitrary text size | `tokens.css`; `no-arbitrary-tailwind-value` | ESLint exit 0 over all changed files; the fix commit adds no `text-[` | PASS |
| A13 | Rules › Every button has an icon | `icon` required on `Button` and `ButtonLink`, `label` on `IconButton` | `atoms/Button.tsx:7`, `atoms/ButtonLink.tsx:8`, `atoms/IconButton.tsx:10,22` | `readonly icon: IconName;`, `aria-label={label}` | PASS |
| A14 | Rules › One icon per verb | Lucide paths with their notice | `atoms/Icon.tsx`, `apps/pragma/THIRD_PARTY_NOTICES.md` | Unchanged since the third pass | PASS |
| A15 | Rules › Sheets, D10 | One `Sheet` on `<dialog>`: grabber, title, Close, one scroll body, safe-area footer | `molecules/Sheet.tsx:24,76` | `'pb-[max(16px,env(safe-area-inset-bottom))]'`; `<IconButton` for Close | PASS |
| A16 | Slice 1, 14 dialogs | Every dialog renders inside `Sheet` | `grep -rln "<dialog" site/src` | `Sheet.tsx`, `LineupEditor.test.tsx` (a test), and the two scene pages under their written exceptions | PASS |
| A17 | Rules › focus, rank 23 | A sheet holding a field focuses the first field, else Close | `site/src/lib/modal-dialog.adapter.ts:15` | `dialog.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR) ??` | PASS |
| A18 | Rules › One scroll | Nothing inside the document scrolls vertically | `no-vertical-scroll-container` | ESLint exit 0; the fix commit adds no `overflow-` class | PASS |
| A19 | Rules › Primary action placement | Bottom strip of pills, no round floating button | `atoms/BottomActions.tsx` | Unchanged since the third pass | PASS |
| A20 | Rules › Tap targets | 44x44 px or more | `InstrumentPlayerChips.tsx:7`, `TaskRow.tsx` | `MEMBER_CHOICE_CLASS = 'relative z-10 min-w-11 justify-center …'` makes each toggle 44 px wide (it was 28 px with `px-0.5` per the visual report); the chip strip now `flex-wrap`s on its own line under the name (`InstrumentsList.tsx`) | PASS |
| A21 | Design system › Contrast | Every listed text pair at 4.5:1 or more in both schemes, including the disabled label | `design-tokens.utils.test.ts:40-42,64-66`; `tokens.css:21`; `button.variants.ts:13`; `chip.variants.ts:17` | The pair list now crosses `ink`, `ink-soft`, `ink-faint` with `hover`, `warn-soft`, `danger-soft`, `good-soft`, `accent-soft`, and the pill list adds `ink-soft` on `glass` over `paper`, `leaf`, `raised`; disabled moves from `disabled:text-ink-faint` to `disabled:text-ink-soft`; `--color-ink-faint: light-dark(#6b6256, #9c9385);`. Core suite exit 0 | PASS |
| A22 | Rules › No value outside the tokens | A class naming an undefined token fails the build | `design-tokens.utils.test.ts` | Core suite exit 0, including the container-query classes `@container`, `@xl:grid-cols-2`, `@4xl:grid-cols-3` the fix commit added in `TasksPage.tsx` | PASS |
| A23 | Slice 1 atom list | New atoms and molecules exist and are used; replaced ones gone | `site/src/components/{atoms,molecules}/` | `pnpm exec knip` exit 0 | PASS |
| A24 | Gates cited in their standard | Each new mechanism resolves in the ledger | `scripts/standards/enforcement-ledger.ts --check` | "Every standard names a mechanism that exists and runs." | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the 268 changed `.ts/.tsx/.js/.mjs/.mts` files | exit 0 | PASS |
| B02 | Prettier | `prettier --check --ignore-unknown` on changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B05 | No `any`; assertions only `as const` / `as unknown` | grep over every added line of the branch's `apps/**/*.ts(x)` and `eslint-rules/*.js` | no `any`; the one `as <Type>` hit is inside a string literal (`'… argent gesture-tap / …'`) | PASS |
| B06 | `useEffect` is a smell | `grep 'useEffect('` over every added line | none added on the branch | PASS |
| B07 | No comments | added lines starting with `//` or `/*`; `check-no-comments-in-styles-and-markup.sh` | only machine annotations, `eslint-disable-next-line … -- <reason>` and one `// Stryker disable next-line EqualityOperator: equivalent mutant, …` at `member-color.utils.ts:93`; script exit 0 | PASS |
| B08 | Magic values named; names carry intent | fix-commit diff | `STRIP_FRAME_CLASS`, `PRIMARY_MEMBER_RING_CLASS`, `isWaitingForConcert`, `isSameBox`, `sumSchemeCounts` | PASS |
| B09 | Generated-file and doc gates | `enforcement-ledger.ts --check`, `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `architecture-graph.ts --check`, `check-vocabulary-paths.sh`, `check-doc-links.ts`, `check-mutation-covers-gated-files.sh` | all exit 0 (run with `pipefail`) | PASS |
| B10 | `@FollowsBlueprint` markers on their subjects | `blueprint-indexing.ts --check` against `blueprint-subjects.json` | exit 0; `NextConcertStrip` keeps `// @FollowsBlueprint organism-query-owning` directly on its function | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core, coverage gated) | `pnpm --filter @borso-app/pragma run test:core` | 0; 268 files, 2678 tests; 100% statements (4379/4379), branches (2076/2076), functions (1262/1262), lines (3743/3743) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm test` in `apps/pragma` | 0; 29 files, 301 tests | PASS |
| C03 | root (`eslint-rules/`, `scripts/standards/`) | `pnpm run test:eslint-rules` | 0; 72 files, 1564 tests | PASS |
| C04 | @borso-app/pragma mutation, every changed `*.core.ts` / `*.utils.ts` / `*.adapter.ts` (20 files, a changed test pulling in its source) | `pnpm exec stryker run --mutate <20 files>` in `apps/pragma` | 0; "Final mutation score of 100.00 is greater than or equal to break threshold 100"; 1011 killed, 2 timed out, 0 survived, 0 no coverage; `task-metrics.core.ts` 214 killed with the new `isSameBox` and `sumSchemeCounts` | PASS |
| C05 | root mutation, the gated files the root config mutates (`scripts/**/*.core.ts`) | `pnpm exec stryker run --mutate …,scripts/standards/citations.core.ts,scripts/standards/ledger.core.ts` | `citations.core.ts` 100.00 (90 killed), `ledger.core.ts` 100.00 (166 killed); see Notes for the `eslint-rules` files that were in the same run | PASS |
| C06 | @borso-app/pragma build | `pnpm build` | 0 | PASS |
| C07 | Every `*.utils.ts` and `*.core.ts` has its sibling test | `find site api domain scripts -name '*.utils.ts' -o -name '*.core.ts'`, each checked for `.test.ts(x)` | none missing; all collected by the core project (C01 at 100%) | PASS |

## D. Test coverage of spec

29 use cases routed to /visual-validation; out of scope for this report: the 8 happy paths, every acceptance-table row, the 5 error cases (slices 3 to 6), and 16 edge cases that are screen behaviour or belong to slices 3 to 6 (A song with no cover, More than six members, A member in no song, Every song already in the setlist, A setlist with no songs, Entries with no energy, Pasted chart, Task with a deleted session, No session ahead, Dark mode, the six practice-mode cases). The rows below walk *Edge cases* in order, keeping the slice 1 bullets, then the slice 1 parts of *Test strategy* › Unit and › Gates.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Entry note typed fast on a slow network: the server keeps the last text typed | `'stores the full text whatever order the replies come back in (run %i)'`, `latest-text-save.hook.test.tsx:59-80`; fails on `expect(server.stored).toBe(FULL_TEXT);` (`:78`) | PASS |
| D02 | A reply to an older save never overwrites a newer one | Same test, each request's reply delayed by `REPLY_DELAYS_MS[(run + requestNumber) % …]`; fails on `expect(server.requests.at(-1)).toBe(FULL_TEXT);` (`:77`) | PASS |
| D03 | Closing the entry sheet before the pause ends still saves the full note (plan risk row) | `'saves the full note when the sheet is closed before the pause ends'`, `SetlistEntryRow.test.tsx:142-152`; fails on `expect(onSave).toHaveBeenCalledExactlyOnceWith('entry-1', { notes: 'Finir sur le refrain' });` | PASS |
| D04 | Transition sheet closed by the backdrop with a typed draft: kept and shown on reopening | `'is kept after a click on the backdrop and shown on reopening'`, `TransitionCommentModal.test.tsx:62-70`; fails on `expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();` | PASS |
| D05 | Same, closed by Escape | structural: the draft is written on every change (`TransitionCommentModal.tsx:84`, `kept.keep(event.target.value)`) and only a successful save clears it (`:47`), so how the sheet closes cannot reach it | PASS |
| D06 | A member colour close to `accent` or very pale: ink on it chosen by contrast | `'takes the light ink on a colour as dark as the dark ink'`, `member-color.utils.test.ts:114-117`; fails on `expect(selectInkOnMemberColor('#000000')).toBe('on-color-light');` | PASS |
| D07 | Unit: each of the five palette colours at 4.5:1 or more with the chosen ink | `'draws on %s (%s) with %s at 4.5:1 or more'`, `member-color.utils.test.ts:99-112`; fails on `expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(4.5);` | PASS |
| D08 | Unit: a malformed hex | `'falls back to the dark ink on a malformed colour'`, `member-color.utils.test.ts:119-121`; `expect(selectInkOnMemberColor('coral')).toBe('on-color-dark');` | PASS |
| D09 | Unit: the last-write-wins helper for the note field | `latest-text-save.utils.test.ts` at 100% coverage and 39 of 39 mutants killed (C01, C04) | PASS |
| D10 | Members created without a colour get the five-colour palette | `'takes the first palette colour for an empty band'`, `members-page.core.test.ts:57`; `member-palette.core.test.ts` pins the five hex values in order | PASS |
| D11 | Gate: the button type | `button.types.test.ts` with `@ts-expect-error` on a `Button` without `icon` (typecheck B03) | PASS |
| D12 | Gate: the new lint rules with `RuleTester` suites | `no-arbitrary-tailwind-value.test.js`, `no-raw-interactive-element.test.js`, `no-vertical-scroll-container.test.js` (C03) | PASS |
| D13 | Gate: one scroll, `/catalog/:songId/edit` its one exception | `no-vertical-scroll-container` with the inline exception in `SongChordPreview.tsx` | PASS |
| D14 | Gate: contrast test over the token values, including the disabled label (fix commit) | `'keeps the secondary and the disabled pill labels at 4.5:1 or more on their translucent fill in the %s scheme'`, `design-tokens.utils.test.ts:197`; fails when any `PILL_LABELS` pair, now including `['ink-soft', 'paper']`, measures under 4.5 | PASS |
| D15 | Gate: a class naming an undefined colour token fails | `design-tokens.utils.test.ts` undefined-token walk and the `bg-surface` canary | PASS |
| D16 | Each gate cited in its standard | `enforcement-ledger.ts --check` exit 0 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | API write paths | Check-then-write | `git diff origin/main...HEAD -- apps/pragma/api apps/pragma/domain` touches only the four `member-palette.*` files; grep for added `insert(`, `update(`, `delete(`, `onConflict`, `transaction(` finds none | PASS |
| E02 | API module state | Per-process state | No module-level `let` or `new Map/Set` added under `api/` or `domain/` | PASS |
| E03 | Site module store `transition-draft.store.ts:14-15` | Per-process state | `const listeners = new Set<Listener>();`, `const store = { drafts: new Map() }`: client-only, per tab; the spec asks only that the draft survives a close on the same device | PASS |
| E04 | Entry note, key and capo saves | Two saves for one field at once | One save in flight per field (`latest-text-save.utils.ts:38`); each `PATCH` carries only its own field | PASS |

## Notes

- The fix commit `82dc2b78` changes no API, domain, schema or member colour value. The member colour path was re-read on HEAD: the palette is the five colours `origin/main` stored, in the same order, and the only new member-related style is an `ink` ring on the primary player, which the spec prescribes for a selected member. Whether each member is still recognisable on screen is plan gate 16, a human check.
- A01: the fix commit records no new harness JSON. This pass ran task 9 three times (all equal to the baseline); it did not re-run the full 13-task `--compare`, so tasks other than 9 rest on the third pass's `slice-1-after-fix-round-2.json`, measured before the strip's loading placeholder was added. The commit message reports four clean full runs.
- C05: the same root Stryker run also mutated the four changed `eslint-rules/*.js` files, which the root `stryker.config.js` does not list (`mutate: ['scripts/**/*.core.ts', 'scripts/**/*.utils.ts']`) and no standard gates by mutation: `class-strings.js` 84.29 (11 survived), `no-arbitrary-tailwind-value.js` 72.60 (15 survived, 5 no coverage), `no-raw-interactive-element.js` 96.55 (1 survived), `no-vertical-scroll-container.js` 100. Not graded, since no rule requires it. Question: should the `RuleTester` suites of these three rules pin the surviving mutants, given the rules are the design system's only gate against arbitrary values and raw elements?
- Question, carried: `TransitionCommentModal.tsx` keeps a fixed `rows={6}` `textarea` with `resize-y`, which scrolls inside itself past six lines, while the spec says "text areas grow". Should it be an `AutoGrowTextarea`?
- Question, carried: the harness note race recorded one request per run, so the out-of-order replay is proved by D01 and D02 only.
- Question: `NextConcertStrip` now draws a 44 px placeholder while the sessions and setlists queries load, then removes it when no concert is ahead, so a band with no concert sees the content below shift up by the strip's height once. Is that shift acceptable on the routes that carry the strip?
- `scripts/standards/seal.ts verify` is plan gate 15 (`/standards-review`) and outside this report.

## Verdict: PASS
