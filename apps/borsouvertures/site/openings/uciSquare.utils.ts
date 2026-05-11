import type { PieceSymbol } from 'chess.js';
import type { Arrow } from 'react-chessboard';

const SQUARE_PATTERN = /^[a-h][1-8]$/;
const FROM_SLICE_END = 2;
const TO_SLICE_END = 4;
const DEFAULT_ARROW_COLOR = '#5bc86e';

// Square is just `string` after react-chessboard v5 widened its public type.
// The runtime gate is `SQUARE_PATTERN.test(value)` in {@link toSquare}.
type Square = string;

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

/**
 * Build a react-chessboard v5 `Arrow` object.
 *
 * v5 ships L-shaped paths automatically when `(startSquare, endSquare)`
 * describes a knight move — we just hand it the two endpoints. The color is
 * a default; callers may override via `arrowOptions.color` on the board or
 * by mapping `(arrow) => ({ ...arrow, color: ... })` for per-arrow tints.
 */
export function uciToArrow(uci: string): Arrow {
  return {
    startSquare: uciFromSquare(uci),
    endSquare: uciToSquare(uci),
    color: DEFAULT_ARROW_COLOR,
  };
}
