import { BUTTON_CLASS } from './buttonStyles';
import { describeMoveInStandardNotation } from './moveNotation.utils';

const MOVE_BUTTON_CLASS = BUTTON_CLASS + ' font-mono text-[0.95rem] tabular-nums';

interface MoveButtonListProps {
  candidates: readonly string[];
  fen: string;
  onPick: (uci: string) => void;
}

// @FollowsBlueprint atom-plain
export function MoveButtonList({ candidates, fen, onPick }: MoveButtonListProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2 p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
      {candidates.map((uci) => (
        <button key={uci} type="button" className={MOVE_BUTTON_CLASS} onClick={() => onPick(uci)}>
          {describeMoveInStandardNotation(uci, fen)}
        </button>
      ))}
    </div>
  );
}
