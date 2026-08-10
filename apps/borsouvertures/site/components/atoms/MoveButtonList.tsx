import { describeMoveInStandardNotation } from './moveNotation.utils';

interface MoveButtonListProps {
  /** UCI moves the user can play at the current ply. */
  candidates: readonly string[];
  /** Current position, used to label each move in standard algebraic notation. */
  fen: string;
  onPick: (uci: string) => void;
}

/**
 * Mobile-first alternative to board arrows. Each candidate is a button
 * labelled with the move, so a user can tap a move instead of dragging a piece
 * on a small board.
 */
// @FollowsBlueprint atom-plain
export function MoveButtonList({ candidates, fen, onPick }: MoveButtonListProps) {
  return (
    <div className="panel move-button-list">
      {candidates.map((uci) => (
        <button key={uci} type="button" className="btn move-button" onClick={() => onPick(uci)}>
          {describeMoveInStandardNotation(uci, fen)}
        </button>
      ))}
    </div>
  );
}
