import type { Line, Variation } from './types';

/**
 * Pure helpers for the Learn-tree drill: read distinct book moves at a given
 * ply, find the leaf line that ends at the played sequence, decide whether a
 * variation has been fully drilled (every leaf visited at least once).
 *
 * The bookEngine in `bookEngine.utils.ts` answers the same questions over an
 * arbitrary `Selection` + `PlayScopeFilter` (used by Play mode). This module
 * answers them over a single `Variation` — narrower scope, more specific
 * vocabulary (`leaf` = `Line`, `cleared` = every leaf visited).
 */

/**
 * Lines whose `movesUci` prefix matches `playedMovesUci`. The user is "still
 * inside" each returned line; lines that diverged at an earlier ply are
 * filtered out.
 */
export function linesMatchingPrefix(variation: Variation, playedMovesUci: string[]): Line[] {
  return variation.lines.filter((line) =>
    playedMovesUci.every((move, index) => line.movesUci[index] === move),
  );
}

/** Distinct UCI moves available at the next ply across every still-matching line. */
export function nextMovesAt(variation: Variation, playedMovesUci: string[]): string[] {
  const matching = linesMatchingPrefix(variation, playedMovesUci);
  const nextMoves = new Set<string>();
  for (const line of matching) {
    const nextMove = line.movesUci[playedMovesUci.length];
    if (nextMove !== undefined) nextMoves.add(nextMove);
  }
  return Array.from(nextMoves);
}

/**
 * The unique line that ends exactly at `playedMovesUci`, if any. Returns the
 * first matching line in declaration order — duplicates in the dataset (two
 * lines with identical `movesUci`) are a data-quality issue, not handled here.
 */
export function leafReachedAt(variation: Variation, playedMovesUci: string[]): Line | null {
  for (const line of variation.lines) {
    if (sequencesEqual(line.movesUci, playedMovesUci)) return line;
  }
  return null;
}

/**
 * True iff every line in the variation has been visited at least once during
 * the current drill. An empty variation (zero lines) is never "cleared" — there
 * is nothing to clear.
 */
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

function sequencesEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}
