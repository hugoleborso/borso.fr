/**
 * A piece can be dropped outside the board, which react-chessboard reports as
 * a `null` target square. Naming the two outcomes here keeps the board
 * component free of the branch.
 */
export type BoardDropDecision = 'ignored' | 'played';

export function selectBoardDropDecision(targetSquare: string | null): BoardDropDecision {
  return targetSquare === null ? 'ignored' : 'played';
}

export function buildDroppedUci(sourceSquare: string, targetSquare: string | null): string {
  return `${sourceSquare}${targetSquare ?? ''}`;
}
