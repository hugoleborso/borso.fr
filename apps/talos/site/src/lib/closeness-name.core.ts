import { findClosenessScore, PERSON_KIND } from '@domain/closeness.core';
import type { ParseKeys } from 'i18next';

// @FollowsBlueprint core-label-key
export function selectClosenessNameKey(
  level: number | string | null,
  kind: string,
): ParseKeys | null {
  const score = findClosenessScore(level);
  if (score === null) return null;
  return kind === PERSON_KIND ? `closeness.name.person.${score}` : `closeness.name.other.${score}`;
}
