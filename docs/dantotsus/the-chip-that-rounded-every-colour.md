---
date: 2026-10-06
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#136'
fix-commits: [acd8d100a5]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/atoms/member-palette.utils.ts, apps/pragma/site/src/components/molecules/MemberChip.tsx]
time-to-detect: months
tags: [pragma, react, testing]
zone: apps/pragma/site/src/components/atoms/member-palette.utils.ts
---

# The chip that rounded every colour

## User impact

The operator, on the pragma instruments page: "the member colours don't match
the ones I chose". The members page, a few clicks away, showed the right
colours.

| | Seen | Expected |
| --- | --- | --- |
| Emma's avatar, instruments page | mustard | the yellow she picked |
| Gui's avatar, instruments page | teal | the green he picked |

Reported by the operator. Every member whose colour sat far from the five
design swatches was affected, on every screen that drew a `MemberChip`.

## Causal chain

- The instruments page showed other colours than the members page.
  - Its avatars go through `MemberChip`, while the members page, the mastery
    matrix and the vote tally pass `member.color` to `Avatar` directly.
    - `MemberChip` replaced the member's hex with the nearest of five fixed
      swatches (coral, teal, mustard, plum, sage) by RGB distance:
      ```tsx
      const color = paletteColorFromHex(memberColor);  // ← the faulty line
      ```
      - `e29454948` (2026-05-20) wrote the chip on top of
        `paletteColorFromHex`, which `39bdf8de7` had added the same day. That
        commit built the atoms "with cva variant tables that mirror the
        prototype's CSS classes", and turned the design bundle's five "member
        hues" into tokens.
        - Its own comment shows the stored data was known:
          > The site stores each member's colour as a free-form hex string
          > (Hugo picks any colour via the Members admin), but the prototype's
          > palette has five canonical hues.

          The members admin had accepted any colour since `d9860d82e`
          (2026-05-19), through `<input type="color">`. The agent had both
          facts in its context and resolved the conflict toward the mockup.
          (Man)

## Root cause of occurrence

*Thought the design bundle's five member hues were the set of colours a member
is drawn in, actually they were sample swatches, and the colour is whatever hex
the member picks.* (Man)

Under the agentic 4M rule this is Man, not Material. The fact that held the
right answer, a free-form hex stored by the admin, was in the agent's context:
it wrote that fact into the module's header. The brief to mirror the prototype
won over it. The fix is therefore not one more document. It is a shape that
holds when that prior wins.

## Detection failure causes

- **Typing:** the colour is a `string` everywhere, so a function that turns
  one string into another fits on either side.
- **Testing:** `member-palette.utils.ts` was covered at 100%, which proved the
  rounding was correct. No test asserted that a chip paints the colour it is
  given.
- **Functional validation:** every fixture colour sat near a swatch, so the
  rounding was invisible on a preview.

## Countermeasure

`acd8d10` makes `MemberChip` pass the member's hex straight to `Avatar`. A test
renders a green far from every swatch and asserts it comes out unchanged.

## Eradication

**Type:** structural impossibility by subtraction (level 1)

**Reference:** [PR #136](https://github.com/hugoleborso/borso.fr/pull/136) · commit `acd8d10`

`paletteKeyFromHex`, `paletteColorFromHex` and `parseHexTriplet` are deleted.
With no rounding function in the tree, no component can round a member's
colour without writing one. Measured this session,
`member-palette.utils.ts` exports only `MEMBER_LOADING_COLOR` and
`memberInitial`.

```diff
-  const color = paletteColorFromHex(memberColor);
...
-      <Avatar initials={memberInitial(memberName)} color={color} size={size} />
+      <Avatar initials={memberInitial(memberName)} color={memberColor} size={size} />
```

**Proposed:** give the colour its own type. A branded `MemberColor` in
`apps/pragma/domain/`, parsed once where a member is read, would replace
`string` in `MemberChip`, `Avatar` and `MemberMark`. A function that returns
some other colour from it would then have to say so in its signature, and could
not be passed where a member's colour is expected. That covers the class, a
member's colour replaced on its way to the screen, rather than the one deleted
helper. The legitimate mapping, `selectInkOnMemberColor` in
`apps/pragma/site/src/lib/member-color.utils.ts`, returns an ink, not a member
colour, so it would keep working.

**Similar instances:** every `<Avatar` in `apps/pragma/site/src` was read on
2026-10-06. All others already passed the stored colour.
