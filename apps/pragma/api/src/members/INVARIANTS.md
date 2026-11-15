# Invariants of pragma, in `api/src/members`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Member

- `firstName` is `NOT NULL`, trimmed, 1 to 64 characters. `color` is
  `NOT NULL` and must match a hex pattern. `avatarS3Key` may be null.
- `phone` and `email` are the member's own contact details, both nullable,
  filled in on the account page and used to sign the outreach message.
- A member created without a colour is given palette slot N of five
  (coral, teal, mustard, plum, sage), wrapping round
  (`pickNextPaletteHex`). The five values live in
  `domain/member-palette.core.ts`, which the API and the member form both
  read. A stored colour is never rewritten: it is the member's identity on
  every lineup.
- On every screen, a member colour means that member and nothing else, and
  no other hue stands for an instrument or a member. An instrument is shown
  by its glyph. A change is shown by intensity, text or the highlighter,
  which is the one hue reserved for changes.
- `member_instrument` links a member to the instruments they can play. Its
  primary key is `(memberId, instrumentId)`, so the pair cannot repeat.
- Assigning instruments replaces the whole set, and is refused when any of
  the ids is unknown (`assignInstrumentsToMember`). The replacement claims
  every named instrument row and then the member row in one retried
  transaction, and writes nothing when a claim finds no row. Deleting a
  member or an instrument removes its row before its `member_instrument`
  links, so no link outlives either end.

Held by: `api/src/members/member-palette.utils.test.ts` › wraps via modulo (5 -> 0)
Held by: `api/src/members/members.controller.test.ts` › rejects hex colors that do not match the pattern
Held by: `api/src/members/members.controller.test.ts` › rejects an assignment that references an unknown instrument
Held by: `api/src/members/members.controller.test.ts` › writes no instrument rows for a member deleted while the assignment was being checked
Held by: `api/src/members/members.controller.test.ts` › leaves no link to an instrument deleted while it was being assigned
Held by: `api/src/members/members.controller.test.ts` › assigns the instruments once when the first commit loses a conflict on the claimed member
