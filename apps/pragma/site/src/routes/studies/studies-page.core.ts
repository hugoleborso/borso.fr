/** @Feature studies */

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
const SCORE_STEP = 1;

export interface ReadinessSongView {
  readonly isReady: boolean;
}

export interface ReadinessCount {
  readonly ready: number;
  readonly total: number;
}

// @FollowsBlueprint core-view-projection
export function countReadySongs(songs: readonly ReadinessSongView[]): ReadinessCount {
  return { ready: songs.filter((song) => song.isReady).length, total: songs.length };
}

export type ReadinessLabelKey = 'studies.ready' | 'studies.notReady';

export function selectReadinessLabelKey(isReady: boolean | null): ReadinessLabelKey | null {
  if (isReady === null) return null;
  return isReady ? 'studies.ready' : 'studies.notReady';
}

const PERCENT_SCALE = 100;

export function readyShareInPercent(count: ReadinessCount): number {
  if (count.total === 0) return 0;
  return (count.ready / count.total) * PERCENT_SCALE;
}

export function stepScore(current: number | null, direction: 1 | -1): number {
  const start = current ?? SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, start + direction * SCORE_STEP));
}

export function indexInstrumentNames(
  instruments: readonly { readonly id: string; readonly name: string }[],
): ReadonlyMap<string, string> {
  return new Map(instruments.map((instrument) => [instrument.id, instrument.name]));
}
