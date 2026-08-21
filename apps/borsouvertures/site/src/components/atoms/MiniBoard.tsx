import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const MINI_BOARD_BORDER_RADIUS = '10px';
const MINI_BOARD_SHADOW = '0 6px 16px rgba(0,0,0,0.35)';

interface MiniBoardProps {
  fen: string;
  boardStyleId: BoardThemeId;
}

// @FollowsBlueprint atom-plain
export function MiniBoard({ fen, boardStyleId }: MiniBoardProps) {
  const { theme } = getBoardAppearance(boardStyleId);
  return (
    <div inert aria-hidden className="size-[140px]">
      <Chessboard
        options={{
          id: `mini-${fen}`,
          position: fen,
          boardOrientation: 'white',
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          boardStyle: {
            borderRadius: MINI_BOARD_BORDER_RADIUS,
            boxShadow: MINI_BOARD_SHADOW,
          },
          arrowOptions: { ...defaultArrowOptions, color: theme.arrow },
          allowDragging: false,
          allowDrawingArrows: false,
          showAnimations: false,
          showNotation: false,
        }}
      />
    </div>
  );
}
