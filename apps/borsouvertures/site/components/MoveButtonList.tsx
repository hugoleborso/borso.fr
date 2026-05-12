import { Chess } from 'chess.js';
import { uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';

interface MoveButtonListProps {
  /** UCI moves the user can play at the current ply. */
  candidates: readonly string[];
  /** Current FEN — used to render moves in SAN for human-friendly labels. */
  fen: string;
  onPick: (uci: string) => void;
  disabled?: boolean;
}

/**
 * Mobile-first alternative to board arrows. Each candidate UCI is rendered as
 * a `<button>` labelled with the move in SAN (e.g. "Nf3", "Bb5") so the user
 * can tap a move without having to drag a piece on a small board.
 *
 * SAN conversion is best-effort: we replay the move on a {@link Chess} instance
 * cloned from the current FEN. If chess.js rejects the move (data drift), we
 * fall back to the UCI string. Callers shouldn't see this in practice — it's
 * a defensive label fallback, not a behavioural one.
 */
export function MoveButtonList({ candidates, fen, onPick, disabled }: MoveButtonListProps) {
  return (
    <div className="panel move-button-list">
      {candidates.map((uci) => (
        <button
          key={uci}
          type="button"
          className="btn move-button"
          disabled={disabled}
          onClick={() => onPick(uci)}
        >
          {sanFor(uci, fen)}
        </button>
      ))}
    </div>
  );
}

function sanFor(uci: string, fen: string): string {
  const chess = new Chess(fen);
  const move = chess.move({
    from: uciFromSquare(uci),
    to: uciToSquare(uci),
    promotion: uciPromotion(uci),
  });
  return move ? move.san : uci;
}
