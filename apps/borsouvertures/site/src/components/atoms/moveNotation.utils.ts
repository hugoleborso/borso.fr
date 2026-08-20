import { Chess } from 'chess.js';
import { uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';

// @FollowsBlueprint utils-pure-module
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
