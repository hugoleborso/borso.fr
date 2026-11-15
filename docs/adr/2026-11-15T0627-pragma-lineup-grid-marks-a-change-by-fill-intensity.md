# ADR-2026-11-15T0627: pragma's lineup grid marks a change by the member colour at full strength over a pale lane

- **Status:** proposed
- **Date:** 2026-11-15
- **Ratified:** by the operator in chat on 2026-11-15, on variant I of a mockup canvas, with icons rather than instrument names
- **Deciders:** Hugo Borsoni
- **Tags:** lineup-grid-transitions, pragma, design-system, front-end
- **Amends:** three rules of [ADR-2026-10-27T1115](./2026-10-27T1115-pragma-design-system-is-notebook-with-grafts.md), which otherwise stands

## Context

The Lineup grid marked every member whose instrument set differed from the song before. Adding or dropping the chœurs counted, so Marcia baila after La goffa Lolita showed five marks on the Alliance 3 setlist when nobody moved (measured on 2026-11-14). The mark was an ink corner tick and a highlighter bar on a fully filled cell, and the operator found it neither visible nor easy to read. ADR-2026-10-27T1115 fixes three constraints on the grid: colour means the member and nothing else, the column carries a tint of the member colour, and a change is marked by the highlighter or an ink ring, never by another fill. Members all have a mic in front of them, so a voice change is not a move (operator, 2026-11-15). Spec: [`lineup-grid-transitions`](../features/pragma/lineup-grid-transitions/spec/spec.md).

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | The band reads who picks up another instrument between two songs at a glance | On Alliance 3 at 375 px, the changed cells of Take on me stand out and Marcia baila shows none |
| Colour means the member only | operator | high | Members learn each other by colour; another hue would break that | No hue in the grid other than member colours and the highlighter |
| Keeps the continuous lane | operator | medium | The operator liked reading a member's part straight down | A member who keeps an instrument reads as one bar |
| Fits 375 px with six members | author | medium | Every page works at 375 px; the band has five | No sideways scroll at 375 px |

## Decision

**A pale member lane that turns full colour on a change.** While a member keeps the same hand instruments, their cells join into one bar tinted with their colour, with the glyphs faint. The cell where the hand instruments change from the song before is filled with the member colour at full strength, with the new glyphs and, small and faded under them, the ones put down. Instruments of the `vocal` family never count as a change. A sit-out cell is plain paper and breaks the lane. A row with no change is compact, and a row with changes carries a highlighter badge with the count. The song title moves to a left column so the lanes run uninterrupted. It wins because it keeps the lane and the member colour, and the intensity alone shows the change.

## Consequences

- `+` A change reads at a glance without a legend, and stable runs read as one bar.
- `+` Rows with no change are compact, so more of the setlist fits on a phone screen.
- `-` The title column takes about 7rem at 375 px, so each member column is narrower (about 42 px with five members), and a cell holding three glyphs is tight.
- `-` A sit-out cell lost the column tint ADR-2026-10-27T1115 gave it, so a member's column is no longer marked along its whole height.
- `-` A change is now shown by fill strength. That loosens ADR-2026-10-27T1115's "never by another fill" rule for this one grid.
- `~` Joined cells show their glyphs faint, so the instruments stay readable mid-run after scrolling.

## Alternatives considered

### Option I — pale member lane, full colour on a change (chosen)

- **Raised by:** operator, as "a mix of B and D", refined to member colours and icons
- **Summary:** The decision above.
- **Strengths:** It keeps the lane and member colour, and the change reads by intensity.
- **Costs:** The narrower columns, and the two rule changes listed in Consequences.
- **Rationale:** It is the only option that passes every high-weight criterion and keeps the lane.

### Option A — a banner between songs listing who changes (rejected)

- **Raised by:** author
- **Summary:** The cells stay unmarked, and a banner between two songs reads "Arn Basse → Piano · Borso Piano → Basse".
- **Strengths:** The most explicit, needs no legend.
- **Costs:** It doubles the height of the transitions and leaves the grid itself silent.
- **Rejection rationale:** It loses on the continuous lane. The operator chose to mix B and D instead.

### Option C — handoff arrows between lanes (rejected)

- **Raised by:** author
- **Summary:** Curved arrows show each instrument moving from one member's lane to another's.
- **Strengths:** Closest to what happens on stage.
- **Costs:** Crowded when four members move at once (11 → 12 on Alliance 3).
- **Rejection rationale:** It loses on the at-a-glance criterion when many members move.

### Options F, G, H — colour per instrument (rejected)

- **Raised by:** author
- **Summary:** Each instrument gets a hue, so the bass is blue whoever holds it, with lanes full, thin or pale.
- **Strengths:** A swap is visible as a hue jumping lanes.
- **Costs:** A second colour system next to the member colours.
- **Rejection rationale:** It breaks "colour means the member only". No weighting would flip it, because the rule is the operator's.
- **Operator's answer:** "Non. Sur l'app, les couleurs c'est uniquement les membres du groupe. Pas possible de changer." (2026-11-15)

### Option E — neutral grey lanes, amber on a change (rejected)

- **Raised by:** author
- **Summary:** Lanes are grey and only the changed cell lights up in amber.
- **Strengths:** The calmest grid.
- **Costs:** It hides the member colour in the grid.
- **Rejection rationale:** It loses on keeping the member colour visible, which ADR-2026-10-27T1115 makes a goal of the grid.

## Scores

|  | I | A | C | F/G/H | E |
|---|---|---|---|---|---|
| Changes the app for its users | ✓ change reads by intensity | ✓ explicit banner | ✗ crowded at 4 moves | ✓ hue jumps lanes | ✓ amber stands out |
| Colour means the member only | ✓ member hues only | ✓ | ✓ | ✗ instrument hues | ✗ hides member hue |
| Keeps the continuous lane | ✓ | ✗ cells only | ✗ cells only | ✓ | ✓ |
| Fits 375 px with six members | ✓ tight at three glyphs | ✓ | ✓ | ✓ | ✓ |

## Implementation pointers

- Spec: [`docs/features/pragma/lineup-grid-transitions/spec/spec.md`](../features/pragma/lineup-grid-transitions/spec/spec.md)
- Plan: none (Tier 1 change, the spec carries the data shape)
- Mockups: https://claude.ai/artifact/6em3tCi9pZHXdDF2BApVUF, boards A to I
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/site/src/components/organisms/lineup-grid.core.ts` (runs and the hand-instrument comparison), `apps/pragma/site/src/components/organisms/SetlistLineupGrid.tsx` (the lane rendering)
- Related ADRs: [ADR-2026-10-27T1115](./2026-10-27T1115-pragma-design-system-is-notebook-with-grafts.md). This ADR amends its column tint, its "never by another fill" rule for the grid cell, and its title-on-its-own-line grid layout.

## Revisions

### Revision 2026-11-15 — the instruments put down are no longer drawn

What changed: a changed cell holds only the new glyphs. The instruments put down are no longer drawn small under them; the cell's label still names them for a screen reader.
Why: on the preview, the operator found the second line blurred the message, since the cell above already shows what the member played.
Implication for the original decision: still valid.
