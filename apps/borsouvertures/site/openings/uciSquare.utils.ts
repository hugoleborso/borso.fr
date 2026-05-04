import type { PieceSymbol } from 'chess.js';
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types';

const SQUARE_PATTERN = /^[a-h][1-8]$/;
const FROM_SLICE_END = 2;
const TO_SLICE_END = 4;

export function isSquare(value: string): value is Square {
  return SQUARE_PATTERN.test(value);
}

export function toSquare(value: string): Square {
  if (!isSquare(value)) throw new Error(`Invalid square: ${value}`);
  return value;
}

export function isPromotionPiece(value: string): value is PieceSymbol {
  return value === 'q' || value === 'r' || value === 'b' || value === 'n';
}

/** Optional promotion suffix (5th char of a UCI move). Kings/pawns can never appear here. */
export function parsePromotion(value: string): PieceSymbol | undefined {
  return isPromotionPiece(value) ? value : undefined;
}

export function uciFromSquare(uci: string): Square {
  return toSquare(uci.slice(0, FROM_SLICE_END));
}

export function uciToSquare(uci: string): Square {
  return toSquare(uci.slice(FROM_SLICE_END, TO_SLICE_END));
}

export function uciPromotion(uci: string): PieceSymbol | undefined {
  return parsePromotion(uci.slice(TO_SLICE_END));
}

export function uciToArrow(uci: string): Arrow {
  return [uciFromSquare(uci), uciToSquare(uci)];
}
