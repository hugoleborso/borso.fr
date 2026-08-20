export type BoardDropDecision = 'ignored' | 'played';

// @FollowsBlueprint core-view-intent
export function selectBoardDropDecision(targetSquare: string | null): BoardDropDecision {
  return targetSquare === null ? 'ignored' : 'played';
}

export function buildDroppedUci(sourceSquare: string, targetSquare: string | null): string {
  return `${sourceSquare}${targetSquare ?? ''}`;
}
