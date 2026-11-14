import type { Side } from '@/state/persistedState.utils';

export type BoardMover = Side | 'both' | 'none';

export type MovableSide = Side | 'none';

const BLACK_TURN_FIELD = 'b';

function readSideToMove(fen: string): Side {
  return fen.split(' ')[1] === BLACK_TURN_FIELD ? 'black' : 'white';
}

// @FollowsBlueprint utils-pure-module
export function selectMovableSide(fen: string, mover: BoardMover): MovableSide {
  if (mover === 'none') return 'none';
  const sideToMove = readSideToMove(fen);
  if (mover === 'both' || mover === sideToMove) return sideToMove;
  return 'none';
}

export function isPieceMovable(pieceType: string, movableSide: MovableSide): boolean {
  return movableSide !== 'none' && pieceType.startsWith(movableSide.charAt(0));
}
