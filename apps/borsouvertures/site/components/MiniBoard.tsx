import { Chessboard, defaultArrowOptions } from 'react-chessboard';
import { getBoardAppearance } from '@/theme/boardAppearance';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const MINI_BOARD_PX = 140;

interface MiniBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  boardStyleId: BoardThemeId;
}

export function MiniBoard({ fen, orientation = 'white', boardStyleId }: MiniBoardProps) {
  const { theme } = getBoardAppearance(boardStyleId);
  return (
    <div style={{ width: MINI_BOARD_PX, height: MINI_BOARD_PX }}>
      <Chessboard
        options={{
          id: `mini-${fen}`,
          position: fen,
          boardOrientation: orientation,
          darkSquareStyle: { backgroundColor: theme.dark },
          lightSquareStyle: { backgroundColor: theme.light },
          boardStyle: { borderRadius: '10px', boxShadow: '0 6px 16px rgba(0,0,0,0.35)' },
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
