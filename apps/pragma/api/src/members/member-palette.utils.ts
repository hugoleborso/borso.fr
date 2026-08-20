export const MEMBER_PALETTE = [
  { name: 'coral', hex: '#e87b62' },
  { name: 'teal', hex: '#3a9b9b' },
  { name: 'mustard', hex: '#d6a93c' },
  { name: 'plum', hex: '#8a4f7a' },
  { name: 'sage', hex: '#7a9b6f' },
] as const;

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

export function pickNextPaletteHex(existingMemberCount: number): string {
  return pickPaletteHex(existingMemberCount);
}
