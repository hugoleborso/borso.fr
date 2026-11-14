import { Chess, type Move, validateFen } from 'chess.js';

export interface BoardTarget {
  square: string;
  isCapture: boolean;
  isPromotion: boolean;
}

export interface PlayedSquares {
  fromSquare: string;
  toSquare: string;
}

const POSITION_FIELD_COUNT = 2;

function openGame(fen: string): Chess | null {
  return validateFen(fen).ok ? new Chess(fen) : null;
}

function listLegalMoves(fen: string): Move[] {
  return openGame(fen)?.moves({ verbose: true }) ?? [];
}

function readPositionFields(fen: string): string {
  return fen.split(' ').slice(0, POSITION_FIELD_COUNT).join(' ');
}

// @FollowsBlueprint utils-pure-module
export function listLegalTargets(fen: string, fromSquare: string): BoardTarget[] {
  const targetBySquare = new Map<string, BoardTarget>();
  for (const move of listLegalMoves(fen)) {
    if (move.from !== fromSquare) continue;
    targetBySquare.set(move.to, {
      square: move.to,
      isCapture: move.captured !== undefined,
      isPromotion: move.promotion !== undefined,
    });
  }
  return [...targetBySquare.values()];
}

export function listCheckedKingSquares(fen: string): string[] {
  const game = openGame(fen);
  if (game === null || !game.inCheck()) return [];
  return game.findPiece({ type: 'k', color: game.turn() });
}

export function findPlayedSquares(previousFen: string | null, fen: string): PlayedSquares | null {
  if (previousFen === null) return null;
  const position = readPositionFields(fen);
  const move = listLegalMoves(previousFen).find(
    (candidate) => readPositionFields(candidate.after) === position,
  );
  return move === undefined ? null : { fromSquare: move.from, toSquare: move.to };
}
