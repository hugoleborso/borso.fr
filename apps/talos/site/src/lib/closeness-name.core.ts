import type { ParseKeys } from 'i18next';

const NAME_KEY_BY_LEVEL: ReadonlyMap<string, ParseKeys> = new Map<string, ParseKeys>([
  ['0', 'closeness.name.0'],
  ['1', 'closeness.name.1'],
  ['2', 'closeness.name.2'],
  ['3', 'closeness.name.3'],
  ['4', 'closeness.name.4'],
  ['5', 'closeness.name.5'],
]);

// @FollowsBlueprint core-label-key
export function selectClosenessNameKey(level: number | string): ParseKeys | null {
  return NAME_KEY_BY_LEVEL.get(String(level)) ?? null;
}
