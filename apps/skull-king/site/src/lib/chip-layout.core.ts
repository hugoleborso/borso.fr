export type ChipState = 'idle' | 'raised' | 'chosen' | 'missed' | 'blocked';

export interface ChipStyle {
  readonly chosen: number | null;
  readonly blocked: number | null;
  readonly tone: 'accent' | 'missed';
  readonly surface: 'ground' | 'card';
}

export const MOST_CHIPS_ON_ONE_LINE: Readonly<Record<ChipStyle['surface'], number>> = {
  ground: 5,
  card: 6,
};

// @FollowsBlueprint utils-pure-module
export function selectChipColumns(chipCount: number, mostOnOneLine: number): number {
  const lines = Math.ceil(chipCount / mostOnOneLine);
  return Math.ceil(chipCount / lines);
}

export function listChipValues(highest: number): readonly number[] {
  return Array.from({ length: highest + 1 }, (_, value) => value);
}

export function selectChipState(style: ChipStyle, value: number): ChipState {
  if (value === style.chosen) return style.tone === 'accent' ? 'chosen' : 'missed';
  if (value === style.blocked) return 'blocked';
  return style.surface === 'ground' ? 'idle' : 'raised';
}

export function isChipChosen(state: ChipState): boolean {
  return state === 'chosen' || state === 'missed';
}
