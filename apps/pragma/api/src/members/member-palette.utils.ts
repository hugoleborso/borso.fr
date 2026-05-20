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
 * modulo so the function is total — never throws on large indices.
 */
export function pickPaletteHex(memberIndex: number): string {
  const length = MEMBER_PALETTE.length;
  const wrapped = ((memberIndex % length) + length) % length;
  const slot = MEMBER_PALETTE[wrapped];
  // `wrapped` is bounded to [0, length) so the lookup is always defined.
  if (slot === undefined) throw new Error('unreachable: palette index out of bounds');
  return slot.hex;
}

/**
 * Picks the palette hex for a brand-new member given the count of
 * existing members. Used at insert time by the members service.
 */
export function pickNextPaletteHex(existingMemberCount: number): string {
  return pickPaletteHex(existingMemberCount);
}
