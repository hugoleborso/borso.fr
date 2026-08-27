import { ALL_KEY, type Selection } from './selectors.utils';
import type { Line, Opening, Variation } from './types';

interface BookCandidate {
  opening: Opening;
  variation: Variation;
  line: Line;
}

export interface BookState {
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
  const candidates: BookCandidate[] = [];
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
        candidates.push({ opening, variation, line });
      }
    }
  }
  return candidates;
}

export interface BookStateRequest {
  readonly openings: Opening[];
  readonly selection: Selection;
  readonly playedMoves: string[];
  readonly playScope?: PlayScopeFilter;
}

// @FollowsBlueprint utils-pure-module
export function computeBookState({
  openings,
  selection,
  playedMoves,
  playScope,
}: BookStateRequest): BookState {
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

  const isAtLineEnd =
    matchingCandidates.length > 0 &&
    matchingCandidates.every((candidate) => candidate.line.movesUci.length === playedMoves.length);

  return {
    inBook: matchingCandidates.length > 0,
    candidates: matchingCandidates,
    possibleNextMovesUci,
    uniqueOpening,
    uniqueVariation,
    uniqueLine,
    atLineEnd: isAtLineEnd,
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
