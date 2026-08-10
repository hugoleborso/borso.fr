/**
 * Member chip-color palette. The design bundle (§Member style: chip)
 * defines five equal-chroma hues: coral / teal / mustard / plum / sage.
 * Members are assigned slots in declaration order on create — slot N
 * wraps after 5 (round-robin) so a 6th member would land back on
 * coral. Pure function so the front-end can mirror the assignment
 * without a server round-trip.
 */

export const MEMBER_PALETTE = [
  { name: 'coral', hex: '#e87b62' },
  { name: 'teal', hex: '#3a9b9b' },
  { name: 'mustard', hex: '#d6a93c' },
  { name: 'plum', hex: '#8a4f7a' },
  { name: 'sage', hex: '#7a9b6f' },
] as const;

/**
 * Picks the palette hex for the n-th member (0-indexed). Wraps via
 * modulo, so any whole number lands on a slot however large it is.
 * A member index that is not a whole number has no slot and throws.
 */
// @FollowsBlueprint utils-pure-module
export function pickPaletteHex(memberIndex: number): string {
  const paletteSize = MEMBER_PALETTE.length;
  const slotIndex = ((memberIndex % paletteSize) + paletteSize) % paletteSize;
  const slot = MEMBER_PALETTE[slotIndex];
  if (slot === undefined) {
    throw new Error(`pickPaletteHex expects a whole member index, received ${memberIndex}`);
  }
  return slot.hex;
}

/**
 * Picks the palette hex for a brand-new member given the count of
 * existing members. Used at insert time by the members service.
 */
export function pickNextPaletteHex(existingMemberCount: number): string {
  return pickPaletteHex(existingMemberCount);
}
