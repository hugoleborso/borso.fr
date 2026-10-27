# ADR-0045: pragma's design system is the Notebook direction, with Backstage's buttons and six other grafts

- **Status:** accepted
- **Date:** 2026-10-27
- **Ratified:** by the operator in chat on 2026-10-27, with one change: members keep their own stored colours, shown prominently in the Lineup view, and the six `member-*` tokens are dropped (see *Member colours* under *Decision*)
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, ux-redesign, design-system, front-end

## Context

The pragma UX audit counted 18 font sizes, 45 button and link looks, 61 background colours and 14 dialogs with no shared component (`audit/audit-design-system/findings.md`, summarised in `audit/design-system/DESIGN.md`). The operator named a weak design system and hard-to-find buttons among four complaints, and called the first proposal's blue rounded rectangle next to a white bordered rectangle ugly. Three directions were then drawn with tokens and screens: Studio, Backstage and Notebook (`audit/ds-studio/`, `audit/ds-backstage/`, `audit/ds-notebook/`). A critic scored them 34, 35 and 34 out of 45 (`spec/design/comparison.md`), so the totals do not decide.

The constraints that close doors before the trade-off: one developer pays for the migration across every screen; the manifest's theme colour is in every installed phone's splash screen; the app must read in light and dark mode, and today's `apps/pragma/site/src/styles/tokens.css` (115 lines, read this session) defines dark values in a separate `prefers-color-scheme` block; the operator's rules (an icon on every button, no key on the session page, songs added from the setlist several at once) are not negotiable. The operator ratified a choice in chat on 2026-10-27 ("Go avec Notebook + greffes"); this record writes down what was weighed.

## Decision

**Notebook is the base, with the grafts listed in the spec's *Design system* section.** Notebook's paper, single blue ink for actions, pencil for transitions, highlighter for tonight's changes and Newsreader for the band's words stay; Backstage's filled pill buttons replace Notebook's rectangles, in Notebook's blue; Add songs and Order float as two pills in Notebook's 52 px strip with no bar; Studio's lineup grid layout fits up to six members at 375 px with no sideways scroll (the band has five); Backstage's song page for learning and its empty "Note this transition" line come across; "a chosen option turns ink, never blue" becomes a written rule; Studio's labelled round actions carry the song page's secondary actions; the ruled note field is dropped. Notebook wins because it is the only direction that keeps every operator rule and passes every text pair in both schemes, at the lowest migration cost; the grafts remove the one thing the operator explicitly rejected in it, its buttons.

**Member colours.** Notebook drew six `member-1` to `member-6` tokens with an `on-member` text colour, and the spec review proposed mapping each member's stored colour onto them (spec Q2b). The operator refused on 2026-10-27: each member keeps the colour stored on their row (`member.color`, a free hex value), and that colour must stay clearly visible, above all in the Lineup view, so the band learns to recognise each member by colour at a glance. The six `member-*` tokens and `on-member` are therefore not taken, and no colour is remapped or migrated. The rules, written in full in the spec's *Member colours*:

- In the Lineup grid and the lineup chips the colour is a prominent mark: the column header is the member's avatar filled with it, the column carries a tint of it, a cell where the member plays is filled with it, and lineup avatars on rows and sheets are filled with it.
- Elsewhere (setlist rows, sheets, tasks, takes) the colour stays visible at least as a dot or a ring beside the member.
- An initial or a glyph drawn on a member colour takes one of two scheme-independent inks, `on-color-dark` or `on-color-light`, whichever has the higher contrast ratio with that colour, chosen by a pure function in `member-color.utils.ts` at 100% coverage. The existing `readableForeground` picks by a luminance above 0.5 and so chose the light ink on all five palette colours, at 2.15:1 to 3.26:1 on four of them; comparing ratios gives 5.28:1 or more on all five.
- A member's name on a page background is always in a text token, never in the member's colour, and the colour only ever means the member: a change or a selection is marked with the highlighter or an `ink` ring, never by another fill.

## Consequences

