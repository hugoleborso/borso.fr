export const PERSON_KIND = 'personne';
// eslint-disable-next-line no-magic-numbers -- these literals are the scale itself, the one place it is written, and closeness.core.test.ts pins each of them.
export const CLOSENESS_SCALE = [0, 1, 2, 3, 4, 5] as const;
export const LOWEST_CLOSENESS = Math.min(...CLOSENESS_SCALE);
export const HIGHEST_CLOSENESS = Math.max(...CLOSENESS_SCALE);

export type ClosenessScore = (typeof CLOSENESS_SCALE)[number];

// @FollowsBlueprint core-parse-untrusted
export function findClosenessScore(value: number | string | null): ClosenessScore | null {
  return CLOSENESS_SCALE.find((score) => String(score) === String(value)) ?? null;
}
