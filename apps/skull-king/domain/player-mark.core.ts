export const PLAYER_ICONS = [
  'skull',
  'parrot',
  'anchor',
  'crown',
  'wheel',
  'kraken',
  'chest',
  'compass',
  'swords',
  'hook',
  'bottle',
  'spyglass',
] as const;

export type PlayerIcon = (typeof PLAYER_ICONS)[number];

export const PLAYER_COLORS = [
  'gold',
  'lagoon',
  'coral',
  'amethyst',
  'sky',
  'rose',
  'lime',
  'sand',
] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const PLAYER_NAME_MAX_LENGTH = 16;

export interface PlayerMark {
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
}

// @FollowsBlueprint domain-shared-selection
export function suggestMark(seat: number): PlayerMark {
  return {
    icon: PLAYER_ICONS[seat % PLAYER_ICONS.length] ?? 'skull',
    color: PLAYER_COLORS[seat % PLAYER_COLORS.length] ?? 'gold',
  };
}
