# Technical validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (Tier 1 change, no plan written)
- Branch: claude/bold-heisenberg-wdysrp
- Base: dd110bc03231d61f9dc6e7f324ec4d65c44ef83e
- Run at: 2026-11-19T14:07:35Z
- Round: 1 (of the revision that adds *The transition to the next song*)
- Reviewed: ac89ba6215a1b882473c9ea51f6dead424389cf0
- Touched workspaces: @borso-app/pragma (site only)

This report reads `git diff dd110bc03231d61f9dc6e7f324ec4d65c44ef83e..HEAD`, three commits. `cc4a119d` fixes the two blocking findings of the previous review (A02 and A07/D09 of `technical-validation-2026-11-19-0857.md`). `1276c50b` adds the visual validation report only. `ac89ba62` adds the transition strip and card. No merge sits in the range (`git rev-list --merges` printed nothing). HEAD stayed at the reviewed SHA through every run, and the working tree held only the untracked visual validation folder of another agent.

The spec is in the short form (no Q.O.D., no *Test strategy*). Categories A and D are built from the bullets of *The transition to the next song*, the out-of-scope bullet it added, and the two bullets the fix commit touches. Files are taken from the diff.

3 use cases routed to /visual-validation; out of scope for this report. They are: the strip shows only the start of the note (CSS `truncate`), the strip hides and comes back as a real thumb scrolls the chart (jsdom has no layout, so the tests drive a mocked `IntersectionObserver`), and the lineup reads as avatars and instrument glyphs at 375 px.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | n/a | UNVERIFIABLE |
| A01 | Where it ends §2 (previous A02) | Chord names written without brackets, extensions included, are not lyrics | apps/pragma/site/src/lib/chordpro-solo.utils.ts:9-10 | `/(?<!\p{L})[A-G][#b]?(?:maj\|min\|dim\|aug\|sus\|add\|m\|\d\|[#b+-](?=\d))*(?:\/[A-G][#b]?)?(?![\p{L}\d#])/gu`. Probe on `{comment: Solo}\n[Am] [F]\n\n<second>`: `Am7b5 D7 Gm`, `C7sus4 C7`, `Cmaj7#11 Dm9`, `G7-9 Caug+5` each give `solo:3`; `Be my love`, `Add some words`, `Cab driver` each give `solo:1,body:1` | PASS |
| A02 | Swiping §2 (previous A07) | A swipe counts at least one and a half times as far sideways as down | apps/pragma/site/src/routes/setlists/scene-swipe.core.ts:10 | `const isHorizontal = Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_DOMINANCE;` | PASS |
| A03 | Transition §1 | A strip above the transport | SetlistScenePage.tsx:288-296, then `<SceneTransport` | `{transitionPreview === null \|\| transitionCard.isCardInView ? null : (<SceneTransitionPreview layout="strip" onReveal={transitionCard.revealCard} {...transitionPreview} />)}` sits after the chart container and before `{setlistEntries.length === 0 ? null : (<SceneTransport` | PASS |
| A04 | Transition §1 | The strip names the next song, its key, its lineup and the band's transition note | SceneTransitionPreview.tsx:95-120; scene-transition.hook.ts:56-66 | `{nextTitle}` / `{nextTonality === null ? null : (<span ...>{nextTonality}</span>)}` / `<SceneTransitionLineup members={transition.members} />` / `{note}`; `nextTonality: headline.tonalityLabel,` from `buildSceneHeadline(nextEntry, nextSong)`, `note: commentQuery.data?.comment.comment ?? ''` | PASS |
| A05 | Transition §1 | The note is the band's note for this pair, the one the setlist editor writes | scene-transition.hook.ts:50-54; TransitionCommentModal.tsx:37 | `useTransitionComment(song?.id ?? '', nextSong?.id ?? '', song !== undefined && nextSong !== undefined,)`, the same `(songAId, songBId)` order as `useTransitionComment(songAId, songBId)` in the editor's modal | PASS |
| A06 | Transition §2 | Each member who plays the next song shows as avatar then glyphs, never words | SceneTransitionLineup.tsx:33-43; scene-transition.core.ts:87-89 | `if (heldNext.length === 0) return [];` / `<Avatar initials={memberInitial(member.firstName)} ... aria-hidden />` `<Glyphs parts={member.putDown} />` arrow `<Glyphs parts={member.pickUp} />`. The name lives only in `aria-label={describeSceneTransitionMember(member)}` | PASS |
| A07 | Transition §2 | A member who keeps an instrument shows the avatar and that glyph | scene-transition.core.ts:69-71, 98-99 | `return isSameSet(heldNow, heldNext) ? 'keeps' : 'changes';` / `hasArrow: move !== 'keeps',` / `putDown: move === 'changes' ? ... : NOTHING_HELD,` | PASS |
| A08 | Transition §2 | A member who changes shows put down, arrow, pick up | scene-transition.core.ts:98-100 | `putDown: move === 'changes' ? partsOf(heldNow, input.instruments) : NOTHING_HELD,` / `pickUp: partsOf(heldNext, input.instruments),` | PASS |
| A09 | Transition §2 | A member who keeps one instrument and adds or swaps another | scene-transition.core.ts:71, 99 | Probe: Hugo `piano` then `piano, bass` gives `move: 'changes'`, `putDown: [piano]`, `pickUp: [piano, bass]`, drawn as piano, arrow, piano, bass. He keeps the piano, which the strip draws as put down. The spec defines *keeps* and *changes* but not a member who does both | UNVERIFIABLE |
| A10 | Transition §2 | A member who joins shows avatar, arrow, pick up | scene-transition.core.ts:70, 98 | `if (heldNow.length === 0) return 'joins';` with `hasArrow: move !== 'keeps'` | PASS |
| A11 | Transition §3 | The warn icon and "risky" label when nobody keeps an instrument, as the setlist editor's flag says | scene-transition.core.ts:82-86, 104; SceneTransitionPreview.tsx:102-109; transition-view.core.ts:93 | `const verdict = evaluateTransition(input.currentLineup, input.nextLineup, familyMapOf(input.instruments));` / `isRisky: verdict.kind === 'risky'`, the same domain function the editor calls / `<Icon name="warn" />` `{t('setlist.transitionRisky')}`, the editor's label key | PASS |
| A12 | Transition §4 | Scrolled to the end, the same content shows as a card below the last line, with the full note, and the strip hides | SetlistScenePage.tsx:277-283, 288; SceneTransitionPreview.tsx:70-73; scene-transition-card.hook.ts:12-14 | card rendered after `<ChordChartViewer ... />` inside the chart container / `card: 'whitespace-pre-wrap text-body'` against `strip: 'truncate text-meta'` / `setIsCardInView(entries.some((entry) => entry.isIntersecting));` hides the strip | PASS |
| A13 | Transition §4 | Scrolling back up shows the strip again | scene-transition-card.hook.ts:12-14 | the same observer callback sets `false` when the card leaves the viewport | PASS |
| A14 | Transition §5 | The last song has no strip and no card | scene-transition.hook.ts:47, 55 | `nextEntry: setlistEntries[currentIndex + 1]` is `undefined` on the last song, and `if (nextEntry === undefined \|\| nextSong === undefined) return null;`; both layouts render only when `transitionPreview !== null` | PASS |
| A15 | Out of scope, new bullet | A member who plays the current song and not the next one shows nothing | scene-transition.core.ts:88-89 | `const heldNext = instrumentsHeldBy(input.nextLineup, member.id); if (heldNext.length === 0) return [];` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read each changed source file | `heldNow`, `heldNext`, `verdict`, `transitionPreview`, `transitionCard`, `attachCard`, `revealCard`. None found | PASS |
| B02 | Magic numbers / strings named | read in full | `ARROW`, `NOTHING_HELD`, `NO_MEMBERS`, `REVEAL`, `NOTE_CLASS_BY_LAYOUT`, `TITLE_CLASS_BY_LAYOUT`, `HORIZONTAL_DOMINANCE` | PASS |
| B03 | No prose comments | read in full | new comments are `/** @Feature setlists */`, `// @FollowsBlueprint ...` and one `eslint-disable-next-line` with a reason | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\|unknown)\w'` on the 13 changed app files | only test titles such as `'reads words between chords as lyrics'`; no assertion | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on the changed files | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `setlistEntries[currentIndex + 1]` and `input.songsById[nextEntry.songId]` both checked against `undefined` (scene-transition.hook.ts:49, 55) | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <13 changed app files>` | exit 0, no output | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found. The `IntersectionObserver` subscription lives in a React 19 ref callback that returns its cleanup (scene-transition-card.hook.ts:8-19) | PASS |
| B09 | Standards 01: "a `build…`, `project…` or `select…` returns what its verb says" | read in full | `buildSceneTransition` returns a `SceneTransition`, `selectMove` a `SceneTransitionMove`, `selectSwipeCommand` a command or `null` | PASS |
| B10 | Standards 01: "a boolean name is not negated" | read in full | `isRisky`, `hasArrow`, `isCardInView`, `isHorizontal` | PASS |
| B11 | Standards 01: "a comment documents something the code cannot say" / Standards 12: a disable reason is a checkable claim | read in full | `// eslint-disable-next-line borso/no-raw-interactive-element -- a full-width stage strip in the scene's own dark tokens, not one of the app's Button variants` at SceneTransitionPreview.tsx:131, a claim about the line a reader can check against the Button variants | PASS |
| B12 | Standards 01: "a file name says what the file holds" | read in full | `scene-transition.core.ts` holds the transition decision, `scene-transition-card.hook.ts` `useSceneTransitionCard`, `scene-transition.hook.ts` `useSceneTransitionPreview` | PASS |
| B13 | Standards 01: `VOCABULARY.md` / `INVARIANTS.md` still true | grep | none changed in the range; `routes/setlists/INVARIANTS.md` covers the order screen only | PASS |
| B14 | Standards 02: "the choice between `.core.ts` and `.utils.ts`" | read in full | `scene-transition.core.ts` decides who keeps, changes or joins across a transition, a band term | PASS |
| B15 | Standards 03: "a derived type is derived" | read in full | `SceneTransitionMemberInput`, `SceneTransitionInstrumentInput`, `TransitionSongInput` are narrow structural inputs the route's query data satisfies, not copies of a row or response type | PASS |
| B16 | Standards 05: "a route composes organisms and owns no layout primitive" | read in full | SetlistScenePage.tsx adds two `<SceneTransitionPreview>` organisms and no layout element (:277-296) | PASS |
| B17 | Standards 05: no new label explains the interface; no boolean prop family | read in full | visible text adds only "Then"; props are a `layout: 'strip' \| 'card'` variant string, `onReveal`, `cardRef` | PASS |
| B18 | Standards 08: more than two visual variants through `cva` or a lookup record | read in full | two layouts, already through `NOTE_CLASS_BY_LAYOUT` and `TITLE_CLASS_BY_LAYOUT` lookup records | PASS |
| B19 | Standards 09: "a key's dotted path names the screen and the element" | read in full | `aria-label={t('scene.transitionOpen', { title: body.nextTitle })}` at SceneTransitionPreview.tsx:145 labels the card `<section>` "Show the transition to Helpless", an action name on a region that does nothing. A screen reader landing on the card announces "Show the transition to Helpless, region". The key names the strip button, not the card. Introduced: this branch; Fix size: one key and one line | FAIL (non-blocking) |
| B20 | Standards 10: "a test name states the behaviour and the condition" | read in full | `shows no transition on the last song`, `names the next song before the members have loaded, with no lineup yet`, `keeps the strip showing in a browser without IntersectionObserver` | PASS |
| B21 | Blueprint marks | read in full against `.claude/skills/blueprint/blueprint-index.md` | `// @FollowsBlueprint hook-stateful-helper` at scene-transition.hook.ts:42 marks `useSceneTransitionPreview`, which owns no `useState` and returns no callback. The blueprint is "Hook Owning State And Returning Callbacks" (blueprint-index.md:167). The mark fits `scene-transition-card.hook.ts:13`, not this hook. Introduced: this branch; Fix size: one line | FAIL (non-blocking) |
| B22 | Reuse first (CLAUDE.md) | grep for an instrument family map | `function familyMapOf(instruments)` at scene-transition.core.ts:74-78 returns `{ [id]: { family } }`, the shape `export function instrumentFamilyMap(instruments: readonly SetlistEditorInstrument[])` at components/organisms/setlist-editor.utils.ts:81 already builds for the same `evaluateTransition` call. Two copies of the input the risky flag reads. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed dd110bc03231d61f9dc6e7f324ec4d65c44ef83e --coverage --reporter=verbose` | 0. 79 files, 561 tests, coverage gate held. Includes scene-transition.core.test.ts, scene-transition-card.hook.test.tsx, SetlistScenePage.test.tsx, scene-swipe.core.test.ts, chordpro-solo.utils.test.ts, chordpro-sections.utils.test.ts | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed dd110bc03231d61f9dc6e7f324ec4d65c44ef83e --reporter=verbose` | 0, "No test files found". `git diff --name-only dd110bc..HEAD -- 'apps/*/api/**' 'apps/*/domain/**'` prints 0 lines, so no e2e test imports a changed file. Full SHA used | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh dd110bc03231d61f9dc6e7f324ec4d65c44ef83e apps/pragma` | 0. chordpro-solo.utils.ts 79 killed / 0 survived, scene-swipe.core.ts 20 / 0, scene-transition.core.ts 52 / 0 | PASS |
| C04 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run typecheck` | 0 | PASS |
| C05 | repository | `pnpm knip` | 0. No unused export or file reported | PASS |
| C06 | @borso-app/pragma | every changed `*.utils.ts` / `*.core.ts` has a sibling test | chordpro-solo.utils.test.ts, scene-swipe.core.test.ts, scene-transition.core.test.ts present and run in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Unbracketed chord names with an extension are not lyrics (previous A02) | `it('does not read chord names written without brackets as lyrics')` at chordpro-solo.utils.test.ts:38, `expect(isLyricLine(parseChordProLine('Am7b5 D7 Gm C7sus4 Cmaj7#11 Dm9 G7-9 Caug+5'))).toBe(false);` at :40 | PASS |
| D02 | A swipe exactly 1.5 times as far sideways as down counts (previous D09) | `it('ignores a gesture that mostly scrolls the chart')` at scene-swipe.core.test.ts:19, `expect(selectSwipeCommand(-90, 60)).toBe('next');` at :21 and `expect(selectSwipeCommand(-89, 60)).toBeNull();` at :20 | PASS |
| D03 | The strip names the next song | `it('shows the next song, its lineup as icons and the start of the note in a strip')` at SetlistScenePage.test.tsx:358, `expect(strip?.textContent).toContain('Helpless');` at :360 | PASS |
| D04 | The strip shows the next song's key | (none found). Every fixture song carries `tonalityStart: 'Ebm'` (SetlistScenePage.test.tsx:48) and no assertion reads it in the strip or the card. Deleting `{nextTonality === null ? null : (...)}` at SceneTransitionPreview.tsx:98-100 leaves every test green. The code does render it (A04) | FAIL (non-blocking) |
| D05 | The strip shows the lineup | SetlistScenePage.test.tsx:362, `expect(strip?.querySelector('[data-transition-move]')?.getAttribute('aria-label')).toBe('Tom: Guitare → Basse',);` | PASS |
| D06 | The strip shows the band's note | SetlistScenePage.test.tsx:361, `expect(strip?.textContent).toContain('Tom swaps to the bass');`; `it('shows no note when the band wrote none for the pair')` at :406 | PASS |
| D07 | The lineup shows avatars and glyphs, never words | (none found). No test asserts that the strip's text leaves out the instrument names, such as `expect(strip?.textContent).not.toContain('Guitare')`. A change printing `part.name` beside each glyph in SceneTransitionLineup.tsx:22 leaves every test green. The code is right today (A06) | FAIL (non-blocking) |
| D08 | A member who keeps an instrument shows the avatar and that glyph | `it('shows a member who keeps an instrument with only what they keep')` at scene-transition.core.test.ts:46, `expect(gui).toEqual({ ... move: 'keeps', hasArrow: false, putDown: [], pickUp: [{ instrumentId: 'drums', ... }] })` | PASS |
| D09 | A member who changes shows put down, an arrow, pick up | `it('shows a member who changes with what they put down and what they pick up')` at scene-transition.core.test.ts:59, `expect(hugo?.putDown.map((part) => part.icon)).toEqual(['piano']);` / `expect(hugo?.pickUp.map((part) => part.icon)).toEqual(['bass']);`; the arrow at :75, `expect(hugo?.hasArrow).toBe(true);` | PASS |
| D10 | A member who joins shows the avatar and what they pick up, nothing put down | `it('shows a member who joins with nothing put down')` at scene-transition.core.test.ts:66, `expect(emma?.putDown).toEqual([]);` | PASS |
| D11 | ... and an arrow | (none found). The joins test at scene-transition.core.test.ts:66-70 asserts `move` and `putDown`, never `hasArrow`. `describeSceneTransitionMember` gives `'Emma: → Piano'` (:113) from `MOVE_DESCRIPTION`, which does not read `hasArrow`. Writing `hasArrow: move === 'changes'` at scene-transition.core.ts:98 drops the drawn arrow for a joining member and every test stays green. The code is right today (A10) | FAIL (non-blocking) |
| D12 | The warn icon and "risky" label when nobody keeps an instrument | `it('says the gap is risky when nobody keeps an instrument')` at scene-transition.core.test.ts:95, `expect(transitionOf({ hugo: ['piano'] }, { hugo: ['bass'] }).isRisky).toBe(true);`; page at SetlistScenePage.test.tsx:365, `expect(strip?.querySelector('[data-transition-risky]')).not.toBeNull();` | PASS |
| D13 | No warn while someone keeps a harmonic instrument | `it('says the gap is covered while someone keeps a harmonic instrument')` at scene-transition.core.test.ts:91, `.isRisky).toBe(false);` | PASS |
| D14 | The card below the chart holds the full note | `it('opens the same transition as a card below the chart and hides the strip once it is in view')` at SetlistScenePage.test.tsx:368, `expect(card?.textContent).toContain('Tom swaps to the bass while the drums vamp');` | PASS |
| D15 | The strip hides once the card is in view | same test, after `callback([{ isIntersecting: true }])`, `expect(container.querySelector('button[aria-label="Show the transition to Helpless"]'),).toBeNull();` | PASS |
| D16 | Scrolling back up shows the strip again | same test, after `callback([{ isIntersecting: false }])`, `.not.toBeNull();` | PASS |
| D17 | The last song has no strip | `it('shows no transition on the last song')` at SetlistScenePage.test.tsx:411, `expect(container.querySelector('[aria-label^="Show the transition"]')).toBeNull();`, a selector matching the strip's `button` | PASS |
| D18 | The last song has no card | same assertion, which also matches the card's `section` (both carry `scene.transitionOpen`) | PASS |
| D19 | A member who plays the current song and not the next shows nothing | `it('leaves out a member who sits out the next song, and keeps the members order')` at scene-transition.core.test.ts:83, `expect(transition.members.map((member) => member.memberId)).toEqual(['gui', 'emma']);` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write, per-process state | `git diff dd110bc..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing, and no file under `api/` or `domain/` changed. New module-level values are constants (`NOTHING_HELD`, `ARROW`, `MOVE_DESCRIPTION`, `NO_MEMBERS`, `REVEAL`, the two class records). The card's in-view flag is per-component `useState` in the browser | PASS |

## Blocking findings

- none

## Non-blocking findings

- B19 — the card `<section>` is labelled with the strip button's action key, so a screen reader announces "Show the transition to Helpless, region" on a region that does nothing (SceneTransitionPreview.tsx:145).
- B21 — `useSceneTransitionPreview` carries `@FollowsBlueprint hook-stateful-helper` but owns no state and returns no callback (scene-transition.hook.ts:42).
- B22 — `familyMapOf` (scene-transition.core.ts:74) duplicates `instrumentFamilyMap` (setlist-editor.utils.ts:81), the input the editor's risky flag already builds.
- D04 — no test asserts the next song's key in the strip or the card.
- D07 — no test asserts that the lineup carries no instrument names as text.
- D11 — no test asserts the arrow for a joining member (`hasArrow` for `joins`).

## Notes

- A00: no plan was written, by design for a Tier 1 change. Files were taken from the diff.
- A09: a member who keeps one instrument and adds or swaps another is drawn as a change whose put-down glyphs include the instrument kept. Probe: Hugo on `piano`, then on `piano, bass`, gives `putDown: [piano]`, `pickUp: [piano, bass]`, drawn piano, arrow, piano, bass. The test `it('reads a member who adds an instrument as a change')` at scene-transition.core.test.ts:78 pins `changes`. The spec says a member who keeps an instrument shows "that glyph", and a member who changes shows "the glyphs they put down". Should the put-down side hold only what the member stops playing (here nothing, so avatar, piano, arrow, bass), or the whole of what they held before, as now?
- `describeSceneTransitionMember` (scene-transition.core.ts:121-123) builds the accessible name as `${firstName}: ...` with a literal `→`, outside i18n. A French screen reader reads "Hugo: Piano flèche droite Basse" with no French spacing before the colon (inferred, not heard). Should the template go through `fr.json`?
- SceneTransitionLineup.tsx:33-35 gives each `<li>` `role="img"`, which replaces its `listitem` role, so the `<ul>` holds no list item for assistive technology (inferred from the ARIA roles, no axe run). Is the list semantics wanted here?
- `SceneTransitionLineup.tsx`, a molecule, imports its types from `routes/setlists/scene-transition.core.ts`. Organisms already import from `routes/` (grep found ten), molecules did not until now, and lint passes. Should the core live under `components/` or `domain/`?
- The fix commit `cc4a119d` leaves the three notes of the previous report as they are, with reasons. They were notes, not findings, so they get no row.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
