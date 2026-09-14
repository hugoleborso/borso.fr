/** @Feature setlist-voting */

export type DeckZone = 'discard' | 'one' | 'two' | 'three' | 'none';

export interface DeckGeometry {
  readonly width: number;
  readonly height: number;
}

export interface DragOffset {
  readonly x: number;
  readonly y: number;
}

const COMMIT_RATIO = 0.25;
const ZONE_COUNT = 3;
const HALF = 2;
const SCORING_TINT_AT_FULL_TRAVEL = 0.7;
const DISCARD_TINT_AT_FULL_TRAVEL = 0.5;
const DEGREES_PER_PIXEL = 0.05;

export const IDLE_OFFSET: DragOffset = { x: 0, y: 0 };

export const SCORING_ZONES: readonly { zone: DeckZone; points: number }[] = [
  { zone: 'three', points: 3 },
  { zone: 'two', points: 2 },
  { zone: 'one', points: 1 },
];

const POINTS_BY_ZONE: Readonly<Record<DeckZone, number>> = {
  discard: 0,
  one: 1,
  two: 2,
  three: 3,
  none: 0,
};

const TOP_ROW = 0;
const MIDDLE_ROW = 1;

export function selectZoneForOffset(offset: DragOffset, geometry: DeckGeometry): DeckZone {
  const commitDistance = geometry.width * COMMIT_RATIO;
  if (offset.x <= -commitDistance) return 'discard';
  if (offset.x < commitDistance) return 'none';
  const rowHeight = geometry.height / ZONE_COUNT;
  const pointerRow = Math.floor((geometry.height / HALF + offset.y) / rowHeight);
  const clampedRow = Math.min(Math.max(pointerRow, 0), ZONE_COUNT - 1);
  if (clampedRow === TOP_ROW) return 'three';
  if (clampedRow === MIDDLE_ROW) return 'two';
  return 'one';
}

export function selectPointsForZone(zone: DeckZone): number {
  return POINTS_BY_ZONE[zone];
}

export function selectZoneStrength(
  zone: DeckZone,
  candidate: DeckZone,
  offset: DragOffset,
  geometry: DeckGeometry,
): number {
  if (zone !== candidate) return 0;
  const commitDistance = geometry.width * COMMIT_RATIO;
  const travelled = Math.abs(offset.x);
  if (commitDistance === 0) return 1;
  return Math.min(travelled / commitDistance, 1);
}

export type ReleaseIntent =
  { kind: 'score'; points: number } | { kind: 'refused' } | { kind: 'return' };

export function judgeRelease(zone: DeckZone, remainingPoints: number): ReleaseIntent {
  if (zone === 'none') return { kind: 'return' };
  const points = selectPointsForZone(zone);
  if (points === 0) return { kind: 'score', points: 0 };
  if (points > remainingPoints) return { kind: 'refused' };
  return { kind: 'score', points };
}

export function selectRemainingAfterScore(
  remainingPoints: number,
  previousPoints: number,
  points: number,
): number {
  return remainingPoints + previousPoints - points;
}

export function selectScoringTint(
  zone: DeckZone,
  candidate: DeckZone,
  offset: DragOffset,
  geometry: DeckGeometry,
): number {
  return selectZoneStrength(zone, candidate, offset, geometry) * SCORING_TINT_AT_FULL_TRAVEL;
}

export function selectDiscardTint(
  zone: DeckZone,
  offset: DragOffset,
  geometry: DeckGeometry,
): number {
  return selectZoneStrength(zone, 'discard', offset, geometry) * DISCARD_TINT_AT_FULL_TRAVEL;
}

export function selectCardRotation(offset: DragOffset): number {
  return offset.x * DEGREES_PER_PIXEL;
}

export function readGivenPoints(
  pointsBySongId: Readonly<Record<string, number>>,
  songId: string,
): number {
  return pointsBySongId[songId] ?? 0;
}

export function selectNextCardIndex(currentIndex: number, deckLength: number): number {
  return currentIndex + 1 >= deckLength ? deckLength : currentIndex + 1;
}

const PERCENT = 100;

export function selectSpentShare(total: number, remaining: number): number {
  if (total === 0) return 0;
  return ((total - remaining) / total) * PERCENT;
}

export function readIntentPoints(intent: ReleaseIntent): number {
  return intent.kind === 'score' ? intent.points : 0;
}
