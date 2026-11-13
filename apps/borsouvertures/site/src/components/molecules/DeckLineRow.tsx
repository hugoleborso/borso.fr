import { Icon } from '@/components/atoms/Icon';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import type { BuiltDeckLine } from '@/decks/deck.utils';
import { buildLineEndFen } from '@/openings/previews.utils';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface DeckLineRowProps {
  line: BuiltDeckLine;
  side: Side;
  boardStyle: BoardThemeId;
  onOpen: (lineName: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function DeckLineRow({ line, side, boardStyle, onOpen }: DeckLineRowProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full min-h-16 py-2 border-b border-rule font-bold leading-snug text-left hover:bg-surface"
      onClick={() => onOpen(line.name)}
    >
      <MiniBoard
        fen={buildLineEndFen(line.movesSan)}
        boardStyleId={boardStyle}
        orientation={side}
      />
      <span className="flex-auto min-w-0 text-balance">{line.name}</span>
      <Icon name="chevron-right" />
    </button>
  );
}
