# Technical validation — pragma draws members, instruments and side actions as marks

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist)
- Branch: claude/pragma-icons-over-words
- Base: origin/main (`d6a19418bd2e0af411943d91a83cf759a027ba0c`)
- Run at: 2026-11-19T20:03:54Z
- Round: 1
- Reviewed: 35bc113cd09306c209ddee724a39cbd5ed7c76cc
- Touched workspaces: @borso-app/pragma (site only, no `api/` or `domain/` file)

The spec is in the short form (Goal, Rules, What the musician sees, Out of scope). Category A is built from its five Rules and seven "What the musician sees" bullets, with files taken from the diff. Category D walks the same bullets in order. 1 use case routed to /visual-validation (layout at 375 px, bullet 7 first half); out of scope for this report. No merge commit sits above the base. HEAD still printed the reviewed SHA after every run.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | `docs/features/pragma/icons-over-words/plan/plan.md` | file does not exist | UNVERIFIABLE |
| A01 | Rule 1 | A member's mark carries the name as accessible name and `title`, with no name beside it | apps/pragma/site/src/components/molecules/MemberChip.tsx:15-21 | `initials={memberInitial(memberName)}` … `aria-label={memberName}` `title={memberName}`; the `withName` prop is removed | PASS |
| A02 | Rule 1 | Tasks page assignee drawn as a colour dot with no name beside | apps/pragma/site/src/components/molecules/TaskRow.tsx:61-67 | `<MemberMark shape="dot" color={props.assignee.color} role="img" aria-label={props.assignee.name} title={props.assignee.name} />`; MemberTaskColumn.tsx:28 drops `withName` | PASS |
| A03 | Rule 1 | Name removed beside avatars in the lineup editors, concert read/edit views, streak sheet, vote tally, setlist "my part" header | LineupMemberRow.tsx:38, InlineLineupEditor.tsx:64, ConcertReadView.tsx:54, ConcertEditForm.tsx:127, StreakSheet.tsx:54-61, VoteTally.tsx:55, SetlistViewContent.tsx:45 | e.g. `<MemberChip memberName={row.firstName} memberColor={row.color} size="md" />` with the adjacent `<span>{row.firstName}</span>` deleted; ConcertEditForm keeps the member in the input name: `aria-label={`${t('sessions.friendsCount')} — ${member.firstName}`}` | PASS |
| A04 | Rule 2 | Specific glyph replaces the name; generic `music` glyph or a glyph shared on the row keeps the name | apps/pragma/site/src/components/molecules/lineup-slots.core.ts:27,45-56 | `const GENERIC_INSTRUMENT_ICON: InstrumentIcon = 'music';` … `instrument.icon === GENERIC_INSTRUMENT_ICON \|\| sharedIcons.has(instrument.icon)` | PASS |
| A05 | Rule 2 | Instrument name stays as accessible name and tooltip on every converted surface | InstrumentToggleGroup.tsx:47-56, LineupMemberRow.tsx:50-54, InlineLineupEditor.tsx:82-86, SongLineupChips.tsx:47-56, MasteryMatrix.tsx:139-148, MemberEditForm.tsx:81-94 | `aria-label={instrument.name}` `title={instrument.name}` … `{namedInWords.has(instrument.id) ? instrument.name : null}` | PASS |
| A06 | Rule 2 | Where an instrument is shown with a specific glyph, the glyph replaces the name | apps/pragma/site/src/routes/catalog/catalog-page.core.ts:144-149, CatalogPage.tsx:72-80 | `const names = entry.instrumentIds.map((instrumentId) => instrumentNames.get(instrumentId) ?? '')` … `.join(INSTRUMENT_SEPARATOR)`. Failing case: the catalog "To learn" filter, a song to learn on Bass (icon `bass`) and Voice (icon `mic-vocal`) at lowest score 4 → its card detail reads the words `Bass, Voice · 4/10` (pinned by catalog-page.core.test.ts:180), no glyph, where Rule 2 asks for the bass and mic glyphs | FAIL (blocking) |
| A07 | Rule 3 | A lineup change is the member's mark then the glyphs; "sits out" is the `ring` shape with no glyph | apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:131-138 | `shape={change.heldParts.length === 0 ? 'ring' : 'dot'}` … `{change.heldParts.length === 0 ? null : (<MemberPartGlyphs parts={change.heldParts} size="sm" />)}` | PASS |
| A08 | Rule 3 | Each change is read aloud as the sentence it replaces | apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:59,118-121 | `const changeSentence = t('setlist.tonightChange', { change: changeLabel });` … `role="img" aria-label={changeSentence} title={changeSentence}` | PASS |
| A09 | Rule 3 | Held glyphs on one change follow Rule 2 (shared/generic named) | apps/pragma/site/src/components/organisms/entry-lineup-change.core.ts:47-52 | `const namedInWords = selectInstrumentIdsNamedInWords(held);` … `isNameNeeded: namedInWords.has(instrument.id),` | PASS |
| A10 | Rule 4 | A row of three or more actions shows each secondary action as icon only, word as name and tooltip; primary keeps word and icon | apps/pragma/site/src/components/molecules/SessionPrimaryActions.tsx:41-61; session-page.core.ts:186-198 | `if (isRowCrowded && variant === 'secondary') { return (<IconButton icon={icon} variant="secondary" label={label} …` ; `return shownCount >= FEWEST_ACTIONS_OF_A_CROWDED_ROW;`. Only the practice Songs-tab row (Start the practice + Order songs + Choose songs) reaches three; its only secondaries go through `PillAction` | PASS |
| A11 | Rule 4 | Chart card source row (Paste, Photo, PDF) | apps/pragma/site/src/components/organisms/SongChartCard.tsx:156-178 | `<IconButton variant="secondary" icon="camera" label={t('catalog.chordsPhoto')} …/>`, same for PDF; Paste keeps `<Button variant="secondary" icon="clipboard">{t('catalog.chordsPaste')}</Button>` as the group's main action | PASS |
| A12 | Rule 4 / Out of scope | A row of one or two actions is unchanged, `labelDisplay` kept | SessionPrimaryActions.tsx:53-61 | `labelDisplay={variant === 'secondary' ? 'wide-only' : 'always'}` reproduces the previous props exactly | PASS |
| A13 | Rule 5 | The signed-in card keeps its words | apps/pragma/site/src/components/organisms/AppShell.tsx:69-70 | `<MemberChip memberName={signedInName} memberColor={signedInColor} size="md" />` then only `{t('shell.meVersion')}`; the `<div className="truncate text-meta font-medium">{signedInName}</div>` on origin/main is deleted. Failing case: signed in as Gui, desktop sidebar at ≥ lg → the card shows the "G" avatar and "Pragma · v0.1", and "Gui" is no longer written, where Rule 5 lists "the signed-in card" among the words that stay | FAIL (blocking) |
| A14 | Rule 5 | Pickers keep words | apps/pragma/site/src/components/organisms/TaskForm.tsx:137-143 | `<Avatar size="xs" aria-hidden="true" initials={memberInitial(member.firstName)} … />` `{member.firstName}`; BarQualificationFields.tsx:96-98 `<option>{owner.firstName}</option>` untouched | PASS |
| A15 | Rule 5 | Whether the instrument toggles (lineup editors, chart "For" group) and the member's instrument checklist are "pickers" that keep words | InstrumentToggleGroup.tsx:47-56, LineupMemberRow.tsx:47-55, MemberEditForm.tsx:81-94 | names dropped beside specific glyphs in all three; the spec does not define "picker" | UNVERIFIABLE |
| A16 | Rule 1 vs Rule 5 | Members page roster still writes the name beside the avatar | apps/pragma/site/src/routes/members/MembersPage.tsx:141-156 | `<Avatar size="md" aria-hidden="true" …/>` … `{member.firstName}`; Rule 1 literally covers it, Rule 5 exempts "the Instruments page" but names no Members page | UNVERIFIABLE |
| A17 | Rule 5 | Free text, Instruments page, home greeting, "former member", status words untouched | `git diff --name-only origin/main...HEAD` | no change to InstrumentsList.tsx, HomePage.tsx greeting, TakeList.tsx, TakePlayer.tsx, InspirationCard.tsx, SketchTimeline.tsx; TaskRow.tsx:69-71 status `Badge` keeps `t(TASK_STATUS_LABEL_KEY[props.status])` | PASS |
| A18 | Seen 2 | Setlist lineup grid column headers show the avatar only | apps/pragma/site/src/components/organisms/SetlistLineupGrid.tsx:185 | `<MemberChip memberName={column.firstName} memberColor={column.color} size="xs" />`, the `{column.firstName}` span deleted | PASS |
| A19 | Seen 4 | Mastery matrix: glyph row headers, avatar column headers | apps/pragma/site/src/components/organisms/MasteryMatrix.tsx:145,161 | `<Icon name={INSTRUMENT_ICON_GLYPH[row.original.instrument.icon]} size="md" />`; `<MemberChip memberName={member.firstName} memberColor={member.color} size="md" />` | PASS |
| A20 | Seen 5 | Song lineup chips: avatar then glyphs, no name | apps/pragma/site/src/components/molecules/SongLineupChips.tsx:45-56 | `<MemberChip memberName={row.memberName} memberColor={row.memberColor} />` then `role="img" aria-label={instrument.instrumentName} title={instrument.instrumentName}` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | grep `(const\|let) [a-z]{1,2}\b` on added lines | none found; sampled names `selectInstrumentIdsNamedInWords`, `isSessionPillRowCrowded`, `describeHeldParts`, `FEWEST_ACTIONS_OF_A_CROWDED_ROW`, `changeSentence` | PASS |
| B02 | Magic numbers / strings named | read in full | `GENERIC_INSTRUMENT_ICON` (lineup-slots.core.ts:27), `FEWEST_ACTIONS_OF_A_CROWDED_ROW = 3` (session-page.core.ts:186) | PASS |
| B03 | No prose comments | grep `//\|/\*` on added lines | only `// @FollowsBlueprint` markers | PASS |
| B04 | Type assertions only `as const` / `as unknown` | grep `\bas (?!const\|unknown)` on added lines | none found (tests use `as const` only) | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on added lines | none found | PASS |
| B06 | `noUncheckedIndexedAccess` | read new code | `INSTRUMENT_ICON_GLYPH[...]` is a `satisfies Record<InstrumentIcon, IconName>` total record; no new array index | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <46 changed .ts/.tsx>` | exit 0, no diagnostics | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | knip | `pnpm knip --workspace apps/pragma` | exit 0, configuration hints only | PASS |
| B10 | `useEffect` is a smell | grep `\buseEffect\(` on added lines | none added | PASS |
| B11 | Standards 01: a `select…` returns what its verb says; boolean names not negated | read in full | `selectInstrumentIdsNamedInWords(...): ReadonlySet<string>`, `selectSharedIcons(...): ReadonlySet<InstrumentIcon>`; `isSessionPillRowCrowded`, `isRowCrowded` are positive | PASS |
| B12 | Standards 01: file name says what it holds; 02: `.core` vs `.utils` | read in full | the shared-glyph rule moved from setlist-filter.core.ts into lineup-slots.core.ts beside `INSTRUMENT_ICON_GLYPH`, a band-facing rule in a `.core` file; setlist-filter.core.ts:65 and entry-lineup-change.core.ts:47 now call it instead of a copy | PASS |
| B13 | Standards 01: VOCABULARY / INVARIANTS still true | read molecules, organisms, catalog, sessions, home `INVARIANTS.md` | no invariant names member names beside avatars or instrument words; catalog INVARIANTS "A pill reads one word" untouched by the diff | PASS |
| B14 | Standards 05: no family of booleans where a variant belongs | read `PillActionProps` (SessionPrimaryActions.tsx:24-31) | `variant`, `isRowCrowded`, `disabled`: one layout flag beside a native `disabled`; MemberChip loses `withName` | PASS |
| B15 | Standards 08: more than two visual variants through `cva` or a lookup | SessionPrimaryActions.tsx:41-61 | three outcomes (icon only, word always, word wide-only) chosen by one `if` and one ternary choosing between two components, not class strings | PASS |
| B16 | Standards 10: test names state behaviour and condition | read added `it(...)` | e.g. `'keeps the word on a secondary action in a row of two'`, `'draws a member who sits out as their ring, with no glyph'` | PASS |
| B17 | Standards 12: disable reasons checkable | grep `eslint-disable` on added lines | none added | PASS |
| B18 | Blueprint markers | `@FollowsBlueprint` on new exports | lineup-slots.core.ts:43 and session-page.core.ts:188 `core-decision`; new `PillAction` sits in a file already marked `molecule-presentational` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed d6a19418bd2e0af411943d91a83cf759a027ba0c --coverage --reporter=verbose` | 0 (31 files, 319 tests; every one of the 20 changed or added test files listed in the verbose output; coverage 100 % statements, branches, functions, lines on the 5 changed gated files) | PASS |
| C02 | @borso-app/pragma | `scripts/mutate-changed.sh d6a19418bd2e0af411943d91a83cf759a027ba0c apps/pragma` | 0 (316 killed, 0 survived on lineup-slots.core.ts, entry-lineup-change.core.ts, setlist-filter.core.ts, members-page.core.ts, session-page.core.ts) | PASS |
| C03 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed d6a19418bd2e0af411943d91a83cf759a027ba0c --reporter=verbose` | 0, no back-e2e file affected (diff is site-only) | PASS |
| C04 | @borso-app/pragma | `*.utils.ts` enumeration | the diff changes no `*.utils.ts`; every changed `.core.ts` has its sibling `.core.test.ts` in the diff and in the run | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Rule 1: no name written beside a member's mark | `'draws the initial alone and names the member to a screen reader and on hover'` MemberChip.test.tsx:41, fails at :48 `expect(container.textContent).toBe('G')` | PASS |
| D02 | Rule 1: the mark carries the name as accessible name and `title` | same test, :49-50 `expect(avatar?.getAttribute('aria-label')).toBe('Gui')`, `expect(avatar?.getAttribute('title')).toBe('Gui')` | PASS |
| D03 | Rule 2: a specific glyph replaces the name | `'draws a specific glyph alone and writes the name beside the generic one'` lineup-slots.core.test.ts:214, :220 `toEqual(new Set(['kazoo']))`; InstrumentToggleGroup.test.tsx:87 `expect(getChip('Guitare').textContent).toBe('')` | PASS |
| D04 | Rule 2: the generic glyph keeps the name | InstrumentToggleGroup.test.tsx:89 `expect(getChip('Kazoo').textContent).toBe('Kazoo')`; MasteryMatrix.test.tsx:75 | PASS |
| D05 | Rule 2: a glyph shared by two parts on the same row keeps the name | `'writes the name of every instrument whose glyph another one on the row shares'` lineup-slots.core.test.ts:223, :230 `toEqual(new Set(['rhythm', 'lead']))`; entry-lineup-change.core.test.ts:65, :78 `['Lead', true]` | PASS |
| D06 | Rule 2: name stays as accessible name and tooltip | InstrumentToggleGroup.test.tsx:88 `querySelector('[title="Guitare"] svg')`; MasteryMatrix.test.tsx:73-74 `getAttribute('title')).toBe('Bass')` | PASS |
| D07 | Rule 3: a change is the member's mark then the glyphs | `'draws a member’s change as their dot then the glyphs they play tonight'` SetlistEntryRow.test.tsx:120, :132 `expect(tom?.querySelector('[aria-label="Guitar"] svg')).not.toBeNull()` | PASS |
| D08 | Rule 3: "sits out" is the `ring` shape with no glyph | `'draws a member who sits out as their ring, with no glyph'` SetlistEntryRow.test.tsx:135, :144 `toContain('border-2')`, :145 `querySelector('svg')).toBeNull()` | PASS |
| D09 | Rule 3: read aloud as the sentence it replaces, never written | SetlistEntryRow.test.tsx:104, :115 `getByRole('img', { name: 'Tonight: Tom: Guitar · Léa sits out' })`, :117 `queryByText(/Tonight/)).toBeNull()` | PASS |
| D10 | Rule 4: in a row of three or more, each secondary action is icon only, word as name and tooltip | `'keeps the word on the primary action of a crowded row and draws the others as named icons'` SessionPrimaryActions.test.tsx:38, :45 `textContent).toBe('')`, :46 `getAttribute('title')).toBe(name)`; SongEditForm.test.tsx:205, :211-212 | PASS |
| D11 | Rule 4: the primary action keeps its word | SessionPrimaryActions.test.tsx:40-42 `getByRole('link', { name: 'Start the practice' }).textContent).toBe('Start the practice')` | PASS |
| D12 | Rule 4: the primary action keeps its icon | **structural:** SessionPrimaryActions.tsx:83-85 `<ButtonLink icon="play" variant="primary" …>`, the branch untouched by this diff | PASS |
| D13 | Rule 4: the crowded threshold is three | `'crowds the row once Start the practice stands beside Order songs and Choose songs'` session-page.core.test.ts, and `'counts every action the row can show'` asserting `false` at two and `true` at three; mutation run killed all 10 mutants of `isSessionPillRowCrowded` | PASS |
| D14 | Rule 4: a row of one or two is unchanged | `'keeps the word on a secondary action in a row of two'` SessionPrimaryActions.test.tsx:50, :52 `textContent).toBe('Choose songs')` | PASS |
| D15 | Rule 5: the signed-in card keeps its words | (none found; no test renders AppShell, and A13 shows the name removed) | FAIL (blocking) |
| D16 | Rule 5: pickers keep words (task assignee picker, changed in this diff) | (none found; no assertion in TaskForm.test.tsx reads a member name in the assignee chips) | FAIL (blocking) |
| D17 | Rule 5: "former member", Instruments page, greeting, free text, status words stay | **structural:** none of their files is in the diff; "former member" also pinned at InspirationsPage.test.tsx:86 `toContain('former member · in 1 sketch')` | PASS |
| D18 | Seen 1: tasks page assignee as colour mark, no name, named on hover | `'draws the assignee as their colour mark, named on hover and to a screen reader'` TaskRow.test.tsx:31, :45 `getByRole('img', { name: 'Gui' }).getAttribute('title')).toBe('Gui')`, :46 `queryByText('Gui')).toBeNull()` | PASS |
| D19 | Seen 2: lineup grid column headers show the avatar only | `'heads each column with the member’s mark alone, named on hover'` SetlistLineupGrid.test.tsx:168, :171 `expect(head.textContent).toBe('A')` | PASS |
| D20 | Seen 3: a setlist row's change tonight is mark plus glyphs | see D07 to D09 | PASS |
| D21 | Seen 4: mastery matrix glyph row headers | `'heads each row with the instrument glyph, and writes the name only beside the generic one'` MasteryMatrix.test.tsx:70, :73 `expect(bass.textContent).toBe('')` | PASS |
| D22 | Seen 4: mastery matrix avatar column headers | `'puts one member per column, headed by their avatar alone in their stored colour'` MasteryMatrix.test.tsx:54, :57 `toEqual(['', 'A', 'B'])` | PASS |
| D23 | Seen 5: song lineup chips avatar then glyphs, no name | SongLineupChips.test.tsx:25, :28 `toEqual(['L', 'T'])`, and accessible names `['Léa', 'Lead vocals', 'Guitar']` | PASS |
| D24 | Seen 6: a header with three or more actions | see D10, D11, D14 | PASS |
| D25 | Seen 7: every mark or icon-only button has an accessible name equal to the word it replaced | MemberChip.test.tsx:49, TaskRow.test.tsx:45, SessionPrimaryActions.test.tsx:44 `getByRole('button', { name })`, StreakSheet.test.tsx `getByRole('img', { name: 'Léa' })` | PASS |
| D26 | Seen 7: every screen above works at 375 px | routed to /visual-validation | routed to /visual-validation |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff --name-only origin/main...HEAD \| grep -E '\.(service\|repository\|controller)\.ts$'` prints 0 files; `grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` on the diff prints nothing. The `Set`s in lineup-slots.core.ts:35-36 are locals of `selectSharedIcons` | PASS |

