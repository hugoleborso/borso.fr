export const MEMBER_PALETTE = [
  { name: 'coral', hex: '#c4583a' },
  { name: 'teal', hex: '#3d8a8a' },
  { name: 'mustard', hex: '#c4912b' },
  { name: 'plum', hex: '#8a4870' },
  { name: 'sage', hex: '#6e8a48' },
] as const;

// @FollowsBlueprint core-decision
export function listMemberPaletteHexes(): readonly string[] {
  return MEMBER_PALETTE.map((slot) => slot.hex);
}
