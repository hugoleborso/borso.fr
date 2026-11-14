import { defaultPieces } from 'react-chessboard';
import type { Side } from '@/state/persistedState.utils';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import { readBoardPlacement } from './board-placement.utils';

interface MiniBoardProps {
  fen: string;
  boardStyleId: BoardThemeId;
  orientation?: Side;
}

// @FollowsBlueprint atom-plain
export function MiniBoard({ fen, boardStyleId, orientation = 'white' }: MiniBoardProps) {
  const { theme } = getBoardAppearance(boardStyleId);
  return (
    <div inert aria-hidden className="grid grid-cols-8 shrink-0 size-14 roomy:size-16">
      {readBoardPlacement(fen, orientation).map((placed) => (
        <div
          key={placed.square}
          className="aspect-square"
          style={{ backgroundColor: placed.isDark ? theme.dark : theme.light }}
        >
          {placed.piece === null ? null : defaultPieces[placed.piece]?.()}
        </div>
      ))}
    </div>
  );
}