## Blocking findings

- A06 — the catalog "To learn" card writes instrument names ("Bass, Voice · 4/10") where Rule 2 asks for glyphs.
- A13 — the desktop signed-in card no longer writes the member's name, which Rule 5 keeps.
- D15 — no test pins the signed-in card's words.
- D16 — no test pins that the task assignee picker keeps member names.

## Non-blocking findings

- none

## Notes

- A00: no plan exists. Files were taken from the diff. Running `/technical-conception` would have listed the surfaces Rule 2 reaches, which is how A06 was missed.
- A15: does "pickers" in Rule 5 cover the instrument toggles of the lineup editors, the chart "For" toggle group and the member's instrument checklist? The task assignee picker kept names (TaskForm.tsx:137-143) while these three dropped them. The answer decides whether those three surfaces are a defect.
- A16: does Rule 1 reach the Members page roster (MembersPage.tsx:141-156)? Rule 5 exempts "the Instruments page" by name and not the Members page, and the roster still writes each name beside the avatar.
- Is a chart pill for one instrument (catalog INVARIANTS "A chart for one instrument reads that instrument's name") an instrument "shown" under Rule 2? The diff leaves it in words, and the invariant still says so.
- ConcertEditForm.tsx:128 and StreakSheet.tsx:61 add an empty `<span className="flex-1" />` / `<span className="flex-auto" />` as a spacer where the name used to grow. Would `ml-auto` on the next element say the same with no empty node? No standards bullet covers it.

## Verdict: FAIL
