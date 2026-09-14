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

const PERCENT = 100;

export const IDLE_OFFSET: DragOffset = { x: 0, y: 0 };

export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

export function selectOffsetFromOrigin(origin: PointerPoint, point: PointerPoint): DragOffset {
  return { x: point.x - origin.x, y: point.y - origin.y };
}

const TINT_CLASS_BY_DRAGGING: Readonly<Record<'yes' | 'no', string>> = {
  yes: '',
  no: 'transition-opacity duration-200',
};

export function selectTintTransitionClass(isDragging: boolean): string {
  return TINT_CLASS_BY_DRAGGING[isDragging ? 'yes' : 'no'];
}

const CARD_CLASS_BY_DRAGGING: Readonly<Record<'yes' | 'no', string>> = {
  yes: '',
  no: 'transition-transform duration-200 ease-out',
};

export function selectCardTransitionClass(isDragging: boolean): string {
  return CARD_CLASS_BY_DRAGGING[isDragging ? 'yes' : 'no'];
}

export function selectSongsLeft(deckLength: number, cardIndex: number): number {
  return Math.max(deckLength - cardIndex, 0);
}

export function selectSeenShare(deckLength: number, cardIndex: number): number {
  if (deckLength === 0) return 0;
  return Math.min((cardIndex / deckLength) * PERCENT, PERCENT);
}

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
const LAST_ROW = 2;

export function selectZoneForOffset(offset: DragOffset, geometry: DeckGeometry): DeckZone {
  const commitDistance = geometry.width * COMMIT_RATIO;
  if (offset.x <= -commitDistance) return 'discard';
  if (offset.x < commitDistance) return 'none';
  const rowHeight = geometry.height / ZONE_COUNT;
  const pointerRow = Math.floor((geometry.height / HALF + offset.y) / rowHeight);
  const clampedRow = Math.min(Math.max(pointerRow, 0), LAST_ROW);
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
  // Stryker disable next-line ConditionalExpression: equivalent mutant. A discard is the only zone worth zero, and zero is never above a budget that cannot go negative, so the refusal test below answers the same way when this guard is removed.
  if (points === 0) return { kind: 'score', points: 0 };
  if (points > remainingPoints) return { kind: 'refused' };
  return { kind: 'score', points };
}

const MAX_POINTS_PER_SONG = 3;
const POINT_STEPS = MAX_POINTS_PER_SONG + 1;

export function cycleSongPoints(currentPoints: number): number {
  return (currentPoints + 1) % POINT_STEPS;
}

export function judgeTap(currentPoints: number, remainingPoints: number): ReleaseIntent {
  const points = cycleSongPoints(currentPoints);
  if (selectRemainingAfterScore(remainingPoints, currentPoints, points) < 0) {
    return { kind: 'refused' };
  }
  return { kind: 'score', points };
}

export type VoteMode = 'list' | 'deck';

export const DEFAULT_VOTE_MODE: VoteMode = 'list';

export function isDeckMode(mode: VoteMode): boolean {
  return mode === 'deck';
}

export function selectOtherVoteMode(mode: VoteMode): VoteMode {
  return mode === 'list' ? 'deck' : 'list';
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
  return Math.min(currentIndex + 1, deckLength);
}

export function selectSpentShare(total: number, remaining: number): number {
  if (total === 0) return 0;
  const spentShare = ((total - remaining) / total) * PERCENT;
  return Math.min(spentShare, PERCENT);
}

export function isBudgetExhausted(remaining: number): boolean {
  return remaining <= 0;
}

export function readIntentPoints(intent: ReleaseIntent): number {
  return intent.kind === 'score' ? intent.points : 0;
}

export interface DeckEntry {
  readonly id: string;
  readonly createdAt: string;
}

export function isSongNewSinceLastScore(
  song: DeckEntry,
  lastScoredAt: string | null,
  givenPoints: number,
): boolean {
  // Stryker disable next-line ConditionalExpression: equivalent mutant. Without the guard the comparison below reads `Date.parse(null)`, which is NaN, and every comparison against NaN is false — the same answer this returns.
  if (lastScoredAt === null) return false;
  if (givenPoints > 0) return false;
  return Date.parse(song.createdAt) > Date.parse(lastScoredAt);
}

export function countSongsNewSinceLastScore(
  songs: readonly DeckEntry[],
  lastScoredAt: string | null,
  pointsBySongId: Readonly<Record<string, number>>,
): number {
  return songs.filter((song) =>
    isSongNewSinceLastScore(song, lastScoredAt, readGivenPoints(pointsBySongId, song.id)),
  ).length;
}
