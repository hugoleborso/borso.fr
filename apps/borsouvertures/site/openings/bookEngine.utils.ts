import { ALL_KEY, type Selection } from './selectors.utils';
import type { Line, Opening, Variation } from './types';

interface BookCandidate {
  opening: Opening;
  variation: Variation;
  line: Line;
}

interface BookState {
  inBook: boolean;
  candidates: BookCandidate[];
  possibleNextMovesUci: string[];
  uniqueOpening?: Opening;
  uniqueVariation?: Variation;
  uniqueLine?: Line;
  atLineEnd: boolean;
}

export interface PlayScopeFilter {
  openingIds: string[];
  variationIds: string[];
  lineIds?: string[];
}

export function gatherCandidates(
  openings: Opening[],
  selection: Selection,
  playScope?: PlayScopeFilter,
): BookCandidate[] {
  const results: BookCandidate[] = [];
  for (const opening of openings) {
    if (
      playScope &&
      playScope.openingIds.length > 0 &&
      !playScope.openingIds.includes(opening.id)
    ) {
      continue;
    }
    if (
      selection.openingId !== ALL_KEY &&
      selection.openingId &&
      selection.openingId !== opening.id
    ) {
      continue;
    }
    for (const variation of opening.variations) {
      if (
        playScope &&
        playScope.variationIds.length > 0 &&
        !playScope.variationIds.includes(variation.id)
      ) {
        continue;
      }
      if (
        selection.variationId !== ALL_KEY &&
        selection.variationId &&
        selection.variationId !== variation.id
      ) {
        continue;
      }
      for (const line of variation.lines) {
        const scopeLineIds = playScope?.lineIds;
        if (scopeLineIds && scopeLineIds.length > 0 && !scopeLineIds.includes(line.id)) {
          continue;
        }
        if (selection.lineId !== ALL_KEY && selection.lineId && selection.lineId !== line.id) {
          continue;
        }
        results.push({ opening, variation, line });
      }
    }
  }
  return results;
}

export function computeBookState(
  openings: Opening[],
  selection: Selection,
  playedMoves: string[],
  playScope?: PlayScopeFilter,
): BookState {
  const scopedCandidates = gatherCandidates(openings, selection, playScope);
  const matchingCandidates = scopedCandidates.filter((candidate) =>
    playedMoves.every((move, index) => candidate.line.movesUci[index] === move),
  );

  const possibleNextMovesUci = Array.from(
    new Set(
      matchingCandidates
        .map((candidate) => candidate.line.movesUci[playedMoves.length])
        .filter((nextMove): nextMove is string => Boolean(nextMove)),
    ),
  );

  const uniqueOpening = uniqueBy(matchingCandidates, (candidate) => candidate.opening);
  const uniqueVariation = uniqueBy(matchingCandidates, (candidate) => candidate.variation);
  const uniqueLine = uniqueBy(matchingCandidates, (candidate) => candidate.line);

  const atLineEnd =
    matchingCandidates.length > 0 &&
    matchingCandidates.every((candidate) => candidate.line.movesUci.length === playedMoves.length);

  return {
    inBook: matchingCandidates.length > 0,
    candidates: matchingCandidates,
    possibleNextMovesUci,
    uniqueOpening,
    uniqueVariation,
    uniqueLine,
    atLineEnd,
  };
}

function uniqueBy<Candidate, Item extends { id: string }>(
  candidates: Candidate[],
  pick: (candidate: Candidate) => Item,
): Item | undefined {
  const firstCandidate = candidates[0];
  if (firstCandidate === undefined) return undefined;
  const firstItem = pick(firstCandidate);
  for (const candidate of candidates) {
    if (pick(candidate).id !== firstItem.id) return undefined;
  }
  return firstItem;
}
