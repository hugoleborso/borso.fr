import { type ClosenessScore, findClosenessScore, PERSON_KIND } from '@domain/closeness.core';
import type { ParseKeys } from 'i18next';

const PERSON_NAME_KEYS = Object.freeze({
  0: 'closeness.name.person.0',
  1: 'closeness.name.person.1',
  2: 'closeness.name.person.2',
  3: 'closeness.name.person.3',
  4: 'closeness.name.person.4',
  5: 'closeness.name.person.5',
} satisfies Record<ClosenessScore, ParseKeys>);

const OTHER_NAME_KEYS = Object.freeze({
  0: 'closeness.name.other.0',
  1: 'closeness.name.other.1',
  2: 'closeness.name.other.2',
  3: 'closeness.name.other.3',
  4: 'closeness.name.other.4',
  5: 'closeness.name.other.5',
} satisfies Record<ClosenessScore, ParseKeys>);

// @FollowsBlueprint core-label-key
export function selectClosenessNameKey(
  level: number | string | null,
  kind: string,
): ParseKeys | null {
  const score = findClosenessScore(level);
  if (score === null) return null;
  return kind === PERSON_KIND ? PERSON_NAME_KEYS[score] : OTHER_NAME_KEYS[score];
}