- `+` The light accent `#2d5fa0` and the paper stay, so the manifest colour and the installed splash screen do not change.
- `+` Every text pair in Notebook's tokens passes 4.5:1 in both schemes (lowest 5.00:1, `ink-faint` on paper), and the grafted primary button keeps Notebook's 6.34:1 and 8.34:1 label figures because it keeps Notebook's blue.
- `+` The rules become types and lint gates rather than advice: `icon` required on `Button` and `ButtonLink`, `label` required on `IconButton`, no arbitrary Tailwind values, no raw `<dialog>` outside `Sheet`.
- `-` The mix has never been drawn as one specimen. Each graft was seen in its own direction's screens, so slice 1 is the first time the combination is looked at, and a graft that clashes in place is found during implementation, not before.
- `-` Two contrast figures are open: the grafted secondary pill (ink on a translucent fill over `paper` and over `raised`) is not in Notebook's `contrast.txt`, and the dark-mode highlighter reads as olive. Both must be computed and retuned in slice 1.
- `-` Members keep colours nobody chose against the paper. A stored colour close to `accent` makes that member's lane look blue, and the palette's fills are pale on light `paper` (1.94:1 for mustard); the name in a text token in the column header and beside every mark is what keeps the screen readable. A free colour can bring the better ink down to about 4.15:1 at worst, which a glyph tolerates and an initial accepts as a known limit.
- `-` A member's stored colour is the one dynamic value the "no value outside the tokens" rule lets through, so it must stay confined to the member colour atoms and the Lineup grid, or the rule's lint gate loses its meaning.
- `+` No member's look changes, the band keeps the colours it already associates with each member, and no colour mapping or migration of `member.color` is needed.
- `-` Serif titles in lists are wider than today's sans: Newsreader at 19 px truncates long titles sooner, which is why the lineup grid takes Studio's title-on-its-own-line layout.
- `~` A new font replaces Instrument Serif; that is its own record, [ADR-0046](./0046-newsreader-replaces-instrument-serif.md).
- `~` Tokens move to `light-dark()` values in one `@theme static` block. `light-dark()` needs Safari 17.5 or later on iPhone (MDN browser compatibility data 8.1.7, read this session: Chrome 123, Firefox 120, Safari 17.5).

## Alternatives considered

### Option A — Notebook with grafts (chosen)

- **Summary:** As described in *Decision*. The graft list and the contrast fixes are in the spec's *Design system* section.
- **Strengths:**
  - Keeps every operator rule (critic: 5 of 5 on operator rules, the only direction to write them all down).
  - Every Notebook text pair passes in both schemes (critic: 5 of 5 on contrast).
  - Replaces the rejected button shape with the best-scored button set (Backstage: 5 of 5 on buttons).
- **Costs:**
  - One font swap with its ADR, Lucide paths in `Icon.tsx`, a lighter `BottomActions` molecule, section tabs, and the button variants reshaped in `button.variants.ts`.
  - Two contrast figures to compute before slice 1 ships.
- **Rationale:** It is the only option that is strong on all three high-weight criteria at once.

### Option B — Notebook as drawn (rejected)

- **Summary:** Take `audit/ds-notebook/` without grafts: blue rounded rectangles for primary actions, white bordered rectangles for secondary ones, Add songs and Order as quiet words in the strip.
- **Strengths:**
  - Same cost and contrast as Option A, with nothing left to compute.
  - One coherent specimen already exists.
- **Costs:**
  - Buttons scored 2 of 5: the shape the operator called ugly.
  - Add songs and Order with no fill read as links and do not look like a pair (critic: 3 of 5 on the Add songs treatment).
- **Rejection rationale:** It loses on the buttons criterion, which is the operator's explicit complaint. No change of weights flips this while that complaint stands.

### Option C — Backstage (rejected)

- **Summary:** Near-black chrome, covers as the only colour, a volt accent for actions, expanded heavy titles, dark first.
- **Strengths:**
  - The most distinct look (5 of 5) and the best buttons and Add songs treatment (5 of 5 each).
  - The best song page for learning.
- **Costs:**
  - Key and capo on every setlist row under a session, which the operator asked not to show (3 of 5 on rules).
  - The volt pill measures 1.21:1 against the light page, so its edge comes only from its shadow.
  - Dark first means a full dark pass of every screen, when only 13 of 31 colours have dark values today; a new manifest colour; a new font (critic: 2 of 5 on migration cost).
- **Rejection rationale:** It loses on migration cost and on operator rules. It would win if the operator wanted a clear break from today's look rather than a fix of it, which the critic named as the case for showing it.

### Option D — Studio (rejected)

- **Summary:** Native and neutral: grey, white and one indigo accent, Inter, inset groups and a floating capsule.
- **Strengths:**
  - The most readable dense screens (5 of 5): its lineup grid fits six members.
  - The most coherent specimen.
