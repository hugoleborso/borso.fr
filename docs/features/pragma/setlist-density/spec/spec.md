# See more songs on a phone, and who plays what, without opening anything

## Perspectives confronted

> The confrontation happened as free-form dialogue across roughly twenty-five
> turns rather than through `AskUserQuestion` calls. Each line below names the
> decision the operator actually made and what it displaced. Recording the
> mechanism honestly matters more than claiming the tool was used.

- [x] **Client / business** — The operator plays in the band and reads this screen during rehearsal. He set the energy slider as a frequent gesture, which ruled out the densest layout.
- [x] **Product** — He chose which information the card may lose: artist and tonality may leave the row, the album cover may not. Shown the arithmetic at 360 px — two title lines plus the column is 64 px inside a 44 px block — he reversed his first answer and gave the column priority over a whole title (2026-09-20).
- [x] **Tech-lead** — He accepted a schema change over a name-matching table in the front end, after being shown that a typo would silently move an instrument out of its column.
- [x] **Developer** — He accepted that instrument icons come from libraries plus one generated glyph, not from hand drawing, after four rejected rounds.
- [x] **Designer** — He rejected four layouts and two icon sets on rendered evidence at real size, and picked the lineup column at 17 px. Below `sm` the title yields first; above it the column does.

## Why

A setlist is read on a phone, on stage or in a rehearsal room, while doing
something else with both hands. Today a song card is 154 px tall and the
transition block between two songs is 90 to 124 px, so a transition costs
nearly as much vertical space as the song it follows. Measured on the seeded
set at 375 px, **2.5 songs fit on one screen**. Deciding whether the set flows
means scrolling, which is the thing a person cannot do mid-rehearsal.

The second half of the problem is that the card says who plays without saying
what they play. Overlapping member avatars sorted arbitrarily cannot show that
the guitar moved from one member to another between two songs, which is the
question that decides whether a transition works.

- **Output metric** — the band stops opening a song to answer "does this set
  flow". Not asserted by `/visual-validation`.
- **Input metrics**, each measurable in a browser at a fixed viewport:
  - At 375 px, at least **six songs** are fully visible in the list region,
    against 2.5 before.
  - At 360 px, the song title takes **one line** and truncates with an
    ellipsis when it is longer, so the lineup column always has its 20 px.
    From `sm` up the title has the whole row and truncates only at the edge.
  - Setting a song's energy from the list takes **one gesture** and the value
    survives a reload.
  - Two consecutive songs whose lineup differs in one instrument show that
    difference **in the same column position**, with no text read.

## Result

Shipped already on this branch, measured in the browser rather than mocked:

| | before | after |
|---|---|---|
| card height | 154 px | 54 px |
| transition, held | 90–124 px | 24 px |
| transition, risky | 90–124 px | 36 px |
| per song | ~270 px | 82 px |
| songs per screen at 375 px | 2.5 | 8.5 |

Still to build, which is what this spec covers: the instrument column, its
icons, and the data that orders it.

Reference renders live beside this spec under `design/`.

## Use cases / edge cases

Happy path:

1. A member opens a setlist on a phone and sees at least six songs.
2. Each row carries, left to right: drag handle, album cover, position,
   title over artist and tonality, the lineup column, the energy meter, the
   actions button.
3. The lineup column shows one fixed slot per instrument, always in the same
   order, each slot tinted with the colour of the member holding it.
4. Scanning down a column shows where an instrument changes hands.
5. Pressing the lineup column opens the existing lineup editor.
6. Pressing the energy meter and sliding sideways sets the level; releasing
   commits it.

Edge cases:

- **The viewport is too narrow for every slot.** The column drops slots from
  the right of the fixed order and shows a `+N` marker naming them. The budget
  comes from the width the column actually has, measured, not from the
  breakpoint, so the marker appears exactly when a slot was dropped.
- **The title is longer than the row is wide.** Below `sm` the title takes one
  line and truncates; the column keeps its 20 px. A two-line title would need
  64 px inside a 44 px card and would push the column out of the card
  entirely, which is what shipping it first showed.
- **A song has no lineup at all.** The card takes the grey surface and every
  slot renders in the empty tint.
- **The entry overrides the song's default lineup.** The card takes the yellow
  surface. The override badge that used to sit on the card is gone.
- **An override empties the lineup.** Grey wins over yellow: a set nobody plays
  is the one a reader must act on.
- **The band declares more primary instruments than slots.** The column caps at
  the number of members plus two.
- **An instrument has no icon chosen yet.** It renders with the fallback glyph
  and still holds its slot, so the column keeps its meaning.
- **A member holds two instruments on one song.** Both slots tint with that
  member's colour.

Error cases:

