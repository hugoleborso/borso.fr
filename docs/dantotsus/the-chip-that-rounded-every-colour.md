---
date: 2026-10-06
introduced-at: implementation
detected-at: production
severity: medium
related-pr: "#136"
fix-pr: "#136"
fix-commits: [acd8d10]
eradication-level: 1
time-to-detect: months
tags: [pragma, react, testing]
---

# The chip that rounded every colour

## Symptom

The operator, on the pragma instruments page: "the member colours don't match
the ones I chose". Emma picked yellow and showed mustard; Gui picked green and
showed teal. The members page, a few clicks away, showed the right colours.

## Root-cause chain

1. **Why did the instruments page show other colours?** Its avatars go through
   `MemberChip`, which called `paletteColorFromHex(memberColor)`.
2. **What did that do?** It returned the nearest of five fixed swatches (coral,
   teal, mustard, plum, sage) by RGB distance, so any hex became one of five.
3. **Why did the members page differ?** It renders `Avatar` with
   `member.color` directly, as do the mastery matrix and the vote tally.
4. **Why did `MemberChip` snap?** It was written in the first pragma pass,
   when members could only pick from those five swatches. The member form
   later accepted any hex; the chip kept rounding.

**Root cause:** we thought a member's colour was one of five palette entries,
but it is any hex the member picks, so a chip built for the palette rounded
every new colour to the nearest old one.

## Detection failure causes

- **Typing:** the colour is a `string` everywhere, so a function that turns one
  string into another fits on either side.
- **Testing:** `member-palette.utils.ts` was covered at 100%, which proved the
  rounding was correct, and nothing tested that a chip paints the colour it is
  given.
- **Functional validation:** every fixture colour sat near a swatch, so the
  rounding was invisible on a preview.

## Countermeasure

- **Code:** commit `acd8d10` — `MemberChip` passes the member's hex straight to
  `Avatar`, and a test renders a green far from every swatch and asserts it
  comes out unchanged.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Where:** `apps/pragma/site/src/components/atoms/member-palette.utils.ts`,
`apps/pragma/site/src/components/molecules/MemberChip.tsx`

**What changed:** `paletteKeyFromHex`, `paletteColorFromHex` and
`parseHexTriplet` are deleted. With no rounding function in the tree, no
component can round a member's colour again without writing one.

**Reference:** [PR #136](https://github.com/hugoleborso/borso.fr/pull/136) · commit `acd8d10`

**The actual fix:**

```diff
-  const color = paletteColorFromHex(memberColor);
...
-      <Avatar initials={memberInitial(memberName)} color={color} size={size} />
+      <Avatar initials={memberInitial(memberName)} color={memberColor} size={size} />
```

**Sibling defects swept:** every `<Avatar` in `apps/pragma/site/src` was read;
all others already passed the stored colour.

## See also

- [`apps/pragma/VOCABULARY.md`](../../apps/pragma/VOCABULARY.md), *Member*
