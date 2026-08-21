import type { Line, Variation } from './types';

export function linesMatchingPrefix(variation: Variation, playedMovesUci: string[]): Line[] {
  return variation.lines.filter((line) =>
    playedMovesUci.every((move, index) => line.movesUci[index] === move),
  );
}

// @FollowsBlueprint utils-pure-module
export function nextMovesAt(variation: Variation, playedMovesUci: string[]): string[] {
  const matching = linesMatchingPrefix(variation, playedMovesUci);
  const nextMoves = new Set<string>();
  for (const line of matching) {
    const nextMove = line.movesUci[playedMovesUci.length];
    if (nextMove !== undefined) nextMoves.add(nextMove);
  }
  return Array.from(nextMoves);
}

export function leafReachedAt(variation: Variation, playedMovesUci: string[]): Line | null {
  for (const line of variation.lines) {
    if (areSequencesEqual(line.movesUci, playedMovesUci)) return line;
  }
  return null;
}

export function isVariationCleared(
  variation: Variation,
  visitedLeafIds: ReadonlySet<string>,
): boolean {
  if (variation.lines.length === 0) return false;
  for (const line of variation.lines) {
    if (!visitedLeafIds.has(line.id)) return false;
  }
  return true;
}

function areSequencesEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