- A write to energy or lineup that the server rejects leaves the row at its
  previous value and surfaces the existing failure line. No new error surface.

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| How wide must the energy control be to stay usable? | 10-segment tap bar 138 px inline; same bar 347 px on its own row; volume-style meter with a relative drag | **Volume meter.** 32 px of travel is one level and the pointer stays captured past the widget bounds, so an 82 px control resolves ten levels with a 44 px target. Verified in the browser (2026-09-18) |
| How do transitions stop eating the list? | keep the block; one-line rail; seam | **Seam.** A held transition is a 24 px hairline carrying the carriers; a risky one keeps a readable 36 px band with its note (2026-09-18) |
| Where does the lineup column sit? | inline at 20 px; inline at 17 px compressible; replacing the artist line; on a second row; no album cover | **Inline at 17 px, compressible.** A second row was refused because the card may not grow; dropping the cover was refused (2026-09-18). Below `sm` it takes the artist line's place under the title, since the artist and the tonality are already hidden there (2026-09-20) |
| What marks an instrument in a slot? | drawn icons; three-letter codes; coloured code chips; emoji | **Icons.** Codes and chips were more legible at 17 px and were still refused (2026-09-18) |
| Where do instrument icons come from? | Lucide only; Qlementine; game-icons; emoji; drawn | **Lucide first, one generated bass.** Lucide has no bass; Qlementine has 67 music glyphs but is illegible at 17 px; no stroke set in Lucide's language covers orchestral instruments (2026-09-18) |
| How is the bass drawn? | traced contour of the operator's reference; parametric construction | **Parametric, proportions from the trace.** Tracing gave the right proportions and non-parallel fretboard edges; the parametric build makes both edges exactly parallel by construction (2026-09-18) |
| How is the column ordered? | alphabetical; by family; hardcoded in the front end; a stored position | **A stored position.** Alphabetical is what the operator rejected outright; family lumps guitar, piano and bass together; a front-end name table breaks silently on a typo (2026-09-18) |
| Which instruments get a slot? | all; the first N; those used in this setlist; the primary ones | **The primary ones**, capped at members plus two (2026-09-18) |
| What gives way at 360 px, the title or the column? | one-line title, column always shown; the card grows for long titles; a smaller title face | **One-line title.** The column is the thing a reader scans down a set for; a truncated title is still recognisable from its first words, a missing column carries nothing. The card stays at 54 px and the type stays at 17 px (2026-09-20) |
| Where does the slot budget come from? | a constant per breakpoint; the width the column actually has | **The measured width.** A breakpoint constant cannot know that a long title took the room, so the `+N` never appeared on the case that needed it: the slots were clipped by `overflow: hidden` while the model still believed it had shown them all (2026-09-20) |
| How does an override read now? | keep the badge; tint the card | **Tint.** Grey for no lineup, yellow for an override. This drops a signal for a colourblind reader on the card; the badge remains in the editor (2026-09-18) |

**Out of scope:** reordering instruments from the setlist screen; per-member
instrument icons; icons for instruments Lucide lacks beyond the bass; the
lineup column on the scene screen; dark-mode-specific tints beyond what the
existing tokens give.

## Architectural choices

| ADR | Decision | What it constrains downstream |
|---|---|---|
| [ADR-0021](../../../../adr/0021-instruments-carry-their-own-icon-order-and-primacy.md) | The instrument table carries `icon` and `position`; the member-instrument link carries `is_primary` | The lineup column reads its slots and their order from the database, not from a table in the front end. The instruments page becomes the place those are edited. Lucide path data is copied into the icon registry rather than added as a dependency |

## Changes

### Types / domain model

```ts
export const INSTRUMENT_ICONS = ['mic-vocal', 'guitar', 'bass', 'piano', 'drum', 'music'] as const;
export type InstrumentIcon = (typeof INSTRUMENT_ICONS)[number];

export interface LineupSlot {
  readonly instrumentId: string;
  readonly icon: InstrumentIcon;
  readonly position: number;
  readonly holder: { readonly memberId: string; readonly color: string } | null;
}
```

### Database changes

```sql
ALTER TABLE instrument ADD COLUMN icon text NOT NULL DEFAULT 'music';
ALTER TABLE instrument ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE member_instrument ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
```

Existing rows seed their `position` from family order — vocal, harmonic,
percussive, other — then name, so day-one ordering is sensible and the band
adjusts it.

### Files to change

```
apps/pragma/api/src/instruments/instruments.schema.ts          // UPDATE: icon, position columns + zod
apps/pragma/api/src/instruments/instruments.repository.ts      // UPDATE: read and write them
apps/pragma/api/src/instruments/instruments.controller.ts      // UPDATE: expose them
apps/pragma/api/src/members/members.schema.ts                  // UPDATE: is_primary on the link
apps/pragma/api/src/database/migrations/NNNN_lineup_slots.sql  // NEW
apps/pragma/site/src/components/atoms/Icon.tsx                 // UPDATE: instrument glyphs
apps/pragma/site/src/components/molecules/LineupSlots.tsx      // NEW: the fixed column
apps/pragma/site/src/components/molecules/lineup-slots.core.ts // NEW: slots from lineup + instruments
apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx  // UPDATE: column replaces MemberLineup
apps/pragma/site/src/components/organisms/TransitionStrip.tsx  // UPDATE: seam carries instruments
apps/pragma/site/src/routes/instruments/InstrumentsPage.tsx    // UPDATE: icon picker, order, primary
docs/knowledge/instrument-icon-provenance.md                   // NEW: Lucide ISC attribution
```

### Test strategy

- **Unit tests on pure modules.** `lineup-slots.core.ts` ships at 100% on
  statement, branch, function and line, like every `*.core.ts` here. It covers
  the fixed order, the cap at members plus two, the overflow count, a slot with
  no holder, a member holding two slots, and an instrument with no icon.
  `setlist-entry-tone.core.ts` already covers the three tints including the
  precedence of empty over overridden.
- **Visual validation.** Every numbered step and every edge case above is
  asserted by `/visual-validation` driving the running app, at **360 px and at
  1280 px**, because 360 is the narrowest current phone and the width where the
  column must yield. The energy gesture is asserted by pointer drive plus a
  reload, which is how it was verified by hand. Visual validation drives the
  input metrics only; the output metric is out of its scope.
- **Technical validation.** `/technical-validation` runs lint with
  `--no-warn-ignored --max-warnings 0`, `prettier --check`, knip, typecheck,
  the unit runner and the migration audit, plus a correctness pass per row of
  the decisions table.
