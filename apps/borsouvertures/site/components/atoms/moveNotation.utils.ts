import { Chess } from 'chess.js';
import { uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';

/**
 * Render a UCI move as standard algebraic notation from the given position,
 * e.g. `g1f3` at the initial position becomes `Nf3`.
 *
 * chess.js throws when the move is illegal from that position, which happens
 * only if the opening dataset and the board have drifted apart. The move
 * string itself is then the most useful label we can still show.
 */
export function describeMoveInStandardNotation(uci: string, fen: string): string {
  try {
    const chess = new Chess(fen);
    return chess.move({
      from: uciFromSquare(uci),
      to: uciToSquare(uci),
      promotion: uciPromotion(uci),
    }).san;
  } catch {
    return uci;
  }
}