- **Costs:**
  - The only direction with a failing text pair: the secondary button label is 4.22:1 in dark mode.
  - A new palette and manifest colour (the splash screen turns grey) and Inter replacing two fonts.
  - The least distinct (2 of 5): it reads as any iOS app.
- **Rejection rationale:** It loses on contrast, a high-weight criterion. Its best part, the lineup grid layout, is taken as a graft in Option A.

### Option E — Keep today's look and fix only the measured defects (rejected)

- **Summary:** No new direction. Keep today's tokens and fonts, and fix the defects the audit measured one by one: the 2.80:1 vote toggle, the 21 `text-[` values, the 181 text-only buttons, the 14 raw dialogs.
- **Strengths:**
  - No new font, no ADR, the lowest cost of all options.
  - Nothing for the band to relearn.
- **Costs:**
  - The 18 font sizes and 45 button looks stay unless someone picks which ones win, which is a design system under another name.
  - The operator's complaint about the buttons is not answered.
- **Rejection rationale:** It loses on the buttons criterion and only partly answers the "weak design system" complaint, since fixing 181 buttons still needs one agreed button to fix them towards.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Operator rules and the top tasks | high | The operator ranked setlist preparation first and named the rules in chat; a direction that breaks one is redrawn anyway. |
| Buttons | high | "Hard-to-find buttons" and the rejected button shape are the operator's explicit complaints. |
| Contrast in both schemes | high | The audit found a 2.80:1 pair already; the spec gates every text pair at 4.5:1 or more in both schemes. |
| Migration cost | medium | One developer moves every screen; a new manifest colour or a dark-first pass multiplies the work. |
| How distinct it is | low | The band uses its own app; a recognisable look is pleasant, not required. |

Scores are the critic's (`spec/design/comparison.md`), 1 to 5, with its evidence condensed.

|  | A Notebook + grafts | B Notebook as drawn | C Backstage | D Studio | E Keep today |
|---|---|---|---|---|---|
| Operator rules and top tasks | ✓ every rule kept (5), Backstage's song page added | ✓ every rule kept (5) | ✗ key and capo on setlist rows under a session (3) | ✓ (4), but multi-select Add songs never drawn | ✗ text-only buttons and the drawer stay until fixed one by one |
| Buttons | ✓ Backstage's pills (5) in Notebook's blue | ✗ the rejected rectangle shape (2) | ✓ best button set (5) | ✓ clean capsules (4) | ✗ 45 button looks today |
| Contrast in both schemes | ✓ every Notebook pair passes; two grafted pairs still to compute | ✓ every pair passes, lowest 5.00:1 | ✗ volt pill 1.21:1 against the light page | ✗ secondary label 4.22:1 in dark | ✗ 2.80:1 vote toggle until fixed |
| Migration cost | ✓ manifest unchanged, one font swap (4) | ✓ same (4) | ✗ dark first, new manifest colour, new font (2) | ✗ new palette and manifest colour (3) | ✓ lowest |
| How distinct it is | ✓ margin numerals, pencil, highlighter (4) | ✓ same (4) | ✓ unmistakable (5) | ✗ category default (2) | ✗ unchanged |

## Implementation pointers

- Spec: [`docs/features/pragma/ux-redesign/spec/spec.md`](../features/pragma/ux-redesign/spec/spec.md), sections *Design system* and *Slices* (slice 1)
- Directions and critique: `docs/features/pragma/ux-redesign/spec/design/notebook/`, `spec/design/grafts/`, `spec/design/comparison.md`
- Plan: `docs/features/pragma/ux-redesign/plan/plan.md` (to be written by `/technical-conception`)
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/site/src/styles/tokens.css`, `apps/pragma/site/src/components/atoms/button.variants.ts`, `apps/pragma/site/src/components/atoms/Icon.tsx`, `apps/pragma/site/src/components/molecules/Sheet.tsx` (new), `apps/pragma/site/src/components/molecules/BottomActions.tsx` (new), `eslint-rules/` (new rules for arbitrary values and raw `<button>` and `<dialog>`), `apps/pragma/site/src/components/atoms/Avatar.tsx`, `apps/pragma/site/src/components/atoms/MemberMark.tsx` (new) and `apps/pragma/site/src/lib/member-color.utils.ts` (the ink on a member colour chosen by contrast ratio)
- Related ADRs: [ADR-0046](./0046-newsreader-replaces-instrument-serif.md) (the font), [ADR-0028](./0028-tailwind-merge-resolves-class-conflicts.md) (`composeClassName`, which the new button variants go through)
