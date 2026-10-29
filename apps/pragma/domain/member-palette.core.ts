export const MEMBER_PALETTE = [
  { name: 'coral', hex: '#e87b62' },
  { name: 'teal', hex: '#3a9b9b' },
  { name: 'mustard', hex: '#d6a93c' },
  { name: 'plum', hex: '#8a4f7a' },
  { name: 'sage', hex: '#7a9b6f' },
] as const;

// @FollowsBlueprint core-decision
export function listMemberPaletteHexes(): readonly string[] {
  return MEMBER_PALETTE.map((slot) => slot.hex);
}
