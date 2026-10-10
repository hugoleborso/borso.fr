/** @Feature mastery */

import { MASTERY_SCORE_MAX, MASTERY_SCORE_MIN } from '@domain/input-limits.core';
// @FollowsBlueprint utils-pure-module
export function cellKey(memberId: string, instrumentId: string): string {
  return `${memberId}/${instrumentId}`;
}

export function rowAverage(
  memberId: string,
  instrumentIds: readonly string[],
  scores: Readonly<Record<string, number>>,
): number | null {
  let sum = 0;
  let count = 0;
  for (const instrumentId of instrumentIds) {
    const score = scores[cellKey(memberId, instrumentId)];
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

export function columnAverage(
  instrumentId: string,
  memberIds: readonly string[],
  scores: Readonly<Record<string, number>>,
): number | null {
  let sum = 0;
  let count = 0;
  for (const memberId of memberIds) {
    const score = scores[cellKey(memberId, instrumentId)];
    if (score === undefined) continue;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

export function clampScore(value: number): number {
  return Math.min(Math.max(Math.round(value), MASTERY_SCORE_MIN), MASTERY_SCORE_MAX);
}

export type ScoreEditIntent = 'clear' | 'write';

export function selectScoreEditIntent(rawValue: string): ScoreEditIntent {
  return rawValue.trim() === '' ? 'clear' : 'write';
}
