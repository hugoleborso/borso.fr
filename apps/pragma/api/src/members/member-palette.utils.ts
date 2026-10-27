import { MEMBER_PALETTE } from '@domain/member-palette.core';

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
